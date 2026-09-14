import type { CardState } from "../types";
interface Props {
  card: CardState;
  disabled: boolean;
  onPlay: (card: CardState) => void;
}
export function CardButton({ card, disabled, onPlay }: Props) {
  const detail = [
    card.damage !== null ? `${card.damage} dmg` : null,
    card.block !== null ? `${card.block} block` : null,
    card.description || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      className="card"
      disabled={disabled || !card.can_play}
      onClick={() => onPlay(card)}
      title={card.unplayable_reason ?? card.description}
    >
      <span className="card-index">{card.hand_index + 1}</span>
      <span className="card-name">{card.name}</span>
      <span className="card-cost">{card.cost}</span>
      {detail && <span className="card-detail">{detail}</span>}
    </button>
  );
}
