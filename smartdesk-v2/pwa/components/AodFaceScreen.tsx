/**
 * AodFaceScreen.tsx — Ambient Always-On-Display (AOD) Smart Desk Dashboard
 *
 * Purpose : Elegant ambient display featuring high-contrast clock, live climate,
 *           direct quick appliance controls (relays with timers, RGB strip, matrix display),
 *           radar presence, and voice assistant.
 *           Settings icon replaces the old remote button for direct configuration access.
 * Depends : React, smartdesk types, useVoiceAssistant, WebFlasherModal, CustomTimerModal
 * Used by : app/page.tsx
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RelayState, RelayConfigItem, EnvData, PresenceData, LedState, MatrixConfig, MATRIX_MODES } from "../types/smartdesk";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import WebFlasherModal from "./WebFlasherModal";
import CustomTimerModal from "./CustomTimerModal";

export interface AodFaceScreenProps {
  connected: boolean;
  connecting: boolean;
  deviceName: string;
  relays: RelayState[];
  relayConfigs?: RelayConfigItem[];
  led?: LedState;
  matrixConfig?: MatrixConfig;
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
  onOpenSettings?: () => void;
  onToggleRelay?: (idx: number, val?: boolean) => void;
  onSetRelayTimer?: (idx: number, minutes: number) => void;
  onAllRelaysOff?: () => void;
  onSendLed?: (mode: number, r: number, g: number, b: number, bri: number, spd: number) => void;
  onSetRgbTimer?: (minutes: number) => void;
  onSetMatrixMode?: (mode: number, text?: string) => void;
  onSetMatrixDisplay?: (mode: number, speed?: number, bri?: number, r?: number, g?: number, b?: number, text?: string) => void;
  onStartMusic?: () => void;
  onStopMusic?: () => void;
}

export default function AodFaceScreen({
  connected,
  connecting,
  deviceName,
  relays,
  relayConfigs = [],
  led,
  matrixConfig,
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
  onOpenSettings,
  onToggleRelay,
  onSetRelayTimer,
  onAllRelaysOff,
  onSendLed,
  onSetRgbTimer,
  onSetMatrixMode,
  onSetMatrixDisplay,
  onStartMusic,
  onStopMusic,
}: AodFaceScreenProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [showFlasherModal, setShowFlasherModal] = useState<boolean>(false);
  const [is12Hr, setIs12Hr] = useState<boolean>(false);
  const [timerTargetIdx, setTimerTargetIdx] = useState<number | null>(null);

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
    onSetMatrixMode: (mode, text) => (onSetMatrixDisplay ? onSetMatrixDisplay(mode, undefined, undefined, undefined, undefined, undefined, text) : onSetMatrixMode?.(mode, text)),
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

  const isRgbOn = led ? led.mode !== 0 : false;
  const handleToggleRgb = () => {
    if (!onSendLed) return;
    if (isRgbOn && led) {
      onSendLed(0, led.r, led.g, led.b, led.bri, led.spd);
    } else if (led) {
      onSendLed(1, led.r || 0, led.g || 180, led.b || 255, led.bri || 50, led.spd || 5);
    } else {
      onSendLed(1, 0, 180, 255, 50, 5);
    }
  };

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
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {envData.valid ? envData.tempC.toFixed(1) : "--"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-cyan-400">°C</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {envData.valid ? Math.round(envData.humidity) : "--"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-cyan-400">%</span>
            </div>
          </div>
        </div>

        {/* Presence Radar Indicator */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-black/60 border border-white/10 shrink-0">
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

      {/* ── 2. CENTER SECTION: Digital Clock + Direct Remote Controls ── */}
      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-start px-3 py-2 sm:px-6 sm:py-4 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-screen-md flex flex-col items-center gap-4 sm:gap-6 my-auto">
          
          {/* Ambient High-Contrast Digital Clock */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-baseline justify-center gap-2 sm:gap-4">
              <span
                suppressHydrationWarning
                className="text-6xl sm:text-8xl md:text-[100px] leading-none font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.15)]"
              >
                {timeString}
              </span>
              <span
                suppressHydrationWarning
                className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-cyan-400 select-none"
              >
                {secString}
              </span>
            </div>
            <span
              suppressHydrationWarning
              className="text-xs sm:text-base font-bold text-white/40 tracking-widest mt-1.5 sm:mt-2 uppercase"
            >
              {dateString}
            </span>

            {/* Active Appliance Timers Banner */}
            {ongoingTimers.length > 0 && (
              <div className="mt-2.5 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-[9px] sm:text-xs text-amber-300 font-bold flex items-center gap-2 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <span>⏳ Active Timers:</span>
                <span>{ongoingTimers.join(" • ")}</span>
              </div>
            )}
          </div>

          {/* Direct Remote Section: 4-Channel Appliance Cards with Timer Controls */}
          <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {relays.map((relay, idx) => {
              const cfg = relayConfigs[idx] || { name: `Relay ${idx + 1}`, wiring: 0 };
              const isNC = cfg.wiring === 1;
              const isPowered = relay.load;

              return (
                <div
                  key={idx}
                  className={`p-2.5 sm:p-3.5 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                    isPowered
                      ? "bg-zinc-900 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                      : "bg-black/60 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPowered ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-zinc-600"}`} />
                      <span className="text-xs sm:text-sm font-extrabold text-white truncate">{cfg.name}</span>
                    </div>
                    <span className={`text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      isNC ? "bg-amber-950/60 text-amber-400 border-amber-600/60" : "bg-cyan-950/60 text-cyan-400 border-cyan-600/60"
                    }`}>
                      {isNC ? "NC" : "NO"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleRelay?.(idx, !isPowered)}
                    className={`w-full py-2.5 sm:py-3 rounded-lg font-extrabold text-xs transition-all active:scale-95 border cursor-pointer ${
                      isPowered
                        ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                    }`}
                  >
                    {isPowered ? "⚡ ON" : "○ OFF"}
                  </button>

                  {relay.remainingMin > 0 ? (
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-500/20 border border-amber-500 text-amber-400 text-xs font-bold">
                      <span>{relay.remainingMin}m left</span>
                      {onSetRelayTimer && (
                        <button
                          type="button"
                          onClick={() => onSetRelayTimer(idx, 0)}
                          className="text-white hover:text-rose-400 font-black cursor-pointer"
                          title="Cancel Timer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {[15, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => onSetRelayTimer?.(idx, mins)}
                          className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] font-bold text-white active:scale-95 cursor-pointer"
                        >
                          {mins >= 60 ? "1h" : `${mins}m`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTimerTargetIdx(idx)}
                        className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold border border-cyan-500 active:scale-95 cursor-pointer"
                        title="Set Custom Timer"
                      >
                        ⏱️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Direct RGB Light Strip Card */}
          {led && (
            <div
              className={`w-full p-2.5 sm:p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                isRgbOn ? "bg-zinc-900 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "bg-black/60 border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/50 shrink-0"
                  style={{ backgroundColor: isRgbOn ? `rgb(${led.r}, ${led.g}, ${led.b})` : "#3f3f46" }}
                />
                <span className="text-xs sm:text-sm font-extrabold text-white">🌈 RGB Ambient Strip</span>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <button
                  type="button"
                  onClick={handleToggleRgb}
                  className={`px-3.5 py-2 rounded-lg font-extrabold text-xs transition-all active:scale-95 border cursor-pointer ${
                    isRgbOn ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-800 text-white border-zinc-700"
                  }`}
                >
                  {isRgbOn ? "💡 RGB ON" : "🌑 RGB OFF"}
                </button>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-zinc-400">☀️</span>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={led.bri}
                    onChange={(e) => onSendLed?.(led.mode || 1, led.r, led.g, led.b, parseInt(e.target.value, 10), led.spd)}
                    className="flex-1 accent-cyan-400 h-3 bg-zinc-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-zinc-400 w-7 text-right">{led.bri}%</span>
                </div>
              </div>

              {rgbTimerRemainingMin > 0 ? (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded bg-cyan-500/20 border border-cyan-500 text-cyan-300 text-xs font-bold">
                  <span>Sleep in {rgbTimerRemainingMin}m</span>
                  {onSetRgbTimer && (
                    <button
                      type="button"
                      onClick={() => onSetRgbTimer(0)}
                      className="text-white hover:text-rose-400 font-black cursor-pointer"
                      title="Cancel RGB Timer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSetRgbTimer?.(mins)}
                      className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] font-bold text-white active:scale-95 cursor-pointer"
                    >
                      {mins >= 60 ? "1h" : `${mins}m`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTimerTargetIdx(-1)}
                    className="px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold border border-cyan-500 active:scale-95 cursor-pointer"
                    title="Set Custom RGB Sleep Timer"
                  >
                    ⏱️
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Direct 2D Matrix Display Row */}
          {matrixConfig && (
            <div
              className={`w-full p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                matrixConfig.mode !== 0 ? "bg-zinc-900 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-black/60 border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base">🔲</span>
                <span className="text-xs font-extrabold text-white">Matrix:</span>
                {(() => {
                  if (matrixConfig.mode === 0) {
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                        🌑 Off
                      </span>
                    );
                  }
                  const mObj = MATRIX_MODES.find((m) => m.id === matrixConfig.mode);
                  const label = mObj ? `${mObj.icon} ${mObj.label}` : `Mode ${matrixConfig.mode}`;
                  const textSnippet = [18, 20, 21, 22, 23].includes(matrixConfig.mode) && matrixConfig.text
                    ? ` "${matrixConfig.text}"`
                    : "";
                  return (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                      {label}{textSnippet}
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => (onSetMatrixDisplay ? onSetMatrixDisplay(17) : onSetMatrixMode?.(17))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border transition-all active:scale-95 cursor-pointer ${
                    matrixConfig.mode === 17 ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}
                >
                  Clock
                </button>
                <button
                  type="button"
                  onClick={() => (onSetMatrixDisplay ? onSetMatrixDisplay(18) : onSetMatrixMode?.(18))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border transition-all active:scale-95 cursor-pointer ${
                    matrixConfig.mode === 18 ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}
                >
                  Marquee
                </button>
                <button
                  type="button"
                  onClick={() => (onSetMatrixDisplay ? onSetMatrixDisplay(19) : onSetMatrixMode?.(19))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border transition-all active:scale-95 cursor-pointer ${
                    matrixConfig.mode === 19 ? "bg-cyan-500 text-black border-cyan-400" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}
                >
                  Rain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = matrixConfig.mode === 0 ? 17 : 0;
                    if (onSetMatrixDisplay) onSetMatrixDisplay(next);
                    else onSetMatrixMode?.(next);
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs font-extrabold bg-zinc-800 border border-zinc-700 text-zinc-400 active:scale-95 cursor-pointer"
                >
                  {matrixConfig.mode === 0 ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          )}

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

      {/* ── 3. BOTTOM CONTROLS: All-Off, Sleek Mic, Settings ── */}
      <div className="shrink-0 w-full mt-auto flex justify-between items-center px-3 py-2.5 sm:px-6 sm:py-3.5 border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl z-30">
        
        {/* Left: Quick Emergency "All Power Off" button */}
        <button
          onClick={onAllRelaysOff}
          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
          title="Turn off all 4 relays immediately"
        >
          <span className="text-sm sm:text-base">🛑</span>
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
            className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 border-2 ${
              voice.isContinuous
                ? "bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse"
                : voice.isListening
                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] animate-pulse"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/50 hover:text-cyan-400 hover:border-cyan-500/30"
            }`}
            title="Tap for voice command • Hold for continuous listening"
          >
            <span className="text-xl sm:text-2xl">
              {voice.isContinuous ? "🔴" : voice.isListening ? "🎙️" : "🎤"}
            </span>
          </button>
        </div>

        {/* Right: Settings Icon Button (Replaces old remote button) */}
        <div className="flex items-center gap-2">
          {!connected && (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="px-3 py-2 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-sm">{connecting ? "⏳" : "🔗"}</span>
              <span className="hidden sm:inline tracking-wider">{connecting ? "LINKING..." : "CONNECT"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings || onOpenRemote}
            className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-black tracking-wide"
            title="Open Desk Configuration & Settings"
          >
            <span className="text-base sm:text-lg">⚙️</span>
            <span>SETTINGS</span>
          </button>
        </div>

      </div>

      {/* Custom Timer Modal for Relays & RGB */}
      {timerTargetIdx !== null && (
        <CustomTimerModal
          isOpen={true}
          targetTitle={timerTargetIdx === -1 ? "RGB Ambient Light" : relayConfigs[timerTargetIdx]?.name || `Relay #${timerTargetIdx + 1}`}
          isTimerActive={timerTargetIdx === -1 ? rgbTimerRemainingMin > 0 : relays[timerTargetIdx]?.remainingMin > 0}
          currentRemainingMin={timerTargetIdx === -1 ? rgbTimerRemainingMin : relays[timerTargetIdx]?.remainingMin}
          onSetTimer={(mins) => {
            if (timerTargetIdx === -1) onSetRgbTimer?.(mins);
            else onSetRelayTimer?.(timerTargetIdx, mins);
          }}
          onClose={() => setTimerTargetIdx(null)}
        />
      )}

      {/* Web Serial & Firmware Flasher Modal */}
      <WebFlasherModal isOpen={showFlasherModal} onClose={() => setShowFlasherModal(false)} />
    </div>
  );
}
