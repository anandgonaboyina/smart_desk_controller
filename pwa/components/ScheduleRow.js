/**
 * ScheduleRow.js — Time-of-day scheduled action card.
 *
 * Purpose : Presents relay schedule times, weekday pills, and enable toggle.
 * Depends : React, pure/schedule-format.js.
 * Used by : SchedulesScreen.js, dev-preview.
 */

"use client";

import React from 'react';
import { formatWeekdayMask, formatTime } from '../lib/pure/schedule-format.js';

export default function ScheduleRow({
  schedule,
  relayName = 'Relay',
  onToggleEnabled,
  onDelete,
}) {
  const { onHour, onMin, offHour, offMin, weekdayMask, enabled } = schedule;

  return (
    <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{relayName}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
          {onHour !== 0xFF && <span>ON {formatTime(onHour, onMin)} </span>}
          {offHour !== 0xFF && <span>OFF {formatTime(offHour, offMin)}</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          📅 {formatWeekdayMask(weekdayMask)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label className="toggle-label">
          <input
            type="checkbox"
            className="toggle-input"
            checked={Boolean(enabled)}
            onChange={(e) => onToggleEnabled && onToggleEnabled(schedule.index, e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>

        {onDelete && (
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => onDelete(schedule.index)}
            style={{ width: '36px', height: '36px', minHeight: '36px' }}
            title="Delete schedule"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

