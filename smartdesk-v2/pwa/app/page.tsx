/**
 * page.tsx — Main entry point & screen router
 */

"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSmartDeskBle } from "../hooks/useSmartDeskBle";
import AodFaceScreen from "../components/AodFaceScreen";
import BottomNavbar, { NavTab } from "../components/BottomNavbar";
import QuickRemotePanel from "../components/QuickRemotePanel";
import RelayPanel from "../components/RelayPanel";
import LedPanel from "../components/LedPanel";
import SchedulePanel from "../components/SchedulePanel";
import PresencePanel from "../components/PresencePanel";
import SettingsPanel from "../components/SettingsPanel";
import RelayConfigModal from "../components/RelayConfigModal";
import WifiManagerModal from "../components/WifiManagerModal";
import CloudHandshakeModal from "../components/CloudHandshakeModal";
import CustomAlertModal, { ModalAlertProps } from "../components/CustomAlertModal";
import ToastNotification, { ToastProps } from "../components/ToastNotification";
import { useRemoteDeskWs } from "../hooks/useRemoteDeskWs";

export default function SmartDeskApp() {
  const [activeTab, setActiveTab] = useState<NavTab>("aod");
  const [relayConfigModalIdx, setRelayConfigModalIdx] = useState<number | null>(null);
  const [showWifiModal, setShowWifiModal] = useState<boolean>(false);
  const [showHandshakeModal, setShowHandshakeModal] = useState<boolean>(false);

  const [alertState, setAlertState] = useState<Omit<ModalAlertProps, "onConfirm">>({
    isOpen: false, title: "", message: "", confirmLabel: "OK", isConfirm: false,
  });
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  const [toastState, setToastState] = useState<{ message: string | null; type?: ToastProps["type"]; }>({
    message: null, type: "info",
  });

  const showAlert = useCallback((title: string, message: string, onConfirm?: () => void, isConfirm: boolean = false) => {
    setAlertState({ isOpen: true, title, message, confirmLabel: isConfirm ? "Yes" : "OK", cancelLabel: "Cancel", isConfirm });
    setAlertCallback(() => onConfirm || null);
  }, []);

  const showToast = useCallback((message: string, type: ToastProps["type"] = "info") => { setToastState({ message, type }); }, []);
  const closeToast = useCallback(() => { setToastState({ message: null }); }, []);
  const closeAlert = useCallback(() => {
    if (alertCallback) alertCallback();
    setAlertState((prev) => ({ ...prev, isOpen: false }));
    setAlertCallback(null);
  }, [alertCallback]);

  const ble = useSmartDeskBle({ onAlert: showAlert, onToast: showToast });
  const remote = useRemoteDeskWs({ onToast: showToast });

  const isDeskConnected = ble.connected || ble.wifiConnected || (remote.isWsConnected && remote.isDeviceOnline);
  
  const currentDeskName = useMemo(() => {
    if (ble.connected) return ble.deviceName;
    if (remote.isWsConnected && remote.isDeviceOnline && remote.deviceState.deviceName) {
      return remote.deviceState.deviceName;
    }
    if (ble.wifiConnected) return `SmartDesk (Wi-Fi ${ble.wifiIp || ble.wifiHost})`;
    if (remote.isWsConnected && remote.isDeviceOnline) return `SmartDesk (Cloud Remote)`;
    return ble.deviceName;
  }, [ble.connected, ble.deviceName, ble.wifiConnected, ble.wifiIp, ble.wifiHost, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.deviceName]);

  const effectiveRelays = useMemo(() => {
    if (ble.connected || ble.wifiConnected) {
      return ble.relays;
    }
    if (remote.isWsConnected && remote.isDeviceOnline) {
      return remote.deviceState.relays.map((r) => ({
        load: r.load,
        remainingMin: r.remainingMin || 0,
      }));
    }
    return ble.relays;
  }, [ble.connected, ble.wifiConnected, ble.relays, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.relays]);

  const effectiveConfigs = useMemo(() => {
    if (ble.connected || ble.wifiConnected) {
      return ble.configs;
    }
    if (remote.isWsConnected && remote.isDeviceOnline && remote.deviceState.configs) {
      return ble.configs.map((c, i) => {
        const remCfg = remote.deviceState.configs?.[i];
        return remCfg
          ? { ...c, name: remCfg.name || c.name, wiring: remCfg.wiring !== undefined ? remCfg.wiring : c.wiring }
          : c;
      });
    }
    return ble.configs;
  }, [ble.connected, ble.wifiConnected, ble.configs, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.configs]);

  const effectiveLed = useMemo(() => {
    if (ble.connected || ble.wifiConnected) {
      return ble.led;
    }
    if (remote.isWsConnected && remote.isDeviceOnline && remote.deviceState.led) {
      return remote.deviceState.led;
    }
    return ble.led;
  }, [ble.connected, ble.wifiConnected, ble.led, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.led]);

  const effectiveEnvData = useMemo(() => {
    if (ble.connected || ble.wifiConnected) {
      return ble.envData;
    }
    if (remote.isWsConnected && remote.isDeviceOnline && remote.deviceState.env?.valid) {
      return remote.deviceState.env;
    }
    return ble.envData;
  }, [ble.connected, ble.wifiConnected, ble.envData, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.env]);

  const effectiveStripLength = useMemo(() => {
    if (ble.connected || ble.wifiConnected) {
      return ble.stripLength;
    }
    if (remote.isWsConnected && remote.isDeviceOnline && remote.deviceState.stripLength) {
      return remote.deviceState.stripLength;
    }
    return ble.stripLength;
  }, [ble.connected, ble.wifiConnected, ble.stripLength, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.stripLength]);

  const effectiveMatrixConfig = useMemo(() => {
    if (ble.connected || ble.wifiConnected) {
      return ble.matrixConfig;
    }
    if (remote.isWsConnected && remote.isDeviceOnline && remote.deviceState.matrix) {
      return {
        ...ble.matrixConfig,
        mode: remote.deviceState.matrix.mode ?? ble.matrixConfig.mode,
        speed: remote.deviceState.matrix.speed ?? ble.matrixConfig.speed,
        bri: remote.deviceState.matrix.bri ?? ble.matrixConfig.bri,
        colorR: remote.deviceState.matrix.r ?? ble.matrixConfig.colorR,
        colorG: remote.deviceState.matrix.g ?? ble.matrixConfig.colorG,
        colorB: remote.deviceState.matrix.b ?? ble.matrixConfig.colorB,
        text: remote.deviceState.matrix.text ?? ble.matrixConfig.text,
      };
    }
    return ble.matrixConfig;
  }, [ble.connected, ble.wifiConnected, ble.matrixConfig, remote.isWsConnected, remote.isDeviceOnline, remote.deviceState.matrix]);

  const handleToggleRelay = useCallback((idx: number, explicitTarget?: boolean) => {
    if (ble.connected || ble.wifiConnected) {
      ble.toggleRelay(idx, explicitTarget);
    } else if (remote.isWsConnected && remote.isDeviceOnline) {
      const current = remote.deviceState.relays[idx]?.load ?? false;
      const target = explicitTarget !== undefined ? explicitTarget : !current;
      remote.sendRelayCommand(idx, target);
      showToast(`[Cloud Remote] Relay ${idx + 1} turned ${target ? "ON" : "OFF"}`);
    } else {
      ble.toggleRelay(idx, explicitTarget);
    }
  }, [ble, remote, showToast]);

  const handleSetRelayTimer = useCallback((idx: number, minutes: number) => {
    if (ble.connected || ble.wifiConnected) {
      ble.setRelayTimer(idx, minutes);
    } else if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendRelayTimerCommand(idx, minutes);
      showToast(minutes > 0 ? `[Cloud Remote] Relay ${idx + 1} timer set to ${minutes}m` : `[Cloud Remote] Relay ${idx + 1} timer cancelled`);
    } else {
      ble.setRelayTimer(idx, minutes);
    }
  }, [ble, remote, showToast]);

  const handleSaveRelayConfig = useCallback((
    idx: number,
    newName: string,
    wiring: number,
    onEn: boolean,
    onMd: number,
    onDu: number,
    offEn: boolean,
    offMd: number,
    offDu: number,
    beepOn: boolean,
    beepOff: boolean,
    beepEnd: boolean
  ) => {
    ble.saveRelayConfig(idx, newName, wiring, onEn, onMd, onDu, offEn, offMd, offDu, beepOn, beepOff, beepEnd);
    if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendRelayConfigCommand(idx, newName, wiring);
      showToast(`[Cloud Remote] Relay ${idx + 1} config synced`);
    }
  }, [ble, remote, showToast]);

  const handleAllRelaysOff = useCallback(() => {
    if (ble.connected || ble.wifiConnected) {
      ble.allRelaysOff();
    } else if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendAllOff();
      showToast("[Cloud Remote] All relays turned OFF!", "warn");
    } else {
      ble.allRelaysOff();
    }
  }, [ble, remote, showToast]);

  const handleSendLed = useCallback((mode: number, r: number, g: number, b: number, bri: number, spd: number) => {
    if (ble.connected || ble.wifiConnected) {
      ble.sendLedCommand(mode, r, g, b, bri, spd);
    } else if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendLedCommand(mode, r, g, b, bri, spd);
      showToast("[Cloud Remote] LED state updated");
    } else {
      ble.sendLedCommand(mode, r, g, b, bri, spd);
    }
  }, [ble, remote, showToast]);

  const handleRename = useCallback((newName: string) => {
    if (ble.connected) {
      ble.saveRename(newName);
    }
    if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendRenameCommand(newName);
      showToast(`[Cloud Remote] Device renamed to "${newName}"`);
    } else if (!ble.connected) {
      ble.saveRename(newName);
    }
  }, [ble, remote, showToast]);

  const handleSaveStripLength = useCallback((len: number) => {
    if (ble.connected) {
      ble.saveStripLength(len);
    }
    if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendStripLengthCommand(len);
      showToast(`[Cloud Remote] Strip length set to ${len} LEDs`);
    } else if (!ble.connected) {
      ble.saveStripLength(len);
    }
  }, [ble, remote, showToast]);

  const handleSetMatrixDisplay = useCallback((
    mode: number,
    speed?: number,
    bri?: number,
    r?: number,
    g?: number,
    b?: number,
    text?: string
  ) => {
    if (ble.connected) {
      ble.setMatrixDisplay(mode, speed, bri, r, g, b, text);
    }
    if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendMatrixCommand(mode, text, speed, bri, r, g, b);
      showToast("[Cloud Remote] Matrix display updated");
    } else if (!ble.connected) {
      ble.setMatrixDisplay(mode, speed, bri, r, g, b, text);
    }
  }, [ble, remote, showToast]);

  // Cloud & BLE RGB Sleep Timer Support
  const [cloudRgbTimerRemMin, setCloudRgbTimerRemMin] = useState<number>(0);
  const cloudRgbTimerEndMsRef = useRef<number>(0);

  const handleSetRgbTimer = useCallback((minutes: number) => {
    if (ble.connected || ble.wifiConnected) {
      ble.setRgbTimer(minutes);
    } else {
      if (minutes <= 0) {
        cloudRgbTimerEndMsRef.current = 0;
        setCloudRgbTimerRemMin(0);
        showToast("[Cloud Remote] RGB Sleep Timer cancelled.");
      } else {
        cloudRgbTimerEndMsRef.current = Date.now() + minutes * 60000;
        setCloudRgbTimerRemMin(minutes);
        showToast(`[Cloud Remote] RGB Sleep Timer set for ${minutes} min!`);
      }
    }
  }, [ble, showToast]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (cloudRgbTimerEndMsRef.current > 0) {
        const diffMs = cloudRgbTimerEndMsRef.current - Date.now();
        if (diffMs <= 0) {
          cloudRgbTimerEndMsRef.current = 0;
          setCloudRgbTimerRemMin(0);
          handleSendLed(0, 0, 0, 0, 0, 0);
          showToast("[Cloud Remote] RGB Light turned OFF by sleep timer!", "info");
        } else {
          setCloudRgbTimerRemMin(Math.ceil(diffMs / 60000));
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSendLed, showToast]);

  const effectiveRgbTimerRemainingMin = (ble.connected || ble.wifiConnected)
    ? ble.rgbTimerRemainingMin
    : cloudRgbTimerRemMin;

  return (
    <main className="min-h-[100dvh] w-full bg-black text-white overflow-hidden flex flex-col font-sans">
      {activeTab === "aod" ? (
        <AodFaceScreen
          connected={isDeskConnected}
          connecting={ble.connecting}
          deviceName={currentDeskName}
          wifiConnected={ble.wifiConnected}
          wifiState={ble.wifiState}
          wifiSsid={ble.wifiSsid}
          wifiIp={ble.wifiIp}
          isCloudOnline={remote.isWsConnected && remote.isDeviceOnline}
          isWsConnected={remote.isWsConnected}
          onOpenWifiModal={() => setShowWifiModal(true)}
          onOpenHandshakeModal={() => setShowHandshakeModal(true)}
          relays={effectiveRelays}
          relayConfigs={effectiveConfigs}
          envData={effectiveEnvData}
          presenceData={ble.presenceData}
          rgbTimerRemainingMin={effectiveRgbTimerRemainingMin}
          onConnect={ble.handleConnect}
          onOpenRemote={() => setActiveTab("remote")}
          onToggleRelay={handleToggleRelay}
          onAllRelaysOff={handleAllRelaysOff}
          onSendLed={handleSendLed}
          onSetMatrixMode={(mode, text) => handleSetMatrixDisplay(mode, undefined, undefined, undefined, undefined, undefined, text)}
          onStartMusic={ble.startMusicSync}
          onStopMusic={ble.stopMusicSync}
        />
      ) : (
        <div className="flex flex-col w-full h-[100dvh] max-w-7xl mx-auto px-2 sm:px-6">
          
          {/* HIGH-CONTRAST HEADER */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 sm:py-4 border-b-2 border-zinc-800 shrink-0 gap-2 sm:gap-3">
            {/* Top row on mobile / Left column on desktop */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <img src="/SmartDesk logo.png" alt="SmartDesk Logo" className="w-8 h-8 rounded-lg object-contain shadow-md border border-zinc-800 shrink-0" />
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDeskConnected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" : ble.connecting ? "bg-amber-400 animate-ping" : "bg-zinc-600"}`} />
                  <span className="text-sm font-extrabold tracking-wide text-white truncate max-w-[170px] sm:max-w-none">
                    {isDeskConnected ? currentDeskName : ble.connecting ? "Connecting..." : "Standby"}
                  </span>
                </div>
              </div>

              {/* AOD Button on mobile (top right) */}
              <button
                onClick={() => setActiveTab("aod")}
                className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer shrink-0"
              >
                <span>😴</span>
                <span>AOD</span>
              </button>
            </div>
            
            {/* Row 2 on mobile (horizontal scrolling strip) / Right column on desktop */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar w-full sm:w-auto pb-0.5 sm:pb-0">
              <div
                onClick={() => setShowHandshakeModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 ${
                  remote.isWsConnected && remote.isDeviceOnline
                    ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                    : remote.isWsConnected
                    ? "border-amber-500/60 bg-amber-950/40 text-amber-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700"
                }`}
                title="Click to open Cloud Handshake & Worldwide Diagnostics"
              >
                <span>☁️</span>
                <span className="text-[11px] font-bold">
                  {remote.isWsConnected && remote.isDeviceOnline
                    ? "Cloud: Online"
                    : remote.isWsConnected
                    ? "Cloud: Standby"
                    : "Cloud: Offline"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    remote.isWsConnected && remote.isDeviceOnline
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : remote.isWsConnected
                      ? "bg-amber-400"
                      : "bg-zinc-600"
                  }`}
                />
              </div>

              <button
                onClick={() => setShowHandshakeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-black shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)] active:scale-95 transition-all cursor-pointer"
                title="Step-by-step Worldwide Handshake Verification"
              >
                <span>🤝</span>
                <span className="hidden sm:inline">HANDSHAKE</span>
              </button>

              <button
                onClick={() => setShowWifiModal(true)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 ${
                  ble.wifiConnected
                    ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                    : ble.wifiState === 2
                    ? "border-amber-500/60 bg-amber-950/40 text-amber-300"
                    : ble.wifiState === 3
                    ? "border-cyan-500/60 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
                }`}
                title={
                  ble.wifiConnected
                    ? `Wi-Fi: ${ble.wifiSsid || "Connected"} (${ble.wifiIp})`
                    : ble.wifiState === 2
                    ? "Connecting to Wi-Fi..."
                    : ble.wifiState === 3
                    ? "Hotspot Mode: AnandSmartDesk (192.168.4.1)"
                    : "Configure Wi-Fi & College Portal"
                }
              >
                <span>📶</span>
                <span className="text-[11px] font-bold truncate max-w-[95px] sm:max-w-[150px]">
                  {ble.wifiConnected
                    ? ble.wifiSsid ? `Wi-Fi: ${ble.wifiSsid}` : "Wi-Fi: OK"
                    : ble.wifiState === 2
                    ? "Wi-Fi: Connecting..."
                    : ble.wifiState === 3
                    ? "Hotspot: Active"
                    : "Wi-Fi: Offline"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    ble.wifiConnected
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : ble.wifiState === 2
                      ? "bg-amber-400 animate-ping"
                      : ble.wifiState === 3
                      ? "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                      : "bg-zinc-500"
                  }`}
                />
              </button>

              <button
                onClick={ble.connected ? undefined : ble.handleConnect}
                disabled={ble.connected}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 transition-all ${
                  ble.connected
                    ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                    : ble.connecting
                    ? "border-amber-500/60 bg-amber-950/40 text-amber-300 animate-pulse cursor-pointer"
                    : "border-rose-500/50 bg-rose-950/40 text-rose-300 cursor-pointer active:scale-95 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                }`}
                title={ble.connected ? `BLE: ${ble.deviceName}` : "Connect SmartDesk via BLE"}
              >
                <span>⚡</span>
                <span className="text-[11px] font-bold">
                  {ble.connected ? "BLE: OK" : ble.connecting ? "BLE: Linking..." : "BLE: Disconnected"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    ble.connected
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : ble.connecting
                      ? "bg-amber-400"
                      : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                  }`}
                />
              </button>

              {/* AOD Button on desktop (in the badge strip) */}
              <button
                onClick={() => setActiveTab("aod")}
                className="hidden sm:flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs sm:text-sm font-extrabold transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer shrink-0"
              >
                😴 AOD SCREEN
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-3 pb-24 flex flex-col">
            <div className="flex-1 flex flex-col justify-center max-w-full w-full mx-auto">
              {activeTab === "remote" && (
                <QuickRemotePanel
                  connected={isDeskConnected}
                  deviceName={currentDeskName}
                  relays={effectiveRelays}
                  configs={effectiveConfigs}
                  led={effectiveLed}
                  matrixConfig={effectiveMatrixConfig}
                  rgbTimerRemainingMin={effectiveRgbTimerRemainingMin}
                  onToggleRelay={handleToggleRelay}
                  onSetRelayTimer={handleSetRelayTimer}
                  onAllRelaysOff={handleAllRelaysOff}
                  onSendLed={handleSendLed}
                  onSetRgbTimer={handleSetRgbTimer}
                  onSetMatrixDisplay={handleSetMatrixDisplay}
                  onStartMusic={ble.startMusicSync}
                  onStopMusic={ble.stopMusicSync}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === "relays" && (
                <RelayPanel
                  relays={effectiveRelays}
                  configs={effectiveConfigs}
                  uiAnim={ble.uiAnim}
                  connected={isDeskConnected}
                  onToggleRelay={handleToggleRelay}
                  onSetTimer={handleSetRelayTimer}
                  onAllOff={handleAllRelaysOff}
                  onSaveConfig={handleSaveRelayConfig}
                />
              )}
              {activeTab === "leds" && (
                <LedPanel
                  led={effectiveLed}
                  previewTick={ble.previewTick}
                  stripLength={effectiveStripLength}
                  onSaveStripLength={handleSaveStripLength}
                  matrixConfig={effectiveMatrixConfig}
                  onSaveMatrixConfig={ble.saveMatrixHardwareConfig}
                  onSetMatrixDisplay={handleSetMatrixDisplay}
                  musicSyncActive={ble.musicSyncActive}
                  musicBri={ble.musicBri}
                  setMusicBri={ble.setMusicBri}
                  musicSensitivity={ble.musicSensitivity}
                  setMusicSensitivity={ble.setMusicSensitivity}
                  musicSubMode={ble.musicSubMode}
                  setMusicSubMode={ble.setMusicSubMode}
                  soloColor={ble.soloColor}
                  setSoloColor={ble.setSoloColor}
                  micVolume={ble.micVolume}
                  beatPulse={ble.beatPulse}
                  onSendLed={handleSendLed}
                  onStartMusic={ble.startMusicSync}
                  onStopMusic={ble.stopMusicSync}
                />
              )}
              {activeTab === "schedule" && (
                <SchedulePanel schedules={ble.schedules} espClock={ble.espClock} onSaveRule={ble.saveScheduleRule} onDeleteRule={ble.deleteScheduleRule} onTestRule={ble.handleTestScheduleRule} onSyncClock={ble.syncRealTime} />
              )}
              {activeTab === "presence" && (
                <PresencePanel presenceData={ble.presenceData} presenceConfig={ble.presenceConfig} storedClients={ble.storedClients} clientNickname={ble.clientNickname} setClientNickname={ble.setClientNickname} designatedPresenceDevice={ble.designatedPresenceDevice} onSetDesignatedDevice={ble.setAsDesignatedPresenceDevice} onRemoveDesignatedDevice={ble.removeDesignatedPresenceDevice} customDelayInput={ble.customDelayInput} setCustomDelayInput={ble.setCustomDelayInput} connected={ble.connected} onSavePresenceConfig={ble.savePresenceConfig} onDeleteStoredClient={(slotIdx) => showAlert("Delete", `Remove slot #${slotIdx + 1}?`, () => ble.deleteStoredClient(slotIdx), true)} onClearKnownClients={() => showAlert("Clear", "Clear all 10 slots?", () => ble.clearKnownClients(), true)} onRegisterClientName={ble.registerClientName} />
              )}
              {activeTab === "settings" && (
                <SettingsPanel
                  envData={effectiveEnvData}
                  masterBuzzer={ble.masterBuzzer}
                  deviceName={currentDeskName}
                  connected={isDeskConnected}
                  connecting={ble.connecting}
                  infoString={ble.infoString}
                  logs={ble.logs}
                  showAllDevices={ble.showAllDevices}
                  setShowAllDevices={ble.setShowAllDevices}
                  stripLength={effectiveStripLength}
                  onSaveStripLength={handleSaveStripLength}
                  matrixConfig={effectiveMatrixConfig}
                  onSaveMatrixConfig={ble.saveMatrixHardwareConfig}
                  onSetMatrixDisplay={handleSetMatrixDisplay}
                  onToggleMasterBuzzer={ble.toggleMasterBuzzer}
                  onTestBuzzer={ble.testBuzzerBeep}
                  onRename={handleRename}
                  onConnect={ble.handleConnect}
                  onDisconnect={ble.handleDisconnected}
                  onClearLogs={ble.clearLogs}
                  wifiHost={ble.wifiHost}
                  wifiConnected={ble.wifiConnected}
                  wifiIp={ble.wifiIp}
                  wifiSsid={ble.wifiSsid}
                  wifiOnAwayOnly={ble.wifiOnAwayOnly}
                  onUpdateWifiHost={ble.updateWifiHost}
                  onToggleWifiOnAwayOnly={ble.toggleWifiOnAwayOnly}
                  onConfigureOverBle={ble.configureWifiOverBle}
                  cloudUser={remote.userId}
                  cloudPassword={remote.password}
                  onUpdateCloudCredentials={remote.updateCredentials}
                />
              )}
            </div>
          </div>

          <BottomNavbar activeTab={activeTab} onChangeTab={setActiveTab} connected={isDeskConnected} />
        </div>
      )}

      {relayConfigModalIdx !== null && (
        <RelayConfigModal
          isOpen={true}
          relayIndex={relayConfigModalIdx}
          config={effectiveConfigs[relayConfigModalIdx]}
          onSave={handleSaveRelayConfig}
          onClose={() => setRelayConfigModalIdx(null)}
        />
      )}
      <CustomAlertModal isOpen={alertState.isOpen} title={alertState.title} message={alertState.message} confirmLabel={alertState.confirmLabel} cancelLabel={alertState.cancelLabel} isConfirm={alertState.isConfirm} onConfirm={closeAlert} onCancel={() => setAlertState((prev) => ({ ...prev, isOpen: false }))} />
      <ToastNotification message={toastState.message} type={toastState.type} onClose={closeToast} />
      <WifiManagerModal
        isOpen={showWifiModal}
        onClose={() => setShowWifiModal(false)}
        deskHost={ble.wifiHost || "192.168.4.1"}
        currentSsid={ble.wifiSsid}
        currentIp={ble.wifiIp}
        portalStatus={
          ble.wifiConnected
            ? "Authenticated & Online"
            : ble.wifiState === 2
            ? "Bypassing Fortinet..."
            : ble.wifiState === 3
            ? "Hotspot Active (SoftAP)"
            : "Standby"
        }
        wifiConnected={ble.wifiConnected}
        wifiState={ble.wifiState}
        isBleConnected={ble.connected}
        onScanOverBle={ble.scanWifiOverBle}
        scannedNetworks={ble.scannedNetworks}
        onConfigureOverBle={ble.configureWifiOverBle}
        wifiOnAwayOnly={ble.wifiOnAwayOnly}
        onToggleWifiOnAwayOnly={ble.toggleWifiOnAwayOnly}
        onToast={showToast}
        recentLogs={ble.logs}
      />
      <CloudHandshakeModal
        isOpen={showHandshakeModal}
        onClose={() => setShowHandshakeModal(false)}
        bleConnected={ble.connected}
        bleConnecting={ble.connecting}
        deviceName={ble.deviceName}
        onConnectBle={ble.handleConnect}
        wifiState={ble.wifiState}
        wifiConnected={ble.wifiConnected}
        wifiSsid={ble.wifiSsid}
        wifiIp={ble.wifiIp}
        wifiRssi={ble.wifiRssi}
        onScanWifiOverBle={ble.scanWifiOverBle}
        scannedNetworks={ble.scannedNetworks}
        onConfigureWifiOverBle={ble.configureWifiOverBle}
        wsUrl={remote.wsUrl}
        isWsConnected={remote.isWsConnected}
        isDeviceOnline={remote.isDeviceOnline}
        onSendCloudRelayCommand={remote.sendRelayCommand}
        onUpdateCloudCredentials={remote.updateCredentials}
        onToast={showToast}
        recentLogs={ble.logs}
      />
    </main>
  );
}