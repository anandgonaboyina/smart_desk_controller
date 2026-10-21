"use client";

import React, { useState, useEffect } from "react";
import { ScheduleRule, EspClock, DAYS_OF_WEEK } from "../types/smartdesk";
import ScheduleModal from "./ScheduleModal";

export interface SchedulePanelProps {
  schedules: ScheduleRule[]; espClock: EspClock;
  onSaveRule: (rule: ScheduleRule) => void; onDeleteRule: (ruleId: number) => void;
  onTestRule: (ruleId: number, isStart: boolean) => void; onSyncClock: () => void;
}

export default function SchedulePanel({ schedules, espClock, onSaveRule, onDeleteRule, onTestRule, onSyncClock }: SchedulePanelProps) {
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null);
  const [is12Hr, setIs12Hr] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIs12Hr(localStorage.getItem("smartdesk_12hr_mode") === "true");
    }
  }, []);

  const formatTime = (h: number, m: number) => {
    if (is12Hr) {
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handleAddNew = () => {
    const nextId = [0, 1, 2, 3, 4, 5, 6, 7].find((id) => !schedules.some((s) => s.id === id)) ?? schedules.length;
    setEditingRule({ id: nextId, enabled: true, name: `Rule ${nextId + 1}`, daysMask: 127, startHour: 9, startMin: 0, stopType: 1, durationMin: 120, stopHour: 17, stopMin: 0, targetType: 0, targetAction: 1, rgbR: 0, rgbG: 180, rgbB: 255, rgbBri: 50 });
  };

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 shrink-0">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-3">
            <span>📅 Automations</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900 px-2 py-1 rounded-md border-2 border-emerald-600">ESP32 Flash</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1 font-bold">
            Host: {espClock.synced ? `${String(espClock.hour).padStart(2, "0")}:${String(espClock.minute).padStart(2, "0")} (${DAYS_OF_WEEK[espClock.dayOfWeek]})` : "Syncing..."}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSyncClock} className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-xs font-extrabold border-2 border-zinc-600 active:scale-95">🔄 Sync Time</button>
          {schedules.length < 8 && <button onClick={handleAddNew} className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-extrabold text-xs border-2 border-cyan-400 active:scale-95">+ Add Rule</button>}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
        {schedules.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-900 border-2 border-zinc-700 text-center text-zinc-400 text-sm font-bold">No schedules saved.</div>
        ) : (
          schedules.map((rule) => {
            const targetLabel = rule.targetType === 4 ? "All Relays" : rule.targetType === 5 ? "RGB Strip" : `CH${rule.targetType + 1}`;
            return (
              <div key={rule.id} className={`p-4 rounded-xl border-2 flex flex-col lg:flex-row lg:items-center gap-4 shadow-lg ${rule.enabled ? "bg-zinc-900 border-cyan-500" : "bg-black border-zinc-700 opacity-60"}`}>
                <div className="flex items-center justify-between lg:w-1/3">
                  <div className="flex items-center gap-3 truncate">
                    <button onClick={() => onSaveRule({ ...rule, enabled: !rule.enabled })} className={`w-12 h-6 rounded-full p-1 transition-all shrink-0 ${rule.enabled ? "bg-cyan-500" : "bg-zinc-700"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                    <span className="font-extrabold text-white text-base truncate">{rule.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm bg-black p-3 rounded-lg border-2 border-zinc-700 lg:w-1/3">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{formatTime(rule.startHour, rule.startMin)}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="text-zinc-300">{rule.stopType === 1 ? `for ${rule.durationMin}m` : rule.stopType === 2 ? `until ${formatTime(rule.stopHour, rule.stopMin)}` : "Indefinite"}</span>
                  </div>
                  <span className="text-cyan-300 font-extrabold">{targetLabel}</span>
                </div>

                <div className="flex items-center justify-between gap-3 lg:w-1/3">
                  <div className="flex gap-1 flex-1">
                    {DAYS_OF_WEEK.map((d, bit) => (
                      <span key={d} className={`text-[10px] flex-1 text-center py-1.5 rounded font-extrabold border-2 ${rule.daysMask & (1 << bit) ? "bg-cyan-600 text-white border-cyan-400" : "bg-black text-zinc-600 border-zinc-800"}`}>{d[0]}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingRule(rule)} className="px-4 py-2 rounded-lg bg-zinc-800 text-white border-2 border-zinc-600 text-xs font-bold active:scale-95">Edit</button>
                    <button onClick={() => onDeleteRule(rule.id)} className="px-4 py-2 rounded-lg bg-rose-600 text-white border-2 border-rose-500 text-xs font-bold active:scale-95">✕</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingRule && <ScheduleModal isOpen={true} editingRule={editingRule} is12Hr={is12Hr} onSave={onSaveRule} onClose={() => setEditingRule(null)} />}
    </div>
  );
}