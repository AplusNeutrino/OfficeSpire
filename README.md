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
- `potion_discard`: `implemented_unverified`;
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

The same development branch now includes generic choose-a-card, deck/grid selection, upgrade confirmation, and combat-hand multi-selection paths. These remain runtime-unverified; selection skipping is not enabled without an authoritative native control.

Event reading and choice/leave control are also present in the alpha.4 source, including locked-option handling and reuse of the card-selection layer for event follow-up prompts.

Ordinary rest-site choices and leaving are implemented in source, with smith/remove follow-ups delegated to card selection. Multiplayer rest-site targeting remains explicitly unsupported.

Treasure rooms now have source support for opening, authoritative relic choice/skip, predicted local vote display, and leaving. Live game behavior remains unverified.

The alpha.4 source now covers the planned M7 run decisions, including merchant browsing, purchases, card-removal initiation, and leaving. M7 is `implemented_unverified`, not runtime-complete.

Development has entered the v0.6-beta.1 hardening phase. Combat snapshots now expose authoritative potion availability and legal targets; the overlay supports use, enemy targeting, and confirmed discard through native STS2 action paths. This M8 slice is `implemented_unverified` pending live STS2 validation.

Keyboard controls now cover every currently supported overlay screen. Number keys choose cards, targets, routes, rewards, options, relics, or shop items; Shift+number uses potion slots; E ends combat turns; Enter confirms or opens; S skips; L leaves; R starts merchant card removal; and Escape cancels targeting. Live Tauri focus behavior remains unverified.

Action recovery now includes a 15-second client observation deadline, stale request-result filtering, continued authoritative state polling after timeout, and reconnect backoff from 1 to 10 seconds. Timed-out mutations are never automatically replayed.

Versioned local settings now persist background opacity, interface scale, high contrast, and reduced motion. The keyboard-contained settings dialog disables underlying game actions while open; native Tauri rendering remains `implemented_unverified`.

Protocol ingestion now fails closed on ambiguous actionable identities, including duplicate hand/slot/choice indexes, duplicate or negative combat IDs, duplicate map coordinates, and empty/duplicate enemy stable IDs. Malformed snapshots cannot replace the last accepted state or enable mutations.

Protocol compatibility checks now distinguish a structurally valid future envelope from an exactly compatible protocol-v1 connection. A release preflight verifies npm lockfile, Cargo, Tauri, Mod compatibility line, application identity, and bundle activation before packaging.

When STS2 exposes no active run, the backend now reports an explicit read-only menu lifecycle state. The overlay directs the user back to the original game UI and never starts, resumes, or replays a run automatically. Authoritative run-end detection remains unverified and is not inferred.

A visible native game-over screen now produces a read-only `run_end` snapshot classified as victory, defeat, or abandoned from engine-owned signals. The Overlay presents the result but offers no automatic return-to-menu or new-run action. This source path remains `implemented_unverified` until observed in STS2.

M8 runtime evidence preparation includes a passive log analyzer for revision monotonicity, phase/revision conflicts, and pending-action cycles. It never submits a game action and never labels its own report as a runtime pass; see [docs/M8_RUNTIME_PROBES.md](docs/M8_RUNTIME_PROBES.md).

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
npm run check
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
- [Steam Workshop release preparation](docs/STEAM_WORKSHOP_RELEASE.md)
- [M8 runtime probes](docs/M8_RUNTIME_PROBES.md)

## Third-party notices and license

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). OfficeSpire is licensed under the [MIT License](LICENSE).
