import type { CardState } from '../types';

interface Props {
  card: CardState;
  onPlay: (index: number) => void;
}

export function CardButton({ card, onPlay }: Props) {
  return (
    <button onClick={() => onPlay(card.index)}>
      {card.index} {card.name} ({card.cost})
    </button>
  );
}
