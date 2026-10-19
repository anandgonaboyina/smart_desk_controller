/**
 * LogConsole.js — Real-time firmware log viewer and diagnostic monitor.
 *
 * Purpose : Presents live BLE/UART log lines with level/tag filtering, copy, pause, and controls.
 * Depends : React only.
 * Used by : DiagnosticsPanel.js, SystemScreen.js, dev-preview.
 */

"use client";

import React, { useRef, useEffect } from 'react';

const MODULE_TAGS = ['ALL', 'RELAY', 'BLE', 'SCHED', 'LED', 'MUSIC', 'HID', 'FEAT', 'SYS', 'NVS', 'TEST'];
const LEVELS = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

export default function LogConsole({
  filteredLogs = [],
  isPaused = false,
  levelFilter = 'ALL',
  tagFilter = 'ALL',
  isDemo = false,
  logLevel = 3,
  logEnabled = true,
  onTogglePause,
  onClear,
  onCopy,
  onSetLevelFilter,
  onSetTagFilter,
  onSetLogLevel,
  onSetLogEnabled,
}) {
  const terminalRef = useRef(null);

  // Auto-scroll to bottom if not paused
  useEffect(() => {
    if (!isPaused && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [filteredLogs, isPaused]);

  return (
    <div className="card" style={{ padding: '14px' }}>
      {/* Banner for Demo Mode */}
      {isDemo && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '10px',
        }}>
          🧪 Demo mode: simulated logs
        </div>
      )}

      {/* Controls Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
        <select
          value={levelFilter}
          onChange={(e) => onSetLevelFilter && onSetLevelFilter(e.target.value)}
          style={{ height: '36px', minHeight: '36px', padding: '0 8px', fontSize: '0.85rem' }}
        >
          {LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{lvl === 'ALL' ? 'All Levels' : lvl}</option>
          ))}
        </select>

        <select
          value={tagFilter}
          onChange={(e) => onSetTagFilter && onSetTagFilter(e.target.value)}
          style={{ height: '36px', minHeight: '36px', padding: '0 8px', fontSize: '0.85rem' }}
        >
          {MODULE_TAGS.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All Modules' : t}</option>
          ))}
        </select>

        <button
          className="btn btn-secondary"
          onClick={onTogglePause}
          style={{ height: '36px', minHeight: '36px', padding: '0 10px', fontSize: '0.85rem' }}
        >
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={onCopy}
          style={{ height: '36px', minHeight: '36px', padding: '0 10px', fontSize: '0.85rem' }}
        >
          📋 Copy
        </button>

        <button
          className="btn btn-secondary"
          onClick={onClear}
          style={{ height: '36px', minHeight: '36px', padding: '0 10px', fontSize: '0.85rem' }}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        style={{
          height: '240px',
          background: '#040711',
          borderRadius: 'var(--radius-md)',
          padding: '10px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          lineHeight: 1.45,
          color: '#cbd5e1',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {filteredLogs.map((l, i) => {
          const color = l.level === 'ERROR' ? '#f87171' : l.level === 'WARN' ? '#fbbf24' : l.level === 'DEBUG' ? '#94a3b8' : '#38bdf8';
          return (
            <div key={i} style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: '#64748b' }}>[{l.time}] </span>
              <span style={{ color, fontWeight: 600 }}>[{l.level}] </span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>[{l.tag}] </span>
              <span>{l.text}</span>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div style={{ color: '#64748b', fontStyle: 'italic', padding: '8px' }}>
            No logs captured yet. Check that logging is enabled.
          </div>
        )}
      </div>
    </div>
  );
}

