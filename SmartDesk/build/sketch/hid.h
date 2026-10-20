#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\hid.h"
/**
 * hid.h — PC Unlock keyboard injection subsystem.
 *
 * Purpose : Emulates USB HID keyboard to unlock host PC. Manages auto-type
 *           countdown, obfuscated password storage, test strings, and safety cancels.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h, hid_guard.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : FEATURE_HID
 */

#pragma once

#include "features.h"

#if FEATURE_HID

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"
#include "hid_guard.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t  signInType;        // 0 = password, 1 = PIN
    uint8_t  pressEnter;        // 0 = no enter, 1 = press enter after typing
    uint16_t autoDelaySec;      // 10 to 300 seconds (default 150)
    uint8_t  autoEnabled;       // 0 = off, 1 = on
    uint8_t  usbEnabled;        // 0 = off, 1 = on
    uint8_t  bleEnabled;        // 0 = off, 1 = on
    uint8_t  passwordIsSet;     // 1 if stored in NVS, 0 if not (read-only)
    uint8_t  usbKbDisabled;     // 1 = do not enumerate as USB keyboard on next boot
} HidSettings;

typedef void (*HidStatusCallback)(uint8_t path, uint8_t status);

/**
 * Initialize USB HID keyboard hardware, load settings from NVS.
 */
void hidBegin(void);

/**
 * Periodic loop monitoring USB mount detection and auto-type countdown.
 */
void hidLoop(void);

/**
 * Trigger immediate typing of password or test string.
 * @param path HID_PATH_AUTO, HID_PATH_USB, HID_PATH_BLE, or HID_PATH_TEST
 * @param outStatus Returns HID_STATUS_STARTED, BLOCKED, COMPLETE, etc.
 */
uint8_t hidTypeNow(uint8_t path, uint8_t* outStatus);

/**
 * Cancel active typing countdown or in-progress typing attempt.
 */
uint8_t hidCancel(void);

/**
 * Store user password (write-only, stored obfuscated in NVS).
 */
uint8_t hidSetPassword(const uint8_t* passwordBytes, uint8_t length);

/**
 * Erase stored password from NVS.
 */
void hidErasePassword(void);

/**
 * Read current HID configuration settings.
 */
void hidGetSettings(HidSettings* outSettings);

/**
 * Update HID configuration settings and save to NVS.
 */
uint8_t hidSetSettings(const HidSettings* inSettings);

/**
 * Get remaining auto-type countdown in seconds (0 if inactive).
 */
uint16_t hidGetRemainingCountdown(void);

/**
 * Register status change callback for BLE notifications.
 */
void hidRegisterCallback(HidStatusCallback cb);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_HID

