/**
 * relays.cpp — Implementation of Relay Manager subsystem.
 *
 * Purpose : Coordinates relay channels in LOAD terms, enforces safety checks,
 *           min switch intervals, test pulses, and drives the active RelayDriver.
 * Depends : relays.h, relay_logic.h, relay_driver_gpio.h, relay_driver_595.h,
 *           Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp, scheduler.cpp, timers.cpp, away.cpp.
 * Feature : FEATURE_RELAYS
 */

#include "relays.h"
#include "relay_logic.h"
#include "relay_driver_gpio.h"
#include "relay_driver_595.h"
#include "features.h"
#include "log.h"
#include <Arduino.h>
#include <Preferences.h>
#include <string.h>

#if FEATURE_AWAY
#include "away.h"
#else
static inline bool awayIsRelayLocked(uint8_t) { return false; }
#endif

static GpioRelayDriver s_gpioDriver;
#if FEATURE_RELAY_595
static ShiftRegisterRelayDriver s_595Driver;
#endif

static RelayDriver* s_driver = &s_gpioDriver;
static uint8_t s_driverType = DRIVER_GPIO;
static uint8_t s_activeCount = RELAY_COUNT;

static uint8_t s_loadStates[RELAY_MAX];
static uint32_t s_lastSwitchMs[RELAY_MAX];
static uint32_t s_testPulseEndMs[RELAY_MAX];
static RelayConfig s_configs[RELAY_MAX];
static RelayStateCallback s_callback = (RelayStateCallback)0;
static Preferences s_statePrefs;

void relaysEarlyBootSafeState(void) {
    // Immediate safe-pin setup to prevent relay clicks during boot float
    for (uint8_t i = 0; i < 4; i++) {
        uint8_t pin = DEFAULT_RELAY_PINS[i];
        if (isGpioSafe(pin)) {
            // Default active-LOW NO relay safe off level is HIGH
            digitalWrite(pin, HIGH);
            pinMode(pin, OUTPUT);
            digitalWrite(pin, HIGH);
        }
    }
}

static void applyHardwareOutput(uint8_t index) {
    if (s_driver == (RelayDriver*)0 || index >= s_activeCount) return;
    uint8_t level = relayLoadToLevel(s_loadStates[index],
                                    s_configs[index].polarity,
                                    s_configs[index].wiring);
    s_driver->setOutput(index, level);
}

static void saveLoadStateNvs(uint8_t index) {
    s_statePrefs.begin(NVS_NS_RELAY, false);
    char key[8];
    snprintf(key, sizeof(key), "st%u", index);
    s_statePrefs.putUChar(key, s_loadStates[index]);
    s_statePrefs.end();
}

static uint8_t loadLoadStateNvs(uint8_t index) {
    s_statePrefs.begin(NVS_NS_RELAY, true);
    char key[8];
    snprintf(key, sizeof(key), "st%u", index);
    uint8_t st = s_statePrefs.getUChar(key, 0);
    s_statePrefs.end();
    return (st != 0) ? 1 : 0;
}

void relaysBegin(void) {
    settingsBegin();
    s_driverType = settingsLoadRelayDriverType();

#if FEATURE_RELAY_595
    if (s_driverType == DRIVER_595) {
        s_driver = &s_595Driver;
        s_activeCount = RELAY_MAX;
    } else {
        s_driver = &s_gpioDriver;
        s_activeCount = RELAY_COUNT;
    }
#else
    s_driver = &s_gpioDriver;
    s_activeCount = RELAY_COUNT;
#endif

    for (uint8_t i = 0; i < s_activeCount; i++) {
        settingsLoadRelayConfig(i, &s_configs[i]);
        if (s_driverType == DRIVER_GPIO) {
            s_gpioDriver.setPin(i, s_configs[i].gpioPin);
        }

        // Determine boot state based on configuration
        uint8_t bootLoad = 0;
        if (s_configs[i].bootBehavior == BOOT_LAST_STATE) {
            bootLoad = loadLoadStateNvs(i);
        } else if (s_configs[i].bootBehavior == BOOT_ALWAYS_ON) {
            bootLoad = 1;
        } // BOOT_ALWAYS_OFF defaults to 0

        s_loadStates[i] = bootLoad;
        s_lastSwitchMs[i] = 0;
        s_testPulseEndMs[i] = 0;
    }

    s_driver->begin();
    for (uint8_t i = 0; i < s_activeCount; i++) {
        applyHardwareOutput(i);
    }
    s_driver->applyAll();
}

