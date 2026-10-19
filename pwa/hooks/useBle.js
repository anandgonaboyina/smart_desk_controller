/**
 * useBle.js — React hook for BLE connection lifecycle and status.
 *
 * Purpose : Subscribes to bus events for connection state, device name, and errors.
 *           Provides connect and disconnect action triggers.
 * Depends : React, bus.js, ble.js, demo.js.
 * Used by : Header.js, StatusBar.js, dev-preview, screens.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';
import demo from '../lib/demo.js';

export function useBle() {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [deviceName, setDeviceName] = useState(null);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Initial sync
    setIsDemo(demo.active);
    if (ble.isConnected()) {
      setStatus('connected');
      setDeviceName(demo.active ? 'SmartDesk-Demo (Simulated)' : (ble.device?.name || 'SmartDesk'));
    }

    const unsubStatus = bus.on('ble:status', (payload) => {
      setStatus(payload.state);
      setDeviceName(payload.deviceName);
      setError(payload.error);
    });

    const unsubDemo = bus.on('demo:toggle', (active) => {
      setIsDemo(active);
    });

    return () => {
      unsubStatus();
      unsubDemo();
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      await ble.connect();
    } catch (err) {
      setError(err.message || 'Connection failed');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await ble.disconnect();
  }, []);

  const toggleDemo = useCallback(() => {
    demo.toggle();
  }, []);

  return {
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    status,
    deviceName,
    error,
    isDemo,
    connect,
    disconnect,
    toggleDemo,
  };
}

export default useBle;

