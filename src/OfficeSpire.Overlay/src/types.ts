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
export interface RunState {
  ascension_level: number;
  current_act: number;
  current_floor: number;
  gold: number;
  relics: unknown[];
}
export interface StateSnapshot {
  protocol_version: number;
  state_revision: number;
  phase: string;
  action_pending: boolean;
  run: RunState;
  screen: CombatScreen;
}
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
  action: "play_card" | "end_turn";
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
    Array.isArray((c.screen as CombatScreen).hand) &&
    Array.isArray((c.screen as CombatScreen).enemies)
  );
}
