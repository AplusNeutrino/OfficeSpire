# Architecture

## Boundary

OfficeSpire is divided into a stable application/protocol layer and an unstable STS2 adapter layer.

```text
STS2 runtime types
      │
      ▼
Sts2GameAdapter                 <-- version-sensitive, main thread
      │
      ▼
ProtocolStateStore              <-- immutable protocol snapshots
      │
      ├─────────────► Loopback WebSocket server
      │                         │
      │                         ▼
      │                  future Tauri overlay
      │
      ▼
future game-thread action queue <-- M4
```

The overlay must never require direct knowledge of `MegaCrit.Sts2.*` types.

## Game-thread rule

Godot/STS2 runtime objects are accessed only on the game's main thread.

`OfficeSpireUpdateNode` is attached under `NGame` and runs every 50 ms (`20 Hz`). It asks the active adapter to capture a normalized state snapshot and publishes that immutable snapshot into `ProtocolStateStore`.

The WebSocket server runs independently and reads only from `ProtocolStateStore`. It never touches STS2 objects.

M4 will use the inverse pattern for writes:

```text
WebSocket action request
      │
      ▼
validate protocol/revision
      │
      ▼
ConcurrentQueue
      │
      ▼
OfficeSpireUpdateNode / game thread
      │
      ▼
STS2 action system
```

## Components

### `ModEntry`

Native STS2 mod initializer. It initializes Harmony, registers the mod assembly with Godot's script manager, starts the OfficeSpire runtime/transport, and attaches the STS2 bridge.

### `OfficeSpireRuntime`

Owns:

- the active `IGameAdapter`;
- `ProtocolStateStore`;
- the loopback WebSocket server.

It begins with `NullGameAdapter` so transport can remain alive even if a future STS2 update breaks the real adapter.

### `IGameAdapter`

The only interface through which higher OfficeSpire layers may read or eventually mutate STS2 state.

### `Sts2GameAdapter`

M3 read-only implementation. It currently supports combat snapshots and returns `unknown` for unsupported phases. All code in this adapter should be treated as Early-Access-version-sensitive.

### `ProtocolStateStore`

A thread-safe reference to the latest immutable `StateEnvelope`. This is the only live game-state object visible to the transport layer.

### `LoopbackWebSocketServer`

Direct TCP/WebSocket server bound to `127.0.0.1` on an OS-assigned port. It authenticates using a random per-process token from the local session descriptor. M3 supports state reads/heartbeat; game actions remain disabled.

### Protocol models

`Protocol/*` defines transport-safe state and action records using `System.Text.Json`. They do not depend on Godot, Harmony, or STS2 types.

## Failure behavior

If the real adapter cannot attach after a game update, OfficeSpire should remain loaded with the `NullGameAdapter` and expose `phase=unknown` rather than breaking the run. The original STS2 interface always remains the fallback.
