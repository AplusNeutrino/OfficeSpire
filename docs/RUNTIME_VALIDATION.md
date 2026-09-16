# OfficeSpire Runtime Validation

This file records live runtime evidence. Milestone scope and future work are defined in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).

## Status vocabulary

- `not_implemented`
- `implemented_unverified`
- `runtime_pass`
- `runtime_fail`
- `blocked`

A source implementation or successful compilation is not a runtime pass.

## Current validated baseline

Evidence date: 2026-09-14  
STS2 version: `v0.107.1`  
STS2 game commit: `59260271`  
OfficeSpire milestone: `v0.6-alpha.1 — Playable Backend`  
OfficeSpire commit for the final M4 probe: not captured in the submitted runtime record; retain this as an evidence-metadata gap and record the exact commit for every future probe.

| Milestone | Capability | Status |
|---|---|---|
| M1 | Mod Runtime | `runtime_pass` |
| M2 | Local Transport | `runtime_pass` |
| M3 | State Observation | `runtime_pass` |
| M4 | Action Control Core | `runtime_pass` |
| M5 | Overlay Prototype | `implemented_unverified` |
| M6 | Map Controller | `implemented_unverified` |
| M7 | Run Decisions | `implemented_unverified` |
| M8 | Advanced Combat / Hardening | `implemented_unverified` (safe source delivery complete; runtime qualification blocked) |

M4 passes as a core control-chain milestone. Potion use/discard and the extreme main-thread race probe remain separately tracked and do not invalidate that core milestone.

M8 source checkpoint: keyboard shortcuts and pure key-mapping tests cover every currently supported combat and run-decision screen. Browser/Tauri focus behavior and live game actions remain `implemented_unverified`.

Recovery source checkpoint: the overlay has a 15-second non-replaying action timeout, request-ID filtering, continued state polling, and bounded reconnect backoff. Unit/build evidence exists; STS2 scene-transition, backend-restart, and delayed-action behavior remain `implemented_unverified`.

Settings/accessibility source checkpoint: versioned local persistence, bounded opacity/scale values, high contrast, reduced motion, modal focus containment, and action suppression while settings are open are implemented. Parser tests and frontend build evidence exist; Windows/Tauri rendering and assistive-technology behavior remain `implemented_unverified`.

Keyboard/accessibility focus checkpoint: a phase change moves programmatic focus to the new decision surface only once, same-phase state refreshes do not repeatedly steal focus, and closing settings restores focus to the settings trigger. Action/recovery messages are exposed as a polite atomic status region, and the icon-only potion discard action has an object-specific accessible name. Focus-policy unit/build evidence exists; Windows/Tauri keyboard-only navigation, visible focus, scaling, contrast, reduced-motion, and screen-reader announcements remain `implemented_unverified`.

Stable-identity source checkpoint: the protocol boundary rejects negative or duplicate combat IDs, hand/potion indexes, route coordinates, phase choice indexes, shop category/index pairs, and empty/duplicate enemy stable IDs. Regression/build evidence exists; malformed live snapshots and game-version drift remain `implemented_unverified`.

Combat-slot identity checkpoint: card play now binds `hand_index` to native `card_id`; potion use/discard bind `slot_index` to native `potion_id`. Main-thread dispatch rejects a changed card or potion before playability, target, removal, or enqueue logic. Frontend action tests and production build pass; live hand mutation, potion replacement, targeting, discard, and settlement remain `implemented_unverified`.

Compatibility/release source checkpoint: exact protocol-v1 negotiation, malformed-version rejection, forward envelope parsing, and synchronized npm/Cargo/Tauri/Mod release metadata checks are implemented. Automated tests and frontend preflight pass; native Windows bundling, signing, install, and upgrade remain `implemented_unverified`.

Workshop-preparation source checkpoint: a manual-only Windows bundle workflow, DLL-only manifest/dependency checks, a non-publishing PowerShell candidate packager, checksum generation, and a clean-install checklist are implemented. Current declared third-party Mod dependencies remain empty because no external framework API is used. The workflow and PowerShell script were not run in this Linux environment; Windows artifact creation, Workshop executable/content-root policy, clean subscription, dependency coexistence, signing, install, upgrade, and uninstall behavior remain `implemented_unverified`.

