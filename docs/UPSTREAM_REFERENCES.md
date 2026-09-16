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

For the M8 presentation-text pass, `src/State/RichText.cs` at this exact commit was inspected to confirm STS2's Godot `[img]res://...[/img]` icon form and the value of readable icon substitutions. OfficeSpire independently implements a narrower plain-text protocol boundary plus a defensive client pass; no upstream code was copied.

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

For M8 run-end observation, the same commit was inspected for its `PhaseDetector`, `Snapshotter`, and `RunOutcomeRules`. It confirmed that a visible native game-over surface should gate the public terminal phase, and that abandonment, the current room's victory signal, and recorded win time distinguish outcomes. OfficeSpire independently implements a smaller read-only lifecycle snapshot and deliberately exposes no post-run action.

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
- dependency entries containing a stable `id` and `min_version`; OfficeSpire currently uses no external Mod framework and therefore retains an empty dependency list.

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

## Gennadiyev/STS2MCP

- Repository: https://github.com/Gennadiyev/STS2MCP
- Observed release commits: `f961c7a` (`0.3.5-rc1`) and `59ddb7e` (`0.3.4`)
- M9.2 source-inspection commit: `55e064850a68f3b4cde7e5fd525bf9b2dec4e885`
- Observed game compatibility claim: STS2 `v0.99.1`
- License shown by the repository: MIT; exact source reuse still requires a pinned full-commit license check.

M9 planning evidence:

- the project exposes detailed single-player and multiplayer state/actions over localhost, supporting the feasibility of a complete external control surface;
- release `0.3.5-rc1` specifically calls out Necrobinder companion HP/block/status state, showing that character-specific entities belong in the information contract;
- release `0.3.4` documents multiplayer state-shape changes and deliberately omits other players' relics, hands and potions, so OfficeSpire must specify privacy/authority boundaries instead of assuming solo parity;
- the same releases report rest/event option-index mismatch fixes, multiplayer merchant routing, and lobby API breakage on newer game versions, reinforcing OfficeSpire's stable-ID, installed-version inventory, and fail-closed requirements;
- the project's stated future meta-controls include starting/quitting runs and multiplayer hosting/joining, but those claims are not treated as a stable game API or copied implementation.

No STS2MCP source was copied in this pass. OfficeSpire's M9 plan and player-information implementation remain independent.

At the M9.2 inspection commit, `McpMod.StateBuilder.cs` confirmed current access shapes for `Player.Character`, Regent `PlayerCombatState.Stars`, Defect `OrbQueue`, and Necrobinder `GetPet<Osty>()`. The source also explicitly treats Byrdpip and PaelsLegion as cosmetic rather than real combat-state entities. OfficeSpire uses these findings only to select authoritative native models and independently defines its DTOs, validation, normalization and React rendering.

The same inspection confirmed `CardModel.GetDescriptionForPile(PileType)` for pile-context text and the three live `PlayerCombatState` pile collections. The independently reviewed autoSpire commit already recorded above confirmed `player.Deck.Cards` as the authoritative run deck. OfficeSpire preserves individual card/upgrade entries rather than adopting autoSpire's ID-only grouping.

For M9.3–M9.5, the same STS2MCP inspection commit identifies the current native screen/control families `NMainMenu`, `NSingleplayerSubmenu`, `NMultiplayerSubmenu`, `NMultiplayerHostSubmenu`, `NJoinFriendScreen`, `NMultiplayerLoadGameScreen`, `NProfileScreen`, `NVerticalPopup`, `NCharacterSelectScreen`, and `NCharacterSelectButton`. It also confirms `SaveManager.CurrentProfileId` and the character-model starting HP/gold/energy, relic and deck properties. OfficeSpire uses these shapes only for independent read-only observation, emits a generic popup rather than guessing its purpose, and does not adopt STS2MCP's menu mutation paths.

For the later M9.6 saved-run/error slice, `SerializableRun`, `SerializablePlayer`, `LoadRunLobby`, `NMultiplayerLoadGameScreen`, `NVerticalPopup` and `NErrorPopup` were cross-checked against `zhiyue/sts2-rl-agent` commit `1b7e7ce35e608722650763938c153ea8bc370333`. These sources establish the native saved-player IDs/state, connected-player set, missing-player confirmation boundary and localized error-popup container. OfficeSpire independently observes those fields and deliberately omits every load, reconnect, continue-without-peer and popup mutation.

The M9.6 in-run party slice additionally inspected `RunLobby`, `RunManager`, `IRunState`, `RunState`, `Player` and `NInvitePlayersButton` at that same pinned commit. `RunLobby` maintains the authoritative connected-ID set, limits rejoin to an existing run player, and converts host abandonment into run abandonment; `NInvitePlayersButton` delegates availability and the actual platform dialog to STS2. OfficeSpire therefore displays invite availability and party connectivity without opening dialogs, reconnecting peers, replaying actions or claiming unsupported host migration.

## zhiyue/sts2-rl-agent decompiled API reference

- Repository: https://github.com/zhiyue/sts2-rl-agent
- Reference commit: `1b7e7ce35e608722650763938c153ea8bc370333`
- Files inspected:
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect/NCharacterSelectScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CustomRun/NCustomRunScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.DailyRun/NDailyRunScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NJoinFriendScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NJoinFriendButton.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NMultiplayerHostSubmenu.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect/NMultiplayerLoadGameScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.Lobby/StartRunLobby.cs`
  - `decompiled/MegaCrit.Sts2.Core.Multiplayer.Game.Lobby/LoadRunLobby.cs`
  - `decompiled/MegaCrit.Sts2.Core.Models/ModifierModel.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NCardGridSelectionScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NChooseACardSelectionScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NDeckCardSelectScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NDeckUpgradeSelectScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NSimpleCardSelectScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NDeckTransformSelectScreen.cs`
  - `decompiled/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NDeckEnchantSelectScreen.cs`
- License/copyright status: decompiled game material; used only to inventory public runtime type/property names. No source or control flow was copied.

For M9.4–M9.6, these files confirm that Standard, Custom and Daily setup converge on `StartRunLobby`, whose read-only properties include `GameMode`, `Ascension`, `MaxAscension`, `Seed`, `DailyTime`, `Modifiers`, `Act1`, `NetService`, `MaxPlayers`, `LocalPlayer` and `Players`. `LobbyPlayer` supplies network ID, slot, character and Ready state. The inspected client contract does not directly identify which remote network ID owns the host role, so OfficeSpire deliberately leaves client-side host attribution unknown. OfficeSpire independently reflects these values and adds no setup or lobby mutation.

The same reference identifies join discovery through visible `NJoinFriendButton.PlayerId` values, asynchronous loading overlays on join/host screens, and saved-run readiness through `LoadRunLobby.ConnectedPlayerIds` plus its serialized player roster. It also shows that joining an already running session throws an explicit not-implemented path in this inspected game build; OfficeSpire therefore does not advertise active-run rejoin support.

For the M9.7 card-selection audit, the same pinned source confirms that `NCardGridSelectionScreen` is an abstract shell whose subclasses own different `OnCardClicked`, preview, confirmation and cancellation flows. OfficeSpire uses this only as an API inventory: it independently classifies the two already-modeled deck-card/upgrade paths and fails all other subclasses closed. No decompiled control flow was copied.

## Licensing rule

Before copying or adapting source from any upstream project:

1. verify the license at the exact referenced commit;
2. record the exact source file and commit here;
3. preserve required notices/attribution;
4. prefer independent implementation when license status is absent or unclear.
