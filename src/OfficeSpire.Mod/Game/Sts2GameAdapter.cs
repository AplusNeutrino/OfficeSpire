using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using OfficeSpire.Protocol;

namespace OfficeSpire.Game;

/// <summary>
/// Read-only adapter for the subset of STS2 state required by M3.
/// All members in this class are version-sensitive and may need repair after game updates.
/// </summary>
public sealed class Sts2GameAdapter : IGameAdapter
{
    // GUI callbacks and card-resolution work can expose an actionable-looking state before the
    // engine is genuinely quiet. Promote a changed semantic decision state only after three
    // consecutive identical actionable frames. Presentation/localization fields are excluded.
    private const int RequiredStableDecisionFrames = 3;

    private long _revision;
    private string _lastFingerprint = string.Empty;
    private string _lastPhase = string.Empty;
    private string _candidateFingerprint = string.Empty;
    private int _candidateStableFrames;
    private bool _candidateActive;

    public StateEnvelope CaptureState()
    {
        try
        {
            IRunState? runState = RunManager.Instance.DebugOnlyGetState();
            if (runState is null)
            {
                return CreateEnvelope(
                    PhaseNames.Unknown,
                    new RunSnapshotDto(0, 0, 0, 0, []),
                    new { waiting_for_input = false });
            }

            Player? player = LocalContext.GetMe(runState);
            RunSnapshotDto run = BuildRunSnapshot(runState, player);

            if (!CombatManager.Instance.IsInProgress || player?.PlayerCombatState is null)
            {
                return CreateEnvelope(
                    PhaseNames.Unknown,
                    run,
                    new { waiting_for_input = false });
            }

            CombatScreenDto? combat = BuildCombatSnapshot(player);
            if (combat is null)
            {
                return CreateEnvelope(
                    PhaseNames.Unknown,
                    run,
                    new { waiting_for_input = false });
            }

            return CreateEnvelope(PhaseNames.Combat, run, combat);
        }
        catch (Exception ex)
        {
            return CreateEnvelope(
                PhaseNames.Unknown,
                new RunSnapshotDto(0, 0, 0, 0, []),
                new
                {
                    waiting_for_input = false,
                    adapter_error = ex.GetType().Name
                });
        }
    }

    public ActionResponse Dispatch(ActionRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        return new ActionResponse(
            request.RequestId,
            Accepted: false,
            Code: "actions_not_enabled",
            Message: "M3 is read-only. Game actions are enabled in the game-thread dispatcher milestone.",
            StateRevision: _revision);
    }

    private static RunSnapshotDto BuildRunSnapshot(IRunState runState, Player? player)
    {
        var relics = player?.Relics
            .Select(relic => new RelicSnapshotDto(
                relic.Id.ToString(),
                SafeFormat(relic.Title),
                SafeFormat(relic.DynamicDescription),
                relic.StackCount))
            .ToList() ?? [];

        return new RunSnapshotDto(
            runState.AscensionLevel,
            runState.CurrentActIndex + 1,
            runState.ActFloor,
            player?.Gold ?? 0,
            relics);
    }

    private static CombatScreenDto? BuildCombatSnapshot(Player player)
    {
        CombatState? combatState = CombatManager.Instance.DebugOnlyGetState();
        PlayerCombatState? playerCombatState = player.PlayerCombatState;
        if (combatState is null || playerCombatState is null)
        {
            return null;
        }

        var hand = playerCombatState.Hand.Cards
            .Select((card, index) => BuildCardSnapshot(card, combatState, index))
            .ToList();

        var enemies = combatState.Enemies
            .Select((enemy, index) => BuildEnemySnapshot(enemy, index))
            .ToList();

        var potions = player.PotionSlots
            .Select((potion, index) => potion is null
                ? null
                : new PotionSnapshotDto(
                    index,
                    SafeFormat(potion.Title),
                    SafeFormat(potion.DynamicDescription),
                    potion.TargetType.ToString()))
            .Where(potion => potion is not null)
            .Cast<PotionSnapshotDto>()
            .ToList();

        bool waitingForInput = playerCombatState.Phase == PlayerTurnPhase.Play
            && !CombatManager.Instance.PlayerActionsDisabled;

        return new CombatScreenDto(
            WaitingForInput: waitingForInput,
            RoundNumber: combatState.RoundNumber,
            IsPlayPhase: playerCombatState.Phase == PlayerTurnPhase.Play,
            Energy: playerCombatState.Energy,
            MaxEnergy: playerCombatState.MaxEnergy,
            Player: new PlayerSnapshotDto(
                player.Creature.CurrentHp,
                player.Creature.MaxHp,
                player.Creature.Block),
            Hand: hand,
            Piles: new PileSnapshotDto(
                playerCombatState.DrawPile.Cards.Count,
                playerCombatState.DiscardPile.Cards.Count,
                playerCombatState.ExhaustPile.Cards.Count),
            Enemies: enemies,
            Potions: potions);
    }

