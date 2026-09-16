# M9 Run Decision Matrix

Inventory date: 2026-09-16  
OfficeSpire source branch: `codex/m6-map-controller`  
Native reference: `zhiyue/sts2-rl-agent@1b7e7ce35e608722650763938c153ea8bc370333`

This matrix records source coverage, not runtime qualification. `implemented_unverified` means the typed state/action path exists but has not run against the current installed STS2 assemblies. Read-only fallbacks are intentional safety behavior, not full operation coverage.

| Family | Native state/control | Stable identity | Supported mutation | Settlement signal | Source status |
|---|---|---|---|---|---|
| Map | generated map + reachable native points | generation + column + row | choose reachable node | newer settled map/room revision | `implemented_unverified` |
| Combat | player combat state, hand, targets, queues | card ID + hand index; combat target ID | card, potion, discard, end turn | queue/pending cycle and newer settled revision | `implemented_unverified` |
| Rewards | reward screen/buttons | native reward token; card ID + index | claim, choose card, skip when native proceed exists | reward inventory change/phase change | `implemented_unverified` |
| Card/grid | choose-card, deck-card, deck-upgrade, hand selection | card ID + current index | toggle/choose plus audited confirmation | selection count/preview/phase change | `implemented_unverified`; other subclasses fail closed |
| Ordinary event | `EventModel.CurrentOptions` | native option token + index | choose or completed-event proceed | authoritative option/state replacement | `implemented_unverified` |
| Rest/campfire | local options + per-player synchronizer state | native option ID + index | choose and leave | option removal/target phase/room exit | `implemented_unverified` |
| Treasure | chest, relic synchronizer, native proceed | relic ID + index | open, vote, leave | collection/vote/award/proceed state | `implemented_unverified` |
| Shop | merchant inventory and entries | category + index + item ID | open, purchase, removal request, leave | stock/gold/selection/room transition | `implemented_unverified` |
| Crystal Sphere | custom overlay, entity, tool buttons, hidden cells | `crystal-cell-{x}-{y}` | select tool, reveal cell, proceed | tool/count/grid/proceed change | `implemented_unverified` |
| Fake Merchant | custom event layout | no audited complete item/action identity yet | none; original-UI handoff | not modeled | read-only fail closed |
| Ancient dialogue | custom pre-option layout | no audited dialogue-step identity | none; original-UI handoff | final line hands off to ordinary authoritative options | read-only fail closed before options |
| Unknown custom event | unrecognized native custom surface | none | none | none | fail closed |

Required runtime evidence for every mutation-enabled row:

1. one legal action with initial revision, request ID, pending cycle and authoritative settled result;
2. one stale, disabled, replaced-identity or otherwise rejected action proving no mutation occurred;
3. solo coverage and multiplayer coverage wherever the native family is shared;
4. current STS2 version, current Mod commit, Windows/Tauri versions, logs and visible game result.

Crystal Sphere additionally requires paid and curse entry routes, small and big tools, overlapping/edge cells, final proceed and reconnect/timeout observations. Fake Merchant and ancient dialogue cannot move beyond read-only fallback until their full identity, action, cost/target, cancellation and settlement contracts are verified against installed assemblies.
