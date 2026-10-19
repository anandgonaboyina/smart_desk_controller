/**
 * LedPreview.js — Real-time 8-LED WS2812B strip visualizer.
 *
 * Purpose : Renders 8 simulated LED pixels with live color, brightness scaling,
 *           and effect simulation (solid, breathe, rainbow, blink, gradient).
 * Depends : React, pure/color-math.js.
 * Used by : LedScreen.js, DisplayScreen.js, dev-preview.
 */

"use client";

import React, { useMemo } from 'react';
import { rgbToHex, scaleBrightness } from '../lib/pure/color-math.js';

export default function LedPreview({
  ledState = { mode: 1, effect: 0, r: 64, g: 150, b: 255, brightness: 75, r2: 255, g2: 100, b2: 0 },
  count = 8,
}) {
  const { mode, effect, r, g, b, brightness, r2 = 0, g2 = 0, b2 = 0 } = ledState;

  // Compute base color scaled by brightness
  const hexColor = useMemo(() => {
    if (mode === 0) return '#000000'; // OFF
    const scaled = scaleBrightness({ r, g, b }, brightness, 80);
    return rgbToHex(scaled.r, scaled.g, scaled.b);
  }, [mode, r, g, b, brightness]);

  const hexColor2 = useMemo(() => {
    if (mode === 0) return '#000000';
    const scaled = scaleBrightness({ r: r2, g: g2, b: b2 }, brightness, 80);
    return rgbToHex(scaled.r, scaled.g, scaled.b);
  }, [mode, r2, g2, b2, brightness]);

  const pixels = useMemo(() => {
    return Array.from({ length: count }, (_, idx) => {
      let bg = hexColor;
      let shadow = `0 0 10px ${hexColor}`;

      if (mode === 0) {
        bg = '#111111';
        shadow = 'none';
      } else if (effect === 7) { // Gradient
        const ratio = idx / Math.max(1, count - 1);
        bg = ratio > 0.5 ? hexColor2 : hexColor;
        shadow = `0 0 10px ${bg}`;
      } else if (effect === 2) { // Rainbow preview approximation
        const hue = Math.round((idx * 360) / count);
        bg = `hsl(${hue}, 100%, 50%)`;
        shadow = `0 0 10px ${bg}`;
      }

      return { id: idx, bg, shadow };
    });
  }, [count, mode, effect, hexColor, hexColor2]);

  return (
    <div className="led-strip-preview" title={`8x WS2812B Strip: ${mode === 0 ? 'OFF' : 'ACTIVE'}`}>
      {pixels.map((p) => (
        <div
          key={p.id}
          className="led-pixel"
          style={{
            backgroundColor: p.bg,
            boxShadow: p.shadow,
          }}
        />
      ))}
    </div>
  );
}