Workshop provenance checkpoint: candidate packaging now requires a reviewed 40-character source commit, defaults to a Mod-only payload, makes Overlay inclusion explicit and extension-limited, rejects directory/reparse-point inputs, and embeds `CANDIDATE.json` with versions, dependency declarations, payload sizes/hashes, and `publication_performed=false`. These are source controls only; PowerShell execution, independent hash verification, policy acceptance, and private subscription lifecycle remain `implemented_unverified`.

Candidate-verifier source checkpoint: `npm run verify:workshop -- <extracted-directory>` independently enforces the provenance manifest and rejects undeclared, missing, tampered, duplicate, traversal, and symbolic-link payloads without modifying them. Synthetic valid/tampered/extra-file/publication-claim cases run in `npm run check`; a real Windows-produced candidate has not been verified, so packaging remains `implemented_unverified`.

Menu-lifecycle source checkpoint: a missing native run state is represented as a typed `menu` snapshot, protocol validation enforces its read-only shape, and the overlay directs users to the original STS2 menu without exposing or replaying a write action. Unit/build evidence exists; live startup/menu transitions remain `implemented_unverified`. A missing or transient run state is never treated as terminal; the separately gated `run_end` path is tracked below.

Run-end source checkpoint: the native visible `NGameOverScreen` gates a read-only `run_end` snapshot, and outcome classification uses the engine's abandonment flag, current victory-room flag, and win time. Protocol validation accepts only `victory`, `defeat`, or `abandoned`; no post-run write action exists. Unit/build evidence exists, but Mod compilation against current game assemblies, victory/defeat/abandon observations, death-prevention edges, and return-to-menu transitions remain `implemented_unverified`.

Race-evidence source checkpoint: `npm run analyze:runtime` passively parses OfficeSpire runtime logs and reports revision regressions, same-revision phase changes, pending cycles, unresolved pending state, and represented phases. Its schema permanently requires manual runtime judgment and it sends no game action. Synthetic parser tests exist; no STS2 stress observation has been performed, so the extreme main-thread race capability remains `implemented_unverified`.

Diagnostic-integrity checkpoint: passive reports fingerprint the exact input bytes with SHA-256, record the first/last observed timestamps, and count malformed state records, invalid timestamps, and time regressions as invariant warnings. This prevents a partially parsed or accidentally reordered log from appearing clean. Synthetic analyzer evidence exists; capture provenance and supported/incompatible-version observations from real STS2 processes remain `implemented_unverified`.

Rich-text source checkpoint: the Mod now normalizes formatted and raw fallback strings, and the Overlay independently normalizes presentation fields received over the wire. Color/BBCode tags are stripped, explicit breaks are preserved, image tags become readable labels, and unresolved variables are suppressed without changing stable IDs. Unit and production-build evidence exists; live localized card, power, intent, event, rest, reward, relic, and potion strings remain `implemented_unverified`.

Rich-text corpus checkpoint: 9 focused tests cover nested/mixed-case tags, multiple image tags with attributes, explicit breaks, unresolved variables, malformed bracket tags, leaked bare `/gold`-style closers, Unicode preservation, and recursive presentation-only normalization. Together with the protocol suite, 39 frontend tests pass. This is source evidence only; STS2 localized runtime output remains `implemented_unverified`.

Rest-identity source checkpoint: `choose_rest_option` now carries the native option ID as well as its displayed index. Main-thread dispatch reloads the native options and rejects changed identities or mismatched native control counts before clicking. Unit/build evidence exists; live ordinary, smith/remove, version-specific, and multiplayer rest flows remain `implemented_unverified` or `not_implemented` as listed in the roadmap.

Map-generation source checkpoint: map snapshots now expose the native map-generation counter and scope node stable IDs to it. Route requests carry generation, stable ID, and coordinates; main-thread dispatch rejects a generation/identity mismatch before its existing live reachability check and native vote enqueue. Unit/build evidence exists; first-floor, boss, act-transition, and multiplayer voting behavior remains `implemented_unverified`.

