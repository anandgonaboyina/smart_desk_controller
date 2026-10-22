/**
 * CustomTimerModal.tsx — Accessible popup modal for setting custom timers.
 *
 * Purpose : Allows setting arbitrary minute countdowns (1..1440) or presets
 *           for individual relays and the RGB light strip.
 * Depends : React.
 * Used by : QuickRemotePanel.tsx, RelayPanel.tsx.
 */

"use client";

import React, { useState, useEffect } from "react";

export interface CustomTimerModalProps {
  isOpen: boolean;
  targetTitle: string;
  isTimerActive?: boolean;
  currentRemainingMin?: number;
  onSetTimer: (minutes: number) => void;
  onClose: () => void;
}

const PRESET_MINUTES = [5, 15, 30, 45, 60, 90, 120, 240];

export default function CustomTimerModal({
  isOpen,
  targetTitle,
  isTimerActive = false,
  currentRemainingMin = 0,
  onSetTimer,
  onClose,
}: CustomTimerModalProps) {
  const [minutesInput, setMinutesInput] = useState<string>("30");

  useEffect(() => {
    if (isOpen) {
      if (isTimerActive && currentRemainingMin > 0) {
        setMinutesInput(currentRemainingMin.toString());
      } else {
        setMinutesInput("30");
      }
    }
  }, [isOpen, isTimerActive, currentRemainingMin]);

  if (!isOpen) return null;

  const handleStart = (mins?: number) => {
    const val = mins !== undefined ? mins : parseInt(minutesInput, 10);
    if (!isNaN(val) && val > 0 && val <= 1440) {
      onSetTimer(val);
      onClose();
    }
  };

  const handleCancel = () => {
    onSetTimer(0);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none font-sans"
    >
      <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-1.5">
              <span>⏱️ Custom Sleep Timer</span>
            </h3>
            <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
              {targetTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono cursor-pointer transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 text-xs font-mono">
          {/* Active Status Banner */}
          {isTimerActive && currentRemainingMin > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 flex items-center justify-between">
              <span>⏳ Active: {currentRemainingMin}m remaining</span>
              <button
                type="button"
                onClick={handleCancel}
                className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold cursor-pointer transition-all"
              >
                Stop Timer
              </button>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1.5">
              Quick Presets:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setMinutesInput(mins.toString())}
                  className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                    minutesInput === mins.toString()
                      ? "bg-cyan-500/20 border-cyan-500/80 text-cyan-200"
                      : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Minute Input */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1.5">
              Custom Duration (1 to 1440 minutes):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1440}
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Minutes..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="text-zinc-400 font-mono text-xs">mins</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900/60 border-t border-zinc-800 flex justify-end gap-2">
          {isTimerActive && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-rose-400 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Cancel Timer
            </button>
          )}
          <button
            type="button"
            onClick={() => handleStart()}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            Start Countdown
          </button>
        </div>
      </div>
    </div>
  );
}

