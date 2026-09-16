# M9 Source Audit and Qualification Boundary

Audit date: 2026-09-16  
Scope: M9.1–M9.11 on `codex/m6-map-controller`  
Verdict: **source delivery complete; runtime qualification blocked**

This document is the authoritative M9.11 source audit. `source_pass` means the repository contains the checked invariant and its available static tests pass. It never means that STS2, Windows, Tauri, multiplayer or Steam behavior has run successfully.

## Reproducible source checks

From `src/OfficeSpire.Overlay` run:

```bash
npm run audit:m9
npm run check
npm audit --omit=dev
```

The M9 audit fails if a documented phase/action disappears from the backend, frontend or final interface matrix; if unknown actions cease to fail closed; if either expected-revision gate disappears; if reward ownership leaves semantic settlement identity; or if protocol, product identity and compatibility-line metadata drift.

## Audit matrix

| Area | Source evidence | Static verdict | Runtime verdict |
|---|---|---|---|
| M9.1 interface inventory | `M9_INTERFACE_MATRIX.md`; automated 12-phase/27-action parity audit | `source_pass` | installed-version observations `blocked` |
| M9.2 player/run HUD | typed DTOs, strict ingestion, combat/run/party panels, exact deck and piles | `source_pass` | five-character native comparison `implemented_unverified` |
| M9.3 menu/save | typed main/profile/continue surfaces; destructive/unknown choices excluded | `source_pass` | cold start/save/resume paths `implemented_unverified` |
| M9.4 mode/setup | Standard/Custom/Daily, ascension, seed and visible modifier inventory | `source_pass` | native validation/rejection paths `implemented_unverified` |
| M9.5 character/lobby | native character/player IDs, readiness, launch settlement observation | `source_pass` | all characters and party sizes `implemented_unverified` |
| M9.6 multiplayer | party roster, discovery/load, votes, rest progress, combat/reward ownership | `source_pass` with explicit native handoffs | 2–4-machine/rejoin/disconnect `implemented_unverified`; host migration unsupported |
| M9.7 Run decisions | map/combat/reward/selection/event/special/rest/treasure/shop typed surfaces | `source_pass` for matrix allowlist | legal/stale observation per family `implemented_unverified` |
| M9.8 settlement | native game-over detection, typed summary/unlocks, summary/menu controls | `source_pass` | victory/defeat/abandon/revival `implemented_unverified` |
| M9.9 privacy | authenticated PID/executable scope, Win32 shortcut, reversible tracked handles | `source_pass` | Windows/fullscreen/crash recovery `implemented_unverified` |
| M9.10 accessibility/recovery | full shortcut mapping, focus-key policy, accessible notices, timeout/no-replay | `source_pass` | keyboard-only/screen-reader/disconnect pass `implemented_unverified` |
| Protocol safety | exact v1, unique request, action pending, two revision checks, main-thread dispatch | `source_pass`; unknown actions now explicitly rejected | M9 race/settlement behavior `implemented_unverified` |
| Rich text/localization | Mod and Overlay normalization plus multilingual/malformed-tag tests | `source_pass` | live locale samples `implemented_unverified` |
| Diagnostics | passive log hash/timestamp/revision/pending anomaly analyzer | `source_pass` | real-log qualification `implemented_unverified` |
| Compatibility | stable Mod/Tauri IDs, matching version line, explicit empty dependency array | `source_pass` | supported/incompatible game/framework coexistence `blocked` |
| Workshop candidate | whitelist, provenance, SHA-256, verifier, no publication API | `source_pass` | PowerShell package and private Workshop lifecycle `blocked` |
| Documentation consistency | roadmap, protocol, final interface matrix, audit and README boundaries | `source_pass` | release notes/policy confirmation pending |

## Safety findings closed during final audit

1. The phase gate previously defaulted any unrecognized action name to the combat phase. The adapter still rejected it later, but the outer boundary was not a strict allowlist. It now names the four combat actions explicitly and rejects every unknown action before queueing.
2. Reward owner identity is now included in the semantic decision fingerprint, so an owner change cannot retain the previous decision revision.
3. Public README claims that menu/start and run-end were read-only and that treasure had a skip path were stale. They have been replaced with the actual M9 boundaries.
4. The new audit is part of `npm run check`, preventing phase/action/documentation drift from silently passing release checks.

## External qualification still required

Use exact commit and artifact hashes and record results in `RUNTIME_VALIDATION.md`:

1. compile the Mod against installed STS2 `0.107.1` or the newly selected supported build;
2. build and run the Windows/Tauri bundle, including privacy shortcut recovery;
3. execute a keyboard-only, screen-reader and scaling pass across every actionable phase;
4. run legal and stale/replaced-identity cases for every mutation family without replaying ambiguous writes;
5. complete solo runs for victory and non-victory outcomes and multiplayer runs with 2–4 machines, disconnect/rejoin and simultaneous decisions;
6. test supported and deliberately incompatible protocol/game/Mod combinations and common optional Mod-framework coexistence;
7. run the PowerShell candidate packager, verify hashes, then manually test clean private install/update/uninstall under current Workshop policy without publishing publicly.

M9.11 remains `blocked` for runtime qualification until those observations exist. No source audit, test double, compilation or package artifact may promote a row to `runtime_pass`.

