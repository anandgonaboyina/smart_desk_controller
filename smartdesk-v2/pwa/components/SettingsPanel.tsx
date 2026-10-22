/**
 * SettingsPanel.tsx — System configuration, diagnostics & hardware lighting setup
 */

"use client";

import React, { useState, useEffect } from "react";
import { EnvData, LogEntry, MatrixConfig, MATRIX_SAFE_GPIO_PINS } from "../types/smartdesk";
import RenameModal from "./RenameModal";

export interface SettingsPanelProps {
  envData: EnvData;
  masterBuzzer: boolean;
  deviceName: string;
  connected: boolean;
  connecting: boolean;
  infoString: string;
  logs: LogEntry[];
  showAllDevices: boolean;
  setShowAllDevices: (val: boolean) => void;
  stripLength?: number;
  onSaveStripLength?: (len: number) => void;
  matrixConfig?: MatrixConfig;
  onSaveMatrixConfig?: (rows: number, cols: number, wiringType: number, pin?: number, enabled?: boolean) => void;
  onSetMatrixDisplay?: (mode: number, speed?: number, bri?: number, r?: number, g?: number, b?: number, text?: string) => void;
  onToggleMasterBuzzer: () => void;
  onTestBuzzer: (freqHz: number, durationMs: number) => void;
  onRename: (newName: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClearLogs: () => void;
}

export default function SettingsPanel({
  envData,
  masterBuzzer,
  deviceName,
  connected,
  infoString,
  logs,
  showAllDevices,
  setShowAllDevices,
  stripLength = 8,
  onSaveStripLength,
  matrixConfig,
  onSaveMatrixConfig,
  onSetMatrixDisplay,
  onToggleMasterBuzzer,
  onTestBuzzer,
  onRename,
  onDisconnect,
  onClearLogs,
}: SettingsPanelProps) {
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  // Local state for hardware configurations
  const [stripLenInput, setStripLenInput] = useState<number | string>(stripLength);
  const [mRows, setMRows] = useState<number | string>(matrixConfig?.rows || 8);
  const [mCols, setMCols] = useState<number | string>(matrixConfig?.cols || 32);
  const [mWiring, setMWiring] = useState<number>(matrixConfig?.wiringType ?? 1);
  const [mPin, setMPin] = useState<number>(matrixConfig?.pin || 11);
  const [mText, setMText] = useState<string>(matrixConfig?.text || "SMARTDESK V2");
  const [is12Hr, setIs12Hr] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIs12Hr(localStorage.getItem("smartdesk_12hr_mode") === "true");
    }
  }, []);

  const toggle12HrMode = () => {
    const nextVal = !is12Hr;
    setIs12Hr(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartdesk_12hr_mode", nextVal ? "true" : "false");
      window.dispatchEvent(new Event("storage"));
    }
  };

  useEffect(() => {
    if (stripLength) setStripLenInput(stripLength);
  }, [stripLength]);

  useEffect(() => {
    if (matrixConfig) {
      if (matrixConfig.rows) setMRows(matrixConfig.rows);
      if (matrixConfig.cols) setMCols(matrixConfig.cols);
      if (matrixConfig.wiringType !== undefined) setMWiring(matrixConfig.wiringType);
      if (matrixConfig.pin) setMPin(matrixConfig.pin);
      if (matrixConfig.text) setMText(matrixConfig.text);
    }
  }, [matrixConfig]);

  const handleCopyLogs = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join("\n"));
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none pb-16">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-3">
          <span>⚙️ System Setup &amp; Hardware</span>
        </h2>
        {connected ? (
          <button
            onClick={onDisconnect}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-500 font-extrabold text-sm active:scale-95 cursor-pointer"
          >
            Disconnect Desk
          </button>
        ) : (
          <div className="text-xs font-bold text-zinc-500">Not connected</div>
        )}
      </div>

      {/* ── SENSORS & BUZZER ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">DHT11 Environmental Sensor GPIO 9(check once hardcoded)</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${envData.valid ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "bg-zinc-800 text-zinc-500"}`}>
              {envData.valid ? "Sensor Active" : "No Sensor"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-black border-2 border-zinc-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">Temp</span>
                <span className="text-xl font-bold text-white">{envData.valid ? `${envData.tempC.toFixed(1)}°C` : "--"}</span>
              </div>
              <span className="text-2xl">🌡️</span>
            </div>
            <div className="p-4 rounded-lg bg-black border-2 border-zinc-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">Humidity</span>
                <span className="text-xl font-bold text-white">{envData.valid ? `${envData.humidity.toFixed(0)}%` : "--"}</span>
              </div>
              <span className="text-2xl">💧</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-400 font-extrabold uppercase">Acoustic Buzzer</span>
            <button
              onClick={onToggleMasterBuzzer}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 cursor-pointer ${
                masterBuzzer ? "bg-emerald-600 text-white border-emerald-500" : "bg-zinc-800 text-zinc-400 border-zinc-600"
              }`}
            >
              {masterBuzzer ? "BUZZER ON" : "MUTED"}
            </button>
          </div>
          <div className="flex gap-2 h-full items-end">
            <button
              onClick={() => onTestBuzzer(2400, 150)}
              className="flex-1 py-3 rounded-lg bg-black border-2 border-zinc-600 text-white text-xs font-bold active:scale-95 cursor-pointer"
            >
              🔊 Short Beep
            </button>
            <button
              onClick={() => onTestBuzzer(3200, 350)}
              className="flex-1 py-3 rounded-lg bg-cyan-900 border-2 border-cyan-600 text-cyan-300 text-xs font-bold active:scale-95 cursor-pointer"
            >
              🔔 Alert Chime
            </button>
          </div>
        </div>
      </div>

      {/* ── HARDWARE LIGHTING & 2D MATRIX CONFIG ── */}
      <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white font-extrabold uppercase">Hardware Strip &amp; 2D Matrix Setup</span>
          <span className="text-[10px] text-cyan-400 font-bold">Dynamic NVS Memory</span>
        </div>

        {/* Strip Length */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Primary LED Strip (GPIO 8):</span>
            <span className="text-[10px] text-zinc-300 font-bold">Current: {stripLength} LEDs</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="800"
              value={stripLenInput}
              onChange={(e) => setStripLenInput(e.target.value === "" ? "" : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white font-bold text-xs"
            />
            <button
              type="button"
              onClick={() => onSaveStripLength?.(Math.max(1, Math.min(800, Number(stripLenInput) || 8)))}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs cursor-pointer active:scale-95"
            >
              Set Strip (0xF3)
            </button>
          </div>
        </div>

        {/* Matrix Configuration */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-cyan-400 font-bold uppercase">2D Matrix Display (GPIO {mPin}):</span>
            <span className="text-[10px] text-zinc-400">{mCols}x{mRows} Grid ({Number(mCols) * Number(mRows)} LEDs)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[9px] text-zinc-500 font-bold block mb-0.5">ROWS:</label>
              <input
                type="number"
                min="1"
                max="64"
                value={mRows}
                onChange={(e) => setMRows(e.target.value === "" ? "" : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full bg-black border border-zinc-700 rounded-lg p-1.5 text-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold block mb-0.5">COLS:</label>
              <input
                type="number"
                min="1"
                max="128"
                value={mCols}
                onChange={(e) => setMCols(e.target.value === "" ? "" : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full bg-black border border-zinc-700 rounded-lg p-1.5 text-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold block mb-0.5">DATA GPIO PIN:</label>
              <select
                value={mPin}
                onChange={(e) => setMPin(Number(e.target.value))}
                className="w-full bg-black border border-zinc-700 rounded-lg p-1.5 text-white text-xs font-bold focus:border-cyan-500 outline-none cursor-pointer"
              >
                {MATRIX_SAFE_GPIO_PINS.map((item) => (
                  <option key={item.pin} value={item.pin}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold block mb-0.5">WIRING:</label>
              <button
                type="button"
                onClick={() => setMWiring(mWiring === 1 ? 0 : 1)}
                className="w-full py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] font-extrabold text-white cursor-pointer"
              >
                {mWiring === 1 ? "Zig-Zag" : "Normal"}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSaveMatrixConfig?.(Math.max(1, Math.min(64, Number(mRows) || 8)), Math.max(1, Math.min(128, Number(mCols) || 32)), mWiring, mPin, matrixConfig?.enabled ?? true)}
            className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-extrabold text-xs cursor-pointer active:scale-95"
          >
            Save Matrix Hardware (0xF2)
          </button>

          {/* Marquee Custom Text Field */}
          <div className="pt-2 border-t border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-cyan-400 font-bold uppercase">Custom Marquee Text:</span>
              <span className="text-[10px] text-zinc-500">{mText.length}/60 chars</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={60}
                value={mText}
                onChange={(e) => setMText(e.target.value)}
                placeholder="Enter marquee text..."
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs font-bold focus:border-cyan-500 outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  onSetMatrixDisplay?.(
                    18,
                    matrixConfig?.speed ?? 5,
                    matrixConfig?.bri ?? 70,
                    matrixConfig?.colorR ?? 0,
                    matrixConfig?.colorG ?? 240,
                    matrixConfig?.colorB ?? 255,
                    mText
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs cursor-pointer whitespace-nowrap active:scale-95"
              >
                Send Text (0xF1)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DEVICE IDENTITY & PREFERENCES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Device Identity</span>
            <button
              onClick={() => setShowRenameModal(true)}
              className="px-4 py-2 rounded-lg bg-zinc-800 border-2 border-zinc-600 text-white text-xs font-bold active:scale-95 cursor-pointer"
            >
              Rename ✏️
            </button>
          </div>
          <div className="text-xl text-white font-extrabold bg-black p-3 rounded-lg border-2 border-zinc-700">
            {deviceName}
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-400 font-bold">Accept All Bluetooth:</span>
            <button
              onClick={() => setShowAllDevices(!showAllDevices)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 cursor-pointer ${
                showAllDevices ? "bg-amber-600 border-amber-500 text-white" : "bg-black border-zinc-600 text-zinc-500"
              }`}
            >
              {showAllDevices ? "YES" : "FILTERED"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div>
              <span className="text-xs text-zinc-300 font-extrabold block">Time Format:</span>
              <span className="text-[10px] text-zinc-500">12-Hour AM/PM vs 24-Hour Military format</span>
            </div>
            <button
              type="button"
              onClick={toggle12HrMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all active:scale-95 cursor-pointer ${
                is12Hr ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
            >
              {is12Hr ? "12-HOUR (AM/PM)" : "24-HOUR (DEFAULT)"}
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col flex-1 max-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Live BLE Logs</span>
            <div className="flex gap-3">
              <button onClick={handleCopyLogs} className="text-xs font-bold text-cyan-400 cursor-pointer">
                {copiedLogs ? "Copied! ✓" : "Copy"}
              </button>
              <button onClick={onClearLogs} className="text-xs font-bold text-rose-400 cursor-pointer">
                Clear
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] p-2 bg-black rounded-lg border border-zinc-800 scrollbar-hide">
            {logs.length === 0 ? (
              <div className="text-zinc-600 italic">No logs yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-zinc-500 shrink-0">{log.time}</span>
                  <span className={`shrink-0 font-bold ${log.type === "err" ? "text-rose-400" : log.type === "warn" ? "text-amber-400" : log.type === "tx" ? "text-cyan-400" : log.type === "rx" ? "text-emerald-400" : "text-zinc-400"}`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-zinc-300 break-all">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <RenameModal
        isOpen={showRenameModal}
        currentName={deviceName}
        onSave={onRename}
        onClose={() => setShowRenameModal(false)}
      />
    </div>
  );
}
