"use client";

import React, { useState } from "react";
import { RelayState, RelayConfigItem, UiAnimState } from "../types/smartdesk";
import RelayConfigModal from "./RelayConfigModal";
import CustomTimerModal from "./CustomTimerModal";

export interface RelayPanelProps {
  relays: RelayState[];
  configs: RelayConfigItem[];
  uiAnim: UiAnimState | null;
  connected: boolean;
  onToggleRelay: (idx: number, currentVal?: boolean) => void;
  onSetTimer: (idx: number, minutes: number) => void;
  onAllOff: () => void;
  onSaveConfig: (
    idx: number, name: string, wiring: number, onEn: boolean, onMd: number, onDu: number,
    offEn: boolean, offMd: number, offDu: number, beepOn: boolean, beepOff: boolean, beepEnd: boolean
  ) => void;
}

export default function RelayPanel({
  relays,
  configs,
  uiAnim,
  connected,
  onToggleRelay,
  onSetTimer,
  onAllOff,
  onSaveConfig,
}: RelayPanelProps) {
  const [configModalIdx, setConfigModalIdx] = useState<number | null>(null);
  const [customTimerIdx, setCustomTimerIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4 w-full h-full font-sans select-none pb-4 justify-evenly">
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span>⚡ Power Channels</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onAllOff}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold border-2 border-rose-700 transition-all active:scale-95"
        >
          🛑 ALL OFF
        </button>
      </div>

      {uiAnim?.active && (
        <div className="px-4 py-3 rounded-xl bg-cyan-900 border-2 border-cyan-500 text-cyan-100 text-sm font-bold flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse shrink-0">
          <span>{uiAnim.label}</span>
          <span className="bg-cyan-500 text-black px-2 py-1 rounded-md">RGB Sync</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {relays.map((relay, idx) => {
          const cfg = configs[idx] || { name: `Relay ${idx + 1}`, wiring: 0 };
          const isNC = cfg.wiring === 1;
          const isPowered = relay.load;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-4 ${
                isPowered
                  ? "bg-zinc-900 border-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                  : "bg-black border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${isPowered ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  <span className="text-base font-extrabold text-white truncate">{cfg.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border-2 ${isNC ? "bg-amber-900 text-amber-300 border-amber-600" : "bg-cyan-900 text-cyan-300 border-cyan-600"}`}>
                    {isNC ? "NC" : "NO"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigModalIdx(idx)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 border-2 border-zinc-600 text-white flex items-center justify-center text-sm cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  ⚙️
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleRelay(idx)}
                className={`w-full py-4 rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${
                  isPowered
                    ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/30"
                    : "bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700"
                }`}
              >
                <span>{isPowered ? "⚡ POWERED ON" : "○ STANDBY"}</span>
              </button>

              {relay.remainingMin > 0 ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/20 border-2 border-amber-500 text-amber-400 text-xs font-bold">
                  <span>⏳ Off in {relay.remainingMin}m</span>
                  <button onClick={() => onSetTimer(idx, 0)} className="text-white">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onSetTimer(idx, mins)}
                      className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-600 text-xs font-bold text-white transition-all active:scale-95"
                    >
                      {mins >= 60 ? "1h" : `${mins}m`}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomTimerIdx(idx)}
                    className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold border-2 border-cyan-500 transition-all active:scale-95"
                  >
                    ⏱️
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {customTimerIdx !== null && (
        <CustomTimerModal
          isOpen={true}
          targetTitle={configs[customTimerIdx]?.name || `Relay #${customTimerIdx + 1}`}
          isTimerActive={relays[customTimerIdx]?.remainingMin > 0}
          currentRemainingMin={relays[customTimerIdx]?.remainingMin}
          onSetTimer={(mins) => onSetTimer(customTimerIdx, mins)}
          onClose={() => setCustomTimerIdx(null)}
        />
      )}

      {configModalIdx !== null && (
        <RelayConfigModal
          isOpen={true}
          relayIndex={configModalIdx}
          config={configs[configModalIdx]}
          onSave={onSaveConfig}
          onClose={() => setConfigModalIdx(null)}
        />
      )}
    </div>
  );
}