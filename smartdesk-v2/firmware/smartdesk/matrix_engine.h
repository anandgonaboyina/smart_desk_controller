/**
 * matrix_engine.h — 2D LED Matrix Display Engine for SmartDesk V2
 *
 * Purpose : Manages secondary 2D WS2812B matrix display on dedicated GPIO.
 *           Provides XY mapping (Progressive & Zig-Zag Serpentine), bitmap font,
 *           Digital RTC Clock (Mode 17), Scrolling Text (Mode 18), and Matrix Rain (Mode 19).
 * Depends : Adafruit_NeoPixel.h, Preferences.h, smartdesk_pins.h.
 * Used by : smartdesk.ino.
 */

#pragma once

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>
#include "smartdesk_pins.h"

/* ── Matrix Configuration ────────────────────────────────────────────────── */
struct MatrixConfig {
    uint16_t rows;        // e.g. 8, 16, 32 (max rows * cols <= MAX_MATRIX_LEDS)
    uint16_t cols;        // e.g. 8, 32, 64
    uint8_t  wiringType;  // 0 = Progressive (Horizontal), 1 = Zig-Zag (Serpentine)
    uint8_t  pin;         // GPIO pin (default MATRIX_PIN = 11)
    bool     enabled;     // true/false
    uint8_t  mode;        // 0=Off, 17=Digital Clock, 18=Scrolling Text, 19=Matrix Rain
    uint8_t  speed;       // 1..10
    uint8_t  bri;         // 0..255 (brightness scale)
    uint8_t  colorR;
    uint8_t  colorG;
    uint8_t  colorB;
    char     text[64];    // Custom text for Mode 18 marquee
};

static MatrixConfig s_matrixConfig = {
    DEFAULT_MATRIX_ROWS,
    DEFAULT_MATRIX_COLS,
    1,                 // 1 = Zig-Zag / Serpentine by default
    MATRIX_PIN,        // GPIO 11
    true,              // Enabled
    17,                // Mode 17: Digital Clock by default
    5,                 // Speed 5
    180,               // Brightness ~70%
    0, 240, 255,       // Neon Cyan
    "SMARTDESK V2"     // Default scroll text
};

static Adafruit_NeoPixel* s_matrixStrip = nullptr;
static Preferences        s_matrixPrefs;

/* ── Coordinate Mapping Function ─────────────────────────────────────────── */
static inline uint16_t XY(uint16_t x, uint16_t y, uint16_t cols, uint16_t rows, uint8_t wiringType) {
    if (x >= cols || y >= rows) return 0xFFFF;
    if (wiringType == 1) { // 1 = Zig-Zag / Serpentine: odd rows reversed
        if (y % 2 == 1) {
            return (y * cols) + (cols - 1 - x);
        } else {
            return (y * cols) + x;
        }
    }
    // 0 = Progressive: all rows run in the same direction
    return (y * cols) + x;
}

static inline void setMatrixPixel(int16_t x, int16_t y, uint32_t color) {
    if (!s_matrixStrip || x < 0 || y < 0) return;
    if ((uint16_t)x >= s_matrixConfig.cols || (uint16_t)y >= s_matrixConfig.rows) return;
    uint16_t idx = XY((uint16_t)x, (uint16_t)y, s_matrixConfig.cols, s_matrixConfig.rows, s_matrixConfig.wiringType);
    if (idx != 0xFFFF && idx < (s_matrixConfig.rows * s_matrixConfig.cols)) {
        s_matrixStrip->setPixelColor(idx, color);
    }
}

