# OfficeSpire protocol v1

Protocol version: `1`

The protocol is the stable boundary between the STS2 mod and the future desktop overlay. It must not expose `MegaCrit.Sts2.*`, Godot, or Harmony types.

## Session discovery

On startup the mod binds a WebSocket listener to **127.0.0.1 on a random ephemeral port** and writes:

```text
%APPDATA%/SlayTheSpire2/OfficeSpire/session.json
```

The overlay connects to:

```text
ws://127.0.0.1:<port>/officespire?token=<token>
```

The token is intentionally not printed to normal logs.

## Wire envelope

All WebSocket text messages use:

```json
{
  "type": "state",
  "protocol_version": 1,
  "body": {}
}
```

Server message types:

- `hello`
- `state`
- `pong`
- `action_result`
- `error`

Client message types:

- `ping`
- `get_state`
- `action`
- `get_action_result`

Inbound messages are capped at 64 KiB. Outbound messages are capped at 1 MiB.

## State envelope

```json
{
  "protocol_version": 1,
  "state_revision": 1831,
  "phase": "combat",
  "action_pending": false,
  "run": {},
  "screen": {}
}
```

`state_revision` is a monotonic **decision revision**, not a rendering revision. Rich/localized presentation text can update without minting a revision. On the validated M3 adapter, combat revision promotion requires an actionable/idle engine state plus a stable semantic snapshot.

Clients must reject an entire snapshot when actionable identities are ambiguous. Protocol-v1 Overlay validation requires non-negative unique combat IDs, hand/potion indexes and choice indexes; unique map coordinates and stable IDs within each route collection; unique shop category/index pairs; and non-empty unique enemy stable IDs. A rejected snapshot must not replace the last accepted state or enable a mutation.

Envelope parsing and compatibility negotiation are separate. A positive-integer future protocol version is structurally parseable so the client can present an explicit incompatibility state, but only exact version `1` is accepted for session connection or message processing. Fractional, zero, negative, missing, or otherwise malformed versions are rejected as invalid envelopes.

`action_pending=true` means conflicting mutation requests should not be sent. It is true while either the game itself is settling or OfficeSpire has a queued/accepted action waiting to reach the next authoritative decision boundary.

Known phase names:

- `unknown`
- `combat`
- `card_selection`
- `map`
- `rewards`
- `shop`
- `event`
- `special_event`
- `rest`
- `treasure`
- `menu`
- `run_end`

When no authoritative run state exists, the backend reports `phase="menu"` with a typed menu screen. `menu_screen` is `main`, `singleplayer`, `multiplayer`, `multiplayer_host`, `multiplayer_join`, `multiplayer_load`, `profile_select`, `character_select`, `custom_run`, `daily_run`, `popup`, `error_popup`, or the fail-safe `unknown`. Every option has a stable semantic ID, readable label, native availability and an explicit `actionable` bit. `waiting_for_input` and `can_mutate` are true only when at least one allowlisted native control is actionable, or when the current host/single-player setup permits ascension/seed mutation. Unknown, destructive and unclassified confirmation controls remain visible but non-actionable.

The menu inventory is version-sensitive. `choose_menu_option` carries both `menu_screen` and `option_id`; the game thread resolves the current native screen again and clicks only the allowlisted enabled control with that identity. Profiles use `profile_<native id>`, join sessions use `friend_<native id>`, and characters use their native model ID. `set_run_ascension` is host/single-player only and bounded by the native maximum. `set_custom_seed` is custom-run only, host/single-player only, nullable, length bounded and rejects control characters. All three actions require the current revision and settle only after an authoritative fingerprint change. Private fields that disappear under version drift therefore remove the capability rather than falling back to coordinates or localized text.

The same setup screens may carry `lobby` after the native roster is initialized. It contains the local service role, nullable maximum capacity, stable local player ID, `all_ready`, and a unique player inventory. Character and Ready/Unready options invoke the native menu callbacks; STS2 remains authoritative for the all-ready launch transition. Host attribution is boolean only when the local service is the host; clients receive `null` where the native contract does not establish it. A generic `popup` and `error_popup` remain read-only because presentation text is not a stable reason code. Quit, abandon-save, invite, unknown confirmations and custom-modifier editing are also deliberately excluded from the allowlist.

