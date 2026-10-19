/**
 * main.cpp — ESP32-S3 Firmware Main Entry Point & Serial Diagnostic Menu.
 *
 * Purpose : System boot initialization (glitch-free relay safe boot as line 1),
 *           subsystem coordination, FreeRTOS background task scheduling, boot
 *           self-test report, and comprehensive 115200 baud UART diagnostic menu.
 * Depends : pins.h, config.h, features.h, protocol.h, log.h, diagnostics.h,
 *           and all src subsystems.
 * Used by : PlatformIO build system.
 * Feature : Always compiled.
 */

#include <Arduino.h>
#include "pins.h"
#include "config.h"
#include "features.h"
#include "protocol.h"
#include "log.h"
#include "diagnostics.h"

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

static char s_cmdBuf[32];
static uint8_t s_cmdLen = 0;

static void printMenu(void) {
    Serial.println(F("\n========================================"));
    Serial.println(F("   SmartDesk ESP32-S3 Diagnostic Menu   "));
    Serial.println(F("========================================"));
    Serial.println(F(" 1-4           : Toggle Relay 1..4"));
    Serial.println(F(" r             : Show Relay status (LOAD/COIL/GPIO)"));
    Serial.println(F(" f             : Show Feature Switches"));
    Serial.println(F(" status        : Show System Telemetry Status"));
    Serial.println(F(" selftest      : Run Boot Self-Test Suite"));
    Serial.println(F(" relaytest <n> : Pulse relay & test GPIO readback"));
    Serial.println(F(" ledtest       : Run RGBW WS2812B Sweep"));
    Serial.println(F(" log on|off    : Enable / Disable live logging"));
    Serial.println(F(" log level <x> : Set level (e=err, w=warn, i=info, d=debug)"));
    Serial.println(F(" R             : Reboot device"));
    Serial.println(F(" ?             : Reprint this menu"));
    Serial.println(F("========================================\n"));
}

static void printRelayStatus(void) {
    LOGI(TAG_RELAY, "--- RELAY STATUS (LOAD TERMS) ---");
    uint8_t count = relaysGetActiveCount();
    for (uint8_t i = 0; i < count; i++) {
        RelayConfig cfg;
        relaysGetConfig(i, &cfg);
        uint8_t load = relaysGetLoad(i);
        uint8_t coil = relayLoadToCoil(load, cfg.wiring);
        uint8_t lvl = relayCoilToLevel(coil, cfg.polarity);
        LOGI(TAG_RELAY, "CH%u: [%-12s] Load=%s (coil=%d, pin=%u %s) | MinSw=%ums Away=%s",
             i + 1, cfg.name, load ? "ON " : "OFF", coil, cfg.gpioPin, lvl ? "HIGH" : "LOW ",
             cfg.minSwitchMs, cfg.affectedByAway ? "YES" : "NO");
    }
}

static void printFeatureSwitches(void) {
    LOGI(TAG_FEAT, "--- FEATURE SWITCHES ---");
    const char* names[FSWITCH_COUNT] = {
        "PC_UNLOCK", "USB_TYPING", "BLE_HID", "AUTO_TYPE", "SCHEDULER",
        "TIMERS", "AWAY_MODE", "LED_STRIP", "LED_AUTO", "MUSIC_SYNC",
        "CALL_MODE", "RELAY_LED_LINK", "DAILY_REBOOT", "NOTIFY_BLINKS", "BOOT_ANIMATION"
    };
    for (uint8_t i = 0; i < FSWITCH_COUNT; i++) {
        LOGI(TAG_FEAT, "[%02u] %-16s : %s", i, names[i],
             isFeatureEnabled(i) ? "ENABLED (ON)" : "DISABLED (OFF)");
    }
}

