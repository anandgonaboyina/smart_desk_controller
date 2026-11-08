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
    <header className="w-full bg-zinc-950/95 border-b-2 border-zinc-800 p-2 sm:p-3 shrink-0 backdrop-blur-md z-30">
      {/* ── TOP IDENTITY BAR: Logo + Desk Name ── */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <img
            src="/SmartDesk logo.png"
            alt="SmartDesk Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shadow-md border border-zinc-800 shrink-0"
          />
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isDeskConnected
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]"
                  : bleConnecting
                  ? "bg-amber-400 animate-ping"
                  : "bg-zinc-600"
              }`}
            />
            <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white">
              {isDeskConnected ? currentDeskName : bleConnecting ? "Connecting to SmartDesk..." : "SmartDesk (Standby)"}
            </span>
          </div>
        </div>

        {/* Screen Toggle Mode Button */}
        <button
          type="button"
          onClick={onToggleAod}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 shadow-md ${
            isAod
              ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.4)]"
          }`}
        >
          <span>{isAod ? "🎮" : "😴"}</span>
          <span>{isAod ? "Remote Dashboard" : "AOD Screen"}</span>
        </button>
      </div>

      {/* ── BUTTONS GRID: Full Text, Fully Customizable Layout ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 w-full">
        {/* 1. Cloud Status Button */}
        <button
          type="button"
          onClick={onOpenHandshake}
          className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-extrabold transition-all cursor-pointer active:scale-98 ${
            isCloudOnline
              ? "border-emerald-500/70 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.25)]"
              : isWsConnected
              ? "border-amber-500/70 bg-amber-950/40 text-amber-300"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
          title="Click to open Cloud Handshake & Worldwide Diagnostics"
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">☁️</span>
            <span>{cloudLabel}</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isCloudOnline
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : isWsConnected
                ? "bg-amber-400"
                : "bg-zinc-600"
            }`}
          />
        </button>

        {/* 2. Handshake Diagnostics Button */}
        <button
          type="button"
          onClick={onOpenHandshake}
          className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/70 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-black shadow-[0_0_10px_rgba(6,182,212,0.2)] active:scale-98 transition-all cursor-pointer flex items-center justify-between gap-2"
          title="Step-by-step Worldwide Handshake Verification"
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">🤝</span>
            <span>Worldwide Handshake</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-700">
            DIAG
          </span>
        </button>

        {/* 3. Wi-Fi Status Button */}
        <button
          type="button"
          onClick={onOpenWifiModal}
          className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-extrabold transition-all cursor-pointer active:scale-98 ${
            wifiConnected
              ? "border-emerald-500/70 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.25)]"
              : wifiState === 2
              ? "border-amber-500/70 bg-amber-950/40 text-amber-300"
              : wifiState === 3
              ? "border-cyan-500/70 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
          title="Configure Campus Wi-Fi, Fortinet Portal & Hotspot"
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">📶</span>
            <span>{wifiLabel}</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              wifiConnected
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : wifiState === 2
                ? "bg-amber-400 animate-ping"
                : wifiState === 3
                ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                : "bg-zinc-600"
            }`}
          />
        </button>

        {/* 4. Flash Firmware Button */}
        <button
          type="button"
          onClick={onOpenFlasher}
          className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/60 bg-zinc-900/90 hover:bg-cyan-950/80 text-cyan-300 text-xs font-black shadow-[0_0_10px_rgba(6,182,212,0.15)] active:scale-98 transition-all cursor-pointer flex items-center justify-between gap-2"
          title="ESP32 Web Flasher & USB Serial Monitor"
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">⚡</span>
            <span>Flash Firmware</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-800">
            USB
          </span>
        </button>

        {/* 5. BLE Link Button */}
        <button
          type="button"
          onClick={bleConnected ? undefined : onConnectBle}
          disabled={bleConnected}
          className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-extrabold transition-all ${
            bleConnected
              ? "border-emerald-500/70 bg-emerald-950/40 text-emerald-300 cursor-default select-none"
              : bleConnecting
              ? "border-amber-500/70 bg-amber-950/40 text-amber-300 animate-pulse cursor-pointer"
              : "border-rose-500/60 bg-rose-950/40 text-rose-300 hover:border-rose-400 cursor-pointer active:scale-98 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
          }`}
          title={bleConnected ? `BLE Connected: ${currentDeskName}` : "Connect SmartDesk via Web Bluetooth"}
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">🔗</span>
            <span>{bleLabel}</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              bleConnected
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
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
