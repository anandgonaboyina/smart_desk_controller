/**
 * useCallMode.js — React hook for Call Mode (Busy ambient warning light).
 *
 * Purpose : Subscribes to Call mode state notifications and dispatches toggle/duration settings.
 * Depends : React, bus.js, ble.js.
 * Used by : Header.js, StatusBar.js, dev-preview.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';

export function useCallMode() {
  const [callMode, setCallMode] = useState({
    active: false,
    autoOffMin: 45,
  });

  useEffect(() => {
    const unsub = bus.on('ble:call_mode', (data) => {
      if (data) setCallMode((prev) => ({ ...prev, ...data }));
    });
    return unsub;
  }, []);

  const toggleCallMode = useCallback((desiredActive) => {
    const target = desiredActive !== undefined ? desiredActive : !callMode.active;
    ble.toggleCallMode(target);
  }, [callMode.active]);

  return {
    isActive: callMode.active,
    autoOffMin: callMode.autoOffMin,
    toggleCallMode,
  };
}

export default useCallMode;
