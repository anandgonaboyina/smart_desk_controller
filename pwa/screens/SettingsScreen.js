/**
 * SettingsScreen.js — App preferences, clock sync, and JSON configuration backup/restore.
 *
 * Purpose : Theme toggle, role selection, manual clock sync, and secure JSON configuration backup.
 *           Passwords and PINs are strictly excluded from backup files.
 * Depends : React, useSettings.js, useRelays.js, useLeds.js, useFeatures.js, ble.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import useSettings from '../hooks/useSettings.js';
import useRelays from '../hooks/useRelays.js';
import useLeds from '../hooks/useLeds.js';
import useFeatures from '../hooks/useFeatures.js';
import ble from '../lib/ble.js';

export function SettingsScreen() {
  const { theme, setTheme, clientRole, setClientRole } = useSettings();
  const { configs } = useRelays();
  const { ledState, bootSettings } = useLeds();
  const { switches } = useFeatures();
  const [restoreStatus, setRestoreStatus] = useState('');

  const handleBackup = () => {
    const backupData = {
      version: 1,
      createdAt: new Date().toISOString(),
      configs,
      ledState,
      bootSettings,
      switches,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.configs) {
          Object.entries(data.configs).forEach(([idx, cfg]) => ble.setRelayConfig(Number(idx), cfg));
        }
        if (data.ledState) ble.setLedState(data.ledState);
        setRestoreStatus('Configuration restored successfully!');
      } catch {
        setRestoreStatus('Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-screen-container">
      <h1 className="screen-title">Preferences & Backup</h1>

      <div className="card-box">
        <h2 className="section-title">Application Appearance & Role</h2>
        <div className="form-group-row">
          <label className="form-label">Theme</label>
          <select className="input-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </select>
        </div>

        <div className="form-group-row" style={{ marginTop: '12px' }}>
          <label className="form-label">Operating Role</label>
          <select className="input-select" value={clientRole} onChange={(e) => setClientRole(e.target.value)}>
            <option value="display">Display (Face & Clock on Laptop)</option>
            <option value="remote">Remote (Controls on Phone)</option>
          </select>
        </div>

        <div style={{ marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => ble.syncTime()}>
            Sync Hardware Clock to Local Time
          </button>
        </div>
      </div>

      <div className="card-box" style={{ marginTop: '20px' }}>
        <h2 className="section-title">Configuration Backup & Restore</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Export your relay names, schedules, and lighting preferences. Credentials (passwords/PINs) are write-only on the ESP32 and are never stored in backup files.
        </p>

        <div className="card-actions-row">
          <button className="btn btn-primary" onClick={handleBackup}>
            Export Backup JSON
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            Import Backup JSON
            <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} />
          </label>
        </div>
        {restoreStatus && <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{restoreStatus}</p>}
      </div>
    </div>
  );
}

export default SettingsScreen;