    private static CardSnapshotDto BuildCardSnapshot(CardModel card, CombatState combatState, int handIndex)
    {
        bool canPlay = card.CanPlay(out var reason, out _);
        bool needsTarget = NeedsExplicitTarget(card.TargetType);

        var validTargetIds = needsTarget && canPlay
            ? combatState.HittableEnemies
                .Select(enemy => enemy.CombatId)
                .Where(id => id.HasValue)
                .Select(id => (int)id!.Value)
                .ToList()
            : [];

        int? damage = null;
        if (card.DynamicVars.TryGetValue("Damage", out var damageVar))
        {
            damage = damageVar.IntValue;
        }

        int? block = null;
        if (card.DynamicVars.TryGetValue("Block", out var blockVar))
        {
            block = blockVar.IntValue;
        }

        return new CardSnapshotDto(
            HandIndex: handIndex,
            Id: card.Id.ToString(),
            Name: CleanIcons(card.Title),
            Cost: card.EnergyCost.GetWithModifiers(CostModifiers.All),
            Type: card.Type.ToString(),
            Rarity: card.Rarity.ToString(),
            Damage: damage,
            Block: block,
            Description: GetCardDescription(card),
            CanPlay: canPlay,
            UnplayableReason: canPlay ? null : reason.ToString(),
            NeedsTarget: needsTarget,
            ValidTargetIds: validTargetIds);
    }

    private static EnemySnapshotDto BuildEnemySnapshot(Creature enemy, int fallbackIndex)
    {
        int combatId = enemy.CombatId is uint id ? checked((int)id) : -1;
        string stableId = combatId >= 0 ? $"enemy-{combatId}" : $"enemy-index-{fallbackIndex}";
        string intent = enemy.Monster?.NextMove?.Intents
            ?.FirstOrDefault()
            ?.GetHoverTip([enemy], enemy)
            .Description ?? string.Empty;

        var powers = enemy.Powers
            .Select(power => new PowerSnapshotDto(
                SafeFormat(power.Title),
                power.Amount,
                SafeFormat(power.Description)))
            .ToList();

        return new EnemySnapshotDto(
            StableId: stableId,
            CombatId: combatId,
            Name: enemy.Monster is null ? "Unknown" : SafeFormat(enemy.Monster.Title),
            CurrentHp: enemy.CurrentHp,
            MaxHp: enemy.MaxHp,
            Block: enemy.Block,
            Intent: intent,
            Powers: powers,
            IsAlive: enemy.IsAlive,
            IsHittable: enemy.IsHittable);
    }

