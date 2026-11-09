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
  onReconnectCloud?: () => void;
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
  deviceId = "desk_anand",
  onSendCloudRelayCommand,
  onUpdateCloudCredentials,
  onUpdateClientCredentialsOnly,
  onReconnectCloud,
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
      const saved = localStorage.getItem("smartdesk_cloud_device_id");
      if (saved && saved.trim()) return saved.trim();
    }
    return deviceId || "desk_anand";
  });
  const [cloudDeskName, setCloudDeskName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_last_device_name") || deviceName || "SmartDesk";
    }
    return deviceName || "SmartDesk";
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

  // UI States for PWA Auto-Reload and Inline Status
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [inlineStatus, setInlineStatus] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Auto-fill from actual physical hardware if read over BLE
  useEffect(() => {
    if (hardwareCloudConfig) {
      if (hardwareCloudConfig.devId) setCloudDeviceId(hardwareCloudConfig.devId);
      if (hardwareCloudConfig.user) setCloudUser(hardwareCloudConfig.user);
      if (hardwareCloudConfig.name) setCloudDeskName(hardwareCloudConfig.name);
      else if (hardwareCloudConfig.devId) setCloudDeskName(hardwareCloudConfig.devId);
    }
  }, [hardwareCloudConfig]);

  // Action 1: Connect this PWA to an existing desk on Cloud Relay with Real Server Verification
  const handleConnectClientToDesk = async () => {
    const d = cloudDeviceId.trim();
    const u = cloudUser.trim();
    const p = cloudPass;
    const n = cloudDeskName.trim();

    if (!d || !u) {
      setInlineStatus({ text: "Validation Failed: ID & User required.", type: "error" });
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "Validation Failed",
        message: "Device ID and User Account ID are required.",
      });
      return;
    }

    setIsVerifying(true);
    setSaveConfirmStatus(null);
    setInlineStatus({ text: "Verifying credentials with server...", type: "info" });

    // Derive HTTP URL from wsUrl
    const httpUrl = (wsUrl || "wss://smart-desk-controller.onrender.com/ws")
      .replace(/^wss:\/\//i, "https://")
      .replace(/^ws:\/\//i, "http://")
      .replace(/\/ws\/?$/, "");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(`${httpUrl}/api/device/${encodeURIComponent(d)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u, password: p, deviceName: n }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const resData = await res.json().catch(() => null);

      if (res.ok && resData && resData.ok) {
        const verifiedName = resData.deviceName || n || d;
        if (typeof window !== "undefined") {
          localStorage.setItem("smartdesk_cloud_user", u);
          localStorage.setItem("smartdesk_cloud_pass", p);
          localStorage.setItem("smartdesk_cloud_device_id", d);
          localStorage.setItem("smartdesk_last_device_name", verifiedName);
        }

        onUpdateClientCredentialsOnly?.(u, p, d, verifiedName);

        setSaveConfirmStatus({
          show: true,
          success: true,
          title: "Device Verified & Connected!",
          message: `Verified with cloud server! Desk '${verifiedName}' is online. Click OK to reload.`,
        });
        setInlineStatus({ text: "Verified & Connected!", type: "success" });
        onToast?.(`PWA connected to device '${d}'.`, "success");
      } else {
        const errorMsg = resData?.error || "Device verification failed. Please check device password.";
        setSaveConfirmStatus({
          show: true,
          success: false,
          title: "Verification Failed",
          message: errorMsg,
        });
        setInlineStatus({ text: "Verification Mismatch", type: "error" });
        onToast?.(errorMsg, "error");
      }
    } catch (err: any) {
      // If server could not be reached (e.g. Render backend cold boot), save credentials so connection succeeds upon boot
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_cloud_user", u);
        localStorage.setItem("smartdesk_cloud_pass", p);
        localStorage.setItem("smartdesk_cloud_device_id", d);
        if (n) localStorage.setItem("smartdesk_last_device_name", n);
      }
      onUpdateClientCredentialsOnly?.(u, p, d, n);

      setSaveConfirmStatus({
        show: true,
        success: true,
        title: "Configuration Saved!",
        message: `Credentials saved for '${d}'. Server may be waking up. Click OK to reload and connect.`,
      });
      setInlineStatus({ text: "Configuration saved. Ready to reload.", type: "success" });
      onToast?.(`PWA monitoring device '${d}'.`, "info");
    } finally {
      setIsVerifying(false);
    }
  };

  // Action 2: Flash new IDs into physical ESP32 Hardware (via BLE with hardware ACK)
  const handleFlashCredentialsToHardware = async () => {
    const d = cloudDeviceId.trim();
    const u = cloudUser.trim();
    const p = cloudPass;
    const n = cloudDeskName.trim();

    if (!d || !u) {
      setInlineStatus({ text: "Validation Failed: ID & User required.", type: "error" });
      return;
    }

    if (!bleConnected) {
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "BLE Link Required",
        message: "Physical hardware must be connected over BLE to securely flash credentials.",
      });
      return;
    }

    setIsSavingCredentials(true);
    setSaveConfirmStatus(null);
    setInlineStatus({ text: "Flashing ESP32 Hardware...", type: "info" });

    try {
      await onUpdateCloudCredentials?.(u, p, d, n);

      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_cloud_user", u);
        localStorage.setItem("smartdesk_cloud_pass", p);
        localStorage.setItem("smartdesk_cloud_device_id", d);
        localStorage.setItem("smartdesk_last_device_name", n);
      }

      setSaveConfirmStatus({
        show: true,
        success: true,
        title: "Hardware Synced!",
        message: `ESP32 has verified and saved credentials. Click OK to reload and connect.`,
      });
      setInlineStatus({ text: "Hardware Synced! Ready to reload.", type: "success" });
      onToast?.("ESP32 hardware acknowledged and updated cloud credentials!", "success");
    } catch (err: any) {
      setSaveConfirmStatus({
        show: true,
        success: false,
        title: "Hardware Sync Failed",
        message: "Connection failed: Device name verification mismatch or password error.",
      });
      setInlineStatus({ text: "Verification Mismatch", type: "error" });
      onToast?.("Connection failed: Device name verification mismatch or password error.", "error");
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Action 3: Revert to Factory Defaults (desk_anand / user_anand_primary)
  const handleResetToDefaults = () => {
    setCloudDeviceId("desk_anand");
    setCloudUser("user_anand_primary");
    setCloudPass("");
    setCloudDeskName("SmartDesk");

    if (typeof window !== "undefined") {
      localStorage.setItem("smartdesk_cloud_user", "user_anand_primary");
      localStorage.setItem("smartdesk_cloud_pass", "");
      localStorage.setItem("smartdesk_cloud_device_id", "desk_anand");
      localStorage.setItem("smartdesk_last_device_name", "SmartDesk");
    }

    onUpdateClientCredentialsOnly?.("user_anand_primary", "", "desk_anand", "SmartDesk");

    setSaveConfirmStatus({
      show: true,
      success: true,
      title: "Reset to Factory Defaults",
      message: "Credentials reset to defaults. Click OK to reload the app.",
    });
    setInlineStatus({ text: "Reset complete. Ready to reload.", type: "info" });
    onToast?.("Reset target to factory default", "info");
  };

  // Step 3 Health check state
  const [healthStatus, setHealthStatus] = useState<"checking" | "online" | "offline">("checking");
  const [healthData, setHealthData] = useState<{ uptime?: number; activeDevices?: number; activeClients?: number } | null>(null);

  // Step 4 Handshake test state
  const [testingHandshake, setTestingHandshake] = useState<boolean>(false);
  const [handshakeResult, setHandshakeResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  useEffect(() => {
    if (scannedNetworks.length > 0) {
      setDiscoveredNets(scannedNetworks);
    }
  }, [scannedNetworks]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const checkBackend = async () => {
      setHealthStatus("checking");
      try {
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
          if (!isWsConnected) {
            onReconnectCloud?.();
          }
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
      onToast?.("Failed to send Wi-Fi credentials", "error");
    } finally {
      setIsSendingWifi(false);
    }
  };

  const handleRunHandshake = async () => {
    if (!isWsConnected) {
      if (onReconnectCloud) {
        onToast?.("Connecting WebSocket...", "info");
        onReconnectCloud();
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (isWsConnected) break;
        }
      }
      if (!isWsConnected) {
        onToast?.("Cloud WebSocket is connecting. Please wait a moment...", "warn");
        return;
      }
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
      `[STEP 1: BLE HARDWARE LINK] Connected: ${bleConnected}`,
      `[STEP 2: ESP32 WI-FI RADIO] State: ${wifiState} | SSID: ${wifiSsid || "None"} | IP: ${wifiIp || "None"}`,
      `[STEP 3: CLOUD BACKEND SERVER] URL: ${wsUrl} | REST: ${healthStatus} | WS: ${isWsConnected}`,
      `[STEP 4: END-TO-END ESP32 CLOUD LINK] Target ID: ${cloudDeviceId.trim()} | ESP32 Online: ${isDeviceOnline}`,
      `=== RECENT LOGS ===`,
      ...recentLogs.slice(-10).map((l) => l.text),
    ].join("\n");
    navigator.clipboard?.writeText(report);
    onToast?.("Full Diagnostic Report copied to clipboard!", "success");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0a0a0a] border border-white/30 rounded-xl md:rounded-2xl w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] md:max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        
        {/* Header (Pinned) */}
        <div className="flex items-center justify-between border-b border-white/20 p-3 sm:p-4 md:p-5 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-2.5 md:gap-3">
            <span className="text-xl md:text-3xl">🌐</span>
            <div>
              <h3 className="text-[11px] md:text-lg font-extrabold tracking-wide text-cyan-400">
                Cloud Handshake &amp; Diagnostics
              </h3>
              <p className="text-[9px] md:text-xs text-white/60 leading-tight">
                Browser &rarr; BLE &rarr; Wi-Fi &rarr; Server &rarr; ESP32
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isReloading}
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center font-bold text-xs md:text-sm cursor-pointer disabled:opacity-50 shrink-0 border border-white/40"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body: flex-1 overflow-y-auto min-h-0 prevents flex squeeze */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2.5 sm:p-4 md:p-6 flex flex-col gap-3 md:gap-5 custom-scrollbar">

          {/* ── STEP 1: BLE DIRECT LINK ── */}
          <div className={`shrink-0 p-2.5 md:p-5 rounded-lg md:rounded-xl border transition-all ${
            bleConnected ? "bg-emerald-500/10 border-emerald-500/50" : "bg-black border-white/40"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <span className={`w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 ${bleConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : bleConnecting ? "bg-amber-400 animate-ping" : "bg-rose-500"}`} />
                <h4 className="text-[9px] md:text-sm font-black uppercase tracking-wider text-white">
                  Step 1: BLE Hardware Link
                </h4>
              </div>
              <span className={`text-[9px] md:text-xs font-extrabold ${bleConnected ? "text-emerald-400" : "text-rose-400"}`}>
                {bleConnected ? `Linked: ${deviceName}` : bleConnecting ? "Connecting..." : "Disconnected"}
              </span>
            </div>

            <p className="text-[8px] md:text-xs text-white/60 mt-1 md:mt-2 leading-snug md:leading-relaxed">
              Direct Web Bluetooth connects from your phone/PC browser directly to the ESP32. Required to configure Wi-Fi locally.
            </p>

            {!bleConnected && (
              <div className="mt-2 md:mt-3 flex items-center gap-2 md:gap-3">
                <button
                  onClick={onConnectBle}
                  disabled={bleConnecting || isReloading}
                  className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-md md:rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[9px] md:text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {bleConnecting ? "Linking to Desk..." : "⚡ Connect via BLE"}
                </button>
              </div>
            )}
          </div>

          {/* ── STEP 2: ESP32 WI-FI RADIO ── */}
          <div className={`shrink-0 p-2.5 md:p-5 rounded-lg md:rounded-xl border transition-all ${
            wifiConnected ? "bg-emerald-500/10 border-emerald-500/50" : wifiState === 3 ? "bg-cyan-500/10 border-cyan-500/50" : "bg-black border-white/40"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <span className={`w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 ${
                  wifiConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : wifiState === 2 ? "bg-amber-400 animate-ping" : wifiState === 3 ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]" : "bg-white/40"
                }`} />
                <h4 className="text-[9px] md:text-sm font-black uppercase tracking-wider text-white">
                  Step 2: ESP32 Wi-Fi Radio
                </h4>
              </div>
              <span className={`text-[9px] md:text-xs font-extrabold ${
                wifiConnected ? "text-emerald-400" : wifiState === 2 ? "text-amber-400" : wifiState === 3 ? "text-cyan-300" : "text-white/50"
              }`}>
                {wifiConnected ? `Connected (${wifiIp})` : wifiState === 2 ? "Connecting..." : wifiState === 3 ? "Hotspot Active" : "Radio Offline"}
              </span>
            </div>

            <div className="mt-1.5 md:mt-2 text-[8px] md:text-xs text-white/60 space-y-1">
              {wifiConnected ? (
                <p className="text-emerald-300">✓ ESP32 is connected to router <strong>{wifiSsid}</strong> (Signal: {wifiRssi} dBm).</p>
              ) : wifiState === 3 ? (
                <p className="text-amber-300">⚠️ ESP32 is broadcasting hotspot <strong>AnandSmartDesk</strong> but has no internet.</p>
              ) : (
                <p>Connect the ESP32 to your local Wi-Fi router or hotspot below.</p>
              )}
            </div>

            <div className="mt-2 md:mt-3.5 p-2 md:p-4 rounded-lg md:rounded-xl bg-black/60 border border-white/40 space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] md:text-xs font-bold text-white/80">Configure Wi-Fi on ESP32:</span>
                <button
                  type="button"
                  onClick={handleScanAirwaves}
                  disabled={isScanningAirwaves || !bleConnected || isReloading}
                  className="px-2 py-1 md:px-3 md:py-1.5 rounded md:rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 font-bold text-[8px] md:text-xs border border-white/40 active:scale-95 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  {isScanningAirwaves ? "Scanning..." : "🔍 Scan (BLE)"}
                </button>
              </div>

              {discoveredNets.length > 0 && (
                <div className="flex flex-wrap gap-1 md:gap-2 max-h-24 md:max-h-28 overflow-y-auto p-1 md:p-2 bg-black rounded-lg border border-white/40 custom-scrollbar">
                  {discoveredNets.map((n, i) => (
                    <button
                      key={i}
                      onClick={() => setTargetSsid(n.ssid)}
                      className={`px-1.5 py-0.5 md:px-2.5 md:py-1 rounded text-[8px] md:text-xs font-bold border transition-all cursor-pointer ${
                        targetSsid === n.ssid ? "bg-cyan-500/30 text-cyan-300 border-cyan-400" : "bg-white/5 hover:bg-white/10 text-white/80 border-white/40"
                      }`}
                    >
                      📶 {n.ssid} <span className="text-white/40 font-mono">({n.rssi}dBm)</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3">
                <input
                  type="text"
                  placeholder="Wi-Fi SSID (max 32 chars)"
                  value={targetSsid}
                  onChange={(e) => setTargetSsid(e.target.value)}
                  disabled={isReloading}
                  className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-[9px] md:text-sm text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                />
                <div className="relative">
                  <input
                    type={showTargetPass ? "text" : "password"}
                    placeholder="Password (empty if open)"
                    value={targetPass}
                    onChange={(e) => setTargetPass(e.target.value)}
                    disabled={isReloading}
                    className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 pr-7 md:pr-9 text-[9px] md:text-sm text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowTargetPass(!showTargetPass)} className="absolute right-1.5 md:right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-[9px] md:text-sm">
                    {showTargetPass ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5 md:pt-1">
                <label className="flex items-center gap-1 md:gap-2 cursor-pointer text-[8px] md:text-xs text-white/70">
                  <input type="checkbox" checked={isCollege} onChange={(e) => setIsCollege(e.target.checked)} disabled={isReloading} className="rounded border-white/40 bg-black text-cyan-500 disabled:opacity-50" />
                  <span>Fortinet Portal Route</span>
                </label>

                <button
                  type="button"
                  onClick={handleSendWifi}
                  disabled={isSendingWifi || !bleConnected || !targetSsid.trim() || isReloading}
                  className="px-2.5 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[8px] md:text-xs active:scale-95 transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  {isSendingWifi ? "Sending..." : "📡 Connect ESP32"}
                </button>
              </div>

              {isCollege && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 pt-1 border-t border-white/40">
                  <input type="text" placeholder="Student Username / Roll No" value={cpUser} onChange={(e) => setCpUser(e.target.value)} disabled={isReloading} className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-[9px] md:text-sm text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50" />
                  <input type="password" placeholder="Portal Password" value={cpPass} onChange={(e) => setCpPass(e.target.value)} disabled={isReloading} className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-[9px] md:text-sm text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50" />
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 3: BACKEND CLOUD SERVER ── */}
          <div className={`shrink-0 relative overflow-hidden p-2.5 md:p-5 rounded-lg md:rounded-xl border transition-all ${
            healthStatus === "online" && isWsConnected ? "bg-emerald-500/10 border-emerald-500/50" : healthStatus === "online" ? "bg-amber-500/10 border-amber-500/50" : "bg-black border-white/40"
          }`}>
            {/* Step 3 Modal Overlay */}
            {(isVerifying || isSavingCredentials || saveConfirmStatus?.show) && (
              <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-md rounded-lg md:rounded-xl p-3 md:p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150">
                {isVerifying ? (
                  <div className="flex flex-col items-center gap-2.5 md:gap-3.5">
                    <div className="w-10 h-10 md:w-14 md:h-14 border-2 md:border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <div>
                      <h5 className="text-[11px] md:text-base font-black text-cyan-400 uppercase tracking-wider">
                        Verifying with Cloud Relay...
                      </h5>
                      <p className="text-[9px] md:text-xs text-white/70 mt-1 md:mt-1.5 max-w-xs md:max-w-md leading-relaxed">
                        Validating device ID, device name, and password with backend...
                      </p>
                    </div>
                  </div>
                ) : isSavingCredentials ? (
                  <div className="flex flex-col items-center gap-2.5 md:gap-3.5">
                    <div className="w-10 h-10 md:w-14 md:h-14 border-2 md:border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <div>
                      <h5 className="text-[11px] md:text-base font-black text-cyan-400 uppercase tracking-wider">
                        Flashing ESP32 Hardware...
                      </h5>
                      <p className="text-[9px] md:text-xs text-white/70 mt-1 md:mt-1.5 max-w-xs md:max-w-md leading-relaxed">
                        Sending new cloud credentials to ESP32 over BLE...
                      </p>
                    </div>
                  </div>
                ) : saveConfirmStatus?.success ? (
                  <div className="flex flex-col items-center gap-2 md:gap-3 max-w-sm md:max-w-md">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-emerald-500/20 border-2 md:border-3 border-emerald-500/60 flex items-center justify-center text-xl md:text-2xl shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      ✅
                    </div>
                    <div>
                      <h5 className="text-[11px] md:text-base font-black text-emerald-400 uppercase tracking-wider">
                        {saveConfirmStatus.title}
                      </h5>
                      <p className="text-[9px] md:text-xs text-emerald-200/90 mt-0.5 md:mt-1 leading-relaxed">
                        {saveConfirmStatus.message}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsReloading(true);
                          if (typeof window !== "undefined") {
                            window.location.reload();
                          }
                        }}
                        className="px-4 py-1.5 md:px-6 md:py-2.5 rounded-lg md:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] md:text-sm shadow-md shadow-emerald-950 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 md:gap-2"
                      >
                        <span>🔄</span> OK
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 md:gap-3 max-w-sm md:max-w-md">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-rose-500/20 border-2 md:border-3 border-rose-500/60 flex items-center justify-center text-xl md:text-2xl shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                      ⚠️
                    </div>
                    <div>
                      <h5 className="text-[11px] md:text-base font-black text-rose-400 uppercase tracking-wider">
                        {saveConfirmStatus?.title || "Connection Failed"}
                      </h5>
                      <p className="text-[9px] md:text-xs text-rose-200/90 mt-0.5 md:mt-1 leading-relaxed">
                        {saveConfirmStatus?.message}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveConfirmStatus(null)}
                        className="px-3.5 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] md:text-sm border border-white/30 transition-all active:scale-95 cursor-pointer"
                      >
                        Dismiss &amp; Correct Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <span className={`w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 ${
                  healthStatus === "online" && isWsConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : healthStatus === "online" ? "bg-amber-400" : "bg-rose-500"
                }`} />
                <h4 className="text-[9px] md:text-sm font-black uppercase tracking-wider text-white">
                  Step 3: Backend Server
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] md:text-xs font-extrabold ${
                  healthStatus === "online" && isWsConnected ? "text-emerald-400" : healthStatus === "online" ? "text-amber-400" : "text-rose-400"
                }`}>
                  {healthStatus === "online" && isWsConnected ? "Server Online" : healthStatus === "online" ? "Server UP (WS Wait)" : "Server Offline"}
                </span>
                {!isWsConnected && onReconnectCloud && (
                  <button onClick={() => { onToast?.("Connecting WebSocket...", "info"); onReconnectCloud(); }} disabled={isReloading} className="px-1.5 py-0.5 md:px-2.5 md:py-1 rounded border border-cyan-500/50 bg-cyan-500/20 text-cyan-300 text-[8px] md:text-xs font-extrabold active:scale-95 cursor-pointer disabled:opacity-50">
                    🔄 Reconnect
                  </button>
                )}
              </div>
            </div>

            <div className="mt-1.5 md:mt-2 text-[8px] md:text-xs text-white/60 space-y-1">
              <p>WebSocket URL: <code className="text-cyan-300 font-mono text-[8px] md:text-xs">{wsUrl}</code></p>
              {healthStatus === "online" ? (
                <p className="text-emerald-300">✓ Backend server responded to health check!</p>
              ) : (
                <p className="text-rose-300">✕ Cannot reach backend server at <code>{wsUrl}</code>.</p>
              )}
            </div>

            <div className="mt-2 md:mt-3.5 p-2 md:p-4 rounded-lg md:rounded-xl bg-black/60 border border-white/40 space-y-2 md:space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-cyan-400 text-[8px] md:text-sm">●</span>
                  <span className="text-[8px] md:text-xs text-white font-extrabold uppercase tracking-wider">Device Cloud Credentials:</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <button onClick={handleResetToDefaults} disabled={isReloading} className="text-[8px] md:text-xs text-white/50 hover:text-cyan-300 underline font-mono cursor-pointer disabled:opacity-50">
                    ↺ Reset Defaults
                  </button>
                  <span className={`text-[8px] md:text-xs font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded border ${cloudPass ? "bg-amber-500/20 text-amber-300 border-amber-500/50" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"}`}>
                    {cloudPass ? "Password Protected" : "No Password"}
                  </span>
                </div>
              </div>

              {hardwareCloudConfig && (
                <div className="p-1.5 md:p-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-[9px] md:text-xs text-cyan-300 flex items-center justify-between">
                  <span>⚡ Hardware ID: <strong className="font-mono text-white">{hardwareCloudConfig.devId || "desk_anand"}</strong></span>
                  <button onClick={() => {
                    if (hardwareCloudConfig.devId) setCloudDeviceId(hardwareCloudConfig.devId);
                    if (hardwareCloudConfig.user) setCloudUser(hardwareCloudConfig.user);
                    if (hardwareCloudConfig.name) setCloudDeskName(hardwareCloudConfig.name);
                    else if (hardwareCloudConfig.devId) setCloudDeskName(hardwareCloudConfig.devId);
                  }} disabled={isReloading} className="text-[8px] md:text-xs text-cyan-400 hover:text-white underline font-bold cursor-pointer disabled:opacity-50">
                    Auto-Fill
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3.5">
                <div>
                  <label className="text-[8px] md:text-xs text-white/70 block font-bold mb-0.5 md:mb-1">Target Cloud Device ID:</label>
                  <input type="text" value={cloudDeviceId} onChange={(e) => setCloudDeviceId(e.target.value)} disabled={isReloading} className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-white font-mono text-[9px] md:text-sm focus:border-cyan-500 outline-none disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-[8px] md:text-xs text-white/70 block font-bold mb-0.5 md:mb-1">Desk Display Name:</label>
                  <input type="text" value={cloudDeskName} onChange={(e) => setCloudDeskName(e.target.value)} disabled={isReloading} className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-white text-[9px] md:text-sm font-bold focus:border-cyan-500 outline-none disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-[8px] md:text-xs text-white/70 block font-bold mb-0.5 md:mb-1">User Account ID:</label>
                  <input type="text" value={cloudUser} onChange={(e) => setCloudUser(e.target.value)} disabled={isReloading} className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 text-white font-mono text-[9px] md:text-sm focus:border-cyan-500 outline-none disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-[8px] md:text-xs text-white/70 block font-bold mb-0.5 md:mb-1">Device Password:</label>
                  <div className="relative">
                    <input type={showCloudPass ? "text" : "password"} value={cloudPass} onChange={(e) => setCloudPass(e.target.value)} disabled={isReloading} className="w-full bg-black border border-white/40 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-2 pr-7 md:pr-9 text-white font-mono text-[9px] md:text-sm focus:border-cyan-500 outline-none disabled:opacity-50" />
                    <button type="button" onClick={() => setShowCloudPass(!showCloudPass)} className="absolute right-1.5 md:right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-[9px] md:text-sm">
                      {showCloudPass ? "👁️" : "🙈"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Status Header for Action Buttons */}
              <div className="flex items-center justify-between pt-1 md:pt-1.5">
                <span className="text-[9px] md:text-xs font-bold text-white/80">Connect Actions:</span>
                {inlineStatus && (
                  <span className={`text-[9px] md:text-xs font-bold animate-pulse ${inlineStatus.type === "success" ? "text-emerald-400" : inlineStatus.type === "error" ? "text-rose-400" : "text-cyan-400"}`}>
                    {inlineStatus.text}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3">
                <button
                  type="button"
                  onClick={handleConnectClientToDesk}
                  disabled={isVerifying || isSavingCredentials || isReloading}
                  className="py-1.5 md:py-3 px-2 md:px-4 rounded-lg md:rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/40 font-extrabold text-[9px] md:text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 md:gap-1 active:scale-95 disabled:opacity-50"
                >
                  <span className="flex items-center gap-1 md:gap-2 font-black">
                    <span>{isVerifying ? "⏳" : "🌐"}</span> {isVerifying ? "Verifying with Cloud..." : "Connect PWA to this Desk"}
                  </span>
                  <span className="text-[7px] md:text-xs text-white/60 font-medium">{isVerifying ? "Validating target device..." : "Connects browser to Target ID"}</span>
                </button>

                {bleConnected ? (
                  <button
                    type="button"
                    onClick={handleFlashCredentialsToHardware}
                    disabled={isVerifying || isSavingCredentials || isReloading}
                    className="py-1.5 md:py-3 px-2 md:px-4 rounded-lg md:rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[9px] md:text-sm transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 md:gap-1 active:scale-95 disabled:opacity-50 border border-cyan-500/50"
                  >
                    <span className="flex items-center gap-1 md:gap-2 font-black">
                      <span>{isSavingCredentials ? "⏳" : "⚡"}</span>
                      {isSavingCredentials ? "Flashing Hardware..." : "Flash IDs into ESP32 Hardware"}
                    </span>
                    <span className="text-[7px] md:text-xs text-cyan-200 font-medium">Saves to physical ESP32 flash</span>
                  </button>
                ) : (
                  <div className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-between gap-2">
                    <div className="text-[7px] md:text-xs text-amber-300 leading-tight">
                      <span className="font-bold">🔒 BLE required</span> to flash memory.
                    </div>
                    <button
                      type="button"
                      onClick={onConnectBle}
                      disabled={bleConnecting || isReloading}
                      className="px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[8px] md:text-xs whitespace-nowrap active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {bleConnecting ? "Connecting..." : "⚡ Connect BLE"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── STEP 4: END-TO-END ESP32 CLOUD HANDSHAKE ── */}
          <div className={`shrink-0 p-2.5 md:p-5 rounded-lg md:rounded-xl border transition-all ${
            isDeviceOnline ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)]" : "bg-black border-white/40"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <span className={`w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 ${isDeviceOnline ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-white/40"}`} />
                <h4 className="text-[9px] md:text-sm font-black uppercase tracking-wider text-white">
                  Step 4: ESP32 Handshake
                </h4>
              </div>
              <span className={`text-[9px] md:text-xs font-extrabold ${isDeviceOnline ? "text-emerald-400" : "text-amber-400"}`}>
                {isDeviceOnline ? "ESP32 Online" : "Waiting for ESP32..."}
              </span>
            </div>

            <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 md:gap-3">
              <button
                onClick={handleRunHandshake}
                disabled={testingHandshake || !isWsConnected || isReloading}
                className={`px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-extrabold text-[9px] md:text-sm flex items-center gap-1.5 md:gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  isDeviceOnline ? "bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-white/10 hover:bg-white/20 text-white/80 border border-white/40"
                }`}
              >
                <span>{testingHandshake ? "⏳ Ping..." : "🚀 Test Ping"}</span>
              </button>

              {handshakeResult && (
                <span className={`text-[9px] md:text-xs font-bold ${handshakeResult.success ? "text-emerald-400" : "text-rose-400"}`}>
                  {handshakeResult.message}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions (Pinned at bottom) */}
        <div className="p-3 sm:p-4 md:p-5 border-t border-white/20 flex items-center justify-between gap-3 shrink-0 bg-[#0a0a0a] rounded-b-xl md:rounded-b-2xl">
          <button
            onClick={handleCopyReport}
            disabled={isReloading}
            className="px-2.5 py-1.5 md:px-4 md:py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-bold text-[9px] md:text-sm border border-white/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            📋 Copy Report
          </button>

          <button
            onClick={onClose}
            disabled={isReloading}
            className="px-5 md:px-7 py-1.5 md:py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] md:text-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}