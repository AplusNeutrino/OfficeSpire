import { hasStableSnapshotIdentities } from "./network/snapshotIdentity";
export const PROTOCOL_VERSION = 1;
export type ConnectionStatus =
  | "discovering"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "incompatible"
  | "error";
export interface SessionDescriptor {
  protocol_version: number;
  port: number;
  token: string;
  process_id: number;
  created_utc: string;
}
export interface PowerState {
  name: string;
  amount: number;
  description: string;
}
export interface RelicState {
  id: string;
  name: string;
  description: string;
  stack_count: number;
}
export interface EnemyState {
  stable_id: string;
  combat_id: number;
  name: string;
  current_hp: number;
  max_hp: number;
  block: number;
  intent: string;
  powers: PowerState[];
  is_alive: boolean;
  is_hittable: boolean;
}
export interface CardState {
  hand_index: number;
  id: string;
  name: string;
  cost: number;
  type: string;
  rarity: string;
  damage: number | null;
  block: number | null;
  description: string;
  can_play: boolean;
  unplayable_reason: string | null;
  needs_target: boolean;
  valid_target_ids: number[];
}
export interface PotionState {
  slot_index: number;
  id: string;
  name: string;
  description: string;
  target_type: string;
  can_use: boolean;
  can_discard: boolean;
  needs_target: boolean;
  valid_target_ids: number[];
}
export interface CombatScreen {
  waiting_for_input: boolean;
  round_number: number;
  is_play_phase: boolean;
  energy: number;
  max_energy: number;
  player: {
    current_hp: number;
    max_hp: number;
    block: number;
    powers: PowerState[];
  };
  hand: CardState[];
  piles: { draw: number; discard: number; exhaust: number };
  enemies: EnemyState[];
  potion_capacity: number;
  potions: PotionState[];
}
export interface MapNodeState {
  stable_id: string;
  column: number;
  row: number;
  node_type: string;
  reachable: boolean;
}
export interface MapScreen {
  waiting_for_input: boolean;
  map_generation: number;
  current_node: MapNodeState | null;
  reachable_nodes: MapNodeState[];
  all_nodes: MapNodeState[];
}
export interface RewardCardState {
  choice_index: number;
  id: string;
  name: string;
  cost: number;
  type: string;
  rarity: string;
  description: string;
}
export interface RewardItemState {
  choice_index: number;
  action_token: string;
  reward_type: string;
  name: string;
  description: string;
  card_options: RewardCardState[];
}
export interface RewardsScreen {
  waiting_for_input: boolean;
  mode: "rewards" | "card_selection" | "unavailable";
  items: RewardItemState[];
  card_choices: RewardCardState[];
  can_skip: boolean;
}
export interface CardSelectionScreen {
  waiting_for_input: boolean;
  selection_type: string;
  options: RewardCardState[];
  can_skip: boolean;
  min_select: number;
  max_select: number;
  current_select_count: number;
  can_confirm: boolean;
}
export interface EventOptionState {
  option_index: number;
  action_token: string;
  title: string;
  description: string;
  is_locked: boolean;
  is_proceed: boolean;
}
export interface EventScreen {
  waiting_for_input: boolean;
  name: string;
  description: string;
  is_finished: boolean;
  options: EventOptionState[];
}
export interface RestOptionState {
  option_index: number;
  id: string;
  name: string;
  description: string;
}
export interface RestScreen {
  waiting_for_input: boolean;
  interaction_state: "options" | "player_target" | "proceed" | "resolving";
  options: RestOptionState[];
  can_proceed: boolean;
  target_selection_pending: boolean;
}
export interface TreasureRelicState {
  choice_index: number;
  id: string;
  name: string;
  description: string;
}
export interface TreasureScreen {
  waiting_for_input: boolean;
  chest_opened: boolean;
  is_picking: boolean;
  can_leave: boolean;
  relics: TreasureRelicState[];
  selected_relic_index: number | null;
}
export interface ShopItemState {
  category: "character_card" | "colorless_card" | "relic" | "potion";
  item_index: number;
  item_id: string;
  name: string;
  price: number;
  description: string;
  is_stocked: boolean;
  enough_gold: boolean;
}
export interface ShopScreen {
  waiting_for_input: boolean;
  inventory_open: boolean;
  gold: number;
  items: ShopItemState[];
  card_removal_available: boolean;
  card_removal_cost: number;
  can_leave: boolean;
}
export interface RunState {
  ascension_level: number;
  current_act: number;
  current_floor: number;
  gold: number;
  relics: RelicState[];
}
export interface LifecycleScreen {
  waiting_for_input: false;
  status: string;
  message: string;
  can_start_run: false;
}
const runEndStatuses = new Set(["victory", "defeat", "abandoned"]);
interface BaseStateSnapshot {
  protocol_version: number;
  state_revision: number;
  phase: string;
  action_pending: boolean;
  run: RunState;
}
export interface CombatStateSnapshot extends BaseStateSnapshot {
  phase: "combat";
  screen: CombatScreen;
}
export interface MapStateSnapshot extends BaseStateSnapshot {
  phase: "map";
  screen: MapScreen;
}
export interface RewardsStateSnapshot extends BaseStateSnapshot {
  phase: "rewards";
  screen: RewardsScreen;
}
export interface CardSelectionStateSnapshot extends BaseStateSnapshot {
  phase: "card_selection";
  screen: CardSelectionScreen;
}
export interface EventStateSnapshot extends BaseStateSnapshot {
  phase: "event";
  screen: EventScreen;
}
export interface RestStateSnapshot extends BaseStateSnapshot {
  phase: "rest";
  screen: RestScreen;
}
export interface TreasureStateSnapshot extends BaseStateSnapshot {
  phase: "treasure";
  screen: TreasureScreen;
}
export interface ShopStateSnapshot extends BaseStateSnapshot {
  phase: "shop";
  screen: ShopScreen;
}
export interface LifecycleStateSnapshot extends BaseStateSnapshot {
  phase: "menu" | "run_end";
  screen: LifecycleScreen;
}
export type StateSnapshot =
  | CombatStateSnapshot
  | MapStateSnapshot
  | RewardsStateSnapshot
  | CardSelectionStateSnapshot
  | EventStateSnapshot
  | RestStateSnapshot
  | TreasureStateSnapshot
  | ShopStateSnapshot
  | LifecycleStateSnapshot
  | (BaseStateSnapshot & { screen: Record<string, unknown> });
