import type { EventOptionState, EventStateSnapshot } from "../types";

interface Props {
  snapshot: EventStateSnapshot;
  disabled: boolean;
  onOption: (option: EventOptionState) => void;
}

export function EventPanel({ snapshot, disabled, onOption }: Props) {
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
        <h1>{screen.name || "Event"}</h1>
        <p>{screen.description}</p>
      </article>
      <section>
        <h2>{screen.is_finished ? "Continue" : "Options"}</h2>
        <div className="event-options">
          {screen.options.map((option) => (
            <button
              key={option.option_index}
              className={`event-option ${option.is_proceed ? "proceed" : ""}`}
              disabled={
                disabled || option.is_locked || !screen.waiting_for_input
              }
              onClick={() => onOption(option)}
              title={
                option.is_locked ? "This option is locked." : option.description
              }
            >
              <strong>{option.title}</strong>
              {option.description && <span>{option.description}</span>}
              {option.is_locked && <small>Locked</small>}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
