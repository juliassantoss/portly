export type RaspberryPiCommand =
  | "open-door"
  | "request-snapshot"
  | "check-device-status";

export type RaspberryPiBridgeResult = {
  command: RaspberryPiCommand;
  delivered: false;
  reason: string;
};

export async function sendRaspberryPiCommand(
  command: RaspberryPiCommand,
): Promise<RaspberryPiBridgeResult> {
  return {
    command,
    delivered: false,
    reason: "Bridge not implemented yet. Add HTTP, WebSocket or MQTT when the device contract is defined.",
  };
}
