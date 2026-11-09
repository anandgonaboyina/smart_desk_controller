/**
 * SettingsPanel.tsx — System configuration, diagnostics & hardware lighting setup
 */

"use client";

import React, { useState, useEffect } from "react";
import { EnvData, LogEntry, MatrixConfig, MATRIX_SAFE_GPIO_PINS } from "../types/smartdesk";
import RenameModal from "./RenameModal";
import WifiManagerModal from "./WifiManagerModal";

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
  wifiHost?: string;
  wifiConnected?: boolean;
  wifiIp?: string;
  wifiSsid?: string;
  wifiOnAwayOnly?: boolean;
  onUpdateWifiHost?: (host: string) => void;
  onToggleWifiOnAwayOnly?: (enabled: boolean) => void;
  onConfigureOverBle?: (ssid: string, pass?: string, user?: string, cpPass?: string) => Promise<void>;
  cloudUser?: string;
  cloudPassword?: string;
  onUpdateCloudCredentials?: (user: string, pass: string) => void;
  onSetTempOffset?: (offset: number) => void;
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
  wifiHost = "192.168.4.1",
  wifiConnected = false,
  wifiIp = "",
  wifiSsid = "",
  wifiOnAwayOnly = false,
  onUpdateWifiHost,
  onToggleWifiOnAwayOnly,
  onConfigureOverBle,
  cloudUser = "user_anand_primary",
  cloudPassword = "",
  onUpdateCloudCredentials,
  onSetTempOffset,
}: SettingsPanelProps) {
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [showWifiModal, setShowWifiModal] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [hostInput, setHostInput] = useState<string>(wifiHost);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testingWifi, setTestingWifi] = useState<boolean>(false);

  const [inputCloudUser, setInputCloudUser] = useState<string>(cloudUser);
  const [inputCloudPass, setInputCloudPass] = useState<string>(cloudPassword);
  const [showCloudPass, setShowCloudPass] = useState<boolean>(false);
  const [credSavedMsg, setCredSavedMsg] = useState<boolean>(false);

  // Temperature Calibration Offset
  const [tempOffset, setTempOffset] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartdesk_temp_offset");
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });

  const handleUpdateTempOffset = (val: number) => {
    const clamped = Math.round(Math.max(-15, Math.min(15, val)) * 10) / 10;
    setTempOffset(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartdesk_temp_offset", clamped.toString());
    }
    onSetTempOffset?.(clamped);
  };

  useEffect(() => {
    if (cloudUser) setInputCloudUser(cloudUser);
  }, [cloudUser]);

  useEffect(() => {
    if (cloudPassword !== undefined) setInputCloudPass(cloudPassword);
  }, [cloudPassword]);

  const handleSaveCredentials = () => {
    onUpdateCloudCredentials?.(inputCloudUser.trim(), inputCloudPass);
    setCredSavedMsg(true);
    setTimeout(() => setCredSavedMsg(false), 2500);
  };

  useEffect(() => {
    if (wifiHost) setHostInput(wifiHost);
  }, [wifiHost]);

  const handleTestWifi = async () => {
    setTestingWifi(true);
    setTestStatus("Connecting to " + hostInput + "...");
    try {
      const res = await fetch(`http://${hostInput}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setTestStatus(`Connected! IP: ${data.ip || "AP Mode"} (RSSI: ${data.rssi || 0}dBm)`);
        onUpdateWifiHost?.(hostInput);
      } else {
        setTestStatus(`Error: HTTP ${res.status}`);
      }
    } catch (e: any) {
      setTestStatus(`Failed to connect to http://${hostInput}: ${e?.message || "Timeout/Unreachable"}`);
    } finally {
      setTestingWifi(false);
    }
  };

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
    <div className="flex flex-col gap-3 md:gap-5 w-full font-sans select-none pb-16 text-white max-w-full overflow-hidden">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-2 md:px-0 shrink-0 border-b border-white/50 pb-2 md:pb-3">
        <h2 className="text-[14px] md:text-xl font-extrabold flex items-center gap-2">
          <span>⚙️</span>
          <span>System Setup</span>
        </h2>
        {connected ? (
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 md:px-5 md:py-2 rounded-lg md:rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px] md:text-sm active:scale-95 cursor-pointer transition-all whitespace-nowrap"
          >
            Disconnect Desk
          </button>
        ) : (
          <div className="text-[10px] md:text-xs font-bold text-white/40">Not connected</div>
        )}
      </div>

      {/* ── SENSORS & BUZZER ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 shrink-0">
        
        {/* Environment Sensor Box */}
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 flex flex-col gap-2.5 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[9px] md:text-xs text-white/50 font-bold uppercase tracking-widest break-words whitespace-normal leading-tight">
              DHT11 Env Sensor (GPIO 9)
            </span>
            <span className={`text-[8px] md:text-[10px] font-bold px-2 py-0.5 md:py-1 rounded self-start sm:self-auto uppercase tracking-wider ${envData.valid ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-black/50 text-white/30 border border-white/40"}`}>
              {envData.valid ? "Sensor Active" : "No Sensor"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div className="p-2.5 md:p-4 rounded-lg md:rounded-xl bg-black/40 border border-white/50 flex justify-between items-center min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase block truncate">Temp</span>
                <span className="text-[14px] md:text-2xl font-black text-white truncate block">{envData.valid ? `${envData.tempC.toFixed(1)}°C` : "--"}</span>
              </div>
              <span className="text-lg md:text-2xl shrink-0 opacity-80">🌡️</span>
            </div>
            <div className="p-2.5 md:p-4 rounded-lg md:rounded-xl bg-black/40 border border-white/50 flex justify-between items-center min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase block truncate">Humidity</span>
                <span className="text-[14px] md:text-2xl font-black text-white truncate block">{envData.valid ? `${envData.humidity.toFixed(0)}%` : "--"}</span>
              </div>
              <span className="text-lg md:text-2xl shrink-0 opacity-80">💧</span>
            </div>
          </div>

          {/* Temperature Calibration Offset */}
          <div className="mt-1 md:mt-2 p-2 md:p-3.5 rounded-lg md:rounded-xl bg-black/30 border border-white/50 space-y-2 md:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-wider">Calibration Offset:</span>
              <span className="text-[10px] md:text-xs font-mono font-bold text-cyan-400">
                {tempOffset > 0 ? `+${tempOffset.toFixed(1)}°C` : `${tempOffset.toFixed(1)}°C`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3">
              <button
                type="button"
                onClick={() => handleUpdateTempOffset(tempOffset - 1.0)}
                className="px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] md:text-xs active:scale-95 cursor-pointer shrink-0"
              >
                -1°C
              </button>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={tempOffset}
                onChange={(e) => handleUpdateTempOffset(parseFloat(e.target.value))}
                className="flex-1 min-w-0 accent-cyan-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
              />
              <button
                type="button"
                onClick={() => handleUpdateTempOffset(tempOffset + 1.0)}
                className="px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] md:text-xs active:scale-95 cursor-pointer shrink-0"
              >
                +1°C
              </button>
            </div>
          </div>
        </div>

        {/* Buzzer Box */}
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 flex flex-col gap-2.5 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[9px] md:text-xs text-cyan-500/80 font-bold uppercase tracking-widest break-words whitespace-normal leading-tight">
              Acoustic Buzzer
            </span>
            <button
              onClick={onToggleMasterBuzzer}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[9px] md:text-xs font-bold transition-all active:scale-95 cursor-pointer self-start sm:self-auto ${
                masterBuzzer ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/30 border border-white/40"
              }`}
            >
              {masterBuzzer ? "BUZZER ON" : "MUTED"}
            </button>
          </div>
          
          <div className="flex gap-2 items-end mt-auto h-full">
            <button
              onClick={() => onTestBuzzer(2400, 150)}
              className="flex-1 py-2.5 md:py-4 rounded-lg md:rounded-xl bg-black/40 hover:bg-black/60 border border-white/40 text-white text-[10px] md:text-xs font-bold active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 min-w-0"
            >
              <span className="text-sm md:text-lg opacity-80">🔊</span>
              <span className="truncate w-full text-center">Short Beep</span>
            </button>
            <button
              onClick={() => onTestBuzzer(3200, 350)}
              className="flex-1 py-2.5 md:py-4 rounded-lg md:rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] md:text-xs font-bold active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 min-w-0 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            >
              <span className="text-sm md:text-lg">🔔</span>
              <span className="truncate w-full text-center">Alert Chime</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── WI-FI & REMOTE DESK ACCESS ── */}
      <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 space-y-3 md:space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base">📶</span>
            <span className="text-[10px] md:text-xs text-white font-bold uppercase tracking-widest break-words whitespace-normal leading-tight">
              Wi-Fi &amp; Remote Access
            </span>
          </div>
          <span className={`text-[8px] md:text-[10px] font-bold px-2 py-0.5 md:py-1 rounded self-start sm:self-auto uppercase tracking-wider ${wifiConnected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-black/50 text-white/30 border border-white/40"}`}>
            {wifiConnected ? `Online (${wifiSsid || "Connected"})` : "Offline / Standby"}
          </span>
        </div>

        {/* IP / Host input */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-wider">Desk Wi-Fi IP / Hostname:</span>
            <span className="text-[9px] md:text-[10px] text-cyan-400 font-mono hidden sm:inline">{wifiIp ? `Assigned IP: ${wifiIp}` : "SoftAP: 192.168.4.1"}</span>
          </div>
          
          <div className="flex gap-1.5 md:gap-2">
            <input
              type="text"
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
              placeholder="e.g. 192.168.4.1"
              className="flex-1 min-w-0 bg-black/50 border border-white/40 rounded-lg md:rounded-xl px-2.5 md:px-3 py-1.5 md:py-2.5 text-white font-mono text-[10px] md:text-xs focus:border-cyan-500 outline-none"
            />
            <button
              type="button"
              onClick={handleTestWifi}
              disabled={testingWifi}
              className="px-2.5 md:px-4 py-1.5 md:py-2.5 rounded-lg md:rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-[10px] md:text-xs active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {testingWifi ? "Testing..." : "Test Link"}
            </button>
            <a
              href={`http://${hostInput}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 md:px-4 py-1.5 md:py-2.5 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 border border-white/40 text-white font-bold text-[10px] md:text-xs flex items-center gap-1 active:scale-95 shrink-0"
            >
              Portal ↗
            </a>
          </div>
          
          {testStatus && (
            <div className={`text-[9px] md:text-[11px] font-mono p-1.5 md:p-2 rounded-lg mt-1 break-words whitespace-normal ${testStatus.startsWith("Connected") ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20" : "text-rose-300 bg-rose-500/10 border border-rose-500/20"}`}>
              {testStatus}
            </div>
          )}
        </div>

        {/* Dedicated Campus Wi-Fi Modal Button */}
        <button
          type="button"
          onClick={() => setShowWifiModal(true)}
          className="w-full py-2.5 md:py-3.5 rounded-lg md:rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] md:text-xs transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="text-sm">📶</span>
          <span className="truncate">Configure Campus Wi-Fi &amp; Hotspot</span>
        </button>

        {/* Wi-Fi on Away Only Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 md:pt-4 border-t border-white/50">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] md:text-xs text-white font-bold block truncate">Wi-Fi on Away Only (Power Saver):</span>
            <span className="text-[8px] md:text-[10px] text-white/40 break-words whitespace-normal leading-tight mt-0.5 block">Keeps Wi-Fi off at desk, connects when you walk away</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleWifiOnAwayOnly?.(!wifiOnAwayOnly)}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[9px] md:text-xs font-bold transition-all active:scale-95 cursor-pointer self-start sm:self-auto shrink-0 ${
              wifiOnAwayOnly ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-white/5 text-white/40 border border-white/40"
            }`}
          >
            {wifiOnAwayOnly ? "AWAY ONLY (ON)" : "ALWAYS ON"}
          </button>
        </div>
      </div>

      {/* ── WORLDWIDE CLOUD REMOTE CREDENTIALS ── */}
      <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 space-y-3 md:space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base">☁️</span>
            <span className="text-[10px] md:text-xs text-white font-bold uppercase tracking-widest break-words whitespace-normal leading-tight">
              Cloud Remote Credentials
            </span>
          </div>
          <span className={`text-[8px] md:text-[10px] font-bold px-2 py-0.5 md:py-1 rounded self-start sm:self-auto uppercase tracking-wider ${inputCloudPass ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
            {inputCloudPass ? "Password Protected" : "No Password"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          <div>
            <label className="text-[9px] md:text-[10px] text-white/50 font-bold block mb-1">Device Username / ID:</label>
            <input
              type="text"
              value={inputCloudUser}
              onChange={(e) => setInputCloudUser(e.target.value)}
              placeholder="user_anand_primary"
              className="w-full bg-black/50 border border-white/40 rounded-lg px-2.5 md:px-3 py-1.5 md:py-2.5 text-white font-mono text-[10px] md:text-xs focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] md:text-[10px] text-white/50 font-bold block mb-1">Device Password (Optional):</label>
            <div className="relative">
              <input
                type={showCloudPass ? "text" : "password"}
                value={inputCloudPass}
                onChange={(e) => setInputCloudPass(e.target.value)}
                placeholder="Leave blank for open access"
                className="w-full bg-black/50 border border-white/40 rounded-lg px-2.5 md:px-3 py-1.5 md:py-2.5 pr-8 text-white font-mono text-[10px] md:text-xs focus:border-cyan-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCloudPass(!showCloudPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-1 text-[10px] cursor-pointer"
              >
                {showCloudPass ? "👁️" : "🙈"}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveCredentials}
          className={`w-full py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 ${
            credSavedMsg ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          }`}
        >
          <span className="text-sm">💾</span>
          <span className="truncate">{credSavedMsg ? "Saved & Cached in PWA!" : "Save Credentials to PWA"}</span>
        </button>
      </div>

      {/* ── HARDWARE LIGHTING & 2D MATRIX CONFIG ── */}
      <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 space-y-3 md:space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 md:gap-2">
          <span className="text-[10px] md:text-xs text-white font-bold uppercase tracking-widest break-words whitespace-normal leading-tight">
            Hardware Lighting &amp; Matrix
          </span>
          <span className="text-[8px] md:text-[10px] text-cyan-400/80 font-bold self-start sm:self-auto">
            Dynamic NVS Memory
          </span>
        </div>

        {/* Strip Length */}
        <div className="space-y-1.5 md:space-y-2 bg-black/30 p-2 md:p-3.5 rounded-lg md:rounded-xl border border-white/50">
          <div className="flex justify-between items-center">
            <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-wider">Primary Strip (GPIO 8):</span>
            <span className="text-[9px] md:text-[10px] text-white/70 font-bold">Current: {stripLength} LEDs</span>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <input
              type="number"
              min="1"
              max="800"
              value={stripLenInput}
              onChange={(e) => setStripLenInput(e.target.value === "" ? "" : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 bg-black/50 border border-white/40 rounded-lg px-2.5 md:px-3 py-1.5 md:py-2.5 text-white font-bold text-[10px] md:text-xs focus:border-cyan-500 outline-none text-center"
            />
            <button
              type="button"
              onClick={() => onSaveStripLength?.(Math.max(1, Math.min(800, Number(stripLenInput) || 8)))}
              className="px-3 md:px-5 py-1.5 md:py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] md:text-xs border border-white/40 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              Set Strip (0xF3)
            </button>
          </div>
        </div>

        {/* Matrix Configuration */}
        <div className="space-y-2 md:space-y-3 pt-2 md:pt-3 border-t border-white/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[9px] md:text-[10px] text-cyan-400 font-bold uppercase tracking-wider">2D Matrix Display (GPIO {mPin}):</span>
            <span className="text-[9px] md:text-[10px] text-white/40 font-mono self-start sm:self-auto">{mCols}x{mRows} Grid ({Number(mCols) * Number(mRows)} LEDs)</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
            <div>
              <label className="text-[8px] md:text-[9px] text-white/40 font-bold block mb-1">ROWS:</label>
              <input type="number" min="1" max="64" value={mRows} onChange={(e) => setMRows(e.target.value === "" ? "" : Number(e.target.value))} onFocus={(e) => e.target.select()} className="w-full bg-black/50 border border-white/40 rounded-lg p-1.5 md:p-2 text-white text-[10px] md:text-xs font-bold text-center outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[8px] md:text-[9px] text-white/40 font-bold block mb-1">COLS:</label>
              <input type="number" min="1" max="128" value={mCols} onChange={(e) => setMCols(e.target.value === "" ? "" : Number(e.target.value))} onFocus={(e) => e.target.select()} className="w-full bg-black/50 border border-white/40 rounded-lg p-1.5 md:p-2 text-white text-[10px] md:text-xs font-bold text-center outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[8px] md:text-[9px] text-white/40 font-bold block mb-1">DATA PIN:</label>
              <select value={mPin} onChange={(e) => setMPin(Number(e.target.value))} className="w-full bg-black/50 border border-white/40 rounded-lg p-1.5 md:p-2 text-white text-[10px] md:text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer">
                {MATRIX_SAFE_GPIO_PINS.map((item) => (
                  <option key={item.pin} value={item.pin}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] md:text-[9px] text-white/40 font-bold block mb-1">WIRING:</label>
              <button type="button" onClick={() => setMWiring(mWiring === 1 ? 0 : 1)} className="w-full py-1.5 md:py-2 rounded-lg bg-black/50 hover:bg-black/70 border border-white/40 text-[9px] md:text-[10px] font-bold text-white cursor-pointer active:scale-95">
                {mWiring === 1 ? "Zig-Zag" : "Normal"}
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => onSaveMatrixConfig?.(Math.max(1, Math.min(64, Number(mRows) || 8)), Math.max(1, Math.min(128, Number(mCols) || 32)), mWiring, mPin, matrixConfig?.enabled ?? true)}
            className="w-full py-2.5 md:py-3 rounded-lg md:rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-[10px] md:text-xs cursor-pointer active:scale-95 mt-1"
          >
            Save Matrix Hardware (0xF2)
          </button>
        </div>

        {/* Marquee Custom Text Field */}
        <div className="pt-2 md:pt-3 border-t border-white/50 space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] md:text-[10px] text-cyan-400/80 font-bold uppercase tracking-wider">Custom Marquee Text:</span>
            <span className="text-[8px] md:text-[9px] text-white/30">{mText.length}/60</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2">
            <input
              type="text"
              maxLength={60}
              value={mText}
              onChange={(e) => setMText(e.target.value)}
              placeholder="Enter marquee text..."
              className="flex-1 min-w-0 bg-black/50 border border-white/40 rounded-lg px-2.5 md:px-3 py-1.5 md:py-2.5 text-white text-[10px] md:text-xs font-bold focus:border-cyan-500 outline-none"
            />
            <button
              type="button"
              onClick={() => onSetMatrixDisplay?.(18, matrixConfig?.speed ?? 5, matrixConfig?.bri ?? 70, matrixConfig?.colorR ?? 0, matrixConfig?.colorG ?? 240, matrixConfig?.colorB ?? 255, mText)}
              className="px-3 md:px-5 py-2 md:py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] md:text-xs cursor-pointer active:scale-95 shrink-0"
            >
              Send (0xF1)
            </button>
          </div>
        </div>
      </div>

      {/* ── DEVICE IDENTITY & LOGS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 shrink-0">
        
        {/* Device Identity Box */}
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-widest">Device Identity</span>
            <button
              onClick={() => setShowRenameModal(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/40 text-white text-[9px] md:text-xs font-bold active:scale-95 cursor-pointer"
            >
              Rename ✏️
            </button>
          </div>
          <div className="text-base md:text-xl text-white font-bold bg-black/40 px-3 py-2 md:p-3 rounded-lg border border-white/50 truncate">
            {deviceName}
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] md:text-xs text-white/70 font-bold">Accept All Bluetooth:</span>
            <button
              onClick={() => setShowAllDevices(!showAllDevices)}
              className={`px-3 py-1.5 rounded-lg text-[9px] md:text-xs font-bold transition-all cursor-pointer ${
                showAllDevices ? "bg-amber-500/20 border border-amber-500/40 text-amber-400" : "bg-white/5 border border-white/40 text-white/40"
              }`}
            >
              {showAllDevices ? "YES" : "FILTERED"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 md:pt-3 border-t border-white/50">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] md:text-xs text-white/70 font-bold block truncate">Time Format:</span>
              <span className="text-[8px] md:text-[10px] text-white/40 block truncate mt-0.5">12Hr vs 24Hr</span>
            </div>
            <button
              type="button"
              onClick={toggle12HrMode}
              className={`px-3 py-1.5 rounded-lg text-[9px] md:text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto ${
                is12Hr ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-white/40 border border-white/40"
              }`}
            >
              {is12Hr ? "12-HOUR (AM/PM)" : "24-HOUR"}
            </button>
          </div>
        </div>

        {/* Live BLE Logs Box */}
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/50 flex flex-col min-h-[250px] max-h-[350px]">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-widest">Live BLE Logs</span>
            <div className="flex gap-2 md:gap-3">
              <button onClick={handleCopyLogs} className="text-[9px] md:text-[10px] font-bold text-cyan-400/80 hover:text-cyan-400 cursor-pointer">
                {copiedLogs ? "Copied! ✓" : "Copy"}
              </button>
              <button onClick={onClearLogs} className="text-[9px] md:text-[10px] font-bold text-rose-400/80 hover:text-rose-400 cursor-pointer">
                Clear
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 md:space-y-1.5 font-mono text-[8px] md:text-[10px] p-2 bg-black/60 rounded-lg border border-white/50 custom-scrollbar break-all">
            {logs.length === 0 ? (
              <div className="text-white/20 italic">No logs yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-1.5 md:gap-2 items-start">
                  <span className="text-white/30 shrink-0">{log.time}</span>
                  <span className={`shrink-0 font-bold ${log.type === "err" ? "text-rose-400" : log.type === "warn" ? "text-amber-400" : log.type === "tx" ? "text-cyan-400" : log.type === "rx" ? "text-emerald-400" : "text-white/40"}`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-white/70 leading-tight">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── MODALS ── */}
      <RenameModal
        isOpen={showRenameModal}
        currentName={deviceName}
        onSave={onRename}
        onClose={() => setShowRenameModal(false)}
      />

      <WifiManagerModal
        isOpen={showWifiModal}
        onClose={() => setShowWifiModal(false)}
        deskHost={hostInput}
        currentSsid={wifiSsid}
        currentIp={wifiIp}
        wifiConnected={wifiConnected}
        isBleConnected={connected}
        onConfigureOverBle={onConfigureOverBle}
        wifiOnAwayOnly={wifiOnAwayOnly}
        onToggleWifiOnAwayOnly={onToggleWifiOnAwayOnly}
      />
    </div>
  );
}