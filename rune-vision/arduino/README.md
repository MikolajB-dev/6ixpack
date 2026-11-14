# Arduino lock button (Grove Beginner Kit)

The visitor presses the button on the Grove kit to lock in their answer. It does exactly what SPACE does,
and SPACE still works as a backup. The kit's OLED shows the letter the rune's knob points at right now.

```
Grove button ──USB──> server.py ──> Rune Vision page ──> lockIn()  (same 'lock' event the globe already uses)
Grove OLED   <──USB── server.py <── page sends the current letter (A–D, '-' = no rune, '?' = dot not visible)
```

## One-time setup (about 10 minutes)

1. Install the **Arduino IDE** from https://www.arduino.cc/en/software and open it.
2. Plug the Grove kit into the Mac with a USB cable.
3. Install the screen library: **Tools > Manage Libraries…**, search **U8g2**, click **Install**.
4. Open `lock_button/lock_button.ino` (File > Open).
5. **Tools > Board > Arduino AVR Boards > Arduino Uno** (the kit's board behaves like an Uno).
6. **Tools > Port**: pick the one that says `usbserial` or `usbmodem`.
7. Click **Upload** (the → arrow). When it says "Done uploading", the OLED should say "Place a rune".
8. **Quit the Arduino IDE** (or at least close the Serial Monitor). Only one program can use the USB port at a time.

## Every time

Double-click `start.command` as usual. The terminal window says `Arduino: connected on /dev/cu.…`.
Press the button: it beeps, the LED lights up, the OLED says "Locked in!" and the terminal prints `Arduino: LOCK button pressed`.

## If something is off

| What you see | Fix |
|---|---|
| Terminal: `Arduino: not plugged in` | Plug it in; it connects by itself within 2 seconds. |
| Terminal: `could not open … Serial Monitor` | Close the Arduino IDE. |
| OLED blank | Upload the sketch again; check the U8g2 library is installed. |
| OLED shows `?` | The camera can't see the black dot on the rune (hand in the way, or glare). |
| Port not found by server.py | Run `ARDUINO_PORT=/dev/cu.XXXX python3 server.py` with the port name from Tools > Port. |
