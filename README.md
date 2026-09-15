# OfficeSpire

OfficeSpire is a **text-first alternative control surface for Slay the Spire 2**.

It pairs a C#/.NET game mod with a compact Tauri/React desktop overlay. STS2 remains authoritative for rules, RNG, saves, actions, and progression; OfficeSpire reads state and submits explicit user choices through an authenticated loopback protocol.

> **Current status:** v0.6-alpha.1 “Playable Backend” is runtime-validated. The M5 overlay and M6 map controller source are implemented but still require live runtime validation.

## Validated baseline

Runtime validation against STS2 `v0.107.1` / game commit `59260271` has established:

| Milestone | Capability | Status |
|---|---|---|
| M1 | Mod Runtime | `runtime_pass` |
| M2 | Local Transport | `runtime_pass` |
| M3 | State Observation | `runtime_pass` |
| M4 | Action Control Core | `runtime_pass` |

The validated M4 core includes:

- authenticated WebSocket action transport;
- serialized `ActionInbox` queueing;
- Godot main-thread dispatch;
- cached and second-stage `expected_revision` validation;
- untargeted and targeted `play_card`;
- `end_turn`;
- pending-action lifecycle;
- semantic revision settlement;
- stale-action rejection without game mutation.

Deferred M4-adjacent work:

- `use_potion`: `implemented_unverified`;
- `potion_discard`: `not_implemented`;
- main-thread extreme race-window stress probe: not yet performed.

See [docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md) for the evidence record.

## Current development milestone

v0.6-alpha.2 targets the first usable **semi-transparent text overlay**:

- transparent/borderless Tauri window;
- always-on-top, drag, and resize behavior;
- live STS2 WebSocket snapshots;
- HP, energy, enemies, intents, and hand rendering;
- mouse-operated untargeted and targeted card play;
- End Turn button;
- pending, stale, reconnect, and error handling.

The first M5 source implementation is now present and its TypeScript/Vite production build and protocol tests pass. Tauri native compilation, Windows window behavior, live STS2 integration, and combat interaction remain `implemented_unverified` until runtime evidence is recorded.

The v0.6-alpha.3 source adds authoritative map snapshots, reachable-node display, and revision-guarded native route selection. It remains `implemented_unverified`; code presence and frontend builds are not live STS2 proof.

Development has entered the partial v0.6-alpha.4 source phase. Combat reward collection plus card reward selection/skip are implemented but unverified; the remaining M7 decision families are still absent.

The same development branch also includes the first generic choose-a-card prompt path. Multi-selection and room-specific confirmation flows remain unsupported.

The single authoritative plan for current status, execution order, later milestones, and exit criteria is:

**[docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)**

## Architecture

```text
Slay the Spire 2
└─ OfficeSpire C# mod
   ├─ State adapter
   ├─ Semantic revision guard
   ├─ Main-thread action dispatcher
   └─ Authenticated loopback WebSocket
              │
              ▼
OfficeSpire Overlay
└─ Tauri + React + TypeScript
   ├─ Session discovery and reconnect
   ├─ Authoritative state renderer
   ├─ Mouse/keyboard interaction
   └─ Semi-transparent desktop window
```

## Build prerequisites

Mod:

- .NET 9 SDK
- Slay the Spire 2 installed locally
- game-provided `sts2.dll` and `0Harmony.dll`

Overlay:

- Node.js/npm
- Rust/Cargo
- Tauri 2 platform prerequisites

### Configure the game path

Set `STS2_DIR` to the Slay the Spire 2 installation directory, or copy:

```text
src/OfficeSpire.Mod/OfficeSpire.Local.props.example
```

to:

```text
src/OfficeSpire.Mod/OfficeSpire.Local.props
```

and set the local path.

Build the mod:

```bash
dotnet build src/OfficeSpire.Mod/OfficeSpire.Mod.csproj -c Debug
```

Build the overlay frontend:

```bash
cd src/OfficeSpire.Overlay
npm install
npm run build
```

Tauri runtime/build validation remains part of the active M5 milestone; consult the canonical roadmap before treating it as passed.

## Engineering boundaries

- Game state and native actions remain authoritative.
- The overlay never performs optimistic game-state mutations.
- Mutating requests carry an expected semantic revision.
- Transport binds only to loopback.
- Unsupported states fail safely to the original STS2 UI.
- OfficeSpire does not implement gameplay automation, monitoring evasion, process spoofing, log tampering, or system-level concealment.

## Documentation

- [Development roadmap](docs/DEVELOPMENT_ROADMAP.md) — canonical milestone and execution source
- [Runtime validation](docs/RUNTIME_VALIDATION.md) — runtime evidence
- [Architecture](docs/ARCHITECTURE.md)
- [Protocol](docs/PROTOCOL.md)
- [Upstream references](docs/UPSTREAM_REFERENCES.md)
- [Project scope](PROJECT_PLAN.md)

## Third-party notices and license

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). OfficeSpire is licensed under the [MIT License](LICENSE).
