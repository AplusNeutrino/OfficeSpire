# Startup diagnostics

This document exists because a complete STS2 log from 2026-09-14 contained no OfficeSpire startup lines.

## Fix applied

The initial OfficeSpire manifest used `version: 0.6.0-alpha.1`. Current community STS2 modding documentation states that manifest versions must use exactly three numeric semantic-version segments (`X.X.X`). The manifest now uses `0.6.0` and `min_game_version: 0.107.1`.

Startup is also instrumented stage-by-stage. If the initializer runs, OfficeSpire now attempts to write diagnostics both to the game log/console and to:

```text
%APPDATA%\SlayTheSpire2\OfficeSpire\startup.log
```

Expected stages:

```text
initializer_enter
assembly_resolved
harmony_ready
 godot_script_bridge_ready
runtime_ready
m3_adapter_attached
initializer_complete
```

A stage ending in `:FAIL` records the exception type/message and stack trace. Startup diagnostics are best-effort and are deliberately prevented from aborting the game.

## Interpretation

- No OfficeSpire lines and no `startup.log`: the mod initializer was not entered; inspect manifest discovery, enablement, and deployed files.
- `initializer_enter` exists but later stage fails: the loader found the mod; investigate the first `:FAIL` stage.
- `runtime_ready` exists: loopback transport started and `session.json` should exist.
- `m3_adapter_attached` exists: the read-only STS2 adapter attached; combat-state validation can begin.
