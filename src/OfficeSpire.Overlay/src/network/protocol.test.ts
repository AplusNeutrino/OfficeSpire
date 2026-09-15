import { describe, expect, it } from "vitest";
import {
  actionMessage,
  actionStatusMessage,
  getStateMessage,
  parseEnvelope,
} from "./protocol";
import {
  createChooseMapNodeAction,
  createRewardAction,
  createSkipRewardsAction,
  createCardOptionAction,
  createConfirmCardSelectionAction,
  createEventOptionAction,
  createRestOptionAction,
  createLeaveRestSiteAction,
} from "../actions/actionDispatcher";
import { isStateSnapshot } from "../types";
describe("OfficeSpire wire protocol", () => {
  it("wraps state requests with protocol version 1", () => {
    expect(getStateMessage()).toEqual({
      type: "get_state",
      protocol_version: 1,
      body: {},
    });
  });
  it("preserves revision and payload in action requests", () => {
    const wire = actionMessage({
      request_id: "request-1",
      action: "play_card",
      expected_revision: 23,
      payload: { hand_index: 2, target_id: 8 },
    });
    expect(wire.type).toBe("action");
    expect(wire.body).toMatchObject({
      request_id: "request-1",
      expected_revision: 23,
      payload: { hand_index: 2, target_id: 8 },
    });
  });
  it("builds action lifecycle queries", () => {
    expect(actionStatusMessage("abc").body).toEqual({ request_id: "abc" });
  });
  it("rejects non-envelope messages", () => {
    expect(() => parseEnvelope('{"type":"state"}')).toThrow(/envelope/);
  });
  it("parses a valid envelope", () => {
    expect(
      parseEnvelope('{"type":"pong","protocol_version":1,"body":{}}').type,
    ).toBe("pong");
  });
  it("creates a revision-guarded map choice", () => {
    const action = createChooseMapNodeAction(2, 7, 41);
    expect(action).toMatchObject({
      action: "choose_map_node",
      expected_revision: 41,
      payload: { column: 2, row: 7 },
    });
  });
  it("accepts map snapshots without combat-only arrays", () => {
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 9,
        phase: "map",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          current_node: null,
          reachable_nodes: [],
          all_nodes: [],
        },
      }),
    ).toBe(true);
  });
  it("creates reward selection and skip actions", () => {
    expect(createRewardAction("choose_reward_card", 1, 52)).toMatchObject({
      action: "choose_reward_card",
      expected_revision: 52,
      payload: { choice_index: 1 },
    });
    expect(createSkipRewardsAction(53)).toMatchObject({
      action: "skip_rewards",
      expected_revision: 53,
      payload: {},
    });
  });
  it("accepts authoritative rewards snapshots", () => {
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 10,
        phase: "rewards",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          mode: "rewards",
          items: [],
          card_choices: [],
          can_skip: true,
        },
      }),
    ).toBe(true);
  });
  it("creates and parses generic card-selection decisions", () => {
    expect(createCardOptionAction(2, 61)).toMatchObject({
      action: "choose_card_option",
      expected_revision: 61,
      payload: { choice_index: 2 },
    });
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 61,
        phase: "card_selection",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          selection_type: "choose_a_card",
          options: [],
          can_skip: false,
          min_select: 1,
          max_select: 1,
          current_select_count: 0,
          can_confirm: false,
        },
      }),
    ).toBe(true);
  });
  it("creates a guarded hand-selection confirmation", () => {
    expect(createConfirmCardSelectionAction(62)).toMatchObject({
      action: "confirm_card_selection",
      expected_revision: 62,
      payload: {},
    });
  });
  it("creates and parses event decisions", () => {
    expect(createEventOptionAction(1, 70)).toMatchObject({
      action: "choose_event_option",
      expected_revision: 70,
      payload: { option_index: 1 },
    });
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 70,
        phase: "event",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          name: "Event",
          description: "",
          is_finished: false,
          options: [],
        },
      }),
    ).toBe(true);
  });
  it("creates and parses rest-site decisions", () => {
    expect(createRestOptionAction(0, 80)).toMatchObject({
      action: "choose_rest_option",
      expected_revision: 80,
      payload: { option_index: 0 },
    });
    expect(createLeaveRestSiteAction(81).action).toBe("leave_rest_site");
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 80,
        phase: "rest",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          options: [],
          can_proceed: true,
          target_selection_pending: false,
        },
      }),
    ).toBe(true);
  });
});
