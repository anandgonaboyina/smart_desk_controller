/**
 * hid_guard.h — Safety guards and audit logging for PC unlock typing.
 *
 * Purpose : Enforces all safety rules preventing unwanted keystroke injection:
 *           master switch check, cooldown, daily rate limits, display client check,
 *           and ring buffer logging in NVS.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h.
 * Used by : hid.cpp, ble_service.cpp.
 * Feature : FEATURE_HID
 */

#pragma once

#include "features.h"

#if FEATURE_HID

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint32_t timestamp;
    uint8_t  path;
    uint8_t  reason;
    uint8_t  success;
} HidLogEntry;

/**
 * Initialize HID safety guards and load state from NVS.
 */
void hidGuardBegin(void);

/**
 * Check if typing is allowed under current safety conditions.
 * @param path Requested typing path (USB, BLE, Test)
 * @param isAuto True if triggered automatically on boot/USB mount
 * @param outBlockedReason Output reason code if typing is blocked
 * @return True if permitted to type, false if blocked
 */
bool hidGuardCanType(uint8_t path, bool isAuto, uint8_t* outBlockedReason);

/**
 * Record a typing attempt in the persistent ring buffer log.
 */
void hidGuardRecordAttempt(uint8_t path, uint8_t reason, bool success);

/**
 * Read a page of log entries (8 entries per page, up to 32 entries total).
 * Returns number of entries written into outEntries buffer.
 */
uint8_t hidGuardGetLogPage(uint8_t page, HidLogEntry* outEntries, uint8_t maxEntries);

/**
 * Notify the guard whether any Display client is currently connected over BLE.
 */
void hidGuardSetDisplayConnected(bool connected);

/**
 * Reset daily attempt counter.
 */
void hidGuardResetDailyCount(void);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_HID

