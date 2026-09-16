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
  createSpecialEventCellAction,
  createSpecialEventToolAction,
  createProceedSpecialEventAction,
  createRestOptionAction,
  createLeaveRestSiteAction,
  createTreasureAction,
  createTreasureRelicAction,
  createShopAction,
  createBuyShopItemAction,
  createPlayCardAction,
  createUsePotionAction,
  createDiscardPotionAction,
  createMenuOptionAction,
  createRunAscensionAction,
  createCustomSeedAction,
  createRunEndAction,
} from "../actions/actionDispatcher";
import { isStateSnapshot, type StateSnapshot } from "../types";
import { resolveCombatShortcut } from "../actions/combatKeyboard";
import { resolveRunShortcut } from "../actions/runKeyboard";
import { ACTION_TIMEOUT_MS, clientTimeoutResult } from "./actionLifecycle";
import { ReconnectController } from "./reconnect";
import { shouldMoveDecisionFocus } from "../accessibility/focusPolicy";
import { DEFAULT_SETTINGS, parseSettings } from "../settings";
import { analyzeRuntimeLog } from "../../scripts/analyze-runtime-log.mjs";
import { normalizeGameText, normalizeSnapshotText } from "./richText";
describe("OfficeSpire wire protocol", () => {
  it("normalizes STS2 color, icon, line-break, and dynamic-variable markup", () => {
    expect(
      normalizeGameText(
        "[gold]Gain[/gold] [color=#ffd700]25 Gold[/color][br][img]res://ui/ironclad_energy.png[/img] {MissingVar}",
      ),
    ).toBe("Gain 25 Gold\nenergy");
  });

  it("normalizes presentation fields without changing stable identities", () => {
    const snapshot = {
      protocol_version: 1,
      state_revision: 3,
      phase: "event",
      action_pending: false,
      run: {},
      screen: {
        waiting_for_input: true,
        name: "[gold]Golden Idol[/gold]",
        description: "[color=red]Danger[/color]",
        is_finished: false,
        options: [
          {
            option_index: 0,
            title: "[green]Take it[/green]",
            description: "Gain {Amount} [gold]Gold[/gold]",
            is_locked: false,
            is_proceed: false,
            stable_id: "event-[gold]-0",
          },
        ],
      },
    } as unknown as StateSnapshot;
    const normalized = normalizeSnapshotText(snapshot);
    const screen = normalized.screen as {
      name: string;
      options: Array<{ description: string; stable_id: string }>;
    };
    expect(screen.name).toBe("Golden Idol");
    expect(screen.options[0].description).toBe("Gain Gold");
    expect(screen.options[0].stable_id).toBe("event-[gold]-0");
  });
  it("analyzes runtime state transitions without declaring a runtime pass", () => {
    const report = analyzeRuntimeLog(`
[2026-09-15T01:00:00Z] [OfficeSpire] state_changed | rev=8 phase=combat pending=False
[2026-09-15T01:00:01Z] [OfficeSpire] state_changed | rev=8 phase=combat pending=True
[2026-09-15T01:00:02Z] [OfficeSpire] state_changed | rev=9 phase=combat pending=False
`);
    expect(report.samples).toBe(3);
    expect(report.source_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.first_timestamp).toBe("2026-09-15T01:00:00Z");
    expect(report.last_timestamp).toBe("2026-09-15T01:00:02Z");
    expect(report.pending_cycles).toHaveLength(1);
    expect(report.pending_cycles[0].revision_advanced).toBe(true);
    expect(report.revision_regressions).toEqual([]);
    expect(report.invariant_warnings).toBe(0);
    expect(report.requires_manual_runtime_judgment).toBe(true);
  });

  it("flags revision regressions and same-revision phase changes", () => {
    const report = analyzeRuntimeLog(`
[2026-09-15T01:00:00Z] [OfficeSpire] state_changed | rev=9 phase=combat pending=False
[2026-09-15T01:00:01Z] [OfficeSpire] state_changed | rev=9 phase=map pending=False
[2026-09-15T01:00:02Z] [OfficeSpire] state_changed | rev=8 phase=map pending=False
`);
    expect(report.same_revision_phase_changes).toHaveLength(1);
    expect(report.revision_regressions).toHaveLength(1);
    expect(report.invariant_warnings).toBe(2);
  });
  it("flags malformed state records and non-monotonic timestamps", () => {
    const report = analyzeRuntimeLog(`
[2026-09-15T01:00:02Z] [OfficeSpire] state_changed | rev=8 phase=map pending=False
[2026-09-15T01:00:01Z] [OfficeSpire] state_changed | rev=9 phase=map pending=False
[not-a-date] [OfficeSpire] state_changed | rev=10 phase=map pending=False
[2026-09-15T01:00:03Z] [OfficeSpire] state_changed | broken
`);
    expect(report.invalid_timestamp_lines).toEqual([4]);
    expect(report.timestamp_regressions).toHaveLength(1);
    expect(report.malformed_state_lines).toEqual([5]);
    expect(report.invariant_warnings).toBe(3);
  });
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
    const action = createChooseMapNodeAction(2, 7, "map-3-2-7", 3, 41);
    expect(action).toMatchObject({
      action: "choose_map_node",
      expected_revision: 41,
      payload: {
        column: 2,
        row: 7,
        stable_id: "map-3-2-7",
        map_generation: 3,
      },
    });
  });
  it("accepts map snapshots without combat-only arrays", () => {
    const map = {
      protocol_version: 1,
      state_revision: 9,
      phase: "map",
      action_pending: false,
      run: {},
      screen: {
        waiting_for_input: true,
        map_generation: 3,
        current_node: null,
        reachable_nodes: [
          {
            stable_id: "map-3-2-7",
            column: 2,
            row: 7,
            node_type: "Monster",
            reachable: true,
          },
        ],
        all_nodes: [],
        votes: [],
      },
    };
    expect(isStateSnapshot(map)).toBe(true);
    expect(
      isStateSnapshot({
        ...map,
        screen: {
          ...map.screen,
          votes: [
            {
              player_id: "local-player",
              choice_index: null,
              choice_id: "map-3-2-7",
            },
          ],
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...map,
        screen: {
          ...map.screen,
          votes: [
            {
              player_id: "local-player",
              choice_index: -1,
              choice_id: "map-3-2-7",
            },
          ],
        },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        ...map,
        screen: { ...map.screen, map_generation: 4 },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 13,
        phase: "event",
        action_pending: false,
        run: {},
        screen: {
          options: [
            { option_index: 0, action_token: "same" },
            { option_index: 1, action_token: "same" },
          ],
        },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 14,
        phase: "rewards",
        action_pending: false,
        run: {},
        screen: {
          mode: "rewards",
          items: [{ choice_index: 0, action_token: "" }],
          card_choices: [],
        },
      }),
    ).toBe(false);
  });
  it("accepts actionable menu lifecycle snapshots", () => {
    const menu = {
      protocol_version: 1,
      state_revision: 0,
      phase: "menu",
      action_pending: false,
      run: {},
      screen: {
        waiting_for_input: true,
        menu_screen: "main",
        message: "Choose an action in the original STS2 window.",
        options: [
          {
            id: "continue",
            label: "Continue",
            enabled: true,
            actionable: true,
          },
          {
            id: "singleplayer",
            label: "Single player",
            enabled: true,
            actionable: true,
          },
        ],
        can_mutate: true,
        current_profile_id: null,
        characters: null,
        popup_body: "",
        popup_title: "",
        run_setup: null,
        lobby: null,
        connection: null,
        saved_run: null,
      },
    };
    expect(isStateSnapshot(menu)).toBe(true);
    expect(isStateSnapshot({ ...menu, action_pending: true })).toBe(false);
    expect(
      isStateSnapshot({
        ...menu,
        screen: { ...menu.screen, can_mutate: false },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        ...menu,
        screen: {
          ...menu.screen,
          menu_screen: "character_select",
          characters: [
            {
              id: "IRONCLAD",
              name: "Ironclad",
              locked: false,
              starting_hp: 80,
              starting_gold: 99,
              max_energy: 3,
              description: "",
              starting_relics: [
                { name: "Burning Blood", description: "Heal after combat." },
              ],
              starting_deck: ["Strike", "Defend"],
            },
          ],
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...menu,
        screen: {
          ...menu.screen,
          menu_screen: "custom_run",
          run_setup: {
            mode: "custom",
            ascension: 10,
            max_ascension: 20,
            seed: "OFFICE",
            act_one: "random",
            daily_server_time: null,
            modifiers: [
              { id: "DRAFT", name: "Draft", description: "Draft a deck." },
            ],
          },
          lobby: {
            role: "singleplayer",
            max_players: 1,
            local_player_id: "1",
            all_ready: false,
            players: [
              {
                id: "1",
                slot_id: 0,
                is_local: true,
                is_host: null,
                character_id: "IRONCLAD",
                character_name: "Ironclad",
                is_ready: false,
              },
            ],
          },
          connection: null,
          saved_run: null,
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...menu,
        screen: {
          ...menu.screen,
          menu_screen: "multiplayer_join",
          connection: {
            status: "available",
            connected_players: 0,
            required_players: null,
            sessions: [
              { id: "7656119", label: "Player 7656119", enabled: true },
            ],
          },
          saved_run: null,
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...menu,
        screen: {
          ...menu.screen,
          menu_screen: "multiplayer_load",
          connection: {
            status: "load_lobby",
            connected_players: 1,
            required_players: 2,
            sessions: [],
          },
          saved_run: {
            mode: "standard",
            ascension: 3,
            current_act: 2,
            visited_floor_count: 19,
            missing_players: 1,
            players: [
              {
                id: "1",
                character_id: "IRONCLAD",
                current_hp: 40,
                max_hp: 80,
                max_energy: 3,
                potion_capacity: 3,
                gold: 120,
                connected: true,
              },
              {
                id: "2",
                character_id: "SILENT",
                current_hp: 35,
                max_hp: 70,
                max_energy: 3,
                potion_capacity: 3,
                gold: 80,
                connected: false,
              },
            ],
          },
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...menu,
        screen: {
          ...menu.screen,
          options: [
            { id: "continue", label: "Continue", enabled: true },
            { id: "continue", label: "Duplicate", enabled: false },
          ],
        },
      }),
    ).toBe(false);
  });
  it("creates identity-bound menu and run setup actions", () => {
    expect(
      createMenuOptionAction("character_select", "IRONCLAD", 20),
    ).toMatchObject({
      action: "choose_menu_option",
      expected_revision: 20,
      payload: { menu_screen: "character_select", option_id: "IRONCLAD" },
    });
    expect(createRunAscensionAction("custom_run", 10, 21)).toMatchObject({
      action: "set_run_ascension",
      expected_revision: 21,
      payload: { menu_screen: "custom_run", ascension: 10 },
    });
    expect(createCustomSeedAction(null, 22)).toMatchObject({
      action: "set_custom_seed",
      expected_revision: 22,
      payload: { menu_screen: "custom_run", seed: null },
    });
  });
  it("accepts only known read-only run-end outcomes", () => {
    const runEnd = {
      protocol_version: 1,
      state_revision: 18,
      phase: "run_end",
      action_pending: false,
      run: {},
      screen: {
        waiting_for_input: true,
        status: "victory",
        message: "The game reports that this run ended in victory.",
        can_start_run: false,
        stage: "outcome",
        score: 1234,
        floors_climbed: 51,
        unlocks_remaining: 2,
        current_unlock_score: 40,
        unlock_score_threshold: 100,
        unlocked_epoch_id: "",
        discoveries: { cards: 2, relics: 1, potions: 0, enemies: 3, epochs: 0 },
        can_view_summary: true,
        can_return_to_menu: false,
      },
    };
    expect(isStateSnapshot(runEnd)).toBe(true);
    expect(isStateSnapshot({ ...runEnd, action_pending: true })).toBe(false);
    expect(
      isStateSnapshot({
        ...runEnd,
        action_pending: true,
        screen: {
          ...runEnd.screen,
          waiting_for_input: false,
          stage: "settling",
          can_view_summary: false,
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...runEnd,
        screen: { ...runEnd.screen, status: "unknown" },
      }),
    ).toBe(false);
    expect(createRunEndAction("main_menu", 18)).toMatchObject({
      action: "advance_run_end",
      expected_revision: 18,
      payload: { target: "main_menu" },
    });
    expect(
      isStateSnapshot({
        ...runEnd,
        screen: {
          ...runEnd.screen,
          stage: "summary",
          can_view_summary: false,
          can_return_to_menu: true,
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
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 11,
        phase: "card_selection",
        action_pending: false,
        run: {},
        screen: {
          options: [{ choice_index: 0, id: "" }],
        },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 12,
        phase: "treasure",
        action_pending: false,
        run: {},
        screen: {
          relics: [{ choice_index: 0, id: "" }],
        },
      }),
    ).toBe(false);
  });
  it("accepts a complete combat player inventory snapshot", () => {
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 13,
        phase: "combat",
        action_pending: false,
        run: {
          character_id: "IRONCLAD",
          character_name: "Ironclad",
          deck_cards: [],
          party: {
            role: "host",
            local_player_id: "1",
            connected_players: 1,
            members: [
              {
                id: "1",
                is_local: true,
                connected: true,
                character_id: "IRONCLAD",
                character_name: "Ironclad",
                current_hp: 64,
                max_hp: 80,
                block: 5,
                is_alive: true,
                gold: 120,
                max_energy: 3,
                potion_count: 1,
                potion_capacity: 3,
              },
              {
                id: "2",
                is_local: false,
                connected: false,
                character_id: "SILENT",
                character_name: "Silent",
                current_hp: 50,
                max_hp: 70,
                block: 0,
                is_alive: true,
                gold: 80,
                max_energy: 3,
                potion_count: 0,
                potion_capacity: 3,
              },
            ],
          },
          relics: [
            {
              id: "burning-blood",
              name: "Burning Blood",
              description: "Heal after combat.",
              stack_count: 1,
            },
          ],
        },
        screen: {
          waiting_for_input: true,
          combat_phase: "PlayPhase",
          action_queues_empty: true,
          participants: [
            {
              player_id: "1",
              turn_phase: "Play",
              is_play_phase: true,
              action_queue_paused: false,
              can_submit_actions: true,
            },
            {
              player_id: "2",
              turn_phase: "Play",
              is_play_phase: true,
              action_queue_paused: false,
              can_submit_actions: false,
            },
          ],
          player: {
            current_hp: 64,
            max_hp: 80,
            block: 5,
            powers: [
              { name: "Strength", amount: 2, description: "Deal more damage." },
            ],
          },
          stars: null,
          orb_capacity: 0,
          orbs: [],
          companions: [],
          piles: {
            draw: 0,
            discard: 0,
            exhaust: 0,
            draw_cards: [],
            discard_cards: [],
            exhaust_cards: [],
          },
          hand: [],
          enemies: [],
          potion_capacity: 3,
          potions: [],
        },
      }),
    ).toBe(true);
  });
  it("creates reward selection and skip actions", () => {
    expect(
      createRewardAction("choose_reward_card", 1, 52, "strike"),
    ).toMatchObject({
      action: "choose_reward_card",
      expected_revision: 52,
      payload: { choice_index: 1, card_id: "strike" },
    });
    expect(
      createRewardAction("choose_reward", 0, 52, undefined, "reward-token"),
    ).toMatchObject({
      action: "choose_reward",
      expected_revision: 52,
      payload: { choice_index: 0, action_token: "reward-token" },
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
    expect(createCardOptionAction(2, "defend", 61)).toMatchObject({
      action: "choose_card_option",
      expected_revision: 61,
      payload: { choice_index: 2, card_id: "defend" },
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
          unavailable_reason: null,
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 62,
        phase: "card_selection",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: false,
          selection_type: "unsupported_grid",
          options: [],
          can_skip: false,
          min_select: 1,
          max_select: 1,
          current_select_count: 0,
          can_confirm: false,
          unavailable_reason:
            "NDeckTransformSelectScreen must be completed in STS2.",
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 63,
        phase: "card_selection",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          selection_type: "unsupported_grid",
          options: [],
          can_skip: false,
          min_select: 1,
          max_select: 1,
          current_select_count: 0,
          can_confirm: false,
          unavailable_reason: "Unsafe variant.",
        },
      }),
    ).toBe(false);
  });
  it("creates a guarded hand-selection confirmation", () => {
    expect(createConfirmCardSelectionAction(62)).toMatchObject({
      action: "confirm_card_selection",
      expected_revision: 62,
      payload: {},
    });
  });
  it("creates and parses event decisions", () => {
    expect(createEventOptionAction(1, "event-token", 70)).toMatchObject({
      action: "choose_event_option",
      expected_revision: 70,
      payload: { option_index: 1, action_token: "event-token" },
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
          is_shared: false,
          votes: [],
        },
      }),
    ).toBe(true);
  });
  it("creates and parses rest-site decisions", () => {
    expect(createRestOptionAction(0, "rest", 80)).toMatchObject({
      action: "choose_rest_option",
      expected_revision: 80,
      payload: { option_index: 0, option_id: "rest" },
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
          interaction_state: "proceed",
          options: [],
          can_proceed: true,
          target_selection_pending: false,
          player_decisions: [],
        },
      }),
    ).toBe(true);
    const resolving = {
      protocol_version: 1,
      state_revision: 81,
      phase: "rest",
      action_pending: true,
      run: {},
      screen: {
        waiting_for_input: false,
        interaction_state: "resolving",
        options: [],
        can_proceed: false,
        target_selection_pending: false,
        player_decisions: [],
      },
    };
    expect(isStateSnapshot(resolving)).toBe(true);
    expect(
      isStateSnapshot({
        ...resolving,
        screen: {
          ...resolving.screen,
          player_decisions: [
            {
              player_id: "local-player",
              available_options: [
                {
                  option_index: 0,
                  id: "rest",
                  name: "Rest",
                  description: "Heal.",
                },
              ],
              last_chosen_option_index: null,
              hovered_option_index: 0,
            },
          ],
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        ...resolving,
        screen: {
          ...resolving.screen,
          player_decisions: [
            {
              player_id: "local-player",
              available_options: [],
              last_chosen_option_index: null,
              hovered_option_index: 0,
            },
          ],
        },
      }),
    ).toBe(false);
    expect(
      isStateSnapshot({
        ...resolving,
        screen: { ...resolving.screen, waiting_for_input: true },
      }),
    ).toBe(false);
  });
  it("creates and parses treasure decisions", () => {
    expect(createTreasureAction("open_treasure", 90).action).toBe(
      "open_treasure",
    );
    expect(createTreasureRelicAction(1, "anchor", 91)).toMatchObject({
      action: "choose_treasure_relic",
      expected_revision: 91,
      payload: { choice_index: 1, relic_id: "anchor" },
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
          votes: [],
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 91,
        phase: "treasure",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          chest_opened: true,
          is_picking: true,
          can_leave: false,
          relics: [
            {
              choice_index: 0,
              id: "anchor",
              name: "Anchor",
              description: "Gain Block.",
            },
          ],
          selected_relic_index: 0,
          votes: [{ player_id: "local", choice_index: 0, choice_id: "anchor" }],
        },
      }),
    ).toBe(true);
    expect(
      isStateSnapshot({
        protocol_version: 1,
        state_revision: 92,
        phase: "treasure",
        action_pending: false,
        run: {},
        screen: {
          waiting_for_input: true,
          chest_opened: false,
          is_picking: true,
          can_leave: false,
          relics: [],
          selected_relic_index: null,
          votes: [],
        },
      }),
    ).toBe(false);
  });
  it("creates and parses merchant decisions", () => {
    expect(createBuyShopItemAction("relic", 2, "anchor", 100)).toMatchObject({
      action: "buy_shop_item",
      expected_revision: 100,
      payload: { category: "relic", item_index: 2, item_id: "anchor" },
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
    expect(createPlayCardAction(0, "strike", 109, 7)).toMatchObject({
      action: "play_card",
      expected_revision: 109,
      payload: { hand_index: 0, card_id: "strike", target_id: 7 },
    });
    expect(createUsePotionAction(1, "fire_potion", 110, 7)).toMatchObject({
      action: "use_potion",
      expected_revision: 110,
      payload: { slot_index: 1, potion_id: "fire_potion", target_id: 7 },
    });
    expect(createDiscardPotionAction(2, "swift_potion", 111)).toMatchObject({
      action: "discard_potion",
      expected_revision: 111,
      payload: { slot_index: 2, potion_id: "swift_potion" },
    });
  });
  it("validates Crystal Sphere state and creates identity-bound actions", () => {
    const state = {
      protocol_version: 1,
      state_revision: 112,
      phase: "special_event",
      action_pending: false,
      run: {},
      screen: {
        waiting_for_input: true,
        variant: "crystal_sphere",
        native_type: "NCrystalSphereScreen",
        message: "Choose a cell.",
        selected_tool: "big",
        remaining_actions: 3,
        cells: [
          {
            x: 2,
            y: 4,
            stable_id: "crystal-cell-2-4",
            label: "Hidden cell 3, 5",
          },
        ],
        can_select_small_tool: true,
        can_select_big_tool: true,
        can_proceed: false,
        unavailable_reason: null,
      },
    };
    expect(isStateSnapshot(state)).toBe(true);
    expect(
      createSpecialEventCellAction(2, 4, "crystal-cell-2-4", 112),
    ).toMatchObject({
      action: "choose_special_event_cell",
      expected_revision: 112,
      payload: { x: 2, y: 4, stable_id: "crystal-cell-2-4" },
    });
    expect(createSpecialEventToolAction("small", 112).action).toBe(
      "select_special_event_tool",
    );
    expect(createProceedSpecialEventAction(113).action).toBe(
      "proceed_special_event",
    );
  });
  it("rejects malformed and falsely actionable special-event fallbacks", () => {
    const fallback = {
      protocol_version: 1,
      state_revision: 114,
      phase: "special_event",
      action_pending: true,
      run: {},
      screen: {
        waiting_for_input: true,
        variant: "fake_merchant",
        native_type: "NFakeMerchant",
        message: "Use STS2.",
        selected_tool: null,
        remaining_actions: null,
        cells: [],
        can_select_small_tool: false,
        can_select_big_tool: false,
        can_proceed: false,
        unavailable_reason: "No stable contract.",
      },
    };
    expect(isStateSnapshot(fallback)).toBe(false);
    expect(
      isStateSnapshot({
        ...fallback,
        screen: { ...fallback.screen, waiting_for_input: false },
      }),
    ).toBe(true);
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
  it("moves focus only when the decision surface changes outside settings", () => {
    expect(shouldMoveDecisionFocus(undefined, "menu", false)).toBe(true);
    expect(shouldMoveDecisionFocus("map", "combat", false)).toBe(true);
    expect(shouldMoveDecisionFocus("combat", "combat", false)).toBe(false);
    expect(shouldMoveDecisionFocus("map", "combat", true)).toBe(false);
    expect(shouldMoveDecisionFocus("combat", undefined, false)).toBe(false);
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
