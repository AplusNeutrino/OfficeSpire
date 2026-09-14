export const PROTOCOL_VERSION = '0.6-alpha.2';

export type ClientMessage =
  | { type: 'hello'; version: string }
  | { type: 'heartbeat' }
  | { type: 'action'; payload: unknown };

export type ServerMessage =
  | { type: 'snapshot'; payload: unknown }
  | { type: 'heartbeat_ack' }
  | { type: 'error'; message: string };
