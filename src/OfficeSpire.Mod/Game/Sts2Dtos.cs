namespace OfficeSpire.Game;

internal sealed record RunSnapshotDto(
    int AscensionLevel,
    int CurrentAct,
    int CurrentFloor,
    int Gold,
    IReadOnlyList<RelicSnapshotDto> Relics,
    string CharacterId = "",
    string CharacterName = "",
    IReadOnlyList<CardInventorySnapshotDto>? DeckCards = null,
    RunPartySnapshotDto? Party = null);

internal sealed record RunPartySnapshotDto(
    string Role,
    string LocalPlayerId,
    int ConnectedPlayers,
    IReadOnlyList<RunPartyMemberSnapshotDto> Members);

internal sealed record RunPartyMemberSnapshotDto(
    string Id,
    bool IsLocal,
    bool Connected,
    string CharacterId,
    string CharacterName,
    int CurrentHp,
    int MaxHp,
    int Block,
    bool IsAlive,
    int Gold,
    int MaxEnergy,
    int PotionCount,
    int PotionCapacity);

internal sealed record LifecycleScreenDto(
    bool WaitingForInput,
    string Status,
    string Message,
    bool CanStartRun,
    string Stage = "settling",
    int Score = 0,
    int FloorsClimbed = 0,
    int UnlocksRemaining = 0,
    int CurrentUnlockScore = 0,
    int UnlockScoreThreshold = 0,
    string UnlockedEpochId = "",
    LifecycleDiscoveriesDto? Discoveries = null,
    bool CanViewSummary = false,
    bool CanReturnToMenu = false);

internal sealed record LifecycleDiscoveriesDto(
    int Cards,
    int Relics,
    int Potions,
    int Enemies,
    int Epochs);

internal sealed record MenuScreenDto(
    bool WaitingForInput,
    string MenuScreen,
    string Message,
    IReadOnlyList<MenuOptionSnapshotDto> Options,
    bool CanMutate,
    int? CurrentProfileId = null,
    IReadOnlyList<MenuCharacterSnapshotDto>? Characters = null,
    string PopupBody = "",
    MenuRunSetupSnapshotDto? RunSetup = null,
    MenuLobbySnapshotDto? Lobby = null,
    MenuConnectionSnapshotDto? Connection = null,
    MenuSavedRunSnapshotDto? SavedRun = null,
    string PopupTitle = "");

internal sealed record MenuOptionSnapshotDto(
    string Id,
    string Label,
    bool Enabled,
    bool Actionable = false);

internal sealed record MenuCharacterSnapshotDto(
    string Id,
    string Name,
    bool Locked,
    int StartingHp,
    int StartingGold,
    int MaxEnergy,
    string Description,
    IReadOnlyList<MenuStartingRelicSnapshotDto> StartingRelics,
    IReadOnlyList<string> StartingDeck);

internal sealed record MenuStartingRelicSnapshotDto(
    string Name,
    string Description);

internal sealed record MenuRunSetupSnapshotDto(
    string Mode,
    int Ascension,
    int MaxAscension,
    string? Seed,
    string ActOne,
    string? DailyServerTime,
    IReadOnlyList<MenuModifierSnapshotDto> Modifiers);

internal sealed record MenuModifierSnapshotDto(
    string Id,
    string Name,
    string Description);

internal sealed record MenuLobbySnapshotDto(
    string Role,
    int? MaxPlayers,
    string LocalPlayerId,
    bool AllReady,
    IReadOnlyList<MenuLobbyPlayerSnapshotDto> Players);

internal sealed record MenuLobbyPlayerSnapshotDto(
    string Id,
    int SlotId,
    bool IsLocal,
    bool? IsHost,
    string CharacterId,
    string CharacterName,
    bool IsReady);

internal sealed record MenuConnectionSnapshotDto(
    string Status,
    int ConnectedPlayers,
    int? RequiredPlayers,
    IReadOnlyList<MenuSessionSnapshotDto> Sessions);

internal sealed record MenuSessionSnapshotDto(
    string Id,
    string Label,
    bool Enabled);

