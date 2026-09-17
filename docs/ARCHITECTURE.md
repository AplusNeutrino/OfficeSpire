# Architecture

## Boundary

OfficeSpire is divided into a stable application/protocol layer and a version-sensitive STS2 adapter layer.

```text
STS2 runtime types
      │
      ├────────────► Sts2GameAdapter        (M3 reads, main thread)
      │                    │
      │                    ▼
      │             ProtocolStateStore
      │                    │
      │                    └────────────► Loopback WebSocket
      │
      └────────────► M4GameAdapter          (M4 writes, main thread)
                           ▲
                           │
                      ActionInbox
                           ▲
                           │
                  Loopback WebSocket
```

The future overlay never requires direct knowledge of `MegaCrit.Sts2.*` types.

## Main-thread rule

Godot/STS2 runtime objects are accessed only on the game's main thread.

`OfficeSpireUpdateNode` is attached under `NGame` and runs every 50 ms (`20 Hz`). Each tick captures the current adapter state exactly once. That same fresh state is used for the M4 second revision/readiness guard before any queued action can touch STS2.

The WebSocket server runs independently and may only:

- read immutable `StateEnvelope` snapshots from `ProtocolStateStore`;
- validate protocol fields/current cached revision;
- enqueue an `ActionRequest` into `ActionInbox`;
- read thread-safe action-status records.

It must never call STS2/Godot APIs.

## M4 write path

```text
WebSocket `action`
      │
      ├─ request_id / phase / action_pending / expected_revision check
      ▼
ActionInbox (single active mutation)
      │
      ▼
next OfficeSpireUpdateNode tick
      │
      ├─ capture fresh authoritative state once
      ├─ expected_revision check again
      ├─ action_pending/readiness check again
      ▼
M4GameAdapter.Dispatch
      │
      ├─ current combat/player/card/potion/target validation
      ▼
STS2 normal action path
      │
      ├─ PlayCardAction -> ActionQueueSynchronizer.RequestEnqueue
      ├─ EndPlayerTurnAction -> ActionQueueSynchronizer.RequestEnqueue
      └─ potion.EnqueueManualUse
```

The double revision check closes the race between a WebSocket request being accepted into the local queue and the next game-thread tick.

## Action settlement

OfficeSpire does not optimistically mutate state after dispatch.

After STS2 accepts a native action, the inbox keeps the public state at `action_pending=true`. The already runtime-validated M3 semantic revision system continues observing the game. When it publishes a **newer settled revision** with its own pending flag false, the inbox marks the request `completed` and releases the single-action gate.

The overlay observes an individual request for at most 15 seconds. A client timeout stops status polling and restores client responsiveness, but does not replay the mutation; periodic state snapshots remain authoritative because the original action may have executed despite a delayed result. Reconnect attempts use bounded backoff and discard stale-socket callbacks.

```text
READY rev=N
  -> queued
  -> accepted by game thread
  -> action_pending=true, rev=N
  -> STS2 executes/animates/resolves
  -> M3 semantic settlement
  -> rev=N+1, action_pending=false
  -> completed
```

A request can be rejected after initial `queued` if the fresh main-thread state no longer matches the request revision.

## Components

### `ModEntry`

Native STS2 mod initializer. It initializes Harmony, registers the assembly with Godot's script manager, starts the OfficeSpire runtime/transport, and attaches the STS2 bridge.

### `OfficeSpireRuntime`

Owns:

- the active `IGameAdapter`;
- `ProtocolStateStore`;
- `ActionInbox`;
- the loopback WebSocket server.

When the runtime receives the validated M3 `Sts2GameAdapter`, it wraps it in `M4GameAdapter`: state capture still delegates to M3, while mutation goes through M4.

### `Sts2GameAdapter`

Runtime-validated M3 reader for the current supported combat state. It owns semantic `state_revision` generation and engine-settlement gating.

### `M4GameAdapter`

Version-sensitive write adapter. It performs final combat/readiness/playability/target checks on the game thread and uses the game's normal action paths. Initial source support: `play_card`, `end_turn`, `use_potion`.

### `ActionInbox`

Thread-safe one-action-at-a-time lifecycle manager. It owns:

- transport-side stale/pending rejection;
- queued request handoff;
- second main-thread stale/readiness rejection;
- accepted action ownership until semantic settlement;
- bounded request-status history for `get_action_result`.

### `ProtocolStateStore`

A thread-safe reference to the latest immutable `StateEnvelope`. It is the only live game-state object visible to the transport layer.

### `LoopbackWebSocketServer`

Direct TCP/WebSocket server bound to `127.0.0.1` on an OS-assigned port and authenticated with the random process token. It supports heartbeat/state plus the M4 action queue and action-status query.

## Failure behavior

If the STS2 adapter cannot attach after a game update, OfficeSpire should remain loaded with `NullGameAdapter` and expose `phase=unknown` rather than breaking the run.

If an M4 request fails validation or dispatch, the original STS2 UI remains untouched and playable. OfficeSpire does not synthesize fallback input or retry mutations automatically.
