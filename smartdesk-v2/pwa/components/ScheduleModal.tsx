/**
 * ScheduleModal.tsx — Accessible popup modal for weekly schedule rules.
 *
 * Purpose : Add/edit autonomous schedule rule with days mask, target, time and action.
 * Depends : React, types/smartdesk.ts.
 * Used by : SchedulePanel.tsx.
 */

"use client";

import React, { useState, useEffect } from "react";
import { ScheduleRule, DAYS_OF_WEEK } from "../types/smartdesk";

export interface ScheduleModalProps {
  isOpen: boolean;
  editingRule: ScheduleRule | null;
  is12Hr?: boolean;
  onSave: (rule: ScheduleRule) => void;
  onClose: () => void;
}

export default function ScheduleModal({
  isOpen,
  editingRule,
  is12Hr = false,
  onSave,
  onClose,
}: ScheduleModalProps) {
  const [rule, setRule] = useState<ScheduleRule | null>(null);

  // String states for numeric fields allowing clean wipe / single-digit typing
  const [startH, setStartH] = useState<string>("9");
  const [startM, setStartM] = useState<string>("00");
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">("AM");
  const [stopH, setStopH] = useState<string>("5");
  const [stopM, setStopM] = useState<string>("00");
  const [stopAmPm, setStopAmPm] = useState<"AM" | "PM">("PM");
  const [durationStr, setDurationStr] = useState<string>("480");

  useEffect(() => {
    if (editingRule) {
      setRule({ ...editingRule });
      if (is12Hr) {
        const h12 = editingRule.startHour % 12 || 12;
        setStartH(String(h12));
        setStartAmPm(editingRule.startHour >= 12 ? "PM" : "AM");
        const stopH12 = editingRule.stopHour % 12 || 12;
        setStopH(String(stopH12));
        setStopAmPm(editingRule.stopHour >= 12 ? "PM" : "AM");
      } else {
        setStartH(String(editingRule.startHour));
        setStopH(String(editingRule.stopHour));
      }
      setStartM(String(editingRule.startMin).padStart(2, "0"));
      setStopM(String(editingRule.stopMin).padStart(2, "0"));
      setDurationStr(String(editingRule.durationMin || 30));
    }
  }, [editingRule, is12Hr]);

  if (!isOpen || !rule) return null;

  const toggleDay = (dayBit: number) => {
    setRule((prev) => {
      if (!prev) return null;
      return { ...prev, daysMask: prev.daysMask ^ (1 << dayBit) };
    });
  };

  const handleSave = () => {
    if (!rule) return;
    let finalStartH = 0;
    if (is12Hr) {
      const h = Math.max(1, Math.min(12, parseInt(startH, 10) || 12));
      finalStartH = startAmPm === "PM" ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    } else {
      finalStartH = Math.max(0, Math.min(23, parseInt(startH, 10) || 0));
    }
    const finalStartM = Math.max(0, Math.min(59, parseInt(startM, 10) || 0));

    let finalStopH = 0;
    if (is12Hr) {
      const h = Math.max(1, Math.min(12, parseInt(stopH, 10) || 12));
      finalStopH = stopAmPm === "PM" ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    } else {
      finalStopH = Math.max(0, Math.min(23, parseInt(stopH, 10) || 0));
    }
    const finalStopM = Math.max(0, Math.min(59, parseInt(stopM, 10) || 0));
    const finalDur = Math.max(1, Math.min(1440, parseInt(durationStr, 10) || 30));

    onSave({
      ...rule,
      startHour: finalStartH,
      startMin: finalStartM,
      stopHour: finalStopH,
      stopMin: finalStopM,
      durationMin: finalDur,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-white font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-bold text-cyan-300">
              Schedule Rule #{rule.id + 1}
            </h3>
            <p className="text-[11px] text-zinc-400">
              Autonomous ESP32 timer, works even if browser is closed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Rule Name */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Rule Name:
            </label>
            <input
              type="text"
              maxLength={20}
              value={rule.name}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              onFocus={(e) => e.target.select()}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Active Days */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Active Days:
            </label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d, bit) => {
                const isSelected = Boolean(rule.daysMask & (1 << bit));
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(bit)}
                    className={`py-1.5 rounded text-center text-[10px] font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/25 border-cyan-500 text-cyan-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
                Start Time {is12Hr ? "(12h AM/PM)" : "(24h)"}:
              </label>
              {is12Hr ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={startH}
                    onChange={(e) => setStartH(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-white text-center font-bold"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={startM}
                    onChange={(e) => setStartM(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-white text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setStartAmPm(startAmPm === "AM" ? "PM" : "AM")}
                    className="px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-[10px] font-extrabold text-cyan-300 active:scale-95 cursor-pointer"
                  >
                    {startAmPm}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={startH}
                    onChange={(e) => setStartH(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={startM}
                    onChange={(e) => setStartM(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                  />
                </div>
              )}
            </div>

            {/* Target Channel */}
            <div>
              <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
                Target Device:
              </label>
              <select
                value={rule.targetType}
                onChange={(e) => setRule({ ...rule, targetType: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
              >
                <option value={0}>CH1 (Relay 1)</option>
                <option value={1}>CH2 (Relay 2)</option>
                <option value={2}>CH3 (Relay 3)</option>
                <option value={3}>CH4 (Relay 4)</option>
                <option value={4}>All 4 Relays</option>
                <option value={5}>RGB Strip</option>
              </select>
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Action to Execute:
            </label>
            {rule.targetType === 5 ? (
              <select
                value={rule.targetAction}
                onChange={(e) => setRule({ ...rule, targetAction: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
              >
                <option value={0}>Turn RGB OFF</option>
                <option value={1}>Solid Color</option>
                <option value={2}>Breathe (Fade)</option>
                <option value={3}>Rainbow Glow</option>
                <option value={15}>Aurora Wave</option>
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRule({ ...rule, targetAction: 1 })}
                  className={`p-1.5 rounded border text-center transition-all cursor-pointer ${
                    rule.targetAction === 1
                      ? "bg-emerald-500/25 border-emerald-500 text-emerald-200 font-bold"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  Turn ON
                </button>
                <button
                  type="button"
                  onClick={() => setRule({ ...rule, targetAction: 0 })}
                  className={`p-1.5 rounded border text-center transition-all cursor-pointer ${
                    rule.targetAction === 0
                      ? "bg-rose-500/25 border-rose-500 text-rose-200 font-bold"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  Turn OFF
                </button>
              </div>
            )}
          </div>

          {/* Duration or Stop Time */}
          <div className="pt-2 border-t border-zinc-850">
            <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
              Stop Condition:
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setRule({ ...rule, stopType: 1 })}
                className={`flex-1 py-1 rounded border text-center text-[10px] ${
                  rule.stopType === 1 ? "bg-cyan-500/20 border-cyan-500 text-cyan-200" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                Duration (Min)
              </button>
              <button
                type="button"
                onClick={() => setRule({ ...rule, stopType: 2 })}
                className={`flex-1 py-1 rounded border text-center text-[10px] ${
                  rule.stopType === 2 ? "bg-cyan-500/20 border-cyan-500 text-cyan-200" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                Direct Stop Time
              </button>
              <button
                type="button"
                onClick={() => setRule({ ...rule, stopType: 0 })}
                className={`flex-1 py-1 rounded border text-center text-[10px] ${
                  rule.stopType === 0 ? "bg-cyan-500/20 border-cyan-500 text-cyan-200" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                No Stop
              </button>
            </div>

            {rule.stopType === 1 && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
                />
                <span className="text-zinc-500">Minutes</span>
              </div>
            )}

            {rule.stopType === 2 && (
              is12Hr ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={stopH}
                    onChange={(e) => setStopH(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-white text-center font-bold"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={stopM}
                    onChange={(e) => setStopM(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-white text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setStopAmPm(stopAmPm === "AM" ? "PM" : "AM")}
                    className="px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-[10px] font-extrabold text-cyan-300 active:scale-95 cursor-pointer"
                  >
                    {stopAmPm}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={stopH}
                    onChange={(e) => setStopH(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={stopM}
                    onChange={(e) => setStopM(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Save Rule to ESP32
          </button>
        </div>
      </div>
    </div>
  );
}
