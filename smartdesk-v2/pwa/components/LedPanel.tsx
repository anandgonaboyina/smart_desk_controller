"use client";

import React, { useState } from "react";
import { LedState, LED_MODES, MUSIC_DISCO_MODES } from "../types/smartdesk";
import ModeSelectModal from "./ModeSelectModal";

export interface LedPanelProps {
  led: LedState;
  previewTick: number;
  musicSyncActive: boolean;
  musicBri: number;
  setMusicBri: (val: number) => void;
  musicSensitivity: number;
  setMusicSensitivity: (val: number) => void;
  musicSubMode: number;
  setMusicSubMode: (val: number) => void;
  soloColor: { r: number; g: number; b: number };
  setSoloColor: (val: { r: number; g: number; b: number }) => void;
  micVolume: number;
  beatPulse: boolean;
  onSendLed: (mode: number, r: number, g: number, b: number, bri: number, spd: number) => void;
  onStartMusic: () => void;
  onStopMusic: () => void;
}

const PRESET_COLORS = [
  { label: "Cyan", r: 0, g: 240, b: 255 },
  { label: "Warm", r: 255, g: 147, b: 41 },
  { label: "Purple", r: 168, g: 85, b: 247 },
  { label: "Amber", r: 245, g: 158, b: 11 },
  { label: "Emerald", r: 16, g: 185, b: 129 },
  { label: "Rose", r: 244, g: 63, b: 94 },
];

