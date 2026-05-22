import { PI_HTTP_URL } from "../../config/raspberryPi";

export type RaspberryPiCommand = 'open-door' | 'request-snapshot' | 'check-device-status';

export type RaspberryPiBridgeResult = {
  command: RaspberryPiCommand;
  delivered: boolean;
  reason?: string;
  data?: unknown;
};

export async function sendRaspberryPiCommand(
  command: RaspberryPiCommand,
): Promise<RaspberryPiBridgeResult> {
  const endpointMap: Record<RaspberryPiCommand, { path: string; method: string }> = {
    'open-door': { path: '/open-door', method: 'POST' },
    'request-snapshot': { path: '/status', method: 'GET' },
    'check-device-status': { path: '/status', method: 'GET' },
  };

  const { path, method } = endpointMap[command];

  try {
    const res = await fetch(`${PI_HTTP_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { command, delivered: false, reason: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { command, delivered: true, data };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return { command, delivered: false, reason };
  }
}
