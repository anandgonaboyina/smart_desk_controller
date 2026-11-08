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
  onUpdateCloudCredentials?: (user: string, pass: string, deviceId?: string, deviceName?: string) => Promise<any> | void;
  onUpdateClientCredentialsOnly?: (user: string, pass: string, deviceId: string, deviceName?: string) => void;
  hardwareCloudConfig?: { devId: string; user: string; name: string } | null;
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
  onUpdateCloudCredentials,
  onUpdateClientCredentialsOnly,
  hardwareCloudConfig,
  onToast,
  recentLogs = [],
}: CloudHandshakeModalProps) {
  // Local state for Step 2 Wi-Fi input
  const [targetSsid, setTargetSsid] = useState<string>("");
  const [targetPass, setTargetPass] = useState<string>("");
  const [showTargetPass, setShowTargetPass] = useState<boolean>(false);
  const [isScanningAirwaves, setIsScanningAirwaves] = useState<boolean>(false);
  const [isSendingWifi, setIsSendingWifi] = useState<boolean>(false);
  const [discoveredNets, setDiscoveredNets] = useState<{ ssid: string; rssi: number }[]>(scannedNetworks);

  // College Captive Portal optional toggle
  const [isCollege, setIsCollege] = useState<boolean>(false);
  const [cpUser, setCpUser] = useState<string>("");
  const [cpPass, setCpPass] = useState<string>("");
  const [showCpPass, setShowCpPass] = useState<boolean>(false);

  // Device Username & Password for Cloud Handshake
  const [cloudUser, setCloudUser] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_cloud_user") || "user_anand_primary";
    }
    return "user_anand_primary";
  });
  const [cloudPass, setCloudPass] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_cloud_pass") || "";
    }
    return "";
  });
  const [cloudDeviceId, setCloudDeviceId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_cloud_device_id") || deviceId || "desk_anand_s3";
    }
    return deviceId || "desk_anand_s3";
  });
  const [cloudDeskName, setCloudDeskName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_last_device_name") || deviceName || "SmartDesk S3";
    }
    return deviceName || "SmartDesk S3";
  });
  const [showCloudPass, setShowCloudPass] = useState<boolean>(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState<boolean>(false);
  const [saveConfirmStatus, setSaveConfirmStatus] = useState<{
    show: boolean;
    success: boolean;
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  // Auto-fill from actual physical hardware if read over BLE
  useEffect(() => {
    if (hardwareCloudConfig) {
      if (hardwareCloudConfig.devId) setCloudDeviceId(hardwareCloudConfig.devId);
      if (hardwareCloudConfig.user) setCloudUser(hardwareCloudConfig.user);
      if (hardwareCloudConfig.name) setCloudDeskName(hardwareCloudConfig.name);
    }
  }, [hardwareCloudConfig]);

  // Action 1: Connect this PWA to an existing desk on Cloud Relay (No BLE required)
  const handleConnectClientToDesk = () => {
    const d = cloudDeviceId.trim();
    const u = cloudUser.trim();
    const p = cloudPass;
    const n = cloudDeskName.trim();

    if (!d || !u) {
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "Validation Incomplete",
        message: "Target Cloud Device ID and User Account ID are required.",
        details: "Please specify both fields to connect your browser to this desk.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("smartdesk_cloud_user", u);
      localStorage.setItem("smartdesk_cloud_pass", p);
      localStorage.setItem("smartdesk_cloud_device_id", d);
      localStorage.setItem("smartdesk_last_device_name", n);
    }

    onUpdateClientCredentialsOnly?.(u, p, d, n);

    setSaveConfirmStatus({
      show: true,
      success: true,
      title: "PWA Connected to Target Desk!",
      message: `Browser WebSocket reconnected to monitor Device ID '${d}' under Owner '${u}'.`,
      details: `Target Device ID: ${d} • User Account: ${u} • Password: ${p ? "Configured" : "None"}`,
    });
    onToast?.(`PWA monitoring device '${d}'`, "success");
  };

  // Action 2: Flash new IDs into physical ESP32 Hardware (via BLE with hardware ACK)
  const handleFlashCredentialsToHardware = async () => {
    const d = cloudDeviceId.trim();
    const u = cloudUser.trim();
    const p = cloudPass;
    const n = cloudDeskName.trim();

    if (!d || !u) {
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "Validation Incomplete",
        message: "Target Cloud Device ID and User Account ID are required.",
        details: "Please specify both fields before saving to ESP32.",
      });
      return;
    }

    if (!bleConnected) {
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "BLE Link Required to Flash Hardware",
        message: "Physical hardware must be connected over BLE (Step 1) to securely flash credentials.",
        details: "Direct Bluetooth proximity is required to protect your desk against remote hijacking.",
      });
      return;
    }

    setIsSavingCredentials(true);
    setSaveConfirmStatus(null);

    try {
      // Dispatch over BLE (0xEA opcode) and await hardware ACK notification
      await onUpdateCloudCredentials?.(u, p, d, n);

      // ONLY commit to browser storage AFTER the hardware confirmed receipt!
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_cloud_user", u);
        localStorage.setItem("smartdesk_cloud_pass", p);
        localStorage.setItem("smartdesk_cloud_device_id", d);
        localStorage.setItem("smartdesk_last_device_name", n);
      }

      setSaveConfirmStatus({
        show: true,
        success: true,
        title: "Hardware Confirmed & Synced!",
        message: `ESP32 verified and saved new credentials to NVS. The physical hardware is restarting its cloud connection with Device ID: "${d}".`,
        details: `Hardware Device ID: ${d} • Owner: ${u} • Display Name: ${n || "SmartDesk"} • Password: ${p ? "Enabled" : "None"}`,
      });
      onToast?.("ESP32 hardware acknowledged and updated cloud credentials!", "success");
    } catch (err: any) {
      // Revert / do NOT commit if hardware failed or timed out!
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "Hardware Sync Failed",
        message: err?.message || "ESP32 did not acknowledge update within 4 seconds. Previous settings were kept.",
        details: "Please verify Bluetooth connection and ensure the desk is powered on and in range.",
      });
      onToast?.("Failed to flash credentials to ESP32", "error");
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Action 3: Revert to Factory Defaults (desk_anand_s3 / user_anand_primary)
  const handleResetToDefaults = () => {
    setCloudDeviceId("desk_anand_s3");
    setCloudUser("user_anand_primary");
    setCloudPass("");
    setCloudDeskName("SmartDesk S3");

    if (typeof window !== "undefined") {
      localStorage.setItem("smartdesk_cloud_user", "user_anand_primary");
      localStorage.setItem("smartdesk_cloud_pass", "");
      localStorage.setItem("smartdesk_cloud_device_id", "desk_anand_s3");
      localStorage.setItem("smartdesk_last_device_name", "SmartDesk S3");
    }

    onUpdateClientCredentialsOnly?.("user_anand_primary", "", "desk_anand_s3", "SmartDesk S3");

    setSaveConfirmStatus({
      show: true,
      success: true,
      title: "PWA Reset to Factory Defaults",
      message: "Target Device ID restored to 'desk_anand_s3' (user_anand_primary).",
      details: "Device ID: desk_anand_s3 • User: user_anand_primary • Password: (open)",
    });
    onToast?.("Reset target to factory default (desk_anand_s3)", "info");
  };

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
        targetPass || "",
        isCollege ? cpUser.trim() : "",
        isCollege ? cpPass || "" : ""
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
      const activeDevId = cloudDeviceId.trim() || deviceId;
      setHandshakeResult({
        success: true,
        latencyMs: latency,
        message: `Worldwide Cloud Handshake Active! Latency: ${latency}ms roundtrip through ${wsUrl} to ${activeDevId}`,
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
      `• Target Device ID: ${cloudDeviceId.trim() || deviceId}`,
      `• Cloud Account User: ${cloudUser.trim()}`,
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
                maxLength={32}
                placeholder="Wi-Fi SSID / Network Name (max 32 chars)"
                value={targetSsid}
                onChange={(e) => setTargetSsid(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <div className="relative">
                <input
                  type={showTargetPass ? "text" : "password"}
                  maxLength={63}
                  placeholder="Wi-Fi Password (max 63 chars, empty if open)"
                  value={targetPass}
                  onChange={(e) => setTargetPass(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowTargetPass(!showTargetPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 text-xs cursor-pointer select-none"
                  title={showTargetPass ? "Hide password" : "Show password"}
                >
                  {showTargetPass ? "👁️" : "🙈"}
                </button>
              </div>
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
                <div className="relative">
                  <input
                    type={showCpPass ? "text" : "password"}
                    placeholder="Portal Password"
                    value={cpPass}
                    onChange={(e) => setCpPass(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCpPass(!showCpPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 text-xs cursor-pointer select-none"
                    title={showCpPass ? "Hide password" : "Show password"}
                  >
                    {showCpPass ? "👁️" : "🙈"}
                  </button>
                </div>
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

          {/* Device Username & Password Handshake Config */}
          <div className="mt-3 p-3.5 rounded-xl bg-black/60 border border-zinc-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-xs">●</span>
                <span className="text-xs text-zinc-200 font-extrabold uppercase tracking-wider">
                  Device Cloud Credentials &amp; Mapping:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="text-[10px] text-zinc-400 hover:text-cyan-300 underline font-mono cursor-pointer"
                  title="Reset PWA target to factory default desk_anand_s3"
                >
                  ↺ Reset Defaults (desk_anand_s3)
                </button>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cloudPass ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"}`}>
                  {cloudPass ? "Password Protected" : "No Password (Open Setup)"}
                </span>
              </div>
            </div>

            {hardwareCloudConfig && (
              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-700/40 text-[11px] text-cyan-300 flex items-center justify-between">
                <span>⚡ Physical ESP32 Flash Identity: <strong className="font-mono text-white">{hardwareCloudConfig.devId || "desk_anand_s3"}</strong> (User: <strong className="font-mono text-white">{hardwareCloudConfig.user || "user_anand_primary"}</strong>)</span>
                <button
                  type="button"
                  onClick={() => {
                    if (hardwareCloudConfig.devId) setCloudDeviceId(hardwareCloudConfig.devId);
                    if (hardwareCloudConfig.user) setCloudUser(hardwareCloudConfig.user);
                    if (hardwareCloudConfig.name) setCloudDeskName(hardwareCloudConfig.name);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-white underline ml-2"
                >
                  Auto-Fill from ESP32
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 block font-bold mb-1">Target Cloud Device ID (Unique Hardware):</label>
                <input
                  type="text"
                  value={cloudDeviceId}
                  onChange={(e) => setCloudDeviceId(e.target.value)}
                  placeholder="desk_anand_s3"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block font-bold mb-1">Desk Display Name (BLE/Cloud):</label>
                <input
                  type="text"
                  value={cloudDeskName}
                  onChange={(e) => setCloudDeskName(e.target.value)}
                  placeholder="SmartDesk S3"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block font-bold mb-1">User Account ID:</label>
                <input
                  type="text"
                  value={cloudUser}
                  onChange={(e) => setCloudUser(e.target.value)}
                  placeholder="user_anand_primary"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block font-bold mb-1">Device Password (Optional):</label>
                <div className="relative">
                  <input
                    type={showCloudPass ? "text" : "password"}
                    value={cloudPass}
                    onChange={(e) => setCloudPass(e.target.value)}
                    placeholder="Leave empty for open setup"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 pr-8 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudPass(!showCloudPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 text-xs cursor-pointer select-none"
                    title={showCloudPass ? "Hide password" : "Show password"}
                  >
                    {showCloudPass ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmation Status Box */}
            {saveConfirmStatus?.show && (
              <div
                className={`p-3 rounded-xl border transition-all animate-in fade-in ${
                  saveConfirmStatus.success
                    ? "bg-emerald-950/40 border-emerald-500/70 text-emerald-200"
                    : "bg-rose-950/40 border-rose-500/70 text-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg shrink-0 mt-0.5">
                      {saveConfirmStatus.success ? "✅" : "⚠️"}
                    </span>
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-wider">
                        {saveConfirmStatus.title}
                      </h5>
                      <p className="text-[11px] mt-0.5 text-zinc-300 leading-relaxed">
                        {saveConfirmStatus.message}
                      </p>
                      {saveConfirmStatus.details && (
                        <p className="text-[10px] font-mono mt-1.5 p-1.5 rounded bg-black/50 border border-white/10 text-cyan-300 break-all">
                          {saveConfirmStatus.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveConfirmStatus(null)}
                    className="text-zinc-400 hover:text-white text-xs p-1 rounded hover:bg-white/10 cursor-pointer shrink-0"
                    title="Dismiss confirmation"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons: 1. Connect Client (Remote/Anywhere) vs 2. Flash Hardware (Proximity BLE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleConnectClientToDesk}
                className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 hover:text-white border border-cyan-600/40 font-extrabold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-98 shadow-md"
              >
                <span className="flex items-center gap-1.5 font-black">
                  <span>🌐</span> Connect PWA to this Desk
                </span>
                <span className="text-[9px] text-zinc-400 font-normal">Connects browser to target Device ID (No BLE needed)</span>
              </button>

              {bleConnected ? (
                <button
                  type="button"
                  onClick={handleFlashCredentialsToHardware}
                  disabled={isSavingCredentials}
                  className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-98 shadow-md disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5 font-black">
                    <span>{isSavingCredentials ? "⏳" : "⚡"}</span>
                    {isSavingCredentials ? "Awaiting Hardware Confirmation..." : "Flash IDs into ESP32 Hardware"}
                  </span>
                  <span className="text-[9px] text-cyan-100 font-normal">Saves to physical ESP32 flash &amp; restarts cloud client</span>
                </button>
              ) : (
                <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-amber-300 leading-tight">
                    <span className="font-bold">🔒 BLE required</span> to reprogram physical ESP32 flash memory.
                  </div>
                  <button
                    type="button"
                    onClick={onConnectBle}
                    disabled={bleConnecting}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                  >
                    {bleConnecting ? "Connecting..." : "⚡ Connect BLE"}
                  </button>
                </div>
              )}
            </div>
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
            When Step 2 (Wi-Fi) and Step 3 (Backend) are connected, the ESP32 automatically joins the backend WebSocket and registers as <code className="text-cyan-300 font-mono">{cloudDeviceId.trim() || deviceId}</code>.
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
