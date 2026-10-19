/**
 * LedScreen.js — WS2812B ambient LED strip control screen.
 *
 * Purpose : Real-time color wheel, brightness, effects, blink rates, notification blinks,
 *           boot behavior, auto slots, and microphone music reactive sync.
 * Depends : React, useLeds, useAudio, components.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import useLeds from '../hooks/useLeds.js';
import useAudio from '../hooks/useAudio.js';
import LedPreview from '../components/LedPreview.js';
import ColorWheel from '../components/ColorWheel.js';
import BrightnessSlider from '../components/BrightnessSlider.js';
import EffectPicker from '../components/EffectPicker.js';
import ConfirmDialog from '../components/ConfirmDialog.js';

export function LedScreen() {
  const { ledState, estimatedMa, isBlinkSafe, updateLedState, testNotifyBlink, bootSettings, updateBootSettings } = useLeds();
  const { isMusicActive, toggleMusicSync } = useAudio();
  const [showPhotoConfirm, setShowPhotoConfirm] = useState(false);
  const [pendingBlinkRate, setPendingBlinkRate] = useState(null);

  const handleBlinkChange = (onMs, offMs) => {
    if ((onMs + offMs) < 334) {
      setPendingBlinkRate({ onMs, offMs });
      setShowPhotoConfirm(true);
    } else {
      updateLedState({ blinkOnMs: onMs, blinkOffMs: offMs });
    }
  };

  return (
    <div className="led-screen-container">
      <h1 className="screen-title">Ambient Lighting</h1>
      <LedPreview r={ledState.r} g={ledState.g} b={ledState.b} brightness={ledState.brightness} effect={ledState.effect} />
      <div className="current-badge">Est. Current: ~{estimatedMa} mA (8 LEDs, 5V)</div>

      <div className="tab-pill-selector">
        <button className={`tab-pill-btn ${ledState.mode === 1 ? 'active' : ''}`} onClick={() => updateLedState({ mode: 1 })}>Manual</button>
        <button className={`tab-pill-btn ${ledState.mode === 2 ? 'active' : ''}`} onClick={() => updateLedState({ mode: 2 })}>Auto (TOD)</button>
        <button className={`tab-pill-btn ${ledState.mode === 0 ? 'active' : ''}`} onClick={() => updateLedState({ mode: 0 })}>Off</button>
      </div>

      <div className="card-box">
        <h2 className="section-title">Color & Brightness</h2>
        <ColorWheel r={ledState.r} g={ledState.g} b={ledState.b} onChange={(c) => updateLedState(c)} />
        <BrightnessSlider
          brightness={ledState.brightness}
          value={ledState.brightness}
          estimatedMa={estimatedMa}
          onChange={(b) => updateLedState({ brightness: b })}
        />
      </div>

      <div className="card-box">
        <h2 className="section-title">Lighting Effects & Blink Timing</h2>
        <EffectPicker
          effect={ledState.effect}
          speed={ledState.speed}
          onSpeedChange={(spd) => updateLedState({ speed: spd })}
          onEffectChange={(eff) => updateLedState({ effect: eff })}
          onSelect={(eff) => updateLedState({ effect: eff })}
          blinkOnMs={ledState.blinkOnMs}
          blinkOffMs={ledState.blinkOffMs}
          onBlinkChange={handleBlinkChange}
          onBlinkTimingChange={handleBlinkChange}
        />
      </div>

      <div className="card-box">
        <h2 className="section-title">Notification Flash Test</h2>
        <div className="card-actions-row">
          <button className="btn btn-secondary" onClick={() => testNotifyBlink(0, 0, 255, 0, 3, 1000)}>Test Timer Done (Green)</button>
          <button className="btn btn-secondary" onClick={() => testNotifyBlink(1, 255, 0, 0, 3, 1000)}>Test Call Alert (Red)</button>
        </div>
      </div>

      <div className="card-box">
        <h2 className="section-title">Music Reactive Sync</h2>
        <button className={`btn ${isMusicActive ? 'btn-danger' : 'btn-primary'}`} onClick={toggleMusicSync}>
          {isMusicActive ? 'Stop Microphone Sync' : 'Start Microphone Audio Sync'}
        </button>
      </div>

      <div className="card-box">
        <h2 className="section-title">Power-On Boot Behavior</h2>
        <select
          className="input-select"
          value={bootSettings.behavior}
          onChange={(e) => updateBootSettings({ behavior: Number(e.target.value) })}
        >
          <option value={0}>Restore Last State</option>
          <option value={1}>Turn Off</option>
          <option value={2}>Default Warm White</option>
        </select>
      </div>

      <ConfirmDialog
        isOpen={showPhotoConfirm}
        title="Photosensitivity Hazard Warning"
        message="Blink rates exceeding 3 flashes per second (> 3 Hz) can trigger seizures in photosensitive individuals. Do you still wish to apply this speed?"
        onConfirm={() => {
          if (pendingBlinkRate) updateLedState(pendingBlinkRate);
          setShowPhotoConfirm(false);
        }}
        onCancel={() => setShowPhotoConfirm(false)}
      />
    </div>
  );
}

export default LedScreen;
