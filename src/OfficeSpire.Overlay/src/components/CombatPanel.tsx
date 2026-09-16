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
  const validTargetIds =
    selectedCard?.valid_target_ids ?? selectedPotion?.valid_target_ids ?? [];
  const visibleEnemies = screen.enemies.filter((enemy) => enemy.is_alive);
  const targetableEnemies = visibleEnemies.filter((enemy) =>
    validTargetIds.includes(enemy.combat_id),
  );
  return (
    <>
      <header className="run-line">
        <span>
          {run.character_name} · ACT {run.current_act} · F{run.current_floor}
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
        {screen.stars !== null && (
          <span>
            Stars <strong>{screen.stars}</strong>
          </span>
        )}
      </section>
      {screen.orb_capacity > 0 && (
        <section>
          <h2>
            Orbs ({screen.orbs.length}/{screen.orb_capacity})
          </h2>
          <div className="detail-list">
            {screen.orbs.map((orb, index) => (
              <div className="detail-item" key={`${orb.id}-${index}`}>
                <strong>{orb.name}</strong>
                <small>
                  Passive {orb.passive_value} · Evoke {orb.evoke_value}
                </small>
                <small>{orb.description}</small>
              </div>
            ))}
            {screen.orbs.length === 0 && <small>All orb slots empty</small>}
          </div>
        </section>
      )}
      {screen.companions.length > 0 && (
        <section>
          <h2>Companions</h2>
          <div className="detail-list">
            {screen.companions.map((companion) => (
              <div className="detail-item" key={companion.id}>
                <strong>
                  {companion.name} {companion.current_hp}/{companion.max_hp}
                  {companion.block > 0 ? ` +${companion.block} block` : ""}
                  {!companion.is_alive ? " · Down" : ""}
                </strong>
                {companion.powers.length > 0 && (
                  <small>
                    {companion.powers
                      .map((power) => `${power.name} ${power.amount}`)
                      .join(" · ")}
                  </small>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2>Status</h2>
        {screen.player.powers.length > 0 ? (
          <div className="detail-list">
            {screen.player.powers.map((power, index) => (
              <div className="detail-item" key={`${power.name}-${index}`}>
                <strong>
                  {power.name} {power.amount}
                </strong>
                <small>{power.description}</small>
              </div>
            ))}
          </div>
        ) : (
          <small>No active status effects</small>
        )}
      </section>
      <section>
        <h2>Relics ({run.relics.length})</h2>
        {run.relics.length > 0 ? (
          <div className="detail-list">
            {run.relics.map((relic, index) => (
              <div className="detail-item" key={`${relic.id}-${index}`}>
                <strong>
                  {relic.name}
                  {relic.stack_count > 1 ? ` ×${relic.stack_count}` : ""}
                </strong>
                <small>{relic.description}</small>
              </div>
            ))}
          </div>
        ) : (
          <small>No relics</small>
        )}
      </section>
      <section>
        <h2>Enemies</h2>
        <div className="list">
          {visibleEnemies.map((enemy) => {
            const targetIndex = targetableEnemies.findIndex(
              (candidate) => candidate.combat_id === enemy.combat_id,
            );
            return (
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
                aria-keyshortcuts={
                  targetIndex >= 0 ? `${targetIndex + 1}` : undefined
                }
              >
                <span>
                  <strong>{enemy.name}</strong> {enemy.current_hp}/
                  {enemy.max_hp}
                  {enemy.block > 0 ? ` +${enemy.block} block` : ""}
                </span>
                <span>
                  {targetIndex >= 0 ? `[${targetIndex + 1}] ` : ""}
                  {enemy.intent}
                </span>
                {enemy.powers.length > 0 && (
                  <small>
                    {enemy.powers
                      .map((p) => `${p.name} ${p.amount}`)
                      .join(" · ")}
                  </small>
                )}
              </button>
            );
          })}
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
      <section>
        <h2>
          Potions ({screen.potions.length}/{screen.potion_capacity})
        </h2>
        {screen.potions.length > 0 ? (
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
                  aria-keyshortcuts={`Shift+${potion.slot_index + 1}`}
                >
                  <strong>
                    [Shift+{potion.slot_index + 1}] {potion.name}
                  </strong>
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
                  aria-label={`Discard ${potion.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <small>No potions</small>
        )}
      </section>
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
          aria-keyshortcuts="E"
        >
          [E] End Turn
        </button>
      </footer>
      <p className="keyboard-help">
        1–9 cards/targets · Shift+1–9 potions · Esc cancel
      </p>
    </>
  );
}
