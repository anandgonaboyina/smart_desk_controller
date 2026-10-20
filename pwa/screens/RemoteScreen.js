/**
 * RemoteScreen.js — Handheld Desk Remote controller interface.
 *
 * Purpose : Tactile remote control panel with channel tab switching,
 *           immediate relay toggles, quick actions, ambient lighting,
 *           and bottom settings configure toggle.
 * Depends : React, useRelays, useLeds, useAway, useUnlock, components.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import useRelays from '../hooks/useRelays.js';
import useLeds from '../hooks/useLeds.js';
import useAway from '../hooks/useAway.js';
import useUnlock from '../hooks/useUnlock.js';
import useBle from '../hooks/useBle.js';
import StatusBar from '../components/StatusBar.js';
import RelayCard from '../components/RelayCard.js';
import BrightnessSlider from '../components/BrightnessSlider.js';
import ConfirmDialog from '../components/ConfirmDialog.js';

export function RemoteScreen({ onOpenSettings }) {
  const { channels, toggleLoad } = useRelays();
  const { ledState = { mode: 1, brightness: 75 }, updateLedState } = useLeds();
  const { isActive: isAway, activateAway, endAway } = useAway();
  const { triggerTypeNow, passwordIsSet } = useUnlock();
  const { isConnected, isDemo, connect, disconnect } = useBle();
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const toggleAway = () => (isAway ? endAway(true) : activateAway());
  const toggleLed = () => updateLedState({ mode: ledState.mode ? 0 : 1 });
  const setBrightness = (b) => updateLedState({ mode: ledState.mode === 0 ? 1 : ledState.mode, brightness: b });

  const handleRelayToggle = (idx) => {
    if (!isConnected && !isDemo) {
      connect();
      return;
    }
    toggleLoad(idx);
  };

  return (
    <div className="remote-screen-container">
      <div className="remote-chassis">
        {/* Remote Top Header Bezel */}
        <div className="remote-top-bar">
          <div className="remote-brand">
            <span className={`remote-led-dot ${isConnected ? 'active' : 'idle'}`} />
            <span className="remote-title">DESK REMOTE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isConnected && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowDisconnectModal(true)}
                style={{ height: '28px', minHeight: '28px', padding: '0 8px', fontSize: '0.72rem' }}
                title="Disconnect BLE"
              >
                Disconnect
              </button>
            )}
            <StatusBar />
          </div>
        </div>

        {/* Bluetooth Connect Banner if Offline */}
        {!isConnected && !isDemo && (
          <div className="remote-connect-banner" onClick={connect} role="button" tabIndex={0}>
            <span className="connect-pulse-dot" />
            <span>⚡ Connect SmartDesk (Click to Pair via Bluetooth)</span>
          </div>
        )}

        {/* Quick Actions Remote Row */}
        <div className="remote-quick-actions">
          <button
            className={`quick-action-btn ${isAway ? 'active-away' : ''}`}
            onClick={toggleAway}
            title="Toggle Away Mode"
          >
            <span className="icon">🚶</span>
            <span>{isAway ? 'Disarm' : 'Arm Away'}</span>
          </button>

          <button
            className="quick-action-btn"
            onClick={() => triggerTypeNow(0)}
            disabled={!passwordIsSet}
            title={passwordIsSet ? 'Trigger PC Unlock' : 'Password Not Configured'}
          >
            <span className="icon">🔓</span>
            <span>Unlock PC</span>
          </button>

          <button
            className={`quick-action-btn ${ledState.mode ? 'active-led' : ''}`}
            onClick={toggleLed}
            title="Toggle Ambient LEDs"
          >
            <span className="icon">💡</span>
            <span>{ledState.mode ? 'LEDs On' : 'LEDs Off'}</span>
          </button>
        </div>

        {/* All Relays Grid (Clean 4-Channel Tactile Controller) */}
        <div className="relays-grid">
          {channels.map((ch) => (
            <RelayCard
              key={ch.index}
              channel={ch}
              onToggle={handleRelayToggle}
              onSettingsClick={onOpenSettings}
            />
          ))}
        </div>

        {/* Ambient Lighting Control */}
        <div className="remote-led-slider-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              💡 Desk Backlight
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
              {ledState.mode ? `${ledState.brightness}%` : 'OFF'}
            </span>
          </div>
          <BrightnessSlider
            value={ledState.brightness}
            onChange={setBrightness}
          />
        </div>

        {/* Bottom Configuration Button */}
        <div className="remote-footer-action">
          <button
            className="btn btn-secondary remote-settings-btn"
            onClick={onOpenSettings}
          >
            <span>⚙️</span>
            <span>Configure Relay Settings & GPIO Pins →</span>
          </button>
        </div>
      </div>

      {/* Disconnect Modal to Prevent Mistouch */}
      <ConfirmDialog
        isOpen={showDisconnectModal}
        title="Disconnect SmartDesk"
        message="Are you sure you want to disconnect? All real-time telemetry and wireless controls will stop until reconnected."
        confirmLabel="Disconnect"
        cancelLabel="Stay Connected"
        isDanger={true}
        onConfirm={() => {
          setShowDisconnectModal(false);
          disconnect();
        }}
        onCancel={() => setShowDisconnectModal(false)}
      />
    </div>
  );
}

export default RemoteScreen;
