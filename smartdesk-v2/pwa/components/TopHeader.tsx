/**
 * TopHeader.tsx — Unified Top Header & Diagnostics Grid
 *
 * Purpose : Centralized top control header for SmartDesk V2. Renders all top buttons
 *           (Cloud, Handshake, Wi-Fi, Firmware Flasher, BLE Link & Disconnect, and AOD/Remote Switcher)
 *           with comfortable sizing, responsive typography, and Bluetooth disconnect controls.
 *           On mobile: Sleek single-line status bar when collapsed, with a centered bottom-border
 *           arrow handle to expand. When expanded, the small top row is hidden to maximize space.
 *           On desktop: Full diagnostic grid as before.
 * Depends : React
 * Used by : app/page.tsx
 */

"use client";

import React, { useState } from "react";

export interface TopHeaderProps {
  currentDeskName: string;
  isDeskConnected: boolean;
  bleConnected: boolean;
  bleConnecting: boolean;
  onConnectBle: () => void;
  onDisconnectBle?: () => void;
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
  onDisconnectBle,
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
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);

  // Wi-Fi status label
  const wifiLabel = wifiConnected
    ? `Wi-Fi: ${wifiSsid || "Connected"} (${wifiIp || "STA"})`
    : wifiState === 2
    ? `Wi-Fi: Connecting to ${wifiSsid || "Router"}...`
    : wifiState === 3
    ? `Hotspot: Active (${wifiSsid || "AnandSmartDesk"})`
    : "Wi-Fi: Offline / Standby";

  // Cloud status label
  const cloudLabel = isCloudOnline
    ? "Cloud: Worldwide Online"
    : isWsConnected
    ? "Cloud: Standby (Connecting...)"
    : "Cloud: Offline";

  // BLE status label
  const bleLabel = bleConnected
    ? `BLE: Connected (${currentDeskName})`
    : bleConnecting
    ? "BLE: Connecting..."
    : "BLE: Disconnected (Click to Link)";

  return (
    <header className="w-full bg-[#050505]/95 border-b border-white/10 px-2.5 pt-2 pb-2.5 sm:px-4 sm:py-2.5 shrink-0 backdrop-blur-xl z-50 relative">
      
      {/* ── TOP IDENTITY BAR: Logo + Desk Name + Screen Toggle ── */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 sm:mb-2 border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <img
            src="/SmartDesk logo.png"
            alt="SmartDesk Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain shadow-md border border-white/10 shrink-0 bg-black"
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDeskConnected
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : bleConnecting
                  ? "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                  : "bg-white/20"
              }`}
            />
            <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white truncate">
              {isDeskConnected ? currentDeskName : bleConnecting ? "Connecting to SmartDesk..." : "SmartDesk (Standby)"}
            </span>
          </div>
        </div>

        {/* Screen Toggle Mode Button */}
        <button
          type="button"
          onClick={onToggleAod}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95 shrink-0 ml-2 ${
            isAod
              ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20"
              : "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          <span>{isAod ? "🎮" : "🖥️"}</span>
          <span className="leading-none">{isAod ? "Remote" : "AOD"}</span>
        </button>
      </div>

      {/* ── MOBILE COMPACT SINGLE-LINE STATUS BAR (Only shown when NOT expanded to save space) ── */}
      {!isMobileExpanded && (
        <div className="md:hidden flex items-center justify-evenly gap-1 w-full bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 transition-all">
          {/* 1. Wi-Fi compact pill */}
          <button
            type="button"
            onClick={onOpenWifiModal}
            className={`flex items-center gap-1.5 px-1 py-1 rounded-lg border text-[11px] font-bold transition-all active:scale-95 shrink-0 ${
              wifiConnected
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : wifiState === 2
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : wifiState === 3
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                : "bg-white/5 border-white/10 text-white/40"
            }`}
            title={wifiLabel}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                wifiConnected
                  ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                  : wifiState === 2
                  ? "bg-amber-400 animate-pulse"
                  : wifiState === 3
                  ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                  : "bg-white/20"
              }`}
            />
            <span className="truncate max-w-[65px]">{wifiConnected ? (wifiSsid || "Wi-Fi") : "Wi-Fi"}</span>
          </button>

          {/* 2. Cloud Online pill */}
          <button
            type="button"
            onClick={onOpenHandshake}
            className={`flex items-center gap-1.5 px-1 py-1 rounded-lg border text-[11px] font-bold transition-all active:scale-95 min-w-0 flex-1 justify-center ${
              isCloudOnline
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                : isWsConnected
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-white/5 border-white/10 text-white/40"
            }`}
            title="Cloud Online Status"
          >
          
            <span className="truncate">
              {isCloudOnline ? "Cloud Online" : isWsConnected ? "Connecting..." : "Cloud Offline"}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isCloudOnline
                  ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                  : isWsConnected
                  ? "bg-amber-400 animate-pulse"
                  : "bg-white/20"
              }`}
            />
          </button>

          {/* 3. Handshake Setup pill */}
          <button
            type="button"
            onClick={onOpenHandshake}
            className="flex items-center gap-1 px-1 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px] font-bold transition-all active:scale-95 shrink-0"
            title="Handshake & Diagnostics"
          >
            <span className="text-xs">📳</span>
            <span>Handshake</span>
          </button>

          {/* 4. Small Bluetooth Icon with Green/Red status dot */}
          <button
            type="button"
            onClick={bleConnected ? onDisconnectBle : onConnectBle}
            className={`flex items-center gap-1 px-1 py-1 rounded-lg border text-[11px] font-bold transition-all active:scale-95 shrink-0 ${
              bleConnected
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : bleConnecting
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse"
                : "bg-rose-500/10 border-rose-500/40 text-rose-400"
            }`}
            title={bleConnected ? "BLE Connected (Tap to Disconnect)" : "BLE Disconnected (Tap to Link)"}
          >
            <span className="text-xs">BLE</span>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                bleConnected
                  ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                  : bleConnecting
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
              }`}
            />
          </button>
        </div>
      )}

      {/* ── EXPANDABLE GRID (Mobile: Shown when expanded, Desktop md+: Always Shown) ── */}
      <div
        className={`w-full max-w-screen-xl mx-auto transition-all duration-300 ease-in-out ${
          isMobileExpanded ? "block" : "hidden md:block"
        }`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2">
          {/* 1. Cloud Status Button */}
          <button
            type="button"
            onClick={onOpenHandshake}
            className={`min-h-[42px] sm:min-h-[46px] px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
              isCloudOnline
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                : isWsConnected
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-sm shrink-0">💻</span>
            <span className="text-[11px] sm:text-xs font-bold text-left leading-tight break-words whitespace-normal flex-1">
              {cloudLabel}
            </span>
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ml-auto ${
                isCloudOnline
                  ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                  : isWsConnected
                  ? "bg-amber-400 animate-pulse"
                  : "bg-white/20"
              }`}
            />
          </button>

          {/* 2. Handshake Diagnostics Button */}
          <button
            type="button"
            onClick={onOpenHandshake}
            className="min-h-[42px] sm:min-h-[46px] px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
          >
            <span className="text-sm shrink-0">📳</span>
            <span className="text-[11px] sm:text-xs font-bold text-left leading-tight break-words whitespace-normal flex-1">
              Handshake &amp; Credentials
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/40 shrink-0 ml-auto hidden sm:block">
              Setup
            </span>
          </button>

          {/* 3. Wi-Fi Manager Button */}
          <button
            type="button"
            onClick={onOpenWifiModal}
            className={`min-h-[42px] sm:min-h-[46px] px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
              wifiConnected
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                : wifiState === 2
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : wifiState === 3
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-sm shrink-0">🛜</span>
            <span className="text-[11px] sm:text-xs font-bold text-left leading-tight break-words whitespace-normal flex-1">
              {wifiLabel}
            </span>
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ml-auto ${
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
            className="min-h-[42px] sm:min-h-[46px] px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
          >
            <span className="text-sm shrink-0">⚡</span>
            <span className="text-[11px] sm:text-xs font-bold text-left leading-tight break-words whitespace-normal flex-1">
              Flash Firmware
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-violet-300 bg-violet-900/50 px-1.5 py-0.5 rounded border border-violet-500/30 shrink-0 ml-auto hidden sm:block">
              USB
            </span>
          </button>

          {/* 5. BLE Link & Disconnect Button */}
          <div
            onClick={bleConnected ? undefined : onConnectBle}
            className={`min-h-[42px] sm:min-h-[46px] col-span-2 lg:col-span-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-2 transition-all ${
              bleConnected
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : bleConnecting
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 animate-pulse cursor-pointer"
                : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.1)]"
            }`}
          >
            <span className="text-sm shrink-0">🔗</span>
            <span className="text-[11px] sm:text-xs font-bold text-left leading-tight break-words whitespace-normal flex-1">
              {bleLabel}
            </span>
            {bleConnected ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnectBle?.();
                }}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] sm:text-xs border border-rose-400 shadow-sm active:scale-95 shrink-0 ml-auto cursor-pointer"
                title="Disconnect Bluetooth"
              >
                Disconnect
              </button>
            ) : (
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ml-auto ${
                  bleConnecting ? "bg-amber-400" : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                }`}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── EXPAND/COLLAPSE ARROW HANDLE (Bottom Middle Horizontally at Border) ── */}
      <div className="md:hidden absolute -bottom-3 inset-x-0 mx-auto w-fit z-20">
        <button
          type="button"
          onClick={() => setIsMobileExpanded((prev) => !prev)}
          className="flex items-center justify-center px-4 py-0.5 rounded-full bg-[#121212] border border-white/20 text-cyan-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.8)] cursor-pointer"
          title={isMobileExpanded ? "Slide Up Diagnostics" : "Slide Down Diagnostics"}
          aria-expanded={isMobileExpanded}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ease-in-out ${
              isMobileExpanded ? "rotate-180 text-cyan-300" : "rotate-0 text-white/70"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

    </header>
  );
}
