import {
  PROTOCOL_VERSION,
  isStateSnapshot,
  type ActionResponse,
  type OverlayAction,
  type SessionDescriptor,
  type StateSnapshot,
  type WireEnvelope,
} from "../types";
import {
  actionMessage,
  actionStatusMessage,
  getStateMessage,
  parseEnvelope,
  pingMessage,
} from "./protocol";
export interface ClientCallbacks {
  onOpen: () => void;
  onClose: (reason: string) => void;
  onSnapshot: (snapshot: StateSnapshot) => void;
  onActionResult: (result: ActionResponse) => void;
  onError: (message: string) => void;
  onIncompatible: (serverVersion: number) => void;
}
export class OfficeSpireWebSocketClient {
  private socket?: WebSocket;
  private stateTimer?: number;
  private heartbeatTimer?: number;
  constructor(private readonly callbacks: ClientCallbacks) {}
  connect(session: SessionDescriptor): void {
    this.disconnect();
    if (session.protocol_version !== PROTOCOL_VERSION) {
      this.callbacks.onIncompatible(session.protocol_version);
      return;
    }
    const socket = new WebSocket(
      `ws://127.0.0.1:${session.port}/officespire?token=${encodeURIComponent(session.token)}`,
    );
    this.socket = socket;
    socket.onopen = () => {
      if (socket !== this.socket) return;
      this.callbacks.onOpen();
      this.send(getStateMessage());
      this.stateTimer = window.setInterval(
        () => this.send(getStateMessage()),
        200,
      );
      this.heartbeatTimer = window.setInterval(
        () => this.send(pingMessage()),
        10000,
      );
    };
    socket.onmessage = (event) => this.handleMessage(String(event.data));
    socket.onerror = () => this.callbacks.onError("WebSocket transport error.");
    socket.onclose = (event) => {
      if (socket !== this.socket) return;
      this.clearTimers();
      this.callbacks.onClose(
        event.reason || `Connection closed (${event.code}).`,
      );
    };
  }
  sendAction(action: OverlayAction): boolean {
    return this.send(actionMessage(action));
  }
  requestActionStatus(requestId: string): boolean {
    return this.send(actionStatusMessage(requestId));
  }
  disconnect(): void {
    this.clearTimers();
    const socket = this.socket;
    this.socket = undefined;
    if (socket && socket.readyState < WebSocket.CLOSING)
      socket.close(1000, "overlay disconnect");
  }
  private send(message: WireEnvelope): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }
  private handleMessage(data: string): void {
    try {
      const message = parseEnvelope(data);
      if (message.protocol_version !== PROTOCOL_VERSION) {
        this.callbacks.onIncompatible(message.protocol_version);
        this.disconnect();
        return;
      }
      if (message.type === "state" && isStateSnapshot(message.body))
        this.callbacks.onSnapshot(message.body);
      else if (message.type === "action_result")
        this.callbacks.onActionResult(message.body as ActionResponse);
      else if (message.type === "error") {
        const e = message.body as { message?: string; code?: string };
        this.callbacks.onError(e.message ?? e.code ?? "Unknown backend error.");
      }
    } catch (error) {
      this.callbacks.onError(
        error instanceof Error ? error.message : "Invalid server message.",
      );
    }
  }
  private clearTimers(): void {
    if (this.stateTimer !== undefined) window.clearInterval(this.stateTimer);
    if (this.heartbeatTimer !== undefined)
      window.clearInterval(this.heartbeatTimer);
    this.stateTimer = undefined;
    this.heartbeatTimer = undefined;
  }
}
