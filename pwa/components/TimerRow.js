/**
 * TimerRow.js — Relay countdown timer controller with quick preset buttons.
 *
 * Purpose : Presents countdown clock and one-touch timer duration presets (15m, 30m, 45m, 60m).
 * Depends : React only.
 * Used by : RelayCard.js, dev-preview.
 */

"use client";

import React from 'react';

const PRESETS = [15, 30, 45, 60];

export default function TimerRow({
  relayIndex = 0,
  relayName = 'Relay',
  timer = { active: false, remainingSec: 0, formatted: '00:00' },
  onStart,
  onCancel,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>{relayName}</span>
        {timer.active ? (
          <span className="badge badge-info" style={{ fontSize: '0.9rem' }}>
            ⏱️ {timer.formatted}
          </span>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No timer</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {PRESETS.map((min) => (
          <button
            key={min}
            className="btn btn-secondary"
            onClick={() => onStart && onStart(relayIndex, min)}
            style={{ height: '36px', minHeight: '36px', padding: '0 12px', fontSize: '0.85rem' }}
          >
            +{min}m
          </button>
        ))}

        {timer.active && (
          <button
            className="btn btn-danger"
            onClick={() => onCancel && onCancel(relayIndex)}
            style={{ height: '36px', minHeight: '36px', padding: '0 12px', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