Card/relic identity source checkpoint: reward-card, generic card-selection, hand-selection, and treasure-relic actions now carry the native card/relic ID beside the displayed index. Main-thread dispatch reloads the native model and rejects identity drift before pressing or voting. Unit/build evidence exists; live reward, upgrade, deck, hand multi-select, and treasure transitions remain `implemented_unverified`.

Merchant-identity source checkpoint: every card, relic, and potion shop entry exposes its native model ID; purchases carry category, category-local index, and ID. Main-thread dispatch reloads the inventory and rejects missing or changed identity before stock/affordability checks and asynchronous purchase. Unit/build evidence exists; live inventory refresh, discounts, purchase settlement, removal, and modded inventory remain `implemented_unverified`.

Reward/event token source checkpoint: ordinary rewards and event options now expose opaque process-local action tokens assigned to native model instances through weak references. Dispatch requires the current indexed model to retain the same token; completed-event proceed uses a reserved token. Tokens are neither derived from localized text nor persisted. Unit/build evidence exists; live reward replacement, event mutation/proceed, localization, and process-restart transitions remain `implemented_unverified`.

Rest-lifecycle source checkpoint: rest snapshots explicitly distinguish `options`, unsupported `player_target`, `proceed`, and non-actionable `resolving` states. Card-based smith/remove follow-ups remain a distinct `card_selection` phase, and accepted rest actions stay pending until a newer settled decision revision rather than completing on click. Unit/build evidence exists; each native rest option family and its transition remain `implemented_unverified`.

Lifecycle-transition source checkpoint: missing-run and visible-game-over signals require three consecutive capture frames before promotion to read-only `menu` or `run_end`. Earlier frames are non-actionable `unknown` snapshots with `action_pending=true`. Non-input states in every decision phase now remain pending rather than applying the former combat-only rule, preventing rest resolution/player-target waits from timing out as false no-effects. Source/build evidence exists; startup, load/resume, death prevention, game-over, and return-to-menu timing remain `implemented_unverified`.

M8 coverage correction: the earlier “source complete” label was too broad. Ordinary rest-site choices/leave and smith/remove card-selection follow-ups exist, but multiplayer rest targeting is `not_implemented`; menu and run-end states are read-only by design; map/rest lifecycle variants still need live enumeration. No capability is promoted by this correction.

Final source-delivery audit: M8.1–M8.10 have their planned fail-closed source paths, tests, documentation, diagnostics, and packaging controls. M8.11 is now explicitly `blocked`, not `runtime_pass` or source-validated: its authoritative checklist is [M8_QUALIFICATION_MATRIX.md](M8_QUALIFICATION_MATRIX.md) and requires Windows, current STS2 assemblies/runtime, Tauri/WebView, and Steam access. No live capability is promoted by this audit.

## M1 — Mod Runtime

Status: `runtime_pass`

Observed:

- native manifest and DLL load;
- `[ModInitializer]` execution;
- OfficeSpire runtime initialization;
- runtime logging/diagnostics available.

## M2 — Local Transport

Status: `runtime_pass`

Observed:

- loopback WebSocket server starts;
- authenticated session can connect;
- `get_state` returns state;
- action requests reach the backend;
- transport does not directly mutate STS2 objects.

## M3 — State Observation

Status: `runtime_pass`

Validated capabilities:

- main-thread state capture;
- combat phase identification;
- player HP, block, and energy;
- hand cards, current costs, Damage/Block, and `CanPlay`;
- enemy HP and intent;
- authoritative state change observation;
- semantic `state_revision`;
- `action_pending` during unsettled state;
- phase-transition revision behavior.

### Semantic revision evidence

Validated against OfficeSpire `ac8f66a` on STS2 `v0.107.1` / `59260271`.

Observed:

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

No same-semantic `pending=false -> pending=false` duplicate revision was observed in this probe.

## M4 — Action Control Core

Status: `runtime_pass`

Validated end-to-end chain:

```text
Overlay / Client
        ↓
WebSocket
        ↓
ActionInbox
        ↓
Expected Revision Check
        ↓
Godot Main Thread
        ↓
STS2 Native Action Queue
        ↓
Action Execution
        ↓
State Adapter
        ↓
Semantic Revision++
        ↓
Completed
```

### Capability matrix

