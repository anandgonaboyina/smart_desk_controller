/**
 * RelayConfigModal.tsx — Accessible popup modal for individual relay configuration.
 *
 * Purpose : Configures channel label, NO/NC wiring, animations, and buzzer beeps.
 * Depends : React, types/smartdesk.ts.
 * Used by : RelayPanel.tsx.
 */

"use client";

import React, { useState, useEffect } from "react";
import { RelayConfigItem, RELAY_ANIM_OPTIONS } from "../types/smartdesk";

export interface RelayConfigModalProps {
  isOpen: boolean;
  relayIndex: number;
  config: RelayConfigItem;
  onSave: (
    idx: number,
    newName: string,
    wiring: number,
    onEn: boolean,
    onMd: number,
    onDu: number,
    offEn: boolean,
    offMd: number,
    offDu: number,
    beepOn: boolean,
    beepOff: boolean,
    beepEnd: boolean
  ) => void;
  onClose: () => void;
}

export default function RelayConfigModal({
  isOpen,
  relayIndex,
  config,
  onSave,
  onClose,
}: RelayConfigModalProps) {
  const [name, setName] = useState<string>(config?.name || `Relay ${relayIndex + 1}`);
  const [wiring, setWiring] = useState<number>(config?.wiring || 0);
  const [onEn, setOnEn] = useState<boolean>(config?.onAnimEnabled ?? true);
  const [onMd, setOnMd] = useState<number>(config?.onAnimMode || 1);
  const [onDu, setOnDu] = useState<number | string>(config?.onAnimDuration || 2);
  const [offEn, setOffEn] = useState<boolean>(config?.offAnimEnabled ?? true);
  const [offMd, setOffMd] = useState<number>(config?.offAnimMode || 3);
  const [offDu, setOffDu] = useState<number | string>(config?.offAnimDuration || 2);
  const [beepOn, setBeepOn] = useState<boolean>(config?.beepOn ?? true);
  const [beepOff, setBeepOff] = useState<boolean>(config?.beepOff ?? true);
  const [beepEnd, setBeepEnd] = useState<boolean>(config?.beepTimerEnd ?? true);

  useEffect(() => {
    if (config) {
      setName(config.name);
      setWiring(config.wiring);
      setOnEn(config.onAnimEnabled);
      setOnMd(config.onAnimMode);
      setOnDu(config.onAnimDuration);
      setOffEn(config.offAnimEnabled);
      setOffMd(config.offAnimMode);
      setOffDu(config.offAnimDuration);
      setBeepOn(config.beepOn ?? true);
      setBeepOff(config.beepOff ?? true);
      setBeepEnd(config.beepTimerEnd ?? true);
    }
  }, [config, relayIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-bold font-mono text-cyan-300">
              Configure Channel #{relayIndex + 1}
            </h3>
            <p className="text-[11px] text-zinc-400">
              Wiring contacts, animations &amp; audible notifications
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Channel Name */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Custom Name:
            </label>
            <input
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Wiring Mode */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Physical Wiring Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWiring(0)}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  wiring === 0
                    ? "bg-cyan-500/20 border-cyan-500/80 text-cyan-200 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                NO (Normally Open)
              </button>
              <button
                type="button"
                onClick={() => setWiring(1)}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  wiring === 1
                    ? "bg-amber-500/20 border-amber-500/80 text-amber-200 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                NC (Normally Closed)
              </button>
            </div>
          </div>

          {/* Buzzer Feedback */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Audible Beeps (Active Buzzer B27):
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setBeepOn(!beepOn)}
                className={`py-1 px-2 rounded border text-center transition-all cursor-pointer ${
                  beepOn
                    ? "bg-emerald-950/70 border-emerald-600/70 text-emerald-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                ON: {beepOn ? "✓" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => setBeepOff(!beepOff)}
                className={`py-1 px-2 rounded border text-center transition-all cursor-pointer ${
                  beepOff
                    ? "bg-rose-950/70 border-rose-600/70 text-rose-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                OFF: {beepOff ? "✓" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => setBeepEnd(!beepEnd)}
                className={`py-1 px-2 rounded border text-center transition-all cursor-pointer ${
                  beepEnd
                    ? "bg-amber-950/70 border-amber-600/70 text-amber-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                Timer: {beepEnd ? "✓" : "OFF"}
              </button>
            </div>
          </div>

          {/* Turn ON Animation */}
          <div className="pt-2 border-t border-zinc-850">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase text-zinc-400 font-bold">
                Turn ON RGB Action:
              </label>
              <button
                type="button"
                onClick={() => setOnEn(!onEn)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                  onEn ? "bg-emerald-900/60 border-emerald-600 text-emerald-300" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}
              >
                {onEn ? "ENABLED" : "DISABLED"}
              </button>
            </div>
            {onEn && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={onMd}
                  onChange={(e) => setOnMd(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                >
                  {RELAY_ANIM_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={onDu}
                    onChange={(e) => setOnDu(e.target.value === "" ? "" : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                  />
                  <span className="text-zinc-500 text-[10px]">sec</span>
                </div>
              </div>
            )}
          </div>

          {/* Turn OFF Animation */}
          <div className="pt-2 border-t border-zinc-850">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase text-zinc-400 font-bold">
                Turn OFF RGB Action:
              </label>
              <button
                type="button"
                onClick={() => setOffEn(!offEn)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                  offEn ? "bg-rose-900/60 border-rose-600 text-rose-300" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}
              >
                {offEn ? "ENABLED" : "DISABLED"}
              </button>
            </div>
            {offEn && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={offMd}
                  onChange={(e) => setOffMd(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                >
                  {RELAY_ANIM_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={offDu}
                    onChange={(e) => setOffDu(e.target.value === "" ? "" : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                  />
                  <span className="text-zinc-500 text-[10px]">sec</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(relayIndex, name, wiring, onEn, onMd, Math.max(1, Math.min(10, Number(onDu) || 2)), offEn, offMd, Math.max(1, Math.min(10, Number(offDu) || 2)), beepOn, beepOff, beepEnd);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Save to Flash
          </button>
        </div>
      </div>
    </div>
  );
}

