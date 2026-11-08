/**
 * PresencePanel.tsx — Presence Radar, Away Auto-Off, Arrival Automation, & Paired Clients
 *
 * Purpose : Configures proximity radar, away countdown timeouts, designated primary master
 *           presence tracking device, and per-relay departure/arrival automation.
 * Depends : React, types/smartdesk
 * Used by : app/page.tsx
 */

"use client";

import React from "react";
import { PresenceConfig, PresenceData, StoredClient } from "../types/smartdesk";

export interface PresencePanelProps {
  presenceData: PresenceData;
  presenceConfig: PresenceConfig;
  storedClients: StoredClient[];
  clientNickname: string;
  setClientNickname: (val: string) => void;
  designatedPresenceDevice: string;
  onSetDesignatedDevice: (name: string) => void;
  onRemoveDesignatedDevice: () => void;
  customDelayInput: string;
  setCustomDelayInput: (val: string) => void;
  connected: boolean;
  onSavePresenceConfig: (nextCfg: PresenceConfig) => void;
  onDeleteStoredClient: (slotIdx: number) => void;
  onClearKnownClients: () => void;
  onRegisterClientName: (name: string) => void;
}

export default function PresencePanel({
  presenceData,
  presenceConfig,
  storedClients,
  clientNickname,
  setClientNickname,
  designatedPresenceDevice,
  onSetDesignatedDevice,
  onRemoveDesignatedDevice,
  customDelayInput,
  setCustomDelayInput,
  connected,
  onSavePresenceConfig,
  onDeleteStoredClient,
  onClearKnownClients,
  onRegisterClientName,
}: PresencePanelProps) {
  const isMasterActive = Boolean(designatedPresenceDevice && presenceConfig.enabled);

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none pb-6">
      
      {/* ── HEADER: Radar Title, Live Status Badge & Master ON/OFF Switch ── */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
            <span>📡</span>
            <span>Presence Radar</span>
          </h2>
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-xl border-2 transition-all ${
              connected && isMasterActive
                ? "bg-emerald-950 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : !presenceConfig.enabled
                ? "bg-zinc-900 text-zinc-400 border-zinc-700"
                : presenceData.state === 2
                ? "bg-amber-950 text-amber-400 border-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-zinc-900 text-zinc-400 border-zinc-700"
            }`}
          >
            {connected && isMasterActive
              ? "🟢 TRACKING ACTIVE"
              : !presenceConfig.enabled
              ? "⚪ STANDBY (OFF)"
              : presenceData.state === 2
              ? `⏳ AWAY: ${presenceData.remainingMin}m`
              : "⚪ STANDBY"}
          </span>
        </div>

        {/* Master Radar Toggle Switch */}
        <button
          type="button"
          onClick={() => onSavePresenceConfig({ ...presenceConfig, enabled: !presenceConfig.enabled })}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer active:scale-95 flex items-center gap-2 ${
            presenceConfig.enabled
              ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
              : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white"
          }`}
        >
          <span>{presenceConfig.enabled ? "⚡" : "🌑"}</span>
          <span>{presenceConfig.enabled ? "RADAR ON" : "RADAR OFF"}</span>
        </button>
      </div>

      {/* ── ROW 1: Primary Master Device & Away Trigger Delay ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        
        {/* Card A: Primary Master Presence Device */}
        <div className="p-4 rounded-2xl bg-zinc-950 border-2 border-zinc-800 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-cyan-400 font-extrabold uppercase tracking-wider">
              Primary Master Device
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">
              {designatedPresenceDevice ? "Paired Master" : "No Device Assigned"}
            </span>
          </div>

          {designatedPresenceDevice ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black border border-cyan-500/40">
              <div className="text-white font-extrabold text-sm sm:text-base flex items-center gap-2 truncate">
                <span className="text-base sm:text-lg">📱</span>
                <span className="truncate">{designatedPresenceDevice}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold">
                  MASTER
                </span>
              </div>
              <button
                type="button"
                onClick={onRemoveDesignatedDevice}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 text-xs font-extrabold active:scale-95 shrink-0 ml-2 cursor-pointer"
              >
                Clear Master
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={20}
                value={clientNickname}
                onChange={(e) => setClientNickname(e.target.value)}
                placeholder="Device Name (e.g. My Phone)"
                className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm font-bold outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => onSetDesignatedDevice(clientNickname || "My Phone")}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs sm:text-sm border-2 border-cyan-500 active:scale-95 cursor-pointer shrink-0"
              >
                Set as Master
              </button>
            </div>
          )}
        </div>

        {/* Card B: Away Trigger Delay (Uniform Dimensions) */}
        <div className="p-4 rounded-2xl bg-zinc-950 border-2 border-zinc-800 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-amber-400 font-extrabold uppercase tracking-wider">
              Away Trigger Delay
            </span>
            <span className="text-amber-300 font-black text-sm sm:text-base">
              {presenceConfig.awayDelayMin} min countdown
            </span>
          </div>

          {/* Equal 5-Column Preset Grid */}
          <div className="grid grid-cols-5 gap-2 w-full">
            {[1, 5, 10, 15, 30].map((mins) => {
              const isSelected = presenceConfig.awayDelayMin === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onSavePresenceConfig({ ...presenceConfig, awayDelayMin: mins })}
                  className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black border-2 text-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-amber-600 text-white border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      : "bg-black text-white/70 border-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {mins}m
                </button>
              );
            })}
          </div>

          {/* Dedicated Custom Delay Input Row */}
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
            <input
              type="number"
              min="1"
              max="1440"
              value={customDelayInput}
              onChange={(e) => setCustomDelayInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-20 sm:w-24 bg-black border-2 border-zinc-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-black text-center outline-none focus:border-amber-500"
            />
            <span className="text-xs text-zinc-400 font-bold shrink-0">min custom</span>
            <button
              type="button"
              onClick={() => onSavePresenceConfig({
                ...presenceConfig,
                awayDelayMin: Math.max(1, Math.min(1440, Number(customDelayInput) || 1))
              })}
              className="flex-1 py-1.5 sm:py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-700 text-white font-extrabold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
            >
              Save Custom Delay
            </button>
          </div>
        </div>

      </div>

      {/* ── ROW 2: Departure Auto-Off & Arrival Auto-On Automation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        
        {/* Turn OFF on Departure */}
        <div className="p-4 rounded-2xl bg-zinc-950 border-2 border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-rose-400 font-extrabold uppercase tracking-wider">
              Turn OFF on Away
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">Automatic Power Savings</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((idx) => {
              const isTurnOff = Boolean(presenceConfig.awayRelayMask & (1 << idx));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSavePresenceConfig({
                    ...presenceConfig,
                    awayRelayMask: presenceConfig.awayRelayMask ^ (1 << idx),
                  })}
                  className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer active:scale-95 ${
                    isTurnOff
                      ? "bg-rose-600 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                      : "bg-black text-white/50 border-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  CH{idx + 1} {isTurnOff ? "OFF" : "—"}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSavePresenceConfig({
              ...presenceConfig,
              awayRgbOff: !presenceConfig.awayRgbOff,
            })}
            className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold border-2 transition-all cursor-pointer active:scale-95 ${
              presenceConfig.awayRgbOff
                ? "bg-rose-600 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                : "bg-black text-white/50 border-zinc-800 hover:border-zinc-600 hover:text-white"
            }`}
          >
            RGB Strip: {presenceConfig.awayRgbOff ? "TURN OFF ON AWAY" : "IGNORE (KEEP STATE)"}
          </button>
        </div>

        {/* Turn ON on Arrival */}
        <div className="p-4 rounded-2xl bg-zinc-950 border-2 border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-emerald-400 font-extrabold uppercase tracking-wider">
              Turn ON on Arrival
            </span>
            <span className="text-[11px] text-zinc-400 font-bold">Welcome Home Profile</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((idx) => {
              const isTurnOn = Boolean(presenceConfig.arrivalRelayMask & (1 << idx));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSavePresenceConfig({
                    ...presenceConfig,
                    arrivalRelayMask: presenceConfig.arrivalRelayMask ^ (1 << idx),
                  })}
                  className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer active:scale-95 ${
                    isTurnOn
                      ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-black text-white/50 border-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  CH{idx + 1} {isTurnOn ? "ON" : "—"}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSavePresenceConfig({
              ...presenceConfig,
              arrivalRgbOn: !presenceConfig.arrivalRgbOn,
            })}
            className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold border-2 transition-all cursor-pointer active:scale-95 ${
              presenceConfig.arrivalRgbOn
                ? "bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "bg-black text-white/50 border-zinc-800 hover:border-zinc-600 hover:text-white"
            }`}
          >
            RGB Strip: {presenceConfig.arrivalRgbOn ? "TURN ON ON ARRIVAL" : "IGNORE (KEEP STATE)"}
          </button>
        </div>

      </div>

      {/* ── ROW 3: ESP32 Paired Hardware Devices (10 Slots in Flash) ── */}
      <div className="p-4 rounded-2xl bg-zinc-950 border-2 border-zinc-800 flex flex-col gap-3 min-h-[220px]">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-zinc-200 font-extrabold uppercase tracking-wider">
              ESP32 Paired Devices ({storedClients.length}/10 Slots)
            </span>
          </div>
          <button
            type="button"
            onClick={onClearKnownClients}
            className="text-xs text-rose-500 hover:text-rose-400 font-extrabold cursor-pointer"
          >
            ⚠️ Clear All Slots
          </button>
        </div>

        {/* Rename & Register Current Device */}
        <div className="flex gap-2 shrink-0">
          <input
            type="text"
            maxLength={20}
            value={clientNickname}
            onChange={(e) => setClientNickname(e.target.value)}
            placeholder="Assign Custom Nickname to this Device"
            className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm font-bold outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => onRegisterClientName(clientNickname)}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs sm:text-sm border-2 border-zinc-700 active:scale-95 cursor-pointer shrink-0"
          >
            Save Name
          </button>
        </div>

        {/* Device Slot List */}
        <div className="space-y-2 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
          {storedClients.length === 0 ? (
            <div className="text-xs sm:text-sm text-zinc-500 font-bold p-6 text-center border-2 border-dashed border-zinc-900 rounded-xl">
              No paired device slots registered yet. Connect via Bluetooth to automatically register your device.
            </div>
          ) : (
            storedClients.map((dev) => {
              const isMaster = Boolean(designatedPresenceDevice && dev.name === designatedPresenceDevice);
              return (
                <div
                  key={dev.slot}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    isMaster ? "bg-cyan-950/40 border-cyan-500/60" : "bg-black border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <span className="text-xs font-mono font-black text-zinc-500 shrink-0">
                      #{dev.slot + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-white font-bold truncate">
                      {dev.name}
                    </span>
                    {isMaster && (
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-cyan-600 text-white font-bold shrink-0">
                        MASTER
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isMaster && (
                      <button
                        type="button"
                        onClick={() => onSetDesignatedDevice(dev.name)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-extrabold border border-cyan-700 active:scale-95 cursor-pointer"
                      >
                        Set Master
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteStoredClient(dev.slot)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold active:scale-95 border border-rose-500 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
