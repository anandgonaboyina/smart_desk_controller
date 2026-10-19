/**
 * AwayScreen.js — Desk lockdown and energy saving Away mode screen.
 *
 * Purpose : Arm or disarm Away mode, display countdown delays, and enforce relay lockouts.
 * Depends : React, useAway.js, useRelays.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import useAway from '../hooks/useAway.js';
import useRelays from '../hooks/useRelays.js';

export function AwayScreen() {
  const { isIdle, isCountdown, isActive, remainingDelay, elapsedMin, delaySec, activateAway, cancelAway, endAway } = useAway();
  const { channels } = useRelays();

  const affectedChannels = channels.filter((c) => Boolean(c.config.affectedByAway));

  return (
    <div className="away-screen-container">
      <h1 className="screen-title">Away Mode</h1>

      <div className={`card-box away-status-card ${isActive ? 'status-armed' : isCountdown ? 'status-countdown' : 'status-idle'}`}>
        <div className="status-header">
          <span className="status-icon">{isActive ? '🔒' : isCountdown ? '⏳' : '🏠'}</span>
          <div>
            <h2 className="status-title">
              {isActive ? 'Away Mode ARMED' : isCountdown ? 'Arming Countdown...' : 'Desk Disarmed (At Desk)'}
            </h2>
            <p className="status-sub">
              {isActive
                ? `Locked out for ${elapsedMin} minutes. Non-essential appliances unpowered.`
                : isCountdown
                ? `Arming in ${remainingDelay}s. Leave desk area.`
                : `Normal desk operation. Normal schedules active.`}
            </p>
          </div>
        </div>

        <div className="card-actions-row" style={{ marginTop: '16px' }}>
          {isIdle && (
            <button className="btn btn-primary" onClick={activateAway} style={{ width: '100%', height: '48px' }}>
              Arm Away Mode ({delaySec}s Delay)
            </button>
          )}

          {isCountdown && (
            <button className="btn btn-danger" onClick={cancelAway} style={{ width: '100%', height: '48px' }}>
              Cancel Countdown
            </button>
          )}

          {isActive && (
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button className="btn btn-primary" onClick={() => endAway(true)} style={{ flex: 1, height: '48px' }}>
                I'm Back (Restore State)
              </button>
              <button className="btn btn-secondary" onClick={() => endAway(false)} style={{ flex: 1, height: '48px' }}>
                Disarm (Keep Off)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card-box" style={{ marginTop: '20px' }}>
        <h2 className="section-title">Protected Relays</h2>
        <p className="form-description" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          The following appliances are automatically powered down while Away is active:
        </p>
        <div className="affected-list" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {affectedChannels.map((ch) => (
            <div key={ch.index} className="affected-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔌</span>
              <span style={{ fontWeight: 500 }}>{ch.config.name}</span>
              <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>Auto-OFF</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AwayScreen;
