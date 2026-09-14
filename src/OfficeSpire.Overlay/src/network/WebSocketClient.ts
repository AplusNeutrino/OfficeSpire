export type SnapshotHandler = (payload: unknown) => void;

export class OfficeSpireWebSocketClient {
  private socket?: WebSocket;
  private url: string;

  constructor(url = 'ws://127.0.0.1:0') {
    this.url = url;
  }

  connect(onSnapshot: SnapshotHandler) {
    this.socket = new WebSocket(this.url);

    this.socket.onmessage = (event) => {
      try {
        onSnapshot(JSON.parse(event.data));
      } catch {
        console.warn('Invalid OfficeSpire websocket payload');
      }
    };

    return this.socket;
  }

  sendAction(action: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(action));
    }
  }
}
