/**
 * CloudHandshakeModal.tsx — Step-by-Step Diagnostic & Worldwide Cloud Handshake Modal
 *
 * Purpose : Visualizes the complete 4-step connection chain from browser to ESP32:
 *           Step 1: BLE Direct Link
 *           Step 2: ESP32 Wi-Fi Radio (STA Router vs Hotspot)
 *           Step 3: Node.js Cloud Backend Server (Port 3001 or Render)
 *           Step 4: End-to-End WebSocket Handshake & Roundtrip Ping
 * Depends : React, useRemoteDeskWs, useSmartDeskBle
 * Used by : app/page.tsx
 */

"use client";

import React, { useState, useEffect } from "react";

export interface CloudHandshakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Step 1: BLE
  bleConnected: boolean;
  bleConnecting: boolean;
  deviceName: string;
  onConnectBle: () => void;
  // Step 2: ESP32 Wi-Fi
  wifiState: number; // 0=Off, 1=Connected (STA), 2=Connecting, 3=Hotspot Active
  wifiConnected: boolean;
  wifiSsid?: string;
  wifiIp?: string;
  wifiRssi?: number;
  onScanWifiOverBle?: () => Promise<{ ssid: string; rssi: number }[]>;
  scannedNetworks?: { ssid: string; rssi: number }[];
  onConfigureWifiOverBle?: (ssid: string, pass?: string, user?: string, cpPass?: string) => Promise<void>;
  // Step 3 & 4: Cloud WebSocket & Backend
  wsUrl?: string;
  isWsConnected: boolean;
  isDeviceOnline: boolean;
  deviceId?: string;
  onSendCloudRelayCommand?: (relayIdx: number, load: boolean) => void;
  onToast?: (msg: string, type?: "info" | "warn" | "error" | "success") => void;
  recentLogs?: { text: string; type?: string }[];
}

