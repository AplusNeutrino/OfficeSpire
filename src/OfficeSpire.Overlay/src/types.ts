export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  intent?: string;
}

export interface CardState {
  index: number;
  name: string;
  cost: number;
  description?: string;
}

export interface StateSnapshot {
  state_revision: number;
  player: {
    hp: number;
    max_hp: number;
    energy: number;
    max_energy: number;
    block: number;
  };
  enemies: EnemyState[];
  hand: CardState[];
}
