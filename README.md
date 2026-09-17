# OfficeSpire

OfficeSpire is a **text-first alternative control surface for Slay the Spire 2**.

It combines a C#/.NET game mod with a compact Tauri/React desktop overlay. Slay the Spire 2 remains authoritative for rules, RNG, saves, actions, and progression; OfficeSpire reads native state and submits explicit user choices through an authenticated loopback protocol.

> **Project status:** the M9 full-chain source package is complete and has passed the repository's static source audit. It is still `implemented_unverified`, not runtime-qualified. The last runtime-validated baseline is M4 against STS2 `0.107.1` / game commit `59260271`. Current STS2, Windows/Tauri, multiplayer, accessibility, privacy-hotkey, and Steam Workshop behavior still require real-environment evidence.

## What is covered

| Surface | Source coverage | Important boundary |
|---|---|---|
| Menu and saves | Main menu, profiles, continue/new Run, mode navigation | Quit, destructive save choices, and unknown warnings stay in the native UI |
| Run setup | Standard, Custom, Daily, ascension, seed, character selection, ready/unready, launch | Custom modifier editing fails closed without stable native identities |
| Player HUD | Character identity, HP, block, energy, powers, relics, potions, gold, progression, deck and piles | Live comparison for every character is pending |
| Character state | Regent stars, Defect orbs, Necrobinder/Osty state | Installed-build field compatibility is pending |
| Combat | Hand, enemies, intents, card play, potion use/discard, targeting, end turn | Every mutation is revision- and identity-guarded; no automatic replay |
| Run decisions | Map, rewards, card/grid selection, events, rest sites, treasure, shops, and typed special events | Unknown custom layouts and multiplayer campfire teammate targeting hand off to STS2 |
| Multiplayer | Party roster, ownership, readiness, votes, shared-decision progress, disconnect state | Invite/rejoin hand off to STS2; the inspected native contract has no host migration |
| Settlement | Victory, defeat, abandon summary, score/unlocks/discoveries, summary and return controls | Revival and full post-Run behavior need live qualification |
| Accessibility | Full source keyboard map, deterministic focus policy, labels, scale, contrast, reduced motion | Windows/Tauri keyboard and assistive-technology testing is pending |
| Privacy shortcut | Configurable global `Ctrl+Shift+F12`, authenticated process scoping, reversible window hide/restore | Windows fullscreen, multi-monitor, collision, and crash-recovery testing is pending |

The definitive phase/action inventory is [docs/M9_INTERFACE_MATRIX.md](docs/M9_INTERFACE_MATRIX.md). The source verdict and every remaining external gate are recorded in [docs/M9_SOURCE_AUDIT.md](docs/M9_SOURCE_AUDIT.md).

## Evidence status

OfficeSpire uses these terms deliberately:

- `runtime_pass` — exercised against the real game/runtime with recorded evidence;
- `source_pass` — audited source invariant and available static checks pass;
- `implemented_unverified` — implementation exists, but required real-environment evidence is missing;
- `blocked` — an external dependency or environment is required before qualification can continue.

| Milestone | Scope | Status |
|---|---|---|
| M1 | Mod runtime | `runtime_pass` |
| M2 | Authenticated local transport | `runtime_pass` |
| M3 | State observation | `runtime_pass` |
| M4 | Core card/action control | `runtime_pass` |
| M5–M8 | Overlay, map, Run decisions, hardening | `implemented_unverified` |
| M9.1–M9.10 | Full-chain control surface | `source_pass`; runtime `implemented_unverified` |
| M9.11 | Source audit and release qualification | source audit `source_pass`; runtime qualification `blocked` |

Compilation, mocks, frontend tests, or packaging never promote a capability to `runtime_pass`. See [docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md) for the evidence ledger.

## Safety model

