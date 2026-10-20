/**
 * ColorWheel.js — Color selection component with hex input and preset swatches.
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer shrink-0 group">
          <input
            type="color"
            value={currentHex}
            onChange={handleColorInput}
            className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"
          />
          <div className="absolute inset-0 ring-inset ring-2 ring-transparent group-hover:ring-black/10 dark:group-hover:ring-white/10 pointer-events-none rounded-xl transition-all"></div>
        </div>

        <input
          type="text"
          value={currentHex.toUpperCase()}
          onChange={(e) => {
            if (/^#[0-9A-Fa-f]{6}\$/.test(e.target.value)) {
              const { r: nr, g: ng, b: nb } = hexToRgb(e.target.value);
              onChange && onChange(nr, ng, nb);
            }
          }}
          className="w-32 h-12 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono uppercase tracking-widest text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow shadow-sm"
          maxLength={7}
        />
      </div>

      {/* Swatches */}
      <div className="flex gap-2 flex-wrap mt-1">
        {QUICK_SWATCHES.map((sw) => {
          const isActive = currentHex.toLowerCase() === sw.hex.toLowerCase();
          return (
            <button
              key={sw.name}
              onClick={() => onChange && onChange(sw.r, sw.g, sw.b)}
              title={sw.name}
              className={`w-10 h-10 rounded-full transition-transform duration-200 hover:scale-110 shadow-sm ${
                isActive ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 dark:ring-offset-gray-900' : 'ring-1 ring-black/10 dark:ring-white/10'
              }`}
              style={{ backgroundColor: sw.hex }}
              aria-label={`Select ${sw.name}`}
            />
          );
        })}
      </div>
    </div>
  );
}