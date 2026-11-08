/**
 * WifiManagerModal.tsx — Wi-Fi Multi-Network, University Portal & SoftAP Manager for SmartDesk V2
 *
 * Purpose : Allows managing saved Wi-Fi networks, quick auto-fill presets, Fortinet captive portal
 *           credentials, BLE direct transmission, and real-time ESP32 diagnostic log inspection.
 * Depends : React, smartdesk types
 * Used by : SettingsPanel.tsx, AodFaceScreen.tsx, app/page.tsx
 */

"use client";

import React, { useState, useEffect } from "react";

export interface SavedNetItem {
  idx: number;
  ssid: string;
  cpUrl?: string;
  cpUser?: string;
  hasCP?: boolean;
}

export interface WifiManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deskHost: string;
  currentSsid?: string;
  currentIp?: string;
  portalStatus?: string;
  wifiConnected?: boolean;
  wifiState?: number;
  isBleConnected?: boolean;
  onScanOverBle?: () => Promise<{ ssid: string; rssi: number }[]>;
  scannedNetworks?: { ssid: string; rssi: number }[];
  onConfigureOverBle?: (ssid: string, pass?: string, user?: string, cpPass?: string) => Promise<void>;
  wifiOnAwayOnly?: boolean;
  onToggleWifiOnAwayOnly?: (val: boolean) => void;
  onToast?: (msg: string, type?: "info" | "warn" | "error" | "success") => void;
  recentLogs?: { text: string; type?: string }[];
}

