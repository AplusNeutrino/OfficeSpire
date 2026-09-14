# Upstream references

This file records external projects examined during OfficeSpire development.

## LightEnding/autoSpire

- Repository: https://github.com/LightEnding/autoSpire
- Reference commit: `13c5ed1e567313219061716699e4d0ad318e9d17`
- Commit date: 2026-08-10
- Observed version: `0.1.3`
- License: MIT

Files inspected:

- `LICENSE`
- `autoSpire.json`
- `autoSpire.csproj`
- `scripts/Entry.cs`
- `scripts/core/GameStateSnapshot.cs`
- `scripts/core/GameHookServer.cs`

### M1/M2 use

M1/M2 independently implemented OfficeSpire's project structure and TCP/WebSocket transport. No autoSpire HTTP/MCP transport code was copied.

### M3 adaptation

M3 adapts STS2 API-access patterns documented in autoSpire for:

- `RunManager.Instance.DebugOnlyGetState()` and `LocalContext.GetMe(...)`;
- `CombatManager.Instance.DebugOnlyGetState()`;
- player hand, energy and pile access through `PlayerCombatState`;
- card `CanPlay`, current cost, dynamic Damage/Block and target discovery;
- enemy HP/block/intent/power extraction;
- relic and potion metadata;
- the Godot main-thread update-node pattern.

OfficeSpire rewrites these into its own `IGameAdapter`/versioned protocol architecture. The autoSpire MIT notice is retained in `THIRD_PARTY_NOTICES.md`.

## Alchyr/ModTemplate-StS2

- Repository: https://github.com/Alchyr/ModTemplate-StS2
- Reference commit: `55ca2c606e6c78dd39689a5cf979b243a49652e7`
- Commit date: 2026-08-22
- Files inspected:
  - `content/ModTemplate/ModTemplate.json`
  - `content/ModTemplate/ModTemplate.csproj`
  - `content/ModTemplate/ModTemplateCode/MainFile.cs`
- License status: no repository-root `LICENSE` file was observed in the inspected tree at this reference. Treat source as **reference-only unless licensing is clarified**.

Facts/patterns used as compatibility reference:

- `Godot.NET.Sdk/4.5.1`;
- `net9.0`;
- game-provided `sts2.dll` and `0Harmony.dll` references;
- `[ModInitializer]` and Harmony initialization;
- current manifest field names.

No source from this repository has been copied into OfficeSpire.

## S0ul3r/BoberInSpire

- Repository: https://github.com/S0ul3r/BoberInSpire
- Reference commit: `67263f2a7328783bbce201a064a90565f6a1447e`
- Commit date: 2026-05-24
- Files inspected:
  - `README.md`
  - repository tree containing `overlay-ui/`, `overlay-ui/src-tauri/`, and the STS2 example mod
- License status: no `LICENSE` file was observed in the repository tree at this reference. Treat source as **concept/reference-only**.

Concepts confirmed by its README:

- STS2 C# mod exporting live state;
- React + Tauri desktop overlay;
- semi-transparent, always-on-top window;
- drag/resize and persisted display settings;
- WebSocket updates.

OfficeSpire does not copy BoberInSpire source. Its future overlay is independently implemented and avoids BoberInSpire's Python bridge.

## Licensing rule

Before copying or adapting source from any upstream project:

1. verify the license at the exact referenced commit;
2. record the exact source file and commit here;
3. preserve required notices/attribution;
4. prefer independent implementation when license status is absent or unclear.
