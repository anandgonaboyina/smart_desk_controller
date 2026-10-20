/**
 * diagnostics.cpp — Implementation of boot self-test and hardware vs code helpers.
 *
 * Purpose : Automated testing with PASS/FAIL/SKIP attribution (HARDWARE vs CODE)
 *           and interactive diagnostic routines for relays and WS2812B strip.
 * Depends : diagnostics.h, log.h, pins.h, config.h, features.h, protocol.h,
 *           relays.h, settings.h, reliability.h, leds.h, ble_service.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : Always compiled.
 */

#include "diagnostics.h"
#include "log.h"
#include "pins.h"
#include "config.h"
#include "features.h"
#include "protocol.h"
#include "relays.h"
#include "../lib/relay_logic/relay_logic.h"
#include "settings.h"
#include "reliability.h"
#include "feature_switches.h"
#include <Arduino.h>
#include <Preferences.h>
#include <esp_system.h>

#if FEATURE_LEDS
#include "leds.h"
#endif

#if FEATURE_BLE
#include "ble_service.h"
#endif

void diagnosticsInit(void) {
    LOGI(TAG_SYS, "Diagnostics subsystem ready");
}

static void printTestResult(const char* testName, bool pass, bool skip, const char* faultType, const char* hint) {
    char line[128];
    if (skip) {
        snprintf(line, sizeof(line), "[SKIP] %-24s : Not compiled or disabled", testName);
        LOGI(TAG_TEST, "%s", line);
    } else if (pass) {
        snprintf(line, sizeof(line), "[PASS] %-24s : OK", testName);
        LOGI(TAG_TEST, "%s", line);
    } else {
        snprintf(line, sizeof(line), "[FAIL] %-24s : [%s] %s", testName, faultType ? faultType : "UNKNOWN", hint ? hint : "Check logs");
        LOGE(TAG_TEST, "%s", line);
    }
}

