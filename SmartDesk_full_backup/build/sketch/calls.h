#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\calls.h"
/**
 * calls.h — Call Mode subsystem.
 *
 * Purpose : Tracks "On a call" status with optional auto-off timer.
 *           Notifies LED subsystem to display busy color at priority 4,
 *           and signals PWA to show busy caption and mute audio.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h.
 * Used by : main.cpp, ble_service.cpp, leds.cpp.
 * Feature : FEATURE_CALLMODE
 */

#pragma once

#include "features.h"

#if FEATURE_CALLMODE

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*CallModeCallback)(bool isActive);

/**
 * Initialize Call mode subsystem, load saved settings from NVS.
 */
void callsBegin(void);

/**
 * Periodic tick called from main loop to handle auto-off timer.
 */
void callsLoop(void);

/**
 * Toggle or set call mode state directly.
 */
uint8_t callsSet(bool active);

/**
 * Configure auto-off duration in minutes (0 = manual off only).
 */
uint8_t callsSetAutoOffMin(uint8_t minutes);

/**
 * Check if currently on a call.
 */
bool callsIsActive(void);

/**
 * Get configured auto-off duration in minutes.
 */
uint8_t callsGetAutoOffMin(void);

/**
 * Register state change notification callback for BLE clients.
 */
void callsRegisterCallback(CallModeCallback cb);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_CALLMODE