/* ── Lightweight 3x5 & 5x7 Bitmap Font ───────────────────────────────────── */
// 5x7 Font column bitmaps for ASCII 32 (' ') through 90 ('Z')
static const uint8_t FONT_5X7[][5] PROGMEM = {
    {0x00, 0x00, 0x00, 0x00, 0x00}, // ' ' (32)
    {0x00, 0x00, 0x5F, 0x00, 0x00}, // '!'
    {0x00, 0x07, 0x00, 0x07, 0x00}, // '"'
    {0x14, 0x7F, 0x14, 0x7F, 0x14}, // '#'
    {0x24, 0x2A, 0x7F, 0x2A, 0x12}, // '$'
    {0x23, 0x13, 0x08, 0x64, 0x62}, // '%'
    {0x36, 0x49, 0x55, 0x22, 0x50}, // '&'
    {0x00, 0x05, 0x03, 0x00, 0x00}, // '\''
    {0x00, 0x1C, 0x22, 0x41, 0x00}, // '('
    {0x00, 0x41, 0x22, 0x1C, 0x00}, // ')'
    {0x14, 0x08, 0x3E, 0x08, 0x14}, // '*'
    {0x08, 0x08, 0x3E, 0x08, 0x08}, // '+'
    {0x00, 0x50, 0x30, 0x00, 0x00}, // ','
    {0x08, 0x08, 0x08, 0x08, 0x08}, // '-'
    {0x00, 0x60, 0x60, 0x00, 0x00}, // '.'
    {0x20, 0x10, 0x08, 0x04, 0x02}, // '/'
    {0x3E, 0x51, 0x49, 0x45, 0x3E}, // '0' (48)
    {0x00, 0x42, 0x7F, 0x40, 0x00}, // '1'
    {0x42, 0x61, 0x51, 0x49, 0x46}, // '2'
    {0x21, 0x41, 0x45, 0x4B, 0x31}, // '3'
    {0x18, 0x14, 0x12, 0x7F, 0x10}, // '4'
    {0x27, 0x45, 0x45, 0x45, 0x39}, // '5'
    {0x3C, 0x4A, 0x49, 0x49, 0x30}, // '6'
    {0x01, 0x71, 0x09, 0x05, 0x03}, // '7'
    {0x36, 0x49, 0x49, 0x49, 0x36}, // '8'
    {0x06, 0x49, 0x49, 0x29, 0x1E}, // '9'
    {0x00, 0x36, 0x36, 0x00, 0x00}, // ':'
    {0x00, 0x56, 0x36, 0x00, 0x00}, // ';'
    {0x08, 0x14, 0x22, 0x41, 0x00}, // '<'
    {0x14, 0x14, 0x14, 0x14, 0x14}, // '='
    {0x00, 0x41, 0x22, 0x14, 0x08}, // '>'
    {0x02, 0x01, 0x51, 0x09, 0x06}, // '?'
    {0x32, 0x49, 0x79, 0x41, 0x3E}, // '@'
    {0x7E, 0x11, 0x11, 0x11, 0x7E}, // 'A' (65)
    {0x7F, 0x49, 0x49, 0x49, 0x36}, // 'B'
    {0x3E, 0x41, 0x41, 0x41, 0x22}, // 'C'
    {0x7F, 0x41, 0x41, 0x22, 0x1C}, // 'D'
    {0x7F, 0x49, 0x49, 0x49, 0x41}, // 'E'
    {0x7F, 0x09, 0x09, 0x09, 0x01}, // 'F'
    {0x3E, 0x41, 0x49, 0x49, 0x7A}, // 'G'
    {0x7F, 0x08, 0x08, 0x08, 0x7F}, // 'H'
    {0x00, 0x41, 0x7F, 0x41, 0x00}, // 'I'
    {0x20, 0x40, 0x41, 0x3F, 0x01}, // 'J'
    {0x7F, 0x08, 0x14, 0x22, 0x41}, // 'K'
    {0x7F, 0x40, 0x40, 0x40, 0x40}, // 'L'
    {0x7F, 0x02, 0x0C, 0x02, 0x7F}, // 'M'
    {0x7F, 0x04, 0x08, 0x10, 0x7F}, // 'N'
    {0x3E, 0x41, 0x41, 0x41, 0x3E}, // 'O'
    {0x7F, 0x09, 0x09, 0x09, 0x06}, // 'P'
    {0x3E, 0x41, 0x51, 0x21, 0x5E}, // 'Q'
    {0x7F, 0x09, 0x19, 0x29, 0x46}, // 'R'
    {0x46, 0x49, 0x49, 0x49, 0x31}, // 'S'
    {0x01, 0x01, 0x7F, 0x01, 0x01}, // 'T'
    {0x3F, 0x40, 0x40, 0x40, 0x3F}, // 'U'
    {0x1F, 0x20, 0x40, 0x20, 0x1F}, // 'V'
    {0x7F, 0x20, 0x18, 0x20, 0x7F}, // 'W'
    {0x63, 0x14, 0x08, 0x14, 0x63}, // 'X'
    {0x07, 0x08, 0x70, 0x08, 0x07}, // 'Y'
    {0x61, 0x51, 0x49, 0x45, 0x43}  // 'Z' (90)
};

