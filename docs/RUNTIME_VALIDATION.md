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
| Build against local `sts2.dll` (M1-M3 baseline) | `runtime_pass` | User-side `dotnet build` completed successfully against the installed game files through the M3 revision-pass build. |
| Current M4 source compiles against local `sts2.dll` | `implemented_unverified` | The pre-fix M4 baseline built with 0 errors / 1 nullable warning. The latest Self-target/no-effect-watchdog fixes require a fresh user-side rebuild. |
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
| Read enemy target IDs | `implemented_unverified` | Target IDs are present in M3 protocol but were not independently validated in the M3 probe. M4 targeted-play validation will exercise them directly. |
| Read enemy powers | `implemented_unverified` | Power snapshots are implemented but were not independently validated in the M3 probe. |
| Read relics/potions/pile counts | `implemented_unverified` | Implemented, but not independently validated in the M3 probe. |
| State revision changes only on stable decision-state changes | `runtime_pass` | Runtime retest on `ac8f66a` passed: revisions remained stable while idle, stayed unchanged with `pending=true`, advanced once when each card action settled, advanced once after the enemy turn/new hand settled, and advanced once when combat ended. |
| Vanilla gameplay remains usable with M3 loaded | `runtime_pass` | User entered a run, played cards, killed enemies and ended turns with OfficeSpire active. |
| M4 WebSocket -> game-thread action inbox | `runtime_pass` | Real M4 probe reached `queued` and then main-thread `accepted`, proving transport parsing, inbox queueing and main-thread consumption. |
| M4 stale-revision guard | `implemented_unverified` | Implemented both before queueing and again on the game thread immediately before dispatch; runtime stale test not yet run. |
| M4 `queued -> accepted/rejected -> completed` lifecycle | `runtime_fail` | First real action reached `queued -> accepted` but never completed; pending stayed true until the test timed out. A no-effect watchdog is now implemented but unverified. |
| Play untargeted card | `runtime_fail` | Defend at hand index 0 was accepted but did not execute; energy/hand/block/revision stayed unchanged. Self-target resolution was found inconsistent with current GUI implementations and has been fixed for retest. |
| Play targeted card | `implemented_unverified` | Not tested after the untargeted-card safety gate failed. |
| End turn | `implemented_unverified` | Not tested after the untargeted-card safety gate failed. |
| Potion use | `implemented_unverified` | Not tested after the untargeted-card safety gate failed. |
| Potion discard | `not_implemented` | Deliberately deferred until the direct native path is verified rather than guessed from another adapter abstraction. |
| Overlay UI | `not_implemented` | Planned M5. |
| Map selection | `not_implemented` | Planned M6. |
| Reward/card reward selection | `not_implemented` | Planned M6. |
| Shop/event/rest/treasure actions | `not_implemented` | Planned M6. |
| Game continues while STS2 is unfocused | `implemented_unverified` | Focus-out/focus-in logs exist, but OfficeSpire M4 action processing while unfocused has not yet been directly observed. |
| Game continues while STS2 is minimized | `not_implemented` | Key product assumption; must not be claimed until tested with the M4 control path. |

## M3 live-state probe — 2026-09-14

Validated against OfficeSpire `c114ab5` before the revision-stability patches.

Observed initial combat state:

```text
Connected. Watching OfficeSpire state
rev=10 phase=combat HP=68/80 Block=0 Energy=3/3 Hand=5 Enemies=3
```

After playing a card through the original STS2 UI, the external client correctly observed:

```text
Energy: 3 -> 2
Hand:   5 -> 4
Enemy:  10/10 -> 3/10
```

Further plays correctly reflected enemy death, hand changes, and changing card costs/playability.

## Revision retest history

### Retest 1 — `11e852a`

The first revision fix (`f313f63`) stopped 20 Hz idle churn but did not fully collapse one game action into one decision revision.

Observed:

- idle actionable state: **PASS**;
- one card play: **FAIL** — example sequence `rev=6 -> 7 -> 8 -> 9` while compact HP/Energy/Hand/Enemy summaries were unchanged;
- enemy-turn animation: **PASS in this probe**;
- later card plays: **FAIL** — further duplicate sequences included `17 -> 18 -> 19` and `20 -> 21`.

### Retest 2 — `04c5a59`

The second fix (`a746dc4`) added a 300 ms quiet-window debounce. It reduced churn but did not eliminate duplicate decision revisions.

Observed:

- idle stable state: **PASS**;
- first card play: **FAIL** — `rev=4 -> rev=5`, then roughly 532 ms later `rev=6`, while the compact visible state remained `Energy=2/3 Hand=4 Enemies=3`;
- later reproduction: **FAIL** — `rev=13 -> rev=14` roughly 517 ms apart with the same compact visible state;
- duplicate delays were approximately 0.5–1.4 seconds;
- enemy turns: **PASS**;
- combat-end phase transition: **PASS**.

### Fix 3 — semantic decision boundary

`ac8f66a` replaced full-rendered-JSON/debounce revisioning with a semantic decision boundary:

- full live snapshots remain available at 20 Hz;
- localized/rich presentation fields cannot independently advance revision;
- the semantic fingerprint contains structured decision state;
- combat revision promotion requires `waiting_for_input=true` and `ActionExecutor.CurrentlyRunningAction == null`;
- a changed semantic candidate must be identical for three consecutive actionable frames;
- unsettled snapshots report `action_pending=true`;
- phase changes still advance revision.

### Runtime result — `ac8f66a`

Retested on 2026-09-14 against STS2 `v0.107.1` / commit `59260271`.

Observed chain:

```text
ordinary card:
rev=8 pending=true
-> rev=9 pending=false

second card:
rev=9 pending=true
-> rev=10 pending=false

end turn through vanilla UI:
rev=10 pending=true
-> enemy actions / draw
-> rev=11 pending=false

later cards:
rev=11 pending=true -> rev=12 pending=false
rev=12 pending=true -> rev=13 pending=false

combat end:
rev=13 pending=true
-> rev=14 phase=unknown pending=false
```

No same-semantic `pending=false -> pending=false` duplicate revision was observed. Therefore `state_revision` is `runtime_pass`.

## M4 source baseline

M4 begins from the runtime-validated M3 reader and adds a separate write path rather than letting the WebSocket server touch game objects.

Current source flow:

```text
WebSocket action
  -> cached phase/pending/revision validation
  -> ActionInbox
  -> next Godot main-thread tick
  -> fresh revision/readiness validation
  -> M4GameAdapter
  -> STS2 normal action path
  -> M3 semantic settlement
  -> completed at the next newer settled revision
```

Initial source actions:

- `play_card`;
- `end_turn`;
- `use_potion`.

Diagnostic client:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action play_card -HandIndex 0
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action play_card -HandIndex 0 -TargetId enemy-12
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action end_turn
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action use_potion -SlotIndex 0
```

## M4 runtime probe 1 — native action no-op

First real action probe against the pre-fix M4 baseline:

```text
initial:
rev=22 pending=False
Energy=3/3 Block=0 Hand=5
[0] Defend can_play=True

request:
play_card hand_index=0

lifecycle:
queued rev=22
-> accepted rev=22
-> timeout after 20 seconds

final:
rev=22 pending=True
Energy=3/3 Block=0 Hand=5
```

Observed conclusions:

- WebSocket transport: **PASS**;
- `ActionInbox` transport queue: **PASS**;
- main-thread request consumption / initial validation: **PASS**;
- native card execution: **FAIL**;
- completion lifecycle: **FAIL**;
- no Godot exception stack was emitted;
- manually playing the same card through the normal UI still worked.

### Root-cause finding and fix

The failed baseline resolved `TargetType.Self` to `player.Creature` before constructing `PlayCardAction`. Current independent GUI implementations treat `Self` as a no-explicit-target card and construct `PlayCardAction(card, null)`; autoSpire also groups `Self` with target types that ignore explicit target IDs.

OfficeSpire now mirrors that behavior:

- `AnyEnemy` resolves a current living/hittable enemy;
- `AnyAlly` / `AnyPlayer` resolve the local player's creature;
- `Self`, `None`, AOE and random-target modes pass a null explicit target and let STS2 resolve recipients.

This is a concrete source mismatch that explains the Defend baseline failure, but remains **unverified until the next runtime probe**.

### No-effect lifecycle watchdog

The first failure also exposed an independent lifecycle bug: once an adapter returned `accepted`, `ActionInbox` could remain active forever if the native submission silently did nothing.

The inbox now fails closed and releases the lock with `code=no_effect` when either:

1. STS2 was observed busy for the accepted action and then returned to the same settled revision; or
2. no native busy/progress signal and no revision change is observed within 3000 ms.

A successful action must still reach a newer settled revision to become `completed`.

## M4 compile/runtime probes

### 1. Build and restart

A running STS2 process still has the previous OfficeSpire assembly loaded. Fully close the game before rebuilding/restarting.

```powershell
git pull
$env:STS2_DIR="E:\SteamLibrary\steamapps\common\Slay the Spire 2"
..\work\.dotnet\dotnet.exe build src\OfficeSpire.Mod\OfficeSpire.Mod.csproj -c Debug
```

Do not promote any M4 row if the build fails.

### 2. Untargeted/Self card — mandatory gate

Use a currently playable `Self` card such as Defend and note its hand index from `watch-state.ps1`.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action play_card -HandIndex <index> -TimeoutSeconds 10
```

Success requires:

```text
queued
-> accepted
-> completed
final state: rev=N+1 ... pending=False
```

and the card must actually leave the hand / spend energy / apply its effect.

If the native submission still no-ops, the expected failure is now bounded:

```text
queued
-> accepted
-> no_effect
```

with `pending=False` restored; it must no longer hang indefinitely.

Only after this gate passes should the remaining M4 mutations be tested.

### 3. Targeted card

Use the current enemy combat ID from the state payload:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action play_card -HandIndex <index> -TargetId enemy-<combatId>
```

Verify the intended enemy is the one affected. This probe also validates M3 enemy target IDs.

### 4. End turn

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action end_turn
```

Verify the normal enemy turn occurs and the request completes only at the next settled authoritative decision/phase boundary.

### 5. Potion use

When a safe potion is available:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action use_potion -SlotIndex <slot>
```

Add `-TargetId enemy-<combatId>` for an enemy-targeted potion. Verify the slot/effect/target against the game.

### 6. Stale revision rejection

Record a settled revision `N`. Advance the game through the normal UI until the authoritative state becomes `N+1`, then deliberately send an old revision:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-action.ps1 -Action end_turn -ExpectedRevision N
```

Expected:

```text
accepted=False code=stale_state
```

The game must not mutate.

### 7. Conflicting action rejection

While one OfficeSpire action is still pending, a second mutation should be rejected with `action_pending`.

### 8. Window-state behavior

Only after the basic M4 path is runtime-pass, separately test:

1. action processing while STS2 is unfocused;
2. action processing while STS2 is fully minimized.

These are separate product assumptions; success while unfocused does not prove minimized-window operation.