| Capability | Status | Required observation |
|---|---|---|
| WebSocket transport | `runtime_pass` | Request reaches backend. |
| ActionInbox queue | `runtime_pass` | Mutating request is queued and consumed. |
| Main-thread dispatch | `runtime_pass` | STS2 native path is invoked on the Godot main thread. |
| Second revision validation | `runtime_pass` | Expected revision is rechecked at dispatch time. |
| Untargeted `play_card` | `runtime_pass` | Intended card executes and authoritative state settles forward. |
| Targeted `play_card` | `runtime_pass` | Intended target receives the action. |
| `end_turn` | `runtime_pass` | Enemy turn and next decision state occur normally. |
| Pending lifecycle | `runtime_pass` | Conflicting mutation is prevented while pending. |
| Revision settlement | `runtime_pass` | Completion occurs at a newer settled decision revision. |
| Stale guard | `runtime_pass` | Old revision is rejected without game mutation. |
| `use_potion` | `implemented_unverified` | Source exists; no qualifying live result recorded. |
| `potion_discard` | `implemented_unverified` | Native action and overlay control exist; no qualifying live result recorded. |
| Main-thread extreme race window | `implemented_unverified` | No dedicated stress probe recorded. |

### Core acceptance result

The following sequence has passed in the real runtime:

```text
request
-> queued
-> accepted
-> native execution
-> authoritative state change
-> semantic revision settlement
-> completed
```

This supersedes the earlier pre-fix M4 no-op result for untargeted Self cards and the earlier lifecycle timeout. Those failures remain relevant as regression history, but they are not the current status.

### Historical defect retained for regression coverage

An earlier M4 build resolved `TargetType.Self` to `player.Creature` before constructing `PlayCardAction`. The native action was accepted but had no effect, leaving the request pending until timeout.

The corrected behavior:

- `AnyEnemy` resolves a current living/hittable enemy;
- `AnyAlly` / `AnyPlayer` resolve the local player's creature;
- `Self`, `None`, AOE, and random-target modes pass no explicit target and let STS2 resolve recipients;
- accepted actions that produce no progress are bounded by the no-effect watchdog.

Regression expectations:

- Self/untargeted cards must continue to complete;
- a silent native no-op must return `no_effect` and release `action_pending`;
- no accepted action may hold the mutation lock indefinitely.

## M5 — Overlay Prototype

Current status: `implemented_unverified`

Source/scaffolding exists for:

- Tauri shell;
- React renderer;
- protocol/snapshot model;
- WebSocket abstraction;
- initial combat components;
- initial action components;
- transparent/borderless/always-on-top configuration.
- native session-file discovery;
- protocol-v1 WebSocket state polling and reconnect;
- live combat rendering without demo data;
- mouse card/target/End Turn requests;
- action lifecycle and error presentation.

Current non-runtime verification:

| Check | Result |
|---|---|
| `npm test` | PASS — 5 protocol tests |
| `npm run build` | PASS — TypeScript and Vite production build |
| `npm audit --omit=dev` | PASS — 0 production vulnerabilities |
| `npm run tauri info` | Diagnostic PASS; Rust/Cargo and Linux WebKit prerequisites absent |
| Rust/Tauri native compile | Not run; environment blocked |

None of the following is a runtime pass yet:

- real Tauri desktop launch;
- live STS2 WebSocket connection from the overlay;
- real snapshot rendering;
- mouse card execution;
- target-selection execution;
- End Turn from the overlay;
- stale/pending UI recovery;
- unfocused/minimized behavior through the overlay.

## M6 — Map Controller

Current status: `implemented_unverified`

Source exists for authoritative map snapshots, reachable-node rendering, revision-guarded `choose_map_node`, fresh main-thread reachability checks, and native `VoteForMapCoordAction` submission.

Current non-runtime verification:

| Check | Result |
|---|---|
| `npm test` | PASS — 7 protocol/action tests |
| `npm run build` | PASS — TypeScript and Vite production build |
| Mod compilation against STS2 | Not run — installed game assemblies unavailable |

No live map snapshot, route choice, native settlement, or room transition is a runtime pass yet.

## M7 — Run Decisions

Overall status: `implemented_unverified`

Implemented but unverified capability source:

