/**
 * BrightnessSlider.js — Brightness control with live mA current budget indicator.
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
    <div className={`flex flex-col gap-3 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex justify-between items-end">
        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
          Master Brightness
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
            {localVal}%
          </span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
            isNearLimit 
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
          }`}>
            ⚡ {estimatedMa} / {maxBudgetMa} mA
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
        className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      />
    </div>
  );
}