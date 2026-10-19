/**
 * schedule_logic.cpp — Implementation of pure schedule evaluation.
 *
 * Purpose : Functions to evaluate schedule triggers, weekday masks, catch-up windows.
 * Depends : schedule_logic.h
 * Used by : scheduler.cpp.
 * Feature : FEATURE_SCHEDULER
 */

#include "schedule_logic.h"

bool scheduleIsDayActive(uint8_t weekdayMask, uint8_t dayOfWeek) {
    if (dayOfWeek > 6) return false;
    return ((weekdayMask & (1 << dayOfWeek)) != 0);
}

uint16_t scheduleTimeToMinutes(uint8_t hour, uint8_t minute) {
    return ((uint16_t)(hour % 24) * 60) + (uint16_t)(minute % 60);
}

bool scheduleIsActionDue(uint8_t curHour, uint8_t curMin, uint8_t actHour, uint8_t actMin) {
    if (actHour == SCHEDULE_NO_ACTION_HOUR) return false;
    return (curHour == actHour && curMin == actMin);
}

bool scheduleShouldCatchUp(uint8_t curHour, uint8_t curMin,
                           uint8_t actHour, uint8_t actMin,
                           uint8_t catchUpWindowMin) {
    if (actHour == SCHEDULE_NO_ACTION_HOUR || catchUpWindowMin == 0) {
        return false;
    }

    uint16_t curMins = scheduleTimeToMinutes(curHour, curMin);
    uint16_t actMins = scheduleTimeToMinutes(actHour, actMin);

    // Calculate elapsed minutes from actMins to curMins (modulo 24 hours = 1440 min)
    uint16_t elapsedMins;
    if (curMins >= actMins) {
        elapsedMins = curMins - actMins;
    } else {
        elapsedMins = (1440 - actMins) + curMins;
    }

    return (elapsedMins <= (uint16_t)catchUpWindowMin);
}

uint8_t scheduleDetermineLoadState(uint8_t curHour, uint8_t curMin,
                                   uint8_t onHour, uint8_t onMin,
                                   uint8_t offHour, uint8_t offMin) {
    // If neither or only one action is defined, we cannot infer a static window
    if (onHour == SCHEDULE_NO_ACTION_HOUR || offHour == SCHEDULE_NO_ACTION_HOUR) {
        return 0xFF;
    }

    uint16_t curMins = scheduleTimeToMinutes(curHour, curMin);
    uint16_t onMins  = scheduleTimeToMinutes(onHour, onMin);
    uint16_t offMins = scheduleTimeToMinutes(offHour, offMin);

    if (onMins == offMins) {
        return 0; // Same start and stop time -> OFF
    }

    if (onMins < offMins) {
        // Standard window within the same day (e.g. 09:00 to 17:00)
        return (curMins >= onMins && curMins < offMins) ? 1 : 0;
    } else {
        // Overnight window crossing midnight (e.g. 22:00 to 06:00)
        return (curMins >= onMins || curMins < offMins) ? 1 : 0;
    }
}