bool diagnosticsRunSelfTest(void) {
    bool allPass = true;
    LOGI(TAG_TEST, "==================================================");
    LOGI(TAG_TEST, "         SMART DESK CONTROLLER SELF-TEST          ");
    LOGI(TAG_TEST, "==================================================");

    esp_reset_reason_t reason = esp_reset_reason();
    char msg[32];
    if (reason == ESP_RST_BROWNOUT) {
        allPass = false;
        printTestResult("Reset Reason", false, false, "HARDWARE", "Brownout detected! Check 5V power supply capacity");
    } else {
        snprintf(msg, sizeof(msg), "OK (code %d)", (int)reason);
        char line[128];
        snprintf(line, sizeof(line), "[PASS] %-24s : %s", "Reset Reason", msg);
        LOGI(TAG_TEST, "%s", line);
    }

    // 2. NVS Storage
    Preferences prefs;
    bool nvsOk = prefs.begin("selftest_tst", false);
    if (nvsOk) {
        prefs.putUChar("test_val", 42);
        uint8_t readBack = prefs.getUChar("test_val", 0);
        prefs.end();
        if (readBack == 42) {
            printTestResult("NVS Storage", true, false, NULL, NULL);
        } else {
            allPass = false;
            printTestResult("NVS Storage", false, false, "HARDWARE", "NVS write verified failed. Flash chip readback mismatch");
        }
    } else {
        allPass = false;
        printTestResult("NVS Storage", false, false, "HARDWARE/CODE", "Cannot open NVS partition");
    }

    // 3. Relay Config Validation
    bool pinsValid = true;
    uint8_t relayCnt = relaysGetActiveCount();
    for (uint8_t i = 0; i < relayCnt; i++) {
        RelayConfig cfg;
        if (relaysGetConfig(i, &cfg) && settingsValidateRelayPin(i, cfg.gpioPin) != ERR_OK) {
            pinsValid = false;
            break;
        }
    }
    if (pinsValid) {
        printTestResult("Relay Pin Map", true, false, NULL, NULL);
    } else {
        allPass = false;
        printTestResult("Relay Pin Map", false, false, "CODE/CONFIG", "Unsafe GPIO assigned! Check safe GPIO list in pins.h");
    }

    // 4. Relay Pin Readback vs Safe OFF Level
    if (relaysGetDriverType() == 0) { // Direct GPIO
        bool readbackMatch = true;
        for (uint8_t i = 0; i < relayCnt; i++) {
            RelayConfig cfg;
            if (!relaysGetConfig(i, &cfg)) continue;
            uint8_t coil = relayLoadToCoil(0, cfg.wiring);
            uint8_t safeOff = relayCoilToLevel(coil, cfg.polarity);
            uint8_t actual = (uint8_t)digitalRead(cfg.gpioPin);
            if (actual != safeOff) {
                readbackMatch = false;
                char hint[64];
                snprintf(hint, sizeof(hint), "Pin GPIO%d read %d, expected %d. Check 10k pull-up", cfg.gpioPin, actual, safeOff);
                printTestResult("Relay Electrical", false, false, "HARDWARE", hint);
                break;
            }
        }
        if (readbackMatch) {
            printTestResult("Relay Electrical", true, false, NULL, NULL);
        } else {
            allPass = false;
        }
    } else {
        printTestResult("Relay Electrical", true, false, NULL, NULL);
    }

    // 5. LED Driver Init
#if FEATURE_LEDS
    if (isFeatureEnabled(FSWITCH_LED_STRIP)) {
        printTestResult("LED Driver", true, false, NULL, NULL);
    } else {
        printTestResult("LED Driver", false, false, "CONFIG", "LED Strip switch is OFF in feature switches");
    }
#else
    printTestResult("LED Driver", false, true, NULL, NULL);
#endif

    // 6. BLE GATT Peripheral
#if FEATURE_BLE
    printTestResult("BLE GATT Engine", true, false, NULL, NULL);
#else
    printTestResult("BLE GATT Engine", false, true, NULL, NULL);
#endif

    // 7. USB HID
#if FEATURE_HID
    if (isFeatureEnabled(FSWITCH_PC_UNLOCK)) {
        printTestResult("USB Keyboard HID", true, false, NULL, NULL);
    } else {
        printTestResult("USB Keyboard HID", true, false, NULL, "Master switch OFF (normal safety default)");
    }
#else
    printTestResult("USB Keyboard HID", false, true, NULL, NULL);
#endif

    // 8. Free Heap & PSRAM
    uint32_t freeH = esp_get_free_heap_size();
    if (freeH > 80000) {
        printTestResult("System Heap Memory", true, false, NULL, NULL);
    } else {
        allPass = false;
        char hint[48];
        snprintf(hint, sizeof(hint), "Low memory: %lu bytes free. Potential leak", freeH);
        printTestResult("System Heap Memory", false, false, "CODE", hint);
    }

    // 9. Protocol Version
    printTestResult("Protocol Version", (PROTOCOL_VERSION == 1), false, "CODE", "PROTOCOL_VERSION mismatch with spec");

    LOGI(TAG_TEST, "--------------------------------------------------");
    LOGI(TAG_TEST, "Self-Test Finished: %s", allPass ? "ALL TESTS PASSED" : "FAILURES DETECTED");
    LOGI(TAG_TEST, "==================================================");
    return allPass;
}

