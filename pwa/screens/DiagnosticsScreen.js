/**
 * DiagnosticsScreen.js — Device logs and hardware self-test diagnostic screen.
 *
 * Purpose : Live BLE log streaming, self-test runner, and simulated mode banner.
 * Depends : React, useDiagnostics.js, useBleLog.js, useBle.js, LogConsole.js, DiagnosticsPanel.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import useDiagnostics from '../hooks/useDiagnostics.js';
import useBleLog from '../hooks/useBleLog.js';
import useBle from '../hooks/useBle.js';
import LogConsole from '../components/LogConsole.js';
import DiagnosticsPanel from '../components/DiagnosticsPanel.js';

export function DiagnosticsScreen() {
  const { isDemo } = useBle();
  const { isRunning, testResults, logLevel, logEnabled, runSelfTest, updateLogLevel, updateLogEnabled } = useDiagnostics();
  const { logs, isPaused, togglePause, clearLogs, copyLogs, setModuleFilter, setLevelFilter } = useBleLog();

  return (
    <div className="diagnostics-screen-container">
      <h1 className="screen-title">Diagnostics & Telemetry</h1>

      {isDemo && (
        <div className="demo-banner-box" style={{ background: '#3b82f620', border: '1px solid #3b82f6', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>ℹ️ Demo Mode: Simulated Logs & Self-Test</span>
        </div>
      )}

      <div className="card-box" style={{ marginBottom: '20px' }}>
        <h2 className="section-title">Hardware Boot Self-Test</h2>
        <DiagnosticsPanel
          isRunning={isRunning}
          results={testResults}
          onRunTest={runSelfTest}
        />
      </div>

      <div className="card-box" style={{ marginBottom: '20px' }}>
        <h2 className="section-title">Logging Configuration</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Logging Enabled:</span>
            <input
              type="checkbox"
              className="toggle-input"
              checked={logEnabled}
              onChange={(e) => updateLogEnabled(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="form-label">Log Level:</label>
            <select
              className="input-select"
              value={logLevel}
              onChange={(e) => updateLogLevel(Number(e.target.value))}
            >
              <option value={1}>ERROR</option>
              <option value={2}>WARN</option>
              <option value={3}>INFO</option>
              <option value={4}>DEBUG</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card-box log-console-card">
        <h2 className="section-title">Live Device Log (BLE Ring Buffer)</h2>
        <LogConsole
          logs={logs}
          isPaused={isPaused}
          onTogglePause={togglePause}
          onClear={clearLogs}
          onCopy={copyLogs}
          onFilterModule={setModuleFilter}
          onFilterLevel={setLevelFilter}
        />
      </div>
    </div>
  );
}

export default DiagnosticsScreen;

