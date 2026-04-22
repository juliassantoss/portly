require('dotenv').config();

const BELL_PIN = Number(process.env.GPIO_BELL ?? 17);
const SERVO_PIN = Number(process.env.GPIO_SERVO ?? 18);

// Servo SG90 pulse widths (microseconds)
const SERVO_LOCKED = 1500;  // 90° — locked
const SERVO_OPEN = 500;     // 0°  — unlocked

let servo = null;
let doorStatus = 'closed';

// pigpio for precise PWM servo control
try {
  const { Gpio } = require('pigpio');
  servo = new Gpio(SERVO_PIN, { mode: Gpio.OUTPUT });
  servo.servoWrite(SERVO_LOCKED);
  console.log(`[gpio] Servo on GPIO ${SERVO_PIN} initialized`);
} catch {
  console.warn('[gpio] pigpio unavailable — servo will be mocked (not on Pi or pigpiod not running)');
}

// onoff for doorbell button edge detection
let onoffGpio = null;
try {
  onoffGpio = require('onoff').Gpio;
} catch {
  console.warn('[gpio] onoff unavailable — doorbell button will be mocked');
}

function initGpio(onBell) {
  return new Promise((resolve) => {
    if (!onoffGpio) {
      console.log('[gpio] Running in mock mode — POST /bell to simulate press');
      resolve();
      return;
    }

    try {
      const button = new onoffGpio(BELL_PIN, 'in', 'falling', { debounceTimeout: 100 });
      button.watch((err) => { if (!err) onBell(); });
      process.on('SIGINT', () => { button.unexport(); process.exit(); });
      console.log(`[gpio] Doorbell button on GPIO ${BELL_PIN} initialized`);
      resolve();
    } catch (e) {
      console.warn('[gpio] Button init failed:', e.message);
      resolve();
    }
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

function getDoorStatus() {
  return doorStatus;
}

module.exports = { initGpio, controlServo, getDoorStatus };
