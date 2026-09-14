# OfficeSpire Development Roadmap

## Current Development Node

Version:

```
OfficeSpire v0.6-alpha.2
Overlay Prototype
```

Previous stable milestone:

```
v0.6-alpha.1
Playable Backend
```

Validated backend capabilities:

- Mod Runtime
- State Observation
- Semantic Revision Protocol
- WebSocket Transport
- Action Inbox
- Native Action Execution
- Stale Protection

Runtime validated actions:

- play_card
- end_turn
- stale revision rejection

## Development Principle

From this point onward, implementation follows this document as the execution baseline.

Rules:

1. Do not expand scope before the current milestone exit criteria are met.
2. Do not mark features complete without runtime evidence.
3. Separate implemented, integrated, and runtime-validated states.
4. The game remains authoritative; Overlay only renders state and submits explicit actions.

---

# v0.6-alpha.2 — Overlay Prototype

Goal:

> Build the first real external STS2 control surface.

Target chain:

```
STS2
 |
OfficeSpire Mod
 |
WebSocket
 |
Tauri Overlay
```

## M5.1 Overlay Shell

Status: IN_PROGRESS

Tasks:

- Tauri desktop application
- React + TypeScript UI
- transparent window
- borderless window
- resize support
- drag support
- always-on-top option

Exit criteria:

- overlay launches as an independent desktop window
- window behavior matches the planned control surface

## M5.2 State Renderer

Status: IN_PROGRESS

Tasks:

- WebSocket client
- protocol handshake
- state snapshot parser
- player renderer
- enemy renderer
- hand renderer
- revision display/debug information

Exit criteria:

- live backend snapshot appears in overlay
- refresh follows authoritative state revisions

## M5.3 Combat Action Bridge

Status: TODO

Scope only:

- play_card
- end_turn

Flow:

```
User click
    |
Overlay
    |
Action Request
    |
Action Inbox
    |
Native Dispatcher
    |
STS2
```

Exit criteria:

Complete combat loop:

```
View enemy
 -> View hand
 -> Play card
 -> Verify effect
 -> End turn
 -> Receive next state
```

---

# Explicitly Deferred

Not included in v0.6-alpha.2:

- map navigation
- rewards
- events
- shops
- rest sites
- treasures
- full UI polish

These belong to later milestones.

---

# Future Version Roadmap

## v0.6-beta — Full Combat Client

Add:

- potion
- target selector
- card choices
- reward selection
- combat UI refinement

## v0.7 — Tower Navigation

Add:

- map rendering
- route selection
- rest
- smith
- treasure
- shop navigation

## v0.8 — Full Run Client

Goal:

Operate a complete run through OfficeSpire:

```
Combat
Map
Reward
Shop
Event
Rest
Treasure
```

---

# Current Execution Order

1. Complete Tauri shell.
2. Connect WebSocket client.
3. Replace demo state with live snapshot.
4. Add action request layer.
5. Validate play_card.
6. Validate end_turn.
7. Record runtime evidence.
8. Update README and milestone status.
