/**
 * page.js — Component showcase and development preview.
 *
 * NOTE: TEMPORARY PREVIEW PAGE FOR PART 10. MARKED FOR DELETION IN PART 11.
 * Purpose : Renders every presentation component with live and mock data for verification.
 * Depends : All pwa/components and pwa/hooks.
 * Used by : Browser at /dev-preview.
 */

"use client";

import React, { useState } from 'react';
import Header from '../../components/Header.js';
import StatusBar from '../../components/StatusBar.js';
import RelayCard from '../../components/RelayCard.js';
import LedPreview from '../../components/LedPreview.js';
import ColorWheel from '../../components/ColorWheel.js';
import BrightnessSlider from '../../components/BrightnessSlider.js';
import EffectPicker from '../../components/EffectPicker.js';
import FaceSvg from '../../components/FaceSvg.js';
import CaptionBar from '../../components/CaptionBar.js';
import FeatureToggle from '../../components/FeatureToggle.js';
import ConfirmDialog from '../../components/ConfirmDialog.js';
import Toast from '../../components/Toast.js';
import CommandPalette from '../../components/CommandPalette.js';
import LogConsole from '../../components/LogConsole.js';
import DiagnosticsPanel from '../../components/DiagnosticsPanel.js';
import TimerRow from '../../components/TimerRow.js';
import ScheduleRow from '../../components/ScheduleRow.js';
import SkeletonLoader from '../../components/SkeletonLoader.js';
import EmptyState from '../../components/EmptyState.js';

import { useBle } from '../../hooks/useBle.js';
import { useRelays } from '../../hooks/useRelays.js';
import { useLeds } from '../../hooks/useLeds.js';
import { useFace } from '../../hooks/useFace.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useFeatures } from '../../hooks/useFeatures.js';
import { useBleLog } from '../../hooks/useBleLog.js';
import { useDiagnostics } from '../../hooks/useDiagnostics.js';