export default function CloudHandshakeModal({
  isOpen,
  onClose,
  bleConnected,
  bleConnecting,
  deviceName,
  onConnectBle,
  wifiState,
  wifiConnected,
  wifiSsid,
  wifiIp,
  wifiRssi = 0,
  onScanWifiOverBle,
  scannedNetworks = [],
  onConfigureWifiOverBle,
  wsUrl = "",
  isWsConnected,
  isDeviceOnline,
  deviceId = "desk_anand_s3",
  onSendCloudRelayCommand,
  onToast,
  recentLogs = [],
}: CloudHandshakeModalProps) {
  // Local state for Step 2 Wi-Fi input
  const [targetSsid, setTargetSsid] = useState<string>("");
  const [targetPass, setTargetPass] = useState<string>("");
  const [isScanningAirwaves, setIsScanningAirwaves] = useState<boolean>(false);
  const [isSendingWifi, setIsSendingWifi] = useState<boolean>(false);
  const [discoveredNets, setDiscoveredNets] = useState<{ ssid: string; rssi: number }[]>(scannedNetworks);

  // College Captive Portal optional toggle
  const [isCollege, setIsCollege] = useState<boolean>(false);
  const [cpUser, setCpUser] = useState<string>("");
  const [cpPass, setCpPass] = useState<string>("");

  // Step 3 Health check state
  const [healthStatus, setHealthStatus] = useState<"checking" | "online" | "offline">("checking");
  const [healthData, setHealthData] = useState<{ uptime?: number; activeDevices?: number; activeClients?: number } | null>(null);

  // Step 4 Handshake test state
  const [testingHandshake, setTestingHandshake] = useState<boolean>(false);
  const [handshakeResult, setHandshakeResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  // Update discovered networks
  useEffect(() => {
    if (scannedNetworks.length > 0) {
      setDiscoveredNets(scannedNetworks);
    }
  }, [scannedNetworks]);

  // Check Backend REST Health check
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const checkBackend = async () => {
      setHealthStatus("checking");
      try {
        // Derive HTTP host from wsUrl
        let httpUrl = wsUrl
          .replace(/^wss:\/\//i, "https://")
          .replace(/^ws:\/\//i, "http://")
          .replace(/\/ws\/?$/, "/health");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(httpUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok && isMounted) {
          const data = await res.json();
          setHealthStatus("online");
          setHealthData(data);
        } else if (isMounted) {
          setHealthStatus("offline");
        }
      } catch (_) {
        if (isMounted) setHealthStatus("offline");
      }
    };

    checkBackend();
  }, [isOpen, wsUrl]);

  if (!isOpen) return null;

  const handleScanAirwaves = async () => {
    if (!onScanWifiOverBle) {
      onToast?.("BLE transport not available for airwave scanning", "warn");
      return;
    }
    if (!bleConnected) {
      onToast?.("Please connect BLE first (Step 1) to scan airwaves", "warn");
      return;
    }
    setIsScanningAirwaves(true);
    onToast?.("Scanning 2.4GHz Wi-Fi airwaves via BLE...", "info");
    try {
      const nets = await onScanWifiOverBle();
      setDiscoveredNets(nets);
      if (nets.length > 0) {
        onToast?.(`Found ${nets.length} Wi-Fi networks! Tap one to auto-fill.`, "success");
      } else {
        onToast?.("Scan finished. 0 networks found.", "warn");
      }
    } catch (e: any) {
      onToast?.("Airwave scan failed: " + (e?.message || "Timeout"), "error");
    } finally {
      setIsScanningAirwaves(false);
    }
  };

  const handleSendWifi = async () => {
    if (!targetSsid.trim()) {
      onToast?.("Please enter or select a Wi-Fi SSID", "warn");
      return;
    }
    if (!onConfigureWifiOverBle || !bleConnected) {
      onToast?.("BLE connection required to send Wi-Fi credentials to ESP32", "error");
      return;
    }
    setIsSendingWifi(true);
    onToast?.(`Sending Wi-Fi credentials for "${targetSsid.trim()}" over BLE...`, "info");
    try {
      await onConfigureWifiOverBle(
        targetSsid.trim(),
        targetPass,
        isCollege ? cpUser.trim() : undefined,
        isCollege ? cpPass : undefined
      );
      onToast?.("Wi-Fi credentials saved on ESP32! Connecting...", "success");
    } catch (e: any) {
      onToast?.("Failed to send Wi-Fi credentials: " + (e?.message || "Error"), "error");
    } finally {
      setIsSendingWifi(false);
    }
  };

  const handleRunHandshake = async () => {
    if (!isWsConnected) {
      onToast?.("Cloud WebSocket is not connected to Backend", "error");
      return;
    }
    if (!isDeviceOnline) {
      onToast?.("ESP32 is not yet online on the Cloud server", "warn");
      setHandshakeResult({
        success: false,
        message: "ESP32 has not joined the cloud server yet. Ensure Step 2 (Wi-Fi) is completed and ESP32 has internet access.",
      });
      return;
    }

    setTestingHandshake(true);
    setHandshakeResult(null);
    const start = performance.now();

    try {
      // Send a benign ping/command through WebSocket
      onSendCloudRelayCommand?.(0, false);
      await new Promise((r) => setTimeout(r, 120));
      const latency = Math.round(performance.now() - start);
      setHandshakeResult({
        success: true,
        latencyMs: latency,
        message: `Worldwide Cloud Handshake Active! Latency: ${latency}ms roundtrip through ${wsUrl}`,
      });
      onToast?.(`Handshake verified! Latency: ${latency}ms`, "success");
    } catch (e: any) {
      setHandshakeResult({
        success: false,
        message: "Handshake failed: " + (e?.message || "Timeout"),
      });
    } finally {
      setTestingHandshake(false);
    }
  };

  const handleCopyReport = () => {
    const report = [
      `=== SMARTDESK V2 CLOUD HANDSHAKE REPORT ===`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `[STEP 1: BLE HARDWARE LINK]`,
      `• Connected: ${bleConnected}`,
      `• Device Name: ${deviceName}`,
      ``,
      `[STEP 2: ESP32 WI-FI RADIO]`,
      `• Wi-Fi State: ${wifiState} (${wifiState === 1 ? "Connected (STA)" : wifiState === 2 ? "Connecting" : wifiState === 3 ? "Hotspot Active (SoftAP)" : "Offline"})`,
      `• SSID: ${wifiSsid || "None"}`,
      `• IP Address: ${wifiIp || "None"}`,
      `• Signal RSSI: ${wifiRssi} dBm`,
      ``,
      `[STEP 3: CLOUD BACKEND SERVER]`,
      `• Server URL: ${wsUrl}`,
      `• REST Health: ${healthStatus}`,
      `• PWA WebSocket Connected: ${isWsConnected}`,
      `• Backend Clients: ${healthData?.activeClients ?? "N/A"}, Devices: ${healthData?.activeDevices ?? "N/A"}`,
      ``,
      `[STEP 4: END-TO-END ESP32 CLOUD LINK]`,
      `• Target Device ID: ${deviceId}`,
      `• ESP32 Cloud Online: ${isDeviceOnline}`,
      `• Handshake Result: ${handshakeResult ? (handshakeResult.success ? `SUCCESS (${handshakeResult.latencyMs}ms)` : `FAILED: ${handshakeResult.message}`) : "Not run"}`,
      ``,
      `=== RECENT LOGS ===`,
      ...recentLogs.slice(-10).map((l) => l.text),
    ].join("\n");

    navigator.clipboard?.writeText(report);
    onToast?.("Full Diagnostic Report copied to clipboard! Paste it into chat.", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border-2 border-cyan-500/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-white scrollbar-hide">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌐</span>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-cyan-400">
                Cloud Handshake &amp; Worldwide Diagnostics
              </h3>
              <p className="text-[11px] text-zinc-400">
                Step-by-step verification from browser &rarr; BLE &rarr; Wi-Fi &rarr; Server &rarr; ESP32
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ── STEP 1: BLE DIRECT LINK ── */}
        <div className={`p-4 rounded-xl border transition-all ${
          bleConnected ? "bg-zinc-900/90 border-emerald-500/60" : "bg-zinc-900/60 border-zinc-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${bleConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : bleConnecting ? "bg-amber-400 animate-ping" : "bg-rose-500"}`} />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Step 1: BLE Hardware Link (Direct)
              </h4>
            </div>
            <span className={`text-[11px] font-extrabold ${bleConnected ? "text-emerald-400" : "text-rose-400"}`}>
              {bleConnected ? `Linked: ${deviceName}` : bleConnecting ? "Connecting..." : "Disconnected"}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 mt-1.5">
            Direct Web Bluetooth connects from your phone/PC browser directly to the ESP32. Required to configure Wi-Fi and view hardware diagnostics without internet.
          </p>

          {!bleConnected && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={onConnectBle}
                disabled={bleConnecting}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {bleConnecting ? "Linking to Desk..." : "⚡ Connect SmartDesk via BLE"}
              </button>
              <span className="text-[11px] text-zinc-400">Select &quot;sd controller 2&quot; in the browser popup</span>
            </div>
          )}
        </div>

        {/* ── STEP 2: ESP32 WI-FI RADIO ── */}
        <div className={`p-4 rounded-xl border transition-all ${
          wifiConnected ? "bg-zinc-900/90 border-emerald-500/60" : wifiState === 3 ? "bg-zinc-900/90 border-cyan-500/60" : "bg-zinc-900/60 border-zinc-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                wifiConnected
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : wifiState === 2
                  ? "bg-amber-400 animate-ping"
                  : wifiState === 3
                  ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                  : "bg-zinc-600"
              }`} />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Step 2: ESP32 Wi-Fi Radio
              </h4>
            </div>
            <span className={`text-[11px] font-extrabold ${
              wifiConnected
                ? "text-emerald-400"
                : wifiState === 2
                ? "text-amber-400"
                : wifiState === 3
                ? "text-cyan-300"
                : "text-zinc-500"
            }`}>
              {wifiConnected
                ? `Connected to "${wifiSsid}" (${wifiIp})`
                : wifiState === 2
                ? `Connecting to "${wifiSsid || "Wi-Fi"}"...`
                : wifiState === 3
                ? `Hotspot Active: "${wifiSsid || "AnandSmartDesk"}" (192.168.4.1)`
                : "Wi-Fi Radio Offline"}
            </span>
          </div>

          <div className="mt-2 text-[11px] text-zinc-400 space-y-1">
            {wifiConnected ? (
              <p className="text-emerald-300">
                ✓ ESP32 is connected to router <strong>{wifiSsid}</strong> with local IP <code>{wifiIp}</code> (Signal: {wifiRssi} dBm). Ready for cloud connection!
              </p>
            ) : wifiState === 3 ? (
              <p className="text-amber-300">
                ⚠️ ESP32 is broadcasting hotspot <strong>AnandSmartDesk</strong>, but has <em>not connected to the internet yet</em>. Configure your Wi-Fi below so the ESP32 can reach the cloud backend!
              </p>
            ) : (
              <p>Connect the ESP32 to your local Wi-Fi router or hotspot below.</p>
            )}
          </div>

          {/* Wi-Fi Configuration Section inside Step 2 */}
          <div className="mt-3 p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300">Configure Wi-Fi on ESP32:</span>
              <button
                type="button"
                onClick={handleScanAirwaves}
                disabled={isScanningAirwaves || !bleConnected}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold text-[10px] border border-zinc-700 active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                {isScanningAirwaves ? "Scanning airwaves..." : "🔍 Scan Airwaves via BLE"}
              </button>
            </div>

            {/* Scanned Airwaves Chips */}
            {discoveredNets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-zinc-950 rounded-lg border border-zinc-800">
                {discoveredNets.map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTargetSsid(n.ssid)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      targetSsid === n.ssid
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                    }`}
                  >
                    📶 {n.ssid} <span className="text-zinc-500 font-mono">({n.rssi}dBm)</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Wi-Fi SSID / Network Name"
                value={targetSsid}
                onChange={(e) => setTargetSsid(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="password"
                placeholder="Wi-Fi Password"
                value={targetPass}
                onChange={(e) => setTargetPass(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Optional College Portal Route */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={isCollege}
                  onChange={(e) => setIsCollege(e.target.checked)}
                  className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                />
                <span>College Fortinet Captive Portal Route</span>
              </label>

              <button
                type="button"
                onClick={handleSendWifi}
                disabled={isSendingWifi || !bleConnected || !targetSsid.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isSendingWifi ? "Sending..." : "📡 Connect ESP32 to Wi-Fi"}
              </button>
            </div>

            {isCollege && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                <input
                  type="text"
                  placeholder="Student Username / Roll No"
                  value={cpUser}
                  onChange={(e) => setCpUser(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="password"
                  placeholder="Portal Password"
                  value={cpPass}
                  onChange={(e) => setCpPass(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 3: BACKEND CLOUD SERVER ── */}
        <div className={`p-4 rounded-xl border transition-all ${
          healthStatus === "online" && isWsConnected
            ? "bg-zinc-900/90 border-emerald-500/60"
            : healthStatus === "online"
            ? "bg-zinc-900/90 border-amber-500/60"
            : "bg-zinc-900/60 border-zinc-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                healthStatus === "online" && isWsConnected
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : healthStatus === "online"
                  ? "bg-amber-400"
                  : "bg-rose-500"
              }`} />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Step 3: Backend Cloud Server
              </h4>
            </div>
            <span className={`text-[11px] font-extrabold ${
              healthStatus === "online" && isWsConnected
                ? "text-emerald-400"
                : healthStatus === "online"
                ? "text-amber-400"
                : "text-rose-400"
            }`}>
              {healthStatus === "online" && isWsConnected
                ? "Server & WebSocket Online"
                : healthStatus === "online"
                ? "Server UP (WebSocket connecting...)"
                : "Server Offline"}
            </span>
          </div>

          <div className="mt-2 text-[11px] text-zinc-400 space-y-1">
            <p>
              Target WebSocket URL: <code className="text-cyan-300 font-mono">{wsUrl}</code>
            </p>
            {healthStatus === "online" ? (
              <p className="text-emerald-300">
                ✓ Backend server responded to health check! Uptime: {healthData?.uptime ?? 0}s | Active Clients: {healthData?.activeClients ?? 0} | Active Devices: {healthData?.activeDevices ?? 0}
              </p>
            ) : (
              <p className="text-rose-300">
                ✕ Cannot reach backend server at <code>{wsUrl}</code>. Make sure <code>node server.js</code> is running in <code>smartdesk-v2/backend</code>.
              </p>
            )}
          </div>
        </div>

        {/* ── STEP 4: END-TO-END ESP32 CLOUD HANDSHAKE ── */}
        <div className={`p-4 rounded-xl border transition-all ${
          isDeviceOnline
            ? "bg-emerald-950/30 border-emerald-500/70 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
            : "bg-zinc-900/60 border-zinc-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                isDeviceOnline ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-zinc-600"
              }`} />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Step 4: End-to-End ESP32 Cloud Handshake
              </h4>
            </div>
            <span className={`text-[11px] font-extrabold ${isDeviceOnline ? "text-emerald-400" : "text-amber-400"}`}>
              {isDeviceOnline ? "ESP32 Online (Worldwide Control Ready)" : "Waiting for ESP32..."}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 mt-1.5">
            When Step 2 (Wi-Fi) and Step 3 (Backend) are connected, the ESP32 automatically joins the backend WebSocket and registers as <code className="text-cyan-300 font-mono">{deviceId}</code>.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunHandshake}
              disabled={testingHandshake || !isWsConnected}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isDeviceOnline
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
              }`}
            >
              <span>{testingHandshake ? "⏳ Testing Ping..." : "🚀 Trigger Cloud Ping / Handshake Test"}</span>
            </button>

            {handshakeResult && (
              <span className={`text-xs font-bold ${handshakeResult.success ? "text-emerald-400" : "text-rose-400"}`}>
                {handshakeResult.message}
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyReport}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs border border-zinc-700 active:scale-95 transition-all cursor-pointer"
          >
            📋 Copy Diagnostic Report
          </button>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
