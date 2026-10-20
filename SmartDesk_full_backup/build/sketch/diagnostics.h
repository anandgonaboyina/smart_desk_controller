#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\diagnostics.h"
/**
 * diagnostics.h — Hardware self-test suite and diagnostic helpers.
 *
 * Purpose : Comprehensive boot-time and on-demand self-test report with PASS/FAIL/SKIP,
 *           root-cause attribution (HARDWARE vs CODE), and interactive pin/LED testers.
 * Depends : stdint.h, stdbool.h.
 * Used by : main.cpp, ble_service.cpp, reliability.cpp.
 * Feature : Always compiled.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize diagnostics subsystem.
 */
void diagnosticsInit(void);

/**
 * Execute full system self-test and output structured report to Serial and BLE log.
 * Returns true if all critical tests passed.
 */
bool diagnosticsRunSelfTest(void);

/**
 * Interactive relay test helper: pulses relay N for 1s, checks electrical readback.
 * Prints whether the pin state matches expected or indicates a HARDWARE/pin conflict.
 */
void diagnosticsTestRelay(uint8_t index);

/**
 * Interactive LED test helper: sweeps Red, Green, Blue, and White across the 8 WS2812B LEDs.
 */
void diagnosticsTestLeds(void);

/**
 * Print comprehensive system status summary (uptime, heap, BLE clients, relay states).
 */
void diagnosticsPrintStatus(void);

#ifdef __cplusplus
}
#endif

