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
  "target_id": "enemy-12"
}
```

`target_id` can be an integer combat id or `enemy-<combatId>`. It may be omitted for untargeted/AOE/self actions. For an enemy-targeted action, M4 auto-targets only when exactly one hittable enemy exists; otherwise an explicit target is required.

The game thread rechecks the current hand index, STS2 `CanPlay`, player-turn readiness and target legality before enqueueing `PlayCardAction`.

### `end_turn`

Payload may be `{}`. The game thread enqueues `EndPlayerTurnAction` using the current combat round.

### `use_potion`

```json
{
  "slot_index": 0,
  "target_id": "enemy-12"
}
```

`slot` is accepted as an alias for `slot_index`. Enemy targeting follows the same rule as cards. Self/player-targeted potions use the local player creature; untargeted/AOE/random-target potions leave target resolution to STS2.

Potion discard is not yet enabled in the M4 source baseline.

## M6 map action

### `choose_map_node`

```json
{
  "column": 2,
  "row": 7
}
```

When `phase="map"`, `screen.reachable_nodes` contains the authoritative choices. Each node has `stable_id`, `column`, `row`, `node_type`, and `reachable`. The backend validates the coordinate against the current native map immediately before submitting `VoteForMapCoordAction`; stale or unreachable choices fail without mutation.

## M7 reward actions

When `phase="rewards"`, the screen uses either `mode="rewards"` with `items`, or `mode="card_selection"` with `card_choices`.

- `choose_reward`: `{ "choice_index": 0 }`
- `choose_reward_card`: `{ "choice_index": 1 }`
- `skip_rewards`: `{}`

Every choice is resolved again from the current native overlay on the game thread. Indexes are never retained as STS2 object references across threads.

## M7 card-selection action

For a supported generic `NChooseACardSelectionScreen`, the state uses `phase="card_selection"` and exposes authoritative `screen.options`.

- `choose_card_option`: `{ "choice_index": 2 }`
- `confirm_card_selection`: `{}`

`screen.selection_type` distinguishes single-click, grid/deck, and `hand_multi_select` states. Hand selection also exposes `min_select`, `max_select`, `current_select_count`, and `can_confirm`. Skip behavior is not enabled without a separately identified native control.

## M7 event action

When `phase="event"`, `screen` contains `name`, `description`, `is_finished`, and authoritative `options`. Each option exposes `option_index`, title/description, `is_locked`, and `is_proceed`.

- `choose_event_option`: `{ "option_index": 1 }`

The game thread reloads the current native event model and rejects missing, stale, out-of-range, or locked choices. A completed event uses the native event-room proceed path.

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