void relaysLoop(void) {
    uint32_t now = millis();
    for (uint8_t i = 0; i < s_activeCount; i++) {
        if (s_testPulseEndMs[i] != 0 && now >= s_testPulseEndMs[i]) {
            s_testPulseEndMs[i] = 0;
            relaysForceSetLoad(i, RELAY_LOAD_OFF);
        }
    }
}

uint8_t relaysSetLoad(uint8_t index, uint8_t desiredLoad) {
    if (index >= s_activeCount) return ERR_INVALID_PARAM;
    if (s_configs[index].affectedByAway && awayIsRelayLocked(index)) {
        LOGW(TAG_RELAY, "Relay %d (%s) blocked by Away mode lock", index + 1, s_configs[index].name);
        return ERR_BLOCKED_BY_AWAY;
    }
    return relaysForceSetLoad(index, desiredLoad);
}

uint8_t relaysForceSetLoad(uint8_t index, uint8_t desiredLoad) {
    if (index >= s_activeCount) return ERR_INVALID_PARAM;
    uint8_t normLoad = (desiredLoad != 0) ? 1 : 0;
    uint32_t now = millis();

    if (normLoad != s_loadStates[index]) {
        if (!relayCanSwitch(now, s_lastSwitchMs[index], s_configs[index].minSwitchMs)) {
            LOGW(TAG_RELAY, "Relay %d (%s) rate-limited (interval %u ms)",
                 index + 1, s_configs[index].name, s_configs[index].minSwitchMs);
            return ERR_RATE_LIMITED;
        }
        s_loadStates[index] = normLoad;
        s_lastSwitchMs[index] = now;
        applyHardwareOutput(index);
        s_driver->applyAll();
        saveLoadStateNvs(index);

        uint8_t coil = relayLoadToCoil(normLoad, s_configs[index].wiring);
        uint8_t lvl = relayCoilToLevel(coil, s_configs[index].polarity);
        LOGI(TAG_RELAY, "Relay %d (%s) -> LOAD %s (coil=%d, pin=%d %s)",
             index + 1, s_configs[index].name, normLoad ? "ON" : "OFF",
             coil, s_configs[index].gpioPin, lvl ? "HIGH" : "LOW");

        if (s_callback != (RelayStateCallback)0) {
            s_callback(index, normLoad);
        }
    }
    return ERR_OK;
}


uint8_t relaysGetLoad(uint8_t index) {
    if (index >= s_activeCount) return 0;
    return s_loadStates[index];
}

uint8_t relaysGetAllLoad(uint8_t* outArray, uint8_t maxCount) {
    if (outArray == (uint8_t*)0 || maxCount == 0) return 0;
    uint8_t count = (maxCount < s_activeCount) ? maxCount : s_activeCount;
    memcpy(outArray, s_loadStates, count);
    return count;
}

void relaysAllLoadOff(void) {
    for (uint8_t i = 0; i < s_activeCount; i++) {
        relaysForceSetLoad(i, RELAY_LOAD_OFF);
    }
}

void relaysSafeStateAll(void) {
    for (uint8_t i = 0; i < s_activeCount; i++) {
        s_loadStates[i] = RELAY_LOAD_OFF;
    }
    s_driver->safeStateAll();
}

uint8_t relaysTestPulse(uint8_t index) {
    if (index >= s_activeCount) return ERR_INVALID_PARAM;
    uint8_t err = relaysForceSetLoad(index, RELAY_LOAD_ON);
    if (err == ERR_OK) {
        s_testPulseEndMs[index] = millis() + RELAY_TEST_PULSE_MS;
    }
    return err;
}

uint8_t relaysGetActiveCount(void) {
    return s_activeCount;
}

uint8_t relaysGetDriverType(void) {
    return s_driverType;
}

bool relaysGetConfig(uint8_t index, RelayConfig* outConfig) {
    if (index >= s_activeCount || outConfig == (RelayConfig*)0) return false;
    memcpy(outConfig, &s_configs[index], sizeof(RelayConfig));
    return true;
}

uint8_t relaysSetConfig(uint8_t index, const RelayConfig* inConfig) {
    if (index >= s_activeCount || inConfig == (const RelayConfig*)0) {
        return ERR_INVALID_PARAM;
    }

    uint8_t pinErr = settingsValidateRelayPin(index, inConfig->gpioPin);
    if (pinErr != ERR_OK) return pinErr;

    memcpy(&s_configs[index], inConfig, sizeof(RelayConfig));
    settingsSaveRelayConfig(index, inConfig);

    if (s_driverType == DRIVER_GPIO) {
        s_gpioDriver.setPin(index, inConfig->gpioPin);
    }
    applyHardwareOutput(index);
    s_driver->applyAll();
    return ERR_OK;
}

void relaysRegisterCallback(RelayStateCallback cb) {
    s_callback = cb;
}

