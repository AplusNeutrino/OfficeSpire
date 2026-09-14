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
| State revision changes only on stable decision-state changes | `runtime_fail` | Retest on `04c5a59` / `a746dc4` still produced a second revision roughly 0.5–1.4 s after some card plays with an identical compact visible state. Revision fix 3 replaces full-JSON/time debounce with semantic decision fingerprints, native executor-idle gating, and three stable frames; runtime retest required. |
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

Validated against OfficeSpire `c114ab5` before the revision-stability patches.

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

## Revision retest 1 — `11e852a`

The first revision fix (`f313f63`) stopped 20 Hz idle churn but did not fully collapse one game action into one decision revision.

Observed:

- idle actionable state: **PASS** — revision remained constant;
- one card play: **FAIL** — example sequence `rev=6 -> 7 -> 8 -> 9` while compact HP/Energy/Hand/Enemy summaries were unchanged;
- enemy-turn animation: **PASS in this probe** — no continuous revision churn was observed;
- later card plays: **FAIL** — further duplicate sequences included `17 -> 18 -> 19` and `20 -> 21`.

Therefore `state_revision` is explicitly `runtime_fail` on `11e852a`.

## Revision fix 2 — `a746dc4`

The second fix added a 300 ms quiet-window debounce for actionable-looking combat states and set `action_pending=true` while the candidate was settling.

## Revision retest 2 — `04c5a59`

The second fix reduced churn but did not eliminate duplicate decision revisions.

Observed:

- idle stable state: **PASS**;
- first card play: **FAIL** — `rev=4 -> rev=5`, then roughly 532 ms later `rev=6`, while the compact visible state remained `Energy=2/3 Hand=4 Enemies=3`;
- later reproduction: **FAIL** — `rev=13 -> rev=14` roughly 517 ms apart with the same compact visible state;
- duplicate delays across the probe were approximately 0.5–1.4 seconds;
- enemy turns: **PASS** — examples `rev=7 -> 8`, `rev=11 -> 12`, and `rev=15 -> 16`, with no continuous animation churn;
- combat-end phase transition: **PASS** — `rev=19 phase=combat -> rev=20 phase=unknown`.

Therefore `state_revision` remains `runtime_fail` after `a746dc4`.

## Revision fix 3 — semantic decision boundary

The third fix changes the model rather than extending the debounce timeout.

Research into current STS2 automation/mod implementations showed that a reliable settlement boundary should distinguish decision semantics from presentation state and should consult native engine activity rather than infer readiness from elapsed time alone.

OfficeSpire now applies these rules:

- the 20 Hz live state snapshot is still published in full;
- revision fingerprinting no longer hashes the complete `run + screen` JSON;
- localized/rich presentation fields such as descriptions, rendered intent prose and other text cannot independently advance revision;
- the semantic fingerprint contains structured decision fields such as HP/block/energy, hand identity/cost/damage/block/playability/targets, pile counts, enemy HP/block/powers/alive/hittable state, potions and stable run/relic state;
- combat revision promotion requires `waiting_for_input=true` **and** `RunManager.Instance.ActionExecutor.CurrentlyRunningAction == null`;
- a changed semantic candidate must be identical for **three consecutive actionable frames** before it is committed;
- while the executor/input gate is busy or a candidate is settling, the snapshot reports `action_pending=true`;
- phase changes still advance revision immediately.

This is intended to make `state_revision` a decision/stale-action guard rather than a presentation-render revision.

## Revision retest 3

Build/deploy the latest `main`, restart STS2, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\watch-state.ps1
```

Also tail the diagnostic log because it now records `pending` transitions even when the revision does not change:

```powershell
Get-Content "$env:APPDATA\SlayTheSpire2\OfficeSpire\runtime.log" -Wait -Tail 100
```

Verify:

1. idle actionable combat state for several seconds: revision remains constant and `pending=false`;
2. play one card: `pending` may toggle during execution/settlement, but after the action resolves the committed revision advances exactly once;
3. repeat with several cards, especially one that changes a power/status if available;
4. end turn: enemy work does not churn revision and the next player decision advances once;
5. combat-end phase transition may advance revision separately.

Only after this retest passes should `state_revision` be promoted from `runtime_fail` to `runtime_pass`.

## M4 runtime probes

After M4 lands, separately test:

1. untargeted card;
2. targeted card;
3. end turn;
4. potion use;
5. stale revision rejection;
6. unfocused main window;
7. minimized main window.
