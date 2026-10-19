/**
 * relay-logic.js — Pure relay logic calculations.
 *
 * Purpose : Conversion between LOAD state, COIL state, and GPIO electrical level.
 *           Min switch interval rate-limiting check and safe off calculations.
 * Depends : Nothing (pure JavaScript).
 * Used by : RelayCard.js, RelaySettingsScreen.js, useRelays.js, demo.js.
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
 *   coil = (wiring === NC) ? !load : load
 *   level = (polarity === ACTIVE_LOW) ? !coil : coil
 */

export const RELAY_POLARITY_ACTIVE_LOW  = 0;
export const RELAY_POLARITY_ACTIVE_HIGH = 1;

export const RELAY_WIRING_NO = 0;
export const RELAY_WIRING_NC = 1;

export const RELAY_LOAD_OFF = 0;
export const RELAY_LOAD_ON  = 1;

export const RELAY_COIL_OFF = 0;
export const RELAY_COIL_ON  = 1;

export const RELAY_LEVEL_LOW  = 0;
export const RELAY_LEVEL_HIGH = 1;

export const BOOT_BEHAVIOR_LAST = 0;
export const BOOT_BEHAVIOR_OFF  = 1;
export const BOOT_BEHAVIOR_ON   = 2;

/**
 * Convert LOAD state to COIL state.
 *
 * Example pairs:
 *   loadToCoil(1, 0) -> 1  (Load ON,  NO contact -> coil ON)
 *   loadToCoil(0, 0) -> 0  (Load OFF, NO contact -> coil OFF)
 *   loadToCoil(1, 1) -> 0  (Load ON,  NC contact -> coil OFF)
 *   loadToCoil(0, 1) -> 1  (Load OFF, NC contact -> coil ON)
 *
 * @param {number} load   - 0 (unpowered) or 1 (powered)
 * @param {number} wiring - 0 (NO) or 1 (NC)
 * @returns {number} coil state (0 or 1)
 */
export function relayLoadToCoil(load, wiring) {
  const isLoad = Boolean(load);
  const isNC = (wiring === RELAY_WIRING_NC);
  return (isNC ? !isLoad : isLoad) ? RELAY_COIL_ON : RELAY_COIL_OFF;
}

/**
 * Convert COIL state to GPIO electrical level.
 *
 * Example pairs:
 *   coilToLevel(1, 0) -> 0  (Coil ON,  Active-LOW  -> GPIO LOW)
 *   coilToLevel(0, 0) -> 1  (Coil OFF, Active-LOW  -> GPIO HIGH)
 *   coilToLevel(1, 1) -> 1  (Coil ON,  Active-HIGH -> GPIO HIGH)
 *   coilToLevel(0, 1) -> 0  (Coil OFF, Active-HIGH -> GPIO LOW)
 *
 * @param {number} coil     - 0 (de-energized) or 1 (energized)
 * @param {number} polarity - 0 (Active-LOW) or 1 (Active-HIGH)
 * @returns {number} GPIO level (0 or 1)
 */
export function relayCoilToLevel(coil, polarity) {
  const isCoil = Boolean(coil);
  const isActiveHigh = (polarity === RELAY_POLARITY_ACTIVE_HIGH);
  return (isActiveHigh ? isCoil : !isCoil) ? RELAY_LEVEL_HIGH : RELAY_LEVEL_LOW;
}

/**
 * Convert LOAD state directly to GPIO electrical level.
 *
 * Example pairs:
 *   loadToLevel(1, 0, 0) -> 0  (ON,  Active-LOW,  NO -> GPIO LOW)
 *   loadToLevel(0, 0, 0) -> 1  (OFF, Active-LOW,  NO -> GPIO HIGH)
 *   loadToLevel(1, 0, 1) -> 1  (ON,  Active-LOW,  NC -> GPIO HIGH)
 *   loadToLevel(0, 0, 1) -> 0  (OFF, Active-LOW,  NC -> GPIO LOW)
 *
 * @param {number} load     - 0 or 1
 * @param {number} polarity - 0 (Active-LOW) or 1 (Active-HIGH)
 * @param {number} wiring   - 0 (NO) or 1 (NC)
 * @returns {number} GPIO level (0 or 1)
 */
export function relayLoadToLevel(load, polarity, wiring) {
  const coil = relayLoadToCoil(load, wiring);
  return relayCoilToLevel(coil, polarity);
}

/**
 * Convert GPIO electrical level back to LOAD state.
 *
 * Example pairs:
 *   levelToLoad(0, 0, 0) -> 1  (GPIO LOW,  Active-LOW,  NO -> Load ON)
 *   levelToLoad(1, 0, 0) -> 0  (GPIO HIGH, Active-LOW,  NO -> Load OFF)
 *
 * @param {number} level    - 0 or 1
 * @param {number} polarity - 0 (Active-LOW) or 1 (Active-HIGH)
 * @param {number} wiring   - 0 (NO) or 1 (NC)
 * @returns {number} load state (0 or 1)
 */
export function relayLevelToLoad(level, polarity, wiring) {
  const isActiveHigh = (polarity === RELAY_POLARITY_ACTIVE_HIGH);
  const isLevelHigh = (level === RELAY_LEVEL_HIGH);
  const coil = (isActiveHigh ? isLevelHigh : !isLevelHigh) ? RELAY_COIL_ON : RELAY_COIL_OFF;

  const isNC = (wiring === RELAY_WIRING_NC);
  const isLoadOn = isNC ? (coil === RELAY_COIL_OFF) : (coil === RELAY_COIL_ON);
  return isLoadOn ? RELAY_LOAD_ON : RELAY_LOAD_OFF;
}

/**
 * Get safe GPIO level to ensure load is completely OFF (unpowered).
 *
 * Example pairs:
 *   getSafeOffLevel(0, 0) -> 1  (Active-LOW,  NO -> GPIO HIGH)
 *   getSafeOffLevel(0, 1) -> 0  (Active-LOW,  NC -> GPIO LOW)
 *   getSafeOffLevel(1, 0) -> 0  (Active-HIGH, NO -> GPIO LOW)
 *   getSafeOffLevel(1, 1) -> 1  (Active-HIGH, NC -> GPIO HIGH)
 *
 * @param {number} polarity - 0 (Active-LOW) or 1 (Active-HIGH)
 * @param {number} wiring   - 0 (NO) or 1 (NC)
 * @returns {number} safe GPIO level
 */
export function relayGetSafeOffLevel(polarity, wiring) {
  return relayLoadToLevel(RELAY_LOAD_OFF, polarity, wiring);
}

/**
 * Check if enough time has passed since last relay switch to prevent rapid-cycling.
 *
 * Example pairs:
 *   canSwitchRelay(5000, 2000, 2000) -> true  (elapsed 3000ms >= 2000ms)
 *   canSwitchRelay(2500, 2000, 2000) -> false (elapsed 500ms  < 2000ms)
 *
 * @param {number} nowMs         - Current timestamp in ms
 * @param {number} lastSwitchMs  - Last switch timestamp in ms
 * @param {number} minIntervalMs - Minimum switch interval in ms
 * @returns {boolean} true if switching is allowed
 */
export function relayCanSwitch(nowMs, lastSwitchMs, minIntervalMs) {
  if (lastSwitchMs === 0) return true;
  const elapsed = Math.max(0, nowMs - lastSwitchMs);
  return elapsed >= minIntervalMs;
}

