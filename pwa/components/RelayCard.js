/**
 * RelayCard.js — Individual relay channel card with LOAD vs COIL telemetry.
 *
 * Purpose : Presentation card showing Load state, physical Coil state, electrical GPIO level,
 *           min switch cooldown indicator, and active timer countdown.
 * Depends : React only.
 * Used by : RemoteScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function RelayCard({
  channel,
  timer,
  isLockedByAway = false,
  onToggle,
  onSettingsClick,
  onTimerClick,
}) {
  const { index, load, coil, gpioLevel, config } = channel;
  const isLoadOn = Boolean(load);

  return (
    <div className={`card relay-card ${isLoadOn ? 'load-on' : ''}`}>
      <div className="relay-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="relay-icon">{config.icon || '⚡'}</span>
          <div>
            <div className="card-title" style={{ fontSize: '1.05rem' }}>
              {config.name || `Relay ${index + 1}`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Coil: {coil ? 'ENERGIZED' : 'OFF'} • GPIO{config.gpioPin}: {gpioLevel ? 'HIGH' : 'LOW'}
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <label className="toggle-label" title={isLockedByAway ? 'Locked by Away mode' : 'Toggle Load'}>
          <input
            type="checkbox"
            className="toggle-input"
            checked={isLoadOn}
            disabled={isLockedByAway}
            onChange={() => onToggle && onToggle(index)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {/* Badges line: Away lock & Active timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '24px' }}>
        {isLockedByAway && (
          <span className="badge badge-warning">Away Locked</span>
        )}

        {timer && timer.active && (
          <span className="badge badge-info" onClick={() => onTimerClick && onTimerClick(index)} style={{ cursor: 'pointer' }}>
            ⏱️ {timer.formatted || 'Active'}
          </span>
        )}

        {config.affectedByAway ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title="Turns off automatically when Away Mode is active">
            🛡️ Away Guard
          </span>
        ) : null}
      </div>

      {/* Actions footer */}
      <div className="relay-actions" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => onTimerClick && onTimerClick(index)}
          style={{ height: '36px', minHeight: '36px', padding: '0 12px', fontSize: '0.85rem' }}
        >
          ⏱️ Timer
        </button>

        <button
          className="btn btn-secondary btn-icon"
          onClick={() => onSettingsClick && onSettingsClick(index)}
          style={{ width: '36px', height: '36px', minHeight: '36px' }}
          title="Relay Settings (Pin, Polarity, Wiring)"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}

