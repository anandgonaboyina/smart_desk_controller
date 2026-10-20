#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\pins.h"
/**
 * pins.h — Single source of truth for ALL pin assignments.
 *
 * Purpose : Define every GPIO used or reserved on the ESP32-S3 N16R8.
 * Depends : Nothing (standalone header).
 * Used by : config.h, relay_driver_gpio.cpp, relay_driver_595.cpp, leds.cpp,
 *           main.cpp, settings.cpp.
 * Feature : Always compiled; no feature flag.
 *
 * ESP32-S3 N16R8 forbidden GPIOs (DO NOT USE):
 *   Strapping  : 0, 3, 45, 46
 *   Flash/PSRAM: 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37
 *   USB native : 19, 20  (reserved for TinyUSB HID)
 *   UART       : 43, 44  (serial monitor / logs)
 *   Onboard LED: 48      (on some DevKitC boards)
 */

#pragma once
#include <stdint.h>

/* ── Relay direct-GPIO (active NOW) ──────────────────────────────── */
#define PIN_RELAY_CH1       4
#define PIN_RELAY_CH2       5
#define PIN_RELAY_CH3       6
#define PIN_RELAY_CH4       7

/* ── WS2812B LED strip ───────────────────────────────────────────── */
#define PIN_LED_DATA        8   // Through 74HC245 level shifter + 330Ω
#define PIN_WS2812          PIN_LED_DATA

/* ── Physical button (to GND, internal pull-up) ──────────────────── */
#define PIN_BUTTON          9

/* ── Status LED (active HIGH, simple indicator) ──────────────────── */
#define PIN_STATUS_LED      10

/* ── Future 74HC595 shift register (compiled, unused now) ────────── */
#define PIN_595_SER         15  // Serial data in
#define PIN_595_SRCLK       16  // Shift register clock
#define PIN_595_RCLK        17  // Storage register clock (latch)
#define PIN_595_OE          18  // Output enable (active LOW, ext 10k pull-up)
// SRCLR tied to 3V3 (never cleared by GPIO)

/* ── Future I2C — DS3231 RTC ─────────────────────────────────────── */
#define PIN_I2C_SDA         1
#define PIN_I2C_SCL         2

/* ── USB HID (native port, managed by TinyUSB) ───────────────────── */
#define PIN_USB_DN          19
#define PIN_USB_DP          20

/* ── UART (serial logs, never reassign) ──────────────────────────── */
#define PIN_UART_TX         43
#define PIN_UART_RX         44

/* ── Default relay GPIO table (used by GpioRelayDriver at first boot) */
static const uint8_t DEFAULT_RELAY_PINS[4] = {
    PIN_RELAY_CH1, PIN_RELAY_CH2, PIN_RELAY_CH3, PIN_RELAY_CH4
};

/**
 * Safe GPIO list for user relay-pin reassignment.
 * Every GPIO on the N16R8 that is NOT strapping, flash/PSRAM, USB, or UART.
 * The settings module checks this list AND detects duplicates before accepting.
 *
 * Included: 4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,38,39,40,41,42,47
 * Excluded: 0,3 (strapping), 19,20 (USB), 26-37 (flash/PSRAM),
 *           43,44 (UART), 45,46 (strapping), 48 (onboard LED)
 *
 * Note: GPIOs 1,2 are reserved for I2C but included here because the
 *       assignment validator also checks against currently-used pins.
 */
static const uint8_t SAFE_GPIO_LIST[] = {
    1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47
};
static const uint8_t SAFE_GPIO_COUNT = sizeof(SAFE_GPIO_LIST) / sizeof(SAFE_GPIO_LIST[0]);

/**
 * Check if a GPIO number is in the safe list.
 * Pure function, no hardware access.
 * Example: isGpioSafe(4) → true, isGpioSafe(0) → false, isGpioSafe(26) → false
 */
inline bool isGpioSafe(uint8_t gpio) {
    for (uint8_t i = 0; i < SAFE_GPIO_COUNT; i++) {
        if (SAFE_GPIO_LIST[i] == gpio) return true;
    }
    return false;
}

