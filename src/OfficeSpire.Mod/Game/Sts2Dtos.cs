namespace OfficeSpire.Game;

internal sealed record RunSnapshotDto(
    int AscensionLevel,
    int CurrentAct,
    int CurrentFloor,
    int Gold,
    IReadOnlyList<RelicSnapshotDto> Relics);

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
    string Name,
    string Description,
    string TargetType);

internal sealed record MapScreenDto(
    bool WaitingForInput,
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