static void drawChar5x7(int16_t x, int16_t y, char c, uint32_t color) {
    if (c >= 'a' && c <= 'z') c -= 32; // Uppercase conversion
    if (c < 32 || c > 90) c = ' ';
    uint8_t charIdx = c - 32;

    for (int col = 0; col < 5; col++) {
        uint8_t line = pgm_read_byte(&FONT_5X7[charIdx][col]);
        for (int row = 0; row < 7; row++) {
            if (line & (1 << row)) {
                setMatrixPixel(x + col, y + row, color);
            }
        }
    }
}

/* ── Hardware Lifecycle & Dynamic Allocation ─────────────────────────────── */
static void initMatrixHardware() {
    if (s_matrixStrip) {
        delete s_matrixStrip;
        s_matrixStrip = nullptr;
    }

    if (!s_matrixConfig.enabled) {
        Serial.println(">>> [MATRIX] Display disabled in config.");
        return;
    }

    uint32_t totalLeds = (uint32_t)s_matrixConfig.rows * (uint32_t)s_matrixConfig.cols;
    if (totalLeds == 0 || totalLeds > MAX_MATRIX_LEDS) {
        s_matrixConfig.rows = DEFAULT_MATRIX_ROWS;
        s_matrixConfig.cols = DEFAULT_MATRIX_COLS;
        totalLeds = s_matrixConfig.rows * s_matrixConfig.cols;
    }

    if (!isSafeMatrixPin(s_matrixConfig.pin)) {
        s_matrixConfig.pin = MATRIX_PIN;
    }

    s_matrixStrip = new Adafruit_NeoPixel((uint16_t)totalLeds, s_matrixConfig.pin, NEO_GRB + NEO_KHZ800);
    if (s_matrixStrip) {
        s_matrixStrip->begin();
        if (s_matrixStrip->getPixels() != nullptr) {
            s_matrixStrip->clear();
            s_matrixStrip->show();
            Serial.printf(">>> [MATRIX] Initialized %dx%d (%d LEDs) on GPIO %d [Wiring: %s]\n",
                          s_matrixConfig.cols, s_matrixConfig.rows, totalLeds, s_matrixConfig.pin,
                          s_matrixConfig.wiringType == 1 ? "Zig-Zag Serpentine" : "Progressive");
        } else {
            Serial.println(">>> [MATRIX WARN] NeoPixel heap allocation failed!");
            delete s_matrixStrip;
            s_matrixStrip = nullptr;
        }
    }
}

