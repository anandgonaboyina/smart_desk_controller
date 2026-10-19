/**
 * useFeatures.js — React hook for runtime feature switches.
 *
 * Purpose : Subscribes to feature switch state notifications, provides
 *           convenience checks for feature availability, and dispatches updates.
 * Depends : React, bus.js, ble.js.
 * Used by : FeaturesScreen.js, FeatureToggle.js, UnlockScreen.js.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';

export const FEATURE_NAMES = [
  { index: 0, id: 'PC_UNLOCK', label: 'PC Unlock (Master)', desc: 'Master switch for all auto-typing & credentials' },
  { index: 1, id: 'USB_TYPING', label: 'USB Keyboard Typing', desc: 'Hardware keystroke injection via USB OTG' },
  { index: 2, id: 'BLE_HID', label: 'BLE Keyboard HID', desc: 'Wireless keyboard path' },
  { index: 3, id: 'AUTO_TYPE', label: 'Auto-Type on Boot', desc: 'Automatically type password on laptop boot' },
  { index: 4, id: 'SCHEDULER', label: 'Relay Scheduler', desc: 'Automatic time-of-day scheduled actions' },
  { index: 5, id: 'TIMERS', label: 'Relay Timers', desc: 'Countdown shutoff timers' },
  { index: 6, id: 'AWAY_MODE', label: 'Away Mode', desc: 'One-touch desk lockdown and power saving' },
  { index: 7, id: 'LED_STRIP', label: 'LED Strip Master', desc: 'Master switch for WS2812B ambient lighting' },
  { index: 8, id: 'LED_AUTO', label: 'LED Time-of-Day', desc: 'Auto-adjust color/brightness with time slots' },
  { index: 9, id: 'MUSIC_SYNC', label: 'Music Reactive Sync', desc: 'Microphone audio FFT frequency sync' },
  { index: 10, id: 'CALL_MODE', label: 'Call Mode (Busy)', desc: 'Red ambient warning light for video calls' },
  { index: 11, id: 'RELAY_LED_LINK', label: 'Relay-LED Link', desc: 'Color flash feedback on relay actions' },
  { index: 12, id: 'DAILY_REBOOT', label: 'Daily 04:00 Reboot', desc: 'Automatic maintenance reboot at 4:00 AM' },
];

export function useFeatures() {
  const [switches, setSwitches] = useState(Array(13).fill(1));

  useEffect(() => {
    const unsub = bus.on('ble:feature_switches', (arr) => {
      if (Array.isArray(arr)) setSwitches(arr);
    });
    return unsub;
  }, []);

  const setSwitch = useCallback((index, value) => {
    ble.setFeatureSwitch(index, value);
  }, []);

  const isEnabled = useCallback((index) => {
    return Boolean(switches[index]);
  }, [switches]);

  return {
    switches,
    setSwitch,
    isEnabled,
    featureList: FEATURE_NAMES,
  };
}

export default useFeatures;
