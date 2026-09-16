# M9 Final Interface Matrix

Inventory date: 2026-09-16  
Source branch: `codex/m6-map-controller`  
Target manifest: OfficeSpire `0.6.0`, minimum STS2 `0.107.1`  
Wire protocol: `1`  
Primary pinned research inputs: `STS2MCP@55e064850a68f3b4cde7e5fd525bf9b2dec4e885` and `zhiyue/sts2-rl-agent@1b7e7ce35e608722650763938c153ea8bc370333`

This is the authoritative M9.1 source inventory. It records what the current adapter actually detects and dispatches. It is not installed-assembly or runtime evidence. Every mutation-enabled row remains `implemented_unverified` until the matching native build has been compiled and observed.

## Transport and compatibility interfaces

| Boundary | Concrete interface | Identity/version rule | Failure behavior | Source status |
|---|---|---|---|---|
| Session discovery | authenticated local session descriptor | protocol, random token, loopback port, STS2 PID, creation time | malformed, stale or wrong-version descriptors are rejected | implemented, runtime baseline exists only for M1–M4 |
| WebSocket | `ping`, `get_state`, `action`, `get_action_result` | protocol v1 envelope; bearer token; bounded messages | unknown messages and invalid authentication fail closed | implemented; later-phase use unverified |
| State | `StateEnvelope` | semantic `state_revision`, exact phase, `action_pending` | invalid frontend snapshot does not replace last accepted state | implemented_unverified for M9 shapes |
| Action | `ActionRequest` / `ActionResponse` | unique request ID, exact expected revision, phase allowlist | duplicate, stale, wrong-phase and unknown actions are rejected | implemented_unverified for M9 actions |
| Main-thread bridge | `ActionInbox` -> `IGameAdapter.Dispatch` | second revision/phase check on the game thread | no automatic replay after timeout, disconnect or ambiguous result | implemented; M9 runtime unverified |
| Release identity | Mod ID `OfficeSpire`; Tauri ID `com.officespire.overlay` | Mod/Overlay share compatibility line `0.6`; declared dependency array | release preflight rejects identity/version drift | source_pass |

## Phase and native-interface inventory

