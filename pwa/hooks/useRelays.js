/**
 * useRelays.js — React hook for relay states, configurations, and actions.
 *
 * Purpose : Subscribes to relay state/config notifications, calculates coil
 *           and electrical levels for display, and dispatches relay actions.
 * Depends : React, bus.js, ble.js, pure/relay-logic.js.
 * Used by : RelayCard.js, RelaySettingsScreen.js, screens.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';
import { relayLoadToCoil, relayCoilToLevel } from '../lib/pure/relay-logic.js';

export function useRelays() {
  const [relayCount, setRelayCount] = useState(4);
  const [loads, setLoads] = useState([0, 0, 0, 0]);
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    const unsubState = bus.on('ble:relay_state', (payload) => {
      if (payload && payload.loads) {
        setRelayCount(payload.count || payload.loads.length);
        setLoads(payload.loads);
      }
    });

    const unsubConfig = bus.on('ble:relay_config', (cfg) => {
      if (cfg && cfg.index !== undefined) {
        setConfigs((prev) => ({ ...prev, [cfg.index]: cfg }));
      }
    });

    return () => {
      unsubState();
      unsubConfig();
    };
  }, []);

  const setLoad = useCallback((index, desiredLoad) => {
    ble.setRelayLoad(index, desiredLoad);
  }, []);

  const toggleLoad = useCallback((index) => {
    const current = loads[index] || 0;
    ble.setRelayLoad(index, current ? 0 : 1);
  }, [loads]);

  const setConfig = useCallback((index, cfg) => {
    ble.setRelayConfig(index, cfg);
  }, []);

  const resetConfig = useCallback((index) => {
    ble.resetRelayConfig(index);
  }, []);

  const testRelay = useCallback((index) => {
    ble.testRelay(index);
  }, []);

  const setDriver = useCallback((driverType) => {
    ble.setRelayDriver(driverType);
  }, []);

  // Compute enriched channels array (LOAD vs COIL vs ELECTRICAL LEVEL)
  const channels = Array.from({ length: relayCount }, (_, idx) => {
    const load = loads[idx] || 0;
    const cfg = configs[idx] || {
      name: `Relay ${idx + 1}`,
      icon: '⚡',
      polarity: 0, // Active-LOW
      wiring: 0,   // NO
      minSwitchMs: 2000,
      affectedByAway: 1,
      enabled: 1,
      gpioPin: 4 + idx,
      bootBehavior: 0,
    };
    const coil = relayLoadToCoil(load, cfg.wiring);
    const gpioLevel = relayCoilToLevel(coil, cfg.polarity);

    return {
      index: idx,
      load,
      coil,
      gpioLevel,
      config: cfg,
    };
  });

  return {
    relayCount,
    loads,
    configs,
    channels,
    setLoad,
    toggleLoad,
    setConfig,
    resetConfig,
    testRelay,
    setDriver,
  };
}

export default useRelays;
