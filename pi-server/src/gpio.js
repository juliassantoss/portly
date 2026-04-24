require('dotenv').config();
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const DAEMON_PATH = path.join(__dirname, '..', 'gpio_daemon.py');
const AUTO_CLOSE_MS = Number(process.env.SERVO_AUTO_CLOSE_MS ?? 5000);

let daemon = null;
let doorStatus = 'closed';
let autoCloseTimer = null;
const handlers = { onBell: null, onServoButton: null };

function sendCommand(cmd) {
  if (daemon && daemon.stdin.writable) {
    daemon.stdin.write(JSON.stringify(cmd) + '\n');
    return true;
  }
  return false;
}

function initGpio(onBell, onServoButton) {
  handlers.onBell = onBell;
  handlers.onServoButton = onServoButton;

  return new Promise((resolve) => {
    let resolved = false;
    const markReady = () => { if (!resolved) { resolved = true; resolve(); } };

    try {
      daemon = spawn('python3', [DAEMON_PATH], {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: {
          ...process.env,
          GPIO_BELL: process.env.GPIO_BELL ?? '21',
          GPIO_SERVO: process.env.GPIO_SERVO ?? '17',
          GPIO_SERVO_BUTTON: process.env.GPIO_SERVO_BUTTON ?? '4',
        },
      });
    } catch (e) {
      console.warn('[gpio] Failed to spawn Python daemon:', e.message);
      console.log('[gpio] Running in mock mode — POST /bell to simulate press');
      markReady();
      return;
    }

    daemon.on('error', (e) => {
      console.warn('[gpio] Daemon error:', e.message);
      markReady();
    });

    daemon.on('exit', (code) => {
      console.warn(`[gpio] Daemon exited with code ${code} — running in mock mode`);
      daemon = null;
      markReady();
    });

    const rl = readline.createInterface({ input: daemon.stdout });
    rl.on('line', (line) => {
      try {
        const evt = JSON.parse(line);
        switch (evt.event) {
          case 'ready':
            console.log(`[gpio] Python daemon ready (bell=GPIO${evt.bell}, servo=GPIO${evt.servo}, button=GPIO${evt.servo_button})`);
            markReady();
            break;
          case 'bell':
            handlers.onBell?.();
            break;
          case 'servo_button':
            handlers.onServoButton?.();
            break;
          case 'door_open':
          case 'door_closed':
            // State already tracked in Node; event is just for logs
            break;
        }
      } catch {
        console.log('[gpio-py]', line);
      }
    });

    process.on('SIGINT', () => { daemon?.kill(); process.exit(); });
    process.on('SIGTERM', () => { daemon?.kill(); });

    // Safety net: if daemon never reports ready in 5s, move on (mock)
    setTimeout(markReady, 5000);
  });
}

async function controlServo(action) {
  doorStatus = action === 'open' ? 'open' : 'closed';
  const ok = sendCommand({ action });
  if (ok) {
    console.log(`[gpio] Door ${action}`);
  } else {
    console.log(`[gpio] [MOCK] Door ${action}`);
  }
  return { action };
}

async function openDoorWithAutoClose(onStatusChange) {
  await controlServo('open');
  onStatusChange?.('open');
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(async () => {
    await controlServo('close');
    onStatusChange?.('closed');
    autoCloseTimer = null;
  }, AUTO_CLOSE_MS);
}

function getDoorStatus() {
  return doorStatus;
}

module.exports = { initGpio, controlServo, openDoorWithAutoClose, getDoorStatus, AUTO_CLOSE_MS };
