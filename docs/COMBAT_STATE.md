# Combat state schema (M3)

M3 publishes a `state` wire message whose `phase` is `combat` while STS2 reports an active combat. The `run` and `screen` fields use snake_case JSON.

Example shape:

```json
{
  "protocol_version": 1,
  "state_revision": 42,
  "phase": "combat",
  "action_pending": false,
  "run": {
    "ascension_level": 10,
    "current_act": 2,
    "current_floor": 31,
    "gold": 227,
    "relics": [
      {
        "id": "ANCHOR",
        "name": "Anchor",
        "description": "...",
        "stack_count": 1
      }
    ]
  },
  "screen": {
    "waiting_for_input": true,
    "round_number": 4,
    "is_play_phase": true,
    "energy": 3,
    "max_energy": 3,
    "player": {
      "current_hp": 54,
      "max_hp": 72,
      "block": 8
    },
    "hand": [
      {
        "hand_index": 0,
        "id": "STRIKE",
        "name": "Strike+",
        "cost": 0,
        "type": "Attack",
        "rarity": "Basic",
        "damage": 9,
        "block": null,
        "description": "Deal 9 damage.",
        "can_play": true,
        "unplayable_reason": null,
        "needs_target": true,
        "valid_target_ids": [12, 13]
      }
    ],
    "piles": {
      "draw": 18,
      "discard": 5,
      "exhaust": 2
    },
    "enemies": [
      {
        "stable_id": "enemy-12",
        "combat_id": 12,
        "name": "Taskmaster",
        "current_hp": 64,
        "max_hp": 64,
        "block": 0,
        "intent": "...",
        "powers": [
          {
            "name": "Weak",
            "amount": 2,
            "description": "..."
          }
        ],
        "is_alive": true,
        "is_hittable": true
      }
    ],
    "potions": [
      {
        "slot_index": 0,
        "id": "dexterity_potion",
        "name": "Dexterity Potion",
        "description": "...",
        "target_type": "Self",
        "can_use": true,
        "can_discard": true,
        "needs_target": false,
        "valid_target_ids": []
      }
    ]
  }
}
```

## Semantics

- `hand_index` is the current zero-based hand position and may become stale after any game state transition. Mutating actions must therefore also carry `expected_revision`.
- `combat_id` is STS2's combat target identifier. `stable_id` is the protocol-friendly string form used by the future overlay.
- `damage` and `block` are read from the card's current DynamicVars when those keys are available. Some cards may legitimately expose neither.
- `description` is formatted through the game's localization/dynamic-variable system where possible, with unresolved image/template markup stripped as a fallback.
- `can_play` comes from the game's own `CardModel.CanPlay` result. OfficeSpire does not independently reimplement card legality.
- Potion availability and target IDs are captured from the live player/combat state. The write adapter rechecks the current slot and permissions before either use or discard.
- `valid_target_ids` currently enumerates hittable enemies for cards that require an explicit target.
- `waiting_for_input` is true only when the local player is in `PlayerTurnPhase.Play` and `CombatManager.PlayerActionsDisabled` is false.

## Revision behavior

The adapter serializes decision-relevant `phase`, `run`, and `screen` content and fingerprints it with SHA-256. The externally visible `state_revision` increments only when that fingerprint changes.

The hash itself is not sent over the wire; it is only an implementation detail used to maintain a monotonic revision counter.

## Current limitation

M3 reports other in-run phases as `unknown`. Map/reward/shop/event/rest/treasure schemas are introduced in M6 after combat control is validated.
