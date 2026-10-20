#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_logic.h"
/**
 * relay_logic.h — Pure relay logic calculation.
 *
 * Purpose : Conversion between LOAD state, COIL state, and GPIO electrical level.
 *           Min switch interval rate-limiting check.
 * Depends : stdint.h, stdbool.h (pure logic, no Arduino/hardware dependencies).
 * Used by : relays.cpp, relay_driver_gpio.cpp, relay_driver_595.cpp.
 * Feature : Always compiled (Relay control is core).
 *
 * LOAD STATE:
 *   1 = Appliance powered (ON)
 *   0 = Appliance unpowered (OFF)
 *
 * CONTACT WIRING:
 *   0 = NO (Normally Open)  — coil energized closes contact (load powered)
 *   1 = NC (Normally Closed) — coil energized opens contact (load unpowered)
 *
 * INPUT POLARITY:
 *   0 = Active-LOW  (ESP32 GPIO LOW activates optocoupler / energizes coil)
 *   1 = Active-HIGH (ESP32 GPIO HIGH activates optocoupler / energizes coil)
 *
 * CONVERSION FORMULA:
 *   coil = (wiring == NC) ? !load : load
 *   level = (polarity == ACTIVE_LOW) ? !coil : coil
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define RELAY_POLARITY_ACTIVE_LOW   0
#define RELAY_POLARITY_ACTIVE_HIGH  1

#define RELAY_WIRING_NO             0
#define RELAY_WIRING_NC             1

#define RELAY_LOAD_OFF              0
#define RELAY_LOAD_ON               1

#define RELAY_COIL_OFF              0
#define RELAY_COIL_ON               1

#define RELAY_LEVEL_LOW             0
#define RELAY_LEVEL_HIGH            1

/**
 * Convert LOAD state to COIL state.
 * Example pairs:
 *   loadToCoil(ON, NO)  -> COIL_ON (1)
 *   loadToCoil(OFF, NO) -> COIL_OFF (0)
 *   loadToCoil(ON, NC)  -> COIL_OFF (0)
 *   loadToCoil(OFF, NC) -> COIL_ON (1)
 */
uint8_t relayLoadToCoil(uint8_t load, uint8_t wiring);

/**
 * Convert COIL state to GPIO electrical level.
 * Example pairs:
 *   coilToLevel(COIL_ON, ACTIVE_LOW)   -> LEVEL_LOW (0)
 *   coilToLevel(COIL_OFF, ACTIVE_LOW)  -> LEVEL_HIGH (1)
 *   coilToLevel(COIL_ON, ACTIVE_HIGH)  -> LEVEL_HIGH (1)
 *   coilToLevel(COIL_OFF, ACTIVE_HIGH) -> LEVEL_LOW (0)
 */
uint8_t relayCoilToLevel(uint8_t coil, uint8_t polarity);

/**
 * Convert LOAD state directly to GPIO electrical level.
 * Example pairs:
 *   loadToLevel(ON, ACTIVE_LOW, NO)  -> LEVEL_LOW (0)
 *   loadToLevel(OFF, ACTIVE_LOW, NO) -> LEVEL_HIGH (1)
 *   loadToLevel(ON, ACTIVE_LOW, NC)  -> LEVEL_HIGH (1)
 *   loadToLevel(OFF, ACTIVE_LOW, NC) -> LEVEL_LOW (0)
 */
uint8_t relayLoadToLevel(uint8_t load, uint8_t polarity, uint8_t wiring);

/**
 * Convert GPIO electrical level back to LOAD state.
 * Useful when reading pin state back to user terms.
 * Example pairs:
 *   levelToLoad(LEVEL_LOW, ACTIVE_LOW, NO)  -> ON (1)
 *   levelToLoad(LEVEL_HIGH, ACTIVE_LOW, NO) -> OFF (0)
 */
uint8_t relayLevelToLoad(uint8_t level, uint8_t polarity, uint8_t wiring);

/**
 * Get safe GPIO level to ensure load is completely OFF (unpowered).
 * Used at boot time before applying any stored states.
 * Example:
 *   getSafeOffLevel(ACTIVE_LOW, NO) -> LEVEL_HIGH (1)
 *   getSafeOffLevel(ACTIVE_LOW, NC) -> LEVEL_LOW (0)
 */
uint8_t relayGetSafeOffLevel(uint8_t polarity, uint8_t wiring);

/**
 * Check if enough time has passed since last relay switch to prevent rapid-cycling.
 * Handles millis rollover safely.
 * Example:
 *   canSwitchRelay(5000, 2000, 2000) -> true (diff 3000 >= 2000)
 *   canSwitchRelay(2500, 2000, 2000) -> false (diff 500 < 2000)
 */
bool relayCanSwitch(uint32_t nowMs, uint32_t lastSwitchMs, uint16_t minIntervalMs);

#ifdef __cplusplus
}
#endif

