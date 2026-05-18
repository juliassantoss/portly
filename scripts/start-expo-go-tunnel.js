const { spawn } = require("node:child_process");
const { URL } = require("node:url");

async function main() {
  const token = process.env.NGROK_AUTHTOKEN;

  if (!token) {
    throw new Error(
      "NGROK_AUTHTOKEN is missing. Run: $env:NGROK_AUTHTOKEN=\"YOUR_TOKEN\"",
    );
  }

  const ngrok = require("@ngrok/ngrok");
  const qrcode = require("qrcode-terminal");
  const metroPort = 8081;

  console.log(`Starting ngrok tunnel for Metro on port ${metroPort}...`);

  const listener = await ngrok.forward({
    addr: metroPort,
    authtoken: token,
  });

  const tunnelUrl = listener.url();

  if (!tunnelUrl || !tunnelUrl.startsWith("https://")) {
    throw new Error(`ngrok did not return a valid HTTPS tunnel URL: ${tunnelUrl}`);
  }

  console.log("");
  console.log(`Tunnel ready: ${tunnelUrl}`);
  console.log("Starting Expo with the tunnel URL injected into the QR code...");
  console.log("");

  const parsedTunnelUrl = new URL(tunnelUrl);
  const directExpoUrl = `exp://${parsedTunnelUrl.hostname}:${parsedTunnelUrl.port || "443"}`;
  const loadingUrl = `${tunnelUrl.replace(/\/$/, "")}/_expo/loading`;
  const expoCliPath = require.resolve("expo/bin/cli");

  const expo = spawn(process.execPath, [expoCliPath, "start", "-c"], {
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: tunnelUrl,
      EXPO_NO_REDIRECT_PAGE: "1",
    },
    stdio: "inherit",
  });

  console.log(`Fallback Expo Go URL: ${directExpoUrl}`);
  console.log(`Fallback tunnel loading URL: ${loadingUrl}`);
  console.log("");
  qrcode.generate(directExpoUrl, { small: true });
  console.log("");

  const shutdown = async () => {
    try {
      await listener.close();
    } catch {
      // Ignore shutdown errors so Ctrl+C stays clean.
    }
  };

  process.on("SIGINT", async () => {
    expo.kill("SIGINT");
    await shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    expo.kill("SIGTERM");
    await shutdown();
    process.exit(0);
  });

  expo.on("exit", async (code) => {
    await shutdown();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("");
  console.error(error.message);
  console.error("");
  process.exit(1);
});
