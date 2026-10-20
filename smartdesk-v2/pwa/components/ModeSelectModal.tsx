/**
 * ModeSelectModal.tsx — Visual overlay modal for LED and Disco mode selection.
 *
 * Purpose : Replaces HTML select dropdowns with an accessible modal card grid.
 * Depends : React, types/smartdesk.ts.
 * Used by : LedPanel.tsx.
 */

"use client";

import React, { useEffect } from "react";
import { LED_MODES, MUSIC_DISCO_MODES } from "../types/smartdesk";

export interface ModeSelectModalProps {
  isOpen: boolean;
  isMusicMode?: boolean;
  selectedMode: number;
  onSelectMode: (modeId: number) => void;
  onClose: () => void;
}

export default function ModeSelectModal({
  isOpen,
  isMusicMode = false,
  selectedMode,
  onSelectMode,
  onClose,
}: ModeSelectModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modes = isMusicMode ? MUSIC_DISCO_MODES : LED_MODES;
  const title = isMusicMode ? "🎵 Select Disco Music Style" : "🌈 Select Ambient LED Mode";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg max-h-[85vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-bold font-mono text-cyan-300">{title}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Tap any style to apply instantly to the WS2812B array
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono cursor-pointer transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Mode Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectMode(m.id);
                  onClose();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer active:scale-98 ${
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-500/70 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "bg-zinc-900/70 hover:bg-zinc-850 border-zinc-800/90 text-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">
                    #{m.id}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-mono font-bold">{m.label}</div>
                  <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

