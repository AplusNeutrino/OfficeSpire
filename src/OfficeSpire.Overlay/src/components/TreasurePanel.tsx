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
      <section>
        <h1>Treasure Room</h1>
        {!screen.chest_opened ? (
          <button
            className="treasure-open"
            disabled={disabled}
            onClick={onOpen}
            aria-keyshortcuts="Enter"
          >
            [Enter] Open chest
          </button>
        ) : (
          <div className="treasure-relics">
            {screen.relics.map((relic, index) => (
              <button
                key={relic.id}
                className={
                  screen.selected_relic_index === relic.choice_index
                    ? "treasure-relic selected"
                    : "treasure-relic"
                }
                disabled={disabled || !screen.is_picking}
                onClick={() => onRelic(relic)}
                aria-keyshortcuts={`${index + 1}`}
              >
                <strong>
                  [{index + 1}] {relic.name}
                </strong>
                <span>{relic.description}</span>
                {screen.votes.some(
                  (vote) => vote.choice_index === relic.choice_index,
                ) && (
                  <small>
                    Votes:{" "}
                    {screen.votes
                      .filter(
                        (vote) => vote.choice_index === relic.choice_index,
                      )
                      .map((vote) => playerName(vote.player_id))
                      .join(", ")}
                  </small>
                )}
              </button>
            ))}
          </div>
        )}
        {screen.is_picking && (
          <button
            className="treasure-skip"
            disabled={disabled}
            onClick={onSkip}
            aria-keyshortcuts="S"
          >
            [S] Skip relic
          </button>
        )}
        {screen.can_leave && (
          <button
            className="treasure-leave"
            disabled={disabled}
            onClick={onLeave}
            aria-keyshortcuts="L"
          >
            [L] Continue
          </button>
        )}
        {screen.is_picking && (
          <p>
            {screen.votes.filter((vote) => vote.choice_index === null).length}{" "}
            player choice(s) pending
          </p>
        )}
      </section>
    </>
  );
}
