/**
 * schedule-format.js — Pure schedule formatting and weekday mask manipulation.
 *
 * Purpose : Format weekday masks into human-readable strings, toggle day bits,
 *           and format schedule summaries.
 * Depends : Nothing (pure JavaScript).
 * Used by : SchedulesScreen.js, useBle.js.
 */

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const MASK_ALL_DAYS  = 0x7F; // 1111111 (Sun-Sat)
export const MASK_WEEKDAYS  = 0x3E; // 0111110 (Mon-Fri)
export const MASK_WEEKENDS  = 0x41; // 1000001 (Sun + Sat)

/**
 * Check if a day of the week is active in the mask.
 * Day index: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 *
 * Example pairs:
 *   isDayInMask(0x7F, 3) -> true  (All days)
 *   isDayInMask(0x3E, 0) -> false (Mon-Fri; Sun is 0)
 *   isDayInMask(0x3E, 1) -> true  (Mon-Fri; Mon is 1)
 *
 * @param {number} mask     - Weekday bitmask (0..127)
 * @param {number} dayIndex - 0..6
 * @returns {boolean} true if bit is set
 */
export function isDayInMask(mask, dayIndex) {
  if (dayIndex < 0 || dayIndex > 6) return false;
  return Boolean(mask & (1 << dayIndex));
}

/**
 * Toggle a specific day bit in a weekday mask.
 *
 * @param {number} mask     - Weekday bitmask (0..127)
 * @param {number} dayIndex - 0..6
 * @returns {number} New mask with bit toggled
 */
export function toggleDayInMask(mask, dayIndex) {
  if (dayIndex < 0 || dayIndex > 6) return mask;
  return (mask ^ (1 << dayIndex)) & 0x7F;
}

/**
 * Format a weekday mask into a readable label.
 *
 * Example pairs:
 *   formatWeekdayMask(0x7F) -> "Every day"
 *   formatWeekdayMask(0x3E) -> "Weekdays (Mon-Fri)"
 *   formatWeekdayMask(0x41) -> "Weekends"
 *   formatWeekdayMask(0x00) -> "Never"
 *   formatWeekdayMask(0x2A) -> "Mon, Wed, Fri"
 *
 * @param {number} mask - Weekday bitmask
 * @returns {string} Human-readable summary
 */
export function formatWeekdayMask(mask) {
  const cleanMask = mask & 0x7F;
  if (cleanMask === 0) return 'Never';
  if (cleanMask === MASK_ALL_DAYS) return 'Every day';
  if (cleanMask === MASK_WEEKDAYS) return 'Weekdays (Mon-Fri)';
  if (cleanMask === MASK_WEEKENDS) return 'Weekends';

  const activeDays = [];
  // Custom display order: Mon..Sun (1..6, then 0)
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];
  for (const day of displayOrder) {
    if (isDayInMask(cleanMask, day)) {
      activeDays.push(DAY_NAMES_SHORT[day]);
    }
  }

  return activeDays.join(', ');
}

/**
 * Format a 24-hour time into HH:MM.
 *
 * @param {number} hour   - 0..23
 * @param {number} minute - 0..59
 * @returns {string} "HH:MM"
 */
export function formatTime(hour, minute) {
  if (hour === 0xFF || hour === undefined || hour === null) return '--:--';
  return `${String(hour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`;
}

/**
 * Generate a complete summary line for a schedule entry.
 *
 * Example:
 *   formatScheduleSummary({ onHour: 9, onMin: 0, offHour: 17, offMin: 0, weekdayMask: 0x3E }, "Desk Lamp")
 *   -> "Desk Lamp: ON 09:00, OFF 17:00 (Weekdays (Mon-Fri))"
 *
 * @param {object} schedule  - Schedule entry object
 * @param {string} relayName - Name of the relay
 * @returns {string} Summary string
 */
export function formatScheduleSummary(schedule, relayName = 'Relay') {
  if (!schedule) return 'No schedule';
  const onStr = schedule.onHour !== 0xFF ? `ON ${formatTime(schedule.onHour, schedule.onMin)}` : '';
  const offStr = schedule.offHour !== 0xFF ? `OFF ${formatTime(schedule.offHour, schedule.offMin)}` : '';
  const times = [onStr, offStr].filter(Boolean).join(', ');
  const days = formatWeekdayMask(schedule.weekdayMask);

  return `${relayName}: ${times || 'No action'} (${days})`;
}
