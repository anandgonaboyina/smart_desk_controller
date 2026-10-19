/**
 * away.cpp — Implementation of Away Mode subsystem.
 *
 * Purpose : Executes Away mode state machine, turns off affected relays,
 *           locks relays while away, and restores states on return.
 * Depends : away.h, relays.h, feature_switches.h, Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp, relays.cpp.
 * Feature : FEATURE_AWAY
 */

#include "features.h"

#if FEATURE_AWAY

#include "away.h"
#include "relays.h"
#include "feature_switches.h"
#include <Arduino.h>
#include <Preferences.h>
#include <string.h>

static uint8_t  s_state = AWAY_STATE_OFF;
static uint16_t s_delaySec = DEFAULT_AWAY_DELAY_S;
static uint16_t s_maxDurMin = DEFAULT_AWAY_MAX_MIN;
static uint32_t s_delayStartMs = 0;
static uint32_t s_activeStartMs = 0;
static uint8_t  s_savedRelayStates[RELAY_MAX];
static AwayStateCallback s_callback = (AwayStateCallback)0;
static Preferences s_awayPrefs;

static void saveAwayStateNvs(void) {
    s_awayPrefs.begin(NVS_NS_AWAY, false);
    s_awayPrefs.putUChar("state", s_state);
    s_awayPrefs.putUShort("delay", s_delaySec);
    s_awayPrefs.putUShort("maxDur", s_maxDurMin);
    s_awayPrefs.putBytes("saved", s_savedRelayStates, sizeof(s_savedRelayStates));
    s_awayPrefs.end();
}

void awayBegin(void) {
    s_awayPrefs.begin(NVS_NS_AWAY, true);
    s_state = s_awayPrefs.getUChar("state", AWAY_STATE_OFF);
    s_delaySec = s_awayPrefs.getUShort("delay", DEFAULT_AWAY_DELAY_S);
    s_maxDurMin = s_awayPrefs.getUShort("maxDur", DEFAULT_AWAY_MAX_MIN);
    s_awayPrefs.getBytes("saved", s_savedRelayStates, sizeof(s_savedRelayStates));
    s_awayPrefs.end();

    // If rebooted while in DELAYING mode, promote to ACTIVE directly for safety
    if (s_state == AWAY_STATE_DELAYING) {
        s_state = AWAY_STATE_ACTIVE;
    }
    s_activeStartMs = millis();
}

uint8_t awayActivate(void) {
    if (!isFeatureEnabled(FSWITCH_AWAY_MODE)) return ERR_FEATURE_DISABLED;
    if (s_state != AWAY_STATE_OFF) return ERR_BUSY;

    // Save current relay states before starting delay
    relaysGetAllLoad(s_savedRelayStates, RELAY_MAX);
    s_state = AWAY_STATE_DELAYING;
    s_delayStartMs = millis();
    saveAwayStateNvs();

    if (s_callback) s_callback(s_state);
    return ERR_OK;
}

static void transitionToActive(void) {
    s_state = AWAY_STATE_ACTIVE;
    s_activeStartMs = millis();
    uint8_t count = relaysGetActiveCount();
    for (uint8_t i = 0; i < count; i++) {
        RelayConfig cfg;
        if (relaysGetConfig(i, &cfg) && cfg.affectedByAway) {
            relaysForceSetLoad(i, RELAY_LOAD_OFF);
        }
    }
    saveAwayStateNvs();
    if (s_callback) s_callback(s_state);
}

void awayLoop(void) {
    if (!isFeatureEnabled(FSWITCH_AWAY_MODE)) return;
    uint32_t now = millis();

    if (s_state == AWAY_STATE_DELAYING) {
        if (now - s_delayStartMs >= ((uint32_t)s_delaySec * 1000)) {
            transitionToActive();
        }
    } else if (s_state == AWAY_STATE_ACTIVE && s_maxDurMin > 0) {
        if (now - s_activeStartMs >= ((uint32_t)s_maxDurMin * 60000)) {
            awayEnd(0); // Max duration expired, keep off
        }
    }
}

uint8_t awayCancel(void) {
    if (s_state == AWAY_STATE_OFF) return ERR_OK;
    s_state = AWAY_STATE_OFF;
    saveAwayStateNvs();
    if (s_callback) s_callback(s_state);
    return ERR_OK;
}

uint8_t awayEnd(uint8_t restorePrevious) {
    if (s_state == AWAY_STATE_OFF) return ERR_OK;
    s_state = AWAY_STATE_OFF;
    saveAwayStateNvs();

    if (restorePrevious) {
        uint8_t count = relaysGetActiveCount();
        for (uint8_t i = 0; i < count; i++) {
            RelayConfig cfg;
            if (relaysGetConfig(i, &cfg) && cfg.affectedByAway) {
                relaysForceSetLoad(i, s_savedRelayStates[i]);
            }
        }
    }
    if (s_callback) s_callback(s_state);
    return ERR_OK;
}

uint8_t awaySetSettings(uint16_t delaySec, uint16_t maxDurationMin) {
    s_delaySec = delaySec;
    s_maxDurMin = maxDurationMin;
    saveAwayStateNvs();
    return ERR_OK;
}

uint8_t awayGetState(void) {
    return s_state;
}

bool awayIsRelayLocked(uint8_t relayIndex) {
    if (s_state != AWAY_STATE_ACTIVE) return false;
    RelayConfig cfg;
    if (relaysGetConfig(relayIndex, &cfg)) {
        return (cfg.affectedByAway != 0);
    }
    return false;
}

void awayGetStatus(uint8_t* outState, uint16_t* outDelaySec, uint16_t* outMaxDurMin,
                   uint16_t* outRemainingDelay, uint16_t* outElapsedMin) {
    if (outState) *outState = s_state;
    if (outDelaySec) *outDelaySec = s_delaySec;
    if (outMaxDurMin) *outMaxDurMin = s_maxDurMin;

    uint32_t now = millis();
    if (outRemainingDelay) {
        if (s_state == AWAY_STATE_DELAYING) {
            uint32_t elapsed = (now - s_delayStartMs) / 1000;
            *outRemainingDelay = (elapsed < s_delaySec) ? (s_delaySec - elapsed) : 0;
        } else {
            *outRemainingDelay = 0;
        }
    }

    if (outElapsedMin) {
        if (s_state == AWAY_STATE_ACTIVE) {
            *outElapsedMin = (uint16_t)((now - s_activeStartMs) / 60000);
        } else {
            *outElapsedMin = 0;
        }
    }
}

void awayRegisterCallback(AwayStateCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_AWAY