export default function LedPanel({
  led, previewTick, musicSyncActive, musicBri, setMusicBri, musicSensitivity, setMusicSensitivity,
  musicSubMode, setMusicSubMode, soloColor, setSoloColor, micVolume, beatPulse,
  onSendLed, onStartMusic, onStopMusic,
}: LedPanelProps) {
  const [showModeModal, setShowModeModal] = useState<boolean>(false);
  const [showDiscoModal, setShowDiscoModal] = useState<boolean>(false);

  const currentModeObj = LED_MODES.find((m) => m.id === led.mode) || LED_MODES[1];
  const currentDiscoObj = MUSIC_DISCO_MODES.find((m) => m.id === musicSubMode) || MUSIC_DISCO_MODES[0];

  // Upgraded Simulation Engine for Live FX Visuals
  const getDotStyle = (dotIdx: number) => {
    // 1. Music Sync Override
    if (musicSyncActive) {
      const alpha = Math.min(1, Math.max(0.15, micVolume / 100));
      return {
        backgroundColor: `rgb(${soloColor.r}, ${soloColor.g}, ${soloColor.b})`,
        opacity: beatPulse ? 1 : alpha,
        boxShadow: beatPulse ? `0 0 15px rgb(${soloColor.r}, ${soloColor.g}, ${soloColor.b})` : "none",
      };
    }

    // 2. System Off
    if (led.mode === 0) return { backgroundColor: "#18181b", opacity: 0.3, boxShadow: "none" };

    const baseBri = led.bri / 100;

    // 3. Rainbow Modes (Mode 3, 8, 9, etc)
    if (led.mode === 3 || led.mode === 8 || led.mode === 9) {
      const hue = ((previewTick * led.spd * 2) + dotIdx * 45) % 360;
      return { 
        backgroundColor: `hsl(${hue}, 100%, 55%)`, 
        opacity: baseBri,
        boxShadow: `0 0 ${15 * baseBri}px hsl(${hue}, 100%, 55%)` 
      };
    }

    let opacity = baseBri;
    let shadowBlur = 12 * baseBri;

    // 4. Breathe Mode (Sine wave pulsing)
    if (led.mode === 2) {
      const breathe = (Math.sin(previewTick * led.spd * 0.05) + 1) / 2;
      opacity = baseBri * (0.2 + 0.8 * breathe);
      shadowBlur = 15 * opacity;
    } 
    // 5. Chase / Comet / Scanner (Modulo indexing)
    else if (led.mode > 3) {
      const speedFactor = Math.max(1, led.spd) * 0.5;
      const activeIdx = Math.floor(previewTick * speedFactor) % 8;
      
      let distance = Math.abs(activeIdx - dotIdx);
      if (distance > 4) distance = 8 - distance; // Circular wrapping
      
      if (distance === 0) {
        opacity = baseBri;
        shadowBlur = 15 * baseBri;
      } else if (distance === 1) {
        opacity = baseBri * 0.35;
        shadowBlur = 5 * baseBri;
      } else {
        opacity = baseBri * 0.08;
        shadowBlur = 0;
      }
    }

    // Default Solid
    return {
      backgroundColor: `rgb(${led.r}, ${led.g}, ${led.b})`,
      opacity: opacity,
      boxShadow: shadowBlur > 0 ? `0 0 ${shadowBlur}px rgb(${led.r}, ${led.g}, ${led.b})` : "none",
    };
  };

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none h-full">
      
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <span>🎨 RGB FX Studio</span>
        </h2>
        <button
          onClick={() => onSendLed(0, 0, 0, 0, 0, 5)}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border-2 border-zinc-600 transition-all active:scale-95"
        >
          TURN OFF
        </button>
      </div>

      <div className="p-5 rounded-xl bg-black border-2 border-zinc-700 flex items-center justify-around gap-2 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] shrink-0">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} style={getDotStyle(i)} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-75 border border-white/20" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Active Effect</span>
            <div className="text-lg font-bold text-cyan-300 flex items-center gap-2 mt-1">
              <span>{currentModeObj.icon}</span>
              <span>{currentModeObj.label}</span>
            </div>
          </div>
          <button
            onClick={() => setShowModeModal(true)}
            className="w-full sm:w-auto px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 border-2 border-cyan-400 text-white text-sm font-bold transition-all active:scale-95"
          >
            Change Mode ▾
          </button>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Color Palette</span>
            <input
              type="color"
              value={`#${((1 << 24) + (led.r << 16) + (led.g << 8) + led.b).toString(16).slice(1)}`}
              onChange={(e) => {
                const hex = e.target.value;
                onSendLed(
                  led.mode === 0 ? 1 : led.mode, 
                  parseInt(hex.slice(1, 3), 16), 
                  parseInt(hex.slice(3, 5), 16), 
                  parseInt(hex.slice(5, 7), 16), 
                  led.bri, 
                  led.spd
                );
              }}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.label}
                onClick={() => onSendLed(led.mode === 0 ? 1 : led.mode, c.r, c.g, c.b, led.bri, led.spd)}
                className="py-3 rounded-lg text-center text-xs font-extrabold border-2 transition-all active:scale-95"
                style={{ backgroundColor: `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`, borderColor: `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`, color: `rgb(${c.r}, ${c.g}, ${c.b})` }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700">
          <div className="flex justify-between text-xs text-zinc-300 font-extrabold mb-3 uppercase">
            <span>Brightness</span>
            <span className="text-white">{led.bri}%</span>
          </div>
          <input type="range" min="5" max="100" value={led.bri} onChange={(e) => onSendLed(led.mode, led.r, led.g, led.b, Number(e.target.value), led.spd)} className="w-full accent-cyan-400 h-3 bg-zinc-800 rounded-lg cursor-pointer" />
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700">
          <div className="flex justify-between text-xs text-zinc-300 font-extrabold mb-3 uppercase">
            <span>Speed</span>
            <span className="text-white">{led.spd}</span>
          </div>
          <input type="range" min="1" max="10" value={led.spd} onChange={(e) => onSendLed(led.mode, led.r, led.g, led.b, led.bri, Number(e.target.value))} className="w-full accent-cyan-400 h-3 bg-zinc-800 rounded-lg cursor-pointer" />
        </div>
      </div>

      <div className={`p-4 rounded-xl border-2 space-y-4 shrink-0 ${musicSyncActive ? 'bg-zinc-900 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]' : 'bg-black border-zinc-700'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold text-white">🎵 Music Sync</span>
            {musicSyncActive && <span className="text-xs px-2 py-1 rounded bg-rose-600 text-white font-bold animate-pulse">MIC LIVE</span>}
          </div>
          <button
            onClick={musicSyncActive ? onStopMusic : onStartMusic}
            className={`w-full sm:w-auto px-5 py-3 rounded-lg text-sm font-extrabold border-2 transition-all active:scale-95 ${
              musicSyncActive ? "bg-rose-600 text-white border-rose-500" : "bg-cyan-600 text-white border-cyan-500"
            }`}
          >
            {musicSyncActive ? "STOP SYNC" : "START SYNC"}
          </button>
        </div>

        {musicSyncActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t-2 border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-extrabold uppercase">Style:</span>
              <button onClick={() => setShowDiscoModal(true)} className="px-4 py-2 rounded-lg bg-zinc-800 border-2 border-zinc-600 text-cyan-300 text-xs font-bold transition-all active:scale-95">
                {currentDiscoObj.icon} {currentDiscoObj.label} ▾
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-extrabold text-zinc-400 uppercase">
                <span>MIC LEVEL</span>
                <span className={beatPulse ? "text-rose-400" : "text-white"}>{micVolume}% {beatPulse && "• BEAT"}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75" style={{ width: `${micVolume}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <ModeSelectModal isOpen={showModeModal} isMusicMode={false} selectedMode={led.mode} onSelectMode={(m) => onSendLed(m, led.r, led.g, led.b, led.bri, led.spd)} onClose={() => setShowModeModal(false)} />
      <ModeSelectModal isOpen={showDiscoModal} isMusicMode={true} selectedMode={musicSubMode} onSelectMode={setMusicSubMode} onClose={() => setShowDiscoModal(false)} />
    </div>
  );
}