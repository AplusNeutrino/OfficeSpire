import type { MapNodeState, MapStateSnapshot } from "../types";

interface Props {
  snapshot: MapStateSnapshot;
  disabled: boolean;
  onChooseNode: (node: MapNodeState) => void;
}

const nodeLabel = (node: MapNodeState) =>
  node.node_type.replace(/([a-z])([A-Z])/g, "$1 $2");

export function MapPanel({ snapshot, disabled, onChooseNode }: Props) {
  const { run, screen } = snapshot;
  const playerName = (playerId: string) =>
    run.party?.members.find((member) => member.id === playerId)
      ?.character_name ?? "You";
  return (
    <>
      <header className="run-line">
        <span>
          ACT {run.current_act} · F{run.current_floor}
        </span>
        <span>{run.gold}G</span>
      </header>
      <section className="map-summary">
        <span>Current</span>
        <strong>
          {screen.current_node
            ? nodeLabel(screen.current_node)
            : "Act entrance"}
        </strong>
      </section>
      <section>
        <h2>Reachable rooms</h2>
        <div className="map-choices">
          {screen.reachable_nodes.map((node, index) => (
            <button
              key={node.stable_id}
              className="map-node"
              disabled={disabled || !screen.waiting_for_input}
              onClick={() => onChooseNode(node)}
              aria-keyshortcuts={`${index + 1}`}
            >
              <strong>
                [{index + 1}] {nodeLabel(node)}
              </strong>
              <small>
                Column {node.column + 1} · Row {node.row + 1}
              </small>
              {screen.votes.some(
                (vote) => vote.choice_id === node.stable_id,
              ) && (
                <small>
                  Votes:{" "}
                  {screen.votes
                    .filter((vote) => vote.choice_id === node.stable_id)
                    .map((vote) => playerName(vote.player_id))
                    .join(", ")}
                </small>
              )}
            </button>
          ))}
          {screen.reachable_nodes.length === 0 && (
            <p className="map-empty">
              Waiting for the authoritative route choices…
            </p>
          )}
        </div>
      </section>
      <footer>
        <span>{screen.all_nodes.length} nodes in the current act</span>
        <span>
          {screen.votes.filter((vote) => vote.choice_id === null).length}{" "}
          vote(s) pending
        </span>
      </footer>
    </>
  );
}
