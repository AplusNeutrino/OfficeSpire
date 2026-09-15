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
          {screen.reachable_nodes.map((node) => (
            <button
              key={node.stable_id}
              className="map-node"
              disabled={disabled || !screen.waiting_for_input}
              onClick={() => onChooseNode(node)}
            >
              <strong>{nodeLabel(node)}</strong>
              <small>
                Column {node.column + 1} · Row {node.row + 1}
              </small>
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
      </footer>
    </>
  );
}
