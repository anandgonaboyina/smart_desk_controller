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
    <div className="flex-1 w-full flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* ── TOP SECTION: Ambient Climate & Presence Bar ── */}
      <div className="flex justify-between items-center px-4 py-2 sm:px-6 sm:py-2.5 w-full shrink-0 border-b border-zinc-900/60 bg-zinc-950/40">
        
        {/* Room Climate Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">ROOM CLIMATE</span>
            <span className={`w-2 h-2 rounded-full ${envData.valid ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
          </div>
          <div className="flex items-baseline gap-3">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {envData.valid ? envData.tempC.toFixed(1) : "--"}
              </span>
              <span className="text-xs font-bold text-cyan-400">°C</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {envData.valid ? Math.round(envData.humidity) : "--"}
              </span>
              <span className="text-xs font-bold text-cyan-400">%</span>
            </div>
          </div>
        </div>

        {/* Presence Radar Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800">
          {presenceData.state === 1 ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span>👤</span> At Desk
            </span>
          ) : presenceData.state === 2 ? (
            <span className="text-amber-400 font-extrabold animate-pulse flex items-center gap-1">
              <span>🚶</span> Away in {presenceData.remainingMin}m
            </span>
          ) : (
            <span className="text-zinc-500 flex items-center gap-1">
              <span>⚪</span> Radar Standby
            </span>
          )}
        </div>
      </div>

      {/* ── CENTER SECTION: Premium Ambient Dashboard ── */}
      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 py-2 overflow-y-auto">
        <div className="w-full max-w-2xl flex flex-col items-center gap-5 sm:gap-7">
          
          {/* Ambient High-Contrast Digital Clock */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-baseline justify-center gap-2 sm:gap-3">
              <span className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.3)]">
                {timeString}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-cyan-400">
                {secString}
              </span>
            </div>
            <span className="text-sm sm:text-base md:text-lg font-extrabold text-zinc-400 tracking-wider mt-1 uppercase">
              {dateString}
            </span>

            {/* Active Appliance Timers Banner */}
            {ongoingTimers.length > 0 && (
              <div className="mt-3 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 text-xs sm:text-sm text-amber-300 font-extrabold flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <span>⏳ Active Timers:</span>
                <span>{ongoingTimers.join(" • ")}</span>
              </div>
            )}
          </div>

          {/* Quick 4-Channel Appliance Toggles (One-Tap Control Right from AOD) */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            {relays.map((relay, idx) => {
              const cfg = relayConfigs[idx];
              const name = cfg?.name || `Channel ${idx + 1}`;
              const isOn = relay.load;
              return (
                <button
                  key={idx}
                  onClick={() => onToggleRelay && onToggleRelay(idx, !isOn)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col items-start justify-between gap-2 cursor-pointer active:scale-95 ${
                    isOn
                      ? "bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      : "bg-zinc-900/70 hover:bg-zinc-800/80 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-lg">
                      {idx === 0 ? "💡" : idx === 1 ? "🖥️" : idx === 2 ? "🔌" : "🌀"}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isOn ? "bg-cyan-500 text-black font-extrabold" : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {isOn ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="w-full text-left">
                    <div className="font-extrabold text-xs sm:text-sm truncate text-white">
                      {name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold">
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
        <div className="absolute bottom-24 inset-x-0 mx-auto w-fit max-w-[85%] z-40 px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
          <div className="px-5 py-2.5 rounded-full border border-cyan-500/50 bg-zinc-950/95 shadow-[0_0_25px_rgba(6,182,212,0.4)] backdrop-blur-md text-xs sm:text-sm font-extrabold text-cyan-300 flex items-center gap-2">
            <span>{voice.isListening ? "🎙️" : "🗣️"}</span>
            <span className="truncate">{voice.voiceReply || `"${voice.voiceTranscript}"`}</span>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS: All-Off, Sleek Mic, Remote ── */}
      <div className="flex justify-between items-center p-4 sm:p-6 w-full z-30 border-t border-zinc-900/60 bg-zinc-950/80 backdrop-blur-md">
        
        {/* Left: Quick Emergency "All Power Off" button */}
        <button
          onClick={onAllRelaysOff}
          className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl border border-rose-500/40 bg-zinc-900 hover:bg-rose-950 text-rose-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
          title="Turn off all 4 relays immediately"
        >
          <span>🛑</span>
          <span className="hidden sm:inline">ALL OFF</span>
        </button>

        {/* Center: Voice Assistant Microphone Button */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onMouseDown={voice.handleMicMouseDown}
            onMouseUp={voice.handleMicMouseUp}
            onTouchStart={voice.handleMicMouseDown}
            onTouchEnd={voice.handleMicMouseUp}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-90 border-2 ${
              voice.isContinuous
                ? "bg-rose-600 border-rose-400 text-white shadow-[0_0_25px_rgba(244,63,94,0.65)] animate-pulse"
                : voice.isListening
                ? "bg-cyan-500 border-cyan-300 text-black shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-pulse"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-cyan-400 hover:border-cyan-500/50"
            }`}
            title="Tap for voice command • Hold for continuous listening"
          >
            <span className="text-xl">
              {voice.isContinuous ? "🔴" : voice.isListening ? "🎙️" : "🎤"}
            </span>
          </button>
        </div>

        {/* Right: Open Remote Button */}
        <div className="flex items-center gap-2">
          {!connected && (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 active:scale-95 transition-all cursor-pointer"
            >
              <span>{connecting ? "⏳" : "🔗"}</span>
              <span className="hidden sm:inline">{connecting ? "LINKING..." : "CONNECT"}</span>
            </button>
          )}
          <button
            onClick={onOpenRemote}
            className="px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 transition-all border border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-black"
          >
            <span>⚡</span>
            <span>OPEN REMOTE</span>
          </button>
        </div>

      </div>

      {/* Web Serial & Firmware Flasher Modal */}
      <WebFlasherModal isOpen={showFlasherModal} onClose={() => setShowFlasherModal(false)} />
    </div>
  );
}