/* ── Persistence: Load & Save NVS ────────────────────────────────────────── */
static void loadMatrixConfigFromNVS() {
    s_matrixPrefs.begin("desk_matrix", true);
    s_matrixConfig.rows       = s_matrixPrefs.getUShort("rows", DEFAULT_MATRIX_ROWS);
    s_matrixConfig.cols       = s_matrixPrefs.getUShort("cols", DEFAULT_MATRIX_COLS);
    uint32_t totalLeds = (uint32_t)s_matrixConfig.rows * (uint32_t)s_matrixConfig.cols;
    if (totalLeds == 0 || totalLeds > MAX_MATRIX_LEDS) {
        s_matrixConfig.rows = DEFAULT_MATRIX_ROWS;
        s_matrixConfig.cols = DEFAULT_MATRIX_COLS;
    }

    s_matrixConfig.wiringType = s_matrixPrefs.getUChar("wiring", 1);
    uint8_t pin = s_matrixPrefs.getUChar("pin", MATRIX_PIN);
    s_matrixConfig.pin        = isSafeMatrixPin(pin) ? pin : MATRIX_PIN;
    s_matrixConfig.enabled    = s_matrixPrefs.getBool("en", true);
    s_matrixConfig.mode       = s_matrixPrefs.getUChar("mode", 17);
    s_matrixConfig.speed      = s_matrixPrefs.getUChar("spd", 5);
    s_matrixConfig.bri        = s_matrixPrefs.getUChar("bri", 180);
    s_matrixConfig.colorR     = s_matrixPrefs.getUChar("r", 0);
    s_matrixConfig.colorG     = s_matrixPrefs.getUChar("g", 240);
    s_matrixConfig.colorB     = s_matrixPrefs.getUChar("b", 255);
    String txt = s_matrixPrefs.getString("text", "SMARTDESK V2");
    strncpy(s_matrixConfig.text, txt.c_str(), sizeof(s_matrixConfig.text) - 1);
    s_matrixConfig.text[sizeof(s_matrixConfig.text) - 1] = '\0';
    s_matrixPrefs.end();

    initMatrixHardware();
}

static void saveMatrixConfigToNVS() {
    uint32_t totalLeds = (uint32_t)s_matrixConfig.rows * (uint32_t)s_matrixConfig.cols;
    if (totalLeds == 0 || totalLeds > MAX_MATRIX_LEDS) {
        s_matrixConfig.rows = DEFAULT_MATRIX_ROWS;
        s_matrixConfig.cols = DEFAULT_MATRIX_COLS;
    }
    if (!isSafeMatrixPin(s_matrixConfig.pin)) {
        s_matrixConfig.pin = MATRIX_PIN;
    }
    s_matrixConfig.text[sizeof(s_matrixConfig.text) - 1] = '\0';

    s_matrixPrefs.begin("desk_matrix", false);
    s_matrixPrefs.putUShort("rows", s_matrixConfig.rows);
    s_matrixPrefs.putUShort("cols", s_matrixConfig.cols);
    s_matrixPrefs.putUChar("wiring", s_matrixConfig.wiringType);
    s_matrixPrefs.putUChar("pin", s_matrixConfig.pin);
    s_matrixPrefs.putBool("en", s_matrixConfig.enabled);
    s_matrixPrefs.putUChar("mode", s_matrixConfig.mode);
    s_matrixPrefs.putUChar("spd", s_matrixConfig.speed);
    s_matrixPrefs.putUChar("bri", s_matrixConfig.bri);
    s_matrixPrefs.putUChar("r", s_matrixConfig.colorR);
    s_matrixPrefs.putUChar("g", s_matrixConfig.colorG);
    s_matrixPrefs.putUChar("b", s_matrixConfig.colorB);
    s_matrixPrefs.putString("text", s_matrixConfig.text);
    s_matrixPrefs.end();
}

/* ── Matrix Display Modes ────────────────────────────────────────────────── */

// Helper color scaling with brightness
static inline uint32_t matrixColor(uint8_t r, uint8_t g, uint8_t b, uint8_t bri) {
    if (!s_matrixStrip) return 0;
    uint8_t scaledR = (uint8_t)(((uint16_t)r * bri) / 255);
    uint8_t scaledG = (uint8_t)(((uint16_t)g * bri) / 255);
    uint8_t scaledB = (uint8_t)(((uint16_t)b * bri) / 255);
    return s_matrixStrip->Color(scaledR, scaledG, scaledB);
}

