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
export interface OrbState {
  id: string;
  name: string;
  description: string;
  passive_value: number;
  evoke_value: number;
}
export interface CompanionState {
  id: string;
  name: string;
  is_alive: boolean;
  current_hp: number;
  max_hp: number;
  block: number;
  powers: PowerState[];
}
export interface InventoryCardState {
  index: number;
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  is_upgraded: boolean;
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
  stars: number | null;
  orb_capacity: number;
  orbs: OrbState[];
  companions: CompanionState[];
  hand: CardState[];
  piles: {
    draw: number;
    discard: number;
    exhaust: number;
    draw_cards: InventoryCardState[];
    discard_cards: InventoryCardState[];
    exhaust_cards: InventoryCardState[];
  };
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
export interface DecisionVoteState {
  player_id: string;
  choice_index: number | null;
  choice_id: string | null;
}
export interface MapScreen {
  waiting_for_input: boolean;
  map_generation: number;
  current_node: MapNodeState | null;
  reachable_nodes: MapNodeState[];
  all_nodes: MapNodeState[];
  votes: DecisionVoteState[];
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
  is_shared: boolean;
  votes: DecisionVoteState[];
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
  votes: DecisionVoteState[];
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
  character_id: string;
  character_name: string;
  deck_cards: InventoryCardState[];
  party: RunPartyState | null;
}
export interface RunPartyMemberState {
  id: string;
  is_local: boolean;
  connected: boolean;
  character_id: string;
  character_name: string;
  current_hp: number;
  max_hp: number;
  block: number;
  is_alive: boolean;
  gold: number;
  max_energy: number;
  potion_count: number;
  potion_capacity: number;
}
export interface RunPartyState {
  role: string;
  local_player_id: string;
  connected_players: number;
  members: RunPartyMemberState[];
}
export interface LifecycleScreen {
  waiting_for_input: false;
  status: string;
  message: string;
  can_start_run: false;
}
export interface MenuOptionState {
  id: string;
  label: string;
  enabled: boolean;
}
export interface MenuStartingRelicState {
  name: string;
  description: string;
}
export interface MenuCharacterState {
  id: string;
  name: string;
  locked: boolean;
  starting_hp: number;
  starting_gold: number;
  max_energy: number;
  description: string;
  starting_relics: MenuStartingRelicState[];
  starting_deck: string[];
}
export interface MenuModifierState {
  id: string;
  name: string;
  description: string;
}
export interface MenuRunSetupState {
  mode: string;
  ascension: number;
  max_ascension: number;
  seed: string | null;
  act_one: string;
  daily_server_time: string | null;
  modifiers: MenuModifierState[];
}
export interface MenuLobbyPlayerState {
  id: string;
  slot_id: number;
  is_local: boolean;
  is_host: boolean | null;
  character_id: string;
  character_name: string;
  is_ready: boolean;
}
export interface MenuLobbyState {
  role: string;
  max_players: number | null;
  local_player_id: string;
  all_ready: boolean;
  players: MenuLobbyPlayerState[];
}
export interface MenuSessionState {
  id: string;
  label: string;
  enabled: boolean;
}
export interface MenuConnectionState {
  status: string;
  connected_players: number;
  required_players: number | null;
  sessions: MenuSessionState[];
}
export interface MenuSavedPlayerState {
  id: string;
  character_id: string;
  current_hp: number;
  max_hp: number;
  max_energy: number;
  potion_capacity: number;
  gold: number;
  connected: boolean;
}
export interface MenuSavedRunState {
  mode: string;
  ascension: number;
  current_act: number;
  visited_floor_count: number;
  missing_players: number;
  players: MenuSavedPlayerState[];
}
export interface MenuScreen {
  waiting_for_input: false;
  menu_screen:
    | "main"
    | "singleplayer"
    | "multiplayer"
    | "multiplayer_host"
    | "multiplayer_join"
    | "multiplayer_load"
    | "character_select"
    | "custom_run"
    | "daily_run"
    | "profile_select"
    | "popup"
    | "error_popup"
    | "unknown";
  message: string;
  options: MenuOptionState[];
  can_mutate: false;
  current_profile_id: number | null;
  characters: MenuCharacterState[] | null;
  popup_body: string;
  popup_title: string;
  run_setup: MenuRunSetupState | null;
  lobby: MenuLobbyState | null;
  connection: MenuConnectionState | null;
  saved_run: MenuSavedRunState | null;
}
const runEndStatuses = new Set(["victory", "defeat", "abandoned"]);
const menuScreens = new Set([
  "main",
  "singleplayer",
  "multiplayer",
  "multiplayer_host",
  "multiplayer_join",
  "multiplayer_load",
  "character_select",
  "custom_run",
  "daily_run",
  "profile_select",
  "popup",
  "error_popup",
  "unknown",
]);
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
  phase: "run_end";
  screen: LifecycleScreen;
}
export interface MenuStateSnapshot extends BaseStateSnapshot {
  phase: "menu";
  screen: MenuScreen;
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
  | MenuStateSnapshot
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

function hasValidDecisionVotes(
  votes: DecisionVoteState[],
  run: RunState,
): boolean {
  if (!Array.isArray(votes)) return false;
  if (
    votes.some(
      (vote) =>
        typeof vote.player_id !== "string" ||
        vote.player_id.length === 0 ||
        (vote.choice_index !== null &&
          (!Number.isInteger(vote.choice_index) || vote.choice_index < 0)) ||
        (vote.choice_id !== null &&
          (typeof vote.choice_id !== "string" || vote.choice_id.length === 0)),
    ) ||
    new Set(votes.map((vote) => vote.player_id)).size !== votes.length
  )
    return false;
  if (!run.party) return votes.length <= 1;
  const partyIds = new Set(run.party.members.map((member) => member.id));
  return (
    votes.length === partyIds.size &&
    votes.every((vote) => partyIds.has(vote.player_id))
  );
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
        Array.isArray((c.run as RunState).deck_cards) &&
        ((c.run as RunState).party === null ||
          (typeof (c.run as RunState).party?.role === "string" &&
            typeof (c.run as RunState).party?.local_player_id === "string" &&
            Number.isInteger((c.run as RunState).party?.connected_players) &&
            Array.isArray((c.run as RunState).party?.members) &&
            (c.run as RunState).party!.members.length > 1 &&
            (c.run as RunState).party!.connected_players ===
              (c.run as RunState).party!.members.filter(
                (member) => member.connected,
              ).length &&
            (c.run as RunState).party!.members.filter(
              (member) => member.is_local,
            ).length === 1 &&
            (c.run as RunState).party!.members.find((member) => member.is_local)
              ?.id === (c.run as RunState).party!.local_player_id &&
            (c.run as RunState).party!.members.every(
              (member) =>
                typeof member.id === "string" &&
                member.id.length > 0 &&
                typeof member.is_local === "boolean" &&
                typeof member.connected === "boolean" &&
                typeof member.character_id === "string" &&
                typeof member.character_name === "string" &&
                Number.isInteger(member.current_hp) &&
                member.current_hp >= 0 &&
                Number.isInteger(member.max_hp) &&
                member.max_hp >= member.current_hp &&
                Number.isInteger(member.block) &&
                member.block >= 0 &&
                typeof member.is_alive === "boolean" &&
                Number.isInteger(member.gold) &&
                member.gold >= 0 &&
                Number.isInteger(member.max_energy) &&
                member.max_energy >= 0 &&
                Number.isInteger(member.potion_count) &&
                member.potion_count >= 0 &&
                Number.isInteger(member.potion_capacity) &&
                member.potion_capacity >= member.potion_count,
            ) &&
            new Set(
              (c.run as RunState).party!.members.map((member) => member.id),
            ).size === (c.run as RunState).party!.members.length)) &&
        typeof (c.run as RunState).character_id === "string" &&
        (c.run as RunState).character_id.length > 0 &&
        typeof (c.run as RunState).character_name === "string" &&
        (c.run as RunState).character_name.length > 0 &&
        Array.isArray((c.screen as CombatScreen).enemies) &&
        Array.isArray((c.screen as CombatScreen).player?.powers) &&
        ((c.screen as CombatScreen).stars === null ||
          Number.isInteger((c.screen as CombatScreen).stars)) &&
        Number.isInteger((c.screen as CombatScreen).orb_capacity) &&
        (c.screen as CombatScreen).orb_capacity >= 0 &&
        Array.isArray((c.screen as CombatScreen).orbs) &&
        (c.screen as CombatScreen).orbs.length <=
          (c.screen as CombatScreen).orb_capacity &&
        Array.isArray((c.screen as CombatScreen).companions) &&
        Array.isArray((c.screen as CombatScreen).piles?.draw_cards) &&
        Array.isArray((c.screen as CombatScreen).piles?.discard_cards) &&
        Array.isArray((c.screen as CombatScreen).piles?.exhaust_cards) &&
        (c.screen as CombatScreen).piles.draw ===
          (c.screen as CombatScreen).piles.draw_cards.length &&
        (c.screen as CombatScreen).piles.discard ===
          (c.screen as CombatScreen).piles.discard_cards.length &&
        (c.screen as CombatScreen).piles.exhaust ===
          (c.screen as CombatScreen).piles.exhaust_cards.length &&
        Number.isInteger((c.screen as CombatScreen).potion_capacity) &&
        (c.screen as CombatScreen).potion_capacity >=
          (c.screen as CombatScreen).potions?.length &&
        Array.isArray((c.screen as CombatScreen).potions))) &&
    (c.phase !== "map" ||
      (Number.isInteger((c.screen as MapScreen).map_generation) &&
        (c.screen as MapScreen).map_generation >= 0 &&
        Array.isArray((c.screen as MapScreen).reachable_nodes) &&
        Array.isArray((c.screen as MapScreen).all_nodes) &&
        hasValidDecisionVotes(
          (c.screen as MapScreen).votes,
          c.run as RunState,
        ))) &&
    (c.phase !== "rewards" ||
      (Array.isArray((c.screen as RewardsScreen).items) &&
        Array.isArray((c.screen as RewardsScreen).card_choices))) &&
    (c.phase !== "card_selection" ||
      Array.isArray((c.screen as CardSelectionScreen).options)) &&
    (c.phase !== "event" ||
      (Array.isArray((c.screen as EventScreen).options) &&
        Array.isArray((c.screen as EventScreen).votes) &&
        typeof (c.screen as EventScreen).is_shared === "boolean" &&
        (!(c.screen as EventScreen).is_shared ||
          hasValidDecisionVotes(
            (c.screen as EventScreen).votes,
            c.run as RunState,
          )) &&
        ((c.screen as EventScreen).is_shared ||
          (c.screen as EventScreen).votes.length === 0))) &&
    (c.phase !== "rest" || isValidRestScreen(c.screen as RestScreen)) &&
    (c.phase !== "treasure" ||
      (Array.isArray((c.screen as TreasureScreen).relics) &&
        hasValidDecisionVotes(
          (c.screen as TreasureScreen).votes,
          c.run as RunState,
        ))) &&
    (c.phase !== "shop" || Array.isArray((c.screen as ShopScreen).items)) &&
    (c.phase !== "menu" ||
      (c.action_pending === false &&
        (c.screen as MenuScreen).waiting_for_input === false &&
        menuScreens.has((c.screen as MenuScreen).menu_screen) &&
        typeof (c.screen as MenuScreen).message === "string" &&
        Array.isArray((c.screen as MenuScreen).options) &&
        (c.screen as MenuScreen).options.every(
          (option) =>
            typeof option.id === "string" &&
            option.id.length > 0 &&
            typeof option.label === "string" &&
            typeof option.enabled === "boolean",
        ) &&
        new Set((c.screen as MenuScreen).options.map((option) => option.id))
          .size === (c.screen as MenuScreen).options.length &&
        ((c.screen as MenuScreen).current_profile_id === null ||
          ((c.screen as MenuScreen).menu_screen === "profile_select" &&
            Number.isInteger((c.screen as MenuScreen).current_profile_id))) &&
        ((c.screen as MenuScreen).characters === null ||
          ((c.screen as MenuScreen).menu_screen === "character_select" &&
            Array.isArray((c.screen as MenuScreen).characters) &&
            (c.screen as MenuScreen).characters!.every(
              (character) =>
                typeof character.id === "string" &&
                character.id.length > 0 &&
                typeof character.name === "string" &&
                typeof character.locked === "boolean" &&
                Number.isInteger(character.starting_hp) &&
                Number.isInteger(character.starting_gold) &&
                Number.isInteger(character.max_energy) &&
                typeof character.description === "string" &&
                Array.isArray(character.starting_relics) &&
                character.starting_relics.every(
                  (relic) =>
                    typeof relic.name === "string" &&
                    typeof relic.description === "string",
                ) &&
                Array.isArray(character.starting_deck) &&
                character.starting_deck.every(
                  (card) => typeof card === "string",
                ),
            ))) &&
        typeof (c.screen as MenuScreen).popup_body === "string" &&
        typeof (c.screen as MenuScreen).popup_title === "string" &&
        ((c.screen as MenuScreen).run_setup === null ||
          (["character_select", "custom_run", "daily_run"].includes(
            (c.screen as MenuScreen).menu_screen,
          ) &&
            typeof (c.screen as MenuScreen).run_setup!.mode === "string" &&
            Number.isInteger((c.screen as MenuScreen).run_setup!.ascension) &&
            (c.screen as MenuScreen).run_setup!.ascension >= 0 &&
            Number.isInteger(
              (c.screen as MenuScreen).run_setup!.max_ascension,
            ) &&
            (c.screen as MenuScreen).run_setup!.max_ascension >=
              (c.screen as MenuScreen).run_setup!.ascension &&
            ((c.screen as MenuScreen).run_setup!.seed === null ||
              typeof (c.screen as MenuScreen).run_setup!.seed === "string") &&
            typeof (c.screen as MenuScreen).run_setup!.act_one === "string" &&
            ((c.screen as MenuScreen).run_setup!.daily_server_time === null ||
              typeof (c.screen as MenuScreen).run_setup!.daily_server_time ===
                "string") &&
            Array.isArray((c.screen as MenuScreen).run_setup!.modifiers) &&
            (c.screen as MenuScreen).run_setup!.modifiers.every(
              (modifier) =>
                typeof modifier.id === "string" &&
                modifier.id.length > 0 &&
                typeof modifier.name === "string" &&
                typeof modifier.description === "string",
            ))) &&
        ((c.screen as MenuScreen).lobby === null ||
          (["character_select", "custom_run", "daily_run"].includes(
            (c.screen as MenuScreen).menu_screen,
          ) &&
            typeof (c.screen as MenuScreen).lobby!.role === "string" &&
            ((c.screen as MenuScreen).lobby!.max_players === null ||
              (Number.isInteger((c.screen as MenuScreen).lobby!.max_players) &&
                (c.screen as MenuScreen).lobby!.max_players! >= 1)) &&
            typeof (c.screen as MenuScreen).lobby!.local_player_id ===
              "string" &&
            typeof (c.screen as MenuScreen).lobby!.all_ready === "boolean" &&
            Array.isArray((c.screen as MenuScreen).lobby!.players) &&
            ((c.screen as MenuScreen).lobby!.max_players === null ||
              (c.screen as MenuScreen).lobby!.players.length <=
                (c.screen as MenuScreen).lobby!.max_players!) &&
            (c.screen as MenuScreen).lobby!.players.every(
              (player) =>
                typeof player.id === "string" &&
                player.id.length > 0 &&
                Number.isInteger(player.slot_id) &&
                player.slot_id >= 0 &&
                typeof player.is_local === "boolean" &&
                (player.is_host === null ||
                  typeof player.is_host === "boolean") &&
                typeof player.character_id === "string" &&
                typeof player.character_name === "string" &&
                typeof player.is_ready === "boolean",
            ) &&
            new Set(
              (c.screen as MenuScreen).lobby!.players.map(
                (player) => player.id,
              ),
            ).size === (c.screen as MenuScreen).lobby!.players.length &&
            new Set(
              (c.screen as MenuScreen).lobby!.players.map(
                (player) => player.slot_id,
              ),
            ).size === (c.screen as MenuScreen).lobby!.players.length &&
            (c.screen as MenuScreen).lobby!.players.filter(
              (player) => player.is_local,
            ).length === 1 &&
            (c.screen as MenuScreen).lobby!.players.find(
              (player) => player.is_local,
            )?.id === (c.screen as MenuScreen).lobby!.local_player_id)) &&
        ((c.screen as MenuScreen).connection === null ||
          ([
            "multiplayer_host",
            "multiplayer_join",
            "multiplayer_load",
          ].includes((c.screen as MenuScreen).menu_screen) &&
            typeof (c.screen as MenuScreen).connection!.status === "string" &&
            Number.isInteger(
              (c.screen as MenuScreen).connection!.connected_players,
            ) &&
            (c.screen as MenuScreen).connection!.connected_players >= 0 &&
            ((c.screen as MenuScreen).connection!.required_players === null ||
              (Number.isInteger(
                (c.screen as MenuScreen).connection!.required_players,
              ) &&
                (c.screen as MenuScreen).connection!.required_players! >=
                  (c.screen as MenuScreen).connection!.connected_players)) &&
            Array.isArray((c.screen as MenuScreen).connection!.sessions) &&
            (c.screen as MenuScreen).connection!.sessions.every(
              (session) =>
                typeof session.id === "string" &&
                session.id.length > 0 &&
                typeof session.label === "string" &&
                typeof session.enabled === "boolean",
            ) &&
            new Set(
              (c.screen as MenuScreen).connection!.sessions.map(
                (session) => session.id,
              ),
            ).size === (c.screen as MenuScreen).connection!.sessions.length)) &&
        ((c.screen as MenuScreen).saved_run === null ||
          ((c.screen as MenuScreen).menu_screen === "multiplayer_load" &&
            typeof (c.screen as MenuScreen).saved_run!.mode === "string" &&
            Number.isInteger((c.screen as MenuScreen).saved_run!.ascension) &&
            (c.screen as MenuScreen).saved_run!.ascension >= 0 &&
            Number.isInteger((c.screen as MenuScreen).saved_run!.current_act) &&
            (c.screen as MenuScreen).saved_run!.current_act >= 1 &&
            Number.isInteger(
              (c.screen as MenuScreen).saved_run!.visited_floor_count,
            ) &&
            (c.screen as MenuScreen).saved_run!.visited_floor_count >= 0 &&
            Number.isInteger(
              (c.screen as MenuScreen).saved_run!.missing_players,
            ) &&
            Array.isArray((c.screen as MenuScreen).saved_run!.players) &&
            (c.screen as MenuScreen).saved_run!.players.length > 0 &&
            (c.screen as MenuScreen).saved_run!.missing_players ===
              (c.screen as MenuScreen).saved_run!.players.filter(
                (player) => !player.connected,
              ).length &&
            (c.screen as MenuScreen).saved_run!.players.every(
              (player) =>
                typeof player.id === "string" &&
                player.id.length > 0 &&
                typeof player.character_id === "string" &&
                Number.isInteger(player.current_hp) &&
                player.current_hp >= 0 &&
                Number.isInteger(player.max_hp) &&
                player.max_hp >= player.current_hp &&
                Number.isInteger(player.max_energy) &&
                player.max_energy >= 0 &&
                Number.isInteger(player.potion_capacity) &&
                player.potion_capacity >= 0 &&
                Number.isInteger(player.gold) &&
                player.gold >= 0 &&
                typeof player.connected === "boolean",
            ) &&
            new Set(
              (c.screen as MenuScreen).saved_run!.players.map(
                (player) => player.id,
              ),
            ).size === (c.screen as MenuScreen).saved_run!.players.length)) &&
        (c.screen as MenuScreen).can_mutate === false)) &&
    (c.phase !== "run_end" ||
      (c.action_pending === false &&
        (c.screen as LifecycleScreen).waiting_for_input === false &&
        runEndStatuses.has((c.screen as LifecycleScreen).status) &&
        typeof (c.screen as LifecycleScreen).message === "string" &&
        (c.screen as LifecycleScreen).can_start_run === false)) &&
    hasStableSnapshotIdentities(c as StateSnapshot)
  );
}
