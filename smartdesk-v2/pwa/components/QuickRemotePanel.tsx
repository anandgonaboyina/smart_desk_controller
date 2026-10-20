"use client";

import React, { useState } from "react";
import { RelayState, RelayConfigItem, LedState } from "../types/smartdesk";
import CustomTimerModal from "./CustomTimerModal";

export interface QuickRemotePanelProps {
  connected: boolean;
  deviceName: string;
  relays: RelayState[];
  configs: RelayConfigItem[];
  led: LedState;
  rgbTimerRemainingMin: number;
  onToggleRelay: (idx: number, currentVal?: boolean) => void;
  onSetRelayTimer: (idx: number, minutes: number) => void;
  onAllRelaysOff: () => void;
  onSendLed: (mode: number, r: number, g: number, b: number, bri: number, spd: number) => void;
  onSetRgbTimer: (minutes: number) => void;
  onNavigateTab: (tab: "relays" | "leds" | "schedule" | "presence" | "settings") => void;
}

export default function QuickRemotePanel({
  relays,
  configs,
  led,
  rgbTimerRemainingMin,
  onToggleRelay,
  onSetRelayTimer,
  onAllRelaysOff,
  onSendLed,
  onSetRgbTimer,
}: QuickRemotePanelProps) {
  const [timerTargetIdx, setTimerTargetIdx] = useState<number | null>(null);
  const isRgbOn = led.mode !== 0;

  const handleToggleRgb = () => {
    if (isRgbOn) onSendLed(0, led.r, led.g, led.b, led.bri, led.spd);
    else onSendLed(1, led.r || 0, led.g || 180, led.b || 255, led.bri || 50, led.spd || 5);
  };

  return (
    <div className="flex flex-col gap-2 w-full font-sans select-none h-full justify-evenly">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          🎮 Quick Remote
        </h2>
        <button
          onClick={onAllRelaysOff}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold border-2 border-rose-700 transition-all active:scale-95"
        >
          🛑 TURN ALL OFF
        </button>
      </div>

      {/* RELAYS GRID: 2 columns on mobile, 4 columns on large desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {relays.map((relay, idx) => {
          const cfg = configs[idx] || { name: `Relay ${idx + 1}`, wiring: 0 };
          const isNC = cfg.wiring === 1;
          const isPowered = isNC ? !relay.load : relay.load;

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border-2 flex flex-col gap-2 ${
                isPowered
                  ? "bg-zinc-900 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-black border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full shrink-0 ${isPowered ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <span className="text-sm font-extrabold text-white truncate">{cfg.name}</span>
              </div>

              <button
                onClick={() => onToggleRelay(idx, isPowered)}
                className={`w-full py-3 rounded-lg font-extrabold text-xs transition-all active:scale-95 border-2 ${
                  isPowered
                    ? "bg-emerald-500 text-black border-emerald-400"
                    : "bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700"
                }`}
              >
                {isPowered ? "⚡ ON" : "○ OFF"}
              </button>

              {relay.remainingMin > 0 ? (
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-amber-500/20 border-2 border-amber-500 text-amber-400 text-xs font-bold">
                  <span>{relay.remainingMin}m</span>
                  <button onClick={() => onSetRelayTimer(idx, 0)} className="text-white">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onSetRelayTimer(idx, mins)}
                      className="flex-1 py-1.5 rounded bg-zinc-800 border-2 border-zinc-600 text-[10px] font-bold text-white active:scale-95"
                    >
                      {mins >= 60 ? "1h" : `${mins}m`}
                    </button>
                  ))}
                  <button
                    onClick={() => setTimerTargetIdx(idx)}
                    className="px-2 py-1.5 rounded bg-cyan-600 text-white text-[10px] font-bold border-2 border-cyan-500 active:scale-95"
                  >
                    ⏱️
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RGB LIGHT STRIP CARD: Full width below relays */}
      <div
        className={`p-3 rounded-xl border-2 flex flex-col lg:flex-row lg:items-center gap-3 shrink-0 ${
          isRgbOn ? "bg-zinc-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-black border-zinc-700"
        }`}
      >
        <div className="flex items-center justify-between lg:w-1/4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/50" style={{ backgroundColor: isRgbOn ? `rgb(${led.r}, ${led.g}, ${led.b})` : "#3f3f46" }} />
            <span className="text-sm font-extrabold text-white">🌈 RGB Lights</span>
          </div>
        </div>

        <button
          onClick={handleToggleRgb}
          className={`w-full lg:w-1/4 py-3 rounded-lg font-extrabold text-xs transition-all active:scale-95 border-2 ${
            isRgbOn ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-800 text-white border-zinc-600"
          }`}
        >
          {isRgbOn ? "💡 RGB ON" : "🌑 RGB OFF"}
        </button>

        <div className="flex items-center gap-3 lg:w-1/4">
          <span className="text-sm text-zinc-300">☀️</span>
          <input
            type="range" min={1} max={100} value={led.bri}
            onChange={(e) => onSendLed(led.mode || 1, led.r, led.g, led.b, parseInt(e.target.value, 10), led.spd)}
            className="flex-1 accent-cyan-400 h-4 bg-zinc-700 rounded-lg cursor-pointer"
          />
        </div>

        <div className="lg:w-1/4">
          {rgbTimerRemainingMin > 0 ? (
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300 text-xs font-bold">
              <span>Sleep in {rgbTimerRemainingMin}m</span>
              <button onClick={() => onSetRgbTimer(0)} className="text-white">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[15, 30, 60].map((mins) => (
                <button
                  key={mins} onClick={() => onSetRgbTimer(mins)}
                  className="flex-1 py-1.5 rounded bg-zinc-800 border-2 border-zinc-600 text-[10px] font-bold text-white active:scale-95"
                >
                  {mins >= 60 ? "1h" : `${mins}m`}
                </button>
              ))}
              <button onClick={() => setTimerTargetIdx(-1)} className="px-2 py-1.5 rounded bg-cyan-600 text-white text-[10px] font-bold border-2 border-cyan-500 active:scale-95">
                ⏱️
              </button>
            </div>
          )}
        </div>
      </div>

      {timerTargetIdx !== null && (
        <CustomTimerModal
          isOpen={true}
          targetTitle={timerTargetIdx === -1 ? "RGB Ambient Light" : configs[timerTargetIdx]?.name || `Relay #${timerTargetIdx + 1}`}
          isTimerActive={timerTargetIdx === -1 ? rgbTimerRemainingMin > 0 : relays[timerTargetIdx]?.remainingMin > 0}
          currentRemainingMin={timerTargetIdx === -1 ? rgbTimerRemainingMin : relays[timerTargetIdx]?.remainingMin}
          onSetTimer={(mins) => { if (timerTargetIdx === -1) onSetRgbTimer(mins); else onSetRelayTimer(timerTargetIdx, mins); }}
          onClose={() => setTimerTargetIdx(null)}
        />
      )}
    </div>
  );
}