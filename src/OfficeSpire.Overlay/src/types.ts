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
export interface CombatScreen {
  waiting_for_input: boolean;
  round_number: number;
  is_play_phase: boolean;
  energy: number;
  max_energy: number;
  player: { current_hp: number; max_hp: number; block: number };
  hand: CardState[];
  piles: { draw: number; discard: number; exhaust: number };
  enemies: EnemyState[];
  potions: unknown[];
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
  options: RestOptionState[];
  can_proceed: boolean;
  target_selection_pending: boolean;
}
export interface RunState {
  ascension_level: number;
  current_act: number;
  current_floor: number;
  gold: number;
  relics: unknown[];
}
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
export type StateSnapshot =
  | CombatStateSnapshot
  | MapStateSnapshot
  | RewardsStateSnapshot
  | CardSelectionStateSnapshot
  | EventStateSnapshot
  | RestStateSnapshot
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
    | "choose_map_node"
    | "choose_reward"
    | "choose_reward_card"
    | "skip_rewards"
    | "choose_card_option"
    | "confirm_card_selection"
    | "choose_event_option"
    | "choose_rest_option"
    | "leave_rest_site";
  expected_revision: number;
  payload: Record<string, unknown>;
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
        Array.isArray((c.screen as CombatScreen).enemies))) &&
    (c.phase !== "map" ||
      (Array.isArray((c.screen as MapScreen).reachable_nodes) &&
        Array.isArray((c.screen as MapScreen).all_nodes))) &&
    (c.phase !== "rewards" ||
      (Array.isArray((c.screen as RewardsScreen).items) &&
        Array.isArray((c.screen as RewardsScreen).card_choices))) &&
    (c.phase !== "card_selection" ||
      Array.isArray((c.screen as CardSelectionScreen).options)) &&
    (c.phase !== "event" || Array.isArray((c.screen as EventScreen).options)) &&
    (c.phase !== "rest" || Array.isArray((c.screen as RestScreen).options))
  );
}
