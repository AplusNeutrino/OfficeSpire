import type { CardState, CombatStateSnapshot, EnemyState } from "../types";
import { CardButton } from "./CardButton";
interface Props {
  snapshot: CombatStateSnapshot;
  disabled: boolean;
  selectedCard?: CardState;
  onCard: (card: CardState) => void;
  onTarget: (enemy: EnemyState) => void;
  onCancelTarget: () => void;
  onEndTurn: () => void;
}
export function CombatPanel({
  snapshot,
  disabled,
  selectedCard,
  onCard,
  onTarget,
  onCancelTarget,
  onEndTurn,
}: Props) {
  const { screen, run } = snapshot;
  return (
    <>
      <header className="run-line">
        <span>
          ACT {run.current_act} · F{run.current_floor}
        </span>
        <span>{run.gold}G</span>
      </header>
      <section className="stats">
        <span>
          HP{" "}
          <strong>
            {screen.player.current_hp}/{screen.player.max_hp}
          </strong>
        </span>
        <span>
          Block <strong>{screen.player.block}</strong>
        </span>
        <span>
          Energy{" "}
          <strong>
            {screen.energy}/{screen.max_energy}
          </strong>
        </span>
      </section>
      <section>
        <h2>Enemies</h2>
        <div className="list">
          {screen.enemies
            .filter((e) => e.is_alive)
            .map((enemy) => (
              <button
                key={enemy.stable_id}
                className={`enemy ${selectedCard && selectedCard.valid_target_ids.includes(enemy.combat_id) ? "targetable" : ""}`}
                disabled={
                  !selectedCard ||
                  !selectedCard.valid_target_ids.includes(enemy.combat_id)
                }
                onClick={() => onTarget(enemy)}
              >
                <span>
                  <strong>{enemy.name}</strong> {enemy.current_hp}/
                  {enemy.max_hp}
                  {enemy.block > 0 ? ` +${enemy.block} block` : ""}
                </span>
                <span>{enemy.intent}</span>
                {enemy.powers.length > 0 && (
                  <small>
                    {enemy.powers
                      .map((p) => `${p.name} ${p.amount}`)
                      .join(" · ")}
                  </small>
                )}
              </button>
            ))}
        </div>
      </section>
      {selectedCard && (
        <div className="target-prompt">
          <span>
            Select target for <strong>{selectedCard.name}</strong>
          </span>
          <button onClick={onCancelTarget}>Cancel</button>
        </div>
      )}
      <section>
        <h2>Hand</h2>
        <div className="list">
          {screen.hand.map((card) => (
            <CardButton
              key={`${card.id}-${card.hand_index}`}
              card={card}
              disabled={disabled || !!selectedCard}
              onPlay={onCard}
            />
          ))}
        </div>
      </section>
      <footer>
        <span>
          Draw {screen.piles.draw} · Discard {screen.piles.discard} · Exhaust{" "}
          {screen.piles.exhaust}
        </span>
        <button
          className="end-turn"
          disabled={
            disabled ||
            !!selectedCard ||
            !screen.waiting_for_input ||
            !screen.is_play_phase
          }
          onClick={onEndTurn}
        >
          End Turn
        </button>
      </footer>
    </>
  );
}
