const PI_WS_URL   = process.env.EXPO_PUBLIC_PI_WS_URL   ?? 'ws://192.168.1.98:3001';
const PI_HTTP_URL = process.env.EXPO_PUBLIC_PI_HTTP_URL ?? 'http://192.168.1.98:3000';

export { PI_HTTP_URL };

// ── Types exposed to the rest of the app ─────────────────────────────────────

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

// ── Pi wire protocol (what the Pi server actually sends/receives) ─────────────

type PiInbound =
  | { type: 'video-frame'; data: string }
  | { type: 'event'; name: string; timestamp?: number };

type PiOutbound =
  | { type: 'command'; action: string }
  | { type: 'audio-chunk'; data: string }
  | { type: 'register-expo-token'; token: string };

function toPiMessage(msg: OutboundMessage): PiOutbound {
  switch (msg.type) {
    case 'open_door':      return { type: 'command', action: 'open-lock' };
    case 'start_stream':   return { type: 'command', action: 'answer-call' };
    case 'stop_stream':    return { type: 'command', action: 'end-call' };
    case 'audio_chunk':    return { type: 'audio-chunk', data: msg.data };
    case 'register_token': return { type: 'register-expo-token', token: msg.token };
  }
}

function fromPiMessage(raw: PiInbound): IntercomMessage | null {
  if (raw.type === 'video-frame') {
    return { type: 'frame', data: raw.data };
  }
  if (raw.type === 'event') {
    switch (raw.name) {
      case 'doorbell-pressed':
        return { type: 'bell', timestamp: String(raw.timestamp ?? Date.now()) };
      case 'lock-opened':
        return { type: 'door_status', status: 'open' };
      case 'lock-closed':
        return { type: 'door_status', status: 'closed' };
      // 'device-online', 'call-started', 'call-ended' — no-ops for now
      default:
        return null;
    }
  }
  return null;
}

// ── Singleton service ─────────────────────────────────────────────────────────

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
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        this.emit({ type: 'connected' });
        if (this.token) this.send({ type: 'register_token', token: this.token });
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data as string) as PiInbound;
          const mapped = fromPiMessage(raw);
          if (mapped) this.emit(mapped);
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
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
  }

  send(msg: OutboundMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(toPiMessage(msg)));
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
