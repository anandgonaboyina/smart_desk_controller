"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { RelayState, RelayConfigItem, EnvData, PresenceData, BuddyMood } from "../types/smartdesk";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

export interface AodFaceScreenProps {
  connected: boolean;
  connecting: boolean;
  deviceName: string;
  relays: RelayState[];
  relayConfigs?: RelayConfigItem[];
  envData: EnvData;
  presenceData: PresenceData;
  rgbTimerRemainingMin?: number;
  onConnect: () => void;
  onOpenRemote: () => void;
  onToggleRelay?: (idx: number, val?: boolean) => void;
  onAllRelaysOff?: () => void;
  onSendLed?: (mode: number, r: number, g: number, b: number, bri: number, spd: number) => void;
  onSetMatrixMode?: (mode: number, text?: string) => void;
  onStartMusic?: () => void;
  onStopMusic?: () => void;
}

const MOODS_LIST: { id: BuddyMood; label: string; icon: string }[] = [
  { id: "HAPPY", label: "Happy", icon: "😄" },
  { id: "SLEEPY", label: "Sleepy", icon: "😴" },
  { id: "LOVE", label: "Love", icon: "😍" },
  { id: "SURPRISED", label: "Surprised", icon: "😮" },
  { id: "NEUTRAL", label: "Neutral", icon: "😐" },
  { id: "SAD", label: "Sad", icon: "🥺" },
  { id: "ANGRY", label: "Angry", icon: "😠" },
];

