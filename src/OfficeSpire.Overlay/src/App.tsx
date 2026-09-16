import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type {
  ActionResponse,
  CardState,
  CardSelectionStateSnapshot,
  EventOptionState,
  EventStateSnapshot,
  SpecialEventCellState,
  SpecialEventStateSnapshot,
  RestOptionState,
  RestStateSnapshot,
  TreasureRelicState,
  TreasureStateSnapshot,
  ShopItemState,
  ShopStateSnapshot,
  CombatStateSnapshot,
  ConnectionStatus,
  EnemyState,
  OverlayAction,
  StateSnapshot,
  MapNodeState,
  MapStateSnapshot,
  PotionState,
  RewardCardState,
  RewardItemState,
  RewardsStateSnapshot,
  LifecycleStateSnapshot,
  MenuStateSnapshot,
  MenuOptionState,
} from "./types";
import {
  createEndTurnAction,
  createPlayCardAction,
  createChooseMapNodeAction,
  createRewardAction,
  createSkipRewardsAction,
  createCardOptionAction,
  createConfirmCardSelectionAction,
  createEventOptionAction,
  createSpecialEventCellAction,
  createSpecialEventToolAction,
  createProceedSpecialEventAction,
  createRestOptionAction,
  createLeaveRestSiteAction,
  createTreasureAction,
  createTreasureRelicAction,
  createShopAction,
  createBuyShopItemAction,
  createUsePotionAction,
  createDiscardPotionAction,
  createMenuOptionAction,
  createRunAscensionAction,
  createCustomSeedAction,
  createRunEndAction,
} from "./actions/actionDispatcher";
import { resolveCombatShortcut } from "./actions/combatKeyboard";
import { resolveRunShortcut } from "./actions/runKeyboard";
import { CombatPanel } from "./components/CombatPanel";
import { MapPanel } from "./components/MapPanel";
import { RewardsPanel } from "./components/RewardsPanel";
import { CardSelectionPanel } from "./components/CardSelectionPanel";
import { EventPanel } from "./components/EventPanel";
import { SpecialEventPanel } from "./components/SpecialEventPanel";
import { RestPanel } from "./components/RestPanel";
import { TreasurePanel } from "./components/TreasurePanel";
import { PartyPanel } from "./components/PartyPanel";
import { ShopPanel } from "./components/ShopPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { LifecyclePanel } from "./components/LifecyclePanel";
import { OfficeSpireWebSocketClient } from "./network/WebSocketClient";
import { discoverSession } from "./network/session";
import { ReconnectController } from "./network/reconnect";
import {
  ACTION_TIMEOUT_MS,
  clientTimeoutResult,
} from "./network/actionLifecycle";
import { loadSettings, saveSettings, type OverlaySettings } from "./settings";
import { shouldMoveDecisionFocus } from "./accessibility/focusPolicy";
const terminalCodes = new Set([
  "completed",
  "stale_state",
  "no_effect",
  "bad_request",
  "bad_phase",
  "bad_index",
  "bad_target",
  "unreachable_node",
  "option_locked",
  "unsupported_state",
  "out_of_stock",
  "insufficient_gold",
  "not_playable",
  "not_ready",
  "action_pending",
  "dispatch_exception",
  "unknown_request",
  "ownership_error",
  "timeout",
  "client_timeout",
]);
export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>("discovering");
  const [snapshot, setSnapshot] = useState<StateSnapshot>();
  const [message, setMessage] = useState(
    "Looking for the OfficeSpire session…",
  );
  const [actionResult, setActionResult] = useState<ActionResponse>();
  const [selectedCard, setSelectedCard] = useState<CardState>();
  const [selectedPotion, setSelectedPotion] = useState<PotionState>();
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const clientRef = useRef<OfficeSpireWebSocketClient | undefined>(undefined);
  const retryRef = useRef<number | undefined>(undefined);
  const pollRef = useRef<number | undefined>(undefined);
  const actionTimeoutRef = useRef<number | undefined>(undefined);
  const activeRequestRef = useRef<string | undefined>(undefined);
  const stoppedRef = useRef(false);
  const revisionRef = useRef<number | undefined>(undefined);
  const reconnectRef = useRef(new ReconnectController());
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const decisionSurfaceRef = useRef<HTMLDivElement>(null);
  const previousPhaseRef = useRef<string | undefined>(undefined);
  const clearPoll = useCallback(() => {
    if (pollRef.current !== undefined) window.clearInterval(pollRef.current);
    pollRef.current = undefined;
  }, []);
  const clearActionTracking = useCallback(() => {
    clearPoll();
    if (actionTimeoutRef.current !== undefined)
      window.clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = undefined;
    activeRequestRef.current = undefined;
  }, [clearPoll]);
  const handleActionResult = useCallback(
    (result: ActionResponse) => {
      if (
        activeRequestRef.current !== undefined &&
        result.request_id !== activeRequestRef.current
      )
        return;
      setActionResult(result);
      setMessage(result.message);
      if (terminalCodes.has(result.code) || !result.accepted)
        clearActionTracking();
      else if (pollRef.current === undefined)
        pollRef.current = window.setInterval(
          () => clientRef.current?.requestActionStatus(result.request_id),
          150,
        );
    },
    [clearActionTracking],
  );
  const scheduleReconnect = useCallback((retry: () => void) => {
    if (retryRef.current !== undefined) window.clearTimeout(retryRef.current);
    retryRef.current = window.setTimeout(
      retry,
      reconnectRef.current.nextDelay(),
    );
  }, []);
  const connect = useCallback(async () => {
    if (stoppedRef.current) return;
    setStatus((s) => (s === "disconnected" ? "reconnecting" : "discovering"));
    try {
      const session = await discoverSession();
      if (stoppedRef.current) return;
      setStatus("connecting");
      setMessage(`Connecting to STS2 process ${session.process_id}…`);
      clientRef.current?.connect(session);
    } catch (error) {
      setStatus("disconnected");
      setMessage(
        error instanceof Error ? error.message : "Session discovery failed.",
      );
      scheduleReconnect(() => void connect());
    }
  }, [scheduleReconnect]);
  useEffect(() => {
    stoppedRef.current = false;
    clientRef.current = new OfficeSpireWebSocketClient({
      onOpen: () => {
        reconnectRef.current.reset();
        setStatus("connected");
        setMessage("Live connection established.");
      },
      onClose: (reason) => {
        clearActionTracking();
        setStatus("disconnected");
        setMessage(reason);
        scheduleReconnect(() => void connect());
      },
      onSnapshot: (next) => {
        if (
          revisionRef.current !== undefined &&
          revisionRef.current !== next.state_revision
        ) {
          setSelectedCard(undefined);
          setSelectedPotion(undefined);
        }
        revisionRef.current = next.state_revision;
        setSnapshot(next);
      },
      onActionResult: handleActionResult,
      onError: setMessage,
      onIncompatible: (version) => {
        setStatus("incompatible");
        setMessage(`Protocol mismatch: overlay=1, backend=${version}.`);
      },
    });
    void connect();
    return () => {
      stoppedRef.current = true;
      if (retryRef.current !== undefined) window.clearTimeout(retryRef.current);
      clearPoll();
      clearActionTracking();
      clientRef.current?.disconnect();
    };
  }, [
    clearActionTracking,
    clearPoll,
    connect,
    handleActionResult,
    scheduleReconnect,
  ]);
  const submit = (action: OverlayAction) => {
    setSelectedCard(undefined);
    setSelectedPotion(undefined);
    setActionResult(undefined);
    setMessage(`Sending ${action.action}…`);
    clearActionTracking();
    activeRequestRef.current = action.request_id;
    actionTimeoutRef.current = window.setTimeout(() => {
      if (activeRequestRef.current !== action.request_id) return;
      const result = clientTimeoutResult(
        action.request_id,
        revisionRef.current ?? action.expected_revision,
      );
      clearActionTracking();
      setActionResult(result);
      setMessage(result.message);
    }, ACTION_TIMEOUT_MS);
    if (!clientRef.current?.sendAction(action)) {
      clearActionTracking();
      setMessage("Action blocked: backend is not connected.");
    }
  };
  const chooseCard = (card: CardState) => {
    if (!snapshot) return;
    if (card.needs_target) {
      setSelectedCard(card);
      return;
    }
    submit(
      createPlayCardAction(card.hand_index, card.id, snapshot.state_revision),
    );
  };
  const choosePotion = (potion: PotionState) => {
    if (snapshot?.phase !== "combat") return;
    if (potion.needs_target) {
      setSelectedPotion(potion);
      return;
    }
    submit(
      createUsePotionAction(
        potion.slot_index,
        potion.id,
        snapshot.state_revision,
      ),
    );
  };
  const discardPotion = (potion: PotionState) => {
    if (
      snapshot?.phase === "combat" &&
      window.confirm(`Discard ${potion.name}? This cannot be undone.`)
    )
      submit(
        createDiscardPotionAction(
          potion.slot_index,
          potion.id,
          snapshot.state_revision,
        ),
      );
  };
  const chooseTarget = (enemy: EnemyState) => {
    if (!snapshot) return;
    if (selectedCard)
      submit(
        createPlayCardAction(
          selectedCard.hand_index,
          selectedCard.id,
          snapshot.state_revision,
          enemy.combat_id,
        ),
      );
    else if (selectedPotion)
      submit(
        createUsePotionAction(
          selectedPotion.slot_index,
          selectedPotion.id,
          snapshot.state_revision,
          enemy.combat_id,
        ),
      );
  };
  const chooseMapNode = (node: MapNodeState) => {
    if (snapshot?.phase === "map") {
      const state = snapshot as MapStateSnapshot;
      submit(
        createChooseMapNodeAction(
          node.column,
          node.row,
          node.stable_id,
          state.screen.map_generation,
          state.state_revision,
        ),
      );
    }
  };
  const chooseReward = (reward: RewardItemState) => {
    if (snapshot?.phase === "rewards")
      submit(
        createRewardAction(
          "choose_reward",
          reward.choice_index,
          snapshot.state_revision,
          undefined,
          reward.action_token,
        ),
      );
  };
  const chooseRewardCard = (card: RewardCardState) => {
    if (snapshot?.phase === "rewards")
      submit(
        createRewardAction(
          "choose_reward_card",
          card.choice_index,
          snapshot.state_revision,
          card.id,
        ),
      );
  };
  const chooseCardOption = (card: RewardCardState) => {
    if (snapshot?.phase === "card_selection")
      submit(
        createCardOptionAction(
          card.choice_index,
          card.id,
          snapshot.state_revision,
        ),
      );
  };
  const chooseEventOption = (option: EventOptionState) => {
    if (snapshot?.phase === "event")
      submit(
        createEventOptionAction(
          option.option_index,
          option.action_token,
          snapshot.state_revision,
        ),
      );
  };
  const chooseSpecialEventCell = (cell: SpecialEventCellState) => {
    if (snapshot?.phase === "special_event")
      submit(
        createSpecialEventCellAction(
          cell.x,
          cell.y,
          cell.stable_id,
          snapshot.state_revision,
        ),
      );
  };
  const chooseRestOption = (option: RestOptionState) => {
    if (snapshot?.phase === "rest")
      submit(
        createRestOptionAction(
          option.option_index,
          option.id,
          snapshot.state_revision,
        ),
      );
  };
  const chooseTreasureRelic = (relic: TreasureRelicState) => {
    if (snapshot?.phase === "treasure")
      submit(
        createTreasureRelicAction(
          relic.choice_index,
          relic.id,
          snapshot.state_revision,
        ),
      );
  };
  const buyShopItem = (item: ShopItemState) => {
    if (snapshot?.phase === "shop")
      submit(
        createBuyShopItemAction(
          item.category,
          item.item_index,
          item.item_id,
          snapshot.state_revision,
        ),
      );
  };
  const chooseMenuOption = (option: MenuOptionState) => {
    if (snapshot?.phase !== "menu" || !option.actionable || !option.enabled)
      return;
    const menuSnapshot = snapshot as MenuStateSnapshot;
    submit(
      createMenuOptionAction(
        menuSnapshot.screen.menu_screen,
        option.id,
        menuSnapshot.state_revision,
      ),
    );
  };
  const actionInFlight = !!(
    actionResult &&
    actionResult.accepted &&
    !terminalCodes.has(actionResult.code)
  );
  const disabled =
    settingsOpen ||
    status !== "connected" ||
    !snapshot ||
    snapshot.action_pending ||
    actionInFlight;
  const updateSettings = (next: OverlaySettings) => {
    setSettings(next);
    saveSettings(next);
  };
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  useEffect(() => {
    const nextPhase = snapshot?.phase;
    if (
      shouldMoveDecisionFocus(previousPhaseRef.current, nextPhase, settingsOpen)
    ) {
      decisionSurfaceRef.current?.focus();
    }
    previousPhaseRef.current = nextPhase;
  }, [settingsOpen, snapshot?.phase]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        snapshot?.phase !== "combat"
      )
        return;
      const combatSnapshot = snapshot as CombatStateSnapshot;

      const command = resolveCombatShortcut(
        event.code,
        event.shiftKey,
        !!selectedCard || !!selectedPotion,
      );
      if (!command) return;

      if (command.kind === "cancel") {
        setSelectedCard(undefined);
        setSelectedPotion(undefined);
        event.preventDefault();
        return;
      }
      if (disabled) return;

      if (command.kind === "end_turn") {
        if (
          combatSnapshot.screen.waiting_for_input &&
          combatSnapshot.screen.is_play_phase
        )
          submit(createEndTurnAction(combatSnapshot.state_revision));
      } else if (command.kind === "card") {
        const card = combatSnapshot.screen.hand.find(
          (candidate) => candidate.hand_index === command.index,
        );
        if (card?.can_play) chooseCard(card);
      } else if (command.kind === "potion") {
        const potion = combatSnapshot.screen.potions.find(
          (candidate) => candidate.slot_index === command.index,
        );
        if (potion?.can_use) choosePotion(potion);
      } else {
        const validIds =
          selectedCard?.valid_target_ids ??
          selectedPotion?.valid_target_ids ??
          [];
        const enemy = combatSnapshot.screen.enemies.filter(
          (candidate) =>
            candidate.is_alive && validIds.includes(candidate.combat_id),
        )[command.index];
        if (enemy) chooseTarget(enemy);
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, selectedCard, selectedPotion, snapshot]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        !snapshot ||
        snapshot.phase === "combat" ||
        disabled
      )
        return;
      const command = resolveRunShortcut(event.code);
      if (!command) return;

      let handled = false;
      if (snapshot.phase === "map" && command.kind === "choice") {
        const state = snapshot as MapStateSnapshot;
        const node = state.screen.reachable_nodes[command.index];
        if (state.screen.waiting_for_input && node) {
          chooseMapNode(node);
          handled = true;
        }
      } else if (snapshot.phase === "rewards") {
        const state = snapshot as RewardsStateSnapshot;
        if (command.kind === "choice" && state.screen.waiting_for_input) {
          const choice =
            state.screen.mode === "card_selection"
              ? state.screen.card_choices[command.index]
              : state.screen.items[command.index];
          if (choice) {
            if (state.screen.mode === "card_selection")
              chooseRewardCard(choice as RewardCardState);
            else chooseReward(choice as RewardItemState);
            handled = true;
          }
        } else if (command.kind === "skip" && state.screen.can_skip) {
          submit(createSkipRewardsAction(snapshot.state_revision));
          handled = true;
        }
      } else if (snapshot.phase === "card_selection") {
        const state = snapshot as CardSelectionStateSnapshot;
        if (command.kind === "choice" && state.screen.waiting_for_input) {
          const card = state.screen.options[command.index];
          if (card) {
            chooseCardOption(card);
            handled = true;
          }
        } else if (command.kind === "confirm" && state.screen.can_confirm) {
          submit(createConfirmCardSelectionAction(snapshot.state_revision));
          handled = true;
        }
      } else if (snapshot.phase === "event" && command.kind === "choice") {
        const state = snapshot as EventStateSnapshot;
        const option = state.screen.options.filter(
          (candidate) => !candidate.is_locked,
        )[command.index];
        if (state.screen.waiting_for_input && option) {
          chooseEventOption(option);
          handled = true;
        }
      } else if (snapshot.phase === "rest") {
        const state = snapshot as RestStateSnapshot;
        if (command.kind === "choice" && state.screen.waiting_for_input) {
          const option = state.screen.options[command.index];
          if (option) {
            chooseRestOption(option);
            handled = true;
          }
        } else if (command.kind === "leave" && state.screen.can_proceed) {
          submit(createLeaveRestSiteAction(snapshot.state_revision));
          handled = true;
        }
      } else if (snapshot.phase === "treasure") {
        const state = snapshot as TreasureStateSnapshot;
        if (command.kind === "choice" && state.screen.is_picking) {
          const relic = state.screen.relics[command.index];
          if (relic) {
            chooseTreasureRelic(relic);
            handled = true;
          }
        } else if (command.kind === "confirm" && !state.screen.chest_opened) {
          submit(
            createTreasureAction("open_treasure", snapshot.state_revision),
          );
          handled = true;
        } else if (command.kind === "leave" && state.screen.can_leave) {
          submit(
            createTreasureAction("leave_treasure", snapshot.state_revision),
          );
          handled = true;
        }
      } else if (snapshot.phase === "shop") {
        const state = snapshot as ShopStateSnapshot;
        if (command.kind === "choice" && state.screen.inventory_open) {
          const item = state.screen.items[command.index];
          if (item?.is_stocked && item.enough_gold) {
            buyShopItem(item);
            handled = true;
          }
        } else if (command.kind === "confirm" && !state.screen.inventory_open) {
          submit(createShopAction("open_shop", snapshot.state_revision));
          handled = true;
        } else if (
          command.kind === "remove" &&
          state.screen.card_removal_available &&
          state.screen.gold >= state.screen.card_removal_cost
        ) {
          submit(
            createShopAction("request_card_removal", snapshot.state_revision),
          );
          handled = true;
        } else if (command.kind === "leave" && state.screen.can_leave) {
          submit(createShopAction("leave_shop", snapshot.state_revision));
          handled = true;
        }
      }
      if (handled) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, snapshot]);
  return (
    <main
      className={`overlay${settings.highContrast ? " high-contrast" : ""}${settings.reduceMotion ? " reduce-motion" : ""}`}
      style={
        {
          "--overlay-opacity": settings.opacity,
          "--ui-scale": settings.scale,
          width: `${100 / settings.scale}%`,
          height: `${100 / settings.scale}%`,
          transform: `scale(${settings.scale})`,
        } as CSSProperties
      }
      data-tauri-drag-region
    >
      <div className="titlebar" data-tauri-drag-region>
        <strong>OfficeSpire</strong>
        <span className="title-actions">
          <span className={`status ${status}`}>{status}</span>
          <button
            ref={settingsButtonRef}
            className="settings-toggle"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="Overlay settings"
            aria-expanded={settingsOpen}
          >
            ⚙
          </button>
        </span>
      </div>
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={closeSettings}
          returnFocusRef={settingsButtonRef}
        />
      )}
      <div
        ref={decisionSurfaceRef}
        className="decision-surface"
        tabIndex={-1}
        aria-label={
          snapshot
            ? `${snapshot.phase.replace("_", " ")} controls`
            : "Connection status"
        }
      >
        {snapshot?.run.party && <PartyPanel party={snapshot.run.party} />}
        {!snapshot ? (
          <section className="empty">
            <h1>Waiting for STS2</h1>
            <p>{message}</p>
            <button onClick={() => void connect()}>Retry now</button>
          </section>
        ) : snapshot.phase === "combat" ? (
          <CombatPanel
            snapshot={snapshot as CombatStateSnapshot}
            disabled={disabled}
            selectedCard={selectedCard}
            selectedPotion={selectedPotion}
            onCard={chooseCard}
            onTarget={chooseTarget}
            onPotion={choosePotion}
            onDiscardPotion={discardPotion}
            onCancelTarget={() => {
              setSelectedCard(undefined);
              setSelectedPotion(undefined);
            }}
            onEndTurn={() =>
              submit(createEndTurnAction(snapshot.state_revision))
            }
          />
        ) : snapshot.phase === "map" ? (
          <MapPanel
            snapshot={snapshot as MapStateSnapshot}
            disabled={disabled}
            onChooseNode={chooseMapNode}
          />
        ) : snapshot.phase === "rewards" ? (
          <RewardsPanel
            snapshot={snapshot as RewardsStateSnapshot}
            disabled={disabled}
            onReward={chooseReward}
            onCard={chooseRewardCard}
            onSkip={() =>
              submit(createSkipRewardsAction(snapshot.state_revision))
            }
          />
        ) : snapshot.phase === "card_selection" ? (
          <CardSelectionPanel
            snapshot={snapshot as CardSelectionStateSnapshot}
            disabled={disabled}
            onCard={chooseCardOption}
            onConfirm={() =>
              submit(createConfirmCardSelectionAction(snapshot.state_revision))
            }
          />
        ) : snapshot.phase === "event" ? (
          <EventPanel
            snapshot={snapshot as EventStateSnapshot}
            disabled={disabled}
            onOption={chooseEventOption}
          />
        ) : snapshot.phase === "special_event" ? (
          <SpecialEventPanel
            snapshot={snapshot as SpecialEventStateSnapshot}
            disabled={disabled}
            onCell={chooseSpecialEventCell}
            onTool={(tool) =>
              submit(
                createSpecialEventToolAction(tool, snapshot.state_revision),
              )
            }
            onProceed={() =>
              submit(createProceedSpecialEventAction(snapshot.state_revision))
            }
          />
        ) : snapshot.phase === "rest" ? (
          <RestPanel
            snapshot={snapshot as RestStateSnapshot}
            disabled={disabled}
            onOption={chooseRestOption}
            onLeave={() =>
              submit(createLeaveRestSiteAction(snapshot.state_revision))
            }
          />
        ) : snapshot.phase === "treasure" ? (
          <TreasurePanel
            snapshot={snapshot as TreasureStateSnapshot}
            disabled={disabled}
            onOpen={() =>
              submit(
                createTreasureAction("open_treasure", snapshot.state_revision),
              )
            }
            onRelic={chooseTreasureRelic}
            onLeave={() =>
              submit(
                createTreasureAction("leave_treasure", snapshot.state_revision),
              )
            }
          />
        ) : snapshot.phase === "shop" ? (
          <ShopPanel
            snapshot={snapshot as ShopStateSnapshot}
            disabled={disabled}
            onOpen={() =>
              submit(createShopAction("open_shop", snapshot.state_revision))
            }
            onBuy={buyShopItem}
            onRemove={() =>
              submit(
                createShopAction(
                  "request_card_removal",
                  snapshot.state_revision,
                ),
              )
            }
            onLeave={() =>
              submit(createShopAction("leave_shop", snapshot.state_revision))
            }
          />
        ) : snapshot.phase === "menu" || snapshot.phase === "run_end" ? (
          <LifecyclePanel
            snapshot={snapshot as LifecycleStateSnapshot | MenuStateSnapshot}
            disabled={disabled}
            onOption={chooseMenuOption}
            onAscension={(ascension) => {
              if (
                snapshot.phase === "menu" &&
                (snapshot.screen.menu_screen === "character_select" ||
                  snapshot.screen.menu_screen === "custom_run")
              )
                submit(
                  createRunAscensionAction(
                    snapshot.screen.menu_screen,
                    ascension,
                    snapshot.state_revision,
                  ),
                );
            }}
            onSeed={(seed) => {
              if (
                snapshot.phase === "menu" &&
                snapshot.screen.menu_screen === "custom_run"
              )
                submit(createCustomSeedAction(seed, snapshot.state_revision));
            }}
            onRunEnd={(target) => {
              if (snapshot.phase === "run_end")
                submit(createRunEndAction(target, snapshot.state_revision));
            }}
          />
        ) : (
          <section className="empty">
            <h1>{snapshot.phase.replace("_", " ")}</h1>
            <p>This phase remains available through the original STS2 UI.</p>
          </section>
        )}
      </div>
      <aside
        className={`notice ${actionResult && !actionResult.accepted ? "failure" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>{message}</span>
        {snapshot && (
          <code>
            rev {snapshot.state_revision}
            {snapshot.action_pending ? " · pending" : ""}
          </code>
        )}
      </aside>
    </main>
  );
}
