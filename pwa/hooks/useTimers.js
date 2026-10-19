/**
 * useTimers.js — React hook for relay countdown timers.
 *
 * Purpose : Subscribes to timer notifications, manages countdown state per relay,
 *           and dispatches start/cancel timer commands.
 * Depends : React, bus.js, ble.js, pure/time-math.js.
 * Used by : TimerRow.js, RelayCard.js, screens.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';
import { formatCountdownSec } from '../lib/pure/time-math.js';

export function useTimers() {
  const [timerMap, setTimerMap] = useState({});

  useEffect(() => {
    const unsub = bus.on('ble:timers', (tm) => {
      if (tm && tm.relayIndex !== undefined) {
        setTimerMap((prev) => ({
          ...prev,
          [tm.relayIndex]: {
            active: tm.active,
            remainingSec: tm.remainingSec,
            totalSec: tm.totalSec,
            resumed: tm.resumed,
            formatted: formatCountdownSec(tm.remainingSec),
          },
        }));
      }
    });
    return unsub;
  }, []);

  const startTimer = useCallback((relayIndex, durationMinutes) => {
    ble.startTimer(relayIndex, durationMinutes);
  }, []);

  const cancelTimer = useCallback((relayIndex) => {
    ble.cancelTimer(relayIndex);
  }, []);

  const getTimer = useCallback((relayIndex) => {
    return timerMap[relayIndex] || {
      active: false,
      remainingSec: 0,
      totalSec: 0,
      resumed: false,
      formatted: '00:00',
    };
  }, [timerMap]);

  return {
    timerMap,
    getTimer,
    startTimer,
    cancelTimer,
  };
}

export default useTimers;
