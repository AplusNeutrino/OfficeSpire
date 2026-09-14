# OfficeSpire

A low-profile focus and accessibility mod for the Steam version of **Slay the Spire 2**.

> Status: pre-alpha planning. The first milestone is a lightweight DLL-only mod.

## V0.1 — Focus Mode

- Global boss key (default: `F10`)
- Pause, mute, and minimize in one action
- Restore the previous volume when returning to the game
- Automatic windowed mode
- Configurable window size
- Configurable FPS cap (default target: 30 FPS)
- Pause and mute when focus is lost
- Persistent settings
- No run or save-data modifications

Planned distribution layout:

```text
OfficeSpire/
├── OfficeSpire.json
└── OfficeSpire.dll
```

The manifest will declare `affects_gameplay = false`.

## Roadmap

- **V0.2 — Low Profile UI:** reduced motion, muted presentation, static visuals, and a discreet office mode.
- **V0.3 — Compact Combat:** a restrained information-panel combat interface.
- **V0.4 — Minimal Cards:** compact text-first cards with normal cards available on hover.
- **V1.0 — Workshop:** stable builds maintained for supported game branches.

## Proposed stack

- C# / .NET 9
- Slay the Spire 2 native mod loader
- RitsuLib
- Harmony
- BaseLib only if later content integration requires it

## Design constraints

- Preserve gameplay information and mechanics.
- Keep OfficeSpire settings separate from run and profile data.
- Avoid touching or synchronizing vanilla/modded saves.
- Prefer reversible presentation changes and graceful fallbacks across game updates.

## License

[MIT](LICENSE)
