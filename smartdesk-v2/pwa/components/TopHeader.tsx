/**
 * TopHeader.tsx — Unified Top Header & Diagnostics Grid
 *
 * Purpose : Centralized top control header for SmartDesk V2. Renders all top buttons
 *           (Cloud, Handshake, Wi-Fi, Firmware Flasher, BLE Link, and AOD/Remote Switcher)
 *           with full, untruncated text in an easily customizable responsive grid.
 * Depends : React
 * Used by : app/page.tsx
 */

"use client";

import React from "react";

export interface TopHeaderProps {
  currentDeskName: string;
  isDeskConnected: boolean;
  bleConnected: boolean;
  bleConnecting: boolean;
  onConnectBle: () => void;
  isWsConnected: boolean;
  isCloudOnline: boolean;
  onOpenHandshake: () => void;
  wifiConnected: boolean;
  wifiState: number; // 0=Off, 1=Connected, 2=Connecting, 3=Hotspot Active
  wifiSsid?: string;
  wifiIp?: string;
  onOpenWifiModal: () => void;
  onOpenFlasher: () => void;
  activeTab: string;
  onToggleAod: () => void;
}

export default function TopHeader({
  currentDeskName,
  isDeskConnected,
  bleConnected,
  bleConnecting,
  onConnectBle,
  isWsConnected,
  isCloudOnline,
  onOpenHandshake,
  wifiConnected,
  wifiState,
  wifiSsid,
  wifiIp,
  onOpenWifiModal,
  onOpenFlasher,
  activeTab,
  onToggleAod,
}: TopHeaderProps) {
  const isAod = activeTab === "aod";

  // Wi-Fi full text status label
  const wifiLabel = wifiConnected
    ? `Wi-Fi: ${wifiSsid || "Connected"} (${wifiIp || "STA"})`
    : wifiState === 2
    ? `Wi-Fi: Connecting to ${wifiSsid || "Router"}...`
    : wifiState === 3
    ? `Hotspot: Active (${wifiSsid || "AnandSmartDesk"} 192.168.4.1)`
    : "Wi-Fi: Offline / Standby";

  // Cloud full text status label
  const cloudLabel = isCloudOnline
    ? "Cloud: Online (Worldwide)"
    : isWsConnected
    ? "Cloud: Standby (Connecting Desk...)"
    : "Cloud: Offline";

  // BLE full text status label
  const bleLabel = bleConnected
    ? `BLE: Connected (${currentDeskName})`
    : bleConnecting
    ? "BLE: Connecting..."
    : "BLE: Disconnected (Click to Link)";

  return (
    <header className="w-full bg-[#050505]/95 border-b border-white/10 px-2 py-1.5 sm:px-4 sm:py-2 shrink-0 backdrop-blur-xl z-50">
      
      {/* ── TOP IDENTITY BAR: Logo + Desk Name ── */}
      <div className="flex items-center justify-between pb-1 mb-1 sm:pb-1.5 sm:mb-1.5 border-b border-white/5">
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
          <img
            src="/SmartDesk logo.png"
            alt="SmartDesk Logo"
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-contain shadow-md border border-white/10 shrink-0 bg-black"
          />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                isDeskConnected
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : bleConnecting
                  ? "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                  : "bg-white/20"
              }`}
            />
            <span className="text-[10px] sm:text-xs font-bold tracking-wide text-white truncate">
              {isDeskConnected ? currentDeskName : bleConnecting ? "Connecting to SmartDesk..." : "SmartDesk (Standby)"}
            </span>
          </div>
        </div>

        {/* Screen Toggle Mode Button */}
        <button
          type="button"
          onClick={onToggleAod}
          className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg text-[9px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 ml-1.5 ${
            isAod
              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
              : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          <span className="text-xs">
            {isAod ? "🎮" : ""}
          </span>
          <span className="leading-none">
            {isAod ? "Remote" : "AOD"}
          </span>
        </button>
      </div>

      {/* ── BUTTONS GRID: 2-Cols Mobile, 5-Cols Desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-1.5 w-full max-w-screen-xl mx-auto">
        
        {/* 1. Cloud Status Button */}
        <button
          type="button"
          onClick={onOpenHandshake}
          className={`h-full min-h-[32px] sm:min-h-[38px] px-1.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
            isCloudOnline
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
              : isWsConnected
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="text-xs shrink-0">☁️</span>
          <span className="text-[8px] sm:text-[9.5px] font-bold text-left leading-tight break-words whitespace-normal flex-1">
            {cloudLabel}
          </span>
          <span
            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ml-auto ${
              isCloudOnline ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : isWsConnected ? "bg-amber-400" : "bg-white/20"
            }`}
          />
        </button>

        {/* 2. Handshake Diagnostics Button */}
        <button
          type="button"
          onClick={onOpenHandshake}
          className="h-full min-h-[32px] sm:min-h-[38px] px-1.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
        >
          <span className="text-xs shrink-0">🤝</span>
          <span className="text-[8px] sm:text-[9.5px] font-bold text-left leading-tight break-words whitespace-normal flex-1">
            Handshake
          </span>
          <span className="text-[7px] sm:text-[8px] uppercase font-bold text-cyan-400 bg-cyan-950/50 px-1 py-0.2 rounded border border-cyan-500/30 shrink-0 ml-auto hidden sm:block">
            DIAG
          </span>
        </button>

        {/* 3. Wi-Fi Status Button */}
        <button
          type="button"
          onClick={onOpenWifiModal}
          className={`h-full min-h-[32px] sm:min-h-[38px] px-1.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
            wifiConnected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
              : wifiState === 2
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : wifiState === 3
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
              : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="text-xs shrink-0">📶</span>
          <span className="text-[8px] sm:text-[9.5px] font-bold text-left leading-tight break-words whitespace-normal flex-1">
            {wifiLabel}
          </span>
          <span
            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ml-auto ${
              wifiConnected
                ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                : wifiState === 2
                ? "bg-amber-400 animate-pulse"
                : wifiState === 3
                ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                : "bg-white/20"
            }`}
          />
        </button>

        {/* 4. Flash Firmware Button */}
        <button
          type="button"
          onClick={onOpenFlasher}
          className="h-full min-h-[32px] sm:min-h-[38px] px-1.5 py-1 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
        >
          <span className="text-xs shrink-0">⚡</span>
          <span className="text-[8px] sm:text-[9.5px] font-bold text-left leading-tight break-words whitespace-normal flex-1">
            Flash Web
          </span>
          <span className="text-[7px] sm:text-[8px] font-mono font-bold text-violet-300 bg-violet-900/50 px-1 py-0.2 rounded border border-violet-500/30 shrink-0 ml-auto hidden sm:block">
            USB
          </span>
        </button>

        {/* 5. BLE Link Button - Spans 2 columns on mobile to fill the grid nicely */}
        <button
          type="button"
          onClick={bleConnected ? undefined : onConnectBle}
          disabled={bleConnected}
          className={`h-full min-h-[32px] sm:min-h-[38px] col-span-2 lg:col-span-1 px-1.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
            bleConnected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 cursor-default"
              : bleConnecting
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300 animate-pulse"
              : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.1)]"
          }`}
        >
          <span className="text-xs shrink-0">🔗</span>
          <span className="text-[8px] sm:text-[9.5px] font-bold text-left leading-tight break-words whitespace-normal flex-1">
            {bleLabel}
          </span>
          <span
            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ml-auto ${
              bleConnected
                ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                : bleConnecting
                ? "bg-amber-400"
                : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
            }`}
          />
        </button>

      </div>
    </header>
  );
}