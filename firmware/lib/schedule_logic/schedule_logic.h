/**
 * schedule_logic.h — Pure schedule and time evaluation logic.
 *
 * Purpose : Check if a schedule is active for a given day/time, handle
 *           missed schedule catch-up windows, and determine whether a relay
 *           should be ON or OFF during a given minute.
 * Depends : stdint.h, stdbool.h (pure logic, no RTC/hardware dependencies).
 * Used by : scheduler.cpp.
 * Feature : FEATURE_SCHEDULER
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SCHEDULE_NO_ACTION_HOUR 0xFF

/**
 * Check if a weekday bit is set in the weekday mask.
 * Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 * Mask: bit 0 = Sun, bit 1 = Mon, ..., bit 6 = Sat (0x7F = all days).
 * Example pairs:
 *   isDayActive(0x7F, 3) -> true  (all days)
 *   isDayActive(0x3E, 0) -> false (Mon-Fri only; Sun=0 is false)
 *   isDayActive(0x3E, 1) -> true  (Mon-Fri; Mon=1 is true)
 */
bool scheduleIsDayActive(uint8_t weekdayMask, uint8_t dayOfWeek);

/**
 * Convert hours and minutes to minutes since midnight (0 to 1439).
 * Example:
 *   timeToMinutes(0, 0)   -> 0
 *   timeToMinutes(9, 30)  -> 570
 *   timeToMinutes(23, 59) -> 1439
 */
uint16_t scheduleTimeToMinutes(uint8_t hour, uint8_t minute);

/**
 * Check if a scheduled action (ON or OFF) is due at the current minute.
 * If actionHour is SCHEDULE_NO_ACTION_HOUR (0xFF), returns false.
 * Example pairs:
 *   isActionDue(9, 30, 9, 30) -> true
 *   isActionDue(9, 31, 9, 30) -> false
 *   isActionDue(9, 30, 0xFF, 0) -> false
 */
bool scheduleIsActionDue(uint8_t curHour, uint8_t curMin, uint8_t actHour, uint8_t actMin);

/**
 * Check if a missed schedule should catch up upon reconnect/boot.
 * Returns true if current time is within [actionTime, actionTime + catchUpWindowMin].
 * Handles rollover if catch-up window crosses midnight.
 * Example pairs:
 *   shouldCatchUp(10, 05, 10, 00, 15) -> true  (5 min after action, window 15)
 *   shouldCatchUp(10, 20, 10, 00, 15) -> false (20 min after action, window 15)
 *   shouldCatchUp(10, 00, 10, 00, 15) -> true  (exact match)
 */
bool scheduleShouldCatchUp(uint8_t curHour, uint8_t curMin,
                           uint8_t actHour, uint8_t actMin,
                           uint8_t catchUpWindowMin);

/**
 * Determine what load state a relay should be in during a given time of day.
 * Returns:
 *   1  : Relay should be ON (inside active on-window)
 *   0  : Relay should be OFF (outside active window)
 *   0xFF: Indeterminate / point action only (no full window defined)
 *
 * Example pairs:
 *   Window 09:00 to 17:00, cur 12:00 -> 1 (ON)
 *   Window 09:00 to 17:00, cur 18:00 -> 0 (OFF)
 *   Overnight 22:00 to 06:00, cur 23:30 -> 1 (ON)
 *   Overnight 22:00 to 06:00, cur 04:00 -> 1 (ON)
 *   Overnight 22:00 to 06:00, cur 12:00 -> 0 (OFF)
 */
uint8_t scheduleDetermineLoadState(uint8_t curHour, uint8_t curMin,
                                   uint8_t onHour, uint8_t onMin,
                                   uint8_t offHour, uint8_t offMin);

#ifdef __cplusplus
}
#endif

