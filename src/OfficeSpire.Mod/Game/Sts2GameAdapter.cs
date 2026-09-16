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
using MegaCrit.Sts2.Core.Models.Monsters;
using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Nodes.Screens.GameOverScreen;
using MegaCrit.Sts2.Core.Saves;
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
    private const int RequiredStableLifecycleFrames = 3;

    private long _revision;
    private string _lastFingerprint = string.Empty;
    private string _lastPhase = string.Empty;
    private string _candidateFingerprint = string.Empty;
    private int _candidateStableFrames;
    private bool _candidateActive;
    private int _noRunFrames;
    private int _gameOverFrames;

    public StateEnvelope CaptureState()
    {
        try
        {
            IRunState? runState = RunManager.Instance.DebugOnlyGetState();
            bool gameOverVisible = NOverlayStack.Instance?.Peek() is NGameOverScreen;
            _gameOverFrames = gameOverVisible
                ? Math.Min(_gameOverFrames + 1, RequiredStableLifecycleFrames)
                : 0;
            if (gameOverVisible && _gameOverFrames < RequiredStableLifecycleFrames)
            {
                _noRunFrames = 0;
                return CreateTransitionEnvelope("Confirming the native game-over screen.");
            }
            if (gameOverVisible)
            {
                _noRunFrames = 0;
                string outcome = GetRunOutcome(runState);
                return CreateEnvelope(
                    PhaseNames.RunEnd,
                    runState is null
                        ? new RunSnapshotDto(0, 0, 0, 0, [])
                        : BuildRunSnapshot(runState, LocalContext.GetMe(runState)),
                    new LifecycleScreenDto(
                        false,
                        outcome,
                        GetRunOutcomeMessage(outcome),
                        false));
            }
            if (runState is null)
            {
                _noRunFrames = Math.Min(_noRunFrames + 1, RequiredStableLifecycleFrames);
                if (_noRunFrames < RequiredStableLifecycleFrames)
                {
                    return CreateTransitionEnvelope("Waiting for an authoritative run or menu state.");
                }
                return CreateEnvelope(
                    PhaseNames.Menu,
                    new RunSnapshotDto(0, 0, 0, 0, []),
                    BuildMenuSnapshot());
            }

            _noRunFrames = 0;

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

    private static string GetRunOutcome(IRunState? runState)
    {
        if (RunManager.Instance.IsAbandoned)
        {
            return "abandoned";
        }

        return runState?.CurrentRoom?.IsVictoryRoom is true || RunManager.Instance.WinTime > 0
            ? "victory"
            : "defeat";
    }

    private static string GetRunOutcomeMessage(string outcome) => outcome switch
    {
        "victory" => "The game reports that this run ended in victory.",
        "abandoned" => "The game reports that this run was abandoned.",
        _ => "The game reports that this run ended in defeat."
    };

    private static MenuScreenDto BuildMenuSnapshot()
    {
        if (Engine.GetMainLoop() is not SceneTree tree || tree.Root is null)
        {
            return new MenuScreenDto(false, "unknown", "No active run; the visible menu could not be identified.", [], false);
        }

        (string TypeName, string Screen, string Message, (string Field, string Id, string Label)[] Fields)[] definitions =
        [
            ("NVerticalPopup", "popup", "A native STS2 confirmation is open. Review it in the original window.", []),
            ("NProfileScreen", "profile_select", "Choose a profile in the original STS2 window.", []),
            ("NCustomRunScreen", "custom_run", "Review the custom run configuration in the original STS2 window.", []),
            ("NDailyRunScreen", "daily_run", "Review the daily challenge in the original STS2 window.", []),
            ("NCharacterSelectScreen", "character_select", "Choose a character in the original STS2 window.", []),
            ("NJoinFriendScreen", "multiplayer_join", "Choose a multiplayer session in the original STS2 window.", []),
            ("NMultiplayerLoadGameScreen", "multiplayer_load", "Choose a saved multiplayer run in the original STS2 window.", []),
            ("NMultiplayerHostSubmenu", "multiplayer_host", "Choose the multiplayer game mode in the original STS2 window.",
                [("_standardButton", "standard", "Standard"), ("_dailyButton", "daily", "Daily"), ("_customButton", "custom", "Custom"), ("_backButton", "back", "Back")]),
            ("NMultiplayerSubmenu", "multiplayer", "Choose a multiplayer action in the original STS2 window.",
                [("_hostButton", "host", "Host"), ("_joinButton", "join", "Join"), ("_loadButton", "load", "Load"), ("_abandonButton", "abandon", "Abandon"), ("_backButton", "back", "Back")]),
            ("NSingleplayerSubmenu", "singleplayer", "Choose the single-player game mode in the original STS2 window.",
                [("_standardButton", "standard", "Standard"), ("_dailyButton", "daily", "Daily"), ("_customButton", "custom", "Custom"), ("_backButton", "back", "Back")]),
            ("NMainMenu", "main", "Choose an action in the original STS2 window.",
                [("_continueButton", "continue", "Continue"), ("_abandonRunButton", "abandon_run", "Abandon run"), ("_singleplayerButton", "singleplayer", "Single player"), ("_multiplayerButton", "multiplayer", "Multiplayer"), ("_compendiumButton", "compendium", "Compendium"), ("_timelineButton", "timeline", "Timeline"), ("_settingsButton", "settings", "Settings"), ("_quitButton", "quit", "Quit")])
        ];

        foreach (var definition in definitions)
        {
            Node? screen = FindVisibleNodeByTypeName(tree.Root, definition.TypeName);
            if (screen is null) continue;
            List<MenuCharacterSnapshotDto>? characters = null;
            int? currentProfileId = null;
            string popupBody = string.Empty;
            MenuRunSetupSnapshotDto? runSetup = null;
            MenuLobbySnapshotDto? lobby = null;
            List<MenuOptionSnapshotDto> options;
            if (definition.Screen is "character_select" or "custom_run")
            {
                (options, characters) = BuildCharacterMenuState(screen);
                runSetup = BuildRunSetup(screen);
                lobby = BuildMenuLobby(screen);
                if (definition.Screen == "custom_run")
                {
                    options.RemoveAll(option => option.Id is "confirm" or "unready" or "back");
                    AddMenuOption(options, screen, "_confirmButton", "confirm", "Confirm");
                    AddMenuOption(options, screen, "_unreadyButton", "unready", "Unready");
                    AddMenuOption(options, screen, "_backButton", "back", "Back");
                }
            }
            else if (definition.Screen == "daily_run")
            {
                options = [];
                AddMenuOption(options, screen, "_embarkButton", "confirm", "Confirm");
                AddMenuOption(options, screen, "_unreadyButton", "unready", "Unready");
                AddMenuOption(options, screen, "_backButton", "back", "Back");
                runSetup = BuildRunSetup(screen);
                lobby = BuildMenuLobby(screen);
            }
            else if (definition.Screen == "profile_select")
            {
                options = BuildProfileMenuOptions(screen);
                currentProfileId = SaveManager.Instance?.CurrentProfileId;
            }
            else if (definition.Screen == "popup")
            {
                (options, popupBody) = BuildPopupMenuState(screen);
                if (options.Count == 0) continue;
            }
            else
            {
                options = definition.Fields
                    .Select(field => BuildMenuOption(screen, field.Field, field.Id, field.Label))
                    .Where(option => option is not null)
                    .Cast<MenuOptionSnapshotDto>()
                    .ToList();
            }
            return new MenuScreenDto(false, definition.Screen, definition.Message, options, false, currentProfileId, characters, popupBody, runSetup, lobby);
        }

        return new MenuScreenDto(false, "unknown", "No active run; use the original STS2 window to continue.", [], false);
    }

    private static MenuOptionSnapshotDto? BuildMenuOption(Node screen, string fieldName, string id, string label)
    {
        object? value = GetInstanceFieldValue(screen, fieldName);
        if (value is not CanvasItem item || !item.IsVisibleInTree()) return null;
        bool enabled = value.GetType().GetProperty("IsEnabled")?.GetValue(value) as bool? ?? true;
        return new MenuOptionSnapshotDto(id, label, enabled);
    }

    private static void AddMenuOption(List<MenuOptionSnapshotDto> options, Node screen, string field, string id, string label)
    {
        MenuOptionSnapshotDto? option = BuildMenuOption(screen, field, id, label);
        if (option is not null) options.Add(option);
    }

    private static (List<MenuOptionSnapshotDto> Options, List<MenuCharacterSnapshotDto> Characters) BuildCharacterMenuState(Node screen)
    {
        var options = new List<MenuOptionSnapshotDto>();
        var characters = new List<MenuCharacterSnapshotDto>();
        foreach (Node button in FindNodesByTypeName(screen, "NCharacterSelectButton"))
        {
            object? character = button.GetType().GetProperty("Character")?.GetValue(button);
            if (character is null) continue;
            string id = GetModelId(character);
            if (string.IsNullOrWhiteSpace(id)) continue;
            string label = GetLocalizedProperty(character, "Title", id);
            bool locked = button.GetType().GetProperty("IsLocked")?.GetValue(button) as bool? ?? false;
            options.Add(new MenuOptionSnapshotDto(id, label, !locked));
            characters.Add(new MenuCharacterSnapshotDto(
                id,
                label,
                locked,
                GetIntProperty(character, "StartingHp"),
                GetIntProperty(character, "StartingGold"),
                GetIntProperty(character, "MaxEnergy"),
                GetLocalizedProperty(character, "CardsModifierDescription"),
                BuildStartingRelics(character),
                BuildStartingDeck(character)));
        }

        foreach ((string field, string id, string label) in new[]
        {
            ("_embarkButton", "confirm", "Confirm"),
            ("_unreadyButton", "unready", "Unready"),
            ("_backButton", "back", "Back")
        })
        {
            MenuOptionSnapshotDto? option = BuildMenuOption(screen, field, id, label);
            if (option is not null) options.Add(option);
        }
        return (options, characters);
    }

    private static List<MenuOptionSnapshotDto> BuildProfileMenuOptions(Node screen)
    {
        var options = new List<MenuOptionSnapshotDto>();
        if (GetInstanceFieldValue(screen, "_profileButtons") is System.Collections.IEnumerable buttons)
        {
            foreach (object button in buttons)
            {
                if (GetInstanceFieldValue(button, "_profileId") is not int id) continue;
                bool enabled = button.GetType().GetProperty("IsEnabled")?.GetValue(button) as bool? ?? false;
                options.Add(new MenuOptionSnapshotDto($"profile_{id}", $"Profile {id}", enabled));
            }
        }
        MenuOptionSnapshotDto? back = BuildMenuOption(screen, "_backButton", "back", "Back");
        if (back is not null) options.Add(back);
        return options;
    }

    private static (List<MenuOptionSnapshotDto> Options, string Body) BuildPopupMenuState(Node screen)
    {
        var options = new List<MenuOptionSnapshotDto>();
        foreach ((string property, string id, string label) in new[]
        {
            ("YesButton", "yes", "Yes"),
            ("NoButton", "no", "No")
        })
        {
            object? button = screen.GetType().GetProperty(property)?.GetValue(screen);
            if (button is not CanvasItem item || !item.IsVisibleInTree()) continue;
            bool enabled = button.GetType().GetProperty("IsEnabled")?.GetValue(button) as bool? ?? false;
            options.Add(new MenuOptionSnapshotDto(id, label, enabled));
        }
        string body = FindNodesByTypeName(screen, "NFormattedLabel")
            .Select(ReadControlText)
            .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text)) ?? string.Empty;
        return (options, body);
    }

    private static List<MenuStartingRelicSnapshotDto> BuildStartingRelics(object character)
    {
        var relics = new List<MenuStartingRelicSnapshotDto>();
        if (character.GetType().GetProperty("StartingRelics")?.GetValue(character) is not System.Collections.IEnumerable values) return relics;
        foreach (object relic in values)
        {
            relics.Add(new MenuStartingRelicSnapshotDto(
                GetLocalizedProperty(relic, "Title", GetModelId(relic)),
                GetLocalizedProperty(relic, "DynamicDescription")));
        }
        return relics;
    }

    private static List<string> BuildStartingDeck(object character)
    {
        var cards = new List<string>();
        if (character.GetType().GetProperty("StartingDeck")?.GetValue(character) is not System.Collections.IEnumerable values) return cards;
        foreach (object card in values) cards.Add(GetLocalizedProperty(card, "Title", GetModelId(card)));
        return cards;
    }

    private static MenuRunSetupSnapshotDto? BuildRunSetup(Node screen)
    {
        object? lobby = screen.GetType().GetProperty("Lobby")?.GetValue(screen)
            ?? GetInstanceFieldValue(screen, "_lobby");
        if (lobby is null) return null;
        object? dailyTime = lobby.GetType().GetProperty("DailyTime")?.GetValue(lobby);
        object? dailyValue = dailyTime?.GetType().GetProperty("Value")?.GetValue(dailyTime) ?? dailyTime;
        object? serverTime = dailyValue is null ? null : GetInstanceFieldValue(dailyValue, "serverTime");
        var modifiers = new List<MenuModifierSnapshotDto>();
        if (lobby.GetType().GetProperty("Modifiers")?.GetValue(lobby) is System.Collections.IEnumerable values)
        {
            foreach (object modifier in values)
            {
                modifiers.Add(new MenuModifierSnapshotDto(
                    GetModelId(modifier),
                    GetLocalizedProperty(modifier, "Title", GetModelId(modifier)),
                    GetLocalizedProperty(modifier, "Description")));
            }
        }
        return new MenuRunSetupSnapshotDto(
            lobby.GetType().GetProperty("GameMode")?.GetValue(lobby)?.ToString()?.ToLowerInvariant() ?? "unknown",
            GetIntProperty(lobby, "Ascension"),
            GetIntProperty(lobby, "MaxAscension"),
            lobby.GetType().GetProperty("Seed")?.GetValue(lobby)?.ToString(),
            lobby.GetType().GetProperty("Act1")?.GetValue(lobby)?.ToString() ?? "unknown",
            serverTime is DateTimeOffset timestamp ? timestamp.ToString("O") : null,
            modifiers);
    }

    private static MenuLobbySnapshotDto? BuildMenuLobby(Node screen)
    {
        object? lobby = screen.GetType().GetProperty("Lobby")?.GetValue(screen)
            ?? GetInstanceFieldValue(screen, "_lobby");
        if (lobby is null) return null;
        object? netService = lobby.GetType().GetProperty("NetService")?.GetValue(lobby);
        string role = netService?.GetType().GetProperty("Type")?.GetValue(netService)?.ToString()?.ToLowerInvariant() ?? "unknown";
        string localPlayerId = string.Empty;
        object? localPlayer = lobby.GetType().GetProperty("LocalPlayer")?.GetValue(lobby);
        if (localPlayer is not null) localPlayerId = GetInstanceFieldValue(localPlayer, "id")?.ToString() ?? string.Empty;
        var players = new List<MenuLobbyPlayerSnapshotDto>();
        if (lobby.GetType().GetProperty("Players")?.GetValue(lobby) is System.Collections.IEnumerable values)
        {
            foreach (object player in values)
            {
                string id = GetInstanceFieldValue(player, "id")?.ToString() ?? string.Empty;
                int slotId = GetInstanceFieldValue(player, "slotId") as int? ?? -1;
                if (string.IsNullOrEmpty(id) || slotId < 0) continue;
                object? character = GetInstanceFieldValue(player, "character");
                bool isLocal = !string.IsNullOrEmpty(localPlayerId) && id == localPlayerId;
                players.Add(new MenuLobbyPlayerSnapshotDto(
                    id,
                    slotId,
                    isLocal,
                    role == "host" ? isLocal : null,
                    character is null ? string.Empty : GetModelId(character),
                    character is null ? string.Empty : GetLocalizedProperty(character, "Title", GetModelId(character)),
                    GetInstanceFieldValue(player, "isReady") as bool? ?? false));
            }
        }
        if (players.Count == 0 || players.Count(player => player.IsLocal) != 1) return null;
        int maxPlayers = GetIntProperty(lobby, "MaxPlayers");
        return new MenuLobbySnapshotDto(
            role,
            maxPlayers > 0 ? maxPlayers : null,
            localPlayerId,
            players.Count > 0 && players.All(player => player.IsReady),
            players);
    }

    private static string GetModelId(object model)
    {
        object? id = model.GetType().GetProperty("Id")?.GetValue(model);
        return id?.GetType().GetProperty("Entry")?.GetValue(id)?.ToString() ?? id?.ToString() ?? string.Empty;
    }

    private static int GetIntProperty(object instance, string propertyName) =>
        instance.GetType().GetProperty(propertyName)?.GetValue(instance) as int? ?? 0;

    private static string GetLocalizedProperty(object instance, string propertyName, string fallback = "") =>
        instance.GetType().GetProperty(propertyName)?.GetValue(instance) is LocString value
            ? SafeFormat(value)
            : fallback;

    private static string ReadControlText(Node node)
    {
        Variant text = node.Get("text");
        return text.VariantType == Variant.Type.Nil ? string.Empty : NormalizeRichText(text.AsString());
    }

    private static object? GetInstanceFieldValue(object instance, string fieldName)
    {
        for (Type? type = instance.GetType(); type is not null; type = type.BaseType)
        {
            FieldInfo? field = type.GetField(fieldName, BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            if (field is not null) return field.GetValue(instance);
        }
        return null;
    }

    private static Node? FindVisibleNodeByTypeName(Node parent, string typeName) =>
        FindNodesByTypeName(parent, typeName).FirstOrDefault(node => node is CanvasItem item && item.IsVisibleInTree());

    private static List<Node> FindNodesByTypeName(Node parent, string typeName, List<Node>? results = null)
    {
        results ??= [];
        if (parent.GetType().Name == typeName) results.Add(parent);
        foreach (Node child in parent.GetChildren()) FindNodesByTypeName(child, typeName, results);
        return results;
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
                        NativeActionToken.For(button.Reward),
                        "card",
                        "Card reward",
                        SafeFormat(cardReward.Description),
                        cardReward.Cards.Select((card, cardIndex) => BuildRewardCard(card, cardIndex)).ToList()));
                    break;
                case GoldReward goldReward:
                    items.Add(new RewardItemSnapshotDto(index, NativeActionToken.For(button.Reward), "gold", $"{goldReward.Amount} gold", SafeFormat(goldReward.Description), []));
                    break;
                case RelicReward relicReward:
                    string relic = SafeFormat(relicReward.Description);
                    items.Add(new RewardItemSnapshotDto(index, NativeActionToken.For(button.Reward), "relic", relic, relic, []));
                    break;
                case PotionReward potionReward:
                    items.Add(new RewardItemSnapshotDto(index, NativeActionToken.For(button.Reward), "potion", "Potion", SafeFormat(potionReward.Description), []));
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
                NativeActionToken.For(option),
                SafeFormat(option.Title),
                SafeFormat(option.Description),
                option.IsLocked,
                option.IsProceed))
            .ToList();
        if (model.IsFinished && options.Count == 0)
        {
            options.Add(new EventOptionSnapshotDto(0, "event-proceed", "Leave", "Leave the event.", false, true));
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
        string interactionState = targetSelectionPending
            ? "player_target"
            : options.Count > 0
                ? "options"
                : canProceed
                    ? "proceed"
                    : "resolving";
        return new RestScreenDto(
            !targetSelectionPending && (options.Count > 0 || canProceed),
            interactionState,
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
            "character_card", index, entry.CreationResult?.Card?.Id.ToString() ?? string.Empty,
            NormalizeRichText(entry.CreationResult?.Card?.Title.ToString() ?? "Unknown card"),
            entry.Cost, GetCardDescription(entry.CreationResult?.Card), entry.IsStocked, entry.EnoughGold)));
        items.AddRange(inventory.ColorlessCardEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "colorless_card", index, entry.CreationResult?.Card?.Id.ToString() ?? string.Empty,
            NormalizeRichText(entry.CreationResult?.Card?.Title.ToString() ?? "Unknown card"),
            entry.Cost, GetCardDescription(entry.CreationResult?.Card), entry.IsStocked, entry.EnoughGold)));
        items.AddRange(inventory.RelicEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "relic", index, entry.Model?.Id.ToString() ?? string.Empty,
            entry.Model is null ? "Unknown relic" : SafeFormat(entry.Model.Title),
            entry.Cost, entry.Model is null ? string.Empty : SafeFormat(entry.Model.DynamicDescription), entry.IsStocked, entry.EnoughGold)));
        items.AddRange(inventory.PotionEntries.Select((entry, index) => new ShopItemSnapshotDto(
            "potion", index, entry.Model?.Id.ToString() ?? string.Empty,
            entry.Model is null ? "Unknown potion" : SafeFormat(entry.Model.Title),
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
            NormalizeRichText(card.Title.ToString() ?? string.Empty),
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
        int mapGeneration = RunManager.Instance.MapSelectionSynchronizer.MapGenerationCount;
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
            StableId: $"map-{mapGeneration}-{point.coord.col}-{point.coord.row}",
            Column: point.coord.col,
            Row: point.coord.row,
            NodeType: point.PointType.ToString(),
            Reachable: reachableCoordinates.Contains((point.coord.col, point.coord.row)));

        return new MapScreenDto(
            WaitingForInput: reachable.Any(),
            MapGeneration: mapGeneration,
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

        var deckCards = player?.Deck?.Cards
            .Select((card, index) => BuildInventoryCard(card, index, PileType.None))
            .ToList() ?? [];

        return new RunSnapshotDto(
            runState.AscensionLevel,
            runState.CurrentActIndex + 1,
            runState.ActFloor,
            player?.Gold ?? 0,
            relics,
            player?.Character.Id.ToString() ?? string.Empty,
            player is null ? string.Empty : SafeFormat(player.Character.Title),
            deckCards);
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

        int? stars = player.Character.ShouldAlwaysShowStarCounter || playerCombatState.Stars > 0
            ? playerCombatState.Stars
            : null;

        int orbCapacity = playerCombatState.OrbQueue?.Capacity ?? 0;
        var orbs = playerCombatState.OrbQueue?.Orbs
            .Select(orb =>
            {
                LocString description = orb.SmartDescription;
                description.Add("energyPrefix", orb.Owner.Character.CardPool.Title);
                description.Add("Passive", orb.PassiveVal);
                description.Add("Evoke", orb.EvokeVal);
                return new OrbSnapshotDto(
                    orb.Id.ToString(),
                    SafeFormat(orb.Title),
                    SafeFormat(description),
                    orb.PassiveVal,
                    orb.EvokeVal);
            })
            .ToList() ?? [];

        var companions = new List<CompanionSnapshotDto>();
        Osty? osty = playerCombatState.GetPet<Osty>();
        if (osty is not null)
        {
            companions.Add(new CompanionSnapshotDto(
                osty.Monster?.Id.ToString() ?? "OSTY",
                osty.Monster is null ? "Osty" : SafeFormat(osty.Monster.Title),
                osty.IsAlive,
                osty.CurrentHp,
                osty.MaxHp,
                osty.Block,
                osty.Powers.Select(power => new PowerSnapshotDto(
                    SafeFormat(power.Title),
                    power.Amount,
                    SafeFormat(power.Description))).ToList()));
        }

        return new CombatScreenDto(
            WaitingForInput: waitingForInput,
            RoundNumber: combatState.RoundNumber,
            IsPlayPhase: playerCombatState.Phase == PlayerTurnPhase.Play,
            Energy: playerCombatState.Energy,
            MaxEnergy: playerCombatState.MaxEnergy,
            Player: new PlayerSnapshotDto(
                player.Creature.CurrentHp,
                player.Creature.MaxHp,
                player.Creature.Block,
                player.Creature.Powers
                    .Select(power => new PowerSnapshotDto(
                        SafeFormat(power.Title),
                        power.Amount,
                        SafeFormat(power.Description)))
                    .ToList()),
            Stars: stars,
            OrbCapacity: orbCapacity,
            Orbs: orbs,
            Companions: companions,
            Hand: hand,
            Piles: new PileSnapshotDto(
                playerCombatState.DrawPile.Cards.Count,
                playerCombatState.DiscardPile.Cards.Count,
                playerCombatState.ExhaustPile.Cards.Count,
                playerCombatState.DrawPile.Cards
                    .Select((card, index) => BuildInventoryCard(card, index, PileType.Draw))
                    .ToList(),
                playerCombatState.DiscardPile.Cards
                    .Select((card, index) => BuildInventoryCard(card, index, PileType.Discard))
                    .ToList(),
                playerCombatState.ExhaustPile.Cards
                    .Select((card, index) => BuildInventoryCard(card, index, PileType.Exhaust))
                    .ToList()),
            Enemies: enemies,
            PotionCapacity: player.PotionSlots.Count,
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
            Name: NormalizeRichText(card.Title),
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

    private static CardInventorySnapshotDto BuildInventoryCard(
        CardModel card,
        int index,
        PileType pile) => new(
            index,
            card.Id.ToString(),
            SafeFormat(card.Title),
            card.Type.ToString(),
            card.Rarity.ToString(),
            GetCardDescription(card, pile),
            card.IsUpgraded);

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
            Intent: NormalizeRichText(intent),
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
            actionPending = !stableDecisionState;
        }
        else if (!stableDecisionState)
        {
            // Publish live animation/action-queue state but retain the last committed decision revision.
            ResetCandidate();
            actionPending = true;
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
        if (string.Equals(phase, PhaseNames.Unknown, StringComparison.Ordinal))
        {
            return false;
        }

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
                rest.InteractionState,
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

    private StateEnvelope CreateTransitionEnvelope(string message) => CreateEnvelope(
        PhaseNames.Unknown,
        new RunSnapshotDto(0, 0, 0, 0, []),
        new
        {
            waiting_for_input = false,
            transition = true,
            message
        });

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
            return NormalizeRichText(value.GetFormattedText() ?? string.Empty);
        }
        catch
        {
            try
            {
                return NormalizeRichText(value.GetRawText());
            }
            catch
            {
                return string.Empty;
            }
        }
    }

    private static string GetCardDescription(CardModel? card, PileType pile = PileType.Hand)
    {
        if (card is null) return string.Empty;
        try
        {
            return NormalizeRichText(card.GetDescriptionForPile(pile));
        }
        catch
        {
            // Fall through to the older description construction path for version compatibility.
        }
        try
        {
            LocString description = card.Description;
            card.DynamicVars.AddTo(description);
            description.Add(new IfUpgradedVar(card.IsUpgraded ? UpgradeDisplay.Upgraded : UpgradeDisplay.Normal));
            description.Add("InCombat", CombatManager.Instance.IsInProgress);
            description.Add("OnTable", false);
            description.Add("IsTargeting", false);
            description.Add("energyPrefix", EnergyIconHelper.GetPrefix(card));

            return NormalizeRichText(description.GetFormattedText());
        }
        catch
        {
            try
            {
                return NormalizeRichText(card.Description.GetRawText());
            }
            catch
            {
                return string.Empty;
            }
        }
    }

    private static string NormalizeRichText(string? text)
    {
        string normalized = text ?? string.Empty;
        normalized = Regex.Replace(normalized, @"\[br\s*/?\]", "\n", RegexOptions.IgnoreCase);
        normalized = Regex.Replace(
            normalized,
            @"\[img[^\]]*\](?<path>[^\[]*)\[/img\]",
            match =>
            {
                string filename = Path.GetFileNameWithoutExtension(match.Groups["path"].Value);
                filename = Regex.Replace(filename, @"_icon$", string.Empty, RegexOptions.IgnoreCase);
                filename = Regex.Replace(filename, @".*_energy$", "energy", RegexOptions.IgnoreCase);
                return string.IsNullOrWhiteSpace(filename)
                    ? " "
                    : $" {filename.Replace('_', ' ').Replace('-', ' ')} ";
            },
            RegexOptions.IgnoreCase);
        normalized = Regex.Replace(
            normalized,
            @"\[/?[a-z][a-z0-9_-]*(?:[=\s][^\]]*)?\]",
            string.Empty,
            RegexOptions.IgnoreCase);
        normalized = Regex.Replace(
            normalized,
            @"\[/?[a-z][a-z0-9_-]*(?:=[^\]\s]+)?(?=\s|$|[.,;:!?])",
            string.Empty,
            RegexOptions.IgnoreCase);
        normalized = Regex.Replace(
            normalized,
            @"/(?:gold|red|green|blue|purple|orange|grey|gray|white)\b",
            string.Empty,
            RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"\{[^{}]+\}", string.Empty);
        normalized = Regex.Replace(normalized, @"[ \t]+", " ");
        normalized = Regex.Replace(normalized, @" *\r?\n *", "\n");
        normalized = Regex.Replace(normalized, @"\n{3,}", "\n\n");
        return normalized.Trim();
    }
}
