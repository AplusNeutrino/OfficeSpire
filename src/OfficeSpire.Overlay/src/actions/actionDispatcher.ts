import type { OverlayAction } from "../types";
const requestId = () => crypto.randomUUID();
export function createPlayCardAction(
  handIndex: number,
  cardId: string,
  revision: number,
  targetId?: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "play_card",
    expected_revision: revision,
    payload:
      targetId === undefined
        ? { hand_index: handIndex, card_id: cardId }
        : { hand_index: handIndex, card_id: cardId, target_id: targetId },
  };
}
export function createEndTurnAction(revision: number): OverlayAction {
  return {
    request_id: requestId(),
    action: "end_turn",
    expected_revision: revision,
    payload: {},
  };
}
export function createUsePotionAction(
  slotIndex: number,
  potionId: string,
  revision: number,
  targetId?: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "use_potion",
    expected_revision: revision,
    payload:
      targetId === undefined
        ? { slot_index: slotIndex, potion_id: potionId }
        : { slot_index: slotIndex, potion_id: potionId, target_id: targetId },
  };
}

export function createDiscardPotionAction(
  slotIndex: number,
  potionId: string,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "discard_potion",
    expected_revision: revision,
    payload: { slot_index: slotIndex, potion_id: potionId },
  };
}
export function createChooseMapNodeAction(
  column: number,
  row: number,
  stableId: string,
  mapGeneration: number,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "choose_map_node",
    expected_revision: revision,
    payload: {
      column,
      row,
      stable_id: stableId,
      map_generation: mapGeneration,
    },
  };
}

export function createRewardAction(
  action: "choose_reward" | "choose_reward_card",
  choiceIndex: number,
  revision: number,
  cardId?: string,
  actionToken?: string,
): OverlayAction {
  return {
    request_id: requestId(),
    action,
    expected_revision: revision,
    payload: {
      choice_index: choiceIndex,
      ...(cardId === undefined ? {} : { card_id: cardId }),
      ...(actionToken === undefined ? {} : { action_token: actionToken }),
    },
  };
}

export function createSkipRewardsAction(revision: number): OverlayAction {
  return {
    request_id: requestId(),
    action: "skip_rewards",
    expected_revision: revision,
    payload: {},
  };
}

export function createCardOptionAction(
  choiceIndex: number,
  cardId: string,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "choose_card_option",
    expected_revision: revision,
    payload: { choice_index: choiceIndex, card_id: cardId },
  };
}

export function createConfirmCardSelectionAction(
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "confirm_card_selection",
    expected_revision: revision,
    payload: {},
  };
}

export function createEventOptionAction(
  optionIndex: number,
  actionToken: string,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "choose_event_option",
    expected_revision: revision,
    payload: { option_index: optionIndex, action_token: actionToken },
  };
}

export function createRestOptionAction(
  optionIndex: number,
  optionId: string,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "choose_rest_option",
    expected_revision: revision,
    payload: { option_index: optionIndex, option_id: optionId },
  };
}

export function createLeaveRestSiteAction(revision: number): OverlayAction {
  return {
    request_id: requestId(),
    action: "leave_rest_site",
    expected_revision: revision,
    payload: {},
  };
}

export function createTreasureAction(
  action: "open_treasure" | "leave_treasure",
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action,
    expected_revision: revision,
    payload: {},
  };
}

export function createTreasureRelicAction(
  choiceIndex: number,
  relicId: string,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "choose_treasure_relic",
    expected_revision: revision,
    payload: { choice_index: choiceIndex, relic_id: relicId },
  };
}

export function createShopAction(
  action: "open_shop" | "request_card_removal" | "leave_shop",
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action,
    expected_revision: revision,
    payload: {},
  };
}

export function createBuyShopItemAction(
  category: string,
  itemIndex: number,
  itemId: string,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "buy_shop_item",
    expected_revision: revision,
    payload: { category, item_index: itemIndex, item_id: itemId },
  };
}
