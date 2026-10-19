/**
 * page.js — Main App Router root page for SmartDesk PWA.
 *
 * Purpose : Application shell with mode switching, left sidebar navigation (desktop),
 *           bottom tab bar (mobile), and Ctrl+K command palette launcher.
 * Depends : React, hooks, screens, components.
 * Used by : Next.js App Router (/).
 */

"use client";

import { useState, useEffect } from 'react';
import useBle from '../hooks/useBle.js';
import useSettings from '../hooks/useSettings.js';
import Header from '../components/Header.js';
import CommandPalette from '../components/CommandPalette.js';
import Toast from '../components/Toast.js';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';

// Screens
import DisplayScreen from '../screens/DisplayScreen.js';
import RemoteScreen from '../screens/RemoteScreen.js';
import RelaySettingsScreen from '../screens/RelaySettingsScreen.js';
import LedScreen from '../screens/LedScreen.js';
import SchedulesScreen from '../screens/SchedulesScreen.js';
import AwayScreen from '../screens/AwayScreen.js';
import UnlockScreen from '../screens/UnlockScreen.js';
import FeaturesScreen from '../screens/FeaturesScreen.js';
import SystemScreen from '../screens/SystemScreen.js';
import DiagnosticsScreen from '../screens/DiagnosticsScreen.js';
import SettingsScreen from '../screens/SettingsScreen.js';

const NAV_ITEMS = [
  { id: 'remote', label: 'Remote', icon: '📱' },
  { id: 'relays', label: 'Relays', icon: '⚡' },
  { id: 'leds', label: 'Lighting', icon: '💡' },
  { id: 'schedules', label: 'Schedules', icon: '📅' },
  { id: 'away', label: 'Away Mode', icon: '🚶' },
  { id: 'unlock', label: 'PC Unlock', icon: '🔓' },
  { id: 'features', label: 'Features', icon: '🧩' },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🔍' },
  { id: 'system', label: 'System', icon: '🛠️' },
  { id: 'settings', label: 'Preferences', icon: '⚙️' },
  { id: 'display', label: 'Desk Face', icon: '🖥️' },
];

export default function SmartDeskApp() {
  const { isConnected, isConnecting, deviceName, isDemo, connect, disconnect, toggleDemo } = useBle();
  const { theme, setTheme, clientRole, setClientRole } = useSettings();
  const [activeScreen, setActiveScreen] = useState('remote');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const unsubToast = bus.on('system:toast', (t) => {
      setToast(t);
      setTimeout(() => setToast(null), 4000);
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubToast();
    };
  }, []);

  const handlePaletteCommand = (cmdId) => {
    switch (cmdId) {
      case 'all_off': ble.sendSystemCmd(0x0B); break;
      case 'safe_state': ble.sendSystemCmd(0x0C); break;
      case 'selftest': setActiveScreen('diagnostics'); ble.runSelfTest(); break;
      case 'toggle_demo': toggleDemo(); break;
      case 'toggle_theme': setTheme(theme === 'dark' ? 'light' : 'dark'); break;
      default: break;
    }
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'display': return <DisplayScreen />;
      case 'relays': return <RelaySettingsScreen />;
      case 'leds': return <LedScreen />;
      case 'schedules': return <SchedulesScreen />;
      case 'away': return <AwayScreen />;
      case 'unlock': return <UnlockScreen />;
      case 'features': return <FeaturesScreen />;
      case 'diagnostics': return <DiagnosticsScreen />;
      case 'system': return <SystemScreen />;
      case 'settings': return <SettingsScreen />;
      case 'remote':
      default: return <RemoteScreen />;
    }
  };

  return (
    <div className="smart-desk-app">
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
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onToggleRole={() => {
          const next = clientRole === 'display' ? 'remote' : 'display';
          setClientRole(next);
          setActiveScreen(next === 'display' ? 'display' : 'remote');
        }}
      />

      <div className="shell-container">
        <aside className="shell-sidebar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`shell-nav-item ${activeScreen === item.id ? 'active' : ''}`}
              onClick={() => setActiveScreen(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <main className="shell-main-content">
          {renderActiveScreen()}
        </main>
      </div>

      <nav className="mobile-bottom-tabs">
        <button className={`mobile-tab-btn ${activeScreen === 'remote' ? 'active' : ''}`} onClick={() => setActiveScreen('remote')}>
          <span>📱</span><span>Remote</span>
        </button>
        <button className={`mobile-tab-btn ${activeScreen === 'relays' ? 'active' : ''}`} onClick={() => setActiveScreen('relays')}>
          <span>⚡</span><span>Relays</span>
        </button>
        <button className={`mobile-tab-btn ${activeScreen === 'leds' ? 'active' : ''}`} onClick={() => setActiveScreen('leds')}>
          <span>💡</span><span>LEDs</span>
        </button>
        <button className={`mobile-tab-btn ${activeScreen === 'schedules' ? 'active' : ''}`} onClick={() => setActiveScreen('schedules')}>
          <span>📅</span><span>Sched</span>
        </button>
        <button className={`mobile-tab-btn ${['away', 'unlock', 'features', 'diagnostics', 'system', 'settings', 'display'].includes(activeScreen) ? 'active' : ''}`} onClick={() => setActiveScreen('diagnostics')}>
          <span>🔍</span><span>Diag</span>
        </button>
      </nav>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onExecuteCommand={handlePaletteCommand}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
