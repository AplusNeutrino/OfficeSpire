import { describe, expect, it } from "vitest";
import {
  actionMessage,
  actionStatusMessage,
  getStateMessage,
  parseEnvelope,
  isCompatibleProtocolVersion,
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
  createTreasureAction,
  createTreasureRelicAction,
  createShopAction,
  createBuyShopItemAction,
  createUsePotionAction,
  createDiscardPotionAction,
} from "../actions/actionDispatcher";
import { isStateSnapshot } from "../types";
import { resolveCombatShortcut } from "../actions/combatKeyboard";
import { resolveRunShortcut } from "../actions/runKeyboard";
import { ACTION_TIMEOUT_MS, clientTimeoutResult } from "./actionLifecycle";
import { ReconnectController } from "./reconnect";
import { DEFAULT_SETTINGS, parseSettings } from "../settings";
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
  it("defines exact protocol-v1 compatibility while parsing future envelopes", () => {
    expect(isCompatibleProtocolVersion(1)).toBe(true);
    expect(isCompatibleProtocolVersion(2)).toBe(false);
    expect(isCompatibleProtocolVersion(1.5)).toBe(false);
    expect(
      parseEnvelope('{"type":"future","protocol_version":2,"body":{}}'),
    ).toMatchObject({ type: "future", protocol_version: 2 });
  });
  it("rejects malformed protocol versions and empty message types", () => {
    expect(() =>
      parseEnvelope('{"type":"state","protocol_version":1.5,"body":{}}'),
    ).toThrow(/envelope/);
    expect(() =>
      parseEnvelope('{"type":"","protocol_version":1,"body":{}}'),
    ).toThrow(/envelope/);
    expect(() =>
      parseEnvelope('{"type":"state","protocol_version":0,"body":{}}'),
    ).toThrow(/envelope/);
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
  it("rejects snapshots with ambiguous actionable identities", () => {
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 9,
        phase: "combat",
        action_pending: false,
        run: {},
        screen: {
          hand: [],
          enemies: [
            { stable_id: "enemy-4", combat_id: 4 },
            { stable_id: "enemy-4", combat_id: 4 },
          ],
          potions: [],
        },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 10,
        phase: "shop",
        action_pending: false,
        run: {},
        screen: {
          items: [
            { category: "relic", item_index: 0 },
            { category: "relic", item_index: 0 },
          ],
        },
      }),
    ).toBe(false);
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
  it("creates and parses treasure decisions", () => {
    expect(createTreasureAction("open_treasure", 90).action).toBe(
      "open_treasure",
    );
    expect(createTreasureRelicAction(1, 91)).toMatchObject({
      action: "choose_treasure_relic",
      expected_revision: 91,
      payload: { choice_index: 1 },
    });
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 90,
        phase: "treasure",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          chest_opened: false,
          is_picking: false,
          can_leave: false,
          relics: [],
          selected_relic_index: null,
        },
      }),
    ).toBe(true);
  });
  it("creates and parses merchant decisions", () => {
    expect(createBuyShopItemAction("relic", 2, 100)).toMatchObject({
      action: "buy_shop_item",
      expected_revision: 100,
      payload: { category: "relic", item_index: 2 },
    });
    expect(createShopAction("request_card_removal", 101).action).toBe(
      "request_card_removal",
    );
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 100,
        phase: "shop",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          inventory_open: true,
          gold: 80,
          items: [],
          card_removal_available: false,
          card_removal_cost: 0,
          can_leave: true,
        },
      }),
    ).toBe(true);
  });
  it("creates targeted potion use and discard actions", () => {
    expect(createUsePotionAction(1, 110, 7)).toMatchObject({
      action: "use_potion",
      expected_revision: 110,
      payload: { slot_index: 1, target_id: 7 },
    });
    expect(createDiscardPotionAction(2, 111)).toMatchObject({
      action: "discard_potion",
      expected_revision: 111,
      payload: { slot_index: 2 },
    });
  });
  it("maps combat keyboard shortcuts without browser key-layout ambiguity", () => {
    expect(resolveCombatShortcut("Digit3", false, false)).toEqual({
      kind: "card",
      index: 2,
    });
    expect(resolveCombatShortcut("Digit2", true, false)).toEqual({
      kind: "potion",
      index: 1,
    });
    expect(resolveCombatShortcut("Digit1", false, true)).toEqual({
      kind: "target",
      index: 0,
    });
    expect(resolveCombatShortcut("KeyE", false, false)).toEqual({
      kind: "end_turn",
    });
    expect(resolveCombatShortcut("Escape", false, true)).toEqual({
      kind: "cancel",
    });
  });
  it("maps run-screen keyboard shortcuts", () => {
    expect(resolveRunShortcut("Digit4")).toEqual({ kind: "choice", index: 3 });
    expect(resolveRunShortcut("Enter")).toEqual({ kind: "confirm" });
    expect(resolveRunShortcut("KeyS")).toEqual({ kind: "skip" });
    expect(resolveRunShortcut("KeyL")).toEqual({ kind: "leave" });
    expect(resolveRunShortcut("KeyR")).toEqual({ kind: "remove" });
  });
  it("creates a terminal client timeout without claiming backend completion", () => {
    expect(ACTION_TIMEOUT_MS).toBe(15_000);
    expect(clientTimeoutResult("slow-request", 12)).toEqual({
      request_id: "slow-request",
      accepted: false,
      code: "client_timeout",
      message:
        "Action status timed out. State will keep refreshing; verify the game state before retrying.",
      state_revision: 12,
    });
  });
  it("bounds reconnect backoff and resets after a successful connection", () => {
    const reconnect = new ReconnectController();
    expect([reconnect.nextDelay(), reconnect.nextDelay()]).toEqual([
      1_000, 2_000,
    ]);
    for (let attempt = 0; attempt < 10; attempt += 1) reconnect.nextDelay();
    expect(reconnect.nextDelay()).toBe(10_000);
    reconnect.reset();
    expect(reconnect.nextDelay()).toBe(1_000);
  });
  it("loads versioned settings and clamps unsafe display values", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS);
    expect(
      parseSettings(
        JSON.stringify({
          version: 1,
          opacity: 2,
          scale: 0.1,
          highContrast: true,
          reduceMotion: true,
        }),
      ),
    ).toEqual({
      version: 1,
      opacity: 0.98,
      scale: 0.85,
      highContrast: true,
      reduceMotion: true,
    });
  });
});
