/**
 * AodFaceScreen.tsx — Ambient Always-On-Display (AOD) Smart Desk Dashboard
 *
 * Purpose : Elegant ambient display featuring high-contrast clock, live climate,
 *           quick 4-channel appliance toggles, radar presence, and voice assistant.
 * Depends : React, smartdesk types, useVoiceAssistant, WebFlasherModal
 * Used by : app/page.tsx
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RelayState, RelayConfigItem, EnvData, PresenceData } from "../types/smartdesk";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import WebFlasherModal from "./WebFlasherModal";

export interface AodFaceScreenProps {
  connected: boolean;
  connecting: boolean;
  deviceName: string;
  relays: RelayState[];
  relayConfigs?: RelayConfigItem[];
  envData: EnvData;
  presenceData: PresenceData;
  rgbTimerRemainingMin?: number;
  wifiConnected?: boolean;
  wifiState?: number;
  wifiSsid?: string;
  wifiIp?: string;
  isCloudOnline?: boolean;
  isWsConnected?: boolean;
  onOpenWifiModal?: () => void;
  onOpenHandshakeModal?: () => void;
  onConnect: () => void;
  onOpenRemote: () => void;
  onToggleRelay?: (idx: number, val?: boolean) => void;
  onAllRelaysOff?: () => void;
  onSendLed?: (mode: number, r: number, g: number, b: number, bri: number, spd: number) => void;
  onSetMatrixMode?: (mode: number, text?: string) => void;
  onStartMusic?: () => void;
  onStopMusic?: () => void;
}

export default function AodFaceScreen({
  connected,
  connecting,
  deviceName,
  relays,
  relayConfigs = [],
  envData,
  presenceData,
  rgbTimerRemainingMin = 0,
  wifiConnected = false,
  wifiState = 0,
  wifiSsid,
  wifiIp,
  isCloudOnline = false,
  isWsConnected = false,
  onOpenWifiModal,
  onOpenHandshakeModal,
  onConnect,
  onOpenRemote,
  onToggleRelay,
  onAllRelaysOff,
  onSendLed,
  onSetMatrixMode,
  onStartMusic,
  onStopMusic,
}: AodFaceScreenProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [showFlasherModal, setShowFlasherModal] = useState<boolean>(false);
  const [is12Hr, setIs12Hr] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIs12Hr(localStorage.getItem("smartdesk_12hr_mode") === "true");
    }
  }, []);

  const voice = useVoiceAssistant({
    relays,
    relayConfigs,
    onToggleRelay,
    onAllRelaysOff,
    onSendLed,
    onSetMatrixMode,
    onStartMusic,
    onStopMusic,
  });

  useEffect(() => {
    setNow(new Date());
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const timeString = useMemo(() => {
    if (!now) return "--:--";
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: is12Hr,
    });
  }, [now, is12Hr]);

  const secString = useMemo(() => {
    if (!now) return "--";
    return now.toLocaleTimeString([], { second: "2-digit" });
  }, [now]);

  const dateString = useMemo(() => {
    if (!now) return "---";
    return now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [now]);

  // Active Appliance Timers
  const ongoingTimers = useMemo(() => {
    const list: string[] = [];
    relays.forEach((r, idx) => {
      if (r.load && r.remainingMin > 0) {
        const name = relayConfigs[idx]?.name || `CH${idx + 1}`;
        list.push(`${name} (${r.remainingMin}m)`);
      }
    });
    if (rgbTimerRemainingMin > 0) list.push(`RGB (${rgbTimerRemainingMin}m)`);
    return list;
  }, [relays, relayConfigs, rgbTimerRemainingMin]);

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden select-none font-sans bg-[#050505] text-white relative">
      
      {/* ── 1. TOP SECTION: Ambient Climate & Presence Bar ── */}
      <div className="flex justify-between items-center px-3 py-1.5 sm:px-6 sm:py-2.5 w-full shrink-0 border-b border-white/5 bg-white/[0.02]">
        
        {/* Room Climate Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <span className="text-white/40 font-bold text-[9px] sm:text-[11px] uppercase tracking-wider hidden sm:block">
              Climate
            </span>
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${envData.valid ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-white/20"}`} />
          </div>
          <div className="flex items-baseline gap-2 sm:gap-3">
            <div className="flex items-baseline gap-0.5">
              <span className="text-base sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {envData.valid ? envData.tempC.toFixed(1) : "--"}
              </span>
              <span className="text-[9px] sm:text-xs font-bold text-cyan-400">°C</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {envData.valid ? Math.round(envData.humidity) : "--"}
              </span>
              <span className="text-[9px] sm:text-xs font-bold text-cyan-400">%</span>
            </div>
          </div>
        </div>

        {/* Presence Radar Indicator - Compact Padding */}
        <div className="flex items-center gap-1 text-[9px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/60 border border-white/10 shrink-0">
          {presenceData.state === 1 ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span>👤</span> <span>At Desk</span>
            </span>
          ) : presenceData.state === 2 ? (
            <span className="text-amber-400 font-extrabold animate-pulse flex items-center gap-1">
              <span>🚶</span> <span>Away {presenceData.remainingMin}m</span>
            </span>
          ) : (
            <span className="text-white/40 flex items-center gap-1">
              <span>⚪</span> <span>Standby</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 2. CENTER SECTION: Premium Ambient Dashboard ── */}
      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-between px-3 py-2 sm:px-8 sm:py-4 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-screen-md flex flex-col items-center justify-around flex-1 gap-4 sm:gap-8 my-auto">
          
          {/* Ambient High-Contrast Digital Clock */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-baseline justify-center gap-2 sm:gap-3 relative">
              <span
                suppressHydrationWarning
                className="text-6xl sm:text-8xl md:text-[120px] leading-none font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.15)]"
              >
                {timeString}
              </span>
              <span
                suppressHydrationWarning
                className="text-xl sm:text-3xl md:text-5xl font-bold text-cyan-400 absolute -right-7 sm:-right-8 md:-right-16 bottom-1 sm:bottom-2 md:bottom-6"
              >
                {secString}
              </span>
            </div>
            <span
              suppressHydrationWarning
              className="text-[11px] sm:text-sm md:text-lg font-bold text-white/30 tracking-widest mt-1 sm:mt-2 md:mt-3 uppercase"
            >
              {dateString}
            </span>

            {/* Active Appliance Timers Banner */}
            {ongoingTimers.length > 0 && (
              <div className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-[9px] sm:text-xs text-amber-300 font-bold flex items-center gap-2 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <span>⏳ Active Timers:</span>
                <span>{ongoingTimers.join(" • ")}</span>
              </div>
            )}
          </div>

          {/* Quick 4-Channel Appliance Toggles (One-Tap Control Right from AOD) */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3.5 mt-2 sm:mt-4">
            {relays.map((relay, idx) => {
              const cfg = relayConfigs[idx];
              const name = cfg?.name || `Channel ${idx + 1}`;
              const isOn = relay.load;
              return (
                <button
                  key={idx}
                  onClick={() => onToggleRelay && onToggleRelay(idx, !isOn)}
                  className={`p-2.5 sm:p-4 rounded-xl border transition-all flex flex-col items-start justify-between gap-1.5 sm:gap-3 cursor-pointer active:scale-95 ${
                    isOn
                      ? "bg-cyan-500/10 border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-white/50"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-base sm:text-2xl ${isOn ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'grayscale opacity-50'}`}>
                      {idx === 0 ? "💡" : idx === 1 ? "🖥️" : idx === 2 ? "🔌" : "🌀"}
                    </span>
                    <span
                      className={`text-[8.5px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                        isOn ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "bg-black/50 border border-white/10 text-white/30"
                      }`}
                    >
                      {isOn ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="w-full text-left mt-0.5">
                    <div className={`font-bold text-[11px] sm:text-sm truncate ${isOn ? 'text-white' : 'text-white/70'}`}>
                      {name}
                    </div>
                    <div className={`text-[9px] sm:text-[10px] font-medium mt-0.5 ${isOn ? 'text-cyan-400/80' : 'text-white/30'}`}>
                      {relay.remainingMin > 0 ? `${relay.remainingMin}m left` : "Ready"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── SPEECH RECOGNITION FLOATING BANNER ── */}
      {(voice.voiceReply || voice.voiceTranscript) && (
        <div className="absolute bottom-20 inset-x-0 mx-auto w-fit max-w-[90%] z-40 px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-cyan-500/40 bg-black/90 shadow-[0_0_25px_rgba(6,182,212,0.3)] backdrop-blur-xl text-xs sm:text-sm font-bold text-cyan-300 flex items-center justify-center gap-2">
            <span className="shrink-0">{voice.isListening ? "🎙️" : "🗣️"}</span>
            <span className="truncate flex-1">{voice.voiceReply || `"${voice.voiceTranscript}"`}</span>
          </div>
        </div>
      )}

      {/* ── 3. BOTTOM CONTROLS: All-Off, Sleek Mic, Remote ── */}
      <div className="shrink-0 w-full mt-auto flex justify-between items-center px-3 py-2 sm:px-5 sm:py-3 border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl z-30">
        
        {/* Left: Quick Emergency "All Power Off" button */}
        <button
          onClick={onAllRelaysOff}
          className="px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[9px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.1)]"
          title="Turn off all 4 relays immediately"
        >
          <span className="text-xs sm:text-sm">🛑</span>
          <span className="hidden sm:inline tracking-wider">ALL OFF</span>
        </button>

        {/* Center: Voice Assistant Microphone Button */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onMouseDown={voice.handleMicMouseDown}
            onMouseUp={voice.handleMicMouseUp}
            onTouchStart={voice.handleMicMouseDown}
            onTouchEnd={voice.handleMicMouseUp}
            className={`w-10 h-10 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 border-2 ${
              voice.isContinuous
                ? "bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse"
                : voice.isListening
                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] animate-pulse"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/50 hover:text-cyan-400 hover:border-cyan-500/30"
            }`}
            title="Tap for voice command • Hold for continuous listening"
          >
            <span className="text-lg sm:text-2xl">
              {voice.isContinuous ? "🔴" : voice.isListening ? "🎙️" : "🎤"}
            </span>
          </button>
        </div>

        {/* Right: Open Remote Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!connected && (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="px-2.5 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-xs sm:text-sm">{connecting ? "⏳" : "🔗"}</span>
              <span className="hidden sm:inline tracking-wider">{connecting ? "LINKING..." : "CONNECT"}</span>
            </button>
          )}
          <button
            onClick={onOpenRemote}
            className="px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-black tracking-wide"
          >
            <span className="text-xs sm:text-sm">⚡</span>
            <span>OPEN REMOTE</span>
          </button>
        </div>

      </div>

      {/* Web Serial & Firmware Flasher Modal */}
      <WebFlasherModal isOpen={showFlasherModal} onClose={() => setShowFlasherModal(false)} />
    </div>
  );
}