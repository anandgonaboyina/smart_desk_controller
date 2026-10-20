#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\scheduler.cpp"
/**
 * scheduler.cpp — Implementation of weekly relay scheduler subsystem.
 *
 * Purpose : Executes scheduled relay triggers, handles time synchronization,
 *           evaluates weekday masks, catch-up windows, and persists to NVS.
 * Depends : scheduler.h, schedule_logic.h, relays.h, feature_switches.h,
 *           Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : FEATURE_SCHEDULER
 */

#include "features.h"

#if FEATURE_SCHEDULER

#include "scheduler.h"
#include "protocol.h"
#include "schedule_logic.h"
#include "relays.h"
#include "feature_switches.h"
#include <Arduino.h>
#include <Preferences.h>
#include <string.h>
#include <stdio.h>

static ScheduleEntry s_schedules[MAX_SCHEDULES];
static uint32_t s_baseUnix = 0;
static uint32_t s_syncMillis = 0;
static int16_t s_tzOffsetMin = 330; // Default +05:30 (IST)
static bool s_timeSynced = false;
static int16_t s_lastCheckedMinute = -1;
static ScheduleFiredCallback s_callback = (ScheduleFiredCallback)0;
static Preferences s_schedPrefs;

static void loadSchedulesFromNvs(void) {
    s_schedPrefs.begin(NVS_NS_SCHEDULE, true);
    for (uint8_t i = 0; i < MAX_SCHEDULES; i++) {
        char key[8];
        snprintf(key, sizeof(key), "sc%u", i);
        size_t len = s_schedPrefs.getBytes(key, &s_schedules[i], sizeof(ScheduleEntry));
        if (len != sizeof(ScheduleEntry)) {
            memset(&s_schedules[i], 0, sizeof(ScheduleEntry));
            s_schedules[i].index = i;
            s_schedules[i].onHour = SCHEDULE_NO_ACTION_HOUR;
            s_schedules[i].offHour = SCHEDULE_NO_ACTION_HOUR;
        }
    }
    s_schedPrefs.end();
}

static void saveScheduleToNvs(uint8_t index) {
    if (index >= MAX_SCHEDULES) return;
    s_schedPrefs.begin(NVS_NS_SCHEDULE, false);
    char key[8];
    snprintf(key, sizeof(key), "sc%u", index);
    s_schedPrefs.putBytes(key, &s_schedules[index], sizeof(ScheduleEntry));
    s_schedPrefs.end();
}

void schedulerBegin(void) {
    loadSchedulesFromNvs();
}

bool schedulerIsTimeSynced(void) {
    return s_timeSynced;
}

bool schedulerGetLocalTime(uint8_t* outHour, uint8_t* outMin, uint8_t* outSec, uint8_t* outWeekday) {
    if (!s_timeSynced) return false;
    uint32_t elapsedSec = (millis() - s_syncMillis) / 1000;
    int64_t localSec = (int64_t)s_baseUnix + elapsedSec + ((int64_t)s_tzOffsetMin * 60);

    if (outSec) *outSec = (uint8_t)(localSec % 60);
    uint32_t totalMin = (uint32_t)(localSec / 60);
    if (outMin) *outMin = (uint8_t)(totalMin % 60);
    uint32_t totalHours = totalMin / 60;
    if (outHour) *outHour = (uint8_t)(totalHours % 24);

    // Days since Unix epoch (1970-01-01 was Thursday = 4)
    if (outWeekday) {
        uint32_t totalDays = totalHours / 24;
        *outWeekday = (uint8_t)((totalDays + 4) % 7); // 0 = Sun, 1 = Mon ...
    }
    return true;
}

static void evaluateScheduleEntry(const ScheduleEntry* entry, uint8_t curHour, uint8_t curMin, uint8_t curDay) {
    if (!entry->enabled || !scheduleIsDayActive(entry->weekdayMask, curDay)) return;

    if (scheduleIsActionDue(curHour, curMin, entry->onHour, entry->onMin)) {
        relaysSetLoad(entry->relayIndex, RELAY_LOAD_ON);
        if (s_callback) s_callback(entry->index, entry->relayIndex, RELAY_LOAD_ON);
    } else if (scheduleIsActionDue(curHour, curMin, entry->offHour, entry->offMin)) {
        relaysSetLoad(entry->relayIndex, RELAY_LOAD_OFF);
        if (s_callback) s_callback(entry->index, entry->relayIndex, RELAY_LOAD_OFF);
    }
}

