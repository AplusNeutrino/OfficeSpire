# Upstream references

This file records external projects examined during OfficeSpire development. A reference does **not** imply that source code has been copied.

## LightEnding/autoSpire

- Repository: https://github.com/LightEnding/autoSpire
- Reference commit: `13c5ed1e567313219061716699e4d0ad318e9d17`
- Commit date: 2026-08-10
- Observed version: `0.1.3`
- License: MIT (`LICENSE` present at the reference commit)
- Files inspected so far:
  - `LICENSE`
  - `autoSpire.json`
  - `autoSpire.csproj`
  - `scripts/Entry.cs`
  - repository tree showing `scripts/core/GameHookServer.cs` and `scripts/core/GameStateSnapshot.cs`

Relevant concepts:

- DLL-only STS2 mod (`has_pck=false`);
- `Godot.NET.Sdk/4.5.1` + `net9.0` baseline;
- native `[ModInitializer]` entry point;
- embedded localhost service architecture;
- separation between game-thread state/action work and external control requests;
- later reference target for combat/map/reward/shop/event state and action patterns.

Reuse status at M1: **no source copied into OfficeSpire**. The project structure is independently implemented. If later work adapts substantial MIT-licensed source, the required copyright/license notice will be retained.

## Alchyr/ModTemplate-StS2

- Repository: https://github.com/Alchyr/ModTemplate-StS2
- Reference commit: `55ca2c606e6c78dd39689a5cf979b243a49652e7`
- Commit date: 2026-08-22
- Files inspected:
  - `content/ModTemplate/ModTemplate.json`
  - `content/ModTemplate/ModTemplate.csproj`
  - `content/ModTemplate/ModTemplateCode/MainFile.cs`
- License status: no repository-root `LICENSE` file was observed in the inspected tree at this reference. Treat source as **reference-only unless licensing is clarified**.

Relevant facts/patterns observed:

- `Godot.NET.Sdk/4.5.1`;
- `net9.0`;
- references to game-provided `sts2.dll` and `0Harmony.dll`;
- `[ModInitializer]` plus Harmony `PatchAll(assembly)`;
- manifest fields including `min_game_version`, `has_pck`, `has_dll`, `dependencies`, and `affects_gameplay`.

Reuse status at M1: **no source copied**. OfficeSpire uses an independently written project file and local path configuration.

## S0ul3r/BoberInSpire

- Repository: https://github.com/S0ul3r/BoberInSpire
- Reference commit: `67263f2a7328783bbce201a064a90565f6a1447e`
- Commit date: 2026-05-24
- Files inspected:
  - `README.md`
  - repository tree containing `overlay-ui/`, `overlay-ui/src-tauri/`, and the STS2 example mod
- License status: no `LICENSE` file was observed in the repository tree at this reference. Treat source as **concept/reference-only**.

Relevant concepts confirmed by its README:

- STS2 C# mod exporting live state;
- a bridge feeding a React + Tauri overlay;
- semi-transparent, always-on-top window;
- drag, resize and persisted transparency/settings;
- WebSocket-based overlay updates.

OfficeSpire intentionally does **not** copy BoberInSpire code. It uses the independently common architecture of a local game adapter feeding a desktop overlay, and plans to remove the extra Python bridge from its own design.

## Licensing rule

Before copying or adapting source from any upstream project:

1. verify the license at the exact referenced commit;
2. record the exact source file and commit here;
3. preserve required notices/attribution;
4. prefer independent implementation when license status is absent or unclear.
