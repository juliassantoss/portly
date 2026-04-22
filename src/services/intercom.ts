const PI_WS_URL = process.env.EXPO_PUBLIC_PI_WS_URL ?? 'ws://192.168.1.98:3001';
const PI_HTTP_URL = process.env.EXPO_PUBLIC_PI_HTTP_URL ?? 'http://192.168.1.98:3000';

export { PI_HTTP_URL };

export type IntercomMessage =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'bell'; timestamp: string }
  | { type: 'frame'; data: string }
  | { type: 'door_status'; status: 'open' | 'closed' };

type OutboundMessage =
  | { type: 'register_token'; token: string }
  | { type: 'start_stream' }
  | { type: 'stop_stream' }
  | { type: 'open_door' }
  | { type: 'audio_chunk'; data: string };

type Handler = (msg: IntercomMessage) => void;

class IntercomService {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  setToken(token: string) {
    this.token = token;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'register_token', token });
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.CONNECTING) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.shouldReconnect = true;

    try {
      this.ws = new WebSocket(PI_WS_URL);

      this.ws.onopen = () => {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.emit({ type: 'connected' });
        if (this.token) {
          this.send({ type: 'register_token', token: this.token });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as IntercomMessage;
          this.emit(msg);
        } catch {}
      };

      this.ws.onerror = () => {};

      this.ws.onclose = () => {
        this.emit({ type: 'disconnected' });
        if (this.shouldReconnect) this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  send(msg: OutboundMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(msg: IntercomMessage) {
    for (const h of this.handlers) h(msg);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }
}

export const intercomService = new IntercomService();
