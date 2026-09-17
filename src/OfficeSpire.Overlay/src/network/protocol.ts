import {
  PROTOCOL_VERSION,
  type OverlayAction,
  type WireEnvelope,
} from "../types";
export function envelope<T>(type: string, body: T): WireEnvelope<T> {
  return { type, protocol_version: PROTOCOL_VERSION, body };
}
export const getStateMessage = () => envelope("get_state", {});
export const pingMessage = () => envelope("ping", {});
export const actionMessage = (action: OverlayAction) =>
  envelope("action", action);
export const actionStatusMessage = (requestId: string) =>
  envelope("get_action_result", { request_id: requestId });
export const isCompatibleProtocolVersion = (version: number) =>
  Number.isInteger(version) && version === PROTOCOL_VERSION;
export function parseEnvelope(data: string): WireEnvelope {
  const parsed: unknown = JSON.parse(data);
  if (!parsed || typeof parsed !== "object")
    throw new Error("Message is not an object.");
  const m = parsed as Partial<WireEnvelope>;
  if (
    typeof m.type !== "string" ||
    m.type.length === 0 ||
    !Number.isInteger(m.protocol_version) ||
    Number(m.protocol_version) < 1 ||
    !("body" in m)
  )
    throw new Error("Message is not an OfficeSpire envelope.");
  return m as WireEnvelope;
}