static void checkCatchUp(const ScheduleEntry* entry, uint8_t curHour, uint8_t curMin, uint8_t curDay) {
    if (!entry->enabled || entry->catchUpMin == 0 || !scheduleIsDayActive(entry->weekdayMask, curDay)) return;

    if (scheduleShouldCatchUp(curHour, curMin, entry->onHour, entry->onMin, entry->catchUpMin)) {
        relaysSetLoad(entry->relayIndex, RELAY_LOAD_ON);
        if (s_callback) s_callback(entry->index, entry->relayIndex, RELAY_LOAD_ON);
    } else if (scheduleShouldCatchUp(curHour, curMin, entry->offHour, entry->offMin, entry->catchUpMin)) {
        relaysSetLoad(entry->relayIndex, RELAY_LOAD_OFF);
        if (s_callback) s_callback(entry->index, entry->relayIndex, RELAY_LOAD_OFF);
    }
}

void schedulerSyncTime(uint32_t unixTimestamp, int16_t tzOffsetMin) {
    s_baseUnix = unixTimestamp;
    s_syncMillis = millis();
    s_tzOffsetMin = tzOffsetMin;
    s_timeSynced = true;

    // Evaluate catch-up windows on new time synchronization
    uint8_t curH, curM, curS, curDay;
    if (schedulerGetLocalTime(&curH, &curM, &curS, &curDay)) {
        if (isFeatureEnabled(FSWITCH_SCHEDULER)) {
            for (uint8_t i = 0; i < MAX_SCHEDULES; i++) {
                checkCatchUp(&s_schedules[i], curH, curM, curDay);
            }
        }
        s_lastCheckedMinute = (int16_t)curM;
    }
}

void schedulerLoop(void) {
    if (!s_timeSynced || !isFeatureEnabled(FSWITCH_SCHEDULER)) return;

    uint8_t curH, curM, curS, curDay;
    if (!schedulerGetLocalTime(&curH, &curM, &curS, &curDay)) return;

    if (s_lastCheckedMinute != (int16_t)curM) {
        s_lastCheckedMinute = (int16_t)curM;
        for (uint8_t i = 0; i < MAX_SCHEDULES; i++) {
            evaluateScheduleEntry(&s_schedules[i], curH, curM, curDay);
        }
    }
}

bool schedulerGetEntry(uint8_t index, ScheduleEntry* outEntry) {
    if (index >= MAX_SCHEDULES || outEntry == (ScheduleEntry*)0) return false;
    memcpy(outEntry, &s_schedules[index], sizeof(ScheduleEntry));
    return true;
}

uint8_t schedulerSetEntry(const ScheduleEntry* entry) {
    if (entry == (const ScheduleEntry*)0 || entry->index >= MAX_SCHEDULES) {
        return ERR_INVALID_PARAM;
    }
    if (entry->relayIndex >= relaysGetActiveCount()) {
        return ERR_INVALID_PARAM;
    }
    memcpy(&s_schedules[entry->index], entry, sizeof(ScheduleEntry));
    saveScheduleToNvs(entry->index);
    return ERR_OK;
}

uint8_t schedulerDeleteEntry(uint8_t index) {
    if (index >= MAX_SCHEDULES) return ERR_INVALID_PARAM;
    memset(&s_schedules[index], 0, sizeof(ScheduleEntry));
    s_schedules[index].index = index;
    s_schedules[index].onHour = SCHEDULE_NO_ACTION_HOUR;
    s_schedules[index].offHour = SCHEDULE_NO_ACTION_HOUR;
    saveScheduleToNvs(index);
    return ERR_OK;
}

void schedulerClearAll(void) {
    for (uint8_t i = 0; i < MAX_SCHEDULES; i++) {
        schedulerDeleteEntry(i);
    }
}

void schedulerRegisterCallback(ScheduleFiredCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_SCHEDULER

