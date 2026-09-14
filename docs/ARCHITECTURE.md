# Architecture

## Boundary

OfficeSpire is divided into a stable application/protocol layer and an unstable STS2 adapter layer.

```text
STS2 runtime types
      │
      ▼
IGameAdapter implementation   <-- version-sensitive
      │
      ▼
OfficeSpire protocol models   <-- stable/versioned
      │
      ▼
Loopback transport            <-- M2
      │
      ▼
Tauri overlay                 <-- M5
```

The overlay must never require direct knowledge of `MegaCrit.Sts2.*` types.

## M1 components

### `ModEntry`

The native STS2 mod initializer. It creates a Harmony instance and starts the OfficeSpire runtime host.

### `OfficeSpireRuntime`

Owns the active `IGameAdapter`. At M1 it uses `NullGameAdapter`, which exposes a safe unknown snapshot and rejects all mutations. Later milestones replace this adapter with a real STS2 adapter.

### `IGameAdapter`

The only interface through which higher OfficeSpire layers are allowed to read or mutate STS2 state.

This containment is important because STS2 Early Access updates may rename or move runtime classes and screens. Those changes should be repaired in adapter code rather than throughout transport/UI code.

### Protocol models

`Protocol/*` defines transport-safe state and action records. They use `System.Text.Json` only and must not depend on Godot, Harmony, or STS2 types.

## Threading rule for later milestones

Network callbacks must not mutate STS2 runtime objects directly. External requests will be validated/enqueued, then consumed from the game thread through the adapter/action dispatcher. State snapshots will likewise be captured from a safe game-thread location and published as immutable protocol objects.

This is a design requirement, not yet a runtime-validated implementation.
