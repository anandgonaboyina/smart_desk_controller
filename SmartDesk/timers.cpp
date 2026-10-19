/**
 * timers.cpp — Implementation of countdown turn-off timers.
 *
 * Purpose : Per-relay turn-off timers surviving reboots, checkpointing once per minute,
 *           restoring load state on boot, and firing completion events.
 * Depends : timers.h, relays.h, feature_switches.h, Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : FEATURE_TIMERS
 */

#include "features.h"

#if FEATURE_TIMERS

#include "timers.h"
#include "protocol.h"
#include "relays.h"
#include "feature_switches.h"
#include <Arduino.h>
#include <Preferences.h>
#include <stdio.h>
#include <string.h>

static RelayTimer s_timers[MAX_TIMERS];
static uint32_t s_lastTickMs = 0;
static uint32_t s_lastCheckpointMs = 0;
static TimerEventCallback s_callback = (TimerEventCallback)0;
static Preferences s_timerPrefs;

static void checkpointTimerToNvs(uint8_t index) {
    if (index >= MAX_TIMERS) return;
    s_timerPrefs.begin(NVS_NS_TIMER, false);
    char key[8];
    snprintf(key, sizeof(key), "tm%u", index);
    if (s_timers[index].active) {
        s_timerPrefs.putBytes(key, &s_timers[index], sizeof(RelayTimer));
    } else {
        s_timerPrefs.remove(key);
    }
    s_timerPrefs.end();
}

void timersBegin(void) {
    s_timerPrefs.begin(NVS_NS_TIMER, false);
    for (uint8_t i = 0; i < MAX_TIMERS; i++) {
        char key[8];
        snprintf(key, sizeof(key), "tm%u", i);
        size_t len = s_timerPrefs.getBytes(key, &s_timers[i], sizeof(RelayTimer));
        if (len == sizeof(RelayTimer) && s_timers[i].active && s_timers[i].remainingSec > 0) {
            s_timers[i].resumed = true;
            // Restore relay to ON, overriding boot behavior
            relaysForceSetLoad(i, RELAY_LOAD_ON);
        } else {
            memset(&s_timers[i], 0, sizeof(RelayTimer));
            s_timers[i].relayIndex = i;
            s_timerPrefs.remove(key);
        }
    }
    s_timerPrefs.end();
    s_lastTickMs = millis();
    s_lastCheckpointMs = millis();
}

uint8_t timersStart(uint8_t relayIndex, uint16_t durationMinutes) {
    if (relayIndex >= relaysGetActiveCount() || durationMinutes == 0) {
        return ERR_INVALID_PARAM;
    }
    if (!isFeatureEnabled(FSWITCH_TIMERS)) {
        return ERR_FEATURE_DISABLED;
    }

    uint8_t err = relaysSetLoad(relayIndex, RELAY_LOAD_ON);
    if (err != ERR_OK) return err;

    s_timers[relayIndex].relayIndex = relayIndex;
    s_timers[relayIndex].totalSec = (uint32_t)durationMinutes * 60;
    s_timers[relayIndex].remainingSec = s_timers[relayIndex].totalSec;
    s_timers[relayIndex].active = true;
    s_timers[relayIndex].resumed = false;

    checkpointTimerToNvs(relayIndex);
    return ERR_OK;
}

uint8_t timersCancel(uint8_t relayIndex) {
    if (relayIndex >= MAX_TIMERS) return ERR_INVALID_PARAM;
    s_timers[relayIndex].active = false;
    s_timers[relayIndex].remainingSec = 0;
    s_timers[relayIndex].resumed = false;
    checkpointTimerToNvs(relayIndex);
    return ERR_OK;
}

static void handleTimerExpiration(uint8_t i) {
    s_timers[i].active = false;
    s_timers[i].remainingSec = 0;
    checkpointTimerToNvs(i);
    relaysSetLoad(i, RELAY_LOAD_OFF);
    if (s_callback) s_callback(i, true);
}

void timersLoop(void) {
    if (!isFeatureEnabled(FSWITCH_TIMERS)) return;
    uint32_t now = millis();

    // 1-second countdown tick
    if (now - s_lastTickMs >= 1000) {
        s_lastTickMs += 1000;
        for (uint8_t i = 0; i < MAX_TIMERS; i++) {
            if (s_timers[i].active) {
                if (s_timers[i].remainingSec > 0) {
                    s_timers[i].remainingSec--;
                }
                if (s_timers[i].remainingSec == 0) {
                    handleTimerExpiration(i);
                }
            }
        }
    }

    // 60-second checkpoint to minimize NVS flash wear
    if (now - s_lastCheckpointMs >= (TIMER_CHECKPOINT_S * 1000)) {
        s_lastCheckpointMs = now;
        for (uint8_t i = 0; i < MAX_TIMERS; i++) {
            if (s_timers[i].active) {
                checkpointTimerToNvs(i);
            }
        }
    }
}

bool timersGetStatus(uint8_t relayIndex, RelayTimer* outTimer) {
    if (relayIndex >= MAX_TIMERS || outTimer == (RelayTimer*)0) return false;
    memcpy(outTimer, &s_timers[relayIndex], sizeof(RelayTimer));
    return true;
}

void timersClearAll(void) {
    for (uint8_t i = 0; i < MAX_TIMERS; i++) {
        timersCancel(i);
    }
}

void timersRegisterCallback(TimerEventCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_TIMERS

