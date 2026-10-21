/**
 * smartdesk_pins.h — Hardware Pin Mapping & BLE UUID Constants for SmartDesk V2
 *
 * Purpose : Defines all physical GPIO pins, hardware ceilings, and BLE GATT UUIDs.
 * Depends : None (Pure C++ / Arduino types).
 * Used by : smartdesk.ino, smartdesk_ble.h, matrix_engine.h.
 */

#pragma once

#include <Arduino.h>

/* ── Hardware Relay Pins (Active-LOW opto-isolated relay module) ────────── */
#define RELAY_COUNT         4
static const uint8_t RELAY_PINS[RELAY_COUNT] = {4, 5, 6, 7};
#define MIN_SWITCH_MS       250

/* ── Primary NeoPixel Strip (WS2812B Dynamic Strip) ─────────────────────── */
#define LED_PIN             8      // Primary LED Strip Data GPIO
#define DEFAULT_STRIP_LEN   8      // Default length if unconfigured in NVS
#define MAX_STRIP_LEDS      800    // Dynamic heap ceiling (1 to 800 LEDs)
#define LED_MAX_BRIGHT      255    // Uncapped 100% hardware brightness (0-255 scale)

/* ── Secondary 2D LED Matrix Display (Dedicated Data GPIO) ──────────────── */
#define MATRIX_PIN          11     // Dedicated 2D Matrix Data GPIO (Separate from Strip!)
#define DEFAULT_MATRIX_ROWS 8      // Default 8 rows
#define DEFAULT_MATRIX_COLS 32     // Default 32 columns (e.g. 8x32 flexible matrix)
#define MAX_MATRIX_LEDS     1024   // Maximum matrix pixel buffer in internal SRAM

// Non-conflicting, safe GPIO pins for ESP32-S3 (excludes Relays 4-7, Strip 8, DHT 9, Buzzer 10, Strapping/Flash/UART/USB)
static inline bool isSafeMatrixPin(uint8_t pin) {
    switch (pin) {
        case 11: case 12: case 13: case 14: case 15:
        case 16: case 17: case 18: case 21:
        case 38: case 39: case 40: case 41: case 42:
            return true;
        default:
            return false;
    }
}

/* ── Environmental Sensors & Acoustic Buzzer ────────────────────────────── */
#define DHT_PIN             9      // DHT11 Sensor Data GPIO (3.3V, GND)
#define BUZZER_PIN          10     // Active Buzzer Signal GPIO (HIGH=Beep, LOW=Silent)

/* ── BLE GATT Identifiers ───────────────────────────────────────────────── */
#define DEFAULT_DEVICE_NAME "smartDesk Controller"
#define SERVICE_UUID        "7f781e04-c0ee-47c9-a1e4-0aafa8ee316b"
#define CHAR_RELAY_UUID     "385d4ec5-88c3-417e-8aa5-2a70db5d49fa"
#define CHAR_LED_UUID       "1814a0cb-9d1f-4212-946a-72e78b64042e"
#define CHAR_CONFIG_UUID    "11848579-c357-45cb-bdb2-88f560c11708"
#define CHAR_INFO_UUID      "f1f28a13-9725-4636-a073-0666057bd91b"
#define CHAR_ENV_UUID       "4a1b0005-c0ee-47c9-a1e4-0aafa8ee316b"

#define BUILD_MARKER        "BUILD " __DATE__ " " __TIME__ " TAG=V2-MODULAR-MATRIX"

