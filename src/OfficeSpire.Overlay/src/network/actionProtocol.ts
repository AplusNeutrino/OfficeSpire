export interface ActionRequest {
  action: 'play_card' | 'end_turn';
  expected_revision: number;
  card_index?: number;
}

export function createPlayCardAction(cardIndex: number, revision: number): ActionRequest {
  return {
    action: 'play_card',
    card_index: cardIndex,
    expected_revision: revision,
  };
}

export function createEndTurnAction(revision: number): ActionRequest {
  return {
    action: 'end_turn',
    expected_revision: revision,
  };
}
