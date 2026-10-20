#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\ble_service.h"
/**
 * ble_service.h — BLE GATT Peripheral Service subsystem.
 *
 * Purpose : Implements custom GATT service (25 characteristics), supports 2 concurrent
 *           PWA clients (Display + Remote), manages passkey pairing (123456), handles
 *           last-write-wins state synchronization, and broadcasts state notifications.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h.
 * Used by : main.cpp, relays.cpp, leds.cpp, timers.cpp, away.cpp, calls.cpp, hid.cpp.
 * Feature : Always compiled (Core connectivity).
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize NimBLE peripheral stack, build GATT tree, and start advertising.
 */
void bleBegin(void);

/**
 * Periodic tick called from main loop to flush queued notifications or handle timeouts.
 */
void bleLoop(void);

/**
 * Restart BLE advertising (called on disconnect or admin command).
 */
void bleRestartAdvertising(void);

/**
 * Disconnect all currently connected clients.
 */
void bleDisconnectAll(void);

/**
 * Get number of currently connected BLE clients (0, 1, or 2).
 */
uint8_t bleGetConnectedCount(void);

/**
 * Notification broadcasts to all connected clients.
 */
void bleNotifyRelayState(void);
void bleNotifyRelayConfig(uint8_t relayIndex);
void bleNotifyFeatureSwitches(void);
void bleNotifyTimer(uint8_t relayIndex);
void bleNotifyAway(void);
void bleNotifyLedState(void);
void bleNotifyCallMode(void);
void bleNotifyDeviceStatus(void);
void bleNotifyDeviceLog(const char* line);

#ifdef __cplusplus
}
#endif

