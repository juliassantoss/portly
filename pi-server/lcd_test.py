"""LCD test using RPLCD library. Adapted to Portly wiring."""
import time
from RPLCD.gpio import CharLCD
import RPi.GPIO as GPIO

GPIO.setwarnings(False)

# Portly LCD wiring (BCM numbering)
lcd = CharLCD(
    pin_rs=26,                  # GPIO 26 (Pi pin 37)
    pin_e=19,                   # GPIO 19 (Pi pin 35)
    pins_data=[13, 6, 16, 5],   # [D4, D5, D6, D7] -> GPIOs 13, 6, 16, 5
    numbering_mode=GPIO.BCM,
    cols=16,
    rows=2,
)

try:
    print("Iniciando o teste do LCD... Ctrl+C para parar.")
    lcd.clear()
    lcd.cursor_pos = (0, 0)
    lcd.write_string("Raspberry Pi 5")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("LCD 16x2 Pronto")
    time.sleep(4)

    contador = 0
    while True:
        lcd.clear()
        lcd.cursor_pos = (0, 0)
        lcd.write_string("Testando Fonte")
        lcd.cursor_pos = (1, 0)
        lcd.write_string(f"Contador: {contador}")
        contador += 1
        time.sleep(1)

except KeyboardInterrupt:
    print("\nEncerrando e limpando o display.")
    lcd.clear()
    GPIO.cleanup()