| Phase/surface | Native screen/model or control | State contract | Supported actions | Stable action identity | Authoritative settlement | Multiplayer distinction | Safe fallback | Source status |
|---|---|---|---|---|---|---|---|---|
| `menu`: main | `NMainMenu` visible native buttons | semantic options and enabled/actionable flags | `choose_menu_option` for continue, profiles, single player, multiplayer | menu screen + semantic option ID | visible native screen changes after a stable-frame window | same entry exposes multiplayer submenu | quit, compendium, timeline, settings and abandon remain native-only | `implemented_unverified` |
| `menu`: profile | `NProfileScreen`, profile buttons, current profile | stable profile IDs and current profile | `choose_menu_option` for existing profiles/back | `profile_{native id}` | active native screen/profile changes | not applicable | create/rename/delete/overwrite stays native-only | `implemented_unverified` |
| `menu`: mode | `NSingleplayerSubmenu`, `NMultiplayerSubmenu`, `NMultiplayerHostSubmenu` | Standard/Daily/Custom and host/join/load availability | `choose_menu_option` | menu screen + semantic option ID | next typed menu surface | clients never receive guessed host identity | invite and abandon-save confirmations remain native handoff | `implemented_unverified` |
| `menu`: discovery/load | `NJoinFriendScreen`, `NMultiplayerLoadGameScreen`, `NErrorPopup` | sessions, connection progress, saved-run player roster, readable error | `choose_menu_option` for refresh/session/load controls that have audited identities | platform player/session ID or semantic control ID | next native screen or changed connection/load state | complete connected/missing roster; no remote impersonation | reconnect initiation, continue-without-peer and generic error actions remain native-only | `implemented_unverified` |
| `menu`: character/setup/lobby | `NCharacterSelectScreen`, `NCustomRunScreen`, `NDailyRunScreen`, `StartRunLobby`, `LobbyPlayer` | character details, mode, ascension, seed, modifiers, lobby role/roster/readiness | `choose_menu_option`, `set_run_ascension`, `set_custom_seed` | native character/player ID plus current menu screen | native lobby/setup changes or typed Run phase | local/remote player identity and readiness separated | custom modifier editing and invite dialog remain native-only | `implemented_unverified` |
| `combat` | `CombatManager`, local `PlayerCombatState`, hand, enemies, action queues | full player/run HUD, hand, enemies, targets, piles, powers, relics, potions, character resources, participants | `play_card`, `end_turn`, `use_potion`, `discard_potion` | hand/slot index + native card/potion ID; combat target ID | pending cycle followed by newer stable semantic revision | only authenticated local participant may submit; remote queues are read-only | non-play phase, missing target and ownership drift reject | `implemented_unverified` beyond validated M4 card/end-turn core |
| `map` | `NMapScreen`, generated map, reachable `MapPoint`, map synchronizer | generation, current/reachable/all nodes, votes | `choose_map_node` | generation + coordinate + generation-scoped stable ID | room/map change after native vote/selection | complete vote set by native player ID | stale generation and unreachable node reject | `implemented_unverified` |
| `rewards` | `NRewardsScreen`, `NRewardButton`, `NCardRewardSelectionScreen`, `NProceedButton` | local owner ID, reward items/cards, skip availability | `choose_reward`, `choose_reward_card`, `skip_rewards` | owner ID; native action token or card ID + index | inventory, phase or owner-bound decision changes | owner must equal authenticated local player | remote reward inventories are never inferred | `implemented_unverified` |
| `card_selection` | `NChooseACardSelectionScreen`, audited deck/upgrade grids, combat hand selection | semantic subtype, constraints, options, count, confirmation | `choose_card_option`, `confirm_card_selection` | current index + native card ID + semantic subtype | preview/count/phase transition | local action surface only | transform/enchant/unknown grid subclasses expose required native-UI reason | `implemented_unverified` |
| `event` | `NEventRoom`, `EventModel.CurrentOptions` | text, locked/proceed options and shared votes | `choose_event_option` | option index + process-local native action token | authoritative option/model/phase replacement | shared vote set keyed by player ID | missing/locked/replaced options reject | `implemented_unverified` |
| `special_event`: Crystal Sphere | `NCrystalSphereScreen`, native entity, tool buttons and hidden cells | selected tool, actions remaining, coordinate cells, proceed | `choose_special_event_cell`, `select_special_event_tool`, `proceed_special_event` | tool enum or `crystal-cell-{x}-{y}` | tool/count/grid/proceed state changes | no remote acting-player parameter | disabled/revealed/replaced cell rejects | `implemented_unverified` |
| `special_event`: custom fallback | Fake Merchant, ancient dialogue, unknown custom native layout | native type, readable message, non-actionable reason | none | none | none modeled | no multiplayer assumption | explicit original-UI handoff | read-only fail closed |
| `rest` | `NRestSiteRoom`, rest options, `RestSiteSynchronizer` | local options, interaction state, target-pending flag, per-player progress | `choose_rest_option`, `leave_rest_site` | native option ID + current index | option removal, target/selection phase or room exit | per-player records are read-only; local options alone mutate | teammate target picker and unmodeled option families remain native handoff | `implemented_unverified` |
| `treasure` | treasure room/chest, relic synchronizer, native proceed | unopened/resolving/voting/leave lifecycle, relics and votes | `open_treasure`, `choose_treasure_relic`, `leave_treasure` | relic ID + current index; complete vote identity | chest/relic/vote/proceed state | local vote only; complete player vote set | no fabricated skip/decline action | `implemented_unverified` |
| `shop` | merchant room, inventory entries, removal control, proceed | stock, category, price, gold, removal availability | `open_shop`, `buy_shop_item`, `request_card_removal`, `leave_shop` | category + current index + native item ID | stock/gold/selection/room change | local inventory and gold only | insufficient gold, replaced stock and unavailable removal reject | `implemented_unverified` |
| `run_end` | visible `NGameOverScreen`, engine outcome/unlock/discovery state | victory/defeat/abandon, settling/outcome/summary, score and unlocks | `advance_run_end` | explicit target `summary` or `main_menu` + stage | native summary stage or typed `menu` state | no synthetic team result beyond native outcome | no replay, auto-start or leaderboard mutation | `implemented_unverified` |
| `unknown` | unclassified/loading/version-drifted native state | non-actionable reason or adapter error | none | none | a later typed stable state | none assumed | all actions rejected; original UI remains authoritative | fail closed |

## Cross-phase information contract

Every active Run snapshot carries ascension, act/floor, gold, relics, character identity, exact deck and optional party roster. Combat additionally carries current HP/block/energy, powers, potion capacity and targetability, exact draw/discard/exhaust contents, Regent stars, Defect orbs and Necrobinder's real companion state. Presentation text is normalized separately from IDs and action tokens.

## Deliberately unsupported or externally blocked boundaries

- Host migration is not exposed by the inspected native contract.
- Generic popup confirmation, destructive save abandonment, quit and unknown warning acceptance are not inferred from localized text.
- Custom modifier editing, teammate rest-target selection, remote reward inventory and unknown grid/custom-event mutation remain native-UI handoffs.
- Windows privacy-hotkey behavior, Tauri accessibility, installed-assembly compilation, current Workshop policy and all 2–4-machine behavior require external evidence.
- An item in this matrix can become `runtime_pass` only through the evidence procedure in `M9_SOURCE_AUDIT.md` and `RUNTIME_VALIDATION.md`.