- combat reward list and card-option snapshots;
- reward collection through the current native reward button;
- card reward selection through the current native card holder;
- reward skip/continue through the enabled native proceed button;
- overlay rendering and revision-guarded mouse actions.
- choose-a-card option snapshots and `choose_card_option` dispatch for `NChooseACardSelectionScreen`.
- deck/grid selection, upgrade confirmation, and hand multi-selection source paths;
- reflected hand min/max/current counts and guarded `confirm_card_selection`.
- event state/options plus guarded native event option and proceed dispatch.
- rest-site options/leave source path, with card-selection follow-ups and explicit unsupported multiplayer targeting.
- treasure open, relic choice/skip, predicted vote, and leave source paths.
- merchant inventory, purchase, card-removal initiation, and leave source paths.

Frontend checks after this source pass: `npm test` PASS (15 tests) and `npm run build` PASS. Selection-screen skipping and rest-site multiplayer targeting are not implemented. No M7 runtime behavior is a pass.

Use the M5 matrix in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) for the next probes.

## M9 — Full-Chain Control Surface

Overall status: `in_progress`, with all newly added game-facing behavior remaining `implemented_unverified` until Windows/STS2/Tauri evidence exists.

First source slice:

- combat player snapshots now include the native player power/status list with readable descriptions and amounts;
- combat snapshots expose native potion capacity independently from occupied slots;
- the Overlay uses the already exported typed relic list and renders names, stack counts, and descriptions;
- the combat panel always exposes the potion section, including an explicit empty state and occupied/capacity count;
- no new mutation, replay path, or runtime-pass claim is introduced.

Second source slice:

- run state carries native character ID and name;
- combat state carries Regent stars, Defect orb slots/orbs, and Necrobinder Osty combat state;
- Osty includes alive state, HP, block and powers; cosmetic pets are omitted instead of receiving invented combat fields;
- protocol validation fails closed when the complete M9 combat information shape is absent;
- this is source/build evidence only. Current STS2 assembly compilation and all five-character live comparisons remain `implemented_unverified`.

Third source slice:

- the run snapshot exports every deck card separately with native identity and upgrade state;
- draw, discard and exhaust pile contents use STS2's pile-context description path;
- the Overlay exposes collapsed, read-only deck/pile inspectors while retaining the compact count footer;
- protocol validation rejects count/content mismatches, so partial pile exports cannot silently masquerade as complete information;
- deck mutation, draw/reshuffle/discard/exhaust transitions and character-specific card descriptions remain `implemented_unverified` pending STS2 runtime evidence.

Required live evidence remains: compile against the installed STS2 assemblies; compare identity, powers, relics, potion slots, Regent stars, Defect orbs, Necrobinder Osty, the run deck and all combat piles against the native UI; observe add/remove/expiry, reshuffle and capacity changes; verify the Windows/Tauri layout and rich/localized descriptions. Any additional character-specific entity discovered in the installed version must be added to the inventory before M9.2 can complete.

The M9 privacy hotkey is planned but not implemented. Its runtime gate includes authenticated-PID-only targeting, hide/restore recovery, global-shortcut collision, fullscreen, multi-monitor, focus, game restart and Overlay-exit behavior. Static code or a mocked window handle will not count as `runtime_pass`.

M9.3 read-only source checkpoint:

- no-run state now identifies typed main, single-player, multiplayer, host, join/load and character-selection surfaces;
- currently visible native menu controls are exported as semantic IDs, labels and availability, with duplicate IDs rejected;
- the Overlay only renders informational rows and `can_mutate` is required to remain false;
- no menu mutation was added, so observation cannot start, resume, abandon or quit a game;
- profile selection reports native profile IDs and current profile without exposing any create/delete/overwrite mutation;
- generic native yes/no popups are observable with normalized text, but an unrecognized popup is not labeled as a modded-save warning;
- character selection reports identity, lock state, initial HP/gold/energy, starting relics and starting deck;
- cold start, saves, exact modded-save warning classification, profile switching, every menu transition and all character data remain `implemented_unverified` until observed against the installed STS2 build.

M9.4 read-only source checkpoint:

