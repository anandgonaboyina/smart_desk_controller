/**
 * away.h — Away Mode subsystem.
 *
 * Purpose : Manages Away mode state machine (OFF -> DELAYING -> ACTIVE), exit delay,
 *           force-off locking for affected relays, and return behavior.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h.
 * Used by : main.cpp, ble_service.cpp, relays.cpp.
 * Feature : FEATURE_AWAY
 */

#pragma once

#include "features.h"

#if FEATURE_AWAY

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*AwayStateCallback)(uint8_t newState);

/**
 * Initialize Away mode subsystem, restore state from NVS if previously active.
 */
void awayBegin(void);

/**
 * Periodic tick called from main loop or FreeRTOS task to manage exit delay.
 */
void awayLoop(void);

/**
 * Activate Away mode (starts exit countdown).
 */
uint8_t awayActivate(void);

/**
 * Cancel Away mode during exit delay or while active.
 */
uint8_t awayCancel(void);

/**
 * End Away mode with user return behavior option:
 * @param restorePrevious 1 = restore previous relay states, 0 = keep everything off.
 */
uint8_t awayEnd(uint8_t restorePrevious);

/**
 * Configure exit delay and maximum active duration.
 */
uint8_t awaySetSettings(uint16_t delaySec, uint16_t maxDurationMin);

/**
 * Get current state of Away mode.
 */
uint8_t awayGetState(void);

/**
 * Check if a specific relay channel is force-locked OFF by active Away mode.
 */
bool awayIsRelayLocked(uint8_t relayIndex);

/**
 * Read full status payload for BLE notification.
 */
void awayGetStatus(uint8_t* outState, uint16_t* outDelaySec, uint16_t* outMaxDurMin,
                   uint16_t* outRemainingDelay, uint16_t* outElapsedMin);

/**
 * Register state change notification callback for BLE clients.
 */
void awayRegisterCallback(AwayStateCallback cb);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_AWAY

