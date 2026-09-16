using System.Text.Json;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Map;
using Godot;
using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Events;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.RestSite;
using MegaCrit.Sts2.Core.Entities.Merchant;
using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.Nodes.Screens.Shops;
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
                "discard_potion" => ExecuteDiscardPotion(request),
                "choose_map_node" => ExecuteChooseMapNode(request),
                "choose_reward" => ExecuteChooseReward(request),
                "choose_reward_card" => ExecuteChooseRewardCard(request),
                "skip_rewards" => ExecuteSkipRewards(request),
                "choose_card_option" => ExecuteChooseCardOption(request),
                "confirm_card_selection" => ExecuteConfirmCardSelection(request),
                "choose_event_option" => ExecuteChooseEventOption(request),
                "choose_rest_option" => ExecuteChooseRestOption(request),
                "leave_rest_site" => ExecuteLeaveRestSite(request),
                "open_treasure" => ExecuteOpenTreasure(request),
                "choose_treasure_relic" => ExecuteChooseTreasureRelic(request),
                "leave_treasure" => ExecuteLeaveTreasure(request),
                "open_shop" => ExecuteOpenShop(request),
                "buy_shop_item" => ExecuteBuyShopItem(request),
                "request_card_removal" => ExecuteRequestCardRemoval(request),
                "leave_shop" => ExecuteLeaveShop(request),
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

    private static ActionResponse ExecuteOpenShop(ActionRequest request)
    {
        var room = NRun.Instance?.MerchantRoom;
        if (room is null)
        {
            return Reject(request, "bad_phase", "A merchant room is not active.");
        }
        if (!room.Inventory.IsOpen) room.MerchantButton.ForceClick();
        return Accept(request, "accepted", "Opened the merchant inventory.");
    }

    private static ActionResponse ExecuteBuyShopItem(ActionRequest request)
    {
        var room = NRun.Instance?.MerchantRoom;
        var inventory = room?.Room.GetLocalInventory();
        if (room is null || inventory is null)
        {
            return Reject(request, "bad_phase", "A merchant inventory is not available.");
        }
        if (!TryReadRequiredString(request.Payload, "category", out string? category) ||
            !TryReadRequiredInt(request.Payload, "item_index", out int index) || index < 0 ||
            !TryReadRequiredString(request.Payload, "item_id", out string? itemId))
        {
            return Reject(request, "bad_request", "buy_shop_item requires payload.category, payload.item_id, and non-negative payload.item_index.");
        }
        MerchantEntry? entry = category switch
        {
            "character_card" when index < inventory.CharacterCardEntries.Count => inventory.CharacterCardEntries[index],
            "colorless_card" when index < inventory.ColorlessCardEntries.Count => inventory.ColorlessCardEntries[index],
            "relic" when index < inventory.RelicEntries.Count => inventory.RelicEntries[index],
            "potion" when index < inventory.PotionEntries.Count => inventory.PotionEntries[index],
            _ => null
        };
        if (entry is null) return Reject(request, "bad_index", $"Shop item {category}[{index}] is unavailable.");
        string? currentItemId = category switch
        {
            "character_card" => inventory.CharacterCardEntries[index].CreationResult?.Card?.Id.ToString(),
            "colorless_card" => inventory.ColorlessCardEntries[index].CreationResult?.Card?.Id.ToString(),
            "relic" => inventory.RelicEntries[index].Model?.Id.ToString(),
            "potion" => inventory.PotionEntries[index].Model?.Id.ToString(),
            _ => null
        };
        if (!string.Equals(currentItemId, itemId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected merchant item changed before dispatch.");
        }
        if (!entry.IsStocked) return Reject(request, "out_of_stock", "The selected shop item is out of stock.");
        if (!entry.EnoughGold) return Reject(request, "insufficient_gold", "There is not enough gold for this item.");
        if (!room.Inventory.IsOpen) room.OpenInventory();
        TaskHelper.RunSafely(entry.OnTryPurchaseWrapper(inventory));
        return Accept(request, "accepted", $"Started purchase for {category}[{index}].");
    }

    private static ActionResponse ExecuteRequestCardRemoval(ActionRequest request)
    {
        var room = NRun.Instance?.MerchantRoom;
        var inventory = room?.Room.GetLocalInventory();
        if (room is null || inventory?.CardRemovalEntry is not { IsStocked: true, EnoughGold: true })
        {
            return Reject(request, "not_ready", "Merchant card removal is unavailable or unaffordable.");
        }
        if (!room.Inventory.IsOpen) room.OpenInventory();
        NMerchantCardRemoval? slot = room.Inventory.GetAllSlots().OfType<NMerchantCardRemoval>().FirstOrDefault();
        var method = typeof(NMerchantCardRemoval).GetMethod(
            "OnTryPurchase",
            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        if (slot is null || method?.Invoke(slot, [inventory]) is not Task task)
        {
            return Reject(request, "not_ready", "The native card-removal control is unavailable.");
        }
        TaskHelper.RunSafely(task);
        return Accept(request, "accepted", "Started merchant card removal.");
    }

    private static ActionResponse ExecuteLeaveShop(ActionRequest request)
    {
        var room = NRun.Instance?.MerchantRoom;
        if (room is null) return Reject(request, "bad_phase", "A merchant room is not active.");
        if (room.Inventory.IsOpen)
        {
            NBackButton? back = FindNodesRecursive<NBackButton>(room.Inventory).FirstOrDefault();
            if (back is null) return Reject(request, "not_ready", "The merchant back control is unavailable.");
            back.ForceClick();
        }
        if (!room.ProceedButton.IsEnabled) return Reject(request, "not_ready", "The merchant proceed control is unavailable.");
        room.ProceedButton.ForceClick();
        return Accept(request, "accepted", "Left the merchant room.");
    }

    private static ActionResponse ExecuteOpenTreasure(ActionRequest request)
    {
        var room = NRun.Instance?.TreasureRoom;
        if (room is null)
        {
            return Reject(request, "bad_phase", "A treasure room is not active.");
        }
        const System.Reflection.BindingFlags flags =
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        if (room.GetType().GetField("_hasChestBeenOpened", flags)?.GetValue(room) is true)
        {
            return Reject(request, "already_settled", "The treasure chest is already open.");
        }
        NButton? chest = room.GetNodeOrNull<NButton>("%Chest");
        if (chest is not { IsEnabled: true })
        {
            return Reject(request, "not_ready", "The treasure chest control is unavailable.");
        }
        chest.EmitSignal(NClickableControl.SignalName.Released, chest);
        return Accept(request, "accepted", "Opened the treasure chest.");
    }

    private static ActionResponse ExecuteChooseTreasureRelic(ActionRequest request)
    {
        if (NRun.Instance?.TreasureRoom is null)
        {
            return Reject(request, "bad_phase", "A treasure room is not active.");
        }
        const System.Reflection.BindingFlags flags =
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        var room = NRun.Instance!.TreasureRoom!;
        if (room.GetType().GetField("_isRelicCollectionOpen", flags)?.GetValue(room) is not true)
        {
            return Reject(request, "not_ready", "Treasure relic voting is not active.");
        }
        if (!TryReadRequiredInt(request.Payload, "choice_index", out int index) ||
            !TryReadRequiredString(request.Payload, "relic_id", out string? relicId))
        {
            return Reject(request, "bad_request", "choose_treasure_relic requires payload.choice_index and payload.relic_id.");
        }
        var synchronizer = RunManager.Instance.TreasureRoomRelicSynchronizer;
        if (synchronizer.CurrentRelics is null || index < 0 || index >= synchronizer.CurrentRelics.Count)
        {
            return Reject(request, "bad_index", $"Treasure relic {index} is unavailable.");
        }
        if (!string.Equals(synchronizer.CurrentRelics[index].Id.ToString(), relicId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected treasure relic changed before dispatch.");
        }
        synchronizer.PickRelicLocally(index);
        return Accept(request, "accepted", $"Selected treasure relic {index}.");
    }

    private static ActionResponse ExecuteLeaveTreasure(ActionRequest request)
    {
        var room = NRun.Instance?.TreasureRoom;
        if (room?.ProceedButton is not { IsEnabled: true } proceed)
        {
            return Reject(request, "not_ready", "The treasure-room proceed button is unavailable.");
        }
        proceed.ForceClick();
        return Accept(request, "accepted", "Left the treasure room.");
    }

    private static ActionResponse ExecuteChooseRestOption(ActionRequest request)
    {
        NRestSiteRoom? room = NRestSiteRoom.Instance;
        if (room is null)
        {
            return Reject(request, "bad_phase", "A rest site is not active.");
        }
        if (NTargetManager.Instance is { IsInSelection: true })
        {
            return Reject(request, "unsupported_state", "Rest-site player targeting is not implemented.");
        }
        if (!TryReadRequiredInt(request.Payload, "option_index", out int index))
        {
            return Reject(request, "bad_request", "choose_rest_option requires integer payload.option_index.");
        }
        if (!TryReadRequiredString(request.Payload, "option_id", out string? optionId))
        {
            return Reject(request, "bad_request", "choose_rest_option requires non-empty payload.option_id.");
        }
        var options = room.Options.ToList();
        if (index < 0 || index >= options.Count ||
            !string.Equals(options[index].OptionId, optionId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected rest option changed before dispatch.");
        }
        var buttons = FindNodesRecursive<NRestSiteButton>((Node)room);
        if (buttons.Count != options.Count || index >= buttons.Count)
        {
            return Reject(request, "unsupported_state", "Rest-site controls do not match the authoritative option list.");
        }
        buttons[index].ForceClick();
        return Accept(request, "accepted", $"Selected rest option {index}.");
    }

    private static ActionResponse ExecuteLeaveRestSite(ActionRequest request)
    {
        NRestSiteRoom? room = NRestSiteRoom.Instance;
        if (room?.ProceedButton is not { IsEnabled: true } proceed)
        {
            return Reject(request, "not_ready", "The rest-site proceed button is unavailable.");
        }
        proceed.ForceClick();
        return Accept(request, "accepted", "Left the rest site.");
    }

    private static ActionResponse ExecuteChooseEventOption(ActionRequest request)
    {
        NEventRoom? room = NRun.Instance?.EventRoom;
        if (room is null)
        {
            return Reject(request, "bad_phase", "An event room is not active.");
        }
        const System.Reflection.BindingFlags flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        if (typeof(NEventRoom).GetField("_event", flags)?.GetValue(room) is not EventModel model)
        {
            return Reject(request, "not_ready", "Authoritative event data is unavailable.");
        }
        if (model.IsFinished)
        {
            if (!TryReadRequiredString(request.Payload, "action_token", out string? proceedToken) ||
                !string.Equals(proceedToken, "event-proceed", StringComparison.Ordinal))
            {
                return Reject(request, "stale_state", "The completed-event action token is stale.");
            }
            NEventRoom.Proceed();
            return Accept(request, "accepted", "Left the completed event.");
        }
        if (!TryReadRequiredInt(request.Payload, "option_index", out int index) ||
            !TryReadRequiredString(request.Payload, "action_token", out string? actionToken))
        {
            return Reject(request, "bad_request", "choose_event_option requires payload.option_index and payload.action_token.");
        }
        if (index < 0 || index >= model.CurrentOptions.Count)
        {
            return Reject(request, "bad_index", $"Event option {index} is unavailable.");
        }
        var option = model.CurrentOptions[index];
        if (!string.Equals(NativeActionToken.For(option), actionToken, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected event option changed before dispatch.");
        }
        if (option.IsLocked)
        {
            return Reject(request, "option_locked", $"Event option {index} is locked.");
        }
        room.OptionButtonClicked(option, index);
        return Accept(request, "accepted", $"Selected event option {index}.");
    }

    private static ActionResponse ExecuteChooseCardOption(ActionRequest request)
    {
        if (!TryReadRequiredInt(request.Payload, "choice_index", out int index) ||
            !TryReadRequiredString(request.Payload, "card_id", out string? cardId))
        {
            return Reject(request, "bad_request", "choose_card_option requires payload.choice_index and payload.card_id.");
        }

        if (NCombatRoom.Instance?.Ui?.Hand is { IsInCardSelection: true } playerHand)
        {
            var handHolders = FindNodesRecursive<NHandCardHolder>(playerHand).Where(holder => holder.Visible).ToList();
            if (index < 0 || index >= handHolders.Count)
            {
                return Reject(request, "bad_index", $"Hand card option {index} is unavailable.");
            }
            string? currentCardId = handHolders[index].CardNode?.Model?.Id.ToString();
            if (!string.Equals(currentCardId, cardId, StringComparison.Ordinal))
            {
                return Reject(request, "stale_state", "The selected hand card changed before dispatch.");
            }
            handHolders[index].EmitSignal(NCardHolder.SignalName.Pressed, handHolders[index]);
            return Accept(request, "accepted", $"Toggled hand card option {index}.");
        }

        Node? screen = NOverlayStack.Instance?.Peek() as Node;
        if (screen is not NChooseACardSelectionScreen && screen is not NCardGridSelectionScreen)
        {
            return Reject(request, "bad_phase", "A supported card selection screen is not active.");
        }
        if (screen is NCardGridSelectionScreen &&
            screen is not NDeckCardSelectScreen &&
            screen is not NDeckUpgradeSelectScreen)
        {
            return Reject(
                request,
                "unsupported_state",
                $"{screen.GetType().Name} has an unmodeled confirmation flow; complete it in STS2.");
        }
        var holders = FindNodesRecursive<NGridCardHolder>(screen);
        if (index < 0 || index >= holders.Count)
        {
            return Reject(request, "bad_index", $"Card option {index} is unavailable.");
        }
        if (!string.Equals(holders[index].CardModel?.Id.ToString(), cardId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected card changed before dispatch.");
        }
        holders[index].EmitSignal(NCardHolder.SignalName.Pressed, holders[index]);

        if (screen is NDeckUpgradeSelectScreen upgradeScreen)
        {
            NConfirmButton? confirm = ((Node)upgradeScreen).GetNodeOrNull<NConfirmButton>("%UpgradeSinglePreviewContainer/Confirm");
            if (confirm is not { IsEnabled: true })
            {
                return Reject(request, "not_ready", "Upgrade confirmation was not available after selection.");
            }
            confirm.ForceClick();
        }
        else if (screen is NDeckCardSelectScreen deckScreen)
        {
            Control? preview = ((Node)deckScreen).GetNodeOrNull<Control>("%PreviewContainer");
            if (preview is { Visible: true } &&
                preview.GetNodeOrNull<NConfirmButton>("%PreviewConfirm") is { IsEnabled: true } previewConfirm)
            {
                previewConfirm.ForceClick();
            }
        }
        return Accept(request, "accepted", $"Selected card option {index}.");
    }

    private static ActionResponse ExecuteConfirmCardSelection(ActionRequest request)
    {
        if (NCombatRoom.Instance?.Ui?.Hand is not { IsInCardSelection: true } playerHand)
        {
            return Reject(request, "bad_phase", "Hand card selection is not active.");
        }
        const System.Reflection.BindingFlags flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        if (typeof(NPlayerHand).GetField("_selectModeConfirmButton", flags)?.GetValue(playerHand) is not NConfirmButton confirm)
        {
            return Reject(request, "not_ready", "Hand selection confirmation is unavailable.");
        }
        if (!confirm.IsEnabled)
        {
            return Reject(request, "not_ready", "The current hand selection count cannot be confirmed.");
        }
        confirm.ForceClick();
        return Accept(request, "accepted", "Confirmed the hand card selection.");
    }

    private static ActionResponse ExecuteChooseReward(ActionRequest request)
    {
        if (NOverlayStack.Instance?.Peek() is not NRewardsScreen screen)
        {
            return Reject(request, "bad_phase", "The combat rewards screen is not active.");
        }
        if (!TryReadRequiredInt(request.Payload, "choice_index", out int index) ||
            !TryReadRequiredString(request.Payload, "action_token", out string? actionToken))
        {
            return Reject(request, "bad_request", "choose_reward requires payload.choice_index and payload.action_token.");
        }
        var buttons = FindNodesRecursive<NRewardButton>((Node)screen);
        if (index < 0 || index >= buttons.Count)
        {
            return Reject(request, "bad_index", $"Reward choice {index} is unavailable.");
        }
        if (!string.Equals(NativeActionToken.For(buttons[index].Reward), actionToken, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected reward changed before dispatch.");
        }
        buttons[index].ForceClick();
        return Accept(request, "accepted", $"Selected reward {index}.");
    }

    private static ActionResponse ExecuteChooseRewardCard(ActionRequest request)
    {
        if (NOverlayStack.Instance?.Peek() is not NCardRewardSelectionScreen screen)
        {
            return Reject(request, "bad_phase", "The card reward selection screen is not active.");
        }
        if (!TryReadRequiredInt(request.Payload, "choice_index", out int index) ||
            !TryReadRequiredString(request.Payload, "card_id", out string? cardId))
        {
            return Reject(request, "bad_request", "choose_reward_card requires payload.choice_index and payload.card_id.");
        }
        var holders = FindNodesRecursive<NCardHolder>((Node)screen);
        if (index < 0 || index >= holders.Count)
        {
            return Reject(request, "bad_index", $"Card reward choice {index} is unavailable.");
        }
        string? currentCardId = holders[index].GetChildren().OfType<NCard>().FirstOrDefault()?.Model?.Id.ToString();
        if (!string.Equals(currentCardId, cardId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected reward card changed before dispatch.");
        }
        holders[index].EmitSignal(NCardHolder.SignalName.Pressed, holders[index]);
        return Accept(request, "accepted", $"Selected reward card {index}.");
    }

    private static ActionResponse ExecuteSkipRewards(ActionRequest request)
    {
        if (NOverlayStack.Instance?.Peek() is not NRewardsScreen screen)
        {
            return Reject(request, "bad_phase", "The combat rewards screen is not active.");
        }
        NProceedButton? proceed = FindNodesRecursive<NProceedButton>((Node)screen).FirstOrDefault(button => button.IsEnabled);
        if (proceed is null)
        {
            return Reject(request, "not_ready", "No enabled reward skip/continue button is available.");
        }
        proceed.ForceClick();
        return Accept(request, "accepted", "Skipped the remaining rewards.");
    }

    private static List<T> FindNodesRecursive<T>(Node parent, List<T>? results = null) where T : Node
    {
        results ??= [];
        foreach (Node child in parent.GetChildren())
        {
            if (child is T match) results.Add(match);
            FindNodesRecursive(child, results);
        }
        return results;
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
        if (!TryReadRequiredInt(request.Payload, "map_generation", out int expectedGeneration) ||
            !TryReadRequiredString(request.Payload, "stable_id", out string? stableId))
        {
            return Reject(request, "bad_request", "choose_map_node requires payload.map_generation and payload.stable_id.");
        }

        int currentGeneration = RunManager.Instance.MapSelectionSynchronizer.MapGenerationCount;
        string expectedStableId = $"map-{currentGeneration}-{column}-{row}";
        if (expectedGeneration != currentGeneration ||
            !string.Equals(stableId, expectedStableId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The selected map generation or node identity changed before dispatch.");
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
            mapGenerationCount = currentGeneration,
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

        if (!TryReadRequiredInt(request.Payload, "hand_index", out int handIndex) ||
            !TryReadRequiredString(request.Payload, "card_id", out string? cardId))
        {
            return Reject(request, "bad_request", "play_card requires payload.hand_index and payload.card_id.");
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
        if (!string.Equals(card.Id.ToString(), cardId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The card in the selected hand slot changed before dispatch.");
        }
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

        if (!TryReadRequiredIntEither(request.Payload, "slot_index", "slot", out int slotIndex) ||
            !TryReadRequiredString(request.Payload, "potion_id", out string? potionId))
        {
            return Reject(request, "bad_request", "use_potion requires payload.slot_index and payload.potion_id.");
        }

        var slots = player!.PotionSlots;
        if (slotIndex < 0 || slotIndex >= slots.Count || slots[slotIndex] is null)
        {
            return Reject(request, "bad_index", $"No potion exists in slot {slotIndex}.");
        }

        var potion = slots[slotIndex]!;
        if (!string.Equals(potion.Id.ToString(), potionId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The potion in the selected slot changed before dispatch.");
        }
        if (!player.CanUseOrRemovePotions || potion.IsQueued || potion.HasBeenRemovedFromState)
        {
            return Reject(request, "not_playable", $"Potion in slot {slotIndex} cannot be used now.");
        }
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

    private static ActionResponse ExecuteDiscardPotion(ActionRequest request)
    {
        if (!TryGetCombatContext(request, out Player? player, out _, out ActionResponse? rejection))
        {
            return rejection!;
        }
        if (!TryReadRequiredIntEither(request.Payload, "slot_index", "slot", out int slotIndex) ||
            !TryReadRequiredString(request.Payload, "potion_id", out string? potionId))
        {
            return Reject(request, "bad_request", "discard_potion requires payload.slot_index and payload.potion_id.");
        }
        var slots = player!.PotionSlots;
        if (slotIndex < 0 || slotIndex >= slots.Count || slots[slotIndex] is null)
        {
            return Reject(request, "bad_index", $"No potion exists in slot {slotIndex}.");
        }
        var potion = slots[slotIndex]!;
        if (!string.Equals(potion.Id.ToString(), potionId, StringComparison.Ordinal))
        {
            return Reject(request, "stale_state", "The potion in the selected slot changed before dispatch.");
        }
        if (!player.CanUseOrRemovePotions || potion.IsQueued || potion.HasBeenRemovedFromState)
        {
            return Reject(request, "not_playable", $"Potion in slot {slotIndex} cannot be discarded now.");
        }
        var action = new DiscardPotionGameAction(player, checked((uint)slotIndex), inCombat: true);
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(action);
        return Accept(request, "accepted", $"Queued discard_potion for slot {slotIndex}.");
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

    private static bool TryReadRequiredString(JsonElement payload, string name, out string? value)
    {
        value = null;
        if (payload.ValueKind != JsonValueKind.Object ||
            !payload.TryGetProperty(name, out JsonElement element) ||
            element.ValueKind != JsonValueKind.String)
        {
            return false;
        }
        value = element.GetString();
        return !string.IsNullOrWhiteSpace(value);
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
