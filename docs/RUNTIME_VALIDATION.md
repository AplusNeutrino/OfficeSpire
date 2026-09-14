# Runtime validation

OfficeSpire distinguishes implementation from runtime evidence.

Status values:

- `not_implemented`
- `implemented_unverified`
- `runtime_pass`
- `runtime_fail`
- `blocked`

## Target build

The user's exact installed Steam build has not yet been recorded/tested. Do not infer runtime compatibility from source inspection alone.

## Validation matrix

| Capability | Status | Evidence / notes |
|---|---|---|
| Native mod manifest discovered by STS2 | `implemented_unverified` | Manifest exists; game has not loaded this build yet. |
| `[ModInitializer]` executes | `implemented_unverified` | Entry point exists; no runtime log captured yet. |
| Harmony initialization succeeds | `implemented_unverified` | Uses current community pattern; no runtime evidence yet. |
| Build against local `sts2.dll` | `implemented_unverified` | Project configured; requires build on a machine with STS2 installed. |
| Loopback listener starts on random port | `implemented_unverified` | M2 implementation exists; not run inside STS2 yet. |
| Session descriptor written to AppData | `implemented_unverified` | M2 implementation exists; not runtime-tested. |
| WebSocket token handshake | `implemented_unverified` | M2 implementation exists; not runtime-tested. |
| `hello` / `ping` / `get_state` transport | `implemented_unverified` | M2 implementation exists. |
| Godot update node attaches and ticks | `implemented_unverified` | M3 bridge implemented using a main-thread Node; no runtime evidence yet. |
| Detect combat vs non-combat | `implemented_unverified` | M3 currently reports `combat` only while `CombatManager.IsInProgress`; other phases remain `unknown`. |
| Read player HP/block/energy | `implemented_unverified` | M3 adapter implemented from current STS2 API patterns. |
| Read hand/cost/type/rarity | `implemented_unverified` | M3 adapter implemented. |
| Read dynamic card Damage/Block | `implemented_unverified` | Uses card DynamicVars keys `Damage`/`Block`; requires runtime validation across cards. |
| Read `CanPlay` and enemy target IDs | `implemented_unverified` | M3 adapter implemented. |
| Read enemy HP/block/intent/powers | `implemented_unverified` | M3 adapter implemented. |
| Read relics/potions/pile counts | `implemented_unverified` | M3 adapter implemented. |
| State revision changes only on decision-state changes | `implemented_unverified` | M3 SHA-256 fingerprint/revision implementation exists. |
| Play untargeted card | `not_implemented` | Planned M4. |
| Play targeted card | `not_implemented` | Planned M4. |
| End turn | `not_implemented` | Planned M4. |
| Potion actions | `not_implemented` | Planned M4. |
| Overlay UI | `not_implemented` | Planned M5. |
| Map selection | `not_implemented` | Planned M6. |
| Reward/card reward selection | `not_implemented` | Planned M6. |
| Shop/event/rest/treasure actions | `not_implemented` | Planned M6. |
| Game continues while STS2 is unfocused | `not_implemented` | Must be runtime tested separately. |
| Game continues while STS2 is minimized | `not_implemented` | Key product assumption; must not be claimed until tested. |

## First runtime probe

Build and run the current source on the user's STS2 installation, then record:

1. exact STS2 version/build shown by the game;
2. whether OfficeSpire appears in Modding and loads;
3. OfficeSpire initialization log line;
4. whether `%APPDATA%/SlayTheSpire2/OfficeSpire/session.json` is created;
5. whether the recorded port listens only on `127.0.0.1`;
6. WebSocket `hello`, `ping/pong`, and `get_state` behavior;
7. out-of-combat snapshot (`phase=unknown`) without errors;
8. in-combat snapshot values compared with visible game values;
9. one card with Damage, one with Block, and one targeted card;
10. enemy intent/powers for at least two enemy types;
11. confirm `action` is still rejected as `actions_not_enabled`;
12. confirm vanilla gameplay still works normally.

After M4 lands, separately test:

1. untargeted card;
2. targeted card;
3. end turn;
4. potion use;
5. stale revision rejection;
6. unfocused main window;
7. minimized main window.
