import type {
  CardState,
  CombatStateSnapshot,
  EnemyState,
  PotionState,
} from "../types";
import { CardButton } from "./CardButton";
interface Props {
  snapshot: CombatStateSnapshot;
  disabled: boolean;
  selectedCard?: CardState;
  selectedPotion?: PotionState;
  onCard: (card: CardState) => void;
  onTarget: (enemy: EnemyState) => void;
  onPotion: (potion: PotionState) => void;
  onDiscardPotion: (potion: PotionState) => void;
  onCancelTarget: () => void;
  onEndTurn: () => void;
}
export function CombatPanel({
  snapshot,
  disabled,
  selectedCard,
  selectedPotion,
  onCard,
  onTarget,
  onPotion,
  onDiscardPotion,
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
                className={`enemy ${selectedCard?.valid_target_ids.includes(enemy.combat_id) || selectedPotion?.valid_target_ids.includes(enemy.combat_id) ? "targetable" : ""}`}
                disabled={
                  !(
                    selectedCard?.valid_target_ids.includes(enemy.combat_id) ||
                    selectedPotion?.valid_target_ids.includes(enemy.combat_id)
                  )
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
      {(selectedCard || selectedPotion) && (
        <div className="target-prompt">
          <span>
            Select target for{" "}
            <strong>{selectedCard?.name ?? selectedPotion?.name}</strong>
          </span>
          <button onClick={onCancelTarget}>Cancel</button>
        </div>
      )}
      {screen.potions.length > 0 && (
        <section>
          <h2>Potions</h2>
          <div className="potion-list">
            {screen.potions.map((potion) => (
              <div className="potion" key={`${potion.id}-${potion.slot_index}`}>
                <button
                  disabled={
                    disabled ||
                    !!selectedCard ||
                    !!selectedPotion ||
                    !potion.can_use
                  }
                  onClick={() => onPotion(potion)}
                  title={potion.description}
                >
                  <strong>{potion.name}</strong>
                  <small>{potion.description}</small>
                </button>
                <button
                  className="potion-discard"
                  disabled={
                    disabled ||
                    !!selectedCard ||
                    !!selectedPotion ||
                    !potion.can_discard
                  }
                  onClick={() => onDiscardPotion(potion)}
                  title="Discard potion"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2>Hand</h2>
        <div className="list">
          {screen.hand.map((card) => (
            <CardButton
              key={`${card.id}-${card.hand_index}`}
              card={card}
              disabled={disabled || !!selectedCard || !!selectedPotion}
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
            !!selectedPotion ||
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
