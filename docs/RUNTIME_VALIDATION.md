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
| State revision changes only on stable decision-state changes | `runtime_fail` | Retest on `11e852a` showed idle stability and enemy-turn stability, but one card play still produced 2-4 revisions with identical compact summaries. `a746dc4` adds a 300 ms quiet-window debounce and marks unsettled snapshots `action_pending=true`; requires another runtime retest before status can change. |
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

### Why the first fix was insufficient

`waiting_for_input=false` filtering removed obvious animation frames, but STS2 can expose several short-lived snapshots with `waiting_for_input=true` while a card's effects, piles, powers, targeting legality, or other protocol fields are still converging. Because the fingerprint covers the complete decision snapshot, each of those intermediate actionable-looking states could become a new revision.

## Revision fix 2 — `a746dc4`

`a746dc4` adds a quiet-window debounce around actionable combat snapshots:

- non-actionable combat snapshots continue to be published but do not advance revision;
- when a new actionable fingerprint first appears, it becomes a **candidate**, not an immediate revision;
- whenever that candidate changes, its settle timer restarts;
- only after the same candidate remains unchanged for at least **300 ms** is it promoted to the next revision;
- while a candidate is settling, `action_pending=true` is published so the future overlay/M4 dispatcher can suppress user actions until the decision state is committed;
- phase changes still advance revision immediately.

This is deliberately a decision-state debounce, not a delay in reading game state: raw screen snapshots continue to refresh at 20 Hz.

## Revision retest 2

Build/deploy the latest `main`, restart STS2, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\watch-state.ps1
```

Verify:

1. idle at an actionable combat state for several seconds: revision remains constant;
2. play one card: after all effects settle, revision advances exactly once;
3. play several more cards, including a card that changes a power/status if available: each completed decision transition advances once;
4. end turn: enemy-animation states do not churn revision; the next player decision advances once;
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