`multiplayer_host`, `multiplayer_join` and `multiplayer_load` may carry read-only `connection` state. `status` is an observed lifecycle label, `connected_players` is never negative, and `required_players` is nullable when the native screen does not disclose a capacity. Join discovery supplies a unique `sessions` inventory keyed by native platform player ID; the corresponding `friend_<id>` menu option is still informational and cannot initiate a connection. Load-lobby counts describe the saved multiplayer roster only and do not authorize loading with missing players. Clients must not infer connection success from a loading overlay disappearing; settlement requires the subsequent authoritative setup/load screen.

An initialized `multiplayer_load` screen may additionally carry `saved_run`: native game mode, ascension, one-based current act, visited-floor count, missing-player count and the complete saved player inventory. Each saved player is keyed by native network ID and includes character ID, HP, maximum energy, potion capacity, gold and current connection presence. `missing_players` must exactly equal the disconnected inventory count. This is warning context only; OfficeSpire cannot confirm loading without missing players, reconnect a peer or begin the run.

During a multiplayer run, `run.party` reports the local network role and ID plus every native run player. Members carry stable network/character identity, local ownership, live connection presence, HP/block/alive state, gold, energy and potion occupancy/capacity. The connected total must exactly match the member flags, identities must be unique, and exactly one member must match `local_player_id`. This state follows `RunLobby.ConnectedPlayerIds`; it does not initiate a rejoin. The inspected native contract accepts rejoin only for an existing run player and treats host abandonment as run abandonment, so OfficeSpire does not promise host migration.

A missing run and a visible game-over overlay must remain continuously observable for three capture frames before promotion to `menu` or `run_end`. Earlier frames use non-actionable `phase="unknown"` with `action_pending=true`. This transition state cannot complete an accepted mutation or expose lifecycle controls.

`phase="run_end"` is emitted only while the native `NGameOverScreen` is the visible overlay. `status` is `victory`, `defeat`, or `abandoned`; the Mod uses the engine's abandonment flag, victory-room signal, and recorded win time. The screen also reports `stage` (`settling`, `outcome`, or `summary`), score, floors climbed, unlock progress, unlocked Epoch identity, discovery counts, and mutually staged `can_view_summary`/`can_return_to_menu` capabilities.

`advance_run_end` accepts only `target="summary"` or `target="main_menu"`. It requires the current revision, a still-visible `NGameOverScreen`, and the corresponding enabled native Continue/Main Menu button. Opening the summary does not itself claim the run is settled; returning completes only when the game exposes a subsequent authoritative menu snapshot. OfficeSpire never starts another run, skips native unlock processing, submits leaderboard state, or replays either action after an uncertain result.

All user-facing presentation strings are plain text. The Mod removes game rich-text/color tags (including malformed or leaked `/gold`-style closers), converts explicit breaks and icon markup to readable text, and suppresses unresolved template variables while preserving Unicode. Clients must repeat this normalization defensively only for presentation fields; they must never normalize action names, IDs, stable identities, phase values, tokens, or other protocol semantics.

The privacy shortcut is deliberately outside the game-action protocol. The Tauri shell accepts only its stored enable/Overlay-hide preferences and derives the target exclusively from the authenticated session descriptor. It does not accept a caller-provided PID, HWND, process name or window title, and toggling visibility never changes revision, queues an action, or participates in action retry.

For `phase="combat"`, `run.character_id` and `run.character_name` identify the local player's native character model. `screen.player` contains current/max HP, block, and the complete native player power list (`name`, `amount`, `description`). `screen.energy` and `screen.max_energy` remain combat-level fields. `screen.stars` is the Regent counter when applicable, otherwise `null`. `screen.orb_capacity` plus `screen.orbs` describe the Defect queue; each orb carries native identity, name, description, passive value and evoke value. `screen.companions` contains only entities with authoritative combat state, currently Osty for Necrobinder, including HP/block/alive state and powers. Cosmetic pets are not fabricated as combat entities.

`screen.combat_phase` reports the native action synchronizer phase and `action_queues_empty` reports whether every player-owned action queue is settled. `participants` contains exactly one entry per run player, keyed by stable network ID, with that player's native turn phase and queue-paused state. `can_submit_actions` may be true only for the local player and must equal the top-level `waiting_for_input`; a remote player's simultaneous play phase never enables local controls or authorizes an action on their behalf.

