import { WebSocketClient } from './WebSocketClient';
import { createHelloMessage } from './handshake';

export class OverlayConnection {
  private client: WebSocketClient;

  constructor(client?: WebSocketClient) {
    this.client = client ?? new WebSocketClient();
  }

  connect(url: string) {
    this.client.connect(url);
    this.client.send(createHelloMessage());
  }

  disconnect() {
    this.client.disconnect();
  }
}
