import { createActionMessage } from '../network/actionProtocol';

export function playCard(cardIndex: number, revision: number) {
  return createActionMessage({
    action: 'play_card',
    expected_revision: revision,
    card_index: cardIndex
  });
}

export function endTurn(revision: number) {
  return createActionMessage({
    action: 'end_turn',
    expected_revision: revision
  });
}
