import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActionResponse,
  CardState,
  CardSelectionStateSnapshot,
  EventOptionState,
  EventStateSnapshot,
  RestOptionState,
  RestStateSnapshot,
  CombatStateSnapshot,
  ConnectionStatus,
  EnemyState,
  OverlayAction,
  StateSnapshot,
  MapNodeState,
  MapStateSnapshot,
  RewardCardState,
  RewardItemState,
  RewardsStateSnapshot,
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
  createRestOptionAction,
  createLeaveRestSiteAction,
} from "./actions/actionDispatcher";
import { CombatPanel } from "./components/CombatPanel";
import { MapPanel } from "./components/MapPanel";
import { RewardsPanel } from "./components/RewardsPanel";
import { CardSelectionPanel } from "./components/CardSelectionPanel";
import { EventPanel } from "./components/EventPanel";
import { RestPanel } from "./components/RestPanel";
import { OfficeSpireWebSocketClient } from "./network/WebSocketClient";
import { discoverSession } from "./network/session";
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
  "not_playable",
  "not_ready",
  "action_pending",
  "dispatch_exception",
  "unknown_request",
]);
export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>("discovering");
  const [snapshot, setSnapshot] = useState<StateSnapshot>();
  const [message, setMessage] = useState(
    "Looking for the OfficeSpire session…",
  );
  const [actionResult, setActionResult] = useState<ActionResponse>();
  const [selectedCard, setSelectedCard] = useState<CardState>();
  const clientRef = useRef<OfficeSpireWebSocketClient | undefined>(undefined);
  const retryRef = useRef<number | undefined>(undefined);
  const pollRef = useRef<number | undefined>(undefined);
  const stoppedRef = useRef(false);
  const revisionRef = useRef<number | undefined>(undefined);
  const clearPoll = useCallback(() => {
    if (pollRef.current !== undefined) window.clearInterval(pollRef.current);
    pollRef.current = undefined;
  }, []);
  const handleActionResult = useCallback(
    (result: ActionResponse) => {
      setActionResult(result);
      setMessage(result.message);
      if (terminalCodes.has(result.code) || !result.accepted) clearPoll();
      else if (pollRef.current === undefined)
        pollRef.current = window.setInterval(
          () => clientRef.current?.requestActionStatus(result.request_id),
          150,
        );
    },
    [clearPoll],
  );
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
      retryRef.current = window.setTimeout(() => void connect(), 2000);
    }
  }, []);
  useEffect(() => {
    stoppedRef.current = false;
    clientRef.current = new OfficeSpireWebSocketClient({
      onOpen: () => {
        setStatus("connected");
        setMessage("Live connection established.");
      },
      onClose: (reason) => {
        setStatus("disconnected");
        setMessage(reason);
        retryRef.current = window.setTimeout(() => void connect(), 1500);
      },
      onSnapshot: (next) => {
        if (
          revisionRef.current !== undefined &&
          revisionRef.current !== next.state_revision
        )
          setSelectedCard(undefined);
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
      clientRef.current?.disconnect();
    };
  }, [clearPoll, connect, handleActionResult]);
  const submit = (action: OverlayAction) => {
    setSelectedCard(undefined);
    setActionResult(undefined);
    setMessage(`Sending ${action.action}…`);
    if (!clientRef.current?.sendAction(action))
      setMessage("Action blocked: backend is not connected.");
  };
  const chooseCard = (card: CardState) => {
    if (!snapshot) return;
    if (card.needs_target) {
      setSelectedCard(card);
      return;
    }
    submit(createPlayCardAction(card.hand_index, snapshot.state_revision));
  };
  const chooseTarget = (enemy: EnemyState) => {
    if (snapshot && selectedCard)
      submit(
        createPlayCardAction(
          selectedCard.hand_index,
          snapshot.state_revision,
          enemy.combat_id,
        ),
      );
  };
  const chooseMapNode = (node: MapNodeState) => {
    if (snapshot?.phase === "map")
      submit(
        createChooseMapNodeAction(
          node.column,
          node.row,
          snapshot.state_revision,
        ),
      );
  };
  const chooseReward = (reward: RewardItemState) => {
    if (snapshot?.phase === "rewards")
      submit(
        createRewardAction(
          "choose_reward",
          reward.choice_index,
          snapshot.state_revision,
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
        ),
      );
  };
  const chooseCardOption = (card: RewardCardState) => {
    if (snapshot?.phase === "card_selection")
      submit(
        createCardOptionAction(card.choice_index, snapshot.state_revision),
      );
  };
  const chooseEventOption = (option: EventOptionState) => {
    if (snapshot?.phase === "event")
      submit(
        createEventOptionAction(option.option_index, snapshot.state_revision),
      );
  };
  const chooseRestOption = (option: RestOptionState) => {
    if (snapshot?.phase === "rest")
      submit(
        createRestOptionAction(option.option_index, snapshot.state_revision),
      );
  };
  const actionInFlight = !!(
    actionResult &&
    actionResult.accepted &&
    !terminalCodes.has(actionResult.code)
  );
  const disabled =
    status !== "connected" ||
    !snapshot ||
    snapshot.action_pending ||
    actionInFlight;
  return (
    <main className="overlay" data-tauri-drag-region>
      <div className="titlebar" data-tauri-drag-region>
        <strong>OfficeSpire</strong>
        <span className={`status ${status}`}>{status}</span>
      </div>
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
          onCard={chooseCard}
          onTarget={chooseTarget}
          onCancelTarget={() => setSelectedCard(undefined)}
          onEndTurn={() => submit(createEndTurnAction(snapshot.state_revision))}
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
      ) : snapshot.phase === "rest" ? (
        <RestPanel
          snapshot={snapshot as RestStateSnapshot}
          disabled={disabled}
          onOption={chooseRestOption}
          onLeave={() =>
            submit(createLeaveRestSiteAction(snapshot.state_revision))
          }
        />
      ) : (
        <section className="empty">
          <h1>{snapshot.phase.replace("_", " ")}</h1>
          <p>This phase remains available through the original STS2 UI.</p>
        </section>
      )}
      <aside
        className={`notice ${actionResult && !actionResult.accepted ? "failure" : ""}`}
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
