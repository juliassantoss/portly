/**
 * Portly Pi Server
 *
 * Raspberry Pi setup (Pi 5 / Bookworm / Trixie):
 *   sudo apt install alsa-utils fswebcam ffmpeg python3-gpiozero python3-lgpio
 *   npm install
 *   npm start
 *
 * Wiring (physical header pins):
 *   Doorbell button : pin 3 (GPIO2) ─ pin 6 (GND)
 *   Servo SG90      : signal → pin 11 (GPIO17), 5V/GND from external PSU (common GND with Pi)
 *   LCD 1602 (4-bit): RS=37, E=35, D4=33, D5=31, D6=36, D7=29 (GPIO 26/19/13/6/16/5)
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

const { initGpio, openDoorWithAutoClose, getDoorStatus, setDisplay, setLed } = require('./src/gpio');
const { spawn } = require('child_process');

const BT_SPEAKER_MAC = process.env.BT_SPEAKER_MAC ?? '41:42:50:87:45:07';

function reconnectBtSpeaker() {
  // Fire-and-forget bluetoothctl connect. Idempotent — does nothing if already connected.
  const bt = spawn('bluetoothctl', ['connect', BT_SPEAKER_MAC]);
  bt.on('close', (code) => {
    if (code === 0) console.log('[bt] reconnected to', BT_SPEAKER_MAC);
    else console.log('[bt] connect attempt exited', code);
  });
  bt.on('error', (e) => console.warn('[bt] bluetoothctl error:', e.message));
}
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
  console.log('[http] /audio-stream requested by', req.ip);
  const ok = pipeAudioToResponse(res);
  if (!ok) res.status(503).json({ error: 'Microphone not available' });
});

// Back-compat alias — older builds still call /audio
app.get('/audio', (req, res) => {
  console.log('[http] /audio requested by', req.ip);
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

// ── Display + LED state ──────────────────────────────────────────────────────

let activeCall = false;
let doorOpen = false;
let bellRingingTimer = null;

function refreshDisplay() {
  if (doorOpen) return setDisplay('Porta aberta', '');
  if (activeCall) return setDisplay('Em chamada', '');
  if (bellRingingTimer) return setDisplay('A tocar!', '');
  setDisplay('Portly', 'Pronto');
}

function emitLockStatus(status) {
  doorOpen = status === 'open';
  refreshDisplay();
  emitEvent(status === 'open' ? 'lock-opened' : 'lock-closed');
}

wss.on('connection', (ws) => {
  console.log('[ws] App connected (total:', wss.clients.size, ')');
  ws.send(JSON.stringify({ type: 'event', name: 'device-online', timestamp: Date.now() }));

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    // Log every incoming message (truncate audio data for readability)
    const logged = msg.type === 'audio-chunk'
      ? { type: msg.type, dataLen: (msg.data ?? '').length }
      : msg;
    console.log('[ws] ←', JSON.stringify(logged));

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
      activeCall = false;
      setLed(false);
      refreshDisplay();
      emitEvent('call-ended');
    }
  });

  ws.on('error', (e) => console.warn('[ws] Client error:', e.message));
});

async function handleCommand(ws, action) {
  switch (action) {
    case 'answer-call':
      reconnectBtSpeaker(); // wake BT speaker for outgoing audio
      startCameraStream((frame) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'video-frame', data: frame }));
        }
      });
      activeCall = true;
      setLed(true);
      if (bellRingingTimer) { clearTimeout(bellRingingTimer); bellRingingTimer = null; }
      refreshDisplay();
      emitEvent('call-started');
      break;

    case 'end-call':
      stopCameraStream();
      stopAudioCapture();
      activeCall = false;
      setLed(false);
      refreshDisplay();
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

const BELL_RINGING_TIMEOUT_MS = 30_000;

function handleBellPress() {
  console.log('[bell] Pressed!');
  if (bellRingingTimer) clearTimeout(bellRingingTimer);
  bellRingingTimer = setTimeout(() => {
    bellRingingTimer = null;
    refreshDisplay();
  }, BELL_RINGING_TIMEOUT_MS);
  refreshDisplay();
  emitEvent('doorbell-pressed');

  for (const token of pushTokens) {
    sendDoorbell(token).catch(() => {});
  }
}

// ── GPIO init ────────────────────────────────────────────────────────────────

initGpio(handleBellPress)
  .then(() => refreshDisplay())
  .catch((e) => console.warn('[gpio] Init error:', e.message));

// Keep BT speaker awake: idempotent reconnect on startup + every 30s
reconnectBtSpeaker();
setInterval(reconnectBtSpeaker, 30_000);
