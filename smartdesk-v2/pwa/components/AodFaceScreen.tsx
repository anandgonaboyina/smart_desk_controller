"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { RelayState, EnvData, PresenceData, BuddyMood } from "../types/smartdesk";

export interface AodFaceScreenProps {
  connected: boolean; connecting: boolean; deviceName: string; relays: RelayState[]; envData: EnvData;
  presenceData: PresenceData; rgbTimerRemainingMin?: number; onConnect: () => void; onOpenRemote: () => void;
}

const MOODS_LIST: { id: BuddyMood; label: string; icon: string }[] = [
  { id: "HAPPY", label: "Happy", icon: "😄" }, { id: "SLEEPY", label: "Sleepy", icon: "😴" },
  { id: "LOVE", label: "Love", icon: "😍" }, { id: "SURPRISED", label: "Surprised", icon: "😮" },
  { id: "NEUTRAL", label: "Neutral", icon: "😐" }, { id: "SAD", label: "Sad", icon: "🥺" },
  { id: "ANGRY", label: "Angry", icon: "😠" },
];

export default function AodFaceScreen({
  connected, connecting, deviceName, relays, envData, presenceData,
  rgbTimerRemainingMin = 0, onConnect, onOpenRemote,
}: AodFaceScreenProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [currentMood, setCurrentMood] = useState<BuddyMood>("NEUTRAL");
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [animTime, setAnimTime] = useState<number>(0);
  const [isMoodMenuOpen, setIsMoodMenuOpen] = useState<boolean>(false);
  const moodTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        setTimeout(() => { setIsBlinking(false); scheduleNextBlink(); }, 150);
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

  useEffect(() => { if (!moodTimerRef.current) setCurrentMood(naturalBaseMood); }, [naturalBaseMood]);

  const handleFaceTap = () => {
    const moods: BuddyMood[] = ["HAPPY", "LOVE", "SURPRISED", "SLEEPY", "ANGRY", "SAD", "NEUTRAL"];
    const nextIdx = (moods.indexOf(currentMood) + 1) % moods.length;
    setManualMood(moods[nextIdx]);
  };

  const setManualMood = (m: BuddyMood) => {
    setCurrentMood(m);
    setIsMoodMenuOpen(false); // Close drop-up menu when selected
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => {
      moodTimerRef.current = null;
      setCurrentMood(naturalBaseMood);
    }, 8000);
  };

  const activeTimersText = useMemo(() => {
    const items: string[] = [];
    relays.forEach((r, i) => { if (r.remainingMin > 0) items.push(`CH${i + 1}: ${r.remainingMin}m`); });
    if (rgbTimerRemainingMin > 0) items.push(`RGB: ${rgbTimerRemainingMin}m`);
    if (presenceData.enabled && presenceData.state === 2 && presenceData.remainingMin > 0) items.push(`Away in ${presenceData.remainingMin}m`);
    return items.join(" • ");
  }, [relays, rgbTimerRemainingMin, presenceData]);

  const LX = 34, RX = 94, CY = 30, W = 28, H = 30;
  const dx = Math.sin(animTime / 1400.0) * 4;
  const h = isBlinking ? 4 : H;
  const heartScale = (9 + Math.sin(animTime / 180.0) * 3) / 9;
  const zy = 18 - Math.floor((animTime / 150) % 12);

  const activeMoodObj = MOODS_LIST.find(m => m.id === currentMood);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-black text-white overflow-hidden flex flex-col font-sans z-50">
      
      {/* ── TOP INFO BAR (Absolute) ── */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-start z-20 pointer-events-none">
        
        {/* Top Left: Temperature & Humidity */}
        <div className="flex gap-4 text-xs sm:text-sm bg-zinc-950 px-4 py-3 rounded-2xl border-2 border-zinc-800 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-rose-400 text-lg">🌡️</span>
            <span className="text-white font-extrabold">{envData.valid ? `${envData.tempC.toFixed(1)}°C` : "--"}</span>
          </div>
          <div className="w-0.5 h-full bg-zinc-800"></div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-lg">💧</span>
            <span className="text-white font-extrabold">{envData.valid ? `${envData.humidity.toFixed(0)}%` : "--"}</span>
          </div>
        </div>

        {/* Top Right: Status Pill */}
        <button
          onClick={!connected ? onConnect : undefined}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-xs font-extrabold shadow-xl pointer-events-auto transition-all ${
            connected 
              ? "bg-zinc-950 border-zinc-800 cursor-default" 
              : "bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 active:scale-95 cursor-pointer"
          }`}
        >
          <span className={`w-3 h-3 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" : connecting ? "bg-amber-400 animate-ping" : "bg-zinc-600"}`} />
          <span className="text-white tracking-wide">
            {connected ? deviceName : connecting ? "Connecting..." : "Tap to Connect"}
          </span>
        </button>
      </div>

      {/* ── CENTER STAGE (Desktop Split / Mobile Stacked) ── */}
      <div className="absolute inset-0 pt-20 pb-24 flex flex-col lg:flex-row items-center justify-center w-full max-w-6xl mx-auto p-4 gap-4 lg:gap-16 z-10 overflow-y-auto scrollbar-hide">
        
        {/* Animated Face */}
        <div onClick={handleFaceTap} className="w-full max-w-[280px] sm:max-w-md lg:max-w-lg cursor-pointer transition-transform duration-300 active:scale-95 flex items-center justify-center shrink-0">
          <svg className="w-full h-auto drop-shadow-[0_0_40px_rgba(56,189,248,0.3)] transition-all" viewBox="0 0 128 64">
            {currentMood === "NEUTRAL" && (
              <g fill="#38BDF8">
                <rect x={LX + dx - W / 2} y={CY - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} />
                <rect x={RX + dx - W / 2} y={CY - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} />
              </g>
            )}
            {currentMood === "HAPPY" && (
              <g>
                <rect x={LX - W / 2} y={CY - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} fill="#38BDF8" />
                <rect x={RX - W / 2} y={CY - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} fill="#38BDF8" />
                <circle cx={LX} cy={CY + H / 2 + 3} r={W / 2 + 3} fill="#000000" />
                <circle cx={RX} cy={CY + H / 2 + 3} r={W / 2 + 3} fill="#000000" />
                <path d="M 56 56 Q 64 63 72 56" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}
            {currentMood === "SAD" && (
              <g>
                <rect x={LX - W / 2} y={CY + 2 - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} fill="#38BDF8" />
                <rect x={RX - W / 2} y={CY + 2 - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} fill="#38BDF8" />
                <polygon points="19,14 49,14 19,29" fill="#000000" />
                <polygon points="109,14 79,14 109,29" fill="#000000" />
                <path d="M 58 58 Q 64 54 70 58" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            {currentMood === "ANGRY" && (
              <g>
                <rect x={LX - W / 2} y={CY + 2 - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} fill="#FB7185" />
                <rect x={RX - W / 2} y={CY + 2 - h / 2} width={W} height={h} rx={Math.min(8, h / 2)} fill="#FB7185" />
                <polygon points="49,14 19,14 49,29" fill="#000000" />
                <polygon points="79,14 109,14 79,29" fill="#000000" />
                <path d="M 58 56 L 70 56" fill="none" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}
            {currentMood === "SURPRISED" && (
              <g>
                <circle cx={LX} cy={CY} r="16" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                <circle cx={RX} cy={CY} r="16" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                <circle cx={LX + dx / 2} cy={CY} r="5" fill="#38BDF8" />
                <circle cx={RX + dx / 2} cy={CY} r="5" fill="#38BDF8" />
                <circle cx="64" cy="56" r="4" fill="none" stroke="#38BDF8" strokeWidth="2" />
              </g>
            )}
            {currentMood === "SLEEPY" && (
              <g fill="#38BDF8">
                <rect x={LX - W / 2} y={CY + 4} width={W} height="3" rx="1.5" />
                <rect x={RX - W / 2} y={CY + 4} width={W} height="3" rx="1.5" />
                <text x="106" y={zy + 12} fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">z</text>
                <text x="114" y={zy + 4} fill="#38BDF8" fontSize="12" fontFamily="monospace" fontWeight="bold">Z</text>
              </g>
            )}
            {currentMood === "LOVE" && (
              <g>
                <g transform={`translate(${LX}, ${CY}) scale(${heartScale})`}>
                  <path d="M 0 -2 C -2 -7 -8 -7 -8 -2 C -8 3 0 8 0 10 C 0 8 8 3 8 -2 C 8 -7 2 -7 0 -2 Z" fill="#F43F5E" />
                </g>
                <g transform={`translate(${RX}, ${CY}) scale(${heartScale})`}>
                  <path d="M 0 -2 C -2 -7 -8 -7 -8 -2 C -8 3 0 8 0 10 C 0 8 8 3 8 -2 C 8 -7 2 -7 0 -2 Z" fill="#F43F5E" />
                </g>
                <path d="M 60 55 Q 64 60 68 55" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
          </svg>
        </div>

        {/* Time Container */}
        <div className="flex flex-col items-center lg:items-start lg:w-1/2 gap-2 shrink-0">
          <div className="flex items-baseline gap-2 text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <span className="text-7xl sm:text-8xl lg:text-[8rem] font-bold tracking-tighter leading-none">{timeString}</span>
            <span className="text-3xl sm:text-4xl lg:text-5xl text-zinc-500 font-light">{secString}</span>
          </div>
          <div className="text-sm sm:text-base lg:text-2xl font-extrabold text-zinc-400 uppercase tracking-widest mt-1 lg:mt-2">
            {dateString}
          </div>
          
          <div className="h-10 mt-2 flex items-center justify-center lg:justify-start">
            {activeTimersText ? (
              <div className="px-5 py-2.5 rounded-xl bg-cyan-900 border-2 border-cyan-500 text-cyan-300 text-sm lg:text-base font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse">
                ⏳ {activeTimersText}
              </div>
            ) : (
              <div className="text-sm text-zinc-600 font-bold uppercase tracking-widest">System Standing By</div>
            )}
          </div>
        </div>

      </div>

      {/* ── BOTTOM CORNER CONTROLS (Absolute) ── */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-30 pointer-events-none">
        
        {/* Left Side: Compact Mood Selector Drop-up */}
        <div className="relative pointer-events-auto">
          {/* Drop-up Menu */}
          {isMoodMenuOpen && (
            <div className="absolute bottom-[110%] left-0 bg-zinc-950 border-2 border-zinc-700 rounded-2xl p-2 flex flex-col gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] min-w-[140px] mb-2 animate-in fade-in slide-in-from-bottom-2">
              {MOODS_LIST.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setManualMood(m.id)}
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

          {/* Trigger Button */}
          <button
            onClick={() => setIsMoodMenuOpen(!isMoodMenuOpen)}
            className={`flex items-center gap-2 px-5 py-4 rounded-2xl border-2 font-extrabold text-sm transition-all shadow-xl active:scale-95 ${
              isMoodMenuOpen ? "bg-cyan-500 border-cyan-400 text-black shadow-cyan-500/30" : "bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="text-xl">{activeMoodObj?.icon}</span>
            <span className="hidden sm:inline">Mood</span>
          </button>
        </div>

        {/* Right Side: Fixed Open Remote Button */}
        <button
          onClick={onOpenRemote}
          disabled={!connected}
          className={`pointer-events-auto px-6 sm:px-8 py-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 transition-all border-2 shadow-2xl active:scale-95 ${
            connected 
              ? "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-300 shadow-cyan-500/40" 
              : "bg-zinc-900 text-zinc-600 border-zinc-800"
          }`}
        >
          <span>⚡</span>
          <span className="hidden sm:inline">{connected ? "OPEN REMOTE" : "DISCONNECTED"}</span>
          <span className="sm:hidden">{connected ? "REMOTE" : "DISCONNECTED"}</span>
        </button>

      </div>

      {/* Invisible backdrop to close mood menu when clicking outside */}
      {isMoodMenuOpen && (
        <div className="absolute inset-0 z-20" onClick={() => setIsMoodMenuOpen(false)} />
      )}
    </div>
  );
}