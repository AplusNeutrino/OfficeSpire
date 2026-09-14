# OfficeSpire

OfficeSpire is a **text-first alternative control surface for Slay the Spire 2**.

The project target is a compact semi-transparent desktop overlay that reads the authoritative game state and lets the player operate combat, card selections, map routing, rewards, shops, events, rest sites and treasures without relying on the normal animated game UI for ordinary decisions.

> Status: **pre-alpha / M3 runtime-validated; M4 combat-action source implemented, runtime-unverified**.

## Target experience

```text
ACT 2 · F31                         227G
HP 54/72        Block 8       Energy 3/3

ENEMIES
[A] Taskmaster        64/64      Attack 14
[B] Red Slaver        23/48      Attack 7 x2

HAND
[1] Strike+       0      9 dmg
[2] Defend        1      5 block
[3] Neutralize    0      4 dmg · Weak 1
[4] Backflip      1      5 block · Draw 2

[E] End Turn
```

The game remains authoritative for rules, RNG, saves and progression. OfficeSpire is a control surface, not a replacement simulation and not an automation bot.

## Architecture

```text
Slay the Spire 2
└─ OfficeSpire C# mod
   ├─ Sts2GameAdapter (runtime-validated M3 state reader)
   ├─ M4GameAdapter (main-thread action dispatcher)
   ├─ ActionInbox (revision guard + lifecycle)
   ├─ versioned protocol/state store
   └─ loopback WebSocket transport
              │
              ▼
OfficeSpire Overlay
└─ Tauri + TypeScript
   ├─ semi-transparent / borderless
   ├─ resizable / movable
   ├─ optional always-on-top
   └─ keyboard-first phase-specific UI
```

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the complete implementation plan.

## M1–M3 status

Runtime validation against STS2 `v0.107.1` / game commit `59260271` has confirmed:

- native manifest/DLL loading and `[ModInitializer]` execution;
- authenticated loopback WebSocket session and `get_state`;
- main-thread 20 Hz state capture;
- combat phase detection;
- player HP/block/energy;
- hand state, current costs, Damage/Block and `CanPlay`;
- enemy HP/intent;
- semantic `state_revision` settlement and `action_pending` behavior.

See [docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md) for the evidence/status matrix.

## M4 source currently implemented

The first M4 control path is now in source and awaits user-side compile/runtime validation:

- WebSocket action requests no longer touch STS2 objects directly;
- `ActionInbox` serializes one mutating action at a time;
- stale `expected_revision` is rejected before queueing and rechecked on the game thread;
- a main-thread `M4GameAdapter` performs final phase/readiness/playability/target checks;
- `play_card` supports untargeted cards and enemy-targeted cards;
- `end_turn` enqueues `EndPlayerTurnAction`;
- `use_potion` uses the current potion slot and target rules;
- lifecycle status is queryable through `get_action_result` with `queued -> accepted/rejected -> completed`;
- `action_pending=true` blocks conflicting submissions until the next settled authoritative revision.

Potion discard remains the next M4 subtask; its native path will not be guessed before the current action chain is runtime-validated.

A PowerShell probe is included:

```powershell
# Play hand index 0. If exactly one enemy is hittable, target can be omitted.
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action play_card -HandIndex 0

# Explicit enemy combat id; both 12 and enemy-12 are accepted.
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action play_card -HandIndex 0 -TargetId enemy-12

powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action end_turn
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action use_potion -SlotIndex 0
```

## Build prerequisites

- .NET 9 SDK
- Slay the Spire 2 installed locally
- the game-provided `sts2.dll` and `0Harmony.dll`

The mod intentionally has **no BaseLib/RitsuLib dependency** at this stage.

### Configure the game path

Either set the `STS2_DIR` environment variable to the Slay the Spire 2 install directory, or copy:

```text
src/OfficeSpire.Mod/OfficeSpire.Local.props.example
```

to:

```text
src/OfficeSpire.Mod/OfficeSpire.Local.props
```

and edit the local path.

Then build:

```bash
dotnet build src/OfficeSpire.Mod/OfficeSpire.Mod.csproj -c Debug
```

When `Sts2Dir` is configured, the build target copies the mod files into:

```text
<Slay the Spire 2>/mods/OfficeSpire/
```

## Scope boundary

OfficeSpire is limited to game state, game actions and presentation. It will not implement process-name spoofing, anti-monitoring behavior, endpoint/MDM evasion, log tampering, screenshot-tool countermeasures or similar system-level concealment.

## Third-party notices

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [docs/UPSTREAM_REFERENCES.md](docs/UPSTREAM_REFERENCES.md).

## License

[MIT](LICENSE)
