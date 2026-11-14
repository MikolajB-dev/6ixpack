# Rune NFC UID reader (nRF54L15 DK)

Reads the ID (UID) of an NFC tag with an external reader module and prints it
over the DK's USB serial port.

**You need a reader module (RC522 or PN532).** The flat flex antenna that comes
in the nRF54L15 DK box only lets the DK *act as* a tag; the nRF54L15 cannot read tags.

## 1. Set the DK to 3.3 V
nRF Connect for Desktop → Board Configurator → select the DK → VDD = 3.3 V → Write config.

## 2. Wire the reader

| RC522 (default) | DK pin |   | PN532 (I2C mode) | DK pin |
|---|---|---|---|---|
| SDA / CS | P1.14 | | SCL | P1.11 |
| SCK | P1.11 | | SDA | P1.12 |
| MOSI | P1.12 | | VCC | VDD |
| MISO | P1.13 | | GND | GND |
| RST | VDD | | | |
| 3.3V | VDD | | | |
| GND | GND | | | |

Don't press Button 0 with the RC522 wired (it shares P1.13).
PN532 red board: switch 1 ON, switch 2 OFF for I2C, then power-cycle.

## 3. Build and flash (VS Code + nRF Connect extension)
1. nRF Connect panel → **Open an existing application** → pick this folder.
2. **Add build configuration**: board target `nrf54l15dk/nrf54l15/cpuapp`.
   - PN532 only: under *Extra Devicetree overlays* add `pn532.overlay`.
3. **Build**, then **Flash** (DK plugged in by USB).

Command line alternative:
```
west build -b nrf54l15dk/nrf54l15/cpuapp
west build -b nrf54l15dk/nrf54l15/cpuapp -- -DEXTRA_DTC_OVERLAY_FILE=pn532.overlay   # PN532
west flash
```

## 4. Read the output
Open the DK's serial port at 115200 baud (VS Code nRF Terminal, or the
"Serial Terminal" app in nRF Connect for Desktop). The DK shows two COM ports;
use the one that prints `Rune NFC UID reader`.

```
Rune NFC UID reader, using RC522 (SPI)
RC522 version register: 0x92
Reader ready. Put a tag on it.
TAG 04A1B2C3D4E5F6
REMOVED
```
LED0 is on while a tag is on the reader. Write down each rune's UID; that's
what the next step (rune → slot mapping) will use.
