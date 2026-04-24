/**
 * Portly Pi Server
 *
 * Raspberry Pi setup:
 *   sudo apt install alsa-utils fswebcam
 *   sudo pip install pigpio && sudo pigpiod   # for servo PWM
 *   npm install
 *   node server.js
 *
 * Wiring (physical header pins):
 *   Doorbell button : pin 40 (GPIO21) ─ pin 39 (GND)
 *   Servo SG90      : signal → pin 11 (GPIO17), VCC → pin 4 (5V), GND → pin 6 (GND)
 *   Servo button    : pin 7 (GPIO4) ─ pin 9 (GND)  — manual open from outside Pi
 *   Microphone      : USB webcam or USB mic — first ALSA device
 *   Speaker         : USB / Bluetooth — default ALSA output
 *   Camera          : USB webcam (or Pi Camera via libcamera)
 *
 * Wire protocol (WebSocket JSON):
 *   From app → Pi:
 *     { type: 'command', action: 'answer-call' | 'end-call' | 'open-lock' }
 *     { type: 'audio-chunk', data: <base64> }
 *     { type: 'register-expo-token', token: <string> }
 *   From Pi → app:
 *     { type: 'video-frame', data: <base64 JPEG> }
 *     { type: 'event', name: 'device-online' | 'doorbell-pressed' | 'lock-opened' | 'lock-closed' | 'call-started' | 'call-ended', timestamp: <ms> }
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const { initGpio, openDoorWithAutoClose, getDoorStatus } = require('./src/gpio');
const { startCameraStream, stopCameraStream } = require('./src/camera');
const { pipeAudioToResponse, stopAudioCapture, playAudioChunk, stopPlayback } = require('./src/audio');
const { sendDoorbell } = require('./src/notifications');

const PORT_HTTP = Number(process.env.PORT_HTTP ?? 3000);
const PORT_WS = Number(process.env.PORT_WS ?? 3001);

// ── HTTP server ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const pushTokens = new Set();

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    wsClients: wss.clients.size,
    pushTokens: pushTokens.size,
    door: getDoorStatus(),
  });
});

// Live microphone stream (expo-av consumes this as a WAV HTTP stream)
app.get('/audio-stream', (req, res) => {
  const ok = pipeAudioToResponse(res);
  if (!ok) res.status(503).json({ error: 'Microphone not available' });
});

// Back-compat alias — older builds still call /audio
app.get('/audio', (req, res) => {
  const ok = pipeAudioToResponse(res);
  if (!ok) res.status(503).json({ error: 'Microphone not available' });
});

app.post('/register-token', (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: 'token required' });
  pushTokens.add(token);
  console.log('[http] Push token registered');
  res.json({ ok: true, total: pushTokens.size });
});

// HTTP fallbacks for hardware-free testing
app.post('/open-door', async (req, res) => {
  await openDoorWithAutoClose((status) => emitLockStatus(status));
  res.json({ status: 'open' });
});

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

function emitEvent(name, extra = {}) {
  broadcast({ type: 'event', name, timestamp: Date.now(), ...extra });
}

function emitLockStatus(status) {
  emitEvent(status === 'open' ? 'lock-opened' : 'lock-closed');
}

wss.on('connection', (ws) => {
  console.log('[ws] App connected (total:', wss.clients.size, ')');
  ws.send(JSON.stringify({ type: 'event', name: 'device-online', timestamp: Date.now() }));

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'register-expo-token':
        if (msg.token) {
          pushTokens.add(msg.token);
          console.log('[ws] Push token registered via WS');
        }
        break;

      case 'command':
        await handleCommand(ws, msg.action);
        break;

      case 'audio-chunk':
        if (msg.data) playAudioChunk(msg.data);
        break;

      default:
        console.warn('[ws] Unknown message type:', msg.type);
    }
  });

  ws.on('close', () => {
    console.log('[ws] App disconnected (remaining:', wss.clients.size - 1, ')');
    if (wss.clients.size <= 1) {
      stopCameraStream();
      stopAudioCapture();
      stopPlayback();
      emitEvent('call-ended');
    }
  });

  ws.on('error', (e) => console.warn('[ws] Client error:', e.message));
});

async function handleCommand(ws, action) {
  switch (action) {
    case 'answer-call':
      startCameraStream((frame) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'video-frame', data: frame }));
        }
      });
      emitEvent('call-started');
      break;

    case 'end-call':
      stopCameraStream();
      stopAudioCapture();
      emitEvent('call-ended');
      break;

    case 'open-lock':
      await openDoorWithAutoClose((status) => emitLockStatus(status));
      break;

    default:
      console.warn('[ws] Unknown command action:', action);
  }
}

// ── Doorbell handler ─────────────────────────────────────────────────────────

function handleBellPress() {
  console.log('[bell] Pressed!');
  emitEvent('doorbell-pressed');

  for (const token of pushTokens) {
    sendDoorbell(token).catch(() => {});
  }
}

// ── GPIO init ────────────────────────────────────────────────────────────────

function handleServoButton() {
  console.log('[servo-button] Pressed — opening door manually');
  openDoorWithAutoClose((status) => emitLockStatus(status));
}

initGpio(handleBellPress, handleServoButton).catch((e) =>
  console.warn('[gpio] Init error:', e.message)
);
