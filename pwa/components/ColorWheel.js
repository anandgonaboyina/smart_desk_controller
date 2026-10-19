/**
 * ColorWheel.js — Color selection component with hex input and preset swatches.
 *
 * Purpose : Presentational color palette picker and quick swatch selector.
 * Depends : React, pure/color-math.js.
 * Used by : LedScreen.js, dev-preview.
 */

"use client";

import React, { useMemo } from 'react';
import { rgbToHex, hexToRgb } from '../lib/pure/color-math.js';

const QUICK_SWATCHES = [
  { name: 'Warm White', hex: '#ffb43c', r: 255, g: 180, b: 60 },
  { name: 'Pure White', hex: '#ffffff', r: 255, g: 255, b: 255 },
  { name: 'Cyan Glow', hex: '#4096ff', r: 64, g: 150, b: 255 },
  { name: 'Neon Emerald', hex: '#10b981', r: 16, g: 185, b: 129 },
  { name: 'Amber Focus', hex: '#f59e0b', r: 245, g: 158, b: 11 },
  { name: 'Cyber Violet', hex: '#8b5cf6', r: 139, g: 92, b: 246 },
  { name: 'Deep Crimson', hex: '#ef4444', r: 239, g: 68, b: 68 },
];

export default function ColorWheel({
  r = 64, g = 150, b = 255,
  onChange,
  onSelectPreset,
}) {
  const currentHex = useMemo(() => rgbToHex(r, g, b), [r, g, b]);

  const handleColorInput = (e) => {
    const { r: nr, g: ng, b: nb } = hexToRgb(e.target.value);
    onChange && onChange(nr, ng, nb);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="color"
          value={currentHex}
          onChange={handleColorInput}
          style={{
            width: '56px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            padding: 0,
            background: 'none',
          }}
        />

        <input
          type="text"
          value={currentHex.toUpperCase()}
          onChange={(e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
              const { r: nr, g: ng, b: nb } = hexToRgb(e.target.value);
              onChange && onChange(nr, ng, nb);
            }
          }}
          style={{ width: '120px', fontFamily: 'var(--font-mono)' }}
          maxLength={7}
        />
      </div>

      {/* Swatches */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {QUICK_SWATCHES.map((sw) => (
          <button
            key={sw.name}
            onClick={() => onChange && onChange(sw.r, sw.g, sw.b)}
            title={sw.name}
            style={{
              width: '32px',
              height: '32px',
              minHeight: '32px',
              borderRadius: '50%',
              backgroundColor: sw.hex,
              border: currentHex.toLowerCase() === sw.hex.toLowerCase() ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

