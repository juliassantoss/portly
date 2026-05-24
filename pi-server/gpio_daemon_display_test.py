#!/usr/bin/env python3
"""
Portly GPIO daemon.

Spawned by Node (server.js). Communicates via JSON lines:
  stdin  -> commands from Node   ({"action": "open" | "close" | "lcd" | "led", ...})
  stdout -> events to Node       ({"event": "ready" | "bell" | "door_open" | "door_closed"})

Required packages (on Raspberry Pi OS Bookworm / Trixie):
  sudo apt install python3-gpiozero python3-lgpio

Wiring (BCM numbering):
  Doorbell button : GPIO 21  (physical pin 40)  + GND (pin 39)
  Bell LED        : GPIO 14 (physical pin 8) -> 330Ω -> GND
  Servo SG90      : GPIO 17 (physical pin 11) signal only — 5V/GND from external PSU
                    (external PSU GND MUST be tied to a Pi GND pin — common ground required)
  LCD HD44780 1602 (4-bit mode, VDD=3.3V to match Pi logic levels):
                    RS=GPIO 26 (pin 37)
                    E =GPIO 19 (pin 35)
                    D4=GPIO 13 (pin 33)
                    D5=GPIO 6  (pin 31)
                    D6=GPIO 16 (pin 36)
                    D7=GPIO 5  (pin 29)
                    VSS=GND, VDD=3.3V (Pi pin 1), V0=GND (max contrast), RW=GND,
                    A=5V (backlight), K=GND
"""
import json
import os
import signal
import sys
import time

try:
    import lgpio
except Exception:
    lgpio = None

from gpiozero import LED, Button, Device, Servo

try:
    from gpiozero.pins.lgpio import LGPIOFactory
except Exception:
    LGPIOFactory = None

# Pi 5 requires lgpio — RPi.GPIO / pigpio don't work with the RP1 chip
if LGPIOFactory is not None:
    Device.pin_factory = LGPIOFactory()

BELL_PIN = int(os.environ.get("GPIO_BELL", 2))
SERVO_PIN = int(os.environ.get("GPIO_SERVO", 17))
LED_PIN = int(os.environ.get("GPIO_LED", 21))

LCD_RS = int(os.environ.get("GPIO_LCD_RS", 26))
LCD_E = int(os.environ.get("GPIO_LCD_E", 19))
LCD_D4 = int(os.environ.get("GPIO_LCD_D4", 13))
LCD_D5 = int(os.environ.get("GPIO_LCD_D5", 6))
LCD_D6 = int(os.environ.get("GPIO_LCD_D6", 16))
LCD_D7 = int(os.environ.get("GPIO_LCD_D7", 5))


