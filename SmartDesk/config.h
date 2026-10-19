/**
 * config.h — User-editable configuration constants.
 *
 * Purpose : All tuneable defaults in one place.  Change these before
 *           flashing; most can also be overridden at runtime via BLE.
 * Depends : features.h (for conditional defaults).
 * Used by : Almost every firmware source file.
 * Feature : Always compiled.
 *
 * Convention: compile-time defaults are ALL_CAPS.  Runtime-overridable
 * values start with DEFAULT_ and are stored/read from NVS at boot.
 */

#pragma once
#include "features.h"

/* ── Identity ────────────────────────────────────────────────────── */
#define DEVICE_NAME             "SmartDesk"      // BLE advertised name
#define USER_NAME               "Anand"          // Shown in UI greetings
#define FIRMWARE_VERSION_MAJOR  1
#define FIRMWARE_VERSION_MINOR  0
#define FIRMWARE_VERSION_PATCH  0

/* ── BLE security ────────────────────────────────────────────────── */
#define BLE_PIN                 123456           // 6-digit passkey for pairing
#define SECURITY_MODE           0                // 1 = PIN pairing required
                                                 // 0 = open (development only!)

/* ── BLE connection ──────────────────────────────────────────────── */
#define BLE_MAX_CLIENTS         2                // Laptop display + phone remote
#define BLE_ADV_INTERVAL_MS     100              // Advertising interval

/* ── Relay defaults ──────────────────────────────────────────────── */
#define RELAY_COUNT             4                // Active relays (max 8 w/ 595)
#define RELAY_MAX               8                // Absolute max (595 = 8 outputs)
#define RELAY_DRIVER_DEFAULT    0                // 0 = GPIO direct, 1 = 74HC595
#define MIN_RELAY_SWITCH_MS     2000             // Minimum ms between toggles
                                                 // (protects chargers from rapid cycling)

// Default per-relay settings (applied on first boot or after reset)
#define DEFAULT_RELAY_POLARITY  0                // 0 = active-LOW, 1 = active-HIGH
#define DEFAULT_RELAY_WIRING    0                // 0 = NO (normally open), 1 = NC
#define DEFAULT_RELAY_BOOT      0                // 0 = last state, 1 = always OFF, 2 = always ON

/* ── LED strip ───────────────────────────────────────────────────── */
#define LED_COUNT               8                // Exactly 8 WS2812B LEDs
#define LED_MAX_BRIGHTNESS      80               // Absolute max (0-255); caps everything
#define LED_MAX_MA              300              // Max milliamps for the strip
#define LED_MA_PER_LED          60               // Worst-case mA per LED (white, full)
#define LED_COLOR_ORDER         NEO_GRB          // WS2812B = GRB
#define LED_SPEED               NEO_KHZ800       // 800 kHz

// Auto-mode default: resume auto after manual override (minutes, 0 = stay manual)
#define DEFAULT_AUTO_RESUME_MIN 60

/* ── LED effects ─────────────────────────────────────────────────── */
#define LED_FPS                 60               // Target frames per second
#define LED_TASK_STACK          4096             // FreeRTOS stack for LED task
#define LED_TASK_PRIORITY       2                // Lower than BLE (3)

/* ── Music sync ──────────────────────────────────────────────────── */
#define MUSIC_TIMEOUT_MS        2000             // No packet → revert to previous mode
#define MUSIC_STREAM_MAX_HZ     25               // Max packets/second accepted

/* ── Away mode ───────────────────────────────────────────────────── */
#define DEFAULT_AWAY_DELAY_S    60               // Exit delay before relays turn off
#define DEFAULT_AWAY_MAX_MIN    0                // Max duration minutes (0 = unlimited)

/* ── PC unlock / HID ─────────────────────────────────────────────── */
#define DEFAULT_AUTOTYPE_DELAY_S 150             // Seconds after USB mount before typing
#define AUTOTYPE_MIN_DELAY_S    10               // Minimum configurable delay
#define AUTOTYPE_MAX_DELAY_S    300              // Maximum configurable delay
#define HID_COOLDOWN_S          300              // 5-minute cooldown between auto-types
#define HID_MAX_AUTO_PER_DAY    3                // Max automatic attempts per 24h
#define HID_TEST_STRING         "SmartDesk HID test OK"  // Typed by "test with Notepad"
#define HID_MAX_PASSWORD_LEN    32               // Max password length in bytes

/* ── Scheduler ───────────────────────────────────────────────────── */
#define MAX_SCHEDULES           16               // Max stored schedules
#define SCHEDULE_CATCHUP_MIN    0                // Default catch-up window (0 = off)

/* ── Timers ──────────────────────────────────────────────────────── */
#define MAX_TIMERS              8                // Max concurrent timers (one per relay)
#define TIMER_CHECKPOINT_S      60               // Save remaining time every 60s

/* ── Call mode ───────────────────────────────────────────────────── */
#define DEFAULT_CALL_AUTO_OFF   0                // Auto-off minutes (0 = manual only)

/* ── Reliability ─────────────────────────────────────────────────── */
#define DAILY_REBOOT_HOUR       4                // 04:00 local time (if enabled)
#define DAILY_REBOOT_ENABLED    false            // Default OFF
#define BUTTON_HOLD_RESET_MS    10000            // Hold 10s to clear settings
#define BUTTON_DOUBLE_MS        500              // Double-press window for Away mode

/* ── NVS namespaces ──────────────────────────────────────────────── */
#define NVS_NS_RELAY            "relay"          // Relay state & config
#define NVS_NS_SCHEDULE         "sched"          // Schedules
#define NVS_NS_TIMER            "timer"          // Timer state
#define NVS_NS_AWAY             "away"           // Away mode state
#define NVS_NS_LED              "led"            // LED state, slots, presets
#define NVS_NS_HID              "hid"            // Password (obfuscated), settings
#define NVS_NS_FEATURE          "feat"           // Feature switches
#define NVS_NS_SYSTEM           "sys"            // Reset reason, daily reboot

/* ── Task priorities (higher = more important) ───────────────────── */
#define TASK_PRIORITY_BLE       5                // BLE callbacks
#define TASK_PRIORITY_RELAY     4                // Relay command processing
#define TASK_PRIORITY_LED       2                // LED rendering at 60 FPS
#define TASK_PRIORITY_SCHED     1                // Scheduler checks (once/sec)
#define TASK_PRIORITY_MONITOR   1                // Reliability monitor

