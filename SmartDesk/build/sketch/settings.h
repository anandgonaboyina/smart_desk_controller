#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\settings.h"
/**
 * settings.h — NVS persistence helpers for relay configs and system settings.
 *
 * Purpose : Manage storage and validation of per-relay settings, active driver,
 *           and system configuration using Preferences (NVS).
 * Depends : stdint.h, stdbool.h, config.h, protocol.h, pins.h.
 * Used by : relays.cpp, ble_service.cpp, system_cmds.cpp.
 * Feature : Always compiled.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "config.h"
#include "protocol.h"
#include "pins.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t  enabled;
    uint8_t  polarity;         // 0 = active-LOW, 1 = active-HIGH
    uint8_t  wiring;           // 0 = NO, 1 = NC
    uint8_t  bootBehavior;     // 0 = last state, 1 = always OFF, 2 = always ON
    uint8_t  gpioPin;
    uint16_t minSwitchMs;
    uint8_t  affectedByAway;
    char     name[RCFG_MAX_NAME + 1];
    char     icon[RCFG_MAX_ICON + 1];
} RelayConfig;

/**
 * Initialize settings subsystem and load or write default relay configs.
 */
void settingsBegin(void);

/**
 * Load configuration for a single relay from NVS.
 */
bool settingsLoadRelayConfig(uint8_t index, RelayConfig* outConfig);

/**
 * Save configuration for a single relay to NVS.
 */
bool settingsSaveRelayConfig(uint8_t index, const RelayConfig* inConfig);

/**
 * Reset a single relay's configuration to factory defaults.
 */
void settingsResetRelayConfig(uint8_t index);

/**
 * Reset all relays' configurations to factory defaults.
 */
void settingsResetAllRelayConfigs(void);

/**
 * Load selected relay hardware driver type (0 = GPIO direct, 1 = 74HC595).
 */
uint8_t settingsLoadRelayDriverType(void);

/**
 * Save selected relay hardware driver type to NVS.
 */
void settingsSaveRelayDriverType(uint8_t driverType);

/**
 * Validate proposed GPIO pin for a relay.
 * Checks safe list AND ensures no duplicate assignment across other active relays.
 * Returns:
 *   ERR_OK            : Pin is safe and unique
 *   ERR_INVALID_PIN_NUM: Pin is not in SAFE_GPIO_LIST
 *   ERR_DUPLICATE_PIN : Pin is already in use by another relay channel
 */
uint8_t settingsValidateRelayPin(uint8_t relayIndex, uint8_t candidatePin);

#ifdef __cplusplus
}
#endif

