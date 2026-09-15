using System.Text.Json;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using OfficeSpire.Protocol;

namespace OfficeSpire.Game;

/// <summary>
/// M4 write adapter. Read-state capture remains delegated to the runtime-validated M3 adapter,
/// while mutating actions are resolved and enqueued only from the STS2 main thread.
/// </summary>
public sealed class M4GameAdapter : IGameAdapter
{
    private readonly IGameAdapter _stateReader;

    public M4GameAdapter(IGameAdapter stateReader)
    {
        _stateReader = stateReader ?? throw new ArgumentNullException(nameof(stateReader));
    }

    public StateEnvelope CaptureState() => _stateReader.CaptureState();

    public ActionResponse Dispatch(ActionRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        try
        {
            return request.Action switch
            {
                "play_card" => ExecutePlayCard(request),
                "end_turn" => ExecuteEndTurn(request),
                "use_potion" => ExecuteUsePotion(request),
                "choose_map_node" => ExecuteChooseMapNode(request),
                _ => Reject(
                    request,
                    "unsupported_action",
                    $"Unsupported M4 action '{request.Action}'.")
            };
        }
        catch (Exception ex)
        {
            return Reject(
                request,
                "dispatch_exception",
                $"{ex.GetType().Name}: {ex.Message}");
        }
    }

    private static ActionResponse ExecuteChooseMapNode(ActionRequest request)
    {
        if (CombatManager.Instance.IsInProgress)
        {
            return Reject(request, "bad_phase", "Map selection is unavailable during combat.");
        }

        IRunState? runState = RunManager.Instance.DebugOnlyGetState();
        if (runState?.Map is null)
        {
            return Reject(request, "not_ready", "Authoritative map state is unavailable.");
        }

        Player? player = LocalContext.GetMe(runState);
        if (player is null)
        {
            return Reject(request, "not_ready", "Local player is unavailable.");
        }

        if (RunManager.Instance.ActionExecutor?.CurrentlyRunningAction is not null)
        {
            return Reject(request, "not_ready", "STS2 is still executing a game action.");
        }

        if (!TryReadRequiredInt(request.Payload, "column", out int column) ||
            !TryReadRequiredInt(request.Payload, "row", out int row))
        {
            return Reject(request, "bad_request", "choose_map_node requires integer payload.column and payload.row.");
        }

        IEnumerable<MapPoint> legalTargets = runState.CurrentMapPoint is null
            ? runState.Map.startMapPoints
            : runState.CurrentMapPoint.Children;
        var target = legalTargets.FirstOrDefault(point =>
            point.coord.col == column && point.coord.row == row);
        if (target is null)
        {
            return Reject(request, "unreachable_node", $"Map node ({column},{row}) is not currently reachable.");
        }

        var coordinate = new MapCoord(column, row);
        var vote = new MapVote
        {
            mapGenerationCount = RunManager.Instance.MapSelectionSynchronizer.MapGenerationCount,
            coord = coordinate
        };
        var action = new VoteForMapCoordAction(player, runState.MapLocation, vote);
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(action);
        return Accept(request, "accepted", $"Queued map selection ({column},{row}).");
    }

    private static ActionResponse ExecutePlayCard(ActionRequest request)
    {
        if (!TryGetCombatContext(request, out Player? player, out CombatState? combatState, out ActionResponse? rejection))
        {
            return rejection!;
        }

        if (!TryReadRequiredInt(request.Payload, "hand_index", out int handIndex))
        {
            return Reject(request, "bad_request", "play_card requires integer payload.hand_index.");
        }

        var hand = player!.PlayerCombatState!.Hand.Cards;
        if (handIndex < 0 || handIndex >= hand.Count)
        {
            return Reject(
                request,
                "bad_index",
                $"hand_index {handIndex} is outside the current hand [0,{Math.Max(0, hand.Count - 1)}].");
        }

        CardModel card = hand[handIndex];
        if (!card.CanPlay(out var reason, out _))
        {
            return Reject(
                request,
                "not_playable",
                $"{card.Id}: {reason}");
        }

        if (!TryResolveTarget(
                request,
                request.Payload,
                card.TargetType,
                combatState!,
                player,
                out Creature? target,
                out ActionResponse? targetRejection))
        {
            return targetRejection!;
        }

        var action = new PlayCardAction(card, target);
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(action);

        return Accept(
            request,
            "accepted",
            $"Queued play_card for hand_index {handIndex}.");
    }

    private static ActionResponse ExecuteEndTurn(ActionRequest request)
    {
        if (!TryGetCombatContext(request, out Player? player, out CombatState? combatState, out ActionResponse? rejection))
        {
            return rejection!;
        }

        var action = new EndPlayerTurnAction(player!, combatState!.RoundNumber);
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(action);

        return Accept(request, "accepted", "Queued end_turn.");
    }

    private static ActionResponse ExecuteUsePotion(ActionRequest request)
    {
        if (!TryGetCombatContext(request, out Player? player, out CombatState? combatState, out ActionResponse? rejection))
        {
            return rejection!;
        }

        if (!TryReadRequiredIntEither(request.Payload, "slot_index", "slot", out int slotIndex))
        {
            return Reject(request, "bad_request", "use_potion requires integer payload.slot_index.");
        }

        var slots = player!.PotionSlots;
        if (slotIndex < 0 || slotIndex >= slots.Count || slots[slotIndex] is null)
        {
            return Reject(request, "bad_index", $"No potion exists in slot {slotIndex}.");
        }

        var potion = slots[slotIndex]!;
        if (!TryResolveTarget(
                request,
                request.Payload,
                potion.TargetType,
                combatState!,
                player,
                out Creature? target,
                out ActionResponse? targetRejection))
        {
            return targetRejection!;
        }

        potion.EnqueueManualUse(target);
        return Accept(request, "accepted", $"Queued use_potion for slot {slotIndex}.");
    }

