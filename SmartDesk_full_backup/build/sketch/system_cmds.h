#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\system_cmds.h"
/**
 * system_cmds.h — System control commands executor.
 *
 * Purpose : Executes administrative system commands sent over BLE:
 *           reboot, BLE restart, separate soft resets, factory reset with "RESET"
 *           magic string confirmation, and emergency all-off / safe-state.
 * Depends : stdint.h, protocol.h.
 * Used by : ble_service.cpp, main.cpp.
 * Feature : Always compiled (Core system control).
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Execute a received system command payload.
 * @param cmdId Command ID (SYSCMD_*)
 * @param payload Additional payload bytes (e.g. "RESET" confirmation)
 * @param payloadLen Length of additional payload
 * @return Error code (ERR_OK, ERR_CONFIRM_REQUIRED, etc.)
 */
uint8_t systemCmdsExecute(uint8_t cmdId, const uint8_t* payload, uint8_t payloadLen);

/**
 * Perform a scheduled software reboot.
 * Allows time for final BLE notification packet to be flushed.
 */
void systemCmdsScheduleReboot(uint16_t delayMs);

/**
 * Periodic tick checking for scheduled reboots.
 */
void systemCmdsLoop(void);

#ifdef __cplusplus
}
#endif