export default function DevPreviewPage() {
  const { isConnected, isConnecting, deviceName, isDemo, connect, disconnect, toggleDemo } = useBle();
  const { channels, toggleLoad } = useRelays();
  const { ledState, estimatedMa, updateLedState } = useLeds();
  const { currentParams, isBlinking, breathingOffset, caption } = useFace();
  const { theme, clientRole, setTheme, setClientRole } = useSettings();
  const { switches, setSwitch, featureList } = useFeatures();
  const { filteredLogs, isPaused, levelFilter, tagFilter, togglePause, clearLogs, copyLogs, setLevelFilter, setTagFilter } = useBleLog();
  const { isRunning: isSelfTestRunning, testResults, runSelfTest } = useDiagnostics();

  // Local state for modals and tests
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [toasts, setToasts] = useState([
    { id: '1', message: 'SmartDesk Component Preview ready', type: 'info' }
  ]);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div>
      <Header
        isConnected={isConnected}
        isConnecting={isConnecting}
        deviceName={deviceName}
        isDemo={isDemo}
        theme={theme}
        clientRole={clientRole}
        onConnect={connect}
        onDisconnect={disconnect}
        onToggleDemo={toggleDemo}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'midnight' : 'dark')}
        onToggleRole={() => setClientRole(clientRole === 'display' ? 'remote' : 'display')}
      />

      <main className="app-main" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>🛠️ Part 10 Component Showcase (/dev-preview)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            All 19 components rendering live state. Temporary preview route marked for deletion in Part 11.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setShowPalette(true)}>
              ⌘ Command Palette (Ctrl+K)
            </button>
            <button className="btn btn-secondary" onClick={() => setShowConfirm(true)}>
              ⚠️ Open Confirm Dialog
            </button>
          </div>
        </div>

        {/* Section 1: Robot Face & Display Elements */}
        <section className="card" style={{ alignItems: 'center' }}>
          <h3 style={{ width: '100%', marginBottom: '8px' }}>🤖 Display Face & Captions</h3>
          <FaceSvg params={currentParams} isBlinking={isBlinking} breathingOffset={breathingOffset} />
          <CaptionBar caption={caption} />
          <StatusBar uptimeSec={420} freeHeap={294820} isConnected={isConnected} isAway={false} isCallMode={false} />
        </section>

        {/* Section 2: Relays */}
        <section>
          <h3 style={{ marginBottom: '12px' }}>⚡ Relay Control Grid</h3>
          <div className="relay-grid">
            {channels.map((ch) => (
              <RelayCard
                key={ch.index}
                channel={ch}
                onToggle={() => toggleLoad(ch.index)}
                onSettingsClick={() => alert(`Settings clicked for ${ch.config.name}`)}
                onTimerClick={() => alert(`Timer clicked for ${ch.config.name}`)}
              />
            ))}
          </div>
        </section>

        {/* Section 3: Ambient LED Controls */}
        <section className="card">
          <h3 style={{ marginBottom: '12px' }}>💡 WS2812B Strip Lighting Controls</h3>
          <LedPreview ledState={ledState} count={8} />

          <div className="settings-grid" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <BrightnessSlider
                brightness={ledState.brightness}
                estimatedMa={estimatedMa}
                onChange={(b) => updateLedState({ brightness: b })}
              />
              <ColorWheel
                r={ledState.r}
                g={ledState.g}
                b={ledState.b}
                onChange={(r, g, b) => updateLedState({ r, g, b })}
              />
            </div>

            <EffectPicker
              effect={ledState.effect}
              speed={ledState.speed}
              blinkOnMs={ledState.blinkOnMs}
              blinkOffMs={ledState.blinkOffMs}
              onEffectChange={(eff) => updateLedState({ effect: eff })}
              onSpeedChange={(sp) => updateLedState({ speed: sp })}
              onBlinkTimingChange={(onMs, offMs) => updateLedState({ blinkOnMs: onMs, blinkOffMs: offMs })}
            />
          </div>
        </section>

        {/* Section 4: Timers & Schedules */}
        <section className="settings-grid">
          <div className="card">
            <h3>⏱️ Relay Timers</h3>
            <TimerRow
              relayIndex={0}
              relayName="Desk Lamp"
              timer={{ active: true, formatted: '18:42' }}
              onStart={(idx, min) => alert(`Start timer on relay ${idx} for ${min}m`)}
              onCancel={(idx) => alert(`Cancel timer on relay ${idx}`)}
            />
          </div>

          <div className="card">
            <h3>📅 Schedules</h3>
            <ScheduleRow
              schedule={{ index: 0, onHour: 9, onMin: 0, offHour: 18, offMin: 30, weekdayMask: 0x3E, enabled: 1 }}
              relayName="Desk Lamp"
              onToggleEnabled={(idx, en) => alert(`Toggle schedule ${idx}: ${en}`)}
            />
          </div>
        </section>

        {/* Section 5: Diagnostics & Live Logs */}
        <section className="settings-grid">
          <DiagnosticsPanel
            isRunning={isSelfTestRunning}
            testResults={testResults}
            onRunSelfTest={runSelfTest}
            isDemo={isDemo}
          />

          <LogConsole
            filteredLogs={filteredLogs}
            isPaused={isPaused}
            levelFilter={levelFilter}
            tagFilter={tagFilter}
            isDemo={isDemo}
            onTogglePause={togglePause}
            onClear={clearLogs}
            onCopy={copyLogs}
            onSetLevelFilter={setLevelFilter}
            onSetTagFilter={setTagFilter}
          />
        </section>

        {/* Section 6: Feature Switches */}
        <section>
          <h3 style={{ marginBottom: '12px' }}>⚙️ Runtime Feature Switches</h3>
          <div className="settings-grid">
            {featureList.slice(0, 6).map((feat) => (
              <FeatureToggle
                key={feat.id}
                item={feat}
                enabled={Boolean(switches[feat.index])}
                onChange={(idx, val) => setSwitch(idx, val ? 1 : 0)}
              />
            ))}
          </div>
        </section>

        {/* Section 7: Placeholders & Empty States */}
        <section className="settings-grid">
          <div className="card">
            <h3>Skeleton Loader Placeholder</h3>
            <SkeletonLoader count={2} height="60px" />
          </div>

          <EmptyState
            icon="🔌"
            title="No Devices Paired"
            description="Turn on your SmartDesk dev board and click Pair above."
            actionLabel="Scan Bluetooth"
            onAction={connect}
          />
        </section>
      </main>

      {/* Modals & Overlays */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Photosensitivity Warning"
        message="A blink rate faster than 3 flashes per second can trigger photosensitive seizures. Do you wish to override the safety threshold?"
        confirmLabel="Enable Rapid Blink"
        isDanger={true}
        onConfirm={() => setShowConfirm(false)}
        onCancel={() => setShowConfirm(false)}
      />

      <CommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onExecuteCommand={(id) => {
          setToasts((prev) => [...prev, { id: String(Date.now()), message: `Executed: ${id}`, type: 'success' }]);
        }}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
