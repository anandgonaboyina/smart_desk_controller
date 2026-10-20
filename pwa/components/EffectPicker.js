/**
 * EffectPicker.js — LED Effect selector with speed, blink rate, and safety controls.
 */

"use client";

import React, { useState, useEffect } from 'react';
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
  const [localSpeed, setLocalSpeed] = useState(speed);
  useEffect(() => {
    setLocalSpeed(speed);
  }, [speed]);

  const handleSpeedChange = (e) => {
    const val = Number(e.target.value);
    setLocalSpeed(val);
    if (onSpeedChange) onSpeedChange(val);
  };

  const isBlinkEffect = effect === 9 || effect === 10;
  const isSafe = isPhotosensitiveSafe(blinkOnMs, blinkOffMs);
  const handleEffect = onEffectChange || onSelect;
  const handleBlink = onBlinkTimingChange || onBlinkChange;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Lighting Effect
        </label>
        <div className="relative">
          <select
            value={effect}
            onChange={(e) => handleEffect && handleEffect(Number(e.target.value))}
            className="w-full h-12 pl-4 pr-10 text-gray-900 bg-gray-50 border border-gray-300 rounded-xl appearance-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
          >
            {EFFECTS.map((eff) => (
              <option key={eff.id} value={eff.id}>
                {eff.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
            ▼
          </div>
        </div>
      </div>

      {/* Speed Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Effect Speed</span>
          <span className="font-mono text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
            {localSpeed}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={255}
          value={localSpeed}
          onChange={handleSpeedChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
        />
      </div>

      {/* Blink Rate Controls */}
      {isBlinkEffect && (
        <div className="p-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Blink Cycle Timing</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
              isSafe ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                     : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse'
            }`}>
              {isSafe ? '✓ Safe (≤ 3 Hz)' : '⚠️ Rapid Blink (> 3 Hz)'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Flash Duration</span>
              <span>{blinkOnMs} ms</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={25}
              value={blinkOnMs}
              onChange={(e) => handleBlink && handleBlink(Number(e.target.value), blinkOffMs)}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Pause Duration</span>
              <span>{blinkOffMs} ms</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={25}
              value={blinkOffMs}
              onChange={(e) => handleBlink && handleBlink(blinkOnMs, Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-gray-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}