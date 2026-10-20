/**
 * RelaySettingsScreen.js — Relay electrical and operational configuration screen.
 *
 * Purpose : Configures polarity, GPIO pin, wiring contact (NO/NC), boot behavior,
 *           min switch rate-limit, and away mode linkage per relay channel.
 * Depends : React, useRelays.js, bus.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState, useEffect } from 'react';
import useRelays from '../hooks/useRelays.js';
import bus from '../lib/bus.js';

const SAFE_PINS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47];

export function RelaySettingsScreen({ onBack }) {
  const { channels, setConfig, resetConfig, testRelay } = useRelays();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeChannel = channels[selectedIdx] || channels[0];
  const [draftConfig, setDraftConfig] = useState(activeChannel?.config || {});

  useEffect(() => {
    const ch = channels[selectedIdx];
    if (ch?.config) setDraftConfig({ ...ch.config });
  }, [selectedIdx, channels]);

  const handleFieldChange = (field, val) => {
    setDraftConfig((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    setConfig(selectedIdx, draftConfig);
    bus.emit('system:toast', {
      message: `Saved settings for ${draftConfig.name || 'Relay ' + (selectedIdx + 1)}!`,
      type: 'success',
    });
  };

  const cfg = draftConfig;

  return (
    <div className="relay-settings-page">
      {/* Top Header */}
      <div className="relay-settings-header">
        {onBack && (
          <button className="btn-back-nav" onClick={onBack} title="Return to Remote">
            ← Back to Remote
          </button>
        )}
        <h1 className="relay-settings-title">Relay Hardware Settings</h1>
        <p className="relay-settings-subtitle">
          Configure GPIO pins, electrical polarity, NO/NC contacts, and safety protections.
        </p>
      </div>

      {/* Channel Switcher Pills */}
      <div className="channel-pill-bar">
        {channels.map((ch) => (
          <button
            key={ch.index}
            className={`channel-pill-tab ${selectedIdx === ch.index ? 'active' : ''}`}
            onClick={() => setSelectedIdx(ch.index)}
          >
            <span className="channel-pill-icon">{ch.config.icon || '⚡'}</span>
            <div className="channel-pill-meta">
              <span className="channel-pill-name">{ch.config.name || `Relay ${ch.index + 1}`}</span>
              <span className="channel-pill-sub">CH {ch.index + 1}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Main Settings Body */}
      <div className="relay-settings-card">

        {/* Section 1: Channel Identity & Live Status */}
        <div className="settings-section">
          <div className="section-header-row">
            <h2 className="settings-section-title">1. Channel Identity</h2>
            <div className="live-status-pill">
              <span className={`live-dot ${activeChannel?.load ? 'active' : 'idle'}`} />
              <span>
                GPIO {cfg.gpioPin ?? (4 + selectedIdx)}: <strong>{activeChannel?.gpioLevel ? 'HIGH (3.3V)' : 'LOW (0V)'}</strong>
              </span>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Icon & Channel Name</label>
            <div className="identity-input-row">
              <input
                className="input-icon"
                type="text"
                maxLength={2}
                value={cfg.icon || '⚡'}
                onChange={(e) => handleFieldChange('icon', e.target.value)}
                title="Channel Emoji"
              />
              <input
                className="input-name"
                type="text"
                maxLength={20}
                value={cfg.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder={`Relay ${selectedIdx + 1}`}
              />
            </div>
            <span className="field-hint">Name and emoji displayed on Remote, Display Face, and Timers</span>
          </div>
        </div>

        {/* Section 2: Hardware GPIO & Electrical Polarity */}
        <div className="settings-section">
          <h2 className="settings-section-title">2. Hardware & Electrical Wiring</h2>

          <div className="two-column-grid">
            <div className="field-group">
              <label className="field-label">ESP32-S3 Output GPIO Pin</label>
              <select
                className="field-select"
                value={cfg.gpioPin ?? (4 + selectedIdx)}
                onChange={(e) => handleFieldChange('gpioPin', Number(e.target.value))}
              >
                {SAFE_PINS.map((pin) => (
                  <option key={pin} value={pin}>
                    GPIO {pin} {pin === (4 + selectedIdx) ? `(Default CH${selectedIdx + 1})` : ''}
                  </option>
                ))}
              </select>
              <span className="field-hint">Physical pin connected to this channel</span>
            </div>

            <div className="field-group">
              <label className="field-label">Input Electrical Polarity</label>
              <select
                className="field-select"
                value={cfg.polarity ?? 0}
                onChange={(e) => handleFieldChange('polarity', Number(e.target.value))}
              >
                <option value={0}>Active-LOW (0V = Energized, Standard Relays)</option>
                <option value={1}>Active-HIGH (3.3V = Energized, Direct LEDs & MOSFETs)</option>
              </select>
              <span className="field-hint">
                {cfg.polarity === 1
                  ? '⚡ Pin drives 3.3V when ON — perfect for direct LEDs & transistors.'
                  : '🔌 Pin drives 0V when ON — standard for relay boards with optocouplers.'}
              </span>
            </div>
          </div>

          <div className="two-column-grid" style={{ marginTop: '14px' }}>
            <div className="field-group">
              <label className="field-label">Contact Wiring</label>
              <select
                className="field-select"
                value={cfg.wiring ?? 0}
                onChange={(e) => handleFieldChange('wiring', Number(e.target.value))}
              >
                <option value={0}>Normally Open (NO — appliance powered only when turned ON)</option>
                <option value={1}>Normally Closed (NC — appliance powered by default)</option>
              </select>
              <span className="field-hint">Physical contact terminal on your relay board</span>
            </div>

            <div className="field-group">
              <label className="field-label">Power-On Boot Behavior</label>
              <select
                className="field-select"
                value={cfg.bootBehavior ?? 0}
                onChange={(e) => handleFieldChange('bootBehavior', Number(e.target.value))}
              >
                <option value={0}>Restore Last State (from NVS flash)</option>
                <option value={1}>Always OFF (Safe cold boot)</option>
                <option value={2}>Always ON (Immediate boot power)</option>
              </select>
              <span className="field-hint">State when ESP32 powers on or reboots</span>
            </div>
          </div>
        </div>

        {/* Section 3: Safety & Automation */}
        <div className="settings-section">
          <h2 className="settings-section-title">3. Safety & Away Mode Linkage</h2>

          <div className="field-group">
            <div className="field-label-split">
              <label className="field-label">Minimum Switching Rate-Limit</label>
              <span className="value-badge">{cfg.minSwitchMs || 2000} ms</span>
            </div>
            <input
              type="range"
              min={250}
              max={5000}
              step={250}
              value={cfg.minSwitchMs || 2000}
              onChange={(e) => handleFieldChange('minSwitchMs', Number(e.target.value))}
              className="field-range"
            />
            <span className="field-hint">
              Protects sensitive loads (chargers, monitors) from rapid clicking or chatter
            </span>
          </div>

          <div className="toggle-switch-card">
            <div className="toggle-info">
              <span className="toggle-title">Turn OFF during Desk Away Mode</span>
              <span className="toggle-desc">Automatically powers down when you arm Away Mode</span>
            </div>
            <label className="switch-wrapper">
              <input
                type="checkbox"
                className="switch-native"
                checked={Boolean(cfg.affectedByAway)}
                onChange={(e) => handleFieldChange('affectedByAway', e.target.checked ? 1 : 0)}
              />
              <span className="switch-slider" />
            </label>
          </div>
        </div>

        {/* Section 4: Actions Row */}
        <div className="settings-actions-footer">
          <button className="btn-primary-save" onClick={handleSave}>
            💾 Save Settings
          </button>
          <button className="btn-secondary-action" onClick={() => testRelay(selectedIdx)}>
            ⚡ Pulse Test
          </button>
          <button className="btn-secondary-action" onClick={() => resetConfig(selectedIdx)}>
            ↺ Reset
          </button>
        </div>

      </div>
    </div>
  );
}

export default RelaySettingsScreen;
