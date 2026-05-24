import lgpio, time
RS,E,D4,D5,D6,D7=25,24,23,17,27,22
h=lgpio.gpiochip_open(4)
for p in [RS,E,D4,D5,D6,D7]: lgpio.gpio_claim_output(h,p)
def pulse():
	lgpio.gpio_write(h,E,1);time.sleep(0.0005)
	lgpio.gpio_write(h,E,0);time.sleep(0.0005)
def w4(b):
	lgpio.gpio_write(h,D4,(b>>0)&1)
	lgpio.gpio_write(h,D5,(b>>1)&1)
	lgpio.gpio_write(h,D6,(b>>2)&1)
	lgpio.gpio_write(h,D7,(b>>3)&1)
	pulse()
def send(v,m):
	lgpio.gpio_write(h,RS,m);w4(v>>4);w4(v&0xF)
def cmd(v):send(v,0);time.sleep(0.002)
def char(v):send(v,1)
time.sleep(0.05)
w4(0x03);time.sleep(0.005)
w4(0x03);time.sleep(0.001)
w4(0x03);w4(0x02)
cmd(0x28);cmd(0x0C);cmd(0x06);cmd(0x01);time.sleep(0.002)
def msg(row,text):
	cmd(0x80 if row==0 else 0xC0)
	for c in text:char(ord(c))
msg(0,"Ola Mundo!")
msg(1,"Raspberry Pi 5")
lgpio.gpiochip_close(h)
