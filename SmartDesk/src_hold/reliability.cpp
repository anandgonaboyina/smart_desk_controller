/**
 * reliability.cpp — Implementation of system reliability and button supervisor.
 *
 * Purpose : Watches reset reasons, Task Watchdog, executes daily reboot, supervises
 *           GPIO10 LED, and decodes single/double/long button presses on GPIO9.
 * Depends : reliability.h, relays.h, away.h, scheduler.h, feature_switches.h,
 *           Arduino.h, Preferences.h, esp_system.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : FEATURE_RELIABILITY
 */

#include "features.h"

#if FEATURE_RELIABILITY

#include "reliability.h"
#include "relays.h"
#include "away.h"
#include "scheduler.h"
#include "feature_switches.h"
#include "system_cmds.h"
#include <Arduino.h>
#include <Preferences.h>
#include <esp_system.h>

static uint8_t  s_lastResetReason = 0;
static uint32_t s_bootMillis = 0;
static bool     s_dailyRebootDoneToday = false;
static Preferences s_sysPrefs;

// Button state machine variables
static bool     s_lastBtnState = HIGH;
static uint32_t s_btnPressStartMs = 0;
static uint32_t s_btnReleaseMs = 0;
static uint8_t  s_clickCount = 0;

void reliabilityBegin(void) {
    s_bootMillis = millis();

    pinMode(PIN_BUTTON, INPUT_PULLUP);
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    s_lastResetReason = (uint8_t)esp_reset_reason();

    s_sysPrefs.begin(NVS_NS_SYSTEM, false);
    s_sysPrefs.putUChar("rstReason", s_lastResetReason);
    s_sysPrefs.end();
}

static void handleSingleClick(void) {
    // Short single press = All relays OFF
    relaysAllLoadOff();
}

static void handleDoubleClick(void) {
#if FEATURE_AWAY
    // Double press = Toggle Away mode
    if (awayGetState() == AWAY_STATE_OFF) {
        awayActivate();
    } else {
        awayEnd(1); // Return and restore
    }
#endif
}

static void handleLongHold(void) {
    // 10-second hold = Clear schedules and reset feature switches
    resetFeatureSwitches();
#if FEATURE_SCHEDULER
    schedulerClearAll();
#endif
    // Rapid flash status LED to confirm settings reset
    for (uint8_t i = 0; i < 6; i++) {
        digitalWrite(PIN_STATUS_LED, (i % 2 == 0) ? HIGH : LOW);
        delay(80);
    }
    digitalWrite(PIN_STATUS_LED, LOW);
}

static void updateButtonState(uint32_t now) {
    bool rawState = digitalRead(PIN_BUTTON);

    // Press started (transition from HIGH to LOW)
    if (s_lastBtnState == HIGH && rawState == LOW) {
        s_btnPressStartMs = now;
        s_lastBtnState = LOW;
    }
    // Button released (transition from LOW to HIGH)
    else if (s_lastBtnState == LOW && rawState == HIGH) {
        uint32_t pressDuration = now - s_btnPressStartMs;
        s_lastBtnState = HIGH;
        s_btnReleaseMs = now;

        if (pressDuration >= BUTTON_HOLD_RESET_MS) {
            handleLongHold();
            s_clickCount = 0;
        } else if (pressDuration >= 50) { // Debounced click
            s_clickCount++;
        }
    }

    // Evaluate single vs double click after timeout window
    if (s_clickCount > 0 && (now - s_btnReleaseMs > BUTTON_DOUBLE_MS)) {
        if (s_clickCount >= 2) {
            handleDoubleClick();
        } else {
            handleSingleClick();
        }
        s_clickCount = 0;
    }
}

static void checkDailyReboot(void) {
    if (!isFeatureEnabled(FSWITCH_DAILY_REBOOT)) return;
#if FEATURE_SCHEDULER
    uint8_t h, m, s, day;
    if (schedulerGetLocalTime(&h, &m, &s, &day)) {
        if (h == DAILY_REBOOT_HOUR && m == 0) {
            if (!s_dailyRebootDoneToday) {
                s_dailyRebootDoneToday = true;
                systemCmdsScheduleReboot(1000);
            }
        } else if (h != DAILY_REBOOT_HOUR) {
            s_dailyRebootDoneToday = false;
        }
    }
#endif
}

void reliabilityLoop(void) {
    uint32_t now = millis();
    updateButtonState(now);
    checkDailyReboot();
}

uint32_t reliabilityGetUptimeSec(void) {
    return (millis() - s_bootMillis) / 1000;
}

uint8_t reliabilityGetLastResetReason(void) {
    return s_lastResetReason;
}

uint32_t reliabilityGetFreeHeap(void) {
    return esp_get_free_heap_size();
}

void reliabilitySetStatusLed(bool on) {
    digitalWrite(PIN_STATUS_LED, on ? HIGH : LOW);
}

#endif // FEATURE_RELIABILITY