`screen.potion_capacity` is the native slot count, while `screen.potions` contains occupied slots with their original slot indexes, identities, target rules, and availability. Empty slots are therefore represented by capacity minus occupied entries rather than fabricated potion objects. `run.relics` contains each native relic's ID, name, description, and stack count. These presentation additions do not mint a decision revision by themselves and do not change action identity.

`run.deck_cards` lists every authoritative run-deck card separately, retaining its deck index, native ID, upgrade state, type, rarity and description. It deliberately does not merge cards solely by ID because upgraded and base copies may differ. `screen.piles.draw_cards`, `discard_cards`, and `exhaust_cards` list current combat-pile contents with descriptions generated for their native `PileType`. Their array lengths must exactly match the corresponding `draw`, `discard`, and `exhaust` counts or the client rejects the snapshot. These lists are read-only presentation state; only `screen.hand` carries playable hand indexes.

## Action request

The body of an `action` message is:

```json
{
  "request_id": "cdd02d47-8ef8-4ae8-918a-acde5f81e89e",
  "action": "play_card",
  "expected_revision": 1831,
  "payload": {
    "hand_index": 0,
    "target_id": "enemy-12"
  }
}
```

Rules:

1. `request_id` is unique within the current OfficeSpire process.
2. `expected_revision` must match the authoritative decision revision used to make the choice.
3. transport performs a stale/pending check before queueing.
4. the game thread performs the revision/readiness check again immediately before dispatch.
5. WebSocket/background threads never touch STS2 runtime objects.
6. only one OfficeSpire mutation is active at a time during M4.

## M4 combat actions

### `play_card`

```json
{
  "hand_index": 0,
  "card_id": "strike",
  "target_id": "enemy-12"
}
```

`target_id` can be an integer combat id or `enemy-<combatId>`. It may be omitted for untargeted/AOE/self actions. For an enemy-targeted action, M4 auto-targets only when exactly one hittable enemy exists; otherwise an explicit target is required.

The game thread requires the card's native ID to still match the current hand index, then rechecks STS2 `CanPlay`, local-player turn readiness and target legality before enqueueing `PlayCardAction`. The action is constructed from `LocalContext.GetMe`; a remote participant ID is never accepted in the payload.

### `end_turn`

Payload may be `{}`. The game thread enqueues `EndPlayerTurnAction` using the current combat round.

### `use_potion`

```json
{
  "slot_index": 0,
  "potion_id": "fire_potion",
  "target_id": "enemy-12"
}
```

`slot` is accepted as an alias for `slot_index`. The current slot must still contain the requested native potion ID. Enemy targeting follows the same rule as cards. Self/player-targeted potions use the local player creature; untargeted/AOE/random-target potions leave target resolution to STS2.

Combat potion snapshots include `id`, `can_use`, `can_discard`, `needs_target`, and `valid_target_ids`. Clients should use these authoritative fields to enable controls and target selection.

### `discard_potion`

```json
{
  "slot_index": 0,
  "potion_id": "swift_potion"
}
```

`slot` is accepted as an alias. The game thread rechecks the current slot, native potion ID, and removal permission, then enqueues `DiscardPotionGameAction` through STS2's action queue. This action is currently combat-only.

## M6 map action

### `choose_map_node`

```json
{
  "column": 2,
  "row": 7,
  "stable_id": "map-3-2-7",
  "map_generation": 3
}
```

When `phase="map"`, `screen.map_generation` identifies the native generated map and `screen.reachable_nodes` contains the authoritative choices. Each node has a generation-scoped `stable_id`, `column`, `row`, `node_type`, and `reachable`. `screen.votes` contains one entry per run player, keyed by stable native network ID; a submitted route is represented by its generation-scoped node ID and an unsubmitted vote by `choice_id=null`. The backend validates generation, stable ID, coordinate, and live reachability immediately before submitting `VoteForMapCoordAction`; stale or unreachable choices fail without mutation.

## M7 reward actions

When `phase="rewards"`, the screen uses either `mode="rewards"` with `items`, or `mode="card_selection"` with `card_choices`.