    private static bool TryGetCombatContext(
        ActionRequest request,
        out Player? player,
        out CombatState? combatState,
        out ActionResponse? rejection)
    {
        player = null;
        combatState = null;
        rejection = null;

        if (!CombatManager.Instance.IsInProgress)
        {
            rejection = Reject(request, "bad_phase", "Action requires an active combat.");
            return false;
        }

        IRunState? runState = RunManager.Instance.DebugOnlyGetState();
        if (runState is null)
        {
            rejection = Reject(request, "not_ready", "Run state is not available.");
            return false;
        }

        player = LocalContext.GetMe(runState);
        combatState = CombatManager.Instance.DebugOnlyGetState();
        if (player?.PlayerCombatState is null || combatState is null)
        {
            rejection = Reject(request, "not_ready", "Combat state is not fully mounted.");
            return false;
        }

        if (player.PlayerCombatState.Phase != PlayerTurnPhase.Play)
        {
            rejection = Reject(request, "not_ready", "Player is not in the card-play phase.");
            return false;
        }

        if (CombatManager.Instance.PlayerActionsDisabled)
        {
            rejection = Reject(request, "not_ready", "STS2 currently has player actions disabled.");
            return false;
        }

        if (RunManager.Instance.ActionExecutor?.CurrentlyRunningAction is not null)
        {
            rejection = Reject(request, "not_ready", "STS2 is still executing a game action.");
            return false;
        }

        return true;
    }

    private static bool TryResolveTarget(
        ActionRequest request,
        JsonElement payload,
        TargetType targetType,
        CombatState combatState,
        Player player,
        out Creature? target,
        out ActionResponse? rejection)
    {
        target = null;
        rejection = null;

        if (!TryReadOptionalTargetId(payload, out int? requestedId, out string? parseError))
        {
            rejection = Reject(request, "bad_request", parseError!);
            return false;
        }

        switch (targetType)
        {
            case TargetType.AnyEnemy:
            {
                if (requestedId.HasValue)
                {
                    target = combatState.HittableEnemies.FirstOrDefault(enemy =>
                        enemy.IsAlive &&
                        enemy.CombatId.HasValue &&
                        checked((int)enemy.CombatId.Value) == requestedId.Value);

                    if (target is null)
                    {
                        rejection = Reject(
                            request,
                            "bad_target",
                            $"No living hittable enemy has combat id {requestedId.Value}.");
                        return false;
                    }

                    return true;
                }

                var hittable = combatState.HittableEnemies
                    .Where(enemy => enemy.IsAlive)
                    .ToList();

                if (hittable.Count == 1)
                {
                    target = hittable[0];
                    return true;
                }

                string ids = string.Join(
                    ",",
                    hittable
                        .Where(enemy => enemy.CombatId.HasValue)
                        .Select(enemy => enemy.CombatId!.Value));

                rejection = Reject(
                    request,
                    "bad_target",
                    $"This action requires payload.target_id; hittable enemy ids: [{ids}].");
                return false;
            }

            case TargetType.AnyAlly:
            case TargetType.AnyPlayer:
                // These explicit single-friendly-target modes use the local player's creature.
                target = player.Creature;
                return true;

            case TargetType.Self:
                // STS2's normal GUI path constructs PlayCardAction with a null explicit target
                // for Self cards (Defend is the important baseline example). Supplying the player
                // creature here can be accepted by the synchronizer but silently fail to play.
                target = null;
                return true;

            default:
                // None / AOE / random-target actions let the game resolve recipients.
                target = null;
                return true;
        }
    }

    private static bool TryReadOptionalTargetId(
        JsonElement payload,
        out int? targetId,
        out string? error)
    {
        targetId = null;
        error = null;

        if (payload.ValueKind != JsonValueKind.Object)
        {
            error = "Action payload must be a JSON object.";
            return false;
        }

        JsonElement value;
        if (!payload.TryGetProperty("target_id", out value) &&
            !payload.TryGetProperty("target_combat_id", out value))
        {
            return true;
        }

        if (value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return true;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out int numeric))
        {
            targetId = numeric;
            return true;
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            string? text = value.GetString();
            if (int.TryParse(text, out int parsed))
            {
                targetId = parsed;
                return true;
            }

            const string prefix = "enemy-";
            if (text is not null &&
                text.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) &&
                int.TryParse(text[prefix.Length..], out parsed))
            {
                targetId = parsed;
                return true;
            }
        }

        error = "payload.target_id must be an integer combat id or 'enemy-<combatId>'.";
        return false;
    }

    private static bool TryReadRequiredInt(JsonElement payload, string name, out int value)
    {
        value = 0;
        return payload.ValueKind == JsonValueKind.Object &&
               payload.TryGetProperty(name, out JsonElement element) &&
               element.ValueKind == JsonValueKind.Number &&
               element.TryGetInt32(out value);
    }

    private static bool TryReadRequiredIntEither(
        JsonElement payload,
        string primary,
        string alternate,
        out int value)
    {
        return TryReadRequiredInt(payload, primary, out value) ||
               TryReadRequiredInt(payload, alternate, out value);
    }

    private static ActionResponse Accept(
        ActionRequest request,
        string code,
        string message)
    {
        return new ActionResponse(
            request.RequestId,
            Accepted: true,
            Code: code,
            Message: message,
            StateRevision: request.ExpectedRevision);
    }

    private static ActionResponse Reject(
        ActionRequest request,
        string code,
        string message)
    {
        return new ActionResponse(
            request.RequestId,
            Accepted: false,
            Code: code,
            Message: message,
            StateRevision: request.ExpectedRevision);
    }
}
