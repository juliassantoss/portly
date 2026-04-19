const { spawn } = require("node:child_process");

async function main() {
  const token = process.env.NGROK_AUTHTOKEN;

  if (!token) {
    throw new Error(
      "NGROK_AUTHTOKEN is missing. Run: $env:NGROK_AUTHTOKEN=\"YOUR_TOKEN\"",
    );
  }

  const ngrok = require("@ngrok/ngrok");
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

  const expoCommand = "npx expo start --localhost -c";
  const expo = process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", expoCommand], {
        env: {
          ...process.env,
          EXPO_PACKAGER_PROXY_URL: tunnelUrl,
        },
        stdio: "inherit",
      })
    : spawn("npx", ["expo", "start", "--localhost", "-c"], {
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: tunnelUrl,
    },
    stdio: "inherit",
  });

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
