# OfficeSpire

OfficeSpire is a **text-first alternative control surface for Slay the Spire 2**.

The project target is a compact semi-transparent desktop overlay that reads the authoritative game state and lets the player operate combat, card selections, map routing, rewards, shops, events, rest sites and treasures without relying on the normal animated game UI for ordinary decisions.

> Status: **pre-alpha / M2 implemented, runtime-unverified**.

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
   ├─ version-specific game adapter
   ├─ state normalizer
   ├─ action dispatcher
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

## Current implementation

### M1 — repository/mod baseline

- STS2 DLL-only mod manifest;
- .NET 9 / Godot 4.5.1 project baseline;
- `[ModInitializer]` entry point and Harmony initialization;
- versioned protocol envelope and action models;
- `IGameAdapter` boundary isolating unstable STS2 internals;
- upstream licensing/reference record.

### M2 — local transport prototype

- listener binds only to `127.0.0.1`;
- OS-assigned random port instead of a fixed port;
- random 256-bit session token;
- local session discovery file in `%APPDATA%/SlayTheSpire2/OfficeSpire/session.json`;
- WebSocket upgrade/authentication without an extra Python process;
- `hello`, `ping/pong`, and `get_state` messages;
- strict inbound/outbound message-size caps;
- action messages deliberately rejected until the game-thread dispatcher exists.

**Important:** M1/M2 are implemented in source but have not yet been compiled or runtime-tested against the user's installed Steam build. See [docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md).

## Next milestone: M3

M3 replaces the `NullGameAdapter` with a **read-only STS2 adapter** for:

- current game phase;
- player HP/block/energy/gold;
- current hand and card metadata;
- enemies, HP/block/intent/powers;
- pile counts;
- stable decision-state revisions.

No game mutations are added in M3.

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

## License

[MIT](LICENSE)
