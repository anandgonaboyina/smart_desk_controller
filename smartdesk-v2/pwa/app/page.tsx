/**
 * page.tsx — Main entry point & screen router
 */

"use client";

import React, { useState, useCallback } from "react";
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
  const currentDeskName = ble.connected
    ? ble.deviceName
    : ble.wifiConnected
    ? `SmartDesk (Wi-Fi ${ble.wifiIp || ble.wifiHost})`
    : (remote.isWsConnected && remote.isDeviceOnline)
    ? `SmartDesk (Cloud Remote)`
    : ble.deviceName;

  const effectiveRelays = (ble.connected || ble.wifiConnected)
    ? ble.relays
    : (remote.isWsConnected && remote.isDeviceOnline)
    ? remote.deviceState.relays.map((r) => ({
        load: r.load,
        remainingMin: r.remainingMin || 0,
      }))
    : ble.relays;

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
          relayConfigs={ble.configs}
          envData={ble.envData}
          presenceData={ble.presenceData}
          rgbTimerRemainingMin={ble.rgbTimerRemainingMin}
          onConnect={ble.handleConnect}
          onOpenRemote={() => setActiveTab("remote")}
          onToggleRelay={handleToggleRelay}
          onAllRelaysOff={handleAllRelaysOff}
          onSendLed={handleSendLed}
          onSetMatrixMode={(mode, text) => ble.setMatrixDisplay(mode, undefined, undefined, undefined, undefined, undefined, text)}
          onStartMusic={ble.startMusicSync}
          onStopMusic={ble.stopMusicSync}
        />
      ) : (
        <div className="flex flex-col w-full h-[100dvh] max-w-7xl mx-auto px-2 sm:px-6">
          
          {/* HIGH-CONTRAST HEADER */}
          <header className="flex items-center justify-between py-4 border-b-2 border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <img src="/SmartDesk logo.png" alt="SmartDesk Logo" className="w-8 h-8 rounded-lg object-contain shadow-md border border-zinc-800" />
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isDeskConnected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" : ble.connecting ? "bg-amber-400 animate-ping" : "bg-zinc-600"}`} />
                <span className="text-sm font-extrabold tracking-wide text-white">
                  {isDeskConnected ? currentDeskName : ble.connecting ? "Connecting..." : "Standby"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div
                onClick={() => setShowHandshakeModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-black shadow-[0_0_10px_rgba(6,182,212,0.2)] active:scale-95 transition-all cursor-pointer"
                title="Step-by-step Worldwide Handshake Verification"
              >
                <span>🤝</span>
                <span className="hidden sm:inline">HANDSHAKE</span>
              </button>

              <button
                onClick={() => setShowWifiModal(true)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
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
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
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

              <button
                onClick={() => setActiveTab("aod")}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs sm:text-sm font-extrabold transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
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
                  configs={ble.configs}
                  led={ble.led}
                  matrixConfig={ble.matrixConfig}
                  rgbTimerRemainingMin={ble.rgbTimerRemainingMin}
                  onToggleRelay={handleToggleRelay}
                  onSetRelayTimer={ble.setRelayTimer}
                  onAllRelaysOff={handleAllRelaysOff}
                  onSendLed={handleSendLed}
                  onSetRgbTimer={ble.setRgbTimer}
                  onSetMatrixDisplay={ble.setMatrixDisplay}
                  onStartMusic={ble.startMusicSync}
                  onStopMusic={ble.stopMusicSync}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === "relays" && (
                <RelayPanel relays={ble.relays} configs={ble.configs} uiAnim={ble.uiAnim} connected={ble.connected} onToggleRelay={ble.toggleRelay} onSetTimer={ble.setRelayTimer} onAllOff={ble.allRelaysOff} onSaveConfig={ble.saveRelayConfig} />
              )}
              {activeTab === "leds" && (
                <LedPanel
                  led={ble.led}
                  previewTick={ble.previewTick}
                  stripLength={ble.stripLength}
                  onSaveStripLength={ble.saveStripLength}
                  matrixConfig={ble.matrixConfig}
                  onSaveMatrixConfig={ble.saveMatrixHardwareConfig}
                  onSetMatrixDisplay={ble.setMatrixDisplay}
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
                  onSendLed={ble.sendLedCommand}
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
                  envData={ble.envData}
                  masterBuzzer={ble.masterBuzzer}
                  deviceName={ble.deviceName}
                  connected={isDeskConnected}
                  connecting={ble.connecting}
                  infoString={ble.infoString}
                  logs={ble.logs}
                  showAllDevices={ble.showAllDevices}
                  setShowAllDevices={ble.setShowAllDevices}
                  stripLength={ble.stripLength}
                  onSaveStripLength={ble.saveStripLength}
                  matrixConfig={ble.matrixConfig}
                  onSaveMatrixConfig={ble.saveMatrixHardwareConfig}
                  onSetMatrixDisplay={ble.setMatrixDisplay}
                  onToggleMasterBuzzer={ble.toggleMasterBuzzer}
                  onTestBuzzer={ble.testBuzzerBeep}
                  onRename={ble.saveRename}
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
        <RelayConfigModal isOpen={true} relayIndex={relayConfigModalIdx} config={ble.configs[relayConfigModalIdx]} onSave={ble.saveRelayConfig} onClose={() => setRelayConfigModalIdx(null)} />
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