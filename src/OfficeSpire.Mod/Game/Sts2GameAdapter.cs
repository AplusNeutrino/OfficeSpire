using System.Security.Cryptography;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Godot;
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
using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Rewards;
using MegaCrit.Sts2.Core.Events;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Entities.RestSite;
using MegaCrit.Sts2.Core.Nodes.RestSite;
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

            if (NOverlayStack.Instance?.Peek() is NRewardsScreen or NCardRewardSelectionScreen)
            {
                RewardsScreenDto? rewards = BuildRewardsSnapshot();
                return CreateEnvelope(
                    PhaseNames.Rewards,
                    run,
                    rewards ?? new RewardsScreenDto(false, "unavailable", [], [], false));
            }

            if (NOverlayStack.Instance?.Peek() is NChooseACardSelectionScreen chooseScreen)
            {
                var options = FindNodesRecursive<NGridCardHolder>((Node)chooseScreen)
                    .Select((holder, index) => holder.CardModel is null
                        ? null
                        : BuildRewardCard(holder.CardModel, index))
                    .Where(card => card is not null)
                    .Cast<RewardCardSnapshotDto>()
                    .ToList();
                return CreateEnvelope(
                    PhaseNames.CardSelection,
                    run,
                    new CardSelectionScreenDto(options.Count > 0, "choose_a_card", options, false));
            }

            if (NOverlayStack.Instance?.Peek() is NCardGridSelectionScreen gridScreen)
            {
                var options = FindNodesRecursive<NGridCardHolder>((Node)gridScreen)
                    .Select((holder, index) => holder.CardModel is null
                        ? null
                        : BuildRewardCard(holder.CardModel, index))
                    .Where(card => card is not null)
                    .Cast<RewardCardSnapshotDto>()
                    .ToList();
                return CreateEnvelope(
                    PhaseNames.CardSelection,
                    run,
                    new CardSelectionScreenDto(
                        options.Count > 0,
                        gridScreen.GetType().Name,
                        options,
                        false));
            }

            if (NCombatRoom.Instance?.Ui?.Hand is { IsInCardSelection: true } playerHand)
            {
                return CreateEnvelope(PhaseNames.CardSelection, run, BuildHandSelectionSnapshot(playerHand));
            }

            if (NMapScreen.Instance?.IsOpen == true)
            {
                return CreateEnvelope(PhaseNames.Map, run, BuildMapSnapshot(runState));
            }

            if (NRun.Instance?.EventRoom is not null)
            {
                EventScreenDto? eventScreen = BuildEventSnapshot();
                return CreateEnvelope(
                    PhaseNames.Event,
                    run,
                    eventScreen ?? new EventScreenDto(false, string.Empty, "Event is loading.", false, []));
            }

            if (NRestSiteRoom.Instance is not null)
            {
                return CreateEnvelope(PhaseNames.Rest, run, BuildRestSnapshot());
            }

            if (NRun.Instance?.TreasureRoom is not null)
            {
                return CreateEnvelope(PhaseNames.Treasure, run, BuildTreasureSnapshot());
            }

            if (NRun.Instance?.MerchantRoom is not null)
            {
                ShopScreenDto? shop = BuildShopSnapshot(player);
                return CreateEnvelope(
                    PhaseNames.Shop,
                    run,
                    shop ?? new ShopScreenDto(false, false, player?.Gold ?? 0, [], false, 0, false));
            }

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

    private static RewardsScreenDto? BuildRewardsSnapshot()
    {
        var overlay = NOverlayStack.Instance?.Peek();
        if (overlay is NCardRewardSelectionScreen cardScreen)
        {
            var cards = FindNodesRecursive<NCardHolder>((Node)cardScreen)
                .Select((holder, index) =>
                {
                    CardModel? card = holder.GetChildren().OfType<NCard>().FirstOrDefault()?.Model;
                    return card is null ? null : BuildRewardCard(card, index);
                })
                .Where(card => card is not null)
                .Cast<RewardCardSnapshotDto>()
                .ToList();
            return new RewardsScreenDto(cards.Count > 0, "card_selection", [], cards, false);
        }

        if (overlay is not NRewardsScreen rewardsScreen)
        {
            return null;
        }

        var items = new List<RewardItemSnapshotDto>();
        foreach ((NRewardButton button, int index) in FindNodesRecursive<NRewardButton>((Node)rewardsScreen).Select((button, index) => (button, index)))
        {
            switch (button.Reward)
            {
                case CardReward cardReward:
                    items.Add(new RewardItemSnapshotDto(
                        index,
                        "card",
                        "Card reward",
                        SafeFormat(cardReward.Description),
                        cardReward.Cards.Select((card, cardIndex) => BuildRewardCard(card, cardIndex)).ToList()));
                    break;
                case GoldReward goldReward:
                    items.Add(new RewardItemSnapshotDto(index, "gold", $"{goldReward.Amount} gold", SafeFormat(goldReward.Description), []));
                    break;
                case RelicReward relicReward:
                    string relic = SafeFormat(relicReward.Description);
                    items.Add(new RewardItemSnapshotDto(index, "relic", relic, relic, []));
                    break;
                case PotionReward potionReward:
                    items.Add(new RewardItemSnapshotDto(index, "potion", "Potion", SafeFormat(potionReward.Description), []));
                    break;
            }
        }

        bool canSkip = FindNodesRecursive<NProceedButton>((Node)rewardsScreen).Any(button => button.IsEnabled);
        return new RewardsScreenDto(items.Count > 0 || canSkip, "rewards", items, [], canSkip);
    }

    private static EventScreenDto? BuildEventSnapshot()
    {
        NEventRoom? room = NRun.Instance?.EventRoom;
        if (room is null)
        {
            return null;
        }

        const BindingFlags flags = BindingFlags.NonPublic | BindingFlags.Instance;
        if (typeof(NEventRoom).GetField("_event", flags)?.GetValue(room) is not EventModel model)
        {
            return null;
        }

        var options = model.CurrentOptions
            .Select((option, index) => new EventOptionSnapshotDto(
                index,
                SafeFormat(option.Title),
                SafeFormat(option.Description),
                option.IsLocked,
                option.IsProceed))
            .ToList();
        if (model.IsFinished && options.Count == 0)
        {
            options.Add(new EventOptionSnapshotDto(0, "Leave", "Leave the event.", false, true));
        }

        bool actionable = model.IsFinished || options.Any(option => !option.IsLocked);
        return new EventScreenDto(
            actionable,
            SafeFormat(model.Title),
            SafeFormat(model.Description),
            model.IsFinished,
            options);
    }

    private static RestScreenDto BuildRestSnapshot()
    {
        NRestSiteRoom room = NRestSiteRoom.Instance!;
        var options = room.Options
            .Select((option, index) => new RestOptionSnapshotDto(
                index,
                option.OptionId,
                SafeFormat(option.Title),
                SafeFormat(option.Description)))
            .ToList();
        bool canProceed = options.Count == 0 && room.ProceedButton is { IsEnabled: true };
        bool targetSelectionPending = NTargetManager.Instance is { IsInSelection: true };
        return new RestScreenDto(
            !targetSelectionPending && (options.Count > 0 || canProceed),
            options,
            canProceed,
            targetSelectionPending);
    }

    private static TreasureScreenDto BuildTreasureSnapshot()
    {
        var room = NRun.Instance!.TreasureRoom!;
        const BindingFlags flags = BindingFlags.NonPublic | BindingFlags.Instance;
        bool chestOpened = (bool)(room.GetType().GetField("_hasChestBeenOpened", flags)?.GetValue(room) ?? false);
        bool isPicking = (bool)(room.GetType().GetField("_isRelicCollectionOpen", flags)?.GetValue(room) ?? false);
        bool canLeave = room.ProceedButton.IsEnabled;
        var synchronizer = RunManager.Instance.TreasureRoomRelicSynchronizer;
        var relics = synchronizer.CurrentRelics?
            .Select((relic, index) => new TreasureRelicSnapshotDto(
                index,
                relic.Id.ToString(),
                SafeFormat(relic.Title),
                SafeFormat(relic.DynamicDescription)))
            .ToList() ?? [];

        int? selectedIndex = null;
        object? predictedVote = synchronizer.GetType().GetField("_predictedVote", flags)?.GetValue(synchronizer);
        if (predictedVote is not null)
        {
            var type = predictedVote.GetType();
            if (type.GetField("voteReceived")?.GetValue(predictedVote) is true &&
                type.GetField("index")?.GetValue(predictedVote) is int index)
            {
                selectedIndex = index;
            }
        }

        return new TreasureScreenDto(
            !chestOpened || isPicking || canLeave,
            chestOpened,
            isPicking,
            canLeave,
            relics,
            selectedIndex);
    }

    private static ShopScreenDto? BuildShopSnapshot(Player? player)
    {
        var room = NRun.Instance?.MerchantRoom;
        var inventory = room?.Room.GetLocalInventory();
        if (room is null || inventory is null)
        {
            return null;
        }

        var items = new List<ShopItemSnapshotDto>();
        items.AddRange(inventory.CharacterCardEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "character_card", index, entry.CreationResult?.Card?.Title.ToString() ?? "Unknown card",
            entry.Cost, GetCardDescription(entry.CreationResult?.Card), entry.IsStocked, entry.EnoughGold)));
        items.AddRange(inventory.ColorlessCardEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "colorless_card", index, entry.CreationResult?.Card?.Title.ToString() ?? "Unknown card",
            entry.Cost, GetCardDescription(entry.CreationResult?.Card), entry.IsStocked, entry.EnoughGold)));
        items.AddRange(inventory.RelicEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "relic", index, entry.Model is null ? "Unknown relic" : SafeFormat(entry.Model.Title),
            entry.Cost, entry.Model is null ? string.Empty : SafeFormat(entry.Model.DynamicDescription), entry.IsStocked, entry.EnoughGold)));
        items.AddRange(inventory.PotionEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "potion", index, entry.Model is null ? "Unknown potion" : SafeFormat(entry.Model.Title),
            entry.Cost, entry.Model is null ? string.Empty : SafeFormat(entry.Model.DynamicDescription), entry.IsStocked, entry.EnoughGold)));

        bool removalAvailable = inventory.CardRemovalEntry is { IsStocked: true };
        int removalCost = removalAvailable ? inventory.CardRemovalEntry!.Cost : 0;
        bool inventoryOpen = room.Inventory.IsOpen;
        bool canLeave = room.ProceedButton.IsEnabled || inventoryOpen;
        return new ShopScreenDto(
            true,
            inventoryOpen,
            player?.Gold ?? 0,
            items,
            removalAvailable,
            removalCost,
            canLeave);
    }

    private static CardSelectionScreenDto BuildHandSelectionSnapshot(NPlayerHand playerHand)
    {
        var holders = FindNodesRecursive<NHandCardHolder>(playerHand)
            .Where(holder => holder.Visible)
            .ToList();
        var options = holders
            .Select((holder, index) => holder.CardNode?.Model is CardModel card
                ? BuildRewardCard(card, index)
                : null)
            .Where(card => card is not null)
            .Cast<RewardCardSnapshotDto>()
            .ToList();

        int minSelect = 1;
        int maxSelect = 1;
        int currentCount = 0;
        bool canConfirm = false;
        const BindingFlags flags = BindingFlags.NonPublic | BindingFlags.Instance;
        object? preferences = typeof(NPlayerHand).GetField("_prefs", flags)?.GetValue(playerHand);
        if (preferences is not null)
        {
            minSelect = (int)(preferences.GetType().GetProperty("MinSelect")?.GetValue(preferences) ?? 1);
            maxSelect = (int)(preferences.GetType().GetProperty("MaxSelect")?.GetValue(preferences) ?? 1);
        }
        if (typeof(NPlayerHand).GetField("_selectedCards", flags)?.GetValue(playerHand) is System.Collections.ICollection selected)
        {
            currentCount = selected.Count;
        }
        if (typeof(NPlayerHand).GetField("_selectModeConfirmButton", flags)?.GetValue(playerHand) is NConfirmButton confirm)
        {
            canConfirm = confirm.IsEnabled;
        }

        return new CardSelectionScreenDto(
            options.Count > 0,
            "hand_multi_select",
            options,
            false,
            minSelect,
            maxSelect,
            currentCount,
            canConfirm);
    }

    private static RewardCardSnapshotDto BuildRewardCard(CardModel card, int index)
    {
        return new RewardCardSnapshotDto(
            index,
            card.Id.ToString(),
            CleanIcons(card.Title.ToString() ?? string.Empty),
            card.EnergyCost.GetWithModifiers(CostModifiers.All),
            card.Type.ToString(),
            card.Rarity.ToString(),
            GetCardDescription(card));
    }

    private static List<T> FindNodesRecursive<T>(Node parent, List<T>? results = null) where T : Node
    {
        results ??= [];
        foreach (Node child in parent.GetChildren())
        {
            if (child is T match)
            {
                results.Add(match);
            }
            FindNodesRecursive(child, results);
        }
        return results;
    }

    private static MapScreenDto BuildMapSnapshot(IRunState runState)
    {
        MapPoint? current = runState.CurrentMapPoint;
        IEnumerable<MapPoint> reachable = current is null
            ? runState.Map?.startMapPoints ?? []
            : current.Children;

        var reachableCoordinates = reachable
            .Select(point => (point.coord.col, point.coord.row))
            .ToHashSet();

        var allPoints = new HashSet<MapPoint>(runState.Map?.GetAllMapPoints() ?? []);
        if (runState.Map is not null)
        {
            foreach (MapPoint start in runState.Map.startMapPoints)
            {
                allPoints.Add(start);
            }
        }

        MapNodeSnapshotDto Convert(MapPoint point) => new(
            StableId: $"map-{point.coord.col}-{point.coord.row}",
            Column: point.coord.col,
            Row: point.coord.row,
            NodeType: point.PointType.ToString(),
            Reachable: reachableCoordinates.Contains((point.coord.col, point.coord.row)));

        return new MapScreenDto(
            WaitingForInput: reachable.Any(),
            CurrentNode: current is null ? null : Convert(current),
            ReachableNodes: reachable.Select(Convert).OrderBy(p => p.Column).ToList(),
            AllNodes: allPoints.Select(Convert).OrderBy(p => p.Row).ThenBy(p => p.Column).ToList());
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
                    potion.Id.ToString(),
                    SafeFormat(potion.Title),
                    SafeFormat(potion.DynamicDescription),
                    potion.TargetType.ToString(),
                    player.CanUseOrRemovePotions && !potion.IsQueued && !potion.HasBeenRemovedFromState,
                    player.CanUseOrRemovePotions && !potion.IsQueued && !potion.HasBeenRemovedFromState,
                    NeedsExplicitTarget(potion.TargetType),
                    NeedsExplicitTarget(potion.TargetType)
                        ? combatState.HittableEnemies
                            .Where(enemy => enemy.IsAlive && enemy.CombatId.HasValue)
                            .Select(enemy => checked((int)enemy.CombatId!.Value))
                            .ToList()
                        : []))
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
        if (string.Equals(phase, PhaseNames.Map, StringComparison.Ordinal))
        {
            return screenValue is MapScreenDto map && map.WaitingForInput;
        }

        if (string.Equals(phase, PhaseNames.Rewards, StringComparison.Ordinal))
        {
            return screenValue is RewardsScreenDto rewards && rewards.WaitingForInput;
        }

        if (string.Equals(phase, PhaseNames.CardSelection, StringComparison.Ordinal))
        {
            return screenValue is CardSelectionScreenDto selection && selection.WaitingForInput;
        }

        if (string.Equals(phase, PhaseNames.Event, StringComparison.Ordinal))
        {
            return screenValue is EventScreenDto eventScreen && eventScreen.WaitingForInput;
        }

        if (string.Equals(phase, PhaseNames.Rest, StringComparison.Ordinal))
        {
            return screenValue is RestScreenDto rest && rest.WaitingForInput;
        }

        if (string.Equals(phase, PhaseNames.Treasure, StringComparison.Ordinal))
        {
            return screenValue is TreasureScreenDto treasure && treasure.WaitingForInput;
        }

        if (string.Equals(phase, PhaseNames.Shop, StringComparison.Ordinal))
        {
            return screenValue is ShopScreenDto shop && shop.WaitingForInput;
        }

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
        if (string.Equals(phase, PhaseNames.Shop, StringComparison.Ordinal) &&
            screenValue is ShopScreenDto shop)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                shop.InventoryOpen,
                shop.Gold,
                Items = shop.Items.Select(item => new
                {
                    item.Category,
                    item.ItemIndex,
                    item.Price,
                    item.IsStocked,
                    item.EnoughGold
                }).ToArray(),
                shop.CardRemovalAvailable,
                shop.CardRemovalCost,
                shop.CanLeave
            };
        }
        else if (string.Equals(phase, PhaseNames.Treasure, StringComparison.Ordinal) &&
            screenValue is TreasureScreenDto treasure)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                treasure.ChestOpened,
                treasure.IsPicking,
                treasure.CanLeave,
                Relics = treasure.Relics.Select(relic => new { relic.ChoiceIndex, relic.Id }).ToArray(),
                treasure.SelectedRelicIndex
            };
        }
        else if (string.Equals(phase, PhaseNames.Rest, StringComparison.Ordinal) &&
            screenValue is RestScreenDto rest)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                Options = rest.Options.Select(option => new { option.OptionIndex, option.Id }).ToArray(),
                rest.CanProceed,
                rest.TargetSelectionPending
            };
        }
        else if (string.Equals(phase, PhaseNames.Event, StringComparison.Ordinal) &&
            screenValue is EventScreenDto eventScreen)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                eventScreen.IsFinished,
                Options = eventScreen.Options.Select(option => new
                {
                    option.OptionIndex,
                    option.IsLocked,
                    option.IsProceed
                }).ToArray()
            };
        }
        else if (string.Equals(phase, PhaseNames.CardSelection, StringComparison.Ordinal) &&
            screenValue is CardSelectionScreenDto selection)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                selection.SelectionType,
                Options = selection.Options.Select(card => new { card.ChoiceIndex, card.Id }).ToArray(),
                selection.CanSkip,
                selection.MinSelect,
                selection.MaxSelect,
                selection.CurrentSelectCount,
                selection.CanConfirm
            };
        }
        else if (string.Equals(phase, PhaseNames.Rewards, StringComparison.Ordinal) &&
            screenValue is RewardsScreenDto rewards)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                rewards.Mode,
                Items = rewards.Items.Select(item => new
                {
                    item.ChoiceIndex,
                    item.RewardType,
                    Cards = item.CardOptions.Select(card => card.Id).ToArray()
                }).ToArray(),
                Cards = rewards.CardChoices.Select(card => new { card.ChoiceIndex, card.Id }).ToArray(),
                rewards.CanSkip
            };
        }
        else if (string.Equals(phase, PhaseNames.Map, StringComparison.Ordinal) &&
            screenValue is MapScreenDto map)
        {
            projection = new
            {
                Phase = phase,
                Run = runProjection,
                Map = new
                {
                    Current = map.CurrentNode is null
                        ? null
                        : new { map.CurrentNode.Column, map.CurrentNode.Row },
                    Reachable = map.ReachableNodes
                        .OrderBy(node => node.Row)
                        .ThenBy(node => node.Column)
                        .Select(node => new { node.Column, node.Row, node.NodeType })
                        .ToArray()
                }
            };
        }
        else if (string.Equals(phase, PhaseNames.Combat, StringComparison.Ordinal) &&
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
                            potion.Id,
                            potion.TargetType,
                            potion.CanUse,
                            potion.CanDiscard,
                            ValidTargetIds = potion.ValidTargetIds.OrderBy(id => id).ToArray()
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

    private static string GetCardDescription(CardModel? card)
    {
        if (card is null) return string.Empty;
        try
        {
            LocString description = card.Description;
            card.DynamicVars.AddTo(description);
            description.Add(new IfUpgradedVar(card.IsUpgraded ? UpgradeDisplay.Upgraded : UpgradeDisplay.Normal));
            description.Add("InCombat", CombatManager.Instance.IsInProgress);
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
