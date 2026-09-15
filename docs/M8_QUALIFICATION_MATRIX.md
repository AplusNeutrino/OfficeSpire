# M8 Full-Run Qualification Matrix

Status: `blocked` — requires a Windows machine with the supported STS2 build, current game assemblies, Tauri/WebView runtime, and (for packaging checks) Steam client access.

This matrix is the authoritative M8.11 runtime checklist. Source tests, compilation, mocks, and a generated package do not satisfy any row. Record exact observations and artifact links in `RUNTIME_VALIDATION.md`; never rerun an action whose outcome is unknown.

## Evidence identity

Record once per run:

- date/time and tester;
- OfficeSpire commit, Mod version, Overlay version, protocol version;
- STS2 version/game commit and installed Mod list with versions;
- Windows version, Tauri/WebView version, display scaling;
- Mod DLL SHA-256, Overlay artifact SHA-256, and candidate `CANDIDATE.json`;
- runtime log SHA-256 and passive analyzer report.

## Required run matrix

Use `not_run`, `runtime_pass`, `runtime_fail`, or `blocked` in the Status column. A row passes only when Expected and Observed are both recorded.

| Area | Probe | Expected | Status | Evidence |
|---|---|---|---|---|
| Startup | Cold launch to menu, then native start/resume | Read-only handoff; no synthesized run mutation | `not_run` | |
| Combat | Targeted and untargeted card play | Correct native card/target; settled revision advances | `not_run` | |
| Combat | Targeted and untargeted potion use | Correct native potion/target; no slot drift | `not_run` | |
| Combat | Confirmed potion discard | Exact potion removed once | `not_run` | |
| Combat | End turn and action pending | Conflicting writes disabled until settlement | `not_run` | |
| Safety | One deliberately stale action after manual native state change | Rejected once as stale; no retry/replay | `not_run` | |
| Recovery | Timeout, scene transition, backend restart, reconnect | State polling recovers; ambiguous write is never replayed | `not_run` | |
| Map | Act entrance, ordinary node, boss, cross-act map | Correct generation/identity/reachability | `not_run` | |
| Map | Multiplayer voting | Accurate vote state or explicit safe unsupported handoff | `not_run` | |
| Rewards | Ordinary reward, card reward, skip/continue | Exact current native choice executes once | `not_run` | |
| Selection | Upgrade, remove, grid/deck, hand multi-select | Correct option and confirmation lifecycle | `not_run` | |
| Event | Available, locked, proceed, changed option | Locked/stale choices fail closed | `not_run` | |
| Rest | Ordinary choices and leave | Exact option identity and settlement | `not_run` | |
| Rest | Smith/remove follow-up | Transfers to correct card-selection lifecycle | `not_run` | |
| Rest | Multiplayer player target | Explicit original-UI handoff; no guessed mutation | `not_run` | |
| Treasure | Open, choose relic, skip, leave | Correct native lifecycle and identity | `not_run` | |
| Shop | Open, buy each category, remove, leave | Stock/identity/gold revalidated before mutation | `not_run` | |
| Text | Cards, powers, intents, events, rest, rewards, relics, potions | No leaked markup; icons/breaks remain readable | `not_run` | |
| Text | At least one non-English locale | Unicode preserved; no identity changes | `not_run` | |
| Keyboard | Complete supported run without mouse where practical | Stable shortcuts, visible focus, predictable phase focus | `not_run` | |
| Accessibility | 85%/100%/140%, contrast, reduced motion, screen reader | Content remains operable and announcements are meaningful | `not_run` | |
| Run end | Victory, defeat, abandon, death-prevention edge, menu return | Outcome only on native game-over surface; no post-run mutation | `not_run` | |
| Compatibility | Supported protocol and deliberately incompatible version | Supported connects; incompatible fails closed with clear message | `not_run` | |
| Packaging | Mod-only candidate hash/install/upgrade/uninstall | Traceable files; no undeclared dependency or residue | `not_run` | |
| Workshop | Private/hidden subscription lifecycle | Current policy obeyed; no automatic publication | `not_run` | |

## Completion rule

Run at least three supported full runs covering all ordinary decision families, with at least one victory and one non-victory terminal path. There must be no silent unsupported transition, duplicate mutation, unresolved pending state, revision regression, malformed diagnostic record, or replay of a timed-out/unknown write. Any failure remains recorded until a later, separately identified regression run passes.

M8.11 remains `blocked` until this matrix contains qualifying runtime evidence. Multiplayer rest targeting may remain `not_implemented` only if the overlay gives an explicit safe handoff and the limitation is retained in release notes.
