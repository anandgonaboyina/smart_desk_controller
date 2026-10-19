/**
 * BrightnessSlider.js — Brightness control with live mA current budget indicator.
 *
 * Purpose : Slider controlling 0-100% brightness while displaying estimated mA draw
 *           and warning when approaching the 300mA hardware safety threshold.
 * Depends : React only.
 * Used by : LedScreen.js, dev-preview.
 */

"use client";

import React, { useState, useEffect } from 'react';

export default function BrightnessSlider({
  brightness,
  value,
  estimatedMa = 150,
  maxBudgetMa = 300,
  disabled = false,
  onChange,
}) {
  const propVal = brightness !== undefined ? brightness : (value !== undefined ? value : 75);
  const [localVal, setLocalVal] = useState(propVal);

  useEffect(() => {
    setLocalVal(propVal);
  }, [propVal]);

  const handleChange = (e) => {
    const val = Number(e.target.value);
    setLocalVal(val);
    if (onChange) onChange(val);
  };

  const isNearLimit = estimatedMa > maxBudgetMa * 0.85;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>Brightness</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{localVal}%</span>
          <span className={`badge ${isNearLimit ? 'badge-warning' : 'badge-info'}`}>
            ⚡ {estimatedMa} mA / {maxBudgetMa} mA
          </span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={localVal}
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}
