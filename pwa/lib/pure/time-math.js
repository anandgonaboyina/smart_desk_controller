/**
 * time-math.js — Pure time and duration calculations.
 *
 * Purpose : Unix timestamp formatting, timezone offsets, minute-of-day conversions,
 *           duration string formatting, and window containment checks.
 * Depends : Nothing (pure JavaScript).
 * Used by : SchedulesScreen.js, useBle.js, useRelays.js, demo.js.
 */

/**
 * Get Unix timestamp in seconds for a given date (defaults to now).
 *
 * Example:
 *   getUnixTimestampSec(new Date('2026-01-01T00:00:00Z')) -> 1767225600
 *
 * @param {Date} [date]
 * @returns {number} Unix epoch in seconds
 */
export function getUnixTimestampSec(date = new Date()) {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Get timezone offset in minutes with standard sign (+ for East of UTC, - for West).
 * Note: JavaScript's Date.getTimezoneOffset() returns UTC - local (negative for East),
 * so we negate it to match standard protocol conventions (+330 for IST, -300 for EST).
 *
 * Example:
 *   getTimezoneOffsetMinutes() in IST -> 330
 *
 * @param {Date} [date]
 * @returns {number} Timezone offset in minutes
 */
export function getTimezoneOffsetMinutes(date = new Date()) {
  return -date.getTimezoneOffset();
}

/**
 * Convert minutes since midnight (0..1439) to HH:MM format.
 *
 * Example pairs:
 *   minutesToTimeString(0)    -> "00:00"
 *   minutesToTimeString(570)  -> "09:30"
 *   minutesToTimeString(1439) -> "23:59"
 *
 * @param {number} totalMinutes - 0..1439
 * @returns {string} "HH:MM"
 */
export function minutesToTimeString(totalMinutes) {
  if (totalMinutes < 0 || totalMinutes >= 1440 || isNaN(totalMinutes)) return '--:--';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Convert HH:MM string to minutes since midnight.
 *
 * Example pairs:
 *   timeStringToMinutes("09:30") -> 570
 *   timeStringToMinutes("00:00") -> 0
 *   timeStringToMinutes("23:59") -> 1439
 *
 * @param {string} timeStr - "HH:MM"
 * @returns {number} minutes (0..1439), or -1 if invalid
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const parts = timeStr.split(':');
  if (parts.length < 2) return -1;
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return -1;
  }
  return hours * 60 + mins;
}

/**
 * Format seconds into mm:ss countdown format.
 *
 * Example pairs:
 *   formatCountdownSec(65)  -> "01:05"
 *   formatCountdownSec(300) -> "05:00"
 *
 * @param {number} seconds
 * @returns {string} "MM:SS"
 */
export function formatCountdownSec(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format duration in minutes into a human-readable string.
 *
 * Example pairs:
 *   formatDurationMin(45)  -> "45m"
 *   formatDurationMin(90)  -> "1h 30m"
 *   formatDurationMin(120) -> "2h"
 *
 * @param {number} minutes
 * @returns {string} Human readable duration
 */
export function formatDurationMin(minutes) {
  const m = Math.max(0, Math.floor(minutes || 0));
  const hours = Math.floor(m / 60);
  const rem = m % 60;
  if (hours === 0) return `${rem}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

/**
 * Check if a minute is inside an [onMin, offMin] active window.
 * Supports overnight windows where onMin > offMin (e.g. 22:00 to 06:00).
 *
 * Example pairs:
 *   isMinuteInWindow(600, 540, 1020) -> true  (cur 10:00 in 09:00..17:00)
 *   isMinuteInWindow(400, 540, 1020) -> false (cur 06:40 outside 09:00..17:00)
 *   isMinuteInWindow(1400, 1320, 360) -> true  (cur 23:20 in 22:00..06:00 overnight)
 *   isMinuteInWindow(100, 1320, 360)  -> true  (cur 01:40 in 22:00..06:00 overnight)
 *   isMinuteInWindow(500, 1320, 360)  -> false (cur 08:20 outside 22:00..06:00 overnight)
 *
 * @param {number} curMin - Current minute (0..1439)
 * @param {number} onMin  - Turn on minute (0..1439)
 * @param {number} offMin - Turn off minute (0..1439)
 * @returns {boolean} true if inside window
 */
export function isMinuteInWindow(curMin, onMin, offMin) {
  if (onMin === offMin) return false;
  if (onMin < offMin) {
    return curMin >= onMin && curMin < offMin;
  }
  // Overnight window: onMin > offMin
  return curMin >= onMin || curMin < offMin;
}