    private StateEnvelope CreateEnvelope(string phase, object runValue, object screenValue)
    {
        JsonElement run = JsonSerializer.SerializeToElement(runValue, ProtocolJson.Options);
        JsonElement screen = JsonSerializer.SerializeToElement(screenValue, ProtocolJson.Options);

        bool phaseChanged = !string.Equals(phase, _lastPhase, StringComparison.Ordinal);
        bool stableDecisionState = IsStableDecisionState(phase, screenValue);
        bool actionPending = false;

        if (phaseChanged)
        {
            _lastPhase = phase;
            ResetCandidate();
            _lastFingerprint = stableDecisionState
                ? ComputeDecisionFingerprint(phase, runValue, screenValue)
                : string.Empty;
            _revision++;
            actionPending = string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal)
                && !stableDecisionState;
        }
        else if (!stableDecisionState)
        {
            // Publish live animation/action-queue state but retain the last committed decision revision.
            ResetCandidate();
            actionPending = string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal);
        }
        else
        {
            string fingerprint = ComputeDecisionFingerprint(phase, runValue, screenValue);

            if (string.Equals(fingerprint, _lastFingerprint, StringComparison.Ordinal))
            {
                ResetCandidate();
            }
            else if (!_candidateActive ||
                     !string.Equals(fingerprint, _candidateFingerprint, StringComparison.Ordinal))
            {
                _candidateFingerprint = fingerprint;
                _candidateStableFrames = 1;
                _candidateActive = true;
                actionPending = true;
            }
            else
            {
                _candidateStableFrames++;
                if (_candidateStableFrames >= RequiredStableDecisionFrames)
                {
                    _lastFingerprint = fingerprint;
                    _revision++;
                    ResetCandidate();
                }
                else
                {
                    actionPending = true;
                }
            }
        }

        return new StateEnvelope(
            ProtocolConstants.CurrentVersion,
            _revision,
            phase,
            ActionPending: actionPending,
            run,
            screen);
    }

    /// <summary>
    /// A combat snapshot is eligible for revision promotion only when the game reports player
    /// input enabled and the native action executor is idle. Queue/animation frames are still
    /// published, but are marked pending and cannot mint a decision revision.
    /// </summary>
    private static bool IsStableDecisionState(string phase, object screenValue)
    {
        if (!string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal))
        {
            return true;
        }

        if (screenValue is not CombatScreenDto combat || !combat.WaitingForInput)
        {
            return false;
        }

        try
        {
            return RunManager.Instance.ActionExecutor?.CurrentlyRunningAction is null;
        }
        catch
        {
            // Future game API changes should fail closed rather than mint a false stable revision.
            return false;
        }
    }

    /// <summary>
    /// Fingerprints only structured decision semantics. Rich/localized presentation fields such
    /// as card/relic/potion descriptions, power descriptions, enemy names, and rendered intent
    /// prose remain available in the live snapshot but cannot independently advance revision.
    /// </summary>
    private static string ComputeDecisionFingerprint(string phase, object runValue, object screenValue)
    {
        object runProjection;
        if (runValue is RunSnapshotDto run)
        {
            runProjection = new
            {
                run.AscensionLevel,
                run.CurrentAct,
                run.CurrentFloor,
                run.Gold,
                Relics = run.Relics
                    .OrderBy(relic => relic.Id, StringComparer.Ordinal)
                    .Select(relic => new
                    {
                        relic.Id,
                        relic.StackCount
                    })
                    .ToArray()
            };
        }
        else
        {
            runProjection = new { };
        }

        object projection;
        if (string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal) &&
            screenValue is CombatScreenDto combat)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                Combat = new
                {
                    combat.RoundNumber,
                    combat.IsPlayPhase,
                    combat.Energy,
                    combat.MaxEnergy,
                    Player = new
                    {
                        combat.Player.CurrentHp,
                        combat.Player.MaxHp,
                        combat.Player.Block
                    },
                    Piles = new
                    {
                        combat.Piles.Draw,
                        combat.Piles.Discard,
                        combat.Piles.Exhaust
                    },
                    Hand = combat.Hand.Select(card => new
                    {
                        card.HandIndex,
                        card.Id,
                        card.Cost,
                        card.Type,
                        card.Rarity,
                        card.Damage,
                        card.Block,
                        card.CanPlay,
                        card.NeedsTarget,
                        ValidTargetIds = card.ValidTargetIds.OrderBy(id => id).ToArray()
                    }).ToArray(),
                    Enemies = combat.Enemies
                        .OrderBy(enemy => enemy.CombatId)
                        .Select(enemy => new
                        {
                            enemy.CombatId,
                            enemy.CurrentHp,
                            enemy.MaxHp,
                            enemy.Block,
                            Powers = enemy.Powers
                                .OrderBy(power => power.Name, StringComparer.Ordinal)
                                .ThenBy(power => power.Amount)
                                .Select(power => new
                                {
                                    power.Name,
                                    power.Amount
                                })
                                .ToArray(),
                            enemy.IsAlive,
                            enemy.IsHittable
                        })
                        .ToArray(),
                    Potions = combat.Potions
                        .OrderBy(potion => potion.SlotIndex)
                        .Select(potion => new
                        {
                            potion.SlotIndex,
                            potion.Name,
                            potion.TargetType
                        })
                        .ToArray()
                }
            };
        }
        else
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection
            };
        }

        byte[] payload = JsonSerializer.SerializeToUtf8Bytes(projection, ProtocolJson.Options);
        return Convert.ToHexString(SHA256.HashData(payload));
    }

    private void ResetCandidate()
    {
        _candidateFingerprint = string.Empty;
        _candidateStableFrames = 0;
        _candidateActive = false;
    }

    private static bool NeedsExplicitTarget(TargetType targetType)
    {
        return targetType is not (
            TargetType.None or
            TargetType.Self or
            TargetType.AllEnemies or
            TargetType.RandomEnemy or
            TargetType.AllAllies);
    }

    private static string SafeFormat(LocString? value)
    {
        if (value is null)
        {
            return string.Empty;
        }

        try
        {
            return CleanIcons(value.GetFormattedText() ?? string.Empty);
        }
        catch
        {
            try
            {
                return CleanIcons(value.GetRawText());
            }
            catch
            {
                return string.Empty;
            }
        }
    }

    private static string GetCardDescription(CardModel card)
    {
        try
        {
            LocString description = card.Description;
            card.DynamicVars.AddTo(description);
            description.Add(new IfUpgradedVar(card.IsUpgraded ? UpgradeDisplay.Upgraded : UpgradeDisplay.Normal));
            description.Add("InCombat", true);
            description.Add("OnTable", false);
            description.Add("IsTargeting", false);
            description.Add("energyPrefix", EnergyIconHelper.GetPrefix(card));

            string result = CleanIcons(description.GetFormattedText());
            return result.Contains('{')
                ? Regex.Replace(result, @"\{[^}]+\}", string.Empty).Trim()
                : result;
        }
        catch
        {
            try
            {
                return Regex.Replace(card.Description.GetRawText(), @"\{[^}]+\}", string.Empty).Trim();
            }
            catch
            {
                return string.Empty;
            }
        }
    }

    private static string CleanIcons(string text)
    {
        return Regex.Replace(text ?? string.Empty, @"\[img\][^]]*\[/img\]", string.Empty).Trim();
    }
}
