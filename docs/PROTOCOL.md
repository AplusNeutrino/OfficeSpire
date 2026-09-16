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
- `rest`
- `treasure`
- `menu`
- `run_end`

When no authoritative run state exists, the backend reports `phase="menu"` with a typed read-only menu screen. `menu_screen` is `main`, `singleplayer`, `multiplayer`, `multiplayer_host`, `multiplayer_join`, `multiplayer_load`, `profile_select`, `character_select`, `custom_run`, `daily_run`, `popup`, `error_popup`, or the fail-safe `unknown`. `options` contains non-empty unique semantic IDs, readable labels and current native availability. Protocol v1 requires `waiting_for_input=false` and `can_mutate=false`: clients may display these controls but must direct the user to the original STS2 UI and must not synthesize a menu or run-start action.

The read-only menu inventory is version-sensitive observation, not a promise that a similarly named action exists. Private native control fields are inspected only for visibility/availability, and an absent or changed field removes that option rather than guessing. `profile_select` may provide `current_profile_id`; its options use `profile_<native id>`. `character_select.characters` contains native character IDs, lock state, starting HP/gold/energy, description, starting relics and starting deck. `character_select`, `custom_run` and `daily_run` may carry `run_setup`: authoritative lobby mode, current/max ascension, nullable seed, first-act key, nullable Daily server time, and the full selected modifier inventory. A null seed means the game has not fixed a custom seed; clients must not replace it with one.

The same setup screens may carry `lobby` after the native roster is initialized. It contains the local service role, nullable maximum capacity, stable local player ID, `all_ready`, and a unique player inventory. Every player has a stable network ID, unique slot, local ownership, nullable host attribution, character identity/name and Ready state. Host attribution is boolean only when the local service is the host; clients receive `null` because the inspected native contract does not establish which remote network ID is the host. `all_ready` is roster state, not proof that launch settlement occurred. A generic `popup` may include normalized `popup_title` and `popup_body`, but its semantic purpose is intentionally not guessed. A native `NErrorPopup` is identified as `error_popup` while its localized title/body remain presentation text, not a stable machine-readable reason code. All other menu screens carry `current_profile_id=null`, and non-character screens carry `characters=null`. Menu actions will require a later protocol revision or explicit compatible extension once main-thread dispatch and authoritative settlement are separately proven.

`multiplayer_host`, `multiplayer_join` and `multiplayer_load` may carry read-only `connection` state. `status` is an observed lifecycle label, `connected_players` is never negative, and `required_players` is nullable when the native screen does not disclose a capacity. Join discovery supplies a unique `sessions` inventory keyed by native platform player ID; the corresponding `friend_<id>` menu option is still informational and cannot initiate a connection. Load-lobby counts describe the saved multiplayer roster only and do not authorize loading with missing players. Clients must not infer connection success from a loading overlay disappearing; settlement requires the subsequent authoritative setup/load screen.

An initialized `multiplayer_load` screen may additionally carry `saved_run`: native game mode, ascension, one-based current act, visited-floor count, missing-player count and the complete saved player inventory. Each saved player is keyed by native network ID and includes character ID, HP, maximum energy, potion capacity, gold and current connection presence. `missing_players` must exactly equal the disconnected inventory count. This is warning context only; OfficeSpire cannot confirm loading without missing players, reconnect a peer or begin the run.

A missing run and a visible game-over overlay must remain continuously observable for three capture frames before promotion to `menu` or `run_end`. Earlier frames use non-actionable `phase="unknown"` with `action_pending=true`. This transition state cannot complete an accepted mutation or expose lifecycle controls.

`phase="run_end"` is emitted only while the native `NGameOverScreen` is the visible overlay. Its read-only `status` is `victory`, `defeat`, or `abandoned`; the client rejects other values and exposes no automatic post-run action. The Mod uses the engine's abandonment flag, victory-room signal, and recorded win time to classify the outcome. A missing or transient run state alone never establishes `run_end`.