// Mode 17: Digital RTC Clock Display
static void renderMatrixClock(uint8_t h, uint8_t m, uint8_t s) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    char timeBuf[10];
    if (s_matrixConfig.cols >= 45) {
        snprintf(timeBuf, sizeof(timeBuf), "%02d:%02d:%02d", h, m, s);
    } else {
        snprintf(timeBuf, sizeof(timeBuf), "%02d:%02d", h, m);
    }

    int textLen = strlen(timeBuf);
    int totalWidth = textLen * 6 - 1; // 5 px per char + 1 px space
    int16_t startX = (s_matrixConfig.cols - totalWidth) / 2;
    int16_t startY = (s_matrixConfig.rows >= 7) ? (s_matrixConfig.rows - 7) / 2 : 0;

    uint32_t clockColor = matrixColor(s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, s_matrixConfig.bri);
    if (s_matrixConfig.colorR == 0 && s_matrixConfig.colorG == 0 && s_matrixConfig.colorB == 0) {
        clockColor = matrixColor(0, 240, 255, s_matrixConfig.bri); // Default vibrant cyan
    }

    for (int i = 0; i < textLen; i++) {
        // Blink colon on odd seconds
        if (timeBuf[i] == ':' && (s % 2 == 1)) {
            startX += 6;
            continue;
        }
        drawChar5x7(startX, startY, timeBuf[i], clockColor);
        startX += 6;
    }
    s_matrixStrip->show();
}

// Mode 18: Scrolling Marquee Text Display (Left)
static int16_t s_scrollOffset = 0;
static void renderMatrixScrollLeft(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    int textLen = strlen(s_matrixConfig.text);
    if (textLen == 0) return;

    int totalTextPixels = textLen * 6;
    int16_t curX = s_scrollOffset;
    int16_t startY = (s_matrixConfig.rows >= 7) ? (s_matrixConfig.rows - 7) / 2 : 0;

    uint32_t textColor = matrixColor(s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, s_matrixConfig.bri);
    if (s_matrixConfig.colorR == 0 && s_matrixConfig.colorG == 0 && s_matrixConfig.colorB == 0) {
        textColor = matrixColor(255, 140, 20, s_matrixConfig.bri); // Amber default
    }

    for (int i = 0; i < textLen; i++) {
        if (curX > -6 && curX < (int16_t)s_matrixConfig.cols) {
            drawChar5x7(curX, startY, s_matrixConfig.text[i], textColor);
        }
        curX += 6;
    }
    s_matrixStrip->show();

    s_scrollOffset--;
    if (s_scrollOffset < -totalTextPixels) {
        s_scrollOffset = s_matrixConfig.cols;
    }
}

// Mode 20: Scrolling Marquee Text Display (Right)
static void renderMatrixScrollRight(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    int textLen = strlen(s_matrixConfig.text);
    if (textLen == 0) return;

    int totalTextPixels = textLen * 6;
    int16_t curX = s_scrollOffset;
    int16_t startY = (s_matrixConfig.rows >= 7) ? (s_matrixConfig.rows - 7) / 2 : 0;

    uint32_t textColor = matrixColor(s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, s_matrixConfig.bri);
    if (s_matrixConfig.colorR == 0 && s_matrixConfig.colorG == 0 && s_matrixConfig.colorB == 0) {
        textColor = matrixColor(0, 240, 255, s_matrixConfig.bri);
    }

    for (int i = 0; i < textLen; i++) {
        if (curX > -6 && curX < (int16_t)s_matrixConfig.cols) {
            drawChar5x7(curX, startY, s_matrixConfig.text[i], textColor);
        }
        curX += 6;
    }
    s_matrixStrip->show();

    s_scrollOffset++;
    if (s_scrollOffset > (int16_t)s_matrixConfig.cols) {
        s_scrollOffset = -totalTextPixels;
    }
}

