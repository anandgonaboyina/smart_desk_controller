/**
 * StatusBar.js — Compact telemetry status indicator bar.
 *
 * Purpose : Presents uptime, free heap memory, away lock state, and active call indicator.
 * Depends : React only.
 * Used by : DisplayScreen.js, RemoteScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function StatusBar({
  isConnected = false,
  uptimeSec = 0,
  freeHeap = 0,
  isAway = false,
  isCallMode = false,
  activeClientCount = 1,
}) {
  const formatUptime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  const heapKb = Math.round(freeHeap / 1024);

  return (
    <div className="display-bottom-status">
      <span>⏱️ Uptime: {formatUptime(uptimeSec)}</span>
      {freeHeap > 0 && <span>💾 Heap: {heapKb} KB</span>}
      <span>📡 Clients: {activeClientCount}</span>

      {isAway && (
        <span className="badge badge-warning">
          🔒 AWAY LOCK
        </span>
      )}

      {isCallMode && (
        <span className="badge badge-danger">
          🔴 IN CALL
        </span>
      )}
    </div>
  );
}
