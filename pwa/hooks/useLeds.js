/**
 * useLeds.js — React hook for WS2812B LED strip controls and effects.
 *
 * Purpose : Subscribes to LED state, presets, and boot settings.
 *           Calculates mA current budget, provides photosensitivity verification,
 *           and dispatches LED updates and notification test blinks.
 * Depends : React, bus.js, ble.js, pure/color-math.js.
 * Used by : LedScreen.js, LedPreview.js, dev-preview.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';
import { estimateCurrentMa, isPhotosensitiveSafe } from '../lib/pure/color-math.js';

export function useLeds() {
  const [ledState, setLedState] = useState({
    mode: 1, // 0=off, 1=manual, 2=auto, 3=music
    effect: 0,
    r: 64, g: 150, b: 255,
    brightness: 75,
    speed: 128,
    autoResumeMin: 0,
    r2: 255, g2: 100, b2: 0,
    blinkOnMs: 500,
    blinkOffMs: 500,
  });

  const [presets, setPresets] = useState([]);
  const [bootSettings, setBootSettings] = useState({
    behavior: 0,
    presetIndex: 0xFF,
    bootSweep: true,
    bleStatus: false,
  });

  useEffect(() => {
    const unsubState = bus.on('ble:led_state', (st) => {
      if (st) setLedState((prev) => ({ ...prev, ...st }));
    });

    const unsubPresets = bus.on('ble:led_presets', (list) => {
      if (Array.isArray(list)) setPresets(list);
    });

    const unsubBoot = bus.on('ble:boot_settings', (bs) => {
      if (bs) setBootSettings((prev) => ({ ...prev, ...bs }));
    });

    return () => {
      unsubState();
      unsubPresets();
      unsubBoot();
    };
  }, []);

  const updateLedState = useCallback((updates) => {
    const next = { ...ledState, ...updates };
    setLedState(next);
    ble.setLedState(next);
  }, [ledState]);

  const testNotifyBlink = useCallback((event, r, g, b, count, durationMs) => {
    ble.testNotifyBlink(event, r, g, b, count, durationMs);
  }, []);

  const updateBootSettings = useCallback((settings) => {
    const next = { ...bootSettings, ...settings };
    setBootSettings(next);
    ble.setLedBootSettings(next.behavior, next.presetIndex, next.bootSweep, next.bleStatus);
  }, [bootSettings]);

  // Current calculation for 8 LEDs
  const estimatedMa = useMemo(() => {
    return estimateCurrentMa(
      { r: ledState.r, g: ledState.g, b: ledState.b },
      8,
      ledState.brightness,
      80 // 80/255 hardware brightness cap
    );
  }, [ledState.r, ledState.g, ledState.b, ledState.brightness]);

  // Photosensitivity check: true if safe (<= 3 flashes/second), false if needs confirmation
  const isBlinkSafe = useMemo(() => {
    return isPhotosensitiveSafe(ledState.blinkOnMs, ledState.blinkOffMs);
  }, [ledState.blinkOnMs, ledState.blinkOffMs]);

  return {
    ledState,
    presets,
    bootSettings,
    estimatedMa,
    isBlinkSafe,
    updateLedState,
    testNotifyBlink,
    updateBootSettings,
  };
}

export default useLeds;