// Mode 21: Alternate Bounce Scroll (Left-Right-Left)
static int8_t s_bounceDir = -1;
static void renderMatrixBounceScroll(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    int textLen = strlen(s_matrixConfig.text);
    if (textLen == 0) return;

    int totalTextPixels = textLen * 6 - 1;
    int16_t curX = s_scrollOffset;
    int16_t startY = (s_matrixConfig.rows >= 7) ? (s_matrixConfig.rows - 7) / 2 : 0;

    uint32_t textColor = matrixColor(s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, s_matrixConfig.bri);
    if (s_matrixConfig.colorR == 0 && s_matrixConfig.colorG == 0 && s_matrixConfig.colorB == 0) {
        textColor = matrixColor(245, 158, 11, s_matrixConfig.bri);
    }

    for (int i = 0; i < textLen; i++) {
        if (curX > -6 && curX < (int16_t)s_matrixConfig.cols) {
            drawChar5x7(curX, startY, s_matrixConfig.text[i], textColor);
        }
        curX += 6;
    }
    s_matrixStrip->show();

    s_scrollOffset += s_bounceDir;
    int16_t minLimit = s_matrixConfig.cols - totalTextPixels - 2;
    if (minLimit > 0) minLimit = 0;
    if (s_scrollOffset <= minLimit) {
        s_scrollOffset = minLimit;
        s_bounceDir = 1;
    } else if (s_scrollOffset >= 2) {
        s_scrollOffset = 2;
        s_bounceDir = -1;
    }
}

// Mode 22: Rainbow / Dynamic Color Cycling Text
static void renderMatrixRainbowText(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    int textLen = strlen(s_matrixConfig.text);
    if (textLen == 0) return;

    int totalTextPixels = textLen * 6;
    int16_t curX = s_scrollOffset;
    int16_t startY = (s_matrixConfig.rows >= 7) ? (s_matrixConfig.rows - 7) / 2 : 0;

    for (int i = 0; i < textLen; i++) {
        uint16_t charHue = (uint16_t)((now * 12 + i * 4000) % 65536);
        uint32_t color = s_matrixStrip->gamma32(s_matrixStrip->ColorHSV(charHue, 255, s_matrixConfig.bri));
        if (curX > -6 && curX < (int16_t)s_matrixConfig.cols) {
            drawChar5x7(curX, startY, s_matrixConfig.text[i], color);
        }
        curX += 6;
    }
    s_matrixStrip->show();

    s_scrollOffset--;
    if (s_scrollOffset < -totalTextPixels) {
        s_scrollOffset = s_matrixConfig.cols;
    }
}

// Mode 23: Text Breathing / Fade In-Out
static void renderMatrixFadeText(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    int textLen = strlen(s_matrixConfig.text);
    if (textLen == 0) return;

    int totalWidth = textLen * 6 - 1;
    int16_t startX = (s_matrixConfig.cols > totalWidth) ? (s_matrixConfig.cols - totalWidth) / 2 : 1;
    int16_t startY = (s_matrixConfig.rows >= 7) ? (s_matrixConfig.rows - 7) / 2 : 0;

    float sineVal = (sinf((float)now * 0.003f) + 1.0f) * 0.5f; // 0..1
    uint8_t dynBri = (uint8_t)(sineVal * (float)s_matrixConfig.bri);
    if (dynBri < 5 && s_matrixConfig.bri > 0) dynBri = 5;

    uint32_t color = matrixColor(s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, dynBri);
    if (s_matrixConfig.colorR == 0 && s_matrixConfig.colorG == 0 && s_matrixConfig.colorB == 0) {
        color = matrixColor(168, 85, 247, dynBri); // Purple
    }

    for (int i = 0; i < textLen; i++) {
        if (startX > -6 && startX < (int16_t)s_matrixConfig.cols) {
            drawChar5x7(startX, startY, s_matrixConfig.text[i], color);
        }
        startX += 6;
    }
    s_matrixStrip->show();
}

// Mode 24: Organic Fireplace / Plasma Flame Simulation
static void renderMatrixFire(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    uint16_t cols = s_matrixConfig.cols;
    uint16_t rows = s_matrixConfig.rows;

    for (uint16_t x = 0; x < cols; x++) {
        uint8_t flameHeight = random(1, rows + 1);
        for (uint16_t y = 0; y < flameHeight; y++) {
            int16_t py = rows - 1 - y;
            uint8_t heat = 255 - ((y * 220) / (rows ? rows : 1));
            uint32_t fireColor;
            if (heat > 180) {
                fireColor = matrixColor(255, 200, 40, s_matrixConfig.bri); // Yellow/White base
            } else if (heat > 90) {
                fireColor = matrixColor(240, 80, 0, s_matrixConfig.bri);   // Orange flame
            } else {
                fireColor = matrixColor(180, 20, 0, s_matrixConfig.bri);   // Crimson ember
            }
            setMatrixPixel(x, py, fireColor);
        }
    }
    s_matrixStrip->show();
}

