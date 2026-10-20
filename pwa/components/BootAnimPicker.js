/**
 * BootAnimPicker.js — 10 Power-On Boot & Shutdown RGB Animation Selector.
 */

"use client";

import React, { useState } from 'react';
import { BOOT_ANIMATIONS } from '../lib/pure/color-math.js';

export default function BootAnimPicker({
  selectedAnimId = 0,
  bootBehavior = 0,
  onSelectAnim,
  onSelectBehavior,
  onTestAnimation,
}) {
  const [activeTestId, setActiveTestId] = useState(null);

  const handleTest = (animId) => {
    setActiveTestId(animId);
    if (onTestAnimation) onTestAnimation(animId);
    const meta = BOOT_ANIMATIONS.find((a) => a.id === animId);
    setTimeout(() => setActiveTestId(null), (meta?.durationMs || 1500) + 200);
  };

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Power-On Boot Behavior */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Power-On Boot Behavior
        </label>
        <div className="relative">
          <select
            value={bootBehavior}
            onChange={(e) => onSelectBehavior && onSelectBehavior(Number(e.target.value))}
            className="w-full h-12 pl-4 pr-10 text-gray-900 bg-gray-50 border border-gray-300 rounded-xl appearance-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value={0}>Restore Last Saved State</option>
            <option value={1}>Turn Off on Startup</option>
            <option value={2}>Default Warm White Ambient</option>
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">▼</div>
        </div>
      </div>

      {/* 10 Boot / Shutdown Transition Animations */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Boot & Shutdown RGB Animation (10 Styles)
        </label>
        <div className="relative">
          <select
            value={selectedAnimId}
            onChange={(e) => onSelectAnim && onSelectAnim(Number(e.target.value))}
            className="w-full h-12 pl-4 pr-10 text-gray-900 bg-gray-50 border border-gray-300 rounded-xl appearance-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            {BOOT_ANIMATIONS.map((anim) => (
              <option key={anim.id} value={anim.id}>
                {anim.id + 1}. {anim.label} ({anim.type.toUpperCase()})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">▼</div>
        </div>
      </div>

      {/* Interactive Animation Test Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          onClick={() => handleTest(selectedAnimId)}
          disabled={activeTestId !== null}
          className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait"
        >
          {activeTestId === selectedAnimId ? '✨ Playing Preview...' : '▶️ Test Selected'}
        </button>

        <button
          onClick={() => handleTest(5)} // ID 5: Smooth Fade-Out
          disabled={activeTestId !== null}
          className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-red-500 transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait"
        >
          {activeTestId === 5 ? '🌙 Shutting Down...' : '⏹️ Test Shutdown'}
        </button>
      </div>
    </div>
  );
}