- native Standard character selection, Custom Run and Daily Run expose their shared lobby configuration without inventing defaults;
- observed setup includes mode, current/max ascension, nullable seed, first-act key, selected modifier IDs/names/descriptions and Daily server time when available;
- loading Daily state may legitimately have `run_setup=null` until its time request initializes the lobby;
- no configuration or ready/embark mutation exists, and no timed-out setup action can be replayed;
- installed-assembly compilation, all legal/rejected seed and modifier paths, Daily server/local fallback, and solo/multiplayer synchronization remain `implemented_unverified`.

M9.5/M9.6 read-only lobby checkpoint:

- initialized Standard, Custom and Daily setup can report local service role, nullable capacity, stable local/remote player IDs, unique slots, characters and Ready state;
- client-side host identity stays unknown rather than being inferred, and `all_ready` is not treated as authoritative launch settlement;
- partially initialized or identity-incomplete native lobbies are omitted, preventing placeholder players from passing protocol validation;
- protocol validation requires exactly one local player plus unique player and slot identities;
- 2–4 machine hosting/joining, remote host attribution, disconnect/reconnect, readiness changes, host migration, simultaneous combat and shared decisions remain `implemented_unverified` or `not_implemented`.

M9.6 discovery/load source checkpoint:

- join discovery distinguishes refresh, active joining, no available friends and an available-session list using native platform player IDs;
- host mode exposes its asynchronous loading overlay, while saved-run load lobbies expose connected/required player counts;
- protocol validation rejects duplicate discovered-session IDs and impossible negative/over-capacity connection counts;
- disappearing loading state is not treated as success, and no join/load/refresh/host operation is sent by OfficeSpire;
- real Steam discovery, FastMP fallback, loaded-run missing-player confirmation, rejoin behavior and version mismatch handling remain `implemented_unverified` or `not_implemented`.

M9.6 saved-run/error source checkpoint:

- multiplayer load state carries the native saved mode, ascension, act, visited floors and a complete player inventory with HP, energy, potion capacity, gold and connected/missing state;
- validation requires unique player IDs and an exact missing-player count, preventing partial saved rosters from appearing complete;
- the Overlay calls out missing peers but cannot confirm continuing without them, reconnect them or begin the run;
- `NErrorPopup` is surfaced separately with normalized localized title/body and its native buttons remain informational only;
- this is source/build evidence. Live error causes, missing-player confirmation, save compatibility and recovery behavior remain `implemented_unverified`.

M9.6 run-party source checkpoint:

- run snapshots now include an authoritative multiplayer roster sourced from the run's players and `RunLobby.ConnectedPlayerIds`;
- each member exposes network/character identity, local ownership, connected state, HP/block/alive state, gold, energy and potion occupancy/capacity;
- the Overlay expands party details automatically when a peer is disconnected, and states explicitly that it will not reconnect or replay actions;
- native invite availability is visible during setup but remains non-actionable;
- the inspected native source allows existing-player rejoin but abandons the run when the host abandons it; no host-migration capability was found;
- these are static/source checks only. Multi-machine disconnect/rejoin, host loss and simultaneous combat remain `implemented_unverified`.

M9.6 shared-decision source checkpoint:

- the map, shared-event and treasure state contracts now expose one native synchronizer vote per run player, keyed by stable network ID;
- selected map coordinates are generation-bound node IDs, while event and treasure selections are cross-checked against the current option token or relic ID;
- the Overlay renders confirmed voters and pending counts, and protocol validation rejects duplicate or party-incomplete voter inventories;
- no remote-player mutation, inferred consent or automatic replay was introduced;
- real 2–4 player voting, disconnect during a vote, simultaneous submission and settlement remain `implemented_unverified`; reward ownership and rest-site teammate targeting are still unimplemented.

M9.6 per-player rest-decision source checkpoint:

- rest snapshots now enumerate each run player's own synchronizer-generated remaining options, last chosen index and hover index under their stable network ID;
- remote records are display-only, while local actions retain expected-revision, option-index and native option-ID revalidation;
- protocol ingestion rejects duplicate/missing party records, duplicate option IDs/indexes and impossible hover positions;
- the inspected reward synchronizer does not expose a current choice inventory, so reward ownership remains unresolved instead of being inferred from asynchronous settlement messages;
- current-assembly compilation, 2–4 player rest progress, option removal, target handoff and disconnect behavior remain `implemented_unverified`; teammate targeting remains `not_implemented`.

