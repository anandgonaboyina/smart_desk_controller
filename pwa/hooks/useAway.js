/**
 * useAway.js — React hook for Away Mode desk lockdown.
 *
 * Purpose : Subscribes to Away mode state notifications, manages exit delay countdowns,
 *           and dispatches activate, cancel, and end actions.
 * Depends : React, bus.js, ble.js.
 * Used by : AwayScreen.js, Header.js, StatusBar.js.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';

export function useAway() {
  const [away, setAway] = useState({
    state: 0, // 0=IDLE, 1=COUNTDOWN, 2=ACTIVE
    delaySec: 60,
    maxDurMin: 0,
    remainingDelay: 0,
    elapsedMin: 0,
  });

  useEffect(() => {
    const unsub = bus.on('ble:away', (data) => {
      if (data) setAway((prev) => ({ ...prev, ...data }));
    });
    return unsub;
  }, []);

  const activateAway = useCallback(() => {
    ble.activateAway();
  }, []);

  const cancelAway = useCallback(() => {
    ble.cancelAway();
  }, []);

  const endAway = useCallback((restorePrev = true) => {
    ble.endAway(restorePrev);
  }, []);

  return {
    awayState: away.state,
    isIdle: away.state === 0,
    isCountdown: away.state === 1,
    isActive: away.state === 2,
    remainingDelay: away.remainingDelay,
    elapsedMin: away.elapsedMin,
    delaySec: away.delaySec,
    activateAway,
    cancelAway,
    endAway,
  };
}

export default useAway;

