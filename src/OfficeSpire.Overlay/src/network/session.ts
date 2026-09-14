import { invoke } from "@tauri-apps/api/core";
import { PROTOCOL_VERSION, type SessionDescriptor } from "../types";
export async function discoverSession(): Promise<SessionDescriptor> {
  const session = await invoke<SessionDescriptor>("read_officespire_session");
  if (
    !session ||
    session.protocol_version !== PROTOCOL_VERSION ||
    !Number.isInteger(session.port) ||
    session.port < 1 ||
    session.port > 65535 ||
    typeof session.token !== "string" ||
    session.token.length < 16
  )
    throw new Error(
      "OfficeSpire session is missing or incompatible. Start STS2 with the mod loaded.",
    );
  return session;
}
