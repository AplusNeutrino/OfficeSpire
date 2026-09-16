import type {
  SpecialEventCellState,
  SpecialEventStateSnapshot,
} from "../types";

interface Props {
  snapshot: SpecialEventStateSnapshot;
  disabled: boolean;
  onCell: (cell: SpecialEventCellState) => void;
  onTool: (tool: "small" | "big") => void;
  onProceed: () => void;
}

export function SpecialEventPanel({
  snapshot,
  disabled,
  onCell,
  onTool,
  onProceed,
}: Props) {
  const { run, screen } = snapshot;
  return (
    <>
      <header className="run-line">
        <span>
          ACT {run.current_act} · F{run.current_floor}
        </span>
        <span>{run.gold}G</span>
      </header>
      <article className="event-copy">
        <h1>
          {screen.variant === "crystal_sphere"
            ? "Crystal Sphere"
            : "Special event"}
        </h1>
        <p>{screen.message}</p>
        {screen.unavailable_reason && (
          <p role="status">{screen.unavailable_reason}</p>
        )}
      </article>
      {screen.variant === "crystal_sphere" && (
        <section>
          <h2>Divination</h2>
          <p>
            Tool: {screen.selected_tool ?? "unknown"} · Actions remaining:{" "}
            {screen.remaining_actions ?? "unknown"}
          </p>
          <div className="event-options">
            <button
              disabled={disabled || !screen.can_select_small_tool}
              onClick={() => onTool("small")}
            >
              Small tool
            </button>
            <button
              disabled={disabled || !screen.can_select_big_tool}
              onClick={() => onTool("big")}
            >
              Big tool
            </button>
          </div>
          <div
            className="event-options"
            aria-label="Hidden Crystal Sphere cells"
          >
            {screen.cells.map((cell) => (
              <button
                key={cell.stable_id}
                disabled={
                  disabled || !screen.waiting_for_input || screen.can_proceed
                }
                onClick={() => onCell(cell)}
              >
                {cell.label}
              </button>
            ))}
          </div>
          {screen.can_proceed && (
            <button disabled={disabled} onClick={onProceed}>
              Continue
            </button>
          )}
        </section>
      )}
    </>
  );
}
