/**
 * useAudio.js — React hook for audio settings and sound dispatch.
 *
 * Purpose : Exposes volume controls, quiet hours settings, and sound effect triggers.
 * Depends : React, audio.js, store.js.
 * Used by : Header.js, SystemScreen.js, dev-preview.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import audio from '../lib/audio.js';
import store from '../lib/store.js';

export function useAudio() {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
  });

  useEffect(() => {
    setEnabled(store.getAudioEnabled());
    setVolume(store.getAudioVolume());
    setQuietHours(store.getQuietHours());
  }, []);

  const updateEnabled = useCallback((val) => {
    setEnabled(val);
    store.setAudioEnabled(val);
  }, []);

  const updateVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, Number(val)));
    setVolume(clamped);
    store.setAudioVolume(clamped);
  }, []);

  const updateQuietHours = useCallback((settings) => {
    setQuietHours(settings);
    store.setQuietHours(settings);
  }, []);

  const playSound = useCallback((soundId) => {
    audio.play(soundId);
  }, []);

  return {
    enabled,
    volume,
    quietHours,
    updateEnabled,
    updateVolume,
    updateQuietHours,
    playSound,
  };
}

export default useAudio;

