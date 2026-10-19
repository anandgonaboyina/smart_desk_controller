/**
 * useBleLog.js — React hook for live firmware log stream and filtering.
 *
 * Purpose : Subscribes to device log notifications over BLE/Demo, buffers lines,
 *           provides level and module filtering, copy-to-clipboard, and pause/resume.
 * Depends : React, bus.js.
 * Used by : LogConsole.js, DiagnosticsPanel.js, dev-preview.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import bus from '../lib/bus.js';

const MAX_BUFFERED_LOGS = 150;

export function useBleLog() {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [levelFilter, setLevelFilter] = useState('ALL'); // ALL, ERROR, WARN, INFO, DEBUG
  const [tagFilter, setTagFilter] = useState('ALL');

  useEffect(() => {
    const unsub = bus.on('ble:device_log', (line) => {
      if (isPaused || !line) return;

      // Parse structured line: "[ 12.345] [INFO] [RELAY] Desk Lamp ON"
      const match = line.match(/^\[\s*([0-9.]+)\s*\]\s*\[([A-Z]+)\]\s*\[([A-Z]+)\]\s*(.*)$/);
      const parsed = match ? {
        time: match[1],
        level: match[2],
        tag: match[3],
        text: match[4],
        raw: line,
      } : {
        time: '',
        level: 'INFO',
        tag: 'SYS',
        text: line,
        raw: line,
      };

      setLogs((prev) => {
        const next = [...prev, parsed];
        if (next.length > MAX_BUFFERED_LOGS) {
          return next.slice(next.length - MAX_BUFFERED_LOGS);
        }
        return next;
      });
    });

    return unsub;
  }, [isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const copyLogs = useCallback(async () => {
    const text = logs.map((l) => l.raw).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      bus.emit('system:toast', { message: 'Logs copied to clipboard', type: 'info' });
    }
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (levelFilter !== 'ALL' && l.level !== levelFilter) return false;
      if (tagFilter !== 'ALL' && l.tag !== tagFilter) return false;
      return true;
    });
  }, [logs, levelFilter, tagFilter]);

  return {
    logs,
    filteredLogs,
    isPaused,
    levelFilter,
    tagFilter,
    togglePause,
    clearLogs,
    copyLogs,
    setLevelFilter,
    setTagFilter,
  };
}

export default useBleLog;
