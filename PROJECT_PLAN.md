# OfficeSpire v0.6 Product Plan

This document defines stable product scope, architecture boundaries, and engineering principles.

Mutable milestone status, implementation order, versions, and exit criteria are maintained only in **[docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)**. Runtime claims require evidence in **[docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md)**.

## Product goal

OfficeSpire is a text-first alternative control surface for Slay the Spire 2.

The intended v0.6 experience is a compact semi-transparent desktop overlay that allows a player to inspect and operate the ordinary run loop while STS2 remains the authoritative simulation:

- player, enemy, hand, deck-pile, relic, potion, and turn state;
- targeted and untargeted card play;
- potion use and discard;
- end turn;
- card-selection prompts;
- map routes and reachable-node selection;
- combat and card rewards;
- events;
- shops and card removal;
- rest sites;
- treasures;
- run/menu state where practical.

The overlay presents choices and submits explicit user decisions. It does not select actions automatically.

## System architecture

```text
Slay the Spire 2
└─ OfficeSpire Mod (.NET / C#)
   ├─ Runtime adapter
   ├─ State normalizer
   ├─ Semantic revision guard
   ├─ Main-thread action dispatcher
   └─ Authenticated loopback transport
              │
              ▼
OfficeSpire Overlay (Tauri + React + TypeScript)
   ├─ Session discovery
   ├─ Protocol handshake and reconnect
   ├─ Phase-specific state renderer
   ├─ Mouse and keyboard interaction
   └─ Transparent desktop window
```

### Mod responsibilities

The mod is the only OfficeSpire component allowed to touch STS2 runtime objects. It:

1. identifies the current game phase;
2. reads authoritative state;
3. normalizes state into a versioned protocol;
4. publishes snapshots;
5. validates requests against the current decision revision;
6. queues validated requests for the Godot main thread;
7. invokes the normal native action path;
8. reports accepted, rejected, failed, and completed outcomes.

### Overlay responsibilities

The overlay:

- consumes protocol data without depending on STS2 implementation types;
- renders values supplied by the backend rather than reimplementing rules;
- attaches the current expected revision to mutations;
- prevents conflicting submissions while an action is pending;
- surfaces disconnects, stale state, rejection, and recovery;
- preserves user presentation preferences;
- remains usable as an independent desktop window.

### Transport requirements

- loopback-only binding;
- per-session authentication token;
- protocol-version handshake;
- heartbeat and reconnect;
- bounded message sizes;
- unique action request IDs;
- no remote-control surface in v0.6.

## Protocol invariants

A state snapshot contains at least:

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

A mutating request contains its decision revision:

```json
{
  "request_id": "unique-id",
  "action": "play_card",
  "expected_revision": 1831,
  "payload": {
    "hand_index": 0,
    "target_id": "enemy-0"
  }
}
```

Actions are rejected when their expected revision is stale. Accepted actions are not considered complete until the backend observes the required authoritative state transition.

## Engineering principles

1. **The game is authoritative.** Do not duplicate combat rules, legality, costs, targets, RNG, or progression in the overlay when the runtime can supply them.
2. **Stable protocol, isolated adapter.** Version-sensitive STS2 access stays behind the runtime adapter.
3. **No optimistic mutation.** The overlay waits for authoritative state.
4. **Explicit actions only.** OfficeSpire is a control surface, not a gameplay bot.
5. **Fail open to vanilla UI.** Disconnects and unsupported states must leave the run playable.
6. **Loopback only.** No internet or LAN control surface.
7. **Evidence controls status.** Source, compilation, mocks, integration, and live runtime proof are distinct.
8. **Fail closed on unsafe mutations.** Ambiguous, malformed, stale, or unsupported requests do not touch game state.
9. **Version runtime dependencies.** Record the tested STS2 version/build, OfficeSpire commit, protocol version, and upstream references.
10. **Accessibility before decoration.** Prefer readable text, predictable focus, low motion, scalable layout, and keyboard reachability.

## Testing model

### Unit tests

- protocol serialization and rejection;
- semantic revision behavior;
- action validation;
- stable-ID mapping;
- phase-specific state formatting;
- target-selection state;
- malformed message handling.

### Integration tests without STS2

- mock snapshot flow;
- session handshake;
- heartbeat/reconnect;
- request/result lifecycle;
- pending-action lock;
- stale revision recovery;
- phase routing;
- frontend action construction.

### Live STS2 validation

Every runtime feature uses one of:

- `not_implemented`;
- `implemented_unverified`;
- `runtime_pass`;
- `runtime_fail`;
- `blocked`.

Live evidence must identify the environment and distinguish:

- original STS2 window focused;
- original STS2 window unfocused;
- original STS2 window minimized.

Success in one condition does not prove another.

## v0.6 definition of done

v0.6 is complete when, on at least one explicitly documented STS2 build:

- the mod loads reliably;
- the overlay launches and connects locally;
- scene transitions and ordinary reconnects recover;
- live state accurately represents supported decisions;
- combat works through normal card, target, potion, and end-turn interactions;
- map, rewards, card selections, events, shops, rest sites, and treasures work for documented supported cases;
- the overlay is translucent, movable, resizable, always-on-top capable, mouse-operable, and keyboard-operable;
- stale and conflicting actions are rejected safely;
- unsupported states never silently advance or corrupt a run;
- installation, packaging, limitations, and runtime results are documented;
- a distributable artifact is traceable to the validated commit.

## Scope boundary

OfficeSpire stays on the game state/action/presentation side of the boundary. It will not implement:

- process-name spoofing;
- anti-monitoring or screenshot-tool countermeasures;
- corporate endpoint or MDM evasion;
- log tampering;
- system-level concealment;
- unattended gameplay automation.

## Source and licensing discipline

Before reusing external code, record:

- repository URL;
- exact commit/reference;
- license;
- files or concepts examined;
- whether the result is copied, adapted, or independently reimplemented.

See [docs/UPSTREAM_REFERENCES.md](docs/UPSTREAM_REFERENCES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Documentation authority

| Document | Responsibility |
|---|---|
| [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) | Current milestone, detailed route, status, execution order, exit criteria |
| [docs/RUNTIME_VALIDATION.md](docs/RUNTIME_VALIDATION.md) | Runtime environment, probes, observations, evidence |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | Wire schema and protocol behavior |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Component design and boundaries |
| [docs/UPSTREAM_REFERENCES.md](docs/UPSTREAM_REFERENCES.md) | External research and licensing |
| [README.md](README.md) | Concise public project summary |