internal sealed record MenuSavedRunSnapshotDto(
    string Mode,
    int Ascension,
    int CurrentAct,
    int VisitedFloorCount,
    int MissingPlayers,
    IReadOnlyList<MenuSavedPlayerSnapshotDto> Players);

internal sealed record MenuSavedPlayerSnapshotDto(
    string Id,
    string CharacterId,
    int CurrentHp,
    int MaxHp,
    int MaxEnergy,
    int PotionCapacity,
    int Gold,
    bool Connected);

internal sealed record RelicSnapshotDto(
    string Id,
    string Name,
    string Description,
    int StackCount);

internal sealed record CombatScreenDto(
    bool WaitingForInput,
    int RoundNumber,
    bool IsPlayPhase,
    string CombatPhase,
    bool ActionQueuesEmpty,
    IReadOnlyList<CombatParticipantSnapshotDto> Participants,
    int Energy,
    int MaxEnergy,
    PlayerSnapshotDto Player,
    int? Stars,
    int OrbCapacity,
    IReadOnlyList<OrbSnapshotDto> Orbs,
    IReadOnlyList<CompanionSnapshotDto> Companions,
    IReadOnlyList<CardSnapshotDto> Hand,
    PileSnapshotDto Piles,
    IReadOnlyList<EnemySnapshotDto> Enemies,
    int PotionCapacity,
    IReadOnlyList<PotionSnapshotDto> Potions);

internal sealed record CombatParticipantSnapshotDto(
    string PlayerId,
    string TurnPhase,
    bool IsPlayPhase,
    bool ActionQueuePaused,
    bool CanSubmitActions);

internal sealed record PlayerSnapshotDto(
    int CurrentHp,
    int MaxHp,
    int Block,
    IReadOnlyList<PowerSnapshotDto> Powers);

internal sealed record PileSnapshotDto(
    int Draw,
    int Discard,
    int Exhaust,
    IReadOnlyList<CardInventorySnapshotDto> DrawCards,
    IReadOnlyList<CardInventorySnapshotDto> DiscardCards,
    IReadOnlyList<CardInventorySnapshotDto> ExhaustCards);

internal sealed record CardInventorySnapshotDto(
    int Index,
    string Id,
    string Name,
    string Type,
    string Rarity,
    string Description,
    bool IsUpgraded);

internal sealed record CardSnapshotDto(
    int HandIndex,
    string Id,
    string Name,
    int Cost,
    string Type,
    string Rarity,
    int? Damage,
    int? Block,
    string Description,
    bool CanPlay,
    string? UnplayableReason,
    bool NeedsTarget,
    IReadOnlyList<int> ValidTargetIds);

internal sealed record EnemySnapshotDto(
    string StableId,
    int CombatId,
    string Name,
    int CurrentHp,
    int MaxHp,
    int Block,
    string Intent,
    IReadOnlyList<PowerSnapshotDto> Powers,
    bool IsAlive,
    bool IsHittable);

internal sealed record PowerSnapshotDto(
    string Name,
    int Amount,
    string Description);

internal sealed record OrbSnapshotDto(
    string Id,
    string Name,
    string Description,
    int PassiveValue,
    int EvokeValue);

internal sealed record CompanionSnapshotDto(
    string Id,
    string Name,
    bool IsAlive,
    int CurrentHp,
    int MaxHp,
    int Block,
    IReadOnlyList<PowerSnapshotDto> Powers);

internal sealed record PotionSnapshotDto(
    int SlotIndex,
    string Id,
    string Name,
    string Description,
    string TargetType,
    bool CanUse,
    bool CanDiscard,
    bool NeedsTarget,
    IReadOnlyList<int> ValidTargetIds);

internal sealed record MapScreenDto(
    bool WaitingForInput,
    int MapGeneration,
    MapNodeSnapshotDto? CurrentNode,
    IReadOnlyList<MapNodeSnapshotDto> ReachableNodes,
    IReadOnlyList<MapNodeSnapshotDto> AllNodes,
    IReadOnlyList<DecisionVoteSnapshotDto> Votes);