- STS2 remains the sole authority for game state and native actions.
- Mutating requests include an expected semantic revision and stable action identities.
- State and identities are revalidated on the game thread before mutation.
- Only one mutation may be pending; timeouts and reconnects never trigger automatic replay.
- Unsupported, ambiguous, or version-drifted surfaces fail closed and direct the user to the original UI.
- Transport binds to loopback and requires the discovered session token.
- The privacy shortcut only targets the authenticated STS2 process; it is separate from gameplay actions.
- OfficeSpire does not automate gameplay, spoof processes, tamper with logs, or provide system-level concealment.

## Architecture

```text
Slay the Spire 2
└─ OfficeSpire C# mod
   ├─ State adapter and text normalization
   ├─ Semantic revision and identity guards
   ├─ Main-thread native action dispatcher
   └─ Authenticated loopback WebSocket
              │
              ▼
OfficeSpire Overlay
└─ Tauri + React + TypeScript
   ├─ Session discovery and reconnect
   ├─ Authoritative state renderer
   ├─ Mouse and keyboard controls
   └─ Semi-transparent desktop window
```

## Build and check

### Prerequisites

Mod:

- .NET 9 SDK
- Slay the Spire 2 installed locally
- game-provided `sts2.dll` and `0Harmony.dll`

Overlay:

- Node.js and npm
- Rust and Cargo
- Tauri 2 platform prerequisites

### Configure the game path

Set `STS2_DIR` to the Slay the Spire 2 installation directory, or copy
`src/OfficeSpire.Mod/OfficeSpire.Local.props.example` to
`src/OfficeSpire.Mod/OfficeSpire.Local.props` and set the local path.

### Build the mod

```bash
dotnet build src/OfficeSpire.Mod/OfficeSpire.Mod.csproj -c Debug
```

### Check the overlay and M9 source contract

```bash
cd src/OfficeSpire.Overlay
npm ci
npm run check
npm audit --omit=dev
```

`npm run check` runs formatting checks, frontend tests, Workshop candidate tests, the 12-phase/27-action M9 parity audit, the production frontend build, and release metadata preflight.

Run the native Tauri application only in a suitable desktop environment:

```bash
npm run tauri dev
```

## External qualification still required

Before calling M9 runtime-complete or publishing a Workshop item:

1. compile the Mod against the selected installed STS2 build;
2. build and run the Windows/Tauri application;
3. execute legal and stale/replaced-identity cases for every supported action family;
4. complete keyboard-only, scaling, contrast, reduced-motion, and screen-reader passes;
5. test the privacy shortcut across window modes, monitors, shortcut collisions, restarts, and recovery;
6. complete solo victory/non-victory Runs and 2–4-machine multiplayer scenarios;
7. verify supported and incompatible game/Mod/protocol combinations and common framework coexistence;
8. create and manually test a private Workshop candidate, including clean install, update, and uninstall.

Do not replay a timed-out or outcome-unknown game mutation while collecting evidence. OfficeSpire's packaging tools prepare a traceable candidate but do not publish it.

## Documentation

- [Development roadmap](docs/DEVELOPMENT_ROADMAP.md) — milestone plan and execution order
- [M9 interface matrix](docs/M9_INTERFACE_MATRIX.md) — final phase/API/action inventory
- [M9 source audit](docs/M9_SOURCE_AUDIT.md) — static verdict and external gates
- [M9 Run-decision matrix](docs/M9_RUN_DECISION_MATRIX.md) — events and special surfaces
- [Runtime validation](docs/RUNTIME_VALIDATION.md) — evidence ledger
- [Protocol](docs/PROTOCOL.md) — wire contract and safety rules
- [Architecture](docs/ARCHITECTURE.md)
- [Upstream references](docs/UPSTREAM_REFERENCES.md)
- [Steam Workshop preparation](docs/STEAM_WORKSHOP_RELEASE.md)
- [Offline deployment](docs/OFFLINE_DEPLOYMENT.md) — cloud-built Windows packages and one-time Mod assembly
- [Project scope](PROJECT_PLAN.md)

## Version and release boundary

Current repository metadata identifies the Mod as `0.6.0` and the Overlay as `0.6.0-beta.1`. The source-complete M9 state is not a published release, and no Steam Workshop publication is performed by repository scripts.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party notices. OfficeSpire is licensed under the [MIT License](LICENSE).
