#!/usr/bin/env python3
"""
Portly GPIO daemon.

Spawned by Node (server.js). Communicates via JSON lines:
  stdin  → commands from Node   ({"action": "open" | "close"})
  stdout → events to Node       ({"event": "ready" | "bell" | "servo_button" | "door_open" | "door_closed"})

Required packages (on Raspberry Pi OS Bookworm / Trixie):
  sudo apt install python3-gpiozero python3-lgpio

Wiring (BCM numbering):
  Doorbell button : GPIO 21 (physical pin 40) + GND (pin 39)
  Servo SG90      : GPIO 17 (physical pin 11) + 5V (pin 4) + GND (pin 6)
  Servo button    : GPIO 4  (physical pin 7)  + GND (pin 9)
"""
import json
import os
import signal
import sys

from gpiozero import Button, Device, Servo
from gpiozero.pins.lgpio import LGPIOFactory

# Pi 5 requires lgpio — RPi.GPIO / pigpio don't work with the RP1 chip
Device.pin_factory = LGPIOFactory()

BELL_PIN = int(os.environ.get("GPIO_BELL", 21))
SERVO_PIN = int(os.environ.get("GPIO_SERVO", 17))
SERVO_BUTTON_PIN = int(os.environ.get("GPIO_SERVO_BUTTON", 4))

# SG90: 1ms → 0°, 1.5ms → 90°, 2ms → 180°. Servo value maps -1..+1 to min..max.
servo = Servo(
    SERVO_PIN,
    min_pulse_width=500 / 1_000_000,   # 500 µs
    max_pulse_width=1500 / 1_000_000,  # 1500 µs (locked / neutral)
)

SERVO_LOCKED = 1.0   # 1500 µs
SERVO_OPEN = -1.0    # 500 µs

bell_button = Button(BELL_PIN, pull_up=True, bounce_time=0.1)
servo_button = Button(SERVO_BUTTON_PIN, pull_up=True, bounce_time=0.1)


def emit(event: dict) -> None:
    print(json.dumps(event), flush=True)


def on_bell():
    emit({"event": "bell"})


def on_servo_button():
    emit({"event": "servo_button"})


bell_button.when_pressed = on_bell
servo_button.when_pressed = on_servo_button

# Start locked
servo.value = SERVO_LOCKED
emit({"event": "ready", "bell": BELL_PIN, "servo": SERVO_PIN, "servo_button": SERVO_BUTTON_PIN})


def shutdown(*_):
    servo.detach()
    sys.exit(0)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

# Read commands from Node over stdin
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        cmd = json.loads(line)
    except json.JSONDecodeError:
        continue

    action = cmd.get("action")
    if action == "open":
        servo.value = SERVO_OPEN
        emit({"event": "door_open"})
    elif action == "close":
        servo.value = SERVO_LOCKED
        emit({"event": "door_closed"})
