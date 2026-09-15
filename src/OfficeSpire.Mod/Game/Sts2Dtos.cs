namespace OfficeSpire.Game;

internal sealed record RunSnapshotDto(
    int AscensionLevel,
    int CurrentAct,
    int CurrentFloor,
    int Gold,
    IReadOnlyList<RelicSnapshotDto> Relics);

internal sealed record LifecycleScreenDto(
    bool WaitingForInput,
    string Status,
    string Message,
    bool CanStartRun);

internal sealed record RelicSnapshotDto(
    string Id,
    string Name,
    string Description,
    int StackCount);

internal sealed record CombatScreenDto(
    bool WaitingForInput,
    int RoundNumber,
    bool IsPlayPhase,
    int Energy,
    int MaxEnergy,
    PlayerSnapshotDto Player,
    IReadOnlyList<CardSnapshotDto> Hand,
    PileSnapshotDto Piles,
    IReadOnlyList<EnemySnapshotDto> Enemies,
    IReadOnlyList<PotionSnapshotDto> Potions);

internal sealed record PlayerSnapshotDto(
    int CurrentHp,
    int MaxHp,
    int Block);

internal sealed record PileSnapshotDto(
    int Draw,
    int Discard,
    int Exhaust);

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
    IReadOnlyList<MapNodeSnapshotDto> AllNodes);

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
    bool CanConfirm = false);

internal sealed record EventScreenDto(
    bool WaitingForInput,
    string Name,
    string Description,
    bool IsFinished,
    IReadOnlyList<EventOptionSnapshotDto> Options);

internal sealed record EventOptionSnapshotDto(
    int OptionIndex,
    string Title,
    string Description,
    bool IsLocked,
    bool IsProceed);

internal sealed record RestScreenDto(
    bool WaitingForInput,
    IReadOnlyList<RestOptionSnapshotDto> Options,
    bool CanProceed,
    bool TargetSelectionPending);

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
    int? SelectedRelicIndex);

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
