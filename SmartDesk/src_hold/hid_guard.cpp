/**
 * hid_guard.cpp — Implementation of PC unlock safety guards and audit logging.
 *
 * Purpose : Evaluates auto-type permissions, prevents unauthorized keystroke entry,
 *           tracks cooldowns and daily limits, and persists attempt logs to NVS.
 * Depends : hid_guard.h, feature_switches.h, Preferences.h, Arduino.h.
 * Used by : hid.cpp.
 * Feature : FEATURE_HID
 */

#include "features.h"

#if FEATURE_HID

#include "hid_guard.h"
#include "feature_switches.h"
#include <Arduino.h>
#include <Preferences.h>
#include <string.h>

static uint32_t s_lastAutoAttemptMs = 0;
static uint8_t  s_dailyAutoCount = 0;
static uint32_t s_lastDailyResetMs = 0;
static bool     s_displayConnected = false;

static HidLogEntry s_log[HID_LOG_MAX_ENTRIES];
static uint8_t     s_logHead = 0;
static uint8_t     s_logCount = 0;
static Preferences s_hidPrefs;

void hidGuardBegin(void) {
    s_hidPrefs.begin(NVS_NS_HID, true);
    s_dailyAutoCount = s_hidPrefs.getUChar("dailyCnt", 0);
    s_logHead = s_hidPrefs.getUChar("logHead", 0);
    s_logCount = s_hidPrefs.getUChar("logCnt", 0);
    s_hidPrefs.getBytes("log", s_log, sizeof(s_log));
    s_hidPrefs.end();

    s_lastDailyResetMs = millis();
}

void hidGuardSetDisplayConnected(bool connected) {
    s_displayConnected = connected;
}

void hidGuardResetDailyCount(void) {
    s_dailyAutoCount = 0;
    s_hidPrefs.begin(NVS_NS_HID, false);
    s_hidPrefs.putUChar("dailyCnt", 0);
    s_hidPrefs.end();
}

static void checkDailyRollover(uint32_t now) {
    if (now - s_lastDailyResetMs >= (24UL * 3600UL * 1000UL)) {
        s_lastDailyResetMs = now;
        hidGuardResetDailyCount();
    }
}

bool hidGuardCanType(uint8_t path, bool isAuto, uint8_t* outBlockedReason) {
    // 1. Master switch check: overrides ALL paths
    if (!isFeatureEnabled(FSWITCH_PC_UNLOCK)) {
        if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_OFF;
        return false;
    }

    // Path enabled checks
    if (path == HID_PATH_USB && !isFeatureEnabled(FSWITCH_USB_TYPING)) {
        if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_OFF;
        return false;
    }
#if FEATURE_BLE_HID
    if (path == HID_PATH_BLE && !isFeatureEnabled(FSWITCH_BLE_HID)) {
        if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_OFF;
        return false;
    }
#endif

    // Automatic triggers must pass additional restrictions
    if (isAuto) {
        if (!isFeatureEnabled(FSWITCH_AUTO_TYPE)) {
            if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_OFF;
            return false;
        }

        // Skip if user is already logged in (laptop Display client is connected)
        if (s_displayConnected) {
            if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_DISP;
            return false;
        }

        uint32_t now = millis();
        checkDailyRollover(now);

        // 5-minute cooldown between auto-types
        if (s_lastAutoAttemptMs != 0 && (now - s_lastAutoAttemptMs < (HID_COOLDOWN_S * 1000UL))) {
            if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_COOL;
            return false;
        }

        // Daily automatic attempt limit
        if (s_dailyAutoCount >= HID_MAX_AUTO_PER_DAY) {
            if (outBlockedReason) *outBlockedReason = HID_REASON_BLOCKED_MAX;
            return false;
        }
    }

    return true;
}

void hidGuardRecordAttempt(uint8_t path, uint8_t reason, bool success) {
    uint32_t nowSec = millis() / 1000;
    if (reason == HID_REASON_AUTO_BOOT || reason == HID_REASON_AUTO_USB) {
        s_lastAutoAttemptMs = millis();
        s_dailyAutoCount++;
        s_hidPrefs.begin(NVS_NS_HID, false);
        s_hidPrefs.putUChar("dailyCnt", s_dailyAutoCount);
        s_hidPrefs.end();
    }

    s_log[s_logHead].timestamp = nowSec;
    s_log[s_logHead].path = path;
    s_log[s_logHead].reason = reason;
    s_log[s_logHead].success = success ? 1 : 0;

    s_logHead = (s_logHead + 1) % HID_LOG_MAX_ENTRIES;
    if (s_logCount < HID_LOG_MAX_ENTRIES) s_logCount++;

    s_hidPrefs.begin(NVS_NS_HID, false);
    s_hidPrefs.putUChar("logHead", s_logHead);
    s_hidPrefs.putUChar("logCnt", s_logCount);
    s_hidPrefs.putBytes("log", s_log, sizeof(s_log));
    s_hidPrefs.end();
}

uint8_t hidGuardGetLogPage(uint8_t page, HidLogEntry* outEntries, uint8_t maxEntries) {
    if (outEntries == (HidLogEntry*)0 || maxEntries == 0) return 0;
    uint8_t startIdx = page * HID_LOG_ENTRIES_PER_PAGE;
    if (startIdx >= s_logCount) return 0;

    uint8_t available = s_logCount - startIdx;
    uint8_t count = (available < maxEntries) ? available : maxEntries;
    if (count > HID_LOG_ENTRIES_PER_PAGE) count = HID_LOG_ENTRIES_PER_PAGE;

    for (uint8_t i = 0; i < count; i++) {
        // Read backwards from most recent entry
        uint8_t entryIdx = (s_logHead + HID_LOG_MAX_ENTRIES - 1 - (startIdx + i)) % HID_LOG_MAX_ENTRIES;
        outEntries[i] = s_log[entryIdx];
    }
    return count;
}

#endif // FEATURE_HID

