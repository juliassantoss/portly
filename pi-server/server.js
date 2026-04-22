/**
 * Portly Pi Server
 *
 * Raspberry Pi setup:
 *   sudo apt install alsa-utils fswebcam
 *   sudo pip install pigpio && sudo pigpiod   # for servo PWM
 *   npm install
 *   node server.js
 *
 * Wiring:
 *   Doorbell button : GPIO 17 (pin 11) — one leg to GPIO, other to GND
 *   Servo SG90      : signal → GPIO 18 (pin 12), VCC → 5V, GND → GND
 *   Microphone      : USB or Pi HAT — first ALSA device
 *   Speaker/Buzzer  : same ALSA device
 *   Camera          : Pi Camera Module (CSI) or USB webcam
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const { initGpio, controlServo, getDoorStatus } = require('./src/gpio');
const { startCameraStream, stopCameraStream } = require('./src/camera');
const { pipeAudioToResponse, startAudioCapture, stopAudioCapture, playAudioChunk, stopPlayback } = require('./src/audio');
const { sendDoorbell } = require('./src/notifications');

const PORT_HTTP = Number(process.env.PORT_HTTP ?? 3000);
const PORT_WS = Number(process.env.PORT_WS ?? 3001);

// ── HTTP server ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Stored push tokens for registered app instances
const pushTokens = new Set();

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    wsClients: wss.clients.size,
    pushTokens: pushTokens.size,
    door: getDoorStatus(),
  });
});

// Live microphone audio stream (expo-av can play this as a WAV HTTP stream)
app.get('/audio', (req, res) => {
  const ok = pipeAudioToResponse(res);
  if (!ok) res.status(503).json({ error: 'Microphone not available' });
});

// Register Expo push token from the app (also sent over WebSocket on connect)
app.post('/register-token', (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: 'token required' });
  pushTokens.add(token);
  console.log('[http] Push token registered');
  res.json({ ok: true, total: pushTokens.size });
});

// Open door via HTTP (useful for testing without the app)
app.post('/open-door', async (req, res) => {
  await controlServo('open');
  broadcast({ type: 'door_status', status: 'open' });
  setTimeout(async () => {
    await controlServo('close');
    broadcast({ type: 'door_status', status: 'closed' });
  }, 5000);
  res.json({ status: 'open', closesInMs: 5000 });
});

// Simulate bell press for testing without hardware
app.post('/bell', (req, res) => {
  handleBellPress();
  res.json({ ok: true });
});

const httpServer = http.createServer(app);
httpServer.listen(PORT_HTTP, '0.0.0.0', () =>
  console.log(`[http] Listening on port ${PORT_HTTP}`)
);

// ── WebSocket server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT_WS });
console.log(`[ws] Listening on port ${PORT_WS}`);

function broadcast(msg) {
  const json = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(json);
  }
}

wss.on('connection', (ws) => {
  console.log('[ws] App connected (total:', wss.clients.size, ')');

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'register_token':
        if (msg.token) {
          pushTokens.add(msg.token);
          console.log('[ws] Push token registered via WS');
        }
        break;

      case 'start_stream':
        startCameraStream((frame) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'frame', data: frame }));
          }
        });
        // Audio is available via HTTP /audio endpoint — no WS audio out needed
        break;

      case 'stop_stream':
        stopCameraStream();
        stopAudioCapture();
        break;

      case 'open_door':
        await controlServo('open');
        broadcast({ type: 'door_status', status: 'open' });
        setTimeout(async () => {
          await controlServo('close');
          broadcast({ type: 'door_status', status: 'closed' });
        }, 5000);
        break;

      case 'audio_chunk':
        // PTT audio received from app — play on Pi speaker
        if (msg.data) playAudioChunk(msg.data);
        break;
    }
  });

  ws.on('close', () => {
    console.log('[ws] App disconnected (remaining:', wss.clients.size - 1, ')');
    if (wss.clients.size <= 1) {
      stopCameraStream();
      stopAudioCapture();
      stopPlayback();
    }
  });

  ws.on('error', (e) => console.warn('[ws] Client error:', e.message));
});

// ── Doorbell handler ─────────────────────────────────────────────────────────

function handleBellPress() {
  console.log('[bell] Pressed!');

  broadcast({ type: 'bell', timestamp: new Date().toISOString() });

  for (const token of pushTokens) {
    sendDoorbell(token).catch(() => {});
  }
}

// ── GPIO init ────────────────────────────────────────────────────────────────

initGpio(handleBellPress).catch((e) =>
  console.warn('[gpio] Init error:', e.message)
);