class HD44780:
    """HD44780 4-bit driver using direct lgpio. Generous timings for Pi 5 reliability."""

    LINE_ADDR = (0x00, 0x40, 0x14, 0x54)

    def __init__(self, chip_handle, rs, e, d4, d5, d6, d7, cols=16, rows=2):
        self.h = chip_handle
        self.cols = cols
        self.rows = rows
        self.rs = rs
        self.e = e
        self.data_pins = (d4, d5, d6, d7)
        for pin in (rs, e, d4, d5, d6, d7):
            lgpio.gpio_claim_output(self.h, pin, 0)
        self._init_sequence()

    def _w(self, pin, val):
        lgpio.gpio_write(self.h, pin, val)

    def _pulse_e(self):
        self._w(self.e, 0)
        time.sleep(0.001)
        self._w(self.e, 1)
        time.sleep(0.001)
        self._w(self.e, 0)
        time.sleep(0.001)

    def _write_nibble(self, nibble):
        for i, pin in enumerate(self.data_pins):
            self._w(pin, (nibble >> i) & 1)
        time.sleep(0.0005)
        self._pulse_e()

    def _write(self, byte, is_data):
        self._w(self.rs, 1 if is_data else 0)
        time.sleep(0.0005)
        self._write_nibble((byte >> 4) & 0x0F)
        self._write_nibble(byte & 0x0F)
        time.sleep(0.003)

    def _command(self, cmd, delay=0.003):
        self._write(cmd, is_data=False)
        time.sleep(delay)

    def _init_sequence(self):
        time.sleep(0.2)
        self._w(self.rs, 0)
        self._w(self.e, 0)
        # Three 8-bit function set nibbles (recovers any prior state)
        for _ in range(3):
            self._write_nibble(0x03)
            time.sleep(0.015)
        # Switch to 4-bit
        self._write_nibble(0x02)
        time.sleep(0.015)
        # Function set sent 3x for reliability on marginal contacts
        self._command(0x28, delay=0.01)
        self._command(0x28, delay=0.01)
        self._command(0x28, delay=0.01)
        self._command(0x08, delay=0.01)  # Display off
        self._command(0x01, delay=0.005)  # Clear
        self._command(0x06, delay=0.01)  # Entry mode: increment, no shift
        self._command(0x0C, delay=0.01)  # Display on, cursor off, blink off
        self._command(0x0C, delay=0.01)  # again for reliability

    def clear(self):
        self._command(0x01, delay=0.005)

    def set_cursor(self, col, row):
        row = max(0, min(row, self.rows - 1))
        self._command(0x80 | (col + self.LINE_ADDR[row]))

    def write_text(self, text):
        for ch in text:
            self._write(ord(ch) & 0xFF, is_data=True)

    def show(self, line1="", line2=""):
        for row, text in enumerate((line1, line2)):
            self.set_cursor(0, row)
            self.write_text(text.ljust(self.cols)[:self.cols])

    def close(self):
        try:
            self.clear()
        except Exception:
            pass
        for pin in (self.rs, self.e, *self.data_pins):
            try:
                lgpio.gpio_free(self.h, pin)
            except Exception:
                pass


# SG90: 1ms -> 0°, 1.5ms -> 90°, 2ms -> 180°. Servo value maps -1..+1 to min..max.
servo = Servo(
    SERVO_PIN,
    min_pulse_width=500 / 1_000_000,   # 500 µs
    max_pulse_width=1500 / 1_000_000,  # 1500 µs (locked / neutral)
)

SERVO_LOCKED = 1.0   # 1500 µs
SERVO_OPEN = -1.0    # 500 µs

bell_button = Button(BELL_PIN, pull_up=True, bounce_time=0.1)
bell_led = LED(LED_PIN)

# Separate lgpio handle for the LCD pins (gpiozero already manages the others)
try:
    if lgpio is None:
        raise RuntimeError("lgpio module not available")
    lcd_chip = lgpio.gpiochip_open(0)
    lcd = HD44780(lcd_chip, LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7)
    lcd.show("Portly", "Pronto")
    lcd_ok = True
except Exception as e:
    lcd = None
    lcd_chip = None
    lcd_ok = False
    print(json.dumps({"event": "lcd_error", "message": str(e)}), flush=True)


def emit(event: dict) -> None:
    print(json.dumps(event), flush=True)


def on_bell():
    emit({"event": "bell"})


bell_button.when_pressed = on_bell

# Start locked
servo.value = SERVO_LOCKED
emit({
    "event": "ready",
    "bell": BELL_PIN,
    "servo": SERVO_PIN,
    "led": LED_PIN,
    "lcd": lcd_ok,
})


def shutdown(*_):
    servo.detach()
    bell_led.off()
    if lcd:
        lcd.close()
    if lcd_chip is not None:
        try:
            lgpio.gpiochip_close(lcd_chip)
        except Exception:
            pass
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
    elif action == "lcd" and lcd:
        lcd.show(cmd.get("line1", ""), cmd.get("line2", ""))
    elif action == "led":
        if cmd.get("on"):
            bell_led.on()
        else:
            bell_led.off()
