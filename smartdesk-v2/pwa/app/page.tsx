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
import WebFlasherModal from "../components/WebFlasherModal";
import TopHeader from "../components/TopHeader";
import CustomAlertModal, { ModalAlertProps } from "../components/CustomAlertModal";
import ToastNotification, { ToastProps } from "../components/ToastNotification";
import { useRemoteDeskWs } from "../hooks/useRemoteDeskWs";

export default function SmartDeskApp() {
  const [activeTab, setActiveTab] = useState<NavTab>("aod");
  const [relayConfigModalIdx, setRelayConfigModalIdx] = useState<number | null>(null);
  const [showWifiModal, setShowWifiModal] = useState<boolean>(false);
  const [showHandshakeModal, setShowHandshakeModal] = useState<boolean>(false);
  const [showFlasherModal, setShowFlasherModal] = useState<boolean>(false);

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

  const handleSetTempOffset = useCallback((offset: number) => {
    if (remote.isWsConnected && remote.isDeviceOnline) {
      remote.sendTempOffsetCommand(offset);
    }
    showToast(`Temperature offset set to ${offset > 0 ? `+${offset}` : offset}°C`);
  }, [remote, showToast]);

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
      {/* ── UNIFIED TOP CONTROL HEADER: Renders across all views (AOD, Remote, Settings, etc.) ── */}
      <TopHeader
        currentDeskName={currentDeskName}
        isDeskConnected={isDeskConnected}
        bleConnected={ble.connected}
        bleConnecting={ble.connecting}
        onConnectBle={ble.handleConnect}
        isWsConnected={remote.isWsConnected}
        isCloudOnline={remote.isWsConnected && remote.isDeviceOnline}
        onOpenHandshake={() => setShowHandshakeModal(true)}
        wifiConnected={ble.wifiConnected}
        wifiState={ble.wifiState}
        wifiSsid={ble.wifiSsid}
        wifiIp={ble.wifiIp}
        onOpenWifiModal={() => setShowWifiModal(true)}
        onOpenFlasher={() => setShowFlasherModal(true)}
        activeTab={activeTab}
        onToggleAod={() => setActiveTab(activeTab === "aod" ? "remote" : "aod")}
      />

      {/* ── SCREEN CONTENT VIEWPORT ── */}
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
        <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-2 sm:px-6 overflow-hidden">
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
                  onSetTempOffset={handleSetTempOffset}
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
      <WebFlasherModal
        isOpen={showFlasherModal}
        onClose={() => setShowFlasherModal(false)}
      />
    </main>
  );
}