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
    // A card play can briefly expose several actionable-looking snapshots while its effects
    // are still converging. Require a quiet window before promoting a new combat decision
    // state to a new revision. At the 20 Hz capture rate, 300 ms is roughly six samples.
    private const long DecisionSettleMilliseconds = 300;

    private long _revision;
    private string _lastFingerprint = string.Empty;
    private string _lastPhase = string.Empty;
    private string _candidateFingerprint = string.Empty;
    private long _candidateSinceMs;
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
        bool stableDecisionState = IsStableDecisionState(phase, screen);
        bool actionPending = false;

        if (phaseChanged)
        {
            _lastPhase = phase;
            ResetCandidate();
            _lastFingerprint = stableDecisionState
                ? ComputeFingerprint(phase, run, screen)
                : string.Empty;
            _revision++;
            actionPending = string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal)
                && !stableDecisionState;
        }
        else if (!stableDecisionState)
        {
            // Any non-actionable combat frame breaks the candidate's quiet window. We still
            // publish the fresh screen contents, but retain the last committed decision revision.
            ResetCandidate();
            actionPending = string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal);
        }
        else
        {
            string fingerprint = ComputeFingerprint(phase, run, screen);

            if (string.Equals(fingerprint, _lastFingerprint, StringComparison.Ordinal))
            {
                ResetCandidate();
            }
            else if (!_candidateActive ||
                     !string.Equals(fingerprint, _candidateFingerprint, StringComparison.Ordinal))
            {
                // A new actionable-looking state appeared. Do not immediately promote it: card
                // effects can settle over several successive snapshots even while input briefly
                // becomes enabled. Restart the quiet timer whenever the candidate changes.
                _candidateFingerprint = fingerprint;
                _candidateSinceMs = Environment.TickCount64;
                _candidateActive = true;
                actionPending = true;
            }
            else if (ElapsedMilliseconds(_candidateSinceMs) >= DecisionSettleMilliseconds)
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

        return new StateEnvelope(
            ProtocolConstants.CurrentVersion,
            _revision,
            phase,
            ActionPending: actionPending,
            run,
            screen);
    }

    /// <summary>
    /// Combat state is sampled continuously, including animation/action-queue windows where
    /// PlayerActionsDisabled makes waiting_for_input temporarily false. Those transient frames
    /// are still published to the overlay, but they must not advance the decision revision.
    /// Actionable-looking snapshots also pass through a short quiet-window debounce before they
    /// are promoted to a new revision.
    /// </summary>
    private static bool IsStableDecisionState(string phase, JsonElement screen)
    {
        if (!string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal))
        {
            return true;
        }

        return screen.ValueKind == JsonValueKind.Object
            && screen.TryGetProperty("waiting_for_input", out JsonElement waiting)
            && waiting.ValueKind == JsonValueKind.True;
    }

    private static string ComputeFingerprint(string phase, JsonElement run, JsonElement screen)
    {
        string fingerprintInput = string.Concat(phase, "\n", run.GetRawText(), "\n", screen.GetRawText());
        return Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(fingerprintInput)));
    }

    private void ResetCandidate()
    {
        _candidateFingerprint = string.Empty;
        _candidateSinceMs = 0;
        _candidateActive = false;
    }

    private static long ElapsedMilliseconds(long sinceMs)
    {
        long now = Environment.TickCount64;
        return now >= sinceMs ? now - sinceMs : long.MaxValue;
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
