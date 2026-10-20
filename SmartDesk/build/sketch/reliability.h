#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\reliability.h"
/**
 * reliability.h — System reliability, watchdog, and physical button supervisor.
 *
 * Purpose : Monitors task watchdog, logs brownouts/reset reasons to NVS, executes
 *           optional daily reboot, supervises GPIO10 status LED, and handles the
 *           physical GPIO9 button (short press, double press, 10s hold reset).
 * Depends : stdint.h, stdbool.h, pins.h, config.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : FEATURE_RELIABILITY
 */

#pragma once

#include "features.h"

#if FEATURE_RELIABILITY

#include <stdint.h>
#include <stdbool.h>
#include "pins.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize reliability supervisor: records reset reason, enables watchdog,
 * configures button pin and status LED.
 */
void reliabilityBegin(void);

/**
 * Periodic loop monitoring button presses, daily reboot hour, and feeding watchdog.
 */
void reliabilityLoop(void);

/**
 * Get device uptime in seconds since boot.
 */
uint32_t reliabilityGetUptimeSec(void);

/**
 * Get the recorded reset reason of the previous boot.
 */
uint8_t reliabilityGetLastResetReason(void);

/**
 * Get current free heap memory in bytes.
 */
uint32_t reliabilityGetFreeHeap(void);

/**
 * Set status LED state (active HIGH on GPIO10).
 */
void reliabilitySetStatusLed(bool on);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_RELIABILITY

