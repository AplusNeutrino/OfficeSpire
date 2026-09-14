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
| Native mod manifest discovered by STS2 | `implemented_unverified` | Manifest created in M1; game has not loaded this build yet. |
| `[ModInitializer]` executes | `implemented_unverified` | Entry point created; no runtime log captured yet. |
| Harmony initialization succeeds | `implemented_unverified` | Uses current community pattern; no runtime evidence yet. |
| Build against local `sts2.dll` | `implemented_unverified` | Project configured; requires build on a machine with STS2 installed. |
| Read current game phase | `not_implemented` | Planned M3. |
| Read player/hand/enemy combat state | `not_implemented` | Planned M3. |
| Play untargeted card | `not_implemented` | Planned M4. |
| Play targeted card | `not_implemented` | Planned M4. |
| End turn | `not_implemented` | Planned M4. |
| Potion actions | `not_implemented` | Planned M4. |
| Overlay transport handshake | `not_implemented` | Planned M2. |
| Overlay UI | `not_implemented` | Planned M5. |
| Map selection | `not_implemented` | Planned M6. |
| Reward/card reward selection | `not_implemented` | Planned M6. |
| Shop/event/rest/treasure actions | `not_implemented` | Planned M6. |
| Game continues while STS2 is unfocused | `not_implemented` | Must be runtime tested separately. |
| Game continues while STS2 is minimized | `not_implemented` | Key product assumption; must not be claimed until tested. |

## First user-side runtime probe

Once an M1 build is produced on the user's machine:

1. confirm the exact STS2 version/build shown by the game;
2. enable OfficeSpire in the game's mod settings;
3. launch the game and capture the OfficeSpire initialization log line;
4. confirm vanilla gameplay still starts normally;
5. record failures verbatim before changing code.

After M3/M4 land, the first interaction probes are:

1. detect combat phase;
2. read hand, player and enemy state;
3. play one untargeted card;
4. play one targeted card;
5. end turn;
6. test while the main game window is unfocused;
7. separately test while the main game window is minimized.
