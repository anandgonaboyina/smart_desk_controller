/**
 * UnlockScreen.js — PC Unlock and hardware keystroke injection screen.
 *
 * Purpose : Configures USB/BLE automated sign-in. Master switch at top disables all actions.
 *           Password field is strictly write-only and never read back or logged.
 * Depends : React, useFeatures.js, useUnlock.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import useFeatures from '../hooks/useFeatures.js';
import useUnlock from '../hooks/useUnlock.js';

export function UnlockScreen() {
  const { isEnabled, setSwitch } = useFeatures();
  const { settings, passwordIsSet, triggerTypeNow, savePassword, erasePassword, updateSetting } = useUnlock();
  const [newPassword, setNewPassword] = useState('');

  const isMasterEnabled = isEnabled(0); // Feature index 0: PC_UNLOCK

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!newPassword) return;
    savePassword(newPassword);
    setNewPassword('');
  };

  return (
    <div className="unlock-screen-container">
      <h1 className="screen-title">PC Unlock & Keystrokes</h1>

      <div className="card-box master-switch-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Master Safety Switch</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hardware guard for keystroke injection</p>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            className="toggle-input"
            checked={isMasterEnabled}
            onChange={(e) => setSwitch(0, e.target.checked ? 1 : 0)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {!isMasterEnabled ? (
        <div className="card-box disabled-banner" style={{ marginTop: '20px', borderLeft: '4px solid var(--color-warning)' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--color-warning)' }}>PC Unlock is Disabled</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            The master safety switch is turned OFF. Keystroke typing and credential access are completely blocked in firmware.
          </p>
        </div>
      ) : (
        <div className="unlock-active-content" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-box">
            <h2 className="section-title">Manual Trigger</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Status: {passwordIsSet ? '🔑 Credential Set' : '⚠️ No Password Set'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => triggerTypeNow(0)}
              disabled={!passwordIsSet}
              style={{ width: '100%', height: '48px' }}
            >
              Unlock PC Now (Type Keystrokes)
            </button>
          </div>

          <div className="card-box">
            <h2 className="section-title">Credential (Write-Only)</h2>
            <form onSubmit={handleSavePassword}>
              <div className="form-group">
                <label className="form-label">Set New Password / PIN</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="Enter credential..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="card-actions-row">
                <button type="submit" className="btn btn-primary" disabled={!newPassword}>
                  Save Password
                </button>
                {passwordIsSet && (
                  <button type="button" className="btn btn-danger" onClick={erasePassword}>
                    Erase from Device
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card-box">
            <h2 className="section-title">Sign-In Settings</h2>
            <div className="form-group-row">
              <label className="form-label">Press Enter after typing</label>
              <input
                type="checkbox"
                checked={Boolean(settings.pressEnter)}
                onChange={(e) => updateSetting(0x02, e.target.checked ? 1 : 0)}
              />
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Auto-Delay: {settings.autoDelaySec || 3}s</label>
              <input
                type="range"
                min={1}
                max={10}
                value={settings.autoDelaySec || 3}
                onChange={(e) => updateSetting(0x03, Number(e.target.value))}
                className="input-range"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnlockScreen;
