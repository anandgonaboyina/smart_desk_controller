#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\calls.cpp"
/**
 * calls.cpp — Implementation of Call Mode subsystem.
 *
 * Purpose : Tracks call state, manages auto-off expiration, and fires BLE notifications.
 * Depends : calls.h, feature_switches.h, Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp, leds.cpp.
 * Feature : FEATURE_CALLMODE
 */

#include "features.h"

#if FEATURE_CALLMODE

#include "calls.h"
#include "feature_switches.h"
#include <Arduino.h>
#include <Preferences.h>

static bool s_active = false;
static uint8_t s_autoOffMin = DEFAULT_CALL_AUTO_OFF;
static uint32_t s_startMs = 0;
static CallModeCallback s_callback = (CallModeCallback)0;
static Preferences s_callPrefs;

void callsBegin(void) {
    s_callPrefs.begin("call", true);
    s_active = s_callPrefs.getBool("active", false);
    s_autoOffMin = s_callPrefs.getUChar("autoOff", DEFAULT_CALL_AUTO_OFF);
    s_callPrefs.end();
    s_startMs = millis();
}

uint8_t callsSet(bool active) {
    if (!isFeatureEnabled(FSWITCH_CALL_MODE)) return ERR_FEATURE_DISABLED;

    if (s_active != active) {
        s_active = active;
        s_startMs = millis();
        s_callPrefs.begin("call", false);
        s_callPrefs.putBool("active", s_active);
        s_callPrefs.end();

        if (s_callback) s_callback(s_active);
    }
    return ERR_OK;
}

uint8_t callsSetAutoOffMin(uint8_t minutes) {
    s_autoOffMin = minutes;
    s_callPrefs.begin("call", false);
    s_callPrefs.putUChar("autoOff", s_autoOffMin);
    s_callPrefs.end();
    return ERR_OK;
}

void callsLoop(void) {
    if (!s_active || s_autoOffMin == 0) return;
    if (!isFeatureEnabled(FSWITCH_CALL_MODE)) {
        callsSet(false);
        return;
    }

    if (millis() - s_startMs >= ((uint32_t)s_autoOffMin * 60000)) {
        callsSet(false);
    }
}

bool callsIsActive(void) {
    if (!isFeatureEnabled(FSWITCH_CALL_MODE)) return false;
    return s_active;
}

uint8_t callsGetAutoOffMin(void) {
    return s_autoOffMin;
}

void callsRegisterCallback(CallModeCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_CALLMODE

