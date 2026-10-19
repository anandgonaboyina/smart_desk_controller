/**
 * features.h — Compile-time feature flags.
 *
 * Purpose : Enable/disable entire subsystems at compile time. Every
 *           combination of flags set to 0 MUST still compile cleanly
 *           and the firmware MUST run safely with no hardware connected.
 * Depends : Nothing (standalone header).
 * Used by : Every firmware source file wraps its body in #if FEATURE_xxx.
 * Feature : Always compiled; this IS the feature-flag file.
 *
 * These are COMPILE-TIME flags.  They are SEPARATE from the runtime
 * feature switches (feature_switches.h) that the user can toggle over
 * BLE without reflashing.  A runtime switch can only disable something
 * that was compiled in.
 *
 * To disable a feature, set its flag to 0 here and rebuild.
 * The firmware will skip all code for that feature (no RAM, no tasks).
 */

#pragma once

/* ── Core (cannot be disabled) ───────────────────────────────────── */
// Relay control, button "all off", safe-state, BLE pairing, and
// min-switch-interval are always compiled in.  There is no flag.
#define FEATURE_BLE             1   // BLE GATT peripheral engine

/* ── Relay hardware drivers ──────────────────────────────────────── */
#define FEATURE_RELAYS          1   // Relay manager (always 1 in practice)
#define FEATURE_RELAY_595       1   // 74HC595 driver compiled (not used until selected)

/* ── Scheduling & automation ─────────────────────────────────────── */
#define FEATURE_SCHEDULER       1   // Per-relay weekly schedules
#define FEATURE_TIMERS          1   // Turn-off-after-N-minutes timers
#define FEATURE_AWAY            1   // Away mode

/* ── LED strip ───────────────────────────────────────────────────── */
#define FEATURE_LEDS            1   // LED strip master (WS2812B, 8 LEDs)
#define FEATURE_LED_AUTO        1   // Time-of-day auto LED mode
#define FEATURE_MUSIC           1   // Music-reactive LED mode

/* ── Communication & interaction ─────────────────────────────────── */
#define FEATURE_CALLMODE        1   // "On a call" mode

/* ── PC unlock (USB HID + optional BLE HID) ──────────────────────── */
#define FEATURE_HID             1   // USB HID keyboard (TinyUSB)
#define FEATURE_BLE_HID         0   // BLE HID keyboard (default OFF)
// Note on FEATURE_BLE_HID: I am unsure which NimBLE-Arduino 2.x API
// provides a bonded BLE HID keyboard service that coexists with the
// custom GATT service.  NimBLE 2.x removed the old BleKeyboard
// compatibility.  The code compiles the stub but the actual HID
// report-map and bonded-keyboard logic may need a dedicated library
// or manual HID-over-GATT implementation.  See docs/debug-guide.md.

/* ── System reliability ──────────────────────────────────────────── */
#define FEATURE_RELIABILITY     1   // Watchdog, brownout log, daily reboot