All user-facing presentation strings are plain text. The Mod removes game rich-text/color tags (including malformed or leaked `/gold`-style closers), converts explicit breaks and icon markup to readable text, and suppresses unresolved template variables while preserving Unicode. Clients must repeat this normalization defensively only for presentation fields; they must never normalize action names, IDs, stable identities, phase values, tokens, or other protocol semantics.

For `phase="combat"`, `run.character_id` and `run.character_name` identify the local player's native character model. `screen.player` contains current/max HP, block, and the complete native player power list (`name`, `amount`, `description`). `screen.energy` and `screen.max_energy` remain combat-level fields. `screen.stars` is the Regent counter when applicable, otherwise `null`. `screen.orb_capacity` plus `screen.orbs` describe the Defect queue; each orb carries native identity, name, description, passive value and evoke value. `screen.companions` contains only entities with authoritative combat state, currently Osty for Necrobinder, including HP/block/alive state and powers. Cosmetic pets are not fabricated as combat entities.

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

The game thread requires the card's native ID to still match the current hand index, then rechecks STS2 `CanPlay`, player-turn readiness and target legality before enqueueing `PlayCardAction`.

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

When `phase="map"`, `screen.map_generation` identifies the native generated map and `screen.reachable_nodes` contains the authoritative choices. Each node has a generation-scoped `stable_id`, `column`, `row`, `node_type`, and `reachable`. The backend validates generation, stable ID, coordinate, and live reachability immediately before submitting `VoteForMapCoordAction`; stale or unreachable choices fail without mutation.

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

`screen.selection_type` distinguishes single-click, grid/deck, and `hand_multi_select` states. Hand selection also exposes `min_select`, `max_select`, `current_select_count`, and `can_confirm`. Every selection binds index to the native card ID and rejects identity drift before pressing the control. Skip behavior is not enabled without a separately identified native control.

## M7 event action

When `phase="event"`, `screen` contains `name`, `description`, `is_finished`, and authoritative `options`. Each option exposes `option_index`, title/description, `is_locked`, and `is_proceed`.

- `choose_event_option`: `{ "option_index": 1, "action_token": "<opaque>" }`

Each native event-option instance receives an opaque process-local action token. The game thread reloads the current event model and rejects a missing, replaced, out-of-range, or locked choice. The synthetic completed-event leave control uses the reserved `event-proceed` token and native event-room proceed path. Tokens do not depend on localized display text.

## M7 rest-site actions

When `phase="rest"`, `screen.options` contains authoritative rest choices and `can_proceed` exposes the native leave control. `interaction_state` is one of `options`, `player_target`, `proceed`, or `resolving`, so a client never infers completion merely because the option buttons disappeared.

- `choose_rest_option`: `{ "option_index": 0, "option_id": "rest" }`
- `leave_rest_site`: `{}`

`target_selection_pending=true` indicates a multiplayer target decision that this version does not model. Mutations then fail closed with `unsupported_state`; the user must complete that target in STS2.

`interaction_state="resolving"` is non-actionable and means STS2 has removed the choices without yet exposing a supported follow-up. Card-based smith/remove follow-ups are represented as the separate `card_selection` phase. A phase change or a newer settled decision revision, not the initial click, establishes completion.

`choose_rest_option` carries both the snapshot index and native option ID. Dispatch reloads the current native option list and rejects the request as stale if either identity changed; it also fails closed if the rendered control count no longer matches that authoritative list.

## M7 treasure actions

When `phase="treasure"`, `screen` exposes `chest_opened`, `is_picking`, `can_leave`, relic candidates, and the predicted local selected relic index when available.

- `open_treasure`: `{}`
- `choose_treasure_relic`: `{ "choice_index": 0, "relic_id": "anchor" }`
- `skip_treasure_relic`: `{}`
- `leave_treasure`: `{}`

Opening, voting, and leaving are intentionally separate requests and revision boundaries. Relic selection binds index to the current native relic ID and uses the native treasure synchronizer so multiplayer voting remains game-authoritative.

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