- `choose_reward`: `{ "choice_index": 0, "action_token": "<opaque>" }`
- `choose_reward_card`: `{ "choice_index": 1, "card_id": "strike" }`
- `skip_rewards`: `{}`

Every ordinary reward receives an opaque, process-local action token bound to its native model instance. The game thread requires the current button at the index to retain that token; tokens are never persisted or interpreted as game identity. Indexes are never retained as STS2 object references across threads. Card reward selection separately binds the native card ID and fails as stale if the card at that index changed.

## M7 card-selection action

For a supported generic `NChooseACardSelectionScreen`, the state uses `phase="card_selection"` and exposes authoritative `screen.options`.

- `choose_card_option`: `{ "choice_index": 2, "card_id": "defend" }`
- `confirm_card_selection`: `{}`

`screen.selection_type` is one of `choose_a_card`, `deck_card`, `deck_upgrade`, `hand_multi_select`, or `unsupported_grid`. Hand selection also exposes `min_select`, `max_select`, `current_select_count`, and `can_confirm`. Every actionable selection binds index to the native card ID and rejects identity drift before pressing the control. `unsupported_grid` is always non-actionable and carries a non-empty `unavailable_reason`; the user must complete that native screen in STS2. This is intentional because transform, enchant, simple-card, and future grid subclasses have different preview/confirmation semantics. Skip behavior is not enabled without a separately identified native control.

## M7 event action

When `phase="event"`, `screen` contains `name`, `description`, `is_finished`, and authoritative `options`. Each option exposes `option_index`, title/description, `is_locked`, and `is_proceed`. `is_shared` comes from the native event synchronizer. Shared events expose exactly one `votes` entry per run player with the native option index and current option token when resolved; non-shared events expose no vote inventory.

- `choose_event_option`: `{ "option_index": 1, "action_token": "<opaque>" }`

Each native event-option instance receives an opaque process-local action token. The game thread reloads the current event model and rejects a missing, replaced, out-of-range, or locked choice. The synthetic completed-event leave control uses the reserved `event-proceed` token and native event-room proceed path. Tokens do not depend on localized display text.

## M9 special-event actions

`phase="special_event"` is reserved for native event layouts that do not use the ordinary `EventModel.CurrentOptions` button contract. The screen includes `variant`, `native_type`, a readable message and an optional `unavailable_reason`.

For `variant="crystal_sphere"`, `selected_tool`, `remaining_actions`, enabled tool controls and every still-hidden grid cell are authoritative. Each cell uses the stable identity `crystal-cell-{x}-{y}`.

- `select_special_event_tool`: `{ "tool": "small" }` or `{ "tool": "big" }`
- `choose_special_event_cell`: `{ "x": 2, "y": 4, "stable_id": "crystal-cell-2-4" }`
- `proceed_special_event`: `{}`

The game thread reloads the active overlay and revalidates the enabled control and hidden coordinate. It never retries a timed-out request. `fake_merchant`, `ancient_dialogue`, and `unsupported` are non-actionable fail-closed variants until a complete native identity/action/settlement contract is verified; clients must show their original-UI handoff reason.

## M7 rest-site actions

When `phase="rest"`, `screen.options` contains the local player's authoritative rest choices and `can_proceed` exposes the native leave control. `interaction_state` is one of `options`, `player_target`, `proceed`, or `resolving`, so a client never infers completion merely because the option buttons disappeared. `player_decisions` contains one record per run player, keyed by stable network ID, with that player's current native option inventory, last completed option index and current hover index. A multiplayer inventory must exactly match `run.party.members`; it is read-only for non-local players.

- `choose_rest_option`: `{ "option_index": 0, "option_id": "rest" }`
- `leave_rest_site`: `{}`

`target_selection_pending=true` indicates a multiplayer target decision that this version does not model. Mutations then fail closed with `unsupported_state`; the user must complete that target in STS2.

Option inventories are player-specific: the Mod does not copy the local player's options onto teammates. OfficeSpire can display whether another player still has choices, but it cannot select, target or confirm on their behalf. A recorded last-choice index refers to the synchronizer's completed action and is not rebound to a potentially changed remaining-option list.

`interaction_state="resolving"` is non-actionable and means STS2 has removed the choices without yet exposing a supported follow-up. Card-based smith/remove follow-ups are represented as the separate `card_selection` phase. A phase change or a newer settled decision revision, not the initial click, establishes completion.

