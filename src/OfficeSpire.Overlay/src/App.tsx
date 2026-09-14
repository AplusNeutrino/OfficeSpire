import { useEffect, useState } from 'react';
import type { StateSnapshot } from './types';
import { OverlayStore } from './state/overlayStore';
import { WebSocketClient } from './network/WebSocketClient';

const fallback: StateSnapshot = {
  state_revision: 1,
  player: { hp: 54, max_hp: 87, energy: 3, max_energy: 3, block: 0 },
  enemies: [{ id: 'enemy-1', name: 'Slime', hp: 66, maxHp: 72, intent: 'Attack 8' }],
  hand: [
    { index: 0, name: 'Strike', cost: 1, description: '6 dmg' },
    { index: 1, name: 'Defend', cost: 1, description: '5 block' }
  ]
};

const store = new OverlayStore(fallback);
const client = new WebSocketClient();

export default function App() {
  const [state, setState] = useState(store.current);

  useEffect(() => {
    client.onSnapshot((snapshot) => {
      store.update(snapshot);
      setState(store.current);
    });

    return () => client.disconnect();
  }, []);

  return <main className="overlay">
    <h2>OfficeSpire</h2>
    <section>Revision {state.state_revision}</section>
    <section>HP {state.player.hp}/{state.player.max_hp}</section>
    <section>Energy {state.player.energy}/{state.player.max_energy}</section>
    <h3>Enemy</h3>
    {state.enemies.map(e => <div key={e.id}>{e.name} {e.hp}/{e.maxHp} {e.intent}</div>)}
    <h3>Hand</h3>
    {state.hand.map(c => <button key={c.index}>{c.index} {c.name} ({c.cost})</button>)}
    <button>END TURN</button>
  </main>;
}
