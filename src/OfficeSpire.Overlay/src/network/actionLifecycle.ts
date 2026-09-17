import type { ActionResponse } from "../types";

export const ACTION_TIMEOUT_MS = 15_000;

export function clientTimeoutResult(
  requestId: string,
  stateRevision: number,
): ActionResponse {
  return {
    request_id: requestId,
    accepted: false,
    code: "client_timeout",
    message:
      "Action status timed out. State will keep refreshing; verify the game state before retrying.",
    state_revision: stateRevision,
  };
}
