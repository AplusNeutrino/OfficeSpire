import { sendAction } from '../network/actionProtocol';

export function ActionBar() {
  return <div>
    <button onClick={() => sendAction({ action: 'end_turn', expected_revision: 0 })}>
      END TURN
    </button>
  </div>;
}