export interface WireEnvelope<T = unknown> {
  type: string;
  protocol_version: number;
  body: T;
}
export interface ActionResponse {
  request_id: string;
  accepted: boolean;
  code: string;
  message: string;
  state_revision: number;
}
export interface OverlayAction {
  request_id: string;
  action:
    | "play_card"
    | "end_turn"
    | "use_potion"
    | "discard_potion"
    | "choose_map_node"
    | "choose_reward"
    | "choose_reward_card"
    | "skip_rewards"
    | "choose_card_option"
    | "confirm_card_selection"
    | "choose_event_option"
    | "choose_rest_option"
    | "leave_rest_site"
    | "open_treasure"
    | "choose_treasure_relic"
    | "skip_treasure_relic"
    | "leave_treasure"
    | "open_shop"
    | "buy_shop_item"
    | "request_card_removal"
    | "leave_shop";
  expected_revision: number;
  payload: Record<string, unknown>;
}

function isValidRestScreen(screen: RestScreen): boolean {
  if (!Array.isArray(screen.options)) return false;
  switch (screen.interaction_state) {
    case "options":
      return (
        screen.waiting_for_input === true &&
        screen.options.length > 0 &&
        screen.target_selection_pending === false
      );
    case "player_target":
      return (
        screen.waiting_for_input === false &&
        screen.target_selection_pending === true
      );
    case "proceed":
      return (
        screen.waiting_for_input === true &&
        screen.can_proceed === true &&
        screen.target_selection_pending === false
      );
    case "resolving":
      return (
        screen.waiting_for_input === false &&
        screen.target_selection_pending === false
      );
    default:
      return false;
  }
}

export function isStateSnapshot(value: unknown): value is StateSnapshot {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<StateSnapshot>;
  return (
    c.protocol_version === PROTOCOL_VERSION &&
    typeof c.state_revision === "number" &&
    typeof c.phase === "string" &&
    typeof c.action_pending === "boolean" &&
    !!c.run &&
    !!c.screen &&
    (c.phase !== "combat" ||
      (Array.isArray((c.screen as CombatScreen).hand) &&
        Array.isArray((c.run as RunState).relics) &&
        Array.isArray((c.screen as CombatScreen).enemies) &&
        Array.isArray((c.screen as CombatScreen).player?.powers) &&
        Number.isInteger((c.screen as CombatScreen).potion_capacity) &&
        (c.screen as CombatScreen).potion_capacity >=
          (c.screen as CombatScreen).potions?.length &&
        Array.isArray((c.screen as CombatScreen).potions))) &&
    (c.phase !== "map" ||
      (Number.isInteger((c.screen as MapScreen).map_generation) &&
        (c.screen as MapScreen).map_generation >= 0 &&
        Array.isArray((c.screen as MapScreen).reachable_nodes) &&
        Array.isArray((c.screen as MapScreen).all_nodes))) &&
    (c.phase !== "rewards" ||
      (Array.isArray((c.screen as RewardsScreen).items) &&
        Array.isArray((c.screen as RewardsScreen).card_choices))) &&
    (c.phase !== "card_selection" ||
      Array.isArray((c.screen as CardSelectionScreen).options)) &&
    (c.phase !== "event" || Array.isArray((c.screen as EventScreen).options)) &&
    (c.phase !== "rest" || isValidRestScreen(c.screen as RestScreen)) &&
    (c.phase !== "treasure" ||
      Array.isArray((c.screen as TreasureScreen).relics)) &&
    (c.phase !== "shop" || Array.isArray((c.screen as ShopScreen).items)) &&
    (c.phase !== "menu" ||
      (c.action_pending === false &&
        (c.screen as LifecycleScreen).waiting_for_input === false &&
        (c.screen as LifecycleScreen).status === "no_active_run" &&
        typeof (c.screen as LifecycleScreen).message === "string" &&
        (c.screen as LifecycleScreen).can_start_run === false)) &&
    (c.phase !== "run_end" ||
      (c.action_pending === false &&
        (c.screen as LifecycleScreen).waiting_for_input === false &&
        runEndStatuses.has((c.screen as LifecycleScreen).status) &&
        typeof (c.screen as LifecycleScreen).message === "string" &&
        (c.screen as LifecycleScreen).can_start_run === false)) &&
    hasStableSnapshotIdentities(c as StateSnapshot)
  );
}
