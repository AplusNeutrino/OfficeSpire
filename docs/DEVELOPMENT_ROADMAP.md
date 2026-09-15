# OfficeSpire Development Roadmap

> **Canonical development source of truth**
>
> This document is the sole authority for OfficeSpire milestone status, execution order, scope, and exit criteria.
> If another document, commit message, or code comment conflicts with this roadmap, update this document from real code, build results, and runtime evidence before continuing development.

Last updated: 2026-09-15
Product target: OfficeSpire v0.6
Current development version: v0.6-beta.1 — Full Run Hardening
Current milestone: M8 (source hardening resumed; live runtime validation remains deferred)
Previous validated milestone: v0.6-alpha.1 — Playable Backend

## 1. Product objective

OfficeSpire is a text-first alternative control surface for Slay the Spire 2 (STS2).

The target experience is a compact semi-transparent desktop overlay that:

- reads authoritative game state from the OfficeSpire mod;
- presents combat and run decisions without duplicating STS2 rules;
- submits explicit user choices through a local protocol;
- remains usable with mouse input first and keyboard input later;
- fails safely back to the original game UI.

OfficeSpire is a control surface, not an automation bot. The game remains authoritative for rules, RNG, saves, actions, rewards, map state, and progression.

## 2. Architecture baseline

```text
Overlay / Client
        ↓
Loopback WebSocket
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

Components:

- **OfficeSpire.Mod** — C#/.NET 9 STS2 mod, state adapter, revision guard, action dispatcher, loopback server.
- **OfficeSpire.Overlay** — Tauri 2 + React + TypeScript desktop client.
- **Protocol** — versioned snapshots and action requests with request IDs and expected revisions.
- **Runtime evidence** — maintained separately in [RUNTIME_VALIDATION.md](RUNTIME_VALIDATION.md).

## 3. Status vocabulary

Only these states are used:

- `not_implemented` — required behavior is absent.
- `implemented_unverified` — source exists but required build or runtime evidence is missing.
- `runtime_pass` — behavior was observed successfully in the target runtime.
- `runtime_fail` — runtime evidence demonstrated failure.
- `blocked` — work cannot proceed until an external dependency or decision is resolved.

Rules:

1. Code presence is not runtime proof.
2. Compilation is not STS2 runtime proof.
3. Mock data is not live integration proof.
4. A milestone passes only when every mandatory exit criterion has evidence.
5. Game-dependent validation must record STS2 version/build, OfficeSpire commit, command/procedure, observed result, and known limitations.
6. Unsupported states must fail closed without mutating the run.
7. Development does not expand into the next milestone until the current milestone's mandatory exit criteria pass, except for isolated research or scaffolding that does not create false completion claims.

## 4. Validated baseline — v0.6-alpha.1 “Playable Backend”

### Milestone status

| Milestone | Capability | Status |
|---|---|---|
| M1 | Mod Runtime | `runtime_pass` |
| M2 | Local Transport | `runtime_pass` |
| M3 | State Observation | `runtime_pass` |
| M4 | Action Control Core | `runtime_pass` |

M4 “runtime_pass” refers to the first core control chain. It does not promote deferred potion work or the main-thread extreme race probe.

### M4 capability matrix

| Capability | Status | Notes |
|---|---|---|
| WebSocket transport | `runtime_pass` | Client request reaches the local authenticated transport. |
| ActionInbox queue | `runtime_pass` | Mutating request is serialized and queued. |
| Main-thread dispatch | `runtime_pass` | Native action dispatch occurs on the Godot main thread. |
| Second revision validation | `runtime_pass` | Revision is checked again immediately before dispatch. |
| Untargeted `play_card` | `runtime_pass` | Card executes and reaches a newer settled state. |
| Targeted `play_card` | `runtime_pass` | Selected enemy receives the intended action. |
| `end_turn` | `runtime_pass` | Normal enemy turn and next decision boundary occur. |
| Pending lifecycle | `runtime_pass` | Conflicting actions are blocked while the accepted action is pending. |
| Revision settlement | `runtime_pass` | Completion waits for a newer authoritative settled revision. |
| Stale guard | `runtime_pass` | Old expected revisions are rejected without mutation. |
| `use_potion` | `implemented_unverified` | Deferred until after the first overlay prototype. |
| `potion_discard` | `implemented_unverified` | Native discard action and overlay control exist; live validation is pending. |
| Main-thread extreme race window | `implemented_unverified` | Requires a dedicated stress probe. |

This baseline proves that OfficeSpire is no longer only a state reader: an external client can reliably control the STS2 native action path for the validated core actions.

## 5. Current milestone — M5 Overlay Prototype

Version node: **v0.6-alpha.2 “Overlay Prototype”**

Goal:

> Deliver the first usable semi-transparent text overlay that renders live combat state and performs the validated core combat actions.

Scope discipline:

- Mouse interaction is mandatory for M5.
- Keyboard shortcuts are optional follow-up work after the mouse loop passes.
- Potion APIs, map navigation, rewards, events, shops, rest sites, and treasures are not M5 blockers.
- Visual polish must not precede live integration and action correctness.

### Implementation checkpoint — 2026-09-14

The first complete M5 source pass is now present:

- deterministic npm dependency lockfile;
- corrected protocol-v1 wire envelopes matching the C# backend;
- native Tauri command for Windows `session.json` discovery;
- authenticated loopback WebSocket connection;
- protocol-version guard, state polling, heartbeat, and reconnect;
- live combat state renderer with no demo snapshot fallback;
- mouse interaction for untargeted cards, targeted cards, and End Turn;
- action-result polling with pending/stale/rejection/error presentation;
- target selection invalidated when the authoritative revision changes;
- frontend protocol tests and Overlay CI.

Verified in the current development environment:

- `npm test`: PASS (5 tests);
- `npm run build`: PASS (TypeScript + Vite production build);
- production dependency audit: 0 vulnerabilities.

Still unverified:

- Rust/Tauri native compilation (Rust and Linux Tauri system libraries are absent from the current environment);
- Windows desktop launch and window behavior;
- live connection to STS2;
- all M5 runtime interaction probes.

The milestone therefore remains `implemented_unverified`.

### M5.0 Baseline audit and reproducible build

Current status: `implemented_unverified`

Tasks:

- verify Node, TypeScript, Vite, Rust, Cargo, and Tauri configuration;
- add and commit the appropriate dependency lockfile;
- confirm `npm run build` succeeds;
- confirm the Tauri desktop build/check succeeds;
- remove demo-only assumptions that conflict with live state;
- document Windows prerequisites and commands;
- add CI for platform-independent frontend checks where practical.

Exit criteria:

- a clean checkout can install deterministic frontend dependencies;
- TypeScript/Vite production build passes;
- Tauri configuration and Rust source compile/check successfully on a supported environment;
- failures are documented rather than represented as completed features.

### M5.1 Desktop shell

Current status: `implemented_unverified`

Required behavior:

- independent Tauri desktop window;
- transparent or user-configurable translucent background;
- borderless presentation;
- always-on-top mode;
- draggable surface or drag region;
- resizable window;
- minimum readable size;
- visible connection/error state;
- ordinary close/relaunch lifecycle;
- does not capture the entire screen or interfere with STS2 input when idle.

Exit criteria:

- real desktop launch succeeds;
- transparency, drag, resize, and always-on-top are manually verified;
- window remains usable while STS2 is running;
- known platform limitations are recorded.

### M5.2 Session discovery and live WebSocket integration

Current status: `implemented_unverified`

Tasks:

- discover/read the current local session endpoint and token safely;
- perform protocol handshake and version validation;
- connect only to loopback;
- receive authoritative snapshots;
- implement heartbeat and bounded reconnect backoff;
- distinguish disconnected, connecting, connected, incompatible, and error states;
- reject malformed/incompatible messages without crashing;
- prevent stale sockets from driving the UI after reconnect.

Exit criteria:

- overlay connects to the real OfficeSpire backend;
- a live STS2 snapshot replaces demo data;
- disconnect and ordinary backend restart recover without restarting the overlay;
- protocol mismatch is surfaced clearly and does not submit actions.

### M5.3 Combat state renderer

Current status: `implemented_unverified`

First usable layout must render:

- act and floor when available;
- player HP/max HP, block, and energy;
- enemies with stable IDs, HP, block, intent, and essential powers;
- current hand with index, name, cost, resolved damage/block/text, and playability;
- draw/discard/exhaust counts when present;
- `state_revision`, connection state, and pending/error information in a compact diagnostic mode.

Interaction rules:

- render authoritative values only;
- do not simulate damage, cost, or target legality in the overlay;
- disable or annotate cards that the backend reports as unplayable;
- retain the last readable state during brief reconnects while clearly marking it stale;
- never present stale state as actionable.

Exit criteria:

- overlay values match a live combat state;
- state changes follow authoritative settlement;
- enemy and card identity remain stable enough for the corresponding action request;
- disconnected/stale rendering cannot send a mutation.

### M5.4 Mouse combat controls

Current status: `implemented_unverified`

Mandatory actions:

- click an untargeted playable card to submit `play_card`;
- click a targeted card, show a target selector, then submit the selected enemy ID;
- click **End Turn** to submit `end_turn`;
- attach the current `expected_revision` and a unique request ID;
- allow only one conflicting mutation while `action_pending=true`;
- display accepted, rejected, completed, stale, no-effect, timeout, and transport failures;
- refresh from authoritative state after completion or rejection.

Target-selection rules:

- do not guess a target when more than one valid target exists;
- canceling target selection must not submit an action;
- refresh/cancel the selector if the revision changes;
- only backend-provided valid targets may be selected.

Exit criteria:

```text
View live enemy and hand
 -> select an untargeted card
 -> observe authoritative completion
 -> select a targeted card and enemy
 -> observe the intended result
 -> end turn
 -> receive the next settled decision state
