// Online play: a WebSocket to the game server. Frames wait while the socket opens; after a drop
// it reconnects by itself and walks back into the same room with the same player token.
import { PROTOCOL, type Intent, type LobbyFrame, type ServerMsg } from '../core/room/protocol';
import type { NetClient, Transport } from './NetClient';

export type WsStatus = 'connecting' | 'open' | 'closed';

const TOKEN_KEY = 'rusty-well-token';

/** This browser's player token: the server knows us by it when we come back. */
export function playerToken(): string {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    return 'guest-' + Math.random().toString(36).slice(2);
  }
}

/** The server address: ?server=wss://… or the page's own host (Vite forwards /ws in dev). */
export function serverUrl(): string {
  const param = new URLSearchParams(location.search).get('server');
  if (param) return param;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

export class WsTransport implements Transport {
  status: WsStatus = 'connecting';
  onStatus: (s: WsStatus) => void = () => {};
  private ws: WebSocket | null = null;
  private queue: string[] = [];
  private rejoin: LobbyFrame | null = null;
  private closing = false;
  private backoff = 1000;

  constructor(
    readonly url: string,
    private client: NetClient,
  ) {
    client.attach(this);
    this.connect();
  }

  private setStatus(s: WsStatus): void {
    this.status = s;
    this.onStatus(s);
  }

  private connect(): void {
    this.setStatus('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 1000;
      this.setStatus('open');
      ws.send(JSON.stringify({ t: 'hello', v: PROTOCOL }));
      if (this.rejoin) ws.send(JSON.stringify(this.rejoin));
      for (const f of this.queue.splice(0)) ws.send(f);
    };
    ws.onmessage = (e) => {
      let m: ServerMsg;
      try {
        m = JSON.parse(String(e.data)) as ServerMsg;
      } catch {
        return;
      }
      if (m.t === 'joined') this.rejoin = { t: 'join', code: m.code, token: playerToken() };
      if (m.t === 'left') this.rejoin = null;
      this.client.receive(m);
    };
    ws.onclose = () => {
      this.ws = null;
      this.setStatus('closed');
      if (this.closing) return;
      setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 8000);
    };
  }

  private raw(data: object): void {
    const s = JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(s);
    else this.queue.push(s);
  }

  frame(f: LobbyFrame): void {
    this.raw(f);
  }

  send(i: Intent): void {
    this.raw(i);
  }

  tick(): void {}

  close(): void {
    this.closing = true;
    this.rejoin = null;
    this.ws?.close();
  }
}
