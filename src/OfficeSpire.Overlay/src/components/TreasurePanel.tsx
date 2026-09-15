import type { TreasureRelicState, TreasureStateSnapshot } from "../types";

interface Props {
  snapshot: TreasureStateSnapshot;
  disabled: boolean;
  onOpen: () => void;
  onRelic: (relic: TreasureRelicState) => void;
  onSkip: () => void;
  onLeave: () => void;
}

export function TreasurePanel({
  snapshot,
  disabled,
  onOpen,
  onRelic,
  onSkip,
  onLeave,
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
      <section>
        <h1>Treasure Room</h1>
        {!screen.chest_opened ? (
          <button
            className="treasure-open"
            disabled={disabled}
            onClick={onOpen}
          >
            Open chest
          </button>
        ) : (
          <div className="treasure-relics">
            {screen.relics.map((relic) => (
              <button
                key={relic.id}
                className={
                  screen.selected_relic_index === relic.choice_index
                    ? "treasure-relic selected"
                    : "treasure-relic"
                }
                disabled={disabled || !screen.is_picking}
                onClick={() => onRelic(relic)}
              >
                <strong>{relic.name}</strong>
                <span>{relic.description}</span>
              </button>
            ))}
          </div>
        )}
        {screen.is_picking && (
          <button
            className="treasure-skip"
            disabled={disabled}
            onClick={onSkip}
          >
            Skip relic
          </button>
        )}
        {screen.can_leave && (
          <button
            className="treasure-leave"
            disabled={disabled}
            onClick={onLeave}
          >
            Continue
          </button>
        )}
      </section>
    </>
  );
}
