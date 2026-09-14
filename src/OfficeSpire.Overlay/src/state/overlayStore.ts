import type { StateSnapshot } from '../types';

export interface OverlayState {
  snapshot?: StateSnapshot;
  connected: boolean;
}

export const initialOverlayState: OverlayState = {
  connected: false,
};

export function validateSnapshot(value: unknown): value is StateSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<StateSnapshot>;
  return typeof data.state_revision === 'number' && !!data.player && Array.isArray(data.hand);
}