```

The loop must pass without clicking the original STS2 combat UI for those decisions.

### M5.5 Runtime validation and alpha.2 completion

Required probes:

- Tauri desktop launch;
- window transparency, drag, resize, and always-on-top;
- live backend connection and authenticated handshake;
- snapshot receipt and state accuracy;
- reconnect after backend/game restart where supported;
- untargeted card click;
- targeted card plus target-selection click;
- end-turn click;
- pending-action UI lock;
- stale-revision rejection and recovery;
- malformed/disconnected action prevention;
- original STS2 window unfocused behavior;
- original STS2 window minimized behavior, recorded separately.

M5 exit criteria:

- all M5.1–M5.4 mandatory exit criteria pass;
- runtime evidence is added to `RUNTIME_VALIDATION.md`;
- README status reflects the evidence;
- known unsupported cases are explicit;
- no M5 item is promoted solely from source existence.

### M5.6 Optional keyboard layer

Status: `not_implemented` and not an alpha.2 blocker.

Proposed bindings:

- `1`–`9`: select a hand card;
- `A`–`Z`: select a visible target;
- `E`: end turn;
- `Esc`: cancel target selection;
- focus-safe behavior for text/configuration controls.

This becomes mandatory before the final v0.6 release, but it follows the validated mouse loop.

## 6. M6 Map Controller

Current status: `implemented_unverified`

Development began by explicit maintainer direction while game-dependent M5 validation remains unavailable. This does not promote M5 or M6 to `runtime_pass`.

Goal:

> Leave combat and choose the next reachable map node through OfficeSpire.

State work:

- current act/floor/node;
- reachable next nodes;
- stable node identifiers or coordinates;
- node type and availability;
- route preview data where the game exposes it authoritatively.

Action work:

- introduce the backend map action only after its native path is researched;
- validate reachability and expected revision on receipt and main-thread dispatch;
- render reachable choices;
- submit a selected map node;
- settle only on an authoritative phase/node revision.

Exit criteria:

- map shown in overlay matches live reachable choices;
- one valid route selection completes through the native game path;
- invalid, stale, and unreachable selections are rejected safely;
- combat-to-map and map-to-next-room transitions recover cleanly.

No action name such as `move_to_map_coord` is considered stable until protocol design and native runtime research confirm it.

### Implementation checkpoint — 2026-09-15

- authoritative map phase detection through the open native map screen;
- current, reachable, and full-act node snapshots with stable coordinate IDs;
- `choose_map_node` protocol action with transport and main-thread phase/revision checks;
- fresh native reachability validation immediately before dispatch;
- route submission through `VoteForMapCoordAction` and the STS2 action queue synchronizer;
- mouse-operated reachable-room renderer in the overlay;
- map snapshot parsing and action-construction tests.

Verified outside the game runtime:

- `npm test`: PASS (7 tests);
- `npm run build`: PASS (TypeScript + Vite production build).

Still unverified: C# compilation against the installed STS2 assemblies, live map accuracy, native route execution, settlement, transition recovery, and all M6 runtime exit criteria.

## 7. M7 Run Decisions

Planned after M6 passes.

Maintainer-directed source development began on 2026-09-15 while unavailable game-dependent validation remains deferred. Every planned M7 decision family now has a source path, so the overall milestone is `implemented_unverified`; the capability states below do not imply live validation.

Implementation order:

1. combat rewards;
2. card rewards and skip;
3. generic card-selection prompts;
4. events;
5. rest sites;
6. treasures;
7. shops, purchases, and card removal.

Current capability status:

| Capability | Status |
|---|---|
| Combat reward collection | `implemented_unverified` |
| Card reward choice and skip | `implemented_unverified` |
| Generic choose-a-card prompts | `implemented_unverified` |
| Deck/grid and hand multi-selection prompts | `implemented_unverified` |
| Events | `implemented_unverified` |
| Rest sites | `implemented_unverified` |
| Treasures | `implemented_unverified` |
| Shops, purchases, and card removal | `implemented_unverified` |

The first M7 source pass adds authoritative reward/button snapshots, distinct reward and card-selection modes, `choose_reward`, `choose_reward_card`, and `skip_rewards`, fresh main-thread screen/index checks, and a mouse-operated overlay renderer.

The next source pass adds `NChooseACardSelectionScreen` observation and revision-guarded `choose_card_option`. Deck/grid mutation, upgrade confirmation, hand multi-selection, and optional skipping remain deliberately unsupported until their distinct confirmation rules are modeled.

The following source pass models those distinct confirmation paths: generic grid single-click, deck selection preview confirmation, upgrade confirmation, and combat-hand multi-selection with authoritative min/max/current counts plus explicit `confirm_card_selection`. Optional skipping remains unsupported unless a native screen exposes a separately validated path.

The M7.4 source pass adds authoritative event title, description, completion state, and option snapshots; locked/proceed metadata; revision-guarded `choose_event_option`; fresh main-thread option validation; native `OptionButtonClicked`; and completed-event `Proceed` handling. Event-triggered card overlays reuse the card-selection phase.

The M7.5 source pass adds authoritative rest-option snapshots, `choose_rest_option`, `leave_rest_site`, fresh native control lookup, and overlay interaction. Smith/remove follow-up screens reuse card selection. Multiplayer player-target selection is detected but intentionally fails closed as `unsupported_state` pending stable identity research.

The M7.6 source pass adds authoritative chest/picking/leave state, relic candidates and predicted local vote, plus separate `open_treasure`, `choose_treasure_relic`, `skip_treasure_relic`, and `leave_treasure` actions. Each step settles through a distinct decision revision instead of chaining native mutations.

The final M7 source pass adds merchant inventory and affordability snapshots, explicit open/buy/remove/leave actions, non-blocking native purchase invocation, and a mouse-operated shop renderer. Card removal hands off to the existing deck-selection state machine. M7 is now `implemented_unverified`; unsupported multiplayer rest targeting and selection skipping remain explicit limitations rather than silent guesses.

Each phase follows the same delivery gate:

```text
Authoritative state reader
 -> stable protocol model
 -> validated native action path
 -> overlay renderer
 -> mouse interaction
 -> stale/error handling
 -> live runtime evidence
