"use client";

import React, { useState, useEffect } from "react";
import { LedState, MatrixConfig, LED_MODES, MUSIC_DISCO_MODES, MATRIX_MODES, MATRIX_SAFE_GPIO_PINS } from "../types/smartdesk";
import ModeSelectModal from "./ModeSelectModal";

export interface LedPanelProps {
  led: LedState;
  previewTick: number;
  stripLength?: number;
  onSaveStripLength?: (len: number) => void;
  matrixConfig?: MatrixConfig;
  onSaveMatrixConfig?: (rows: number, cols: number, wiringType: number, pin?: number, enabled?: boolean) => void;
  onSetMatrixDisplay?: (mode: number, speed?: number, bri?: number, r?: number, g?: number, b?: number, text?: string) => void;
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
  led,
  previewTick,
  stripLength = 8,
  onSaveStripLength,
  matrixConfig,
  onSaveMatrixConfig,
  onSetMatrixDisplay,
  musicSyncActive,
  musicBri,
  setMusicBri,
  musicSensitivity,
  setMusicSensitivity,
  musicSubMode,
  setMusicSubMode,
  soloColor,
  setSoloColor,
  micVolume,
  beatPulse,
  onSendLed,
  onStartMusic,
  onStopMusic,
}: LedPanelProps) {
  const [showModeModal, setShowModeModal] = useState<boolean>(false);
  const [showDiscoModal, setShowDiscoModal] = useState<boolean>(false);

  // Local inputs for hardware configuration
  const [customStripLen, setCustomStripLen] = useState<number | string>(stripLength);
  const [matrixRows, setMatrixRows] = useState<number | string>(matrixConfig?.rows || 8);
  const [matrixCols, setMatrixCols] = useState<number | string>(matrixConfig?.cols || 32);
  const [matrixWiring, setMatrixWiring] = useState<number>(matrixConfig?.wiringType ?? 1);
  const [matrixPin, setMatrixPin] = useState<number>(matrixConfig?.pin || 11);
  const [matrixText, setMatrixText] = useState<string>(matrixConfig?.text || "SMARTDESK V2");

  useEffect(() => {
    if (stripLength) setCustomStripLen(stripLength);
  }, [stripLength]);

  useEffect(() => {
    if (matrixConfig) {
      if (matrixConfig.rows) setMatrixRows(matrixConfig.rows);
      if (matrixConfig.cols) setMatrixCols(matrixConfig.cols);
      if (matrixConfig.wiringType !== undefined) setMatrixWiring(matrixConfig.wiringType);
      if (matrixConfig.pin) setMatrixPin(matrixConfig.pin);
      if (matrixConfig.text) setMatrixText(matrixConfig.text);
    }
  }, [matrixConfig]);

  const currentModeObj = LED_MODES.find((m) => m.id === led.mode) || LED_MODES[1];
  const currentDiscoObj = MUSIC_DISCO_MODES.find((m) => m.id === musicSubMode) || MUSIC_DISCO_MODES[0];

  const getDotStyle = (dotIdx: number) => {
    if (musicSyncActive) {
      const alpha = Math.min(1, Math.max(0.15, micVolume / 100));
      return {
        backgroundColor: `rgb(${soloColor.r}, ${soloColor.g}, ${soloColor.b})`,
        opacity: beatPulse ? 1 : alpha,
        boxShadow: beatPulse ? `0 0 15px rgb(${soloColor.r}, ${soloColor.g}, ${soloColor.b})` : "none",
      };
    }

    if (led.mode === 0) return { backgroundColor: "#18181b", opacity: 0.3, boxShadow: "none" };

    const baseBri = Math.max(0.2, led.bri / 100);

    // Multi-color spectrum modes
    if (led.mode === 3 || led.mode === 7 || led.mode === 18) {
      const hue = (previewTick * led.spd * 2 + dotIdx * 45) % 360;
      return {
        backgroundColor: `hsl(${hue}, 100%, 55%)`,
        opacity: baseBri,
        boxShadow: `0 0 ${15 * baseBri}px hsl(${hue}, 100%, 55%)`,
      };
    }

    // Cyberpunk Synthwave (Hot Magenta & Electric Cyan)
    if (led.mode === 17) {
      const isCyan = (Math.floor(previewTick * 0.1 * led.spd) + dotIdx) % 2 === 0;
      const col = isCyan ? "rgb(0, 240, 255)" : "rgb(255, 0, 128)";
      return {
        backgroundColor: col,
        opacity: baseBri,
        boxShadow: `0 0 ${12 * baseBri}px ${col}`,
      };
    }

    // Police Pursuit (Red & Blue Double Flash)
    if (led.mode === 22) {
      const isRed = dotIdx < 4;
      const flash = (Math.floor(previewTick * 0.2 * led.spd) % 2) === 0;
      const col = isRed ? "rgb(255, 20, 20)" : "rgb(0, 80, 255)";
      return {
        backgroundColor: col,
        opacity: flash ? baseBri : 0.08,
        boxShadow: flash ? `0 0 15px ${col}` : "none",
      };
    }

    // Fireplace & Lava Lamp (Warm Ember & Gold)
    if (led.mode === 14 || led.mode === 21) {
      const emberFlicker = 0.5 + 0.5 * Math.sin(previewTick * 0.15 + dotIdx * 1.5);
      const col = led.mode === 14 ? "rgb(255, 120, 20)" : "rgb(245, 80, 0)";
      return {
        backgroundColor: col,
        opacity: baseBri * emberFlicker,
        boxShadow: `0 0 ${12 * baseBri * emberFlicker}px ${col}`,
      };
    }

    // Aurora & Ocean Deep Tide (Emerald / Teal / Violet)
    if (led.mode === 15 || led.mode === 23) {
      const wave = 0.5 + 0.5 * Math.sin(previewTick * 0.08 + dotIdx * 0.8);
      const col = led.mode === 15 ? "rgb(16, 220, 180)" : "rgb(0, 180, 255)";
      return {
        backgroundColor: col,
        opacity: baseBri * wave,
        boxShadow: `0 0 ${12 * baseBri * wave}px ${col}`,
      };
    }

    // Toxic Hazmat & Matrix Glitch (Radioactive Lime / Neon Green)
    if (led.mode === 19 || led.mode === 24) {
      const glitch = Math.sin(previewTick * 0.2 + dotIdx * 2.0) > 0.3;
      const col = "rgb(50, 255, 40)";
      return {
        backgroundColor: col,
        opacity: glitch ? baseBri : baseBri * 0.15,
        boxShadow: glitch ? `0 0 14px ${col}` : "none",
      };
    }

    let opacity = baseBri;
    let shadowBlur = 12 * baseBri;

    if (led.mode === 2 || led.mode === 25) {
      // Breathe or Heartbeat
      const freq = led.mode === 25 ? 0.12 : 0.05;
      const breathe = (Math.sin(previewTick * led.spd * freq) + 1) / 2;
      opacity = baseBri * (0.2 + 0.8 * breathe);
      shadowBlur = 15 * opacity;
    } else if (led.mode > 3) {
      const speedFactor = Math.max(1, led.spd) * 0.5;
      const activeIdx = Math.floor(previewTick * speedFactor) % 8;
      let distance = Math.abs(activeIdx - dotIdx);
      if (distance > 4) distance = 8 - distance;
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

    return {
      backgroundColor: `rgb(${led.r}, ${led.g}, ${led.b})`,
      opacity: Math.max(0.08, opacity),
      boxShadow: shadowBlur > 0 ? `0 0 ${shadowBlur}px rgb(${led.r}, ${led.g}, ${led.b})` : "none",
    };
  };

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none pb-16">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <span>💡 Ambient &amp; Matrix Lighting</span>
        </h2>
        <button
          onClick={() => onSendLed(led.mode === 0 ? 1 : 0, led.r, led.g, led.b, led.bri, led.spd)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95 cursor-pointer ${
            led.mode !== 0
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-zinc-900 text-zinc-500 border-zinc-800"
          }`}
        >
          {led.mode !== 0 ? "STRIP ON" : "STRIP OFF"}
        </button>
      </div>

      {/* ── PRIMARY STRIP PREVIEW & MODE ── */}
      <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Primary Strip FX</span>
            <span className="text-[10px] text-zinc-500 font-bold px-1.5 py-0.5 rounded bg-black border border-zinc-800">GPIO 8</span>
          </div>
          <button
            onClick={() => setShowModeModal(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 border-2 border-zinc-600 text-cyan-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>{currentModeObj.icon}</span>
            <span>{currentModeObj.label}</span>
            <span className="text-zinc-500">▾</span>
          </button>
        </div>

        {/* Live 8-LED Preview Bar */}
        <div className="flex justify-between items-center bg-black/90 p-4 rounded-xl border-2 border-zinc-800 h-16 shadow-inner">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((dot) => (
            <div
              key={dot}
              style={getDotStyle(dot)}
              className="w-5 h-5 rounded-full transition-all duration-75 border border-white/10"
            />
          ))}
        </div>

        {/* Color Palette */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
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
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.label}
                onClick={() => onSendLed(led.mode === 0 ? 1 : led.mode, c.r, c.g, c.b, led.bri, led.spd)}
                className="py-2.5 rounded-lg text-center text-xs font-extrabold border transition-all active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`,
                  borderColor: `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`,
                  color: `rgb(${c.r}, ${c.g}, ${c.b})`,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── STRIP LENGTH CONFIGURATION (Clean Number Input) ── */}
      <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-white font-extrabold uppercase">Total Strip Length</span>
            <p className="text-[10px] text-zinc-400 mt-0.5">Custom dynamic WS2812B count on GPIO 8 (1 to 800 LEDs)</p>
          </div>
          <span className="text-xs font-black text-cyan-400">{stripLength} LEDs Active</span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="800"
            value={customStripLen}
            onChange={(e) => setCustomStripLen(e.target.value === "" ? "" : Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="flex-1 bg-black border-2 border-zinc-700 rounded-lg px-3 py-2 text-white font-bold text-sm"
          />
          <button
            type="button"
            onClick={() => onSaveStripLength?.(Math.max(1, Math.min(800, Number(customStripLen) || 8)))}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs transition-all active:scale-95 cursor-pointer"
          >
            Apply &amp; Save (0xF3)
          </button>
        </div>
      </div>

      {/* ── 2D MATRIX LED SECTION (Separate GPIO 11 Data Pin) ── */}
      <div className="p-4 rounded-xl bg-zinc-900 border-2 border-cyan-500/30 space-y-4 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>🔲 2D Matrix Display</span>
              <span className="text-[10px] text-cyan-300 font-extrabold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                GPIO {matrixPin}
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Separate data pin for 2D matrix grids (Digital Clock, Text, Matrix Rain)</p>
          </div>
          <button
            type="button"
            onClick={() =>
              onSaveMatrixConfig?.(
                Math.max(1, Math.min(64, Number(matrixRows) || 8)),
                Math.max(1, Math.min(128, Number(matrixCols) || 32)),
                matrixWiring,
                matrixPin,
                !(matrixConfig?.enabled ?? true)
              )
            }
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              matrixConfig?.enabled ?? true
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            {matrixConfig?.enabled ?? true ? "ENABLED" : "OFF"}
          </button>
        </div>

        {/* Matrix Dimensions & Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">ROWS (Height):</label>
            <input
              type="number"
              min="1"
              max="64"
              value={matrixRows}
              onChange={(e) => setMatrixRows(e.target.value === "" ? "" : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white font-bold text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">COLUMNS (Width):</label>
            <input
              type="number"
              min="1"
              max="128"
              value={matrixCols}
              onChange={(e) => setMatrixCols(e.target.value === "" ? "" : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white font-bold text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">DATA GPIO PIN:</label>
            <select
              value={matrixPin}
              onChange={(e) => setMatrixPin(Number(e.target.value))}
              className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white font-bold text-xs focus:border-cyan-500 outline-none cursor-pointer"
            >
              {MATRIX_SAFE_GPIO_PINS.map((item) => (
                <option key={item.pin} value={item.pin}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Wiring Type Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 font-bold block">WIRING LAYOUT:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMatrixWiring(1)}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                matrixWiring === 1
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                  : "bg-black text-zinc-500 border-zinc-800"
              }`}
            >
              🔄 Zig-Zag (Serpentine)
            </button>
            <button
              type="button"
              onClick={() => setMatrixWiring(0)}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                matrixWiring === 0
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                  : "bg-black text-zinc-500 border-zinc-800"
              }`}
            >
              ➡️ Progressive (Normal)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onSaveMatrixConfig?.(
              Math.max(1, Math.min(64, Number(matrixRows) || 8)),
              Math.max(1, Math.min(128, Number(matrixCols) || 32)),
              matrixWiring,
              matrixPin,
              matrixConfig?.enabled ?? true
            )
          }
          className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-extrabold text-xs transition-all active:scale-95 cursor-pointer"
        >
          Save Matrix Hardware Config (0xF2)
        </button>

        {/* Matrix Display Mode Controls */}
        <div className="pt-3 border-t border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-extrabold uppercase">Matrix Display Mode</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              {(() => {
                if (!matrixConfig || matrixConfig.mode === 0) return "🌑 Matrix Off";
                const mObj = MATRIX_MODES.find((m) => m.id === matrixConfig.mode);
                return mObj ? `${mObj.icon} ${mObj.label}` : `Mode ${matrixConfig.mode}`;
              })()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {MATRIX_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  onSetMatrixDisplay?.(
                    m.id,
                    matrixConfig?.speed ?? 5,
                    matrixConfig?.bri ?? 70,
                    matrixConfig?.colorR ?? 0,
                    matrixConfig?.colorG ?? 240,
                    matrixConfig?.colorB ?? 255,
                    matrixText
                  )
                }
                className={`p-2.5 rounded-lg text-center border font-extrabold text-xs transition-all active:scale-95 cursor-pointer ${
                  matrixConfig?.mode === m.id
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="text-lg mb-1">{m.icon}</div>
                <div>{m.label}</div>
              </button>
            ))}
          </div>

          {/* Custom Marquee Text Configuration */}
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-cyan-300 font-extrabold uppercase">Custom Marquee Text</span>
              <span className="text-[10px] text-zinc-500 font-bold">{matrixText.length}/60 chars</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                maxLength={60}
                value={matrixText}
                onChange={(e) => setMatrixText(e.target.value)}
                placeholder="Type custom text to scroll on matrix..."
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:border-cyan-500 outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  onSetMatrixDisplay?.(
                    18,
                    matrixConfig?.speed ?? 5,
                    matrixConfig?.bri ?? 70,
                    matrixConfig?.colorR ?? 0,
                    matrixConfig?.colorG ?? 240,
                    matrixConfig?.colorB ?? 255,
                    matrixText
                  )
                }
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                Display on Matrix 🚀
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BRIGHTNESS & SPEED ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700">
          <div className="flex justify-between text-xs text-zinc-300 font-extrabold mb-3 uppercase">
            <span>Brightness (Uncapped 255 Hardware Output)</span>
            <span className="text-white">{led.bri}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            value={led.bri}
            onChange={(e) => onSendLed(led.mode, led.r, led.g, led.b, Number(e.target.value), led.spd)}
            className="w-full accent-cyan-400 h-3 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700">
          <div className="flex justify-between text-xs text-zinc-300 font-extrabold mb-3 uppercase">
            <span>Animation Speed</span>
            <span className="text-white">{led.spd}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={led.spd}
            onChange={(e) => onSendLed(led.mode, led.r, led.g, led.b, led.bri, Number(e.target.value))}
            className="w-full accent-cyan-400 h-3 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* ── MUSIC REACTIVE (Pro-DJ Equalizer) ── */}
      <div
        className={`p-4 rounded-xl border-2 space-y-4 shrink-0 ${
          musicSyncActive
            ? "bg-zinc-900 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]"
            : "bg-black border-zinc-700"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold text-white">🎵 Pro-DJ Audio Reactive</span>
            {musicSyncActive && (
              <span className="text-xs px-2 py-1 rounded bg-rose-600 text-white font-bold animate-pulse">
                MIC LIVE • AGC ACTIVE
              </span>
            )}
          </div>
          <button
            onClick={musicSyncActive ? onStopMusic : onStartMusic}
            className={`w-full sm:w-auto px-5 py-3 rounded-lg text-sm font-extrabold border-2 transition-all active:scale-95 cursor-pointer ${
              musicSyncActive ? "bg-rose-600 text-white border-rose-500" : "bg-cyan-600 text-white border-cyan-500"
            }`}
          >
            {musicSyncActive ? "STOP SYNC" : "START SYNC"}
          </button>
        </div>

        {musicSyncActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t-2 border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-extrabold uppercase">Equalizer Style:</span>
              <button
                onClick={() => setShowDiscoModal(true)}
                className="px-4 py-2 rounded-lg bg-zinc-800 border-2 border-zinc-600 text-cyan-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {currentDiscoObj.icon} {currentDiscoObj.label} ▾
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-extrabold text-zinc-400 uppercase">
                <span>Studio Audio Meter</span>
                <span className={beatPulse ? "text-rose-400 font-black" : "text-white"}>
                  {micVolume}% {beatPulse && "• BASS KICK"}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ModeSelectModal
        isOpen={showModeModal}
        isMusicMode={false}
        selectedMode={led.mode}
        onSelectMode={(m) => onSendLed(m, led.r, led.g, led.b, led.bri, led.spd)}
        onClose={() => setShowModeModal(false)}
      />
      <ModeSelectModal
        isOpen={showDiscoModal}
        isMusicMode={true}
        selectedMode={musicSubMode}
        onSelectMode={setMusicSubMode}
        onClose={() => setShowDiscoModal(false)}
      />
    </div>
  );
}
