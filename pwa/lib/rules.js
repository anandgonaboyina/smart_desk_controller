/**
 * rules.js — Declarative reactive rules configuration.
 *
 * Purpose : Map desk events (relays, timers, Away mode, calls, BLE status)
 *           to robot face expressions, synthesized sound effects, and captions.
 * Depends : Nothing (pure data configuration).
 * Used by : useFace.js, useAudio.js.
 */

export const RULES = [
  {
    id: 'relay_on',
    event: 'RELAY_TOGGLED',
    condition: (payload) => payload.load === 1,
    face: 'HAPPY',
    sound: 'relay_click',
    caption: '${name} powered ON',
    captionDurationMs: 3000,
    priority: 1,
    cooldownMs: 200,
  },
  {
    id: 'relay_off',
    event: 'RELAY_TOGGLED',
    condition: (payload) => payload.load === 0,
    face: 'NEUTRAL',
    sound: 'relay_click',
    caption: '${name} powered OFF',
    captionDurationMs: 3000,
    priority: 1,
    cooldownMs: 200,
  },
  {
    id: 'timer_done',
    event: 'TIMER_DONE',
    face: 'HAPPY',
    sound: 'timer_done',
    caption: 'Timer finished for ${name}',
    captionDurationMs: 4000,
    priority: 3,
    cooldownMs: 1000,
  },
  {
    id: 'away_countdown',
    event: 'AWAY_COUNTDOWN',
    face: 'AWAY',
    sound: null,
    caption: 'Leaving desk? Away mode in ${remaining}s',
    captionDurationMs: 2000,
    priority: 2,
    cooldownMs: 800,
  },
  {
    id: 'away_active',
    event: 'AWAY_ACTIVE',
    face: 'AWAY',
    sound: 'away_enter',
    caption: 'Away mode active — all loads secured',
    captionDurationMs: 4000,
    priority: 4,
    cooldownMs: 2000,
  },
  {
    id: 'call_on',
    event: 'CALL_ON',
    face: 'BUSY',
    sound: 'call_start',
    caption: 'Deep focus — Call active',
    captionDurationMs: 4000,
    priority: 5,
    cooldownMs: 1000,
  },
  {
    id: 'call_off',
    event: 'CALL_OFF',
    face: 'NEUTRAL',
    sound: null,
    caption: 'Call ended — normal mode restored',
    captionDurationMs: 2500,
    priority: 2,
    cooldownMs: 1000,
  },
  {
    id: 'pc_unlocked',
    event: 'PC_UNLOCKED',
    face: 'HAPPY',
    sound: 'unlock_success',
    caption: 'PC unlocked — welcome back!',
    captionDurationMs: 3500,
    priority: 3,
    cooldownMs: 2000,
  },
  {
    id: 'ble_connected',
    event: 'BLE_CONNECTED',
    face: 'HAPPY',
    sound: 'unlock_success',
    caption: 'SmartDesk connected',
    captionDurationMs: 3000,
    priority: 2,
    cooldownMs: 1000,
  },
  {
    id: 'ble_lost',
    event: 'BLE_LOST',
    face: 'SLEEPY',
    sound: 'error_buzz',
    caption: 'Connection lost — searching...',
    captionDurationMs: 4000,
    priority: 3,
    cooldownMs: 2000,
  },
];

export default RULES;
