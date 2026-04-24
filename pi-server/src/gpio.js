require('dotenv').config();

// BCM numbering. Physical header pin → BCM mapping:
//   Doorbell button : physical 39 (GND) + 40 (GPIO21)
//   Servo SG90      : physical 4 (5V) + 6 (GND) + 11 (GPIO17)
//   Servo button    : physical 7 (GPIO4) + 9 (GND)
const BELL_PIN = Number(process.env.GPIO_BELL ?? 21);
const SERVO_PIN = Number(process.env.GPIO_SERVO ?? 17);
const SERVO_BUTTON_PIN = Number(process.env.GPIO_SERVO_BUTTON ?? 4);

// Servo SG90 pulse widths (microseconds)
const SERVO_LOCKED = 1500;  // 90° — locked
const SERVO_OPEN = 500;     // 0°  — unlocked
const AUTO_CLOSE_MS = Number(process.env.SERVO_AUTO_CLOSE_MS ?? 5000);

let servo = null;
let doorStatus = 'closed';
let autoCloseTimer = null;

try {
  const { Gpio } = require('pigpio');
  servo = new Gpio(SERVO_PIN, { mode: Gpio.OUTPUT });
  servo.servoWrite(SERVO_LOCKED);
  console.log(`[gpio] Servo on GPIO ${SERVO_PIN} initialized`);
} catch {
  console.warn('[gpio] pigpio unavailable — servo will be mocked (not on Pi or pigpiod not running)');
}

let onoffGpio = null;
try {
  onoffGpio = require('onoff').Gpio;
} catch {
  console.warn('[gpio] onoff unavailable — buttons will be mocked');
}

function watchButton(pin, label, onPress) {
  if (!onoffGpio) return null;
  try {
    const btn = new onoffGpio(pin, 'in', 'falling', { debounceTimeout: 100 });
    btn.watch((err) => { if (!err) onPress(); });
    process.on('SIGINT', () => { btn.unexport(); });
    console.log(`[gpio] ${label} on GPIO ${pin} initialized`);
    return btn;
  } catch (e) {
    console.warn(`[gpio] ${label} init failed:`, e.message);
    return null;
  }
}

function initGpio(onBell, onServoButton) {
  return new Promise((resolve) => {
    if (!onoffGpio) {
      console.log('[gpio] Running in mock mode — POST /bell to simulate press');
      resolve();
      return;
    }
    watchButton(BELL_PIN, 'Doorbell button', onBell);
    if (onServoButton) watchButton(SERVO_BUTTON_PIN, 'Servo button', onServoButton);
    process.on('SIGINT', () => process.exit());
    resolve();
  });
}

async function controlServo(action) {
  const pulseWidth = action === 'open' ? SERVO_OPEN : SERVO_LOCKED;
  doorStatus = action === 'open' ? 'open' : 'closed';

  if (servo) {
    servo.servoWrite(pulseWidth);
  } else {
    console.log(`[gpio] [MOCK] Servo ${action} (${pulseWidth}μs)`);
  }
  console.log(`[gpio] Door ${action}`);
  return { action, pulseWidth };
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
