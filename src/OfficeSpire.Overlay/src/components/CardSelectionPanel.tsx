import type { CardSelectionStateSnapshot, RewardCardState } from "../types";

interface Props {
  snapshot: CardSelectionStateSnapshot;
  disabled: boolean;
  onCard: (card: RewardCardState) => void;
  onConfirm: () => void;
}

export function CardSelectionPanel({
  snapshot,
  disabled,
  onCard,
  onConfirm,
}: Props) {
  const { screen } = snapshot;
  return (
    <section className="selection-panel">
      <h1>Choose a card</h1>
      <p className="selection-kind">
        {screen.selection_type.replace(/_/g, " ")}
      </p>
      {screen.max_select > 1 && (
        <p className="selection-count">
          Selected {screen.current_select_count} · Required {screen.min_select}–
          {screen.max_select}
        </p>
      )}
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
      {screen.selection_type === "hand_multi_select" && (
        <button
          className="confirm-selection"
          disabled={disabled || !screen.can_confirm}
          onClick={onConfirm}
        >
          Confirm selection
        </button>
      )}
    </section>
  );
}
