const DEFAULT_PI_HOST = "192.168.1.98";
const DEFAULT_PI_HTTP_PORT = "3000";
const DEFAULT_PI_WS_PORT = "3001";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const PI_HOST = process.env.EXPO_PUBLIC_PI_HOST ?? DEFAULT_PI_HOST;

export const PI_HTTP_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_PI_HTTP_URL ?? `http://${PI_HOST}:${DEFAULT_PI_HTTP_PORT}`,
);

export const PI_WS_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_PI_WS_URL ?? `ws://${PI_HOST}:${DEFAULT_PI_WS_PORT}`,
);
