import type { StateSnapshot } from '../types';

export function CombatPanel({ state }: { state: StateSnapshot }) {
  return <>
    <h3>Combat</h3>
    <div>HP {state.player.hp}/{state.player.max_hp}</div>
    <div>Energy {state.player.energy}/{state.player.max_energy}</div>
    {state.enemies.map(enemy => (
      <div key={enemy.id}>
        {enemy.name}: {enemy.hp}/{enemy.maxHp}
      </div>
    ))}
  </>;
}
