/**
 * SystemScreen.js — System administration, hardware resets, and diagnostics commands.
 *
 * Purpose : Executes reboot, BLE restarts, memory clears, and guarded factory reset.
 * Depends : React, ble.js, ConfirmDialog.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import ble from '../lib/ble.js';

export function SystemScreen() {
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');

  const handleFactoryReset = () => {
    if (confirmWord === 'RESET') {
      ble.sendSystemCmd(0x0A, 'RESET');
      setShowFactoryModal(false);
      setConfirmWord('');
    }
  };

  return (
    <div className="system-screen-container">
      <h1 className="screen-title">System Administration</h1>

      <div className="card-box">
        <h2 className="section-title">Hardware Controls</h2>
        <div className="card-actions-row">
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x01)}>
            Reboot ESP32
          </button>
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x02)}>
            Restart BLE Radio
          </button>
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x03)}>
            Disconnect All
          </button>
        </div>
      </div>

      <div className="card-box" style={{ marginTop: '20px' }}>
        <h2 className="section-title">Emergency Safe Actions</h2>
        <div className="card-actions-row">
          <button className="btn btn-danger" onClick={() => ble.sendSystemCmd(0x0B)}>
            All Load OFF
          </button>
          <button className="btn btn-danger" onClick={() => ble.sendSystemCmd(0x0C)}>
            Apply Safe State
          </button>
        </div>
      </div>

      <div className="card-box" style={{ marginTop: '20px' }}>
        <h2 className="section-title">NVS Memory Resets</h2>
        <div className="card-actions-row">
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x04)}>
            Clear Schedules
          </button>
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x05)}>
            Clear Timers
          </button>
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x08)}>
            Reset Relay Configs
          </button>
          <button className="btn btn-secondary" onClick={() => ble.sendSystemCmd(0x09)}>
            Reset Feature Switches
          </button>
        </div>
      </div>

      <div className="card-box danger-card" style={{ marginTop: '20px', border: '1px solid var(--color-danger)' }}>
        <h2 className="section-title" style={{ color: 'var(--color-danger)' }}>Factory Reset</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Erases all NVS settings, stored WiFi credentials, schedules, and pairing data.
        </p>
        <button className="btn btn-danger" onClick={() => setShowFactoryModal(true)}>
          Erase All & Factory Reset
        </button>
      </div>

      {showFactoryModal && (
        <div className="modal-overlay">
          <div className="card-box modal-box" style={{ maxWidth: '400px' }}>
            <h3 style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Confirm Factory Reset</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '12px 0' }}>
              Type the word <strong>RESET</strong> in capital letters to confirm erasing all device configuration.
            </p>
            <input
              type="text"
              className="input-text"
              placeholder="Type RESET..."
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
            />
            <div className="card-actions-row" style={{ marginTop: '16px' }}>
              <button className="btn btn-danger" onClick={handleFactoryReset} disabled={confirmWord !== 'RESET'}>
                Perform Factory Reset
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowFactoryModal(false); setConfirmWord(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemScreen;

