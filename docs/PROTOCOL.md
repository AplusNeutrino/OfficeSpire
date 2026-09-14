# OfficeSpire protocol v1

Protocol version: `1`

The protocol is the stable boundary between the STS2 mod and the future desktop overlay. It must not expose `MegaCrit.Sts2.*`, Godot, or Harmony types.

## Session discovery

On startup the mod binds a WebSocket listener to **127.0.0.1 on a random ephemeral port** and writes:

```text
%APPDATA%/SlayTheSpire2/OfficeSpire/session.json
```

Example:

```json
{
  "protocol_version": 1,
  "port": 49152,
  "token": "<256-bit random token>",
  "process_id": 12345,
  "created_utc": "2026-09-14T03:00:00+00:00"
}
```

The overlay connects to:

```text
ws://127.0.0.1:<port>/officespire?token=<token>
```

The token is intentionally not printed to normal logs. The session file is local-user state and will later be consumed by the overlay launcher.

## Wire envelope

All WebSocket text messages use:

```json
{
  "type": "state",
  "protocol_version": 1,
  "body": {}
}
```

M2 server message types:

- `hello`
- `state`
- `pong`
- `action_result`
- `error`

M2 client message types:

- `ping`
- `get_state`
- `action` (parsed but intentionally rejected until M4)

Inbound messages are capped at 64 KiB. Outbound messages are capped at 1 MiB.

## State envelope

The body of a `state` message is:

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

The body of an `action` message is:

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
5. network callbacks never mutate STS2 objects directly; M4 will queue accepted requests for the game-thread dispatcher.

## Action response

The body of an `action_result` message is:

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

## Intended action lifecycle

```text
READY
  -> REQUEST_SENT
  -> ACCEPTED / REJECTED
  -> GAME_ACTION_PENDING
  -> STATE_CHANGED
  -> READY
```

## M2 behavior

M2 uses `NullGameAdapter` and a live loopback transport:

- WebSocket handshake/token validation is implemented but runtime-unverified;
- successful connection receives `hello` then the current `state`;
- `ping` returns `pong`;
- `get_state` returns the current state snapshot;
- state phase is currently `unknown` and revision is `0`;
- `action` is parsed but rejected with `actions_not_enabled`;
- no network thread is allowed to mutate game state.

This is deliberate. No STS2 state/action behavior is considered implemented until the real adapter and game-thread dispatcher are added and runtime-tested.
