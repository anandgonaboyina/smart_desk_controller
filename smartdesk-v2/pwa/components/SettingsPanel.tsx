"use client";

import React, { useState } from "react";
import { EnvData, LogEntry } from "../types/smartdesk";
import RenameModal from "./RenameModal";

export interface SettingsPanelProps {
  envData: EnvData; masterBuzzer: boolean; deviceName: string; connected: boolean; connecting: boolean;
  infoString: string; logs: LogEntry[]; showAllDevices: boolean; setShowAllDevices: (val: boolean) => void;
  onToggleMasterBuzzer: () => void; onTestBuzzer: (freqHz: number, durationMs: number) => void;
  onRename: (newName: string) => void; onConnect: () => void; onDisconnect: () => void; onClearLogs: () => void;
}

export default function SettingsPanel({
  envData, masterBuzzer, deviceName, connected, connecting, infoString, logs,
  showAllDevices, setShowAllDevices, onToggleMasterBuzzer, onTestBuzzer, onRename, onConnect, onDisconnect, onClearLogs,
}: SettingsPanelProps) {
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  const handleCopyLogs = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join("\n"));
      setCopiedLogs(true); setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none h-full">
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-3">
          <span>⚙️ System Setup</span>
        </h2>
        {connected ? (
          <button onClick={onDisconnect} className="px-5 py-2 rounded-xl bg-rose-600 text-white border-2 border-rose-500 font-extrabold text-sm active:scale-95">Disconnect</button>
        ) : (
          <button onClick={onConnect} className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-extrabold text-sm border-2 border-cyan-400 active:scale-95">{connecting ? "Connecting..." : "Connect"}</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-400 font-extrabold uppercase">DHT11 Climate Sensor</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${envData.valid ? "bg-emerald-900 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>{envData.valid ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-black border-2 border-zinc-700 flex justify-between items-center">
              <div><span className="text-[10px] text-zinc-500 font-bold uppercase block">Temp</span><span className="text-xl font-bold text-white">{envData.valid ? `${envData.tempC.toFixed(1)}°C` : "--"}</span></div>
              <span className="text-2xl">🌡️</span>
            </div>
            <div className="p-4 rounded-lg bg-black border-2 border-zinc-700 flex justify-between items-center">
              <div><span className="text-[10px] text-zinc-500 font-bold uppercase block">Humidity</span><span className="text-xl font-bold text-white">{envData.valid ? `${envData.humidity.toFixed(0)}%` : "--"}</span></div>
              <span className="text-2xl">💧</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-400 font-extrabold uppercase">Acoustic Buzzer</span>
            <button onClick={onToggleMasterBuzzer} className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${masterBuzzer ? "bg-emerald-600 text-white border-emerald-500" : "bg-zinc-800 text-zinc-400 border-zinc-600"}`}>
              {masterBuzzer ? "BUZZER ON" : "MUTED"}
            </button>
          </div>
          <div className="flex gap-2 h-full items-end">
            <button onClick={() => onTestBuzzer(2400, 150)} className="flex-1 py-3 rounded-lg bg-black border-2 border-zinc-600 text-white text-xs font-bold active:scale-95">🔊 Short Beep</button>
            <button onClick={() => onTestBuzzer(3200, 350)} className="flex-1 py-3 rounded-lg bg-cyan-900 border-2 border-cyan-600 text-cyan-300 text-xs font-bold active:scale-95">🔔 Alert Chime</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Device Identity</span>
            <button onClick={() => setShowRenameModal(true)} className="px-4 py-2 rounded-lg bg-zinc-800 border-2 border-zinc-600 text-white text-xs font-bold active:scale-95">Rename ✏️</button>
          </div>
          <div className="text-xl text-white font-extrabold bg-black p-3 rounded-lg border-2 border-zinc-700">{deviceName}</div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-400 font-bold">Accept All Bluetooth:</span>
            <button onClick={() => setShowAllDevices(!showAllDevices)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${showAllDevices ? "bg-amber-600 border-amber-500 text-white" : "bg-black border-zinc-600 text-zinc-500"}`}>
              {showAllDevices ? "YES" : "FILTERED"}
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col flex-1 max-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Live BLE Logs</span>
            <div className="flex gap-3">
              <button onClick={handleCopyLogs} className="text-xs font-bold text-cyan-400">{copiedLogs ? "Copied! ✓" : "Copy"}</button>
              <button onClick={onClearLogs} className="text-xs font-bold text-rose-400">Clear</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg bg-black border-2 border-zinc-700 p-3 font-mono text-[10px] leading-relaxed">
            {logs.length === 0 ? <div className="text-zinc-600 font-bold">No events logged.</div> : logs.map((l) => (
              <div key={l.id} className={l.type === "err" ? "text-rose-500 font-bold" : l.type === "warn" ? "text-amber-500" : l.type === "tx" ? "text-cyan-500" : l.type === "rx" ? "text-emerald-500" : "text-zinc-400"}>[{l.time}] {l.text}</div>
            ))}
          </div>
        </div>
      </div>

      <RenameModal isOpen={showRenameModal} currentName={deviceName} onSave={onRename} onClose={() => setShowRenameModal(false)} />
    </div>
  );
}