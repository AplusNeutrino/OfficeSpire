import { describe, expect, it } from "vitest";
import {
  actionMessage,
  actionStatusMessage,
  getStateMessage,
  parseEnvelope,
} from "./protocol";
describe("OfficeSpire wire protocol", () => {
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
});
