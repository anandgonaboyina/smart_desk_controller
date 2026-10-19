/**
 * relays.h — Relay Manager subsystem.
 *
 * Purpose : High-level manager for all relay channels. Translates between
 *           user LOAD requests and physical driver levels. Manages boot behaviors,
 *           min switch intervals, test pulses, and state persistence.
 * Depends : stdint.h, stdbool.h, settings.h, relay_driver.h.
 * Used by : main.cpp, ble_service.cpp, scheduler.cpp, timers.cpp, away.cpp.
 * Feature : FEATURE_RELAYS
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "settings.h"
#include "relay_driver.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*RelayStateCallback)(uint8_t relayIndex, uint8_t newLoadState);

/**
 * Perform safe boot initialization of direct GPIOs immediately at MCU boot.
 * Called as the VERY FIRST line in setup() before anything else.
 */
void relaysEarlyBootSafeState(void);

/**
 * Initialize RelayManager, driver instance, and apply boot behaviors.
 */
void relaysBegin(void);

/**
 * Background loop processing for non-blocking test pulses.
 */
void relaysLoop(void);

/**
 * Set desired LOAD state for a relay (1 = powered/ON, 0 = unpowered/OFF).
 * Enforces Away lock and min switch interval.
 * Returns error code (ERR_OK, ERR_BLOCKED_BY_AWAY, ERR_RATE_LIMITED, etc.).
 */
uint8_t relaysSetLoad(uint8_t index, uint8_t desiredLoad);

/**
 * Force set LOAD state ignoring Away lock (used by Away mode activation or All-Off).
 */
uint8_t relaysForceSetLoad(uint8_t index, uint8_t desiredLoad);

/**
 * Get current LOAD state of a relay channel.
 */
uint8_t relaysGetLoad(uint8_t index);

/**
 * Read current LOAD states into an array.
 * Returns number of active channels copied.
 */
uint8_t relaysGetAllLoad(uint8_t* outArray, uint8_t maxCount);

/**
 * Immediately turn all active loads OFF.
 */
void relaysAllLoadOff(void);

/**
 * Put all physical hardware pins in their safe electrical off state.
 */
void relaysSafeStateAll(void);

/**
 * Trigger a 1-second test pulse on a specific relay channel.
 */
uint8_t relaysTestPulse(uint8_t index);

/**
 * Get number of currently active relay channels (4 for GPIO, 8 for 595).
 */
uint8_t relaysGetActiveCount(void);

/**
 * Get active hardware driver type (0 = GPIO, 1 = 595).
 */
uint8_t relaysGetDriverType(void);

/**
 * Get relay configuration.
 */
bool relaysGetConfig(uint8_t index, RelayConfig* outConfig);

/**
 * Update relay configuration.
 */
uint8_t relaysSetConfig(uint8_t index, const RelayConfig* inConfig);

/**
 * Register state change notification callback for BLE clients.
 */
void relaysRegisterCallback(RelayStateCallback cb);

#ifdef __cplusplus
}
#endif

