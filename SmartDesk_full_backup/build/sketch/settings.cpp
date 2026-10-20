#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\settings.cpp"
/**
 * settings.cpp — Implementation of NVS settings storage and validation.
 *
 * Purpose : Reads, writes, and validates relay configurations and system settings.
 * Depends : settings.h, Preferences.h, pins.h, snprintf.
 * Used by : relays.cpp, ble_service.cpp, system_cmds.cpp.
 * Feature : Always compiled.
 */

#include "settings.h"
#include <Preferences.h>
#include <stdio.h>
#include <string.h>

static Preferences s_relayPrefs;

static void getDefaultRelayConfig(uint8_t index, RelayConfig* outConfig) {
    if (outConfig == (RelayConfig*)0) return;
    outConfig->enabled = (index < RELAY_COUNT) ? 1 : 0;
    outConfig->polarity = DEFAULT_RELAY_POLARITY;
    outConfig->wiring = DEFAULT_RELAY_WIRING;
    outConfig->bootBehavior = DEFAULT_RELAY_BOOT;
    outConfig->gpioPin = (index < 4) ? DEFAULT_RELAY_PINS[index] : 0;
    outConfig->minSwitchMs = MIN_RELAY_SWITCH_MS;
    outConfig->affectedByAway = 1;

    const char* defaultNames[4] = {"Desk Light", "Monitor", "Charger", "Fan"};
    const char* defaultIcons[4] = {"light", "screen", "power", "fan"};

    if (index < 4) {
        snprintf(outConfig->name, sizeof(outConfig->name), "%s", defaultNames[index]);
        snprintf(outConfig->icon, sizeof(outConfig->icon), "%s", defaultIcons[index]);
    } else {
        snprintf(outConfig->name, sizeof(outConfig->name), "Relay %u", index + 1);
        snprintf(outConfig->icon, sizeof(outConfig->icon), "toggle");
    }
}

void settingsBegin(void) {
    s_relayPrefs.begin(NVS_NS_RELAY, false);
    for (uint8_t i = 0; i < RELAY_MAX; i++) {
        char key[8];
        snprintf(key, sizeof(key), "cfg%u", i);
        if (!s_relayPrefs.isKey(key)) {
            RelayConfig defCfg;
            getDefaultRelayConfig(i, &defCfg);
            s_relayPrefs.putBytes(key, &defCfg, sizeof(RelayConfig));
        }
    }
    s_relayPrefs.end();
}

bool settingsLoadRelayConfig(uint8_t index, RelayConfig* outConfig) {
    if (index >= RELAY_MAX || outConfig == (RelayConfig*)0) return false;
    char key[8];
    snprintf(key, sizeof(key), "cfg%u", index);

    s_relayPrefs.begin(NVS_NS_RELAY, true);
    size_t len = s_relayPrefs.getBytes(key, outConfig, sizeof(RelayConfig));
    s_relayPrefs.end();

    if (len != sizeof(RelayConfig)) {
        getDefaultRelayConfig(index, outConfig);
        return false;
    }
    return true;
}

bool settingsSaveRelayConfig(uint8_t index, const RelayConfig* inConfig) {
    if (index >= RELAY_MAX || inConfig == (const RelayConfig*)0) return false;
    char key[8];
    snprintf(key, sizeof(key), "cfg%u", index);

    s_relayPrefs.begin(NVS_NS_RELAY, false);
    size_t written = s_relayPrefs.putBytes(key, inConfig, sizeof(RelayConfig));
    s_relayPrefs.end();
    return (written == sizeof(RelayConfig));
}

void settingsResetRelayConfig(uint8_t index) {
    if (index >= RELAY_MAX) return;
    RelayConfig defCfg;
    getDefaultRelayConfig(index, &defCfg);
    settingsSaveRelayConfig(index, &defCfg);
}

void settingsResetAllRelayConfigs(void) {
    for (uint8_t i = 0; i < RELAY_MAX; i++) {
        settingsResetRelayConfig(i);
    }
}

uint8_t settingsLoadRelayDriverType(void) {
    s_relayPrefs.begin(NVS_NS_RELAY, true);
    uint8_t driver = s_relayPrefs.getUChar("driver", RELAY_DRIVER_DEFAULT);
    s_relayPrefs.end();
    return (driver > 1) ? RELAY_DRIVER_DEFAULT : driver;
}

void settingsSaveRelayDriverType(uint8_t driverType) {
    s_relayPrefs.begin(NVS_NS_RELAY, false);
    s_relayPrefs.putUChar("driver", (driverType != 0) ? 1 : 0);
    s_relayPrefs.end();
}

uint8_t settingsValidateRelayPin(uint8_t relayIndex, uint8_t candidatePin) {
    if (relayIndex >= RELAY_MAX) return ERR_INVALID_PARAM;
    if (!isGpioSafe(candidatePin)) return ERR_INVALID_PIN_NUM;

    // Check for duplicate pin assigned to any other channel
    for (uint8_t i = 0; i < RELAY_MAX; i++) {
        if (i == relayIndex) continue;
        RelayConfig cfg;
        if (settingsLoadRelayConfig(i, &cfg)) {
            if (cfg.enabled && cfg.gpioPin == candidatePin) {
                return ERR_DUPLICATE_PIN;
            }
        }
    }
    return ERR_OK;
}

