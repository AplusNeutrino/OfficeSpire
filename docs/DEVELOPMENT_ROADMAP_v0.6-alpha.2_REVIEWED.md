# OfficeSpire v0.6-alpha.2 Development Roadmap (Reviewed)

Date: 2026-09-14

## 1. Repository audit

Current architecture:

```text
OfficeSpire
├── src/OfficeSpire.Mod
│   ├── Runtime
│   ├── Transport
│   ├── Protocol
│   ├── Game
│   └── Diagnostics
│
└── src/OfficeSpire.Overlay
    ├── React/Vite scaffold
    ├── App.tsx
    └── state types
```

Backend:

DONE baseline:

- Mod entry point
- Runtime initialization
- Harmony startup
- Local transport session
- Runtime bridge attachment
- State/action architecture

Overlay:

Current:

- React prototype exists
- Demo renderer exists
- Snapshot model exists

Missing:

- Tauri shell
- native window configuration
- WebSocket client
- live backend binding

## 2. Development workflow

All future work follows:

```text
Plan
 ↓
Implementation
 ↓
Build/Test
 ↓
Runtime Evidence
 ↓
Documentation Update
```

A feature is not complete until runtime evidence exists.

Status values:

- planned
- implemented_unverified
- runtime_pass
- runtime_fail
- blocked

## 3. v0.6-alpha.2 Goal

Create the first playable overlay prototype.

Target flow:

```text
STS2
 ↓
OfficeSpire Backend
 ↓
WebSocket
 ↓
Overlay
 ↓
Action Request
 ↓
Dispatcher
 ↓
STS2
```

## 4. Implementation plan

### M5.1 Overlay Desktop Shell

Status: TODO

Tasks:

- Add Tauri application shell
- Add Rust runtime
- Configure transparent window
- Configure borderless window
- Enable resize
- Enable dragging
- Enable always-on-top option
- Preserve React UI

Exit criteria:

Desktop overlay launches independently.

### M5.2 Protocol Integration

Status: TODO

Tasks:

- WebSocket client
- Handshake
- Heartbeat
- Reconnect
- Protocol version check
- Replace demo state

Exit criteria:

Real backend snapshots render in UI.

### M5.3 Combat Renderer

Status: TODO

Render:

- HP
- Block
- Energy
- Enemy state
- Intent
- Hand
- Cost
- Revision
- Action status

Exit criteria:

Overlay matches live combat state.

### M5.4 Combat Action Bridge

Status: TODO

Only support validated actions:

```text
play_card
end_turn
```

Flow:

```text
Overlay
 ↓
Action Request
 ↓
Revision Guard
 ↓
Action Inbox
 ↓
Native Dispatcher
 ↓
STS2
```

Exit criteria:

Minimal combat loop works.

## 5. Deferred scope

Not in v0.6-alpha.2:

- Map
- Reward
- Shop
- Event
- Rest
- Treasure
- Full run support

## 6. Next execution order

1. Build Tauri shell.
2. Verify window behavior.
3. Integrate React.
4. Add WebSocket client abstraction.
5. Connect backend snapshots.
6. Validate renderer.
7. Connect play_card.
8. Connect end_turn.
9. Execute runtime combat validation.

## 7. Version tracking

```text
v0.6-alpha.1
Playable Backend
DONE

↓

v0.6-alpha.2
Overlay Prototype
IN_PROGRESS

↓

v0.6-beta
Full Combat Client
PLANNED
```