internal sealed record DecisionVoteSnapshotDto(
    string PlayerId,
    int? ChoiceIndex,
    string? ChoiceId);

internal sealed record MapNodeSnapshotDto(
    string StableId,
    int Column,
    int Row,
    string NodeType,
    bool Reachable);

internal sealed record RewardsScreenDto(
    bool WaitingForInput,
    string Mode,
    IReadOnlyList<RewardItemSnapshotDto> Items,
    IReadOnlyList<RewardCardSnapshotDto> CardChoices,
    bool CanSkip);

internal sealed record RewardItemSnapshotDto(
    int ChoiceIndex,
    string ActionToken,
    string RewardType,
    string Name,
    string Description,
    IReadOnlyList<RewardCardSnapshotDto> CardOptions);

internal sealed record RewardCardSnapshotDto(
    int ChoiceIndex,
    string Id,
    string Name,
    int Cost,
    string Type,
    string Rarity,
    string Description);

internal sealed record CardSelectionScreenDto(
    bool WaitingForInput,
    string SelectionType,
    IReadOnlyList<RewardCardSnapshotDto> Options,
    bool CanSkip,
    int MinSelect = 1,
    int MaxSelect = 1,
    int CurrentSelectCount = 0,
    bool CanConfirm = false,
    string? UnavailableReason = null);

internal sealed record EventScreenDto(
    bool WaitingForInput,
    string Name,
    string Description,
    bool IsFinished,
    IReadOnlyList<EventOptionSnapshotDto> Options,
    bool IsShared,
    IReadOnlyList<DecisionVoteSnapshotDto> Votes);

internal sealed record EventOptionSnapshotDto(
    int OptionIndex,
    string ActionToken,
    string Title,
    string Description,
    bool IsLocked,
    bool IsProceed);

internal sealed record SpecialEventScreenDto(
    bool WaitingForInput,
    string Variant,
    string NativeType,
    string Message,
    string? SelectedTool,
    int? RemainingActions,
    IReadOnlyList<SpecialEventCellSnapshotDto> Cells,
    bool CanSelectSmallTool,
    bool CanSelectBigTool,
    bool CanProceed,
    string? UnavailableReason);

internal sealed record SpecialEventCellSnapshotDto(
    int X,
    int Y,
    string StableId,
    string Label);

internal sealed record RestScreenDto(
    bool WaitingForInput,
    string InteractionState,
    IReadOnlyList<RestOptionSnapshotDto> Options,
    bool CanProceed,
    bool TargetSelectionPending,
    IReadOnlyList<PlayerRestDecisionSnapshotDto> PlayerDecisions);

internal sealed record PlayerRestDecisionSnapshotDto(
    string PlayerId,
    IReadOnlyList<RestOptionSnapshotDto> AvailableOptions,
    int? LastChosenOptionIndex,
    int? HoveredOptionIndex);

internal sealed record RestOptionSnapshotDto(
    int OptionIndex,
    string Id,
    string Name,
    string Description);

internal sealed record TreasureScreenDto(
    bool WaitingForInput,
    bool ChestOpened,
    bool IsPicking,
    bool CanLeave,
    IReadOnlyList<TreasureRelicSnapshotDto> Relics,
    int? SelectedRelicIndex,
    IReadOnlyList<DecisionVoteSnapshotDto> Votes);

internal sealed record TreasureRelicSnapshotDto(
    int ChoiceIndex,
    string Id,
    string Name,
    string Description);

internal sealed record ShopScreenDto(
    bool WaitingForInput,
    bool InventoryOpen,
    int Gold,
    IReadOnlyList<ShopItemSnapshotDto> Items,
    bool CardRemovalAvailable,
    int CardRemovalCost,
    bool CanLeave);

internal sealed record ShopItemSnapshotDto(
    string Category,
    int ItemIndex,
    string ItemId,
    string Name,
    int Price,
    string Description,
    bool IsStocked,
    bool EnoughGold);
