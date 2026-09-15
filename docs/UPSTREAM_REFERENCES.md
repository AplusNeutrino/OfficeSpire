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

### M4 action reference

Before implementing M4, the same exact reference commit was rechecked for current action and threading patterns in `scripts/core/GameHookServer.cs`.

Observed STS2 API patterns:

- background transport work hands mutation requests to a `ConcurrentQueue`, with Godot/main-thread code executing them;
- untargeted/targeted card plays create `PlayCardAction(card, target)` and submit it through `RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(...)`;
- end turn creates `EndPlayerTurnAction(player, combatState.RoundNumber)` and submits it through the same synchronizer;
- potion use can call the potion model's `EnqueueManualUse(target)` normal game path;
- target resolution uses current `CombatId` values and current combat state, not stale transport-side object references.

OfficeSpire independently implements its own `ActionInbox`, WebSocket lifecycle, revision CAS checks, target parser and `M4GameAdapter`; it does not copy autoSpire's HTTP server, request/result models, multi-action logic or source layout.

### M6 map reference

The same exact reference commit was inspected for map-state and native-selection API shapes. Confirmed interfaces include `IRunState.Map`, `CurrentMapPoint`, `MapPoint.Children`, `startMapPoints`, `MapCoord`, `MapVote`, and `VoteForMapCoordAction`. OfficeSpire independently implements a smaller versioned snapshot and action path with its own two-stage revision and reachability checks.

### M7 reward reference

The same exact reference commit was inspected for reward overlay API shapes. Confirmed interfaces include `NOverlayStack`, `NRewardsScreen`, `NRewardButton`, `NCardRewardSelectionScreen`, `NCardHolder`, and `NProceedButton`. OfficeSpire independently implements versioned reward DTOs, revision gates, and a limited reward-only dispatcher; generic selection and later room actions were not copied or enabled.

The M7.3 inspection additionally confirmed the `NChooseACardSelectionScreen` + `NGridCardHolder` selection signal shape. OfficeSpire enables only that single-click prompt family in this pass; other grid/hand selectors remain separated because their confirmation semantics differ.

A subsequent M7.3 pass confirmed the distinct `NDeckUpgradeSelectScreen` confirm control, `NDeckCardSelectScreen` preview confirmation, and `NPlayerHand` selection fields/control used by the exact reference commit. These version-sensitive fields remain runtime-unverified and fail closed when unavailable.

### M7 event reference

The same exact reference commit was inspected for `NEventRoom`, its current `EventModel`, `CurrentOptions`, `OptionButtonClicked`, and `Proceed` API shapes. OfficeSpire independently implements a smaller event DTO and dispatcher with its existing revision/inbox lifecycle; hover previews are deferred rather than inferred.

### M7 rest-site reference

The same exact reference commit was inspected for `NRestSiteRoom.Options`, `NRestSiteButton`, `ProceedButton`, and target-selection detection. OfficeSpire independently implements the ordinary option/leave paths and deliberately omits target dispatch until stable player identity can be carried through the protocol.

### M7 treasure reference

The same exact reference commit was inspected for `NTreasureRoom`, its chest/picking fields, `TreasureRoomRelicSynchronizer`, local pick/skip methods, and native chest/proceed controls. OfficeSpire independently separates these into revision-guarded protocol actions and does not auto-chain opening with relic voting.

### M7 shop reference

The same exact reference commit was inspected for merchant inventory entries, category lists, stock/affordability, `OnTryPurchaseWrapper`, `NMerchantCardRemoval`, inventory/back controls, and the proceed path. OfficeSpire independently exposes a flat typed inventory, invokes purchases without synchronously blocking the main thread, and delegates removal selection to its existing card-selection protocol.

## leetingo/spirescry

- Repository: https://github.com/leetingo/spirescry
- Reference commit: `cc1629845d1ed35ea03abc28adf7b35dfa5dcd8d`
- Commit date: 2026-07-28
- License: MIT

Files inspected during the M3 revision-stability investigation:

- `LICENSE`
- `README.md`
- `src/State/Signals.cs`
- `src/State/Settlement.cs`
- `src/State/LiveSettlement.cs`
- `src/State/DecisionProjection.cs`
- `src/State/Snapshotter.cs`

Additional M4 inspection:

- `src/Actions/Dispatcher.cs`

### Revision-stability reference

OfficeSpire used spirescry as an architectural reference after two runtime probes showed that hashing the entire rendered protocol snapshot and adding fixed-time debounce was the wrong abstraction for a decision revision.

Concepts used as references:

- separate stable/typed decision semantics from localized rich presentation fields;
- consult native engine execution state such as `ActionExecutor.CurrentlyRunningAction` when deciding whether a decision boundary has settled;
- require multiple consecutive identical GUI decision frames rather than relying on an arbitrary millisecond quiet period;
- keep transport snapshots rich while using a smaller semantic projection for replay/stale-action identity.

OfficeSpire's semantic fingerprint and revision state machine are independently written for its own DTO/protocol model. Spirescry's HTTP/CLI/headless implementation and source code were not copied.

### M4 dispatcher reference

`src/Actions/Dispatcher.cs` was inspected to cross-check runtime gates and target semantics against another current STS2 implementation.

Observed concepts:

- combat actions re-check current phase/side and `CombatManager.PlayerActionsDisabled` immediately before mutation;
- card playability is checked from the live card rather than assumed from an earlier snapshot;
- enemy-targeted actions resolve against current living enemy combat IDs;
- when exactly one legal enemy exists, an implementation may safely auto-target it; otherwise an explicit target is required;
- an accepted action should be followed until a later authoritative decision boundary rather than treated as complete when merely enqueued.

Spirescry's `DecisionSurface`, settlement module, and headless support were **not copied**. For the M8 potion pass, commit `cc1629845d1ed35ea03abc28adf7b35dfa5dcd8d` was inspected to verify the native `DiscardPotionGameAction(run.Player, slot, inCombat)` plus `ActionQueueSynchronizer` path. OfficeSpire independently integrates that API behind its existing revision, main-thread, and settlement guards.

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