// Mode 25: Starfield / Twinkle Sparkle
#define MAX_STARS 24
struct Star {
    int16_t x;
    int16_t y;
    uint8_t bri;
    int8_t  dir;
};
static Star s_stars[MAX_STARS];
static bool s_starsInit = false;

static void renderMatrixStarfield(uint32_t now) {
    if (!s_matrixStrip) return;
    if (!s_starsInit) {
        for (int i = 0; i < MAX_STARS; i++) {
            s_stars[i].x = random(0, s_matrixConfig.cols);
            s_stars[i].y = random(0, s_matrixConfig.rows);
            s_stars[i].bri = random(10, 240);
            s_stars[i].dir = random(0, 2) == 0 ? 5 : -5;
        }
        s_starsInit = true;
    }

    s_matrixStrip->clear();
    for (int i = 0; i < MAX_STARS; i++) {
        int nextBri = (int)s_stars[i].bri + s_stars[i].dir * 6;
        if (nextBri >= 255) {
            nextBri = 255;
            s_stars[i].dir = -1;
        } else if (nextBri <= 5) {
            nextBri = 5;
            s_stars[i].dir = 1;
            s_stars[i].x = random(0, s_matrixConfig.cols);
            s_stars[i].y = random(0, s_matrixConfig.rows);
        }
        s_stars[i].bri = (uint8_t)nextBri;
        uint32_t starCol = matrixColor(200, 240, 255, (uint8_t)((s_stars[i].bri * (uint16_t)s_matrixConfig.bri) / 255));
        setMatrixPixel(s_stars[i].x, s_stars[i].y, starCol);
    }
    s_matrixStrip->show();
}

// Mode 26: Matrix Audio Spectrum Equalizer
extern uint8_t s_musicLevels[8];
extern uint8_t s_musicBeatVal;

static void renderMatrixAudioSpectrum(uint32_t now) {
    if (!s_matrixStrip) return;
    s_matrixStrip->clear();

    uint16_t cols = s_matrixConfig.cols;
    uint16_t rows = s_matrixConfig.rows;

    for (uint16_t x = 0; x < cols; x++) {
        uint8_t bandIdx = (x * 8) / (cols ? cols : 1);
        uint8_t lvl = s_musicLevels[bandIdx];
        if (lvl < 10 && s_musicBeatVal > 15) lvl = s_musicBeatVal / 2;

        uint16_t barH = ((uint16_t)lvl * rows) / 255;
        if (barH == 0 && lvl > 0) barH = 1;

        for (uint16_t y = 0; y < barH; y++) {
            int16_t py = rows - 1 - y;
            uint32_t col;
            if (y > (rows * 3) / 4) {
                col = matrixColor(255, 30, 30, s_matrixConfig.bri); // Red peak
            } else if (y > rows / 2) {
                col = matrixColor(255, 200, 0, s_matrixConfig.bri); // Amber mid
            } else {
                col = matrixColor(0, 240, 255, s_matrixConfig.bri); // Cyan base
            }
            setMatrixPixel(x, py, col);
        }
    }
    s_matrixStrip->show();
}

// Mode 19: Cyberpunk Matrix Rain
#define MAX_RAIN_COLS 128
struct RainDrop {
    int16_t y;
    uint8_t speed;
    uint8_t length;
};
static RainDrop s_rainDrops[MAX_RAIN_COLS];
static bool s_rainInitialized = false;

