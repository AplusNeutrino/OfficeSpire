export interface HandshakeRequest {
  type: 'hello';
  client: 'OfficeSpireOverlay';
  version: string;
}

export interface HandshakeResponse {
  type: 'hello_ack';
  protocol_version: string;
  accepted: boolean;
}

export function createHandshake(): HandshakeRequest {
  return {
    type: 'hello',
    client: 'OfficeSpireOverlay',
    version: '0.6-alpha.2'
  };
}