`choose_rest_option` carries both the snapshot index and native option ID. Dispatch reloads the current native option list and rejects the request as stale if either identity changed; it also fails closed if the rendered control count no longer matches that authoritative list.

## M7 treasure actions

When `phase="treasure"`, `screen` exposes `chest_opened`, `is_picking`, `can_leave`, relic candidates, and the predicted local selected relic index when available. `votes` enumerates every run player's authoritative synchronizer vote and binds a submitted index to the current relic ID; `null` represents a player who has not selected a relic.

- `open_treasure`: `{}`
- `choose_treasure_relic`: `{ "choice_index": 0, "relic_id": "anchor" }`
- `leave_treasure`: `{}`

Opening, voting, and leaving are intentionally separate requests and revision boundaries. Relic selection binds index to the current native relic ID and uses the native treasure synchronizer so multiplayer voting remains game-authoritative. The current native contract has no skip/decline vote; OfficeSpire therefore does not advertise or synthesize one.

Treasure state is valid only in one of four explicit stages: unopened, opening/resolving, relic voting, or ready to leave. Before opening and after settlement, relic and vote inventories are empty. During voting, the chest is open, at least one uniquely identified relic exists, every vote points to that current inventory, and `selected_relic_index` is either `null` or a current index. The dispatcher independently rechecks that the chest control is enabled or that the native relic collection remains open before mutating.

Across map, shared-event and treasure decisions, vote identities must be unique and exactly match `run.party.members` when a multiplayer party exists. These fields are observations only: OfficeSpire never submits a vote for a remote player or treats an absent vote as consent.

## M7 shop actions

When `phase="shop"`, `screen.items` contains native `item_id`, category-local indexes, prices, stock and affordability. Card removal is exposed separately with its current price.

- `open_shop`: `{}`
- `buy_shop_item`: `{ "category": "relic", "item_index": 1, "item_id": "anchor" }`
- `request_card_removal`: `{}`
- `leave_shop`: `{}`

Purchases bind category and index to the current native card/relic/potion ID, then use the native asynchronous merchant path without blocking the Godot thread. Missing or changed model identity fails closed before purchase. Card removal starts the native purchase/selection flow; the resulting deck selector is completed through `choose_card_option`.

## Action response and status

`action_result` retains the v1 response shape:

```json
{
  "request_id": "cdd02d47-8ef8-4ae8-918a-acde5f81e89e",
  "accepted": true,
  "code": "queued",
  "message": "Action accepted by transport and queued for the STS2 main thread.",
  "state_revision": 1831
}
```

The `code` represents lifecycle state or rejection reason.

Normal lifecycle:

```text
queued
  -> accepted
  -> completed
```

- `queued`: passed transport CAS/pending checks and is waiting for the game thread.
- `accepted`: passed the second main-thread check and the adapter submitted the normal STS2 action.
- `completed`: a newer settled authoritative revision has been observed.

A request can become rejected after `queued` if the state changes before the main thread consumes it. Expected rejection codes include:

- `stale_state`
- `action_pending`
- `bad_phase`
- `not_ready`
- `bad_request`
- `bad_index`
- `bad_target`
- `unreachable_node`
- `option_locked`
- `unsupported_state`
- `out_of_stock`
- `insufficient_gold`
- `not_playable`
- `unsupported_action`
- `dispatch_exception`
- `duplicate_request`

Acceptance/queueing never means that animations/triggers have finished.

## Action-status query

To inspect a queued request without requiring asynchronous server pushes:

```json
{
  "type": "get_action_result",
  "protocol_version": 1,
  "body": {
    "request_id": "cdd02d47-8ef8-4ae8-918a-acde5f81e89e"
  }
}
```

The server replies with the latest retained `action_result` for that request. Status history is bounded; old request ids can eventually return `unknown_request`.

## Threading contract

```text
WebSocket thread
  parse + protocol/CAS validation
          │
          ▼
      ActionInbox
          │
          ▼
OfficeSpireUpdateNode / STS2 main thread
  fresh revision/readiness validation
          │
          ▼
     M4GameAdapter
          │
          ▼
STS2 action queue / potion model
```

The network thread sees only immutable protocol state and thread-safe action-status records.
