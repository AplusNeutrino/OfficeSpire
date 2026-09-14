# OfficeSpire

OfficeSpire is a **text-first alternative control surface for Slay the Spire 2**.

The project target is a compact semi-transparent desktop overlay that reads the authoritative game state and lets the player operate combat, card selections, map routing, rewards, shops, events, rest sites and treasures without relying on the normal animated game UI for ordinary decisions.

> Status: **pre-alpha / M3 source implemented, runtime-unverified**.

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
   ├─ Sts2GameAdapter (main-thread, version-sensitive)
   ├─ versioned state protocol
   ├─ future game-thread action dispatcher
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

## Implemented source milestones

### M1 — repository/mod baseline

- STS2 DLL-only mod manifest;
- .NET 9 / Godot 4.5.1 project baseline;
- `[ModInitializer]` entry point and Harmony initialization;
- `IGameAdapter` boundary;
- versioned protocol records and licensing notes.

### M2 — local transport

- listener binds only to `127.0.0.1`;
- OS-assigned random port;
- random 256-bit session token;
- `%APPDATA%/SlayTheSpire2/OfficeSpire/session.json` discovery file;
- direct TCP/WebSocket bridge with no Python process;
- `hello`, `ping/pong`, and `get_state`;
- bounded message sizes;
- action requests deliberately rejected until M4.

### M3 — read-only combat adapter

- Godot main-thread update node, refreshing at 20 Hz;
- combat/non-combat detection for the initial adapter;
- run act/floor/ascension/gold/relics;
- player HP/max HP/block/energy;
- hand index, card ID/name/cost/type/rarity;
- dynamic card Damage/Block values where exposed by STS2;
- card playability and legal enemy target IDs;
- draw/discard/exhaust counts;
- enemy stable ID, HP/max HP/block/intent/powers;
- potion slot/name/description/target type;
- monotonic `state_revision` driven by a decision-state fingerprint.

**Important:** these milestones are implemented in source but have not yet been compiled or runtime-tested against the user's installed Steam build. See [docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md).

## Next milestone: M4

M4 adds the game-thread action queue and the first actual controls:

- stale-revision rejection;
- play untargeted card;
- play targeted card;
- end turn;
- potion use/discard;
- action accepted/pending/completed lifecycle.

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

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

[MIT](LICENSE)