M9.6 simultaneous-combat ownership source checkpoint:

- combat state now carries the native global synchronizer phase, all-queues-empty flag, and one participant record per stable run-player ID;
- participant records expose each player's actual combat phase and player-owned queue pause state, but only the local player can report `can_submit_actions=true`;
- local readiness now also fails closed while the local action queue is paused; no combat request accepts or derives a remote owner ID;
- protocol validation rejects incomplete/duplicate participant sets, remotely actionable records and a mismatch between local readiness and `waiting_for_input`;
- these are source/build assertions only. Real simultaneous turns, queue ordering, pause/resume, disconnect and cross-machine settlement remain `implemented_unverified`.

M9.7 card/grid variant safety source checkpoint:

- the abstract `NCardGridSelectionScreen` family is now split into semantic protocol kinds rather than assuming every subclass completes on the first card-holder press;
- only `NDeckCardSelectScreen` and `NDeckUpgradeSelectScreen` are mutation-enabled, retaining card-index plus native-card-ID revalidation and their separately modeled preview confirmation;
- every other grid subclass reports `waiting_for_input=false`, `selection_type="unsupported_grid"`, and a non-empty original-UI handoff reason;
- the game-thread dispatcher independently rejects those subclasses with `unsupported_state`, even if a client attempts to submit an action;
- frontend protocol tests prove an unsupported grid cannot advertise itself as actionable. This is static evidence only: current STS2 compilation and real deck-card/upgrade preview settlement remain `implemented_unverified`.

M9.7 treasure lifecycle source checkpoint:

- version-pinned native inspection found no `SkipRelicLocally` or equivalent decline vote in `TreasureRoomRelicSynchronizer`; the invalid Mod call, protocol action, keyboard route and Overlay control were removed;
- unopened/resolved chests no longer read player votes from the synchronizer's inactive vote list, and the predicted local vote follows the native nullable integer field shape;
- client validation now rejects contradictory chest/picking/leave flags, duplicate relic identities, out-of-inventory selections, and votes that do not bind to the current relic ID;
- the game thread checks the enabled chest control before opening and the native collection-open flag before voting;
- all results are source/static/build evidence only. Current-assembly Mod compilation, empty-chest behavior, contested multiplayer relic fights and final award settlement remain `implemented_unverified`.

M9.7 special-event/minigame source checkpoint:

- `special_event` is a separate protocol phase, preventing custom native layouts from being mistaken for ordinary event options;
- Crystal Sphere snapshots bind every hidden choice to `crystal-cell-{x}-{y}`, report the current small/big tool and remaining divinations, and expose proceed only when the native button is enabled;
- the dispatcher repeats the active-screen, enabled-control and hidden-coordinate checks immediately before each tool/cell/proceed mutation; a revealed or replaced cell returns `stale_state` and is not clicked;
- Fake Merchant and ancient dialogue are typed read-only fallbacks with a required original-UI handoff reason; protocol validation rejects either variant if it advertises input;
- static protocol tests cover a valid grid, malformed/falsely actionable fallback rejection and action payload identity. These checks do not compile the Mod or execute STS2;
- installed-assembly compilation plus live paid/free Crystal Sphere routes, small/big reveals, completion, Fake Merchant purchase/combat/leave, ordinary event handoff and multiplayer behavior remain `implemented_unverified`.

## Required evidence format for future probes

Every new runtime record must include:

```text
Date/time:
OfficeSpire commit:
OfficeSpire version:
STS2 version:
STS2 game commit:
OS:
Build command/result:
Launch procedure:
Probe:
Expected:
Observed:
Status:
Logs/artifacts:
Known limitations:
```

For action probes also record:

- initial phase and settled revision;
- request ID and action payload;
- queued/accepted/rejected/completed sequence;
- final revision and pending state;
- visible game effect;
- whether STS2 was focused, unfocused, or minimized.

## Promotion procedure

When a runtime probe changes project status:

1. add the evidence here;
2. update the affected row in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md);
3. update the concise status in [../README.md](../README.md);
4. keep deferred capabilities separate from the milestone core;
5. never overwrite a failure without retaining enough regression context to prevent recurrence.
