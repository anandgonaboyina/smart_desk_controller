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
  onSave: (rule: ScheduleRule) => void;
  onClose: () => void;
}

export default function ScheduleModal({
  isOpen,
  editingRule,
  onSave,
  onClose,
}: ScheduleModalProps) {
  const [rule, setRule] = useState<ScheduleRule | null>(null);

  useEffect(() => {
    if (editingRule) {
      setRule({ ...editingRule });
    }
  }, [editingRule]);

  if (!isOpen || !rule) return null;

  const toggleDay = (dayBit: number) => {
    setRule((prev) => {
      if (!prev) return null;
      return { ...prev, daysMask: prev.daysMask ^ (1 << dayBit) };
    });
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
                Start Time (24h):
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={rule.startHour}
                  onChange={(e) => setRule({ ...rule, startHour: Number(e.target.value) })}
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                />
                <span className="text-zinc-500">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={rule.startMin}
                  onChange={(e) => setRule({ ...rule, startMin: Number(e.target.value) })}
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                />
              </div>
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
                  value={rule.durationMin}
                  onChange={(e) => setRule({ ...rule, durationMin: Number(e.target.value) })}
                  className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
                />
                <span className="text-zinc-500">Minutes</span>
              </div>
            )}

            {rule.stopType === 2 && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={rule.stopHour}
                  onChange={(e) => setRule({ ...rule, stopHour: Number(e.target.value) })}
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                />
                <span className="text-zinc-500">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={rule.stopMin}
                  onChange={(e) => setRule({ ...rule, stopMin: Number(e.target.value) })}
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-center"
                />
              </div>
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
            onClick={() => {
              onSave(rule);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Save Rule to ESP32
          </button>
        </div>
      </div>
    </div>
  );
}

