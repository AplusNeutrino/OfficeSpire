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
