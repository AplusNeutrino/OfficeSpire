# OfficeSpire v0.6-alpha.2 M5 Final Implementation Plan

## M5.1 Overlay Shell

Status: implementation complete, runtime verification pending

- Tauri desktop shell
- Transparent window
- Always on top
- Borderless window
- Resize support

## M5.2 State Renderer

Status: implementation complete, runtime verification pending

- StateSnapshot model
- Overlay store
- WebSocket protocol
- Handshake
- Reconnect design
- Combat renderer

## M5.3 Action Bridge

Status: implementation complete, runtime verification pending

Supported actions:

- play_card
- end_turn

Flow:

Overlay
 -> Action Builder
 -> WebSocket
 -> Action Inbox
 -> Native Dispatcher
 -> STS2

## Verification Gate

The following remain required before PASS:

- Real Tauri desktop launch
- Real STS2 connection
- Live snapshot rendering
- play_card execution
- end_turn execution
- stale revision rejection
