# OfficeSpire protocol v1

Protocol version: `1`

The protocol is the stable boundary between the STS2 mod and the future desktop overlay. It must not expose `MegaCrit.Sts2.*`, Godot, or Harmony types.

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

`state_revision` changes whenever the authoritative decision-relevant state changes. The exact revision-generation algorithm will be finalized with the real adapter, but it must be monotonic within a live session.

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

`run` contains cross-screen run information. `screen` contains phase-specific information.

## Action request

```json
{
  "request_id": "cdd02d47-8ef8-4ae8-918a-acde5f81e89e",
  "action": "play_card",
  "expected_revision": 1831,
  "payload": {
    "hand_index": 0,
    "target_id": "enemy-0"
  }
}
```

Rules:

1. `request_id` uniquely identifies one user action request.
2. `expected_revision` must match the authoritative revision used to make the decision.
3. the dispatcher rejects stale requests before they can mutate game state.
4. payload schemas are action-specific and will be documented as actions are implemented.

## Action response

```json
{
  "request_id": "cdd02d47-8ef8-4ae8-918a-acde5f81e89e",
  "accepted": true,
  "code": "accepted",
  "message": "",
  "state_revision": 1831
}
```

Acceptance means the request passed OfficeSpire validation and was accepted for dispatch. It does **not** mean all animations/triggers resulting from the game action have completed. The overlay must wait for a later authoritative state snapshot before issuing a conflicting action.

## Intended lifecycle

```text
READY
  -> REQUEST_SENT
  -> ACCEPTED / REJECTED
  -> GAME_ACTION_PENDING
  -> STATE_CHANGED
  -> READY
```

## M1 behavior

M1 uses `NullGameAdapter`:

- state phase is `unknown`;
- revision is `0`;
- all action requests are rejected with `adapter_not_ready`.

This is deliberate. No STS2 runtime behavior is considered implemented until the real adapter is added and runtime-tested.
