# Runtime validation

OfficeSpire distinguishes implementation from runtime evidence.

Status values:

- `not_implemented`
- `implemented_unverified`
- `runtime_pass`
- `runtime_fail`
- `blocked`

## Target build

Validated installation:

- Slay the Spire 2 `v0.107.1`
- release commit `59260271`
- Windows x86_64 / MegaDot 4.5.1 custom build
- OfficeSpire loaded from the native `mods/OfficeSpire` folder

## Validation matrix

| Capability | Status | Evidence / notes |
|---|---|---|
| Build against local `sts2.dll` | `runtime_pass` | User-side `dotnet build` completed successfully against the installed game files. |
| Native mod manifest discovered by STS2 | `runtime_pass` | Game log reports `Found mod manifest file .../mods/OfficeSpire/OfficeSpire.json`. |
| OfficeSpire DLL loaded | `runtime_pass` | Game log reports loading `OfficeSpire.dll` and calling `OfficeSpire.ModEntry`. |
| `[ModInitializer]` executes | `runtime_pass` | Startup diagnostics reached `initializer_enter` and `initializer_complete`. |
| Harmony initialization succeeds | `runtime_pass` | Startup diagnostics reached `harmony_ready`. |
| Godot script bridge registration succeeds | `runtime_pass` | Startup diagnostics reached `godot_script_bridge_ready`. |
| Loopback listener starts on random port | `runtime_pass` | Startup diagnostics reached `runtime_ready` with a `127.0.0.1:<random-port>` endpoint. |
| M3 adapter attaches | `runtime_pass` | Startup diagnostics reached `m3_adapter_attached`. |
| Session descriptor written to AppData | `implemented_unverified` | Code path executes during transport startup; file presence has not yet been independently checked. |
| WebSocket token handshake | `implemented_unverified` | Transport is listening, but an external client handshake has not yet been observed. |
| `hello` / `ping` / `get_state` transport | `implemented_unverified` | M2 implementation exists; live client probe pending. |
| Godot update node ticks after attach | `implemented_unverified` | Attach succeeded, but state-change evidence is still required to prove `_Process` refreshes. |
| Detect combat vs non-combat | `implemented_unverified` | M3 currently reports `combat` while `CombatManager.IsInProgress`; live snapshot comparison pending. |
| Read player HP/block/energy | `implemented_unverified` | M3 adapter implemented; live values not yet compared with the visible game. |
| Read hand/cost/type/rarity | `implemented_unverified` | M3 adapter implemented; live values not yet compared. |
| Read dynamic card Damage/Block | `implemented_unverified` | Uses card DynamicVars keys `Damage`/`Block`; requires runtime validation across cards. |
| Read `CanPlay` and enemy target IDs | `implemented_unverified` | M3 adapter implemented. |
| Read enemy HP/block/intent/powers | `implemented_unverified` | M3 adapter implemented; live comparison pending. |
| Read relics/potions/pile counts | `implemented_unverified` | M3 adapter implemented. |
| State revision changes only on decision-state changes | `implemented_unverified` | M3 fingerprint/revision implementation exists; live revision behavior pending. |
| Vanilla gameplay remains usable with M3 loaded | `runtime_pass` | User entered a run, played cards and ended turns after OfficeSpire initialized without an OfficeSpire failure. |
| Play untargeted card | `not_implemented` | Planned M4. |
| Play targeted card | `not_implemented` | Planned M4. |
| End turn | `not_implemented` | Planned M4. |
| Potion actions | `not_implemented` | Planned M4. |
| Overlay UI | `not_implemented` | Planned M5. |
| Map selection | `not_implemented` | Planned M6. |
| Reward/card reward selection | `not_implemented` | Planned M6. |
| Shop/event/rest/treasure actions | `not_implemented` | Planned M6. |
| Game continues while STS2 is unfocused | `implemented_unverified` | Focus-out/focus-in logs exist, but OfficeSpire state/action processing while unfocused has not yet been directly observed. |
| Game continues while STS2 is minimized | `not_implemented` | Key product assumption; must not be claimed until tested. |

## M3 live-state probe

The current source includes two complementary diagnostics:

1. `runtime.log` — OfficeSpire writes a compact line only when `phase` or `state_revision` changes. Combat lines include HP, block, energy, hand count and enemy count.
2. `scripts/watch-state.ps1` — connects to the authenticated loopback WebSocket using the current `session.json`, polls `get_state`, and prints each new revision. Use `-Raw` to print complete state JSON.

Run from the repository root while STS2 is open:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\watch-state.ps1
```

Expected progression around a combat decision:

```text
rev=4 phase=combat HP=80/80 Block=0 Energy=3/3 Hand=5 Enemies=1
...play a card...
rev=5 phase=combat HP=80/80 Block=0 Energy=2/3 Hand=4 Enemies=1
```

Validation goal:

1. confirm `%APPDATA%/SlayTheSpire2/OfficeSpire/session.json` exists;
2. confirm the diagnostic script completes the WebSocket handshake;
3. compare HP, block, energy, hand and enemy values against the visible game;
4. play one card and confirm the revision changes;
5. end a turn and confirm another revision change;
6. keep the game idle for several seconds and confirm revision does not increase solely because the 20 Hz refresh loop is running;
7. inspect `%APPDATA%/SlayTheSpire2/OfficeSpire/runtime.log` for the same state transitions.

After M4 lands, separately test:

1. untargeted card;
2. targeted card;
3. end turn;
4. potion use;
5. stale revision rejection;
6. unfocused main window;
7. minimized main window.