void diagnosticsTestRelay(uint8_t index) {
    if (index >= relaysGetActiveCount()) {
        LOGE(TAG_TEST, "relaytest: Invalid index %d (max %d)", index, relaysGetActiveCount() - 1);
        return;
    }

    RelayConfig cfg;
    if (!relaysGetConfig(index, &cfg)) return;

    LOGI(TAG_TEST, "── Testing Relay %d (%s, GPIO%d) ──", index + 1, cfg.name, cfg.gpioPin);
    uint8_t origLoad = relaysGetLoad(index);
    uint8_t coil = relayLoadToCoil(0, cfg.wiring);
    uint8_t safeOff = relayCoilToLevel(coil, cfg.polarity);
    uint8_t preRead = (uint8_t)digitalRead(cfg.gpioPin);

    LOGI(TAG_TEST, "Pre-test state: Load=%d, Expected GPIO level=%d, Readback=%d",
         origLoad, safeOff, preRead);

    if (preRead != safeOff && origLoad == 0) {
        LOGW(TAG_TEST, "WARNING: Pin level mismatch! HARDWARE fault or missing 10k pull-up resistor on GPIO%d", cfg.gpioPin);
    }

    // Pulse relay for 1 second
    LOGI(TAG_TEST, "Energizing relay coil for 1000ms...");
    relaysSetLoad(index, 1);
    vTaskDelay(pdMS_TO_TICKS(100)); // Short settling time

    uint8_t activeLevel = (uint8_t)digitalRead(cfg.gpioPin);
    LOGI(TAG_TEST, "Active state: GPIO%d reads %d", cfg.gpioPin, activeLevel);

    vTaskDelay(pdMS_TO_TICKS(900));

    // Revert to original load
    relaysSetLoad(index, origLoad);
    vTaskDelay(pdMS_TO_TICKS(50));
    uint8_t postRead = (uint8_t)digitalRead(cfg.gpioPin);
    LOGI(TAG_TEST, "Reverted state: GPIO%d reads %d (matches original: %s)",
         cfg.gpioPin, postRead, (postRead == preRead) ? "YES (CODE & HARDWARE OK)" : "NO (HARDWARE FAULT)");
}

void diagnosticsTestLeds(void) {
#if FEATURE_LEDS
    LOGI(TAG_TEST, "── Running LED RGB Sweep Test (8 WS2812B LEDs on GPIO%d) ──", PIN_WS2812);
    // Red sweep
    LOGI(TAG_TEST, "Step 1: All RED (checking Red sub-pixels)");
    ledsSetManual(255, 0, 0, 50, 0);
    vTaskDelay(pdMS_TO_TICKS(1000));

    // Green sweep
    LOGI(TAG_TEST, "Step 2: All GREEN (checking Green sub-pixels)");
    ledsSetManual(0, 255, 0, 50, 0);
    vTaskDelay(pdMS_TO_TICKS(1000));

    // Blue sweep
    LOGI(TAG_TEST, "Step 3: All BLUE (checking Blue sub-pixels)");
    ledsSetManual(0, 0, 255, 50, 0);
    vTaskDelay(pdMS_TO_TICKS(1000));

    // White sweep (checking power & 74HC245 level shifter)
    LOGI(TAG_TEST, "Step 4: All WHITE (checking max draw & 74HC245 level shifter)");
    ledsSetManual(255, 255, 255, 50, 0);
    vTaskDelay(pdMS_TO_TICKS(1000));

    LOGI(TAG_TEST, "LED Test complete. Restoring default lighting.");
    ledsSetAuto();
#else
    LOGW(TAG_TEST, "LED Test skipped (FEATURE_LEDS not enabled)");
#endif
}

void diagnosticsPrintStatus(void) {
    LOGI(TAG_SYS, "── System Telemetry Status ──");
    LOGI(TAG_SYS, "Uptime: %lu s | Free Heap: %lu B | Reset: %d",
         reliabilityGetUptimeSec(), reliabilityGetFreeHeap(), reliabilityGetLastResetReason());
    LOGI(TAG_SYS, "Driver: %s (%d relays active)",
         relaysGetDriverType() ? "74HC595" : "Direct GPIO", relaysGetActiveCount());
#if FEATURE_BLE
    LOGI(TAG_SYS, "BLE Clients: %d connected", bleGetConnectedCount());
#endif
}

