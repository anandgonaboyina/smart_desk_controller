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

export default function RelayCard(props) {
  const channel = props.channel || {
    index: props.index ?? 0,
    load: props.load ?? 0,
    coil: props.coil ?? 0,
    gpioLevel: props.gpioLevel ?? 0,
    config: props.config || {
      name: props.name || `Relay ${(props.index ?? 0) + 1}`,
      icon: props.icon || '⚡',
      gpioPin: props.gpioPin ?? (4 + (props.index ?? 0)),
    },
  };
  const { timer, isLockedByAway = false, onToggle, onSettingsClick, onTimerClick } = props;
  const { index, load, coil, gpioLevel, config = {} } = channel;
  const isLoadOn = Boolean(load);

  const handleCardClick = (e) => {
    // Prevent toggle if clicking on specific buttons (Timer / Settings)
    if (e.target.closest('button')) return;
    if (!isLockedByAway && onToggle) {
      onToggle(index);
    }
  };

  return (
    <div
      className={`card relay-card remote-relay-pad ${isLoadOn ? 'load-on' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: isLockedByAway ? 'not-allowed' : 'pointer', userSelect: 'none' }}
    >
      <div className="relay-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={`relay-status-indicator ${isLoadOn ? 'active' : ''}`}>
            <span style={{ fontSize: '1.4rem' }}>{config.icon || '⚡'}</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="channel-tag">CH {index + 1}</span>
              <span className="card-title" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                {config.name || `Relay ${index + 1}`}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Coil: <strong style={{ color: coil ? '#34d399' : 'inherit' }}>{coil ? 'ON' : 'OFF'}</strong> • GPIO{config.gpioPin}: {gpioLevel ? 'HIGH' : 'LOW'}
            </div>
          </div>
        </div>

        {/* Tactile Big Power Button */}
        <button
          className={`relay-power-btn ${isLoadOn ? 'btn-power-on' : 'btn-power-off'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLockedByAway && onToggle) onToggle(index);
          }}
          disabled={isLockedByAway}
          title={isLockedByAway ? 'Locked by Away mode' : isLoadOn ? 'Click to Turn OFF' : 'Click to Turn ON'}
        >
          <span className="power-icon">⏻</span>
          <span className="power-label">{isLoadOn ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Badges line: Away lock & Active timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
        {isLockedByAway && (
          <span className="badge badge-warning">🛡️ Away Locked</span>
        )}

        {timer && timer.active && (
          <span className="badge badge-info" onClick={(e) => { e.stopPropagation(); onTimerClick && onTimerClick(index); }} style={{ cursor: 'pointer' }}>
            ⏱️ {timer.formatted || 'Active'}
          </span>
        )}

        {config.affectedByAway ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🛡️ Away Guard
          </span>
        ) : null}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {onTimerClick && (
            <button
              className="btn btn-secondary"
              onClick={(e) => { e.stopPropagation(); onTimerClick(index); }}
              style={{ height: '30px', minHeight: '30px', padding: '0 8px', fontSize: '0.78rem' }}
            >
              ⏱️ Timer
            </button>
          )}
          {onSettingsClick && (
            <button
              className="btn btn-secondary btn-icon"
              onClick={(e) => { e.stopPropagation(); onSettingsClick(index); }}
              style={{ width: '30px', height: '30px', minHeight: '30px', fontSize: '0.8rem' }}
              title="Configure Relay"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

