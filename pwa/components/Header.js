/**
 * Header.js — Top navigation bar with connection status, role switch, and theme toggle.
 *
 * Purpose : Presentational header bar for mode selection and BLE status indicator.
 * Depends : React only.
 * Used by : App layout, dev-preview.
 */

"use client";

import React from 'react';

export default function Header({
  isConnected = false,
  isConnecting = false,
  deviceName = null,
  isDemo = false,
  theme = 'dark',
  clientRole = 'display',
  onConnect,
  onDisconnect,
  onToggleDemo,
  onToggleTheme,
  onToggleRole,
}) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="brand-title">
          <span>⚡</span>
          <span>SmartDesk</span>
        </div>

        {/* Connection status pill */}
        <button
          className={`badge ${isConnected ? 'badge-success' : isConnecting ? 'badge-warning' : 'badge-danger'}`}
          onClick={isConnected ? onDisconnect : onConnect}
          title={isConnected ? 'Click to disconnect' : 'Click to connect'}
        >
          ● {isConnecting ? 'Pairing...' : isConnected ? (deviceName || 'Connected') : 'Disconnected'}
        </button>

        {/* Demo Mode Badge */}
        <button
          className={`badge ${isDemo ? 'badge-info' : ''}`}
          onClick={onToggleDemo}
          style={{ cursor: 'pointer', opacity: isDemo ? 1 : 0.6 }}
          title="Toggle browser-side hardware simulator"
        >
          {isDemo ? '🧪 DEMO ACTIVE' : 'Demo Mode'}
        </button>
      </div>

      <div className="app-header-right">
        {/* Role toggle: Display vs Remote */}
        <button
          className="btn btn-secondary"
          onClick={onToggleRole}
          style={{ height: '36px', minHeight: '36px', padding: '0 10px', fontSize: '0.85rem' }}
          title="Switch Display / Remote mode"
        >
          {clientRole === 'display' ? '🖥️ Display' : '📱 Remote'}
        </button>

        {/* Theme toggle */}
        <button
          className="btn btn-secondary btn-icon"
          onClick={onToggleTheme}
          style={{ width: '36px', height: '36px', minHeight: '36px' }}
          title={`Current theme: ${theme}. Click to switch`}
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌌'}
        </button>
      </div>
    </header>
  );
}

