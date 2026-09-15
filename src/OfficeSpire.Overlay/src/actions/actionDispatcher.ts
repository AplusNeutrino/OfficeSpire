import type { OverlayAction } from "../types";
const requestId = () => crypto.randomUUID();
export function createPlayCardAction(
  handIndex: number,
  revision: number,
  targetId?: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "play_card",
    expected_revision: revision,
    payload:
      targetId === undefined
        ? { hand_index: handIndex }
        : { hand_index: handIndex, target_id: targetId },
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
export function createChooseMapNodeAction(
  column: number,
  row: number,
  revision: number,
): OverlayAction {
  return {
    request_id: requestId(),
    action: "choose_map_node",
    expected_revision: revision,
    payload: { column, row },
  };
}