static void renderMatrixRain() {
    if (!s_matrixStrip) return;
    uint16_t activeCols = s_matrixConfig.cols;
    if (activeCols > MAX_RAIN_COLS) activeCols = MAX_RAIN_COLS;

    if (!s_rainInitialized) {
        for (int c = 0; c < activeCols; c++) {
            s_rainDrops[c].y = -(random(0, s_matrixConfig.rows + 10));
            s_rainDrops[c].speed = random(1, 4);
            s_rainDrops[c].length = random(3, s_matrixConfig.rows + 2);
        }
        s_rainInitialized = true;
    }

    s_matrixStrip->clear();

    for (int c = 0; c < activeCols; c++) {
        int16_t headY = s_rainDrops[c].y;
        for (int len = 0; len < s_rainDrops[c].length; len++) {
            int16_t py = headY - len;
            if (py >= 0 && py < s_matrixConfig.rows) {
                uint32_t col;
                if (len == 0) {
                    // Blinding white/lime head
                    col = matrixColor(230, 255, 230, s_matrixConfig.bri);
                } else {
                    // Fading emerald green tail
                    uint8_t fade = 255 - ((len * 220) / s_rainDrops[c].length);
                    col = matrixColor(0, fade, (uint8_t)(fade / 8), s_matrixConfig.bri);
                }
                setMatrixPixel(c, py, col);
            }
        }

        s_rainDrops[c].y++;
        if (s_rainDrops[c].y - s_rainDrops[c].length > s_matrixConfig.rows) {
            s_rainDrops[c].y = -random(1, 6);
            s_rainDrops[c].length = random(3, s_matrixConfig.rows + 2);
        }
    }
    s_matrixStrip->show();
}

/* ── Main Non-Blocking Matrix Loop Dispatcher ────────────────────────────── */
static void renderMatrixLeds(uint8_t rtcH, uint8_t rtcM, uint8_t rtcS) {
    if (!s_matrixConfig.enabled || !s_matrixStrip) return;

    static uint32_t s_lastMatrixTick = 0;
    uint32_t now = millis();

    uint8_t spd = (s_matrixConfig.speed >= 1 && s_matrixConfig.speed <= 10) ? s_matrixConfig.speed : 5;

    // Mode-dependent frame intervals
    uint32_t frameDelay = 50;
    if (s_matrixConfig.mode == 17) {
        frameDelay = 500; // Clock updates every 500ms
    } else if (s_matrixConfig.mode == 18 || s_matrixConfig.mode == 20 || s_matrixConfig.mode == 21 || s_matrixConfig.mode == 22) {
        frameDelay = 110 - (spd * 9); // 20ms to 100ms
    } else if (s_matrixConfig.mode == 19) {
        frameDelay = 120 - (spd * 8); // 40ms to 110ms
    } else if (s_matrixConfig.mode == 23) {
        frameDelay = 25; // 40 FPS smooth breathing
    } else if (s_matrixConfig.mode == 24) {
        frameDelay = 130 - (spd * 8); // Flame flicker
    } else if (s_matrixConfig.mode == 25) {
        frameDelay = 40; // Twinkle sparkle
    } else if (s_matrixConfig.mode == 26) {
        frameDelay = 30; // 33 FPS Audio Equalizer
    }

    if (now - s_lastMatrixTick < frameDelay) return;
    s_lastMatrixTick = now;

    switch (s_matrixConfig.mode) {
        case 17:
            renderMatrixClock(rtcH, rtcM, rtcS);
            break;
        case 18:
            renderMatrixScrollLeft(now);
            break;
        case 19:
            renderMatrixRain();
            break;
        case 20:
            renderMatrixScrollRight(now);
            break;
        case 21:
            renderMatrixBounceScroll(now);
            break;
        case 22:
            renderMatrixRainbowText(now);
            break;
        case 23:
            renderMatrixFadeText(now);
            break;
        case 24:
            renderMatrixFire(now);
            break;
        case 25:
            renderMatrixStarfield(now);
            break;
        case 26:
            renderMatrixAudioSpectrum(now);
            break;
        case 0:
        default:
            s_matrixStrip->clear();
            s_matrixStrip->show();
            break;
    }
}

