/**
 * RelaySettingsScreen.js — Relay electrical and operational configuration screen.
 *
 * Purpose : Configures polarity, wiring contact (NO/NC), boot behavior, min switch rate-limit,
 *           and away mode linkage per relay channel.
 * Depends : React, useRelays.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import useRelays from '../hooks/useRelays.js';

export function RelaySettingsScreen() {
  const { channels, setConfig, resetConfig, testRelay } = useRelays();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const activeChannel = channels[selectedIdx] || channels[0];
  const cfg = activeChannel?.config || {};

  const handleUpdate = (field, val) => {
    setConfig(selectedIdx, { ...cfg, [field]: val });
  };

  return (
    <div className="settings-screen-container">
      <h1 className="screen-title">Relay Configuration</h1>

      <div className="tab-pill-selector">
        {channels.map((ch) => (
          <button
            key={ch.index}
            className={`tab-pill-btn ${selectedIdx === ch.index ? 'active' : ''}`}
            onClick={() => setSelectedIdx(ch.index)}
          >
            {ch.config.name || `Relay ${ch.index + 1}`}
          </button>
        ))}
      </div>

      <div className="card-box config-card">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="input-text"
            type="text"
            maxLength={16}
            value={cfg.name || ''}
            onChange={(e) => handleUpdate('name', e.target.value)}
          />
        </div>

        <div className="form-group-row">
          <label className="form-label">Contact Wiring</label>
          <select
            className="input-select"
            value={cfg.wiring || 0}
            onChange={(e) => handleUpdate('wiring', Number(e.target.value))}
          >
            <option value={0}>NO (Normally Open)</option>
            <option value={1}>NC (Normally Closed)</option>
          </select>
        </div>

        <div className="form-group-row">
          <label className="form-label">Input Polarity</label>
          <select
            className="input-select"
            value={cfg.polarity || 0}
            onChange={(e) => handleUpdate('polarity', Number(e.target.value))}
          >
            <option value={0}>Active-LOW (0=Energized)</option>
            <option value={1}>Active-HIGH (1=Energized)</option>
          </select>
        </div>

        <div className="form-group-row">
          <label className="form-label">Boot Behavior</label>
          <select
            className="input-select"
            value={cfg.bootBehavior || 0}
            onChange={(e) => handleUpdate('bootBehavior', Number(e.target.value))}
          >
            <option value={0}>Restore Last State</option>
            <option value={1}>Always OFF (Unpowered)</option>
            <option value={2}>Always ON (Powered)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Min Switch Interval: {cfg.minSwitchMs || 2000} ms</label>
          <input
            type="range"
            min={1000}
            max={5000}
            step={250}
            value={cfg.minSwitchMs || 2000}
            onChange={(e) => handleUpdate('minSwitchMs', Number(e.target.value))}
            className="input-range"
          />
        </div>

        <div className="form-group-row checkbox-row">
          <label className="form-label">Turn OFF during Away Mode</label>
          <input
            type="checkbox"
            checked={Boolean(cfg.affectedByAway)}
            onChange={(e) => handleUpdate('affectedByAway', e.target.checked ? 1 : 0)}
            className="input-checkbox"
          />
        </div>

        <div className="card-actions-row">
          <button className="btn btn-secondary" onClick={() => testRelay(selectedIdx)}>
            Pulse Test (500ms)
          </button>
          <button className="btn btn-danger" onClick={() => resetConfig(selectedIdx)}>
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

export default RelaySettingsScreen;