export default function WifiManagerModal({
  isOpen,
  onClose,
  deskHost,
  currentSsid,
  currentIp,
  portalStatus,
  wifiConnected = false,
  wifiState = 0,
  isBleConnected = false,
  onScanOverBle,
  scannedNetworks = [],
  onConfigureOverBle,
  wifiOnAwayOnly = false,
  onToggleWifiOnAwayOnly,
  onToast,
  recentLogs = [],
}: WifiManagerModalProps) {
  const [apSsid, setApSsid] = useState<string>("AnandSmartDesk");
  const [apPass, setApPass] = useState<string>("Anandsmartdesk");
  const [savingAp, setSavingAp] = useState<boolean>(false);

  // New / Edit Network fields
  const [newSsid, setNewSsid] = useState<string>("");
  const [newPass, setNewPass] = useState<string>("");
  const [isCollegeWifi, setIsCollegeWifi] = useState<boolean>(false);
  const [newCpUrl, setNewCpUrl] = useState<string>("http://192.168.80.1:1000/fgtauth?");
  const [newCpUser, setNewCpUser] = useState<string>("");
  const [newCpPass, setNewCpPass] = useState<string>("");
  const [savingNet, setSavingNet] = useState<boolean>(false);

  // Saved networks & scanning
  const [savedNets, setSavedNets] = useState<SavedNetItem[]>([]);
  const [scannedNets, setScannedNets] = useState<{ ssid: string; rssi: number }[]>(scannedNetworks);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Diagnostic Logs
  const [debugLogs, setDebugLogs] = useState<string>("");
  const [fetchingLogs, setFetchingLogs] = useState<boolean>(false);

  // Keep scannedNets updated with any incoming BLE airwave scan
  useEffect(() => {
    if (scannedNetworks && scannedNetworks.length > 0) {
      setScannedNets(scannedNetworks);
    }
  }, [scannedNetworks]);

  const fetchStatus = async () => {
    if (!deskHost) return;
    setLoadingStatus(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`http://${deskHost}/api/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.ap?.ssid) setApSsid(data.ap.ssid);
        if (Array.isArray(data.saved)) {
          setSavedNets(data.saved);
        }
      }
    } catch (_) {
      // Offline or out of range
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleFetchLogs = async () => {
    setFetchingLogs(true);
    try {
      if (deskHost) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`http://${deskHost}/api/wifi/logs`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setDebugLogs(data.logs || "No logs stored yet.");
          onToast?.("Fetched latest diagnostic logs from ESP32", "info");
          return;
        }
      }
      if (recentLogs && recentLogs.length > 0) {
        const text = recentLogs.slice(-25).map((l) => l.text).join("\n");
        setDebugLogs(`[BLE Live Activity Logs]\n${text}`);
        onToast?.("Showing real-time BLE logs", "info");
      } else {
        onToast?.("Connect to ESP32 via BLE or Hotspot to view diagnostics", "warn");
      }
    } catch (e: any) {
      if (recentLogs && recentLogs.length > 0) {
        const text = recentLogs.slice(-25).map((l) => l.text).join("\n");
        setDebugLogs(`[BLE Live Activity Logs (HTTP Unreachable)]\n${text}`);
      } else {
        onToast?.("Log fetch timed out. Make sure ESP32 is reachable.", "warn");
      }
    } finally {
      setFetchingLogs(false);
    }
  };

  const handleCopyLogs = () => {
    let textToCopy = debugLogs;
    if (!textToCopy && recentLogs && recentLogs.length > 0) {
      textToCopy = recentLogs.slice(-30).map((l) => l.text).join("\n");
    }
    if (!textToCopy) {
      textToCopy = `SSID: ${currentSsid || "None"}\nIP: ${currentIp || "None"}\nWi-Fi State: ${wifiState}\nWi-Fi Connected: ${wifiConnected}\nBLE Connected: ${isBleConnected}`;
    }
    navigator.clipboard?.writeText(textToCopy);
    onToast?.("Diagnostics copied to clipboard! Paste it into chat.", "success");
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      handleFetchLogs();
    }
  }, [isOpen, deskHost]);

  if (!isOpen) return null;

  const handleScan = async () => {
    setIsScanning(true);
    try {
      if (isBleConnected && onScanOverBle) {
        const nets = await onScanOverBle();
        if (nets && nets.length > 0) {
          setScannedNets(nets);
          onToast?.(`Found ${nets.length} Wi-Fi airwaves via BLE!`, "success");
        } else {
          onToast?.("Airwave scan finished. 0 networks detected.", "warn");
        }
        return;
      }

      if (!deskHost) {
        onToast?.("Please connect to Desk via BLE or Hotspot to scan airwaves.", "warn");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`http://${deskHost}/api/wifi/scan`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.networks) && data.networks.length > 0) {
          setScannedNets(data.networks);
          onToast?.(`Found ${data.networks.length} Wi-Fi networks!`, "success");
        } else {
          onToast?.("Scan completed: 0 networks found.", "warn");
        }
      } else {
        onToast?.("Scan request failed. Use manual entry or quick presets.", "warn");
      }
    } catch (e: any) {
      onToast?.("Airwave scan timed out. Use quick chips or manual entry below.", "warn");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveAp = async () => {
    if (!apSsid.trim()) {
      onToast?.("Hotspot name cannot be empty", "warn");
      return;
    }
    if (apPass.length < 8) {
      onToast?.("Hotspot password must be at least 8 characters", "warn");
      return;
    }
    setSavingAp(true);
    try {
      const res = await fetch(`http://${deskHost}/api/wifi/ap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid: apSsid.trim(), pass: apPass.trim() }),
      });
      if (res.ok) {
        onToast?.("Desk Hotspot credentials updated! ESP32 SoftAP restarting.", "success");
      } else {
        onToast?.("Failed to update hotspot settings", "error");
      }
    } catch (e: any) {
      onToast?.("Error: " + (e?.message || "Unreachable"), "error");
    } finally {
      setSavingAp(false);
    }
  };

  const handleSaveNetwork = async (useBleMode = false) => {
    if (!newSsid.trim()) {
      onToast?.("Please enter or select a Wi-Fi SSID", "warn");
      return;
    }
    setSavingNet(true);
    try {
      if (useBleMode && onConfigureOverBle) {
        await onConfigureOverBle(
          newSsid.trim(),
          newPass || undefined,
          isCollegeWifi ? newCpUser.trim() || undefined : undefined,
          isCollegeWifi ? newCpPass || undefined : undefined
        );
        onToast?.(`Sent "${newSsid}" to ESP32 over BLE! Connecting...`, "success");
        setNewSsid("");
        setNewPass("");
        setNewCpUser("");
        setNewCpPass("");
        setIsCollegeWifi(false);
        return;
      }

      const payload: any = {
        ssid: newSsid.trim(),
        pass: newPass,
        connectNow: true,
      };
      if (isCollegeWifi) {
        payload.cpUrl = newCpUrl.trim() || "http://192.168.80.1:1000/fgtauth?";
        payload.cpUser = newCpUser.trim();
        payload.cpPass = newCpPass;
      }
      const res = await fetch(`http://${deskHost}/api/wifi/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onToast?.(`Network "${newSsid}" saved! Connecting...`, "success");
        setNewSsid("");
        setNewPass("");
        setNewCpUser("");
        setNewCpPass("");
        setIsCollegeWifi(false);
        fetchStatus();
      } else {
        onToast?.("Failed to save network via Wi-Fi HTTP", "error");
      }
    } catch (e: any) {
      onToast?.("Error: " + (e?.message || "Unreachable"), "error");
    } finally {
      setSavingNet(false);
    }
  };

  const handleDeleteNetwork = async (idx: number, name: string) => {
    try {
      const res = await fetch(`http://${deskHost}/api/wifi/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idx }),
      });
      if (res.ok) {
        onToast?.(`Removed network "${name}"`, "info");
        fetchStatus();
      }
    } catch (_) {}
  };

  const handleConnectSlot = async (idx: number, name: string) => {
    onToast?.(`Connecting to "${name}"...`, "info");
    try {
      await fetch(`http://${deskHost}/api/wifi/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idx }),
      });
      setTimeout(fetchStatus, 3000);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border-2 border-cyan-500/80 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-white scrollbar-hide">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📶</span>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-cyan-400">Wi-Fi &amp; University Portal Manager</h3>
              <span className="text-[10px] text-zinc-400">Configure campus networks, Fortinet credentials, BLE sync &amp; hotspot</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-zinc-500 font-bold uppercase block text-[10px]">Wi-Fi Radio:</span>
            <span className={`font-extrabold flex items-center gap-1.5 ${
              wifiConnected
                ? "text-emerald-400"
                : wifiState === 2
                ? "text-amber-400"
                : wifiState === 3
                ? "text-cyan-400"
                : "text-zinc-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                wifiConnected
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : wifiState === 2
                  ? "bg-amber-400 animate-ping"
                  : wifiState === 3
                  ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                  : "bg-zinc-500"
              }`} />
              {wifiConnected
                ? `Connected: ${currentSsid || "STA"}`
                : wifiState === 2
                ? `Connecting to ${currentSsid || "Wi-Fi"}...`
                : wifiState === 3
                ? `Hotspot Active: ${currentSsid || "AnandSmartDesk"}`
                : "Standby"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold uppercase block text-[10px]">Active IP:</span>
            <span className="font-mono text-cyan-300 font-bold">{currentIp || (wifiConnected ? "--" : "192.168.4.1")}</span>
          </div>
          <div>
            <span className="text-zinc-500 font-bold uppercase block text-[10px]">Link Transport:</span>
            <span className={`font-bold flex items-center gap-1 ${isBleConnected ? "text-emerald-400" : deskHost ? "text-cyan-400" : "text-rose-400"}`}>
              <span>{isBleConnected ? "⚡ BLE Connected" : deskHost ? `🌐 Hotspot/LAN (${deskHost})` : "🔴 Disconnected"}</span>
            </span>
          </div>
        </div>

        {!isBleConnected && !deskHost && (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-[11px] text-amber-200 flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <span>
              <strong>Desk not yet connected:</strong> Connect via <strong>BLE</strong> (tap <em>"BLE: Disconnected"</em> in the header) OR connect your device to the ESP32 Wi-Fi Hotspot: <strong>AnandSmartDesk</strong> (password: <code>Anandsmartdesk</code>).
            </span>
          </div>
        )}

        {/* ── SECTION 1: ADD WI-FI / CAMPUS NETWORK ── */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-cyan-400">Add Wi-Fi Network</span>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold text-[11px] border border-zinc-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? "Scanning airwaves..." : isBleConnected ? "🔍 Scan Airwaves via BLE" : "🔍 Scan Airwaves"}
            </button>
          </div>


          {/* Detected Nearby Networks Chips */}
          {scannedNets.length > 0 && (
            <div>
              <span className="text-[10px] text-emerald-400 font-bold block mb-1.5">
                📡 DETECTED NEARBY AIRWAVES ({scannedNets.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-black/60 rounded-lg border border-zinc-800">
                {scannedNets.map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNewSsid(n.ssid)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      newSsid === n.ssid
                        ? "bg-emerald-500 text-black border-emerald-400 font-extrabold"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                    }`}
                  >
                    <span>📶 {n.ssid}</span>
                    <span className="text-[9px] opacity-75 font-mono">({n.rssi} dBm)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 font-bold block mb-1">Wi-Fi Name (SSID):</label>
              <input
                type="text"
                value={newSsid}
                onChange={(e) => setNewSsid(e.target.value)}
                placeholder="e.g. Campus_WiFi"
                className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs font-bold focus:border-cyan-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 font-bold block mb-1">Wi-Fi Password (Empty if Open):</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Password (if protected)"
                className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs font-bold focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* Toggle College / Fortinet Portal Credentials */}
          <div className="pt-2 border-t border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCollegeWifi}
                onChange={(e) => setIsCollegeWifi(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-xs font-bold text-zinc-200">
                🏫 Requires College / Fortinet Captive Portal Sign-In
              </span>
            </label>

            {isCollegeWifi && (
              <div className="mt-3 p-3 rounded-lg bg-black/60 border border-zinc-800 space-y-2 animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[9px] text-cyan-400 font-bold">PORTAL GATEWAY LOGIN URL:</label>
                    <span className="text-[9px] text-zinc-500">Trailing session token scraped dynamically</span>
                  </div>
                  <input
                    type="text"
                    value={newCpUrl}
                    onChange={(e) => setNewCpUrl(e.target.value)}
                    placeholder="http://192.168.80.1:1000/fgtauth?"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-white text-xs font-mono"
                  />
                  <div className="text-[10px] text-zinc-400 mt-1 italic">
                    Default college route: <code className="text-cyan-300">http://192.168.80.1:1000/fgtauth?</code>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-400 font-bold block mb-0.5">STUDENT ROLL NO / USERNAME:</label>
                    <input
                      type="text"
                      value={newCpUser}
                      onChange={(e) => setNewCpUser(e.target.value)}
                      placeholder="e.g. 21B91A0501"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-400 font-bold block mb-0.5">STUDENT PORTAL PASSWORD:</label>
                    <input
                      type="password"
                      value={newCpPass}
                      onChange={(e) => setNewCpPass(e.target.value)}
                      placeholder="Your Password"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Dual-Mode (BLE + Wi-Fi HTTP) */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {isBleConnected && onConfigureOverBle && (
              <button
                onClick={() => handleSaveNetwork(true)}
                disabled={savingNet}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                title="Transmits credentials instantly over Bluetooth without switching phone Wi-Fi"
              >
                <span>⚡</span>
                <span>{savingNet ? "Transmitting..." : "Save & Connect via BLE"}</span>
              </button>
            )}

            <button
              onClick={() => handleSaveNetwork(false)}
              disabled={savingNet}
              className={`py-2.5 rounded-lg border font-extrabold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                isBleConnected
                  ? "flex-1 bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300"
                  : "w-full bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20"
              }`}
            >
              <span>🌐</span>
              <span>{savingNet ? "Saving..." : "Save via Wi-Fi HTTP"}</span>
            </button>
          </div>
        </div>

        {/* ── SECTION 2: SAVED NETWORKS LIST ── */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-400">Saved Networks ({savedNets.length}/6)</span>
            <button onClick={fetchStatus} className="text-[11px] text-cyan-400 font-bold hover:underline cursor-pointer">
              Refresh
            </button>
          </div>

          {savedNets.length === 0 ? (
            <div className="text-xs text-zinc-500 italic p-2 text-center">No saved networks found. Add one above!</div>
          ) : (
            <div className="space-y-1.5">
              {savedNets.map((net) => (
                <div key={net.idx} className="p-2.5 rounded-lg bg-black border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white">{net.ssid}</span>
                      {net.hasCP && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-700 rounded">
                          Fortinet Portal
                        </span>
                      )}
                    </div>
                    {net.cpUser && <span className="text-[10px] text-zinc-400 block font-mono">User: {net.cpUser}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConnectSlot(net.idx, net.ssid)}
                      className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-cyan-300 border border-zinc-700 cursor-pointer"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => handleDeleteNetwork(net.idx, net.ssid)}
                      className="px-2 py-1 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION 3: LIVE DIAGNOSTIC & DEBUG LOGS ── */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase text-zinc-300">📋 Diagnostics &amp; Response Logs</span>
              <span className="text-[10px] text-zinc-500 font-mono">(Live ESP32 Buffer)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleFetchLogs}
                disabled={fetchingLogs}
                className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-[11px] font-bold border border-zinc-700 cursor-pointer disabled:opacity-50"
              >
                {fetchingLogs ? "Fetching..." : "🔄 Refresh Logs"}
              </button>
              <button
                onClick={handleCopyLogs}
                className="px-2.5 py-1 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[11px] font-bold border border-cyan-700 cursor-pointer"
              >
                📋 Copy Debug Logs
              </button>
            </div>
          </div>

          <pre className="p-2.5 rounded-lg bg-black border border-zinc-800 text-[11px] font-mono text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
            {debugLogs || "[STANDBY] Tap 'Refresh Logs' to read recent connection responses from ESP32"}
          </pre>
        </div>

        {/* ── SECTION 4: DESK HOTSPOT (SOFTAP) CREDENTIALS ── */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-400">Desk Wi-Fi Hotspot (SoftAP)</span>
            <span className="text-[10px] text-zinc-500 font-mono">IP: 192.168.4.1</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 font-bold block mb-1">Hotspot Name (SSID):</label>
              <input
                type="text"
                value={apSsid}
                onChange={(e) => setApSsid(e.target.value)}
                placeholder="AnandSmartDesk"
                className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs font-bold focus:border-cyan-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 font-bold block mb-1">Hotspot Password (min 8 chars):</label>
              <input
                type="text"
                value={apPass}
                onChange={(e) => setApPass(e.target.value)}
                placeholder="Anandsmartdesk"
                className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs font-bold focus:border-cyan-500 outline-none font-mono"
              />
            </div>
          </div>
          <button
            onClick={handleSaveAp}
            disabled={savingAp}
            className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-cyan-300 font-extrabold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {savingAp ? "Applying..." : "Save Hotspot Credentials"}
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
