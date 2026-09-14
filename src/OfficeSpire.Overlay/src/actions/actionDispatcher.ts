import type { CardState } from '../types';

export interface OverlayAction {
  action: 'play_card' | 'end_turn';
  expected_revision: number;
  card_index?: number;
}

export function createPlayCardAction(card: CardState, revision: number): OverlayAction {
  return {
    action: 'play_card',
    expected_revision: revision,
    card_index: card.index
  };
}

export function createEndTurnAction(revision: number): OverlayAction {
  return {
    action: 'end_turn',
    expected_revision: revision
  };
}
