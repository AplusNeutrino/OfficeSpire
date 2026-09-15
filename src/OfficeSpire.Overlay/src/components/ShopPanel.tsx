import type { ShopItemState, ShopStateSnapshot } from "../types";

interface Props {
  snapshot: ShopStateSnapshot;
  disabled: boolean;
  onOpen: () => void;
  onBuy: (item: ShopItemState) => void;
  onRemove: () => void;
  onLeave: () => void;
}

export function ShopPanel({
  snapshot,
  disabled,
  onOpen,
  onBuy,
  onRemove,
  onLeave,
}: Props) {
  const { run, screen } = snapshot;
  return (
    <>
      <header className="run-line">
        <span>
          ACT {run.current_act} · F{run.current_floor}
        </span>
        <span>{screen.gold}G</span>
      </header>
      <section>
        <h1>Merchant</h1>
        {!screen.inventory_open ? (
          <button className="shop-open" disabled={disabled} onClick={onOpen}>
            Browse wares
          </button>
        ) : (
          <div className="shop-items">
            {screen.items.map((item) => (
              <button
                key={`${item.category}-${item.item_index}`}
                className="shop-item"
                disabled={disabled || !item.is_stocked || !item.enough_gold}
                onClick={() => onBuy(item)}
                title={
                  !item.is_stocked
                    ? "Out of stock"
                    : !item.enough_gold
                      ? "Not enough gold"
                      : item.description
                }
              >
                <strong>{item.name}</strong>
                <b>{item.price}G</b>
                <small>{item.category.replace(/_/g, " ")}</small>
                {item.description && <span>{item.description}</span>}
              </button>
            ))}
            {screen.card_removal_available && (
              <button
                className="shop-remove"
                disabled={disabled || screen.gold < screen.card_removal_cost}
                onClick={onRemove}
              >
                Remove a card <b>{screen.card_removal_cost}G</b>
              </button>
            )}
          </div>
        )}
        {screen.can_leave && (
          <button className="shop-leave" disabled={disabled} onClick={onLeave}>
            Leave merchant
          </button>
        )}
      </section>
    </>
  );
}