static void processCommand(const char* cmd) {
    if (cmd[0] == '\0') return;

    if (strcmp(cmd, "selftest") == 0) {
        diagnosticsRunSelfTest();
    } else if (strncmp(cmd, "relaytest", 9) == 0) {
        int ch = 1;
        if (strlen(cmd) > 10) ch = atoi(&cmd[10]);
        diagnosticsTestRelay((uint8_t)(ch > 0 ? ch - 1 : 0));
    } else if (strcmp(cmd, "ledtest") == 0) {
        diagnosticsTestLeds();
    } else if (strcmp(cmd, "status") == 0) {
        diagnosticsPrintStatus();
    } else if (strcmp(cmd, "log on") == 0) {
        logSetEnabled(true);
        LOGI(TAG_SYS, "Logging ENABLED");
    } else if (strcmp(cmd, "log off") == 0) {
        LOGI(TAG_SYS, "Logging DISABLED");
        logSetEnabled(false);
    } else if (strncmp(cmd, "log level", 9) == 0) {
        if (strlen(cmd) >= 11) {
            uint8_t lvl = logParseLevel(cmd[10]);
            logSetLevel(lvl);
            LOGI(TAG_SYS, "Log level set to %s", logGetLevelName(lvl));
        }
    } else if (cmd[0] >= '1' && cmd[0] <= '8' && cmd[1] == '\0') {
        uint8_t idx = cmd[0] - '1';
        uint8_t cur = relaysGetLoad(idx);
        relaysSetLoad(idx, !cur);
    } else if (strcmp(cmd, "r") == 0) {
        printRelayStatus();
    } else if (strcmp(cmd, "f") == 0) {
        printFeatureSwitches();
    } else if (strcmp(cmd, "R") == 0) {
        LOGI(TAG_SYS, "Rebooting ESP32 by serial command...");
        systemCmdsScheduleReboot(100);
    } else if (strcmp(cmd, "?") == 0 || strcmp(cmd, "help") == 0) {
        printMenu();
    } else {
        LOGW(TAG_SYS, "Unknown command: '%s'. Type '?' for menu", cmd);
    }
}

static void handleSerialMenu(void) {
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\r' || c == '\n') {
            if (s_cmdLen > 0) {
                s_cmdBuf[s_cmdLen] = '\0';
                processCommand(s_cmdBuf);
                s_cmdLen = 0;
            }
        } else if (c == '\b' || c == 127) {
            if (s_cmdLen > 0) s_cmdLen--;
        } else if (s_cmdLen < sizeof(s_cmdBuf) - 1) {
            s_cmdBuf[s_cmdLen++] = c;
        }
    }
}

void setup() {
    // CRITICAL: Set all relay direct GPIO pins to safe electrical level FIRST
    relaysEarlyBootSafeState();

    Serial.begin(115200);
    delay(50);

    // Initialize non-blocking logging and diagnostics
    logInit();
    diagnosticsInit();

    LOGI(TAG_SYS, "========================================");
    LOGI(TAG_SYS, " SmartDesk Controller v%u.%u.%u",
         FIRMWARE_VERSION_MAJOR, FIRMWARE_VERSION_MINOR, FIRMWARE_VERSION_PATCH);
    LOGI(TAG_SYS, " User: %s | Target: ESP32-S3 N16R8", USER_NAME);
    LOGI(TAG_SYS, "========================================");

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

    LOGI(TAG_BLE, "BLE Peripheral Started. Passkey: %06u", BLE_PIN);

    // Run automated boot self-test suite
    diagnosticsRunSelfTest();

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

    // 60-second periodic telemetry at DEBUG level
    static uint32_t s_lastTelemetryMs = 0;
    uint32_t now = millis();
    if (now - s_lastTelemetryMs >= 60000) {
        s_lastTelemetryMs = now;
        LOGD(TAG_SYS, "Periodic Health: Free Heap: %lu B, Uptime: %lu s",
             (unsigned long)esp_get_free_heap_size(), (unsigned long)reliabilityGetUptimeSec());
    }

    delay(1); // Yield to FreeRTOS scheduler
}
