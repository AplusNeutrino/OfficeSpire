# M8 Runtime Probes

These procedures collect evidence for M8 without automating or replaying game actions. They do not turn source, compilation, mocks, or log analysis into `runtime_pass`; a maintainer must perform and record each observation in [RUNTIME_VALIDATION.md](RUNTIME_VALIDATION.md).

## Passive revision and pending analysis

1. Deploy a known OfficeSpire commit to a Windows STS2 installation.
2. Start STS2 and operate one ordinary run manually through the original UI or OfficeSpire.
3. Include rapid UI actions, combat settlement, room transitions, disconnect/reconnect, victory or defeat, and any available death-prevention edge.
4. Close STS2 so the log is no longer being written.
5. From `src/OfficeSpire.Overlay`, run:

```powershell
npm run analyze:runtime -- `
  "$env:APPDATA\SlayTheSpire2\OfficeSpire\runtime.log" `
  --output m8-runtime-analysis.json
```

The analyzer is read-only. It reports:

- revision regressions;
- phase changes that reused a revision;
- observed `pending=true -> pending=false` cycles and whether revision advanced;
- a final unresolved pending state;
- phases represented in the evidence.

The JSON always includes `requires_manual_runtime_judgment=true`. A clean report is supporting evidence, not a runtime pass by itself.
The command exits with code `2` when it finds an invariant warning or a final unresolved pending state, while still writing the requested report for diagnosis.

## Main-thread race probe

Use one deliberate player action at a time. Never script repeated action submissions. For each action, record the request ID, accepted revision, visible game effect, final revision, and final pending state. To exercise the narrow second-CAS window safely:

1. Capture a settled state and its revision.
2. Change the decision through the original STS2 UI.
3. Submit exactly one request carrying the now-stale revision.
4. Confirm `stale_state` or `bad_phase`, no second game mutation, and no stuck `action_pending`.

Do not retry an ambiguous or timed-out request. First inspect the authoritative game state and request status. If execution cannot be determined, stop the probe and retain the logs.

## Evidence required for promotion

Record the exact OfficeSpire commit, Mod/Overlay versions, STS2 version and game commit, OS, procedure, request IDs, relevant log extract, analyzer JSON, observed UI result, and limitations. Promote only the capability actually observed.
