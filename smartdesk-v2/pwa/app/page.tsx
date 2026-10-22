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
import CustomAlertModal, { ModalAlertProps } from "../components/CustomAlertModal";
import ToastNotification, { ToastProps } from "../components/ToastNotification";

export default function SmartDeskApp() {
  const [activeTab, setActiveTab] = useState<NavTab>("aod");
  const [relayConfigModalIdx, setRelayConfigModalIdx] = useState<number | null>(null);

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

  return (
    <main className="min-h-[100dvh] w-full bg-black text-white overflow-hidden flex flex-col font-sans">
      {activeTab === "aod" ? (
        <AodFaceScreen
          connected={ble.connected}
          connecting={ble.connecting}
          deviceName={ble.deviceName}
          relays={ble.relays}
          relayConfigs={ble.configs}
          envData={ble.envData}
          presenceData={ble.presenceData}
          rgbTimerRemainingMin={ble.rgbTimerRemainingMin}
          onConnect={ble.handleConnect}
          onOpenRemote={() => setActiveTab("remote")}
          onToggleRelay={ble.toggleRelay}
          onAllRelaysOff={ble.allRelaysOff}
          onSendLed={ble.sendLedCommand}
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
                <span className={`w-2.5 h-2.5 rounded-full ${ble.connected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" : ble.connecting ? "bg-amber-400 animate-ping" : "bg-zinc-600"}`} />
                <span className="text-sm font-extrabold tracking-wide text-white">
                  {ble.connected ? ble.deviceName : ble.connecting ? "Connecting..." : "Standby"}
                </span>
              </div>
            </div>
            
            {/* ENHANCED TOGGLE BACK BUTTON */}
            <button
              onClick={() => setActiveTab("aod")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs sm:text-sm font-extrabold transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              😴 AOD SCREEN
            </button>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-3 pb-24 flex flex-col">
            <div className="flex-1 flex flex-col justify-center max-w-full w-full mx-auto">
              {activeTab === "remote" && (
                <QuickRemotePanel
                  connected={ble.connected}
                  deviceName={ble.deviceName}
                  relays={ble.relays}
                  configs={ble.configs}
                  led={ble.led}
                  matrixConfig={ble.matrixConfig}
                  rgbTimerRemainingMin={ble.rgbTimerRemainingMin}
                  onToggleRelay={ble.toggleRelay}
                  onSetRelayTimer={ble.setRelayTimer}
                  onAllRelaysOff={ble.allRelaysOff}
                  onSendLed={ble.sendLedCommand}
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
                  connected={ble.connected}
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
                />
              )}
            </div>
          </div>

          <BottomNavbar activeTab={activeTab} onChangeTab={setActiveTab} connected={ble.connected} />
        </div>
      )}

      {relayConfigModalIdx !== null && (
        <RelayConfigModal isOpen={true} relayIndex={relayConfigModalIdx} config={ble.configs[relayConfigModalIdx]} onSave={ble.saveRelayConfig} onClose={() => setRelayConfigModalIdx(null)} />
      )}
      <CustomAlertModal isOpen={alertState.isOpen} title={alertState.title} message={alertState.message} confirmLabel={alertState.confirmLabel} cancelLabel={alertState.cancelLabel} isConfirm={alertState.isConfirm} onConfirm={closeAlert} onCancel={() => setAlertState((prev) => ({ ...prev, isOpen: false }))} />
      <ToastNotification message={toastState.message} type={toastState.type} onClose={closeToast} />
    </main>
  );
}