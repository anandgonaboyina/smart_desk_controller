/**
 * main.cpp — ESP32-S3 Firmware Main Entry Point & Serial Test Menu.
 *
 * Purpose : System boot initialization (glitch-free relay safe boot as line 1),
 *           subsystem coordination, FreeRTOS background task scheduling, and an
 *           interactive 115200 baud UART serial test menu for standalone bring-up.
 * Depends : pins.h, config.h, features.h, protocol.h, and all src subsystems.
 * Used by : PlatformIO build system.
 * Feature : Always compiled.
 */

#include <Arduino.h>
#include "pins.h"
#include "config.h"
#include "features.h"
#include "protocol.h"

#include "relays.h"
#include "feature_switches.h"
#include "settings.h"
#include "ble_service.h"
#include "system_cmds.h"
#include "reliability.h"

#if FEATURE_SCHEDULER
#include "scheduler.h"
#endif

#if FEATURE_TIMERS
#include "timers.h"
#endif

#if FEATURE_AWAY
#include "away.h"
#endif

#if FEATURE_LEDS
#include "leds.h"
#endif

#if FEATURE_MUSIC
#include "music.h"
#endif

#if FEATURE_CALLMODE
#include "calls.h"
#endif

#if FEATURE_HID
#include "hid.h"
#endif

static void printMenu(void) {
    Serial.println(F("\n========================================"));
    Serial.println(F("   SmartDesk ESP32-S3 Serial Test Menu  "));
    Serial.println(F("========================================"));
    Serial.println(F(" 1-4 : Toggle Relay 1..4"));
    Serial.println(F("  r  : Show Relay status and configs"));
    Serial.println(F("  f  : Show Feature Switches"));
    Serial.println(F("  s  : Show Schedules"));
    Serial.println(F("  t  : Show Time and Timers"));
    Serial.println(F("  a  : Show / Toggle Away Mode"));
    Serial.println(F("  l  : Toggle LED strip (Warm White / Off)"));
    Serial.println(F("  h  : Show HID status & test Notepad"));
    Serial.println(F("  R  : Reboot device"));
    Serial.println(F("  ?  : Reprint this menu"));
    Serial.println(F("========================================\n"));
}

static void printRelayStatus(void) {
    Serial.println(F("\n--- RELAY STATUS (LOAD TERMS) ---"));
    uint8_t count = relaysGetActiveCount();
    for (uint8_t i = 0; i < count; i++) {
        RelayConfig cfg;
        relaysGetConfig(i, &cfg);
        uint8_t load = relaysGetLoad(i);
        Serial.printf("CH%u: [%s] Load=%s | Pin=%u Pol=%s Wire=%s Boot=%s MinSw=%ums Away=%s\n",
            i + 1, cfg.name,
            load ? "ON " : "OFF",
            cfg.gpioPin,
            cfg.polarity ? "Act-HIGH" : "Act-LOW ",
            cfg.wiring ? "NC" : "NO",
            (cfg.bootBehavior == 0) ? "Last" : (cfg.bootBehavior == 1) ? "Off" : "On",
            cfg.minSwitchMs,
            cfg.affectedByAway ? "YES" : "NO");
    }
}

static void printFeatureSwitches(void) {
    Serial.println(F("\n--- FEATURE SWITCHES ---"));
    const char* names[FSWITCH_COUNT] = {
        "PC_UNLOCK", "USB_TYPING", "BLE_HID", "AUTO_TYPE", "SCHEDULER",
        "TIMERS", "AWAY_MODE", "LED_STRIP", "LED_AUTO", "MUSIC_SYNC",
        "CALL_MODE", "RELAY_LED_LINK", "DAILY_REBOOT", "NOTIFY_BLINKS", "BOOT_ANIMATION"
    };
    for (uint8_t i = 0; i < FSWITCH_COUNT; i++) {
        Serial.printf("[%02u] %-16s : %s\n", i, names[i],
            isFeatureEnabled(i) ? "ENABLED (ON)" : "DISABLED (OFF)");
    }
}

static void handleSerialMenu(void) {
    if (!Serial.available()) return;
    char c = Serial.read();

    if (c >= '1' && c <= '4') {
        uint8_t idx = c - '1';
        uint8_t cur = relaysGetLoad(idx);
        uint8_t err = relaysSetLoad(idx, !cur);
        Serial.printf("Relay CH%u set to %s (result=0x%02X)\n", idx + 1, !cur ? "ON" : "OFF", err);
    } else if (c == 'r') {
        printRelayStatus();
    } else if (c == 'f') {
        printFeatureSwitches();
    } else if (c == 'R') {
        Serial.println(F("Rebooting ESP32..."));
        systemCmdsScheduleReboot(100);
    } else if (c == '?' || c == 'm') {
        printMenu();
    }
}

void setup() {
    // CRITICAL: Set all relay direct GPIO pins to safe electrical level FIRST
    relaysEarlyBootSafeState();

    Serial.begin(115200);
    delay(50);

    Serial.println(F("\n========================================"));
    Serial.printf(" SmartDesk Controller v%u.%u.%u\n",
                  FIRMWARE_VERSION_MAJOR, FIRMWARE_VERSION_MINOR, FIRMWARE_VERSION_PATCH);
    Serial.printf(" User: %s | Target: ESP32-S3 N16R8\n", USER_NAME);
    Serial.println(F("========================================"));

    // Initialize subsystems in defensive dependency order
    featureSwitchesBegin();
    relaysBegin();

#if FEATURE_SCHEDULER
    schedulerBegin();
#endif
#if FEATURE_TIMERS
    timersBegin();
#endif
#if FEATURE_AWAY
    awayBegin();
#endif
#if FEATURE_LEDS
    ledsBegin();
#endif
#if FEATURE_MUSIC
    musicBegin();
#endif
#if FEATURE_CALLMODE
    callsBegin();
#endif
#if FEATURE_HID
    hidBegin();
#endif
#if FEATURE_RELIABILITY
    reliabilityBegin();
#endif

    bleBegin();

    Serial.printf("BLE Peripheral Started. Passkey: %06u\n", BLE_PIN);
    Serial.printf("Free Heap: %u bytes\n", esp_get_free_heap_size());
    printMenu();
}

void loop() {
    relaysLoop();

#if FEATURE_SCHEDULER
    schedulerLoop();
#endif
#if FEATURE_TIMERS
    timersLoop();
#endif
#if FEATURE_AWAY
    awayLoop();
#endif
#if FEATURE_CALLMODE
    callsLoop();
#endif
#if FEATURE_HID
    hidLoop();
#endif
#if FEATURE_MUSIC
    musicLoop();
#endif

    systemCmdsLoop();
    reliabilityLoop();
    bleLoop();
    handleSerialMenu();

    delay(1); // Yield to FreeRTOS scheduler
}

