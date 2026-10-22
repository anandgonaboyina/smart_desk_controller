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
  presenceData, presenceConfig, storedClients, clientNickname, setClientNickname, designatedPresenceDevice,
  onSetDesignatedDevice, onRemoveDesignatedDevice, customDelayInput, setCustomDelayInput, connected,
  onSavePresenceConfig, onDeleteStoredClient, onClearKnownClients, onRegisterClientName,
}: PresencePanelProps) {
  const isMasterActive = Boolean(designatedPresenceDevice && presenceConfig.enabled);

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none h-full">
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-3">
          <span>📡 Presence Radar</span>
          <span className={`text-xs px-3 py-1 rounded-lg border-2 ${
            connected && isMasterActive ? "bg-emerald-900 text-emerald-400 border-emerald-600"
            : !presenceConfig.enabled ? "bg-zinc-800 text-zinc-400 border-zinc-600"
            : presenceData.state === 2 ? "bg-amber-900 text-amber-400 border-amber-600 animate-pulse"
            : "bg-zinc-800 text-zinc-400 border-zinc-600"
          }`}>
            {connected && isMasterActive ? "🟢 TRACKING ACTIVE" : !presenceConfig.enabled ? "⚪ DISABLED" : presenceData.state === 2 ? `⏳ AWAY: ${presenceData.remainingMin}m` : "⚪ STANDBY"}
          </span>
        </h2>
        <button
          onClick={() => onSavePresenceConfig({ ...presenceConfig, enabled: !presenceConfig.enabled })}
          className={`px-5 py-2 rounded-lg text-xs font-extrabold border-2 transition-all active:scale-95 ${
            presenceConfig.enabled ? "bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/30" : "bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700"
          }`}
        >
          {presenceConfig.enabled ? "ENABLED" : "DISABLED"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-400 font-extrabold uppercase">Primary Master Device</span>
          </div>
          {designatedPresenceDevice ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-black border-2 border-zinc-700">
              <div className="text-white font-extrabold text-base flex items-center gap-2">📱 {designatedPresenceDevice}</div>
              <button onClick={onRemoveDesignatedDevice} className="px-4 py-2 rounded-lg bg-rose-600 text-white border-2 border-rose-500 text-xs font-bold active:scale-95">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="text" maxLength={20} value={clientNickname} onChange={(e) => setClientNickname(e.target.value)} placeholder="e.g. My Phone" className="flex-1 bg-black border-2 border-zinc-600 rounded-lg px-3 py-2 text-white text-sm font-bold outline-none" />
              <button onClick={() => onSetDesignatedDevice(clientNickname || "My Phone")} className="px-5 py-2 rounded-lg bg-cyan-600 text-white font-extrabold text-xs border-2 border-cyan-500 active:scale-95">
                Set Master
              </button>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-extrabold uppercase">Away Trigger Delay</span>
            <span className="text-amber-400 font-extrabold text-sm">{presenceConfig.awayDelayMin} min</span>
          </div>
          <div className="flex gap-2">
            {[1, 5, 10, 15, 30].map((mins) => (
              <button
                key={mins} onClick={() => onSavePresenceConfig({ ...presenceConfig, awayDelayMin: mins })}
                className={`flex-1 py-2 rounded-lg text-xs font-extrabold border-2 transition-all ${presenceConfig.awayDelayMin === mins ? "bg-amber-600 text-white border-amber-500" : "bg-black text-white border-zinc-700"}`}
              >
                {mins}m
              </button>
            ))}
            <div className="flex gap-1 flex-1">
              <input
                type="number"
                min="1"
                max="1440"
                value={customDelayInput}
                onChange={(e) => setCustomDelayInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-16 bg-black border-2 border-zinc-600 rounded-lg px-2 text-white text-xs font-bold text-center outline-none"
              />
              <button onClick={() => onSavePresenceConfig({ ...presenceConfig, awayDelayMin: Math.max(1, Math.min(1440, Number(customDelayInput) || 1)) })} className="flex-1 bg-zinc-800 text-white text-[10px] font-extrabold rounded-lg border-2 border-zinc-600 active:scale-95">OK</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-3">
          <span className="text-xs text-zinc-300 font-extrabold uppercase">Turn OFF on Away</span>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((idx) => {
              const isTurnOff = Boolean(presenceConfig.awayRelayMask & (1 << idx));
              return (
                <button key={idx} onClick={() => onSavePresenceConfig({ ...presenceConfig, awayRelayMask: presenceConfig.awayRelayMask ^ (1 << idx) })} className={`py-3 rounded-lg text-xs font-extrabold border-2 transition-all ${isTurnOff ? "bg-rose-600 text-white border-rose-500" : "bg-black text-white border-zinc-700"}`}>
                  CH{idx + 1} {isTurnOff ? "OFF" : "—"}
                </button>
              );
            })}
          </div>
          <button onClick={() => onSavePresenceConfig({ ...presenceConfig, awayRgbOff: !presenceConfig.awayRgbOff })} className={`w-full py-3 rounded-lg text-xs font-extrabold border-2 transition-all ${presenceConfig.awayRgbOff ? "bg-rose-600 text-white border-rose-500" : "bg-black text-white border-zinc-700"}`}>
            RGB: {presenceConfig.awayRgbOff ? "TURN OFF" : "IGNORE"}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 space-y-3">
          <span className="text-xs text-zinc-300 font-extrabold uppercase">Turn ON on Arrival</span>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((idx) => {
              const isTurnOn = Boolean(presenceConfig.arrivalRelayMask & (1 << idx));
              return (
                <button key={idx} onClick={() => onSavePresenceConfig({ ...presenceConfig, arrivalRelayMask: presenceConfig.arrivalRelayMask ^ (1 << idx) })} className={`py-3 rounded-lg text-xs font-extrabold border-2 transition-all ${isTurnOn ? "bg-emerald-600 text-white border-emerald-500" : "bg-black text-white border-zinc-700"}`}>
                  CH{idx + 1} {isTurnOn ? "ON" : "—"}
                </button>
              );
            })}
          </div>
          <button onClick={() => onSavePresenceConfig({ ...presenceConfig, arrivalRgbOn: !presenceConfig.arrivalRgbOn })} className={`w-full py-3 rounded-lg text-xs font-extrabold border-2 transition-all ${presenceConfig.arrivalRgbOn ? "bg-cyan-600 text-white border-cyan-400" : "bg-black text-white border-zinc-700"}`}>
            RGB: {presenceConfig.arrivalRgbOn ? "TURN ON" : "IGNORE"}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex-1 flex flex-col min-h-[200px]">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-xs text-zinc-300 font-extrabold uppercase">ESP32 Paired Devices ({storedClients.length}/10)</span>
          <button onClick={onClearKnownClients} className="text-xs text-rose-500 hover:text-rose-400 font-extrabold">⚠️ Clear All</button>
        </div>
        <div className="flex gap-2 mb-3 shrink-0">
          <input type="text" maxLength={20} value={clientNickname} onChange={(e) => setClientNickname(e.target.value)} placeholder="Rename device" className="flex-1 bg-black border-2 border-zinc-600 rounded-lg px-3 py-2 text-white text-sm font-bold outline-none" />
          <button onClick={() => onRegisterClientName(clientNickname)} className="px-5 py-2 rounded-lg bg-zinc-800 text-white font-extrabold text-xs border-2 border-zinc-600 active:scale-95">Save</button>
        </div>
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 scrollbar-hide">
          {storedClients.length === 0 ? <div className="text-sm text-zinc-500 font-bold p-4 text-center">No devices saved.</div> : storedClients.map((dev) => {
            const isMaster = designatedPresenceDevice && dev.name === designatedPresenceDevice;
            return (
              <div key={dev.slot} className={`flex items-center justify-between p-3 rounded-lg border-2 ${isMaster ? "bg-cyan-900 border-cyan-500" : "bg-black border-zinc-700"}`}>
                <div className="flex items-center gap-3 truncate">
                  <span className="text-sm text-zinc-500 font-extrabold">#{dev.slot + 1}</span>
                  <span className="text-sm text-white font-bold truncate">{dev.name}</span>
                  {isMaster && <span className="text-[10px] px-2 py-1 rounded bg-cyan-600 text-white font-bold">MASTER</span>}
                </div>
                <button onClick={() => onDeleteStoredClient(dev.slot)} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold active:scale-95 border-2 border-rose-500 shrink-0">Delete</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}