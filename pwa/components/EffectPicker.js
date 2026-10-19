/**
 * EffectPicker.js — LED Effect selector with speed, blink rate, and safety controls.
 *
 * Purpose : Select from 12 effects (including blink, double-blink, heartbeat) and adjust
 *           speed or on/off timing with photosensitivity safety feedback.
 * Depends : React, pure/color-math.js.
 * Used by : LedScreen.js, dev-preview.
 */

"use client";

import React from 'react';
import { isPhotosensitiveSafe } from '../lib/pure/color-math.js';

export const EFFECTS = [
  { id: 0, label: 'Solid Color' },
  { id: 1, label: 'Gentle Breathe' },
  { id: 2, label: 'Rainbow Wave' },
  { id: 3, label: 'Rainbow Chase' },
  { id: 4, label: 'Color Chase' },
  { id: 5, label: 'Twinkle Stars' },
  { id: 6, label: 'Fire Flicker' },
  { id: 7, label: 'Two-Color Gradient' },
  { id: 8, label: 'Strobe (Safety Gated)' },
  { id: 9, label: 'Blink (Adjustable)' },
  { id: 10, label: 'Double-Blink' },
  { id: 11, label: 'Heartbeat (Lub-Dub)' },
];

export default function EffectPicker({
  effect = 0,
  speed = 128,
  blinkOnMs = 500,
  blinkOffMs = 500,
  onEffectChange,
  onSelect,
  onSpeedChange,
  onBlinkTimingChange,
  onBlinkChange,
}) {
  const isBlinkEffect = effect === 9 || effect === 10;
  const isSafe = isPhotosensitiveSafe(blinkOnMs, blinkOffMs);
  const handleEffect = onEffectChange || onSelect;
  const handleBlink = onBlinkTimingChange || onBlinkChange;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Lighting Effect</label>
        <select
          value={effect}
          onChange={(e) => handleEffect && handleEffect(Number(e.target.value))}
          style={{ width: '100%', height: '44px' }}
        >
          {EFFECTS.map((eff) => (
            <option key={eff.id} value={eff.id}>
              {eff.label}
            </option>
          ))}
        </select>
      </div>

      {/* Speed Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.9rem' }}>Effect Speed</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{speed}</span>
        </div>
        <input
          type="range"
          min={1}
          max={255}
          value={speed}
          onChange={(e) => onSpeedChange && onSpeedChange(Number(e.target.value))}
        />
      </div>

      {/* Blink Rate Controls (shown when blink effect is selected) */}
      {isBlinkEffect && (
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Blink Cycle Timing</span>
            <span className={`badge ${isSafe ? 'badge-success' : 'badge-danger'}`}>
              {isSafe ? 'Safe (<= 3 Hz)' : 'Rapid Blink (> 3 Hz)'}
            </span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flash Duration: {blinkOnMs} ms</span>
            <input
              type="range"
              min={50}
              max={2000}
              step={25}
              value={blinkOnMs}
              onChange={(e) => handleBlink && handleBlink(Number(e.target.value), blinkOffMs)}
            />
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pause Duration: {blinkOffMs} ms</span>
            <input
              type="range"
              min={50}
              max={2000}
              step={25}
              value={blinkOffMs}
              onChange={(e) => handleBlink && handleBlink(blinkOnMs, Number(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
