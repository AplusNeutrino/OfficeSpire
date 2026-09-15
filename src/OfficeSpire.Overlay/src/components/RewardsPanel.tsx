import type {
  RewardCardState,
  RewardItemState,
  RewardsStateSnapshot,
} from "../types";

interface Props {
  snapshot: RewardsStateSnapshot;
  disabled: boolean;
  onReward: (reward: RewardItemState) => void;
  onCard: (card: RewardCardState) => void;
  onSkip: () => void;
}

export function RewardsPanel({
  snapshot,
  disabled,
  onReward,
  onCard,
  onSkip,
}: Props) {
  const { run, screen } = snapshot;
  return (
    <>
      <header className="run-line">
        <span>
          ACT {run.current_act} · F{run.current_floor}
        </span>
        <span>{run.gold}G</span>
      </header>
      <section>
        <h2>
          {screen.mode === "card_selection"
            ? "Choose a card"
            : "Combat rewards"}
        </h2>
        <div className="reward-list">
          {screen.mode === "card_selection"
            ? screen.card_choices.map((card) => (
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
              ))
            : screen.items.map((reward) => (
                <button
                  key={`${reward.reward_type}-${reward.choice_index}`}
                  className="reward-item"
                  disabled={disabled || !screen.waiting_for_input}
                  onClick={() => onReward(reward)}
                >
                  <strong>{reward.name}</strong>
                  <small>{reward.reward_type}</small>
                  {reward.description && <span>{reward.description}</span>}
                  {reward.card_options.length > 0 && (
                    <span>
                      {reward.card_options.map((card) => card.name).join(" · ")}
                    </span>
                  )}
                </button>
              ))}
        </div>
      </section>
      {screen.mode === "rewards" && screen.can_skip && (
        <footer className="reward-footer">
          <span>Unclaimed rewards will be left behind.</span>
          <button className="skip-rewards" disabled={disabled} onClick={onSkip}>
            Skip / Continue
          </button>
        </footer>
      )}
    </>
  );
}
