import type { CardSelectionStateSnapshot, RewardCardState } from "../types";

interface Props {
  snapshot: CardSelectionStateSnapshot;
  disabled: boolean;
  onCard: (card: RewardCardState) => void;
}

export function CardSelectionPanel({ snapshot, disabled, onCard }: Props) {
  const { screen } = snapshot;
  return (
    <section className="selection-panel">
      <h1>Choose a card</h1>
      <p className="selection-kind">
        {screen.selection_type.replace(/_/g, " ")}
      </p>
      <div className="reward-list">
        {screen.options.map((card) => (
          <button
            key={`${card.id}-${card.choice_index}`}
            className="reward-card"
            disabled={disabled || !screen.waiting_for_input}
            onClick={() => onCard(card)}
          >
            <span className="card-cost">{card.cost}</span>
            <strong>{card.name}</strong>
            <small>
              {card.type} · {card.rarity}
            </small>
            <span>{card.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