```

M7 exit criteria:

- each supported screen is explicitly identified;
- available choices match the game;
- selected choices execute through native paths;
- follow-up selection screens work;
- unsupported variants fail safely to the original UI;
- at least one ordinary act can be traversed using the overlay for supported decisions.

## 8. M8 Advanced Combat and Full-Run Hardening

Planned after the ordinary run-decision loop is established.

Status: `implemented_unverified` — planned safe source delivery is complete; mandatory runtime exit criteria have not passed.

Implementation checkpoint — 2026-09-15:

- potion snapshots expose stable identity, current use/discard availability, targeting requirements, and legal enemy IDs;
- the overlay supports untargeted and targeted potion use plus confirmed discard;
- dispatch revalidates the live slot and potion state on the game thread;
- card play binds hand index to native card ID, while potion use/discard bind slot index to native potion ID; replacements at the same index fail stale before mutation;
- discard uses `DiscardPotionGameAction` through the native action queue synchronizer;
- frontend protocol tests and production build pass; live STS2 behavior remains unverified.
- combat keyboard shortcuts cover cards, potion slots, legal targets, end turn, and cancellation using layout-stable `KeyboardEvent.code` values;
- controls expose matching `aria-keyshortcuts` and visible shortcut hints;
- keyboard commands now cover every currently supported combat and run-decision screen, with authoritative availability checks immediately before submission;
- browser/Tauri focus behavior and end-to-end live keyboard operation remain `implemented_unverified`.
- each submitted mutation receives a bounded client observation deadline; expiry unlocks the client but never retries a possibly executed action;
- late results from superseded request IDs are ignored while state polling continues as the recovery authority;
- reconnect discovery uses bounded 1–10 second backoff and resets after a successful connection;
- timeout/reconnect source tests pass, while scene-transition and process-restart behavior remain `implemented_unverified`.
- versioned, fail-safe local settings persist opacity, 85–140% interface scaling, high contrast, and reduced motion;
- the modal settings surface traps focus, supports Escape close, and disables underlying mutation controls while open;
- settings parsing/clamping tests and the frontend production build pass; Windows/Tauri visual behavior remains `implemented_unverified`.
- decision-surface changes receive a programmatic focus landing point without stealing focus on same-phase snapshot refreshes; settings close restores focus to its trigger, action messages use a polite atomic status region, and icon-only potion discard controls have contextual labels;
- the focus policy is unit-tested, while real Windows/Tauri focus transfer and assistive-technology announcements remain `implemented_unverified`.
- protocol ingestion validates non-negative, unique action indexes and stable identities for combat, map, reward, selection, event, rest, treasure, and shop snapshots;
- ambiguous snapshots fail closed before replacing the last accepted state, so duplicate identities cannot become actionable UI;
- malformed-identity regression tests and the frontend production build pass; live version-drift behavior remains `implemented_unverified`.
- map snapshots expose the native map-generation counter and scope every node identity to that generation;
- route requests bind generation, stable ID, and coordinates, then main-thread dispatch rechecks all three plus live reachability before enqueueing a native vote;
- first-floor, boss, cross-act regeneration, and multiplayer voting remain `implemented_unverified`.
- reward-card, generic grid/deck/hand selection, and treasure-relic actions bind their displayed indexes to native card/relic IDs and reject identity drift on the game thread;
- merchant card/relic/potion purchases bind category-local indexes to native model IDs and reject missing or changed inventory identity before purchase;
- ordinary rewards and event options use opaque, weakly held process-local tokens bound to their exact native model instances, avoiding localized-text fingerprints and rejecting replaced objects;
- rest snapshots distinguish option choice, unsupported player targeting, proceed, and intermediate resolving states; option disappearance alone is never treated as completion, while smith/remove card follow-ups remain separate card-selection decisions;
- missing-run and visible-game-over lifecycle signals require three consecutive frames before read-only menu/run-end promotion; intermediate frames and all non-input decision states remain pending, so transient scene gaps cannot complete actions or expose controls;
- protocol parsing now rejects malformed version numbers while preserving future-version envelopes long enough to report an explicit incompatibility;
- `npm run check` provides a single formatting, test, frontend-build, and release-metadata preflight, and Overlay CI runs it plus production dependency audit;
- release metadata synchronization is source-validated; native Windows bundle creation, install, upgrade, and signing remain `implemented_unverified`.
- a manual-only Windows bundle workflow produces an unsigned downloadable artifact without creating a GitHub release or publishing to Steam;
- a local PowerShell packager validates the DLL-only Mod manifest and declared dependency shape, stages a traceable Workshop candidate, and writes a SHA-256 checksum without invoking SteamCMD or a Workshop API;
- OfficeSpire currently has no third-party Mod-framework dependency, so the manifest retains `dependencies: []`; any future required framework must be declared by stable ID and minimum version rather than bundled;
- the candidate packager defaults to Mod-only, accepts an Overlay bundle only as an explicit policy-gated option, rejects reparse-point/unexpected file inputs, and embeds source commit plus per-file SHA-256 provenance in `CANDIDATE.json`;
- Windows workflow execution, PowerShell packaging, Workshop content-root/executable policy, clean subscription, install, upgrade, and signing remain `implemented_unverified`.
- absence of an authoritative run now produces a typed, read-only `menu` snapshot instead of the ambiguous `unknown` phase;
- the overlay presents explicit original-UI guidance and exposes no run-start/resume action, preventing accidental automation or replay;
- menu classification and rendering are source-tested; authoritative victory/defeat detection and all live menu/run-end behavior remain `implemented_unverified` or `not_implemented` as applicable.
- a visible native game-over overlay now gates a typed, read-only `run_end` snapshot; engine abandonment, victory-room, and recorded-win signals classify `abandoned`, `victory`, or `defeat`;
- the client accepts only those terminal outcomes and provides no automatic return-to-menu or new-run mutation;
- run-end classification, outcome accuracy, revival edge cases, and menu transition behavior remain `implemented_unverified` pending live STS2 evidence.
- game-originated presentation strings are normalized to plain text in both the Mod and Overlay boundaries: color/BBCode tags are removed, `[br]` becomes a line break, image tags become readable icon names, and unresolved template variables are suppressed;
- normalization is deliberately limited to presentation fields, so protocol values and stable identities are never rewritten; unit/build evidence exists, while live localized STS2 strings remain `implemented_unverified`.
- the presentation-text regression corpus covers nested and case-insensitive tags, explicit breaks, multiple attributed image tags, unresolved variables, malformed bracket tags, leaked bare closing color markers such as `/gold`, and Unicode text;
- a passive, cross-platform runtime-log analyzer reports revision regressions, same-revision phase changes, pending cycles, unresolved pending state, and observed phases without sending game actions;
- the documented extreme-race procedure uses exactly one deliberately stale request after a manual native state change and explicitly forbids retrying ambiguous/timed-out requests;
- analyzer tests pass, but the main-thread race/stress criterion remains `implemented_unverified` until the procedure is performed against STS2 and manually judged.
- passive evidence reports now include a SHA-256 fingerprint and observed timestamp bounds, and fail visibly on malformed state records, invalid timestamps, or time regressions instead of silently omitting suspect evidence;
- diagnostic-report traceability is source-tested; collection from supported and incompatible live builds remains `implemented_unverified`.

Scope:

- `use_potion` runtime validation;
- `potion_discard` implementation and validation;
- dedicated main-thread extreme race/stress testing;
- keyboard-first complete navigation;
- reconnect across scene transitions;
- request timeout and recovery;
- stable-ID hardening;
- settings persistence;
- accessibility and readable scaling;
- menu/run-start/run-end support where practical;
- packaging and release assets;
- protocol compatibility tests;
- repeated full-run validation.

### 8.1 Complete delivery plan

The following work packages are the authoritative path from the current branch to the v0.6 product target. A package is complete only when its source tasks are finished and each runtime requirement has its own evidence status; compilation, mocks, or the presence of UI controls never count as `runtime_pass`.

| ID | Work package | Source tasks | Required evidence / exit condition | Current status |
|---|---|---|---|---|
| M8.1 | Run-decision inventory | Audit map, rewards, selections, events, rest sites, treasure, and shop against authoritative native controls; document every unsupported variant | A version-stamped surface matrix and at least one observed transition per supported family | `implemented_unverified` — source identity audit complete; live transition matrix remains |
| M8.2 | Rest/campfire hardening | Bind actions to both option index and stable option ID; reject reordered/replaced options; retain fail-closed multiplayer target handling; enumerate option families | Ordinary choice, leave, smith/remove follow-up, unavailable option, stale option, and multiplayer-target evidence | `implemented_unverified` — source lifecycle/identity complete; native option-family evidence remains |
| M8.3 | Map hardening | Revalidate stable coordinate/ID/reachability on the game thread; audit first-floor, boss, act transition, and multiplayer vote states | Recorded legal, stale, unreachable, transition, and voting observations | `implemented_unverified` |
| M8.4 | Menu and run start | Keep no-run detection read-only; debounce transient missing-run frames; provide clear original-UI handoff; do not synthesize start/resume actions | Startup and resume handoff observations; no automatic write or replay | `implemented_unverified` (source read-only/debounce complete) |
| M8.5 | Run end | Debounce and gate terminal state on the native game-over surface; classify victory/defeat/abandonment; expose no automatic post-run mutation | Victory, defeat, abandon, revival prevention, and return-to-menu observations | `implemented_unverified` (source debounce/classification complete) |
| M8.6 | Presentation text | Normalize color/BBCode, icons, breaks, and unresolved variables without touching protocol identities; cover localized text and malformed markup | Unit corpus plus live cards, powers, intents, events, campfires, rewards, relics, potions, and non-English samples | `implemented_unverified` — source corpus complete; live localized samples remain |
| M8.7 | Combat/action safety | Validate card/potion slot identity, potion targeting/discard, pending settlement, revision races, timeouts, reconnect, and never-replay semantics | Recorded targeted/untargeted potion and one-shot stale-window probes with manual judgment | `implemented_unverified` — source identity/recovery paths complete; runtime probes remain |
| M8.8 | Keyboard/accessibility | Complete keyboard paths, focus management, readable scaling, contrast, reduced motion, and screen-reader labels | Windows/Tauri keyboard-only and assistive-technology checklist | `implemented_unverified` — source focus/announcement paths complete; native checklist remains |
| M8.9 | Compatibility and diagnostics | Maintain protocol/release metadata checks, passive runtime analyzer, actionable logs, and fail-closed version drift | Supported and incompatible-version observations with traceable logs | `implemented_unverified` — source traceability/integrity checks complete; live observations remain |
| M8.10 | Workshop candidate | Keep manifest/dependencies explicit, build an unsigned traceable candidate, document framework coexistence, install/upgrade/uninstall, and policy checks; never publish automatically | Windows artifact/checksum plus private manual subscription lifecycle and current Steam policy review | `implemented_unverified` — source packaging/provenance boundary complete; Windows/Steam lifecycle remains |
| M8.11 | Full-run qualification | Execute repeated supported runs spanning all implemented surfaces and collect exact game/mod/app versions | Completed evidence matrix with no silent unsupported transitions or replayed writes | `blocked` — qualification matrix exists; Windows/STS2 runtime is unavailable |

Execution rules:

1. Prefer source tasks that improve stable identity, fail-closed behavior, or observability without requiring speculative native calls.
2. Never add an action solely because a similarly named native control exists; determine its settlement and replay semantics first.
3. Keep multiplayer or version-specific states visible and non-actionable until stable player/control identities are available.
4. Record unavailable STS2, .NET, Windows, Tauri, and Steam checks as `implemented_unverified`, never as passes.
5. Commit each independently reviewable slice to `codex/m6-map-controller`; do not modify `main` and do not publish a Workshop item.
6. Finish M8 only after all safe source work above is complete and every remaining external gate is explicitly recorded. Then runtime validation may promote capabilities individually.

M8 source-coverage audit — corrected 2026-09-15:

| M8 area | Source status | Remaining evidence gate |
|---|---|---|
| Potion use/discard | `implemented_unverified` | Live targeted/untargeted use, discard, settlement, and stale rejection |
| Main-thread race safety | `implemented_unverified` | One-shot stale-window probe and passive analyzer evidence in STS2 |
| Keyboard/accessibility/settings | `implemented_unverified` | Windows/Tauri focus, scaling, contrast, reduced-motion, and assistive-technology checks |
| Timeout/reconnect/recovery | `implemented_unverified` | Backend restart, scene transition, delayed result, and no-replay observations |
| Stable identity/protocol compatibility | `implemented_unverified` | Live malformed/version-drift behavior against supported game builds |
| Menu/run end | `implemented_unverified` | Startup, resume, victory, defeat, abandon, revival edge, and return-to-menu observations |
| Rich/localized text display | `implemented_unverified` | Live cards, powers, intents, events, rest sites, rewards, relics, potions, and non-English strings |
| Windows/Workshop packaging | `implemented_unverified` | Native bundle, signing decision, candidate script, clean install/upgrade/uninstall, and Workshop policy check |
| Repeated supported full run | `blocked` | Windows/STS2 environment and recorded full-run matrix with exact commits and artifacts |

Run-start automation is intentionally not exposed: OfficeSpire remains an explicit control surface, and starting/resuming a run stays in the original STS2 UI. This is a product safety boundary, not an unfinished mutation path.

Run-decision coverage must not be described as uniformly complete. The current source boundary is:

| Surface | Source behavior | Known gap |
|---|---|---|
| Map | Shows the current node, reachable choices, and route graph; submits a revision-, generation-, identity-, and reachability-checked native route vote | First-floor, boss, cross-act regeneration, and multiplayer voting are `implemented_unverified` |
| Rest/campfire | Shows native options, chooses ordinary options, leaves, and hands smith/remove follow-ups to card selection | Multiplayer player-target selection is `not_implemented`; version-specific option families need live enumeration |
| Menu | Reports a read-only no-active-run state and directs the user to STS2 | Menu navigation and start/resume mutations are intentionally not exposed |
| Run end | Reports a visible native game-over screen as victory, defeat, or abandonment | Revival/death-prevention edges and transitions are `implemented_unverified`; no post-run mutation is exposed |

Exit criteria:

- normal supported runs can be operated primarily through OfficeSpire;
- recovery from disconnects and rejected actions is predictable;
- unsupported states never silently advance or corrupt a run;
- package/install/upgrade instructions are verified;
- a release artifact is traceable to a tested commit.

## 9. Version path

| Version | Name | Meaning | Status |
|---|---|---|---|
| v0.6-alpha.1 | Playable Backend | M1–M4 core chain validated | `runtime_pass` |
| v0.6-alpha.2 | Overlay Prototype | Live translucent mouse-operated combat overlay | `implemented_unverified` |
| v0.6-alpha.3 | Map Controller | Map display and native route selection | `implemented_unverified` |
| v0.6-alpha.4 | Run Decisions | Rewards, selections, events, rest, treasure, shops | `implemented_unverified` |
| v0.6-beta.1 | Full Run Hardening | Advanced combat, keyboard, recovery, packaging | `implemented_unverified` (safe source delivery complete) |
| v0.6 | Initial Product Target | Documented, tested supported full-run control surface | `not_implemented` |

Version numbers may be adjusted before release, but milestone scope and evidence gates must be updated here first.

## 10. Immediate execution order

Continue the remaining safe source audit, then use the external runtime in this order:

1. build the Mod against the installed supported STS2 assemblies;
2. run the manual Windows bundle workflow and PowerShell candidate packager;
3. validate the Tauri shell, session discovery, focus, settings, and reconnect behavior;
4. execute potion and one-shot main-thread stale-window probes without replay;
5. validate map/rest/menu/run-end and death-prevention edges;
6. complete [M8_QUALIFICATION_MATRIX.md](M8_QUALIFICATION_MATRIX.md), including repeated supported full runs and clean install/upgrade/uninstall checks;
7. confirm current STS2 Workshop content policy and test a private candidate manually;
8. promote only individually evidenced capabilities to `runtime_pass`.

## 11. Documentation ownership

- **This file** — milestone status, current priority, future development scope, execution order, exit criteria.
- **[RUNTIME_VALIDATION.md](RUNTIME_VALIDATION.md)** — commands, environment, observations, PASS/FAIL evidence, known runtime limitations.
- **[M8_RUNTIME_PROBES.md](M8_RUNTIME_PROBES.md)** — safe, non-replaying procedures and evidence requirements for M8 runtime validation.
- **[M8_QUALIFICATION_MATRIX.md](M8_QUALIFICATION_MATRIX.md)** — complete M8.11 full-run, accessibility, compatibility, and packaging evidence matrix.
- **[PROTOCOL.md](PROTOCOL.md)** — wire schema and protocol invariants.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — component boundaries and design rationale.
- **[UPSTREAM_REFERENCES.md](UPSTREAM_REFERENCES.md)** — third-party research, commits, licenses, and reuse decisions.
- **[../PROJECT_PLAN.md](../PROJECT_PLAN.md)** — stable product scope and engineering principles; it must not duplicate mutable milestone status.
- **[../README.md](../README.md)** — concise public summary linked to this roadmap.

When development evidence changes, update the runtime evidence first, then update this roadmap's status table and README in the same delivery.
