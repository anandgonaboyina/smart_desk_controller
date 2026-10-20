#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\scheduler.h"
/**
 * scheduler.h — Weekly relay scheduler subsystem.
 *
 * Purpose : Executes scheduled ON/OFF events for relays based on synchronized time.
 *           Persists up to 16 schedules in NVS. Supports weekday masks and catch-up.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h.
 * Used by : main.cpp, ble_service.cpp, relays.cpp.
 * Feature : FEATURE_SCHEDULER
 */

#pragma once

#include "features.h"

#if FEATURE_SCHEDULER

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t index;          // 0 to MAX_SCHEDULES - 1
    uint8_t relayIndex;     // 0 to 7
    uint8_t weekdayMask;    // bit0=Sun, bit1=Mon, ..., bit6=Sat
    uint8_t onHour;         // 0-23, 0xFF = no on action
    uint8_t onMin;          // 0-59
    uint8_t offHour;        // 0-23, 0xFF = no off action
    uint8_t offMin;         // 0-59
    uint8_t enabled;        // 0/1
    uint8_t catchUpMin;     // 0 = off, 1-60 = catch-up window
} ScheduleEntry;

typedef void (*ScheduleFiredCallback)(uint8_t scheduleIndex, uint8_t relayIndex, uint8_t loadState);

/**
 * Initialize scheduler subsystem, load schedules from NVS.
 */
void schedulerBegin(void);

/**
 * Periodic task called once per second from FreeRTOS task or main loop.
 */
void schedulerLoop(void);

/**
 * Synchronize system time from PWA client (UNIX seconds + local timezone offset).
 */
void schedulerSyncTime(uint32_t unixTimestamp, int16_t tzOffsetMin);

/**
 * Check if system time has been synchronized at least once.
 */
bool schedulerIsTimeSynced(void);

/**
 * Get current local time broken down into components.
 */
bool schedulerGetLocalTime(uint8_t* outHour, uint8_t* outMin, uint8_t* outSec, uint8_t* outWeekday);

/**
 * Get a specific schedule entry by index.
 */
bool schedulerGetEntry(uint8_t index, ScheduleEntry* outEntry);

/**
 * Set or update a schedule entry and save to NVS.
 */
uint8_t schedulerSetEntry(const ScheduleEntry* entry);

/**
 * Delete/clear a schedule entry in NVS.
 */
uint8_t schedulerDeleteEntry(uint8_t index);

/**
 * Clear all stored schedules.
 */
void schedulerClearAll(void);

/**
 * Register callback for notification blinks / rules when a schedule triggers.
 */
void schedulerRegisterCallback(ScheduleFiredCallback cb);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_SCHEDULER

