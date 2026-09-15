import type { RestOptionState, RestStateSnapshot } from "../types";

interface Props {
  snapshot: RestStateSnapshot;
  disabled: boolean;
  onOption: (option: RestOptionState) => void;
  onLeave: () => void;
}

export function RestPanel({ snapshot, disabled, onOption, onLeave }: Props) {
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
        <h1>Rest Site</h1>
        {screen.target_selection_pending && (
          <p className="unsupported-warning">
            Player targeting is active. Complete this choice in STS2.
          </p>
        )}
        <div className="rest-options">
          {screen.options.map((option, index) => (
            <button
              key={`${option.id}-${option.option_index}`}
              className="rest-option"
              disabled={disabled || !screen.waiting_for_input}
              onClick={() => onOption(option)}
              aria-keyshortcuts={`${index + 1}`}
            >
              <strong>
                [{index + 1}] {option.name}
              </strong>
              {option.description && <span>{option.description}</span>}
            </button>
          ))}
        </div>
        {screen.can_proceed && (
          <button
            className="rest-proceed"
            disabled={disabled}
            onClick={onLeave}
            aria-keyshortcuts="L"
          >
            [L] Continue
          </button>
        )}
      </section>
    </>
  );
}
