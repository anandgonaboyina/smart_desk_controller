#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\feature_switches.cpp"
/**
 * feature_switches.cpp — Implementation of runtime feature switches.
 *
 * Purpose : Persists feature switches to NVS and enforces device-side runtime gates.
 * Depends : feature_switches.h, config.h, Preferences.h.
 * Used by : ble_service.cpp, main.cpp, and all subsystem tasks.
 * Feature : Always compiled.
 */

#include "feature_switches.h"
#include "config.h"
#include <Preferences.h>
#include <string.h>

static uint8_t s_switches[FSWITCH_COUNT];
static FeatureSwitchCallback s_callback = (FeatureSwitchCallback)0;
static Preferences s_prefs;

void featureSwitchesBegin(void) {
    s_prefs.begin(NVS_NS_FEATURE, false);
    size_t readLen = s_prefs.getBytes("switches", s_switches, FSWITCH_COUNT);
    if (readLen != FSWITCH_COUNT) {
        memcpy(s_switches, FSWITCH_DEFAULTS, FSWITCH_COUNT);
        s_prefs.putBytes("switches", s_switches, FSWITCH_COUNT);
    }
    s_prefs.end();
}

bool isFeatureEnabled(uint8_t switchIndex) {
    if (switchIndex >= FSWITCH_COUNT) return false;
    return (s_switches[switchIndex] != 0);
}

bool setFeatureSwitch(uint8_t switchIndex, uint8_t value) {
    if (switchIndex >= FSWITCH_COUNT) return false;
    uint8_t normVal = (value != 0) ? 1 : 0;
    if (s_switches[switchIndex] == normVal) return true;

    s_switches[switchIndex] = normVal;
    s_prefs.begin(NVS_NS_FEATURE, false);
    s_prefs.putBytes("switches", s_switches, FSWITCH_COUNT);
    s_prefs.end();

    if (s_callback != (FeatureSwitchCallback)0) {
        s_callback(switchIndex, normVal);
    }
    return true;
}

uint8_t getFeatureSwitches(uint8_t* outArray, uint8_t maxCount) {
    if (outArray == (uint8_t*)0 || maxCount == 0) return 0;
    uint8_t count = (maxCount < FSWITCH_COUNT) ? maxCount : FSWITCH_COUNT;
    memcpy(outArray, s_switches, count);
    return count;
}

void resetFeatureSwitches(void) {
    memcpy(s_switches, FSWITCH_DEFAULTS, FSWITCH_COUNT);
    s_prefs.begin(NVS_NS_FEATURE, false);
    s_prefs.putBytes("switches", s_switches, FSWITCH_COUNT);
    s_prefs.end();

    if (s_callback != (FeatureSwitchCallback)0) {
        for (uint8_t i = 0; i < FSWITCH_COUNT; i++) {
            s_callback(i, s_switches[i]);
        }
    }
}

void registerFeatureSwitchCallback(FeatureSwitchCallback cb) {
    s_callback = cb;
}

