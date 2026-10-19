/**
 * useUnlock.js — React hook for PC Unlock & HID settings.
 *
 * Purpose : Subscribes to HID settings/status notifications, provides password saving
 *           and manual type-now trigger. Never logs or exposes password characters.
 * Depends : React, bus.js, ble.js.
 * Used by : UnlockScreen.js, dev-preview.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';

export function useUnlock() {
  const [settings, setSettings] = useState({
    signInType: 0,
    pressEnter: true,
    autoDelaySec: 3,
    autoEnabled: false,
    usbEnabled: true,
    bleEnabled: false,
    passwordIsSet: false,
    usbKbDisabled: false,
  });

  const [status, setStatus] = useState(null);

  useEffect(() => {
    const unsubSettings = bus.on('ble:hid_settings', (st) => {
      if (st) setSettings((prev) => ({ ...prev, ...st }));
    });

    const unsubStatus = bus.on('ble:hid_status', (data) => {
      if (data) setStatus(data);
    });

    return () => {
      unsubSettings();
      unsubStatus();
    };
  }, []);

  const triggerTypeNow = useCallback((path = 0) => {
    ble.triggerHidTypeNow(path);
  }, []);

  return {
    settings,
    status,
    triggerTypeNow,
    passwordIsSet: settings.passwordIsSet,
  };
}

export default useUnlock;

