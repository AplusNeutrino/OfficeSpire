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
| Session descriptor written to AppData | `runtime_pass` | `scripts/watch-state.ps1` located and consumed the active `session.json`. |
| WebSocket token handshake | `runtime_pass` | External diagnostic client connected through the authenticated loopback WebSocket. |
| `get_state` transport | `runtime_pass` | Live diagnostic client repeatedly retrieved changing state snapshots. |
| Godot update node ticks after attach | `runtime_pass` | Live state changed correctly as cards were played and combat advanced. |
| Detect combat vs non-combat | `runtime_pass` | Diagnostic client reported `phase=combat` while the user was in combat. |
| Read player HP/block/energy | `runtime_pass` | Live snapshot matched visible values; tested example `HP=68/80`, `Block=0`, `Energy=3/3`. |
| Read hand/cost/type/rarity | `runtime_pass` | Hand size and per-card values updated correctly after plays. |
| Read dynamic card Damage/Block | `runtime_pass` | User confirmed Damage and Block values matched visible game state during the live M3 probe. |
| Read `CanPlay` | `runtime_pass` | User confirmed live `CanPlay` values behaved correctly during the M3 probe. |
| Read enemy HP/intent | `runtime_pass` | Enemy HP and intent matched visible state; tested enemy HP transition `10/10 -> 3/10`. |
| Read enemy target IDs | `implemented_unverified` | Target IDs are present in M3 protocol but were not independently validated in this probe. |
| Read enemy powers | `implemented_unverified` | Power snapshots are implemented but were not independently validated in this probe. |
| Read relics/potions/pile counts | `implemented_unverified` | Implemented, but not independently validated in this probe. |
| State revision changes only on stable decision-state changes | `implemented_unverified` | On `c114ab5`, multiple revisions were observed with identical printed summary. `f313f63` changes revision advancement so transient combat frames with `waiting_for_input=false` are published without advancing the decision revision. Requires retest. |
| Vanilla gameplay remains usable with M3 loaded | `runtime_pass` | User entered a run, played cards, killed enemies and ended turns with OfficeSpire active. |
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

## M3 live-state probe — 2026-09-14

Validated against OfficeSpire `c114ab5` before the revision-stability patch.

Observed initial combat state:

```text
Connected. Watching OfficeSpire state
rev=10 phase=combat HP=68/80 Block=0 Energy=3/3 Hand=5 Enemies=3
```

After playing a card, the external client correctly observed:

```text
Energy: 3 -> 2
Hand:   5 -> 4
Enemy:  10/10 -> 3/10
```

Further plays correctly reflected enemy death, hand changes, and changing card costs/playability.

### Revision finding

Several successive revisions were observed with the same compact printed summary:

```text
rev=12
rev=13
rev=14
```

The compact watcher does not print every protocol field, so this did not prove corruption. The most likely source was transient combat state during animations/action-queue processing, especially `waiting_for_input` toggling while `PlayerActionsDisabled` is true.

`f313f63` changes the revision rule:

- all snapshots continue to be published;
- a phase change still advances the revision;
- while `phase=combat` and `waiting_for_input=false`, transient snapshots do **not** advance the decision revision;
- when the game returns to an actionable combat state, the final snapshot is compared with the previous actionable snapshot and advances at most once for that completed transition.

This preserves the future stale-action guard while avoiding revision churn during animations.

## Revision retest

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\watch-state.ps1
```

Then verify:

1. idle at an actionable combat state for several seconds: revision remains constant;
2. play one card: revision advances once when the next actionable state settles;
3. end turn: intermediate enemy-animation states may update internally, but revision should not churn; the next player decision state should advance once;
4. if the phase changes (combat ends), revision may advance for the phase transition.

After this passes, M3 revision stability can be marked `runtime_pass` and M4 can begin.

## M4 runtime probes

After M4 lands, separately test:

1. untargeted card;
2. targeted card;
3. end turn;
4. potion use;
5. stale revision rejection;
6. unfocused main window;
7. minimized main window.
