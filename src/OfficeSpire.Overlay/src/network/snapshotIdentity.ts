import type {
  CardSelectionScreen,
  CombatScreen,
  EventScreen,
  MapScreen,
  RestScreen,
  RewardsScreen,
  ShopScreen,
  SpecialEventScreen,
  StateSnapshot,
  TreasureScreen,
} from "../types";

const unique = <T>(values: T[]) => new Set(values).size === values.length;
const nonNegativeIntegers = (values: unknown[]) =>
  values.every((value) => Number.isInteger(value) && Number(value) >= 0);

export function hasStableSnapshotIdentities(
  snapshot: Pick<StateSnapshot, "phase" | "screen">,
): boolean {
  switch (snapshot.phase) {
    case "combat": {
      const screen = snapshot.screen as CombatScreen;
      const hand = screen.hand.map((card) => card.hand_index);
      const enemies = screen.enemies.map((enemy) => enemy.combat_id);
      const stableEnemies = screen.enemies.map((enemy) => enemy.stable_id);
      const potionSlots = screen.potions.map((potion) => potion.slot_index);
      return (
        nonNegativeIntegers([...hand, ...enemies, ...potionSlots]) &&
        unique(hand) &&
        unique(enemies) &&
        stableEnemies.every((id) => typeof id === "string" && id.length > 0) &&
        unique(stableEnemies) &&
        unique(potionSlots)
      );
    }
    case "map": {
      const screen = snapshot.screen as MapScreen;
      const nodes = [...screen.reachable_nodes, ...screen.all_nodes];
      return (
        nodes.every(
          (node) =>
            Number.isInteger(node.column) &&
            node.column >= 0 &&
            Number.isInteger(node.row) &&
            node.row >= 0 &&
            typeof node.stable_id === "string" &&
            node.stable_id ===
              `map-${screen.map_generation}-${node.column}-${node.row}`,
        ) &&
        unique(screen.reachable_nodes.map((node) => node.stable_id)) &&
        unique(screen.all_nodes.map((node) => node.stable_id)) &&
        unique(
          screen.reachable_nodes.map((node) => `${node.column}:${node.row}`),
        ) &&
        unique(screen.all_nodes.map((node) => `${node.column}:${node.row}`))
      );
    }
    case "rewards": {
      const screen = snapshot.screen as RewardsScreen;
      if (screen.mode === "card_selection") {
        const indexes = screen.card_choices.map((card) => card.choice_index);
        return (
          nonNegativeIntegers(indexes) &&
          unique(indexes) &&
          screen.card_choices.every(
            (card) => typeof card.id === "string" && card.id.length > 0,
          )
        );
      }
      const indexes = screen.items.map((item) => item.choice_index);
      const tokens = screen.items.map((item) => item.action_token);
      return (
        nonNegativeIntegers(indexes) &&
        unique(indexes) &&
        tokens.every(
          (token) => typeof token === "string" && token.length > 0,
        ) &&
        unique(tokens)
      );
    }
    case "card_selection": {
      const indexes = (snapshot.screen as CardSelectionScreen).options.map(
        (card) => card.choice_index,
      );
      const options = (snapshot.screen as CardSelectionScreen).options;
      return (
        nonNegativeIntegers(indexes) &&
        unique(indexes) &&
        options.every(
          (card) => typeof card.id === "string" && card.id.length > 0,
        )
      );
    }
    case "event": {
      const options = (snapshot.screen as EventScreen).options;
      const indexes = options.map((option) => option.option_index);
      const tokens = options.map((option) => option.action_token);
      return (
        nonNegativeIntegers(indexes) &&
        unique(indexes) &&
        tokens.every(
          (token) => typeof token === "string" && token.length > 0,
        ) &&
        unique(tokens)
      );
    }
    case "special_event": {
      const cells = (snapshot.screen as SpecialEventScreen).cells;
      return (
        cells.every(
          (cell) => cell.stable_id === `crystal-cell-${cell.x}-${cell.y}`,
        ) && unique(cells.map((cell) => cell.stable_id))
      );
    }
    case "rest": {
      const screen = snapshot.screen as RestScreen;
      const indexes = screen.options.map((option) => option.option_index);
      const ids = screen.options.map((option) => option.id);
      return (
        nonNegativeIntegers(indexes) &&
        unique(indexes) &&
        ids.every((id) => typeof id === "string" && id.length > 0) &&
        unique(ids)
      );
    }
    case "treasure": {
      const relics = (snapshot.screen as TreasureScreen).relics;
      const indexes = relics.map((relic) => relic.choice_index);
      return (
        nonNegativeIntegers(indexes) &&
        unique(indexes) &&
        relics.every(
          (relic) => typeof relic.id === "string" && relic.id.length > 0,
        )
      );
    }
    case "shop": {
      const screen = snapshot.screen as ShopScreen;
      const identities = screen.items.map(
        (item) => `${item.category}:${item.item_index}`,
      );
      return (
        nonNegativeIntegers(screen.items.map((item) => item.item_index)) &&
        screen.items.every(
          (item) => typeof item.item_id === "string" && item.item_id.length > 0,
        ) &&
        unique(identities)
      );
    }
    default:
      return true;
  }
}
