/*
  Rune lock button for the Grove Beginner Kit for Arduino.

  - Shows the answer letter the rune's knob points at (A, B, C or D) big on the OLED.
    The laptop sends it as a line "SHOW B" over USB.
  - When the visitor presses the button, it sends "LOCK" to the laptop, beeps and lights the LED.
    The laptop treats that exactly like pressing SPACE.

  Uses the parts already on the kit board (no wiring needed):
    LED = D4, buzzer = D5, button = D6, OLED = I2C.
  Needs the "U8g2" library (Arduino IDE: Tools > Manage Libraries > search U8g2 > Install).
*/
#include <Wire.h>
#include <U8g2lib.h>

const int LED_PIN = 4;
const int BUZZER_PIN = 5;
const int BUTTON_PIN = 6;
const unsigned long LOCKED_SHOW_MS = 1500;   // how long "Locked in!" stays on screen

// "_1_" = draws the screen in small pieces, which saves the Arduino's small memory.
// U8G2_R2 = rotated 180 degrees (the kit's screen is mounted upside down). Use U8G2_R0 to flip it back.
U8G2_SSD1306_128X64_NONAME_1_HW_I2C oled(U8G2_R2, U8X8_PIN_NONE);

char letter = '-';            // '-' no rune, '?' knob dot not visible, otherwise A-D
bool showingLocked = false;   // true for a moment after the button press
unsigned long lockedAt = 0;
bool buttonWasDown = false;
unsigned long lastPressAt = 0;
bool needRedraw = true;

char line[16];                // the line we are receiving from the laptop
int lineLength = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT);
  Serial.begin(9600);
  oled.begin();
}

void loop() {
  checkButton();
  readLaptop();

  // switch "Locked in!" off again after a moment
  if (showingLocked && millis() - lockedAt > LOCKED_SHOW_MS) {
    showingLocked = false;
    digitalWrite(LED_PIN, LOW);
    needRedraw = true;
  }
  if (needRedraw) {
    drawScreen();
    needRedraw = false;
  }
}

void checkButton() {
  bool down = digitalRead(BUTTON_PIN) == HIGH;   // the kit's button reads HIGH when pressed
  // react only to the moment it goes down, and ignore bounces/double presses within 0.5 s
  if (down && !buttonWasDown && millis() - lastPressAt > 500) {
    lastPressAt = millis();
    Serial.println("LOCK");
    tone(BUZZER_PIN, 1200, 150);
    digitalWrite(LED_PIN, HIGH);
    showingLocked = true;
    lockedAt = millis();
    needRedraw = true;
  }
  buttonWasDown = down;
}

// Reads characters from the laptop until a full line like "SHOW B" has arrived.
void readLaptop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      line[lineLength] = '\0';
      if (lineLength >= 6 && strncmp(line, "SHOW ", 5) == 0 && line[5] != letter) {
        letter = line[5];
        needRedraw = true;
      }
      lineLength = 0;
    } else if (lineLength < (int)sizeof(line) - 1) {
      line[lineLength++] = c;
    }
  }
}

void drawScreen() {
  char big[2] = { letter, '\0' };
  char lockedText[8] = "in: ?";
  lockedText[4] = letter;

  oled.firstPage();
  do {
    if (showingLocked)      drawTwoLines("Locked", lockedText);
    else if (letter == '-') drawTwoLines("Place", "a rune");
    else if (letter == '?') drawTwoLines("Dot not", "visible");
    else {
      // just the answer letter, as big as the screen allows
      oled.setFont(u8g2_font_logisoso50_tr);
      oled.drawStr((128 - oled.getStrWidth(big)) / 2, 61, big);
    }
  } while (oled.nextPage());
}

// Two lines of big text, centred.
void drawTwoLines(const char *top, const char *bottom) {
  oled.setFont(u8g2_font_helvB18_tr);
  oled.drawStr((128 - oled.getStrWidth(top)) / 2, 27, top);
  oled.drawStr((128 - oled.getStrWidth(bottom)) / 2, 58, bottom);
}