export default function AodFaceScreen({
  connected,
  connecting,
  deviceName,
  relays,
  relayConfigs = [],
  envData,
  presenceData,
  rgbTimerRemainingMin = 0,
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
  const [currentMood, setCurrentMood] = useState<BuddyMood>("NEUTRAL");
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [animTime, setAnimTime] = useState<number>(0);
  const [isMoodMenuOpen, setIsMoodMenuOpen] = useState<boolean>(false);
  const moodTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    onSetManualMood: (m) => setManualMood(m),
    onStartMusic,
    onStopMusic,
  });

  useEffect(() => {
    setNow(new Date());
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let frameId: number;
    const startMs = performance.now();
    const loop = (timestamp: number) => {
      setAnimTime(timestamp - startMs);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const nextDelay = 2000 + Math.random() * 3000;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150);
      }, nextDelay);
    };
    scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  const hour = now ? now.getHours() : 12;
  const timeString = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const secString = now ? now.toLocaleTimeString([], { second: "2-digit" }) : "--";
  const dateString = now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "---";

  const naturalBaseMood: BuddyMood = useMemo(() => {
    if (hour >= 23 || hour < 6) return "SLEEPY";
    if (hour >= 6 && hour < 12) return "HAPPY";
    if (hour >= 12 && hour < 18) return "NEUTRAL";
    return "LOVE";
  }, [hour]);

  useEffect(() => {
    if (!moodTimerRef.current) setCurrentMood(naturalBaseMood);
  }, [naturalBaseMood]);

  const handleFaceTap = () => {
    const moods: BuddyMood[] = ["HAPPY", "LOVE", "SURPRISED", "SLEEPY", "ANGRY", "SAD", "NEUTRAL"];
    const nextIdx = (moods.indexOf(currentMood) + 1) % moods.length;
    setManualMood(moods[nextIdx]);
  };

  const setManualMood = (m: BuddyMood) => {
    setCurrentMood(m);
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => {
      moodTimerRef.current = null;
      setCurrentMood(naturalBaseMood);
    }, 8000);
  };

  const activeMoodObj = MOODS_LIST.find((m) => m.id === currentMood) || MOODS_LIST[4];

  // Ongoing Timers Subtext
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
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans touch-none overscroll-none">
      
      {/* ── TOP SECTION (Fixed Padding) ── */}
      <div className="flex justify-between items-start p-4 sm:p-6 w-full z-10 shrink-0">
        
        {/* Top-Left: Temperature & Humidity */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-extrabold text-xs uppercase tracking-wider">ROOM CLIMATE</span>
            <span className={`w-2 h-2 rounded-full ${envData.valid ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
          </div>
          <div className="flex items-baseline gap-4 mt-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {envData.valid ? envData.tempC.toFixed(1) : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-400">°C</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {envData.valid ? Math.round(envData.humidity) : "--"}
              </span>
              <span className="text-xs font-bold text-zinc-400">%</span>
            </div>
          </div>
        </div>

        {/* Top-Right: Device Link / Status Pill */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={connected ? undefined : onConnect}
            disabled={connected}
            className={`px-3 py-1.5 rounded-full border text-xs font-extrabold tracking-wide flex items-center gap-2 transition-all ${
              connected
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 cursor-default select-none pointer-events-none"
                : connecting
                ? "bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse cursor-pointer active:scale-95"
                : "bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : connecting ? "bg-amber-400" : "bg-cyan-400 animate-ping"}`} />
            <span className="truncate max-w-[120px] sm:max-w-[180px]">{connected ? deviceName : connecting ? "Connecting..." : "Tap to Link Desk"}</span>
          </button>
          {presenceData.state === 2 && (
            <span className="text-[10px] text-amber-400 font-extrabold tracking-wider animate-pulse">
              Away in {presenceData.remainingMin}m
            </span>
          )}
        </div>
      </div>

      {/* ── CENTER SECTION: Huge Animated DeskBuddy Face ── */}
      <div 
        onClick={handleFaceTap}
        className="flex-1 w-full min-h-0 flex flex-col items-center justify-center cursor-pointer relative px-4 overflow-hidden"
      >
        <div className="w-full max-w-[380px] max-h-[48vh] aspect-[4/3] flex items-center justify-center relative">
          <svg
            viewBox="0 0 200 150"
            className="w-full h-full drop-shadow-[0_0_35px_rgba(6,182,212,0.65)]"
          >
            {/* Dynamic DeskBuddy Mood Faces */}
            {currentMood === "HAPPY" && (
              <g fill="#00f0ff" stroke="#00f0ff" strokeLinecap="round" strokeLinejoin="round">
                {isBlinking ? (
                  <>
                    <line x1="35" y1="55" x2="75" y2="55" strokeWidth="6" />
                    <line x1="125" y1="55" x2="165" y2="55" strokeWidth="6" />
                  </>
                ) : (
                  <>
                    <path d="M 35 60 Q 55 30 75 60" fill="none" strokeWidth="8" />
                    <path d="M 125 60 Q 145 30 165 60" fill="none" strokeWidth="8" />
                  </>
                )}
                <path d="M 70 85 Q 100 125 130 85 Z" fill="#00f0ff" />
              </g>
            )}

            {currentMood === "SLEEPY" && (
              <g fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round">
                <path d="M 35 55 Q 55 70 75 55" />
                <path d="M 125 55 Q 145 70 165 55" />
                <ellipse cx="100" cy="95" rx="10" ry="14" fill="#38bdf8" />
              </g>
            )}

            {currentMood === "LOVE" && (
              <g fill="#ec4899" stroke="#ec4899" strokeLinecap="round">
                {isBlinking ? (
                  <>
                    <line x1="35" y1="55" x2="75" y2="55" strokeWidth="6" />
                    <line x1="125" y1="55" x2="165" y2="55" strokeWidth="6" />
                  </>
                ) : (
                  <>
                    <path d="M 55 45 C 55 35 40 35 40 45 C 40 60 55 70 55 70 C 55 70 70 60 70 45 C 70 35 55 35 55 45 Z" />
                    <path d="M 145 45 C 145 35 130 35 130 45 C 130 60 145 70 145 70 C 145 70 160 60 160 45 C 160 35 145 35 145 45 Z" />
                  </>
                )}
                <path d="M 75 90 Q 100 120 125 90" fill="none" strokeWidth="6" />
              </g>
            )}

            {currentMood === "SURPRISED" && (
              <g fill="#00f0ff" stroke="#00f0ff">
                {isBlinking ? (
                  <>
                    <line x1="35" y1="55" x2="75" y2="55" strokeWidth="6" />
                    <line x1="125" y1="55" x2="165" y2="55" strokeWidth="6" />
                  </>
                ) : (
                  <>
                    <circle cx="55" cy="55" r="18" />
                    <circle cx="145" cy="55" r="18" />
                  </>
                )}
                <circle cx="100" cy="95" r="15" fill="none" strokeWidth="6" />
              </g>
            )}

            {currentMood === "NEUTRAL" && (
              <g fill="#00f0ff" stroke="#00f0ff">
                {isBlinking ? (
                  <>
                    <line x1="35" y1="55" x2="75" y2="55" strokeWidth="6" />
                    <line x1="125" y1="55" x2="165" y2="55" strokeWidth="6" />
                  </>
                ) : (
                  <>
                    <rect x="35" y="40" width="40" height="30" rx="10" />
                    <rect x="125" y="40" width="40" height="30" rx="10" />
                  </>
                )}
                <line x1="75" y1="95" x2="125" y2="95" strokeWidth="6" strokeLinecap="round" />
              </g>
            )}

            {currentMood === "SAD" && (
              <g fill="#38bdf8" stroke="#38bdf8" strokeLinecap="round">
                {isBlinking ? (
                  <>
                    <line x1="35" y1="55" x2="75" y2="55" strokeWidth="6" />
                    <line x1="125" y1="55" x2="165" y2="55" strokeWidth="6" />
                  </>
                ) : (
                  <>
                    <ellipse cx="55" cy="55" rx="16" ry="18" />
                    <ellipse cx="145" cy="55" rx="16" ry="18" />
                  </>
                )}
                <path d="M 75 105 Q 100 85 125 105" fill="none" strokeWidth="6" />
              </g>
            )}

            {currentMood === "ANGRY" && (
              <g fill="#f43f5e" stroke="#f43f5e" strokeLinecap="round">
                <line x1="35" y1="35" x2="75" y2="50" strokeWidth="6" />
                <line x1="165" y1="35" x2="125" y2="50" strokeWidth="6" />
                <rect x="40" y="52" width="30" height="15" rx="4" />
                <rect x="130" y="52" width="30" height="15" rx="4" />
                <path d="M 75 100 Q 100 85 125 100" fill="none" strokeWidth="6" />
              </g>
            )}
          </svg>
        </div>

        {/* Real-Time Clock & Date Under Face */}
        <div className="flex flex-col items-center mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              {timeString}
            </span>
            <span className="text-lg sm:text-xl font-bold text-cyan-400">{secString}</span>
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-zinc-400 tracking-wide mt-1">
            {dateString}
          </span>
          {ongoingTimers.length > 0 && (
            <span className="text-xs text-amber-400 font-extrabold tracking-wide mt-1.5 flex items-center gap-1.5 animate-pulse">
              <span>⏳ Active:</span>
              <span>{ongoingTimers.join(" • ")}</span>
            </span>
          )}
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

      {/* ── BOTTOM CONTROLS (Mood on Left, Sleek Mic Center, Remote on Right) ── */}
      <div className="flex justify-between items-end p-4 sm:p-6 w-full z-30 pointer-events-none">
        
        {/* Left Side: Mood Selector Drop-up */}
        <div className="relative pointer-events-auto">
          {isMoodMenuOpen && (
            <div className="absolute bottom-[110%] left-0 bg-zinc-950 border-2 border-zinc-700 rounded-2xl p-2 flex flex-col gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] min-w-[140px] mb-2 animate-in fade-in slide-in-from-bottom-2">
              {MOODS_LIST.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setIsMoodMenuOpen(false);
                    setManualMood(m.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                    currentMood === m.id
                      ? "bg-cyan-500 text-black shadow-[inset_0_0_12px_rgba(255,255,255,0.4)]"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsMoodMenuOpen(!isMoodMenuOpen)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl border-2 font-extrabold text-sm transition-all shadow-xl active:scale-95 cursor-pointer ${
              isMoodMenuOpen
                ? "bg-cyan-500 border-cyan-400 text-black shadow-cyan-500/30"
                : "bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="text-xl">{activeMoodObj?.icon}</span>
            <span className="hidden sm:inline">Mood</span>
          </button>
        </div>

        {/* Center: Sleek Voice Assistant Microphone Icon (Only when connected) */}
        {connected ? (
          <div className="relative pointer-events-auto flex flex-col items-center">
            <button
              type="button"
              onMouseDown={voice.handleMicMouseDown}
              onMouseUp={voice.handleMicMouseUp}
              onTouchStart={voice.handleMicMouseDown}
              onTouchEnd={voice.handleMicMouseUp}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 border-2 ${
                voice.isContinuous
                  ? "bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.65)] animate-pulse"
                  : voice.isListening
                  ? "bg-cyan-500 border-cyan-300 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse"
                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-cyan-400 hover:border-cyan-500/50"
              }`}
              title="Tap for voice command • Hold for continuous listening"
            >
              <span className="text-base sm:text-lg">
                {voice.isContinuous ? "🔴" : voice.isListening ? "🎙️" : "🎤"}
              </span>
            </button>
          </div>
        ) : (
          <div className="w-10" />
        )}

        {/* Right Side: Open Remote (when connected) OR Instant Connect (when offline/disconnected) */}
        <button
          onClick={connected ? onOpenRemote : onConnect}
          className={`pointer-events-auto px-5 sm:px-8 py-3 sm:py-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 transition-all border-2 shadow-2xl active:scale-95 cursor-pointer ${
            connected
              ? "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-300 shadow-cyan-500/40"
              : connecting
              ? "bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse shadow-amber-500/30"
              : "bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/80 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          }`}
        >
          <span>{connected ? "⚡" : connecting ? "⏳" : "🔗"}</span>
          <span className="hidden sm:inline">{connected ? "OPEN REMOTE" : connecting ? "CONNECTING..." : "CONNECT DESK"}</span>
          <span className="sm:hidden">{connected ? "REMOTE" : connecting ? "LINKING..." : "CONNECT"}</span>
        </button>

      </div>

      {/* Invisible backdrop to close mood menu when clicking outside */}
      {isMoodMenuOpen && (
        <div className="absolute inset-0 z-20" onClick={() => setIsMoodMenuOpen(false)} />
      )}
    </div>
  );
}
