/**
 * timers.h — Countdown turn-off timers subsystem.
 *
 * Purpose : Manages per-relay turn-off timers that persist across reboots.
 *           Checkpoints remaining duration to NVS every 60 seconds.
 * Depends : stdint.h, stdbool.h, config.h, protocol.h.
 * Used by : main.cpp, ble_service.cpp, relays.cpp.
 * Feature : FEATURE_TIMERS
 */

#pragma once

#include "features.h"

#if FEATURE_TIMERS

#include <stdint.h>
#include <stdbool.h>
#include "config.h"
#include "protocol.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t  relayIndex;
    uint32_t remainingSec;
    uint32_t totalSec;
    bool     active;
    bool     resumed;        // True if restored from previous boot checkpoint
} RelayTimer;

typedef void (*TimerEventCallback)(uint8_t relayIndex, bool completed);

/**
 * Initialize timers subsystem, resume any active timers saved in NVS,
 * and restore target relay load states overriding standard boot behavior.
 */
void timersBegin(void);

/**
 * Periodic tick called every 1 second from FreeRTOS task or main loop.
 */
void timersLoop(void);

/**
 * Start a turn-off countdown timer for a relay channel.
 * Sets relay to ON, writes initial state to NVS.
 */
uint8_t timersStart(uint8_t relayIndex, uint16_t durationMinutes);

/**
 * Cancel an active timer for a relay channel.
 */
uint8_t timersCancel(uint8_t relayIndex);

/**
 * Get current timer status for a relay channel.
 */
bool timersGetStatus(uint8_t relayIndex, RelayTimer* outTimer);

/**
 * Clear all timers from memory and NVS.
 */
void timersClearAll(void);

/**
 * Register callback for timer completion (triggers notification blinks and PWA audio).
 */
void timersRegisterCallback(TimerEventCallback cb);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_TIMERS

