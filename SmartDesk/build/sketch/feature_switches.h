#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\feature_switches.h"
/**
 * feature_switches.h — Runtime feature switch management.
 *
 * Purpose : Enables or disables system features dynamically over BLE
 *           without reflashing. Persisted in NVS. Firmware enforces
 *           all switches device-side.
 * Depends : stdint.h, stdbool.h, protocol.h.
 * Used by : relays.cpp, leds.cpp, scheduler.cpp, timers.cpp, away.cpp,
 *           hid.cpp, ble_service.cpp, main.cpp.
 * Feature : Always compiled (Core safety & control).
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*FeatureSwitchCallback)(uint8_t switchIndex, uint8_t newValue);

/**
 * Initialize feature switches from NVS or apply defaults.
 */
void featureSwitchesBegin(void);

/**
 * Check if a runtime feature switch is enabled.
 * Safety exceptions (relays, pairing, min interval) always return true.
 * Example:
 *   isFeatureEnabled(FSWITCH_SCHEDULER) -> true or false
 */
bool isFeatureEnabled(uint8_t switchIndex);

/**
 * Update a runtime feature switch. Writes to NVS only on change.
 * Returns true if changed successfully.
 */
bool setFeatureSwitch(uint8_t switchIndex, uint8_t value);

/**
 * Copy all current feature switch states into destination buffer.
 */
uint8_t getFeatureSwitches(uint8_t* outArray, uint8_t maxCount);

/**
 * Reset all runtime feature switches back to factory defaults.
 */
void resetFeatureSwitches(void);

/**
 * Register callback to notify connected BLE clients when a switch changes.
 */
void registerFeatureSwitchCallback(FeatureSwitchCallback cb);

#ifdef __cplusplus
}
#endif

