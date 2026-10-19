/**
 * SchedulesScreen.js — Schedules and countdown timers screen.
 *
 * Purpose : Configures time-of-day relay automation and displays active countdown timers.
 * Depends : React, useTimers.js, useRelays.js, TimerRow.js, ScheduleRow.js, EmptyState.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState } from 'react';
import useTimers from '../hooks/useTimers.js';
import useRelays from '../hooks/useRelays.js';
import TimerRow from '../components/TimerRow.js';
import ScheduleRow from '../components/ScheduleRow.js';
import EmptyState from '../components/EmptyState.js';

export function SchedulesScreen() {
  const { channels } = useRelays();
  const { getTimer, startTimer, cancelTimer } = useTimers();

  // Initial mock schedule state
  const [schedules, setSchedules] = useState([
    { index: 0, relayIndex: 0, onHour: 9, onMin: 0, offHour: 18, offMin: 0, weekdayMask: 0x3E, enabled: true },
    { index: 1, relayIndex: 1, onHour: 8, onMin: 30, offHour: 22, offMin: 0, weekdayMask: 0x7F, enabled: true },
  ]);

  const handleToggleSchedule = (idx, enabled) => {
    setSchedules((prev) => prev.map((s) => (s.index === idx ? { ...s, enabled } : s)));
  };

  const handleDeleteSchedule = (idx) => {
    setSchedules((prev) => prev.filter((s) => s.index !== idx));
  };

  return (
    <div className="schedules-screen-container">
      <h1 className="screen-title">Automation & Timers</h1>

      <section className="timers-section card-box">
        <h2 className="section-title">Active Countdown Timers</h2>
        <div className="timers-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {channels.map((ch) => (
            <TimerRow
              key={ch.index}
              relayIndex={ch.index}
              relayName={ch.config.name}
              timer={getTimer(ch.index)}
              onStart={startTimer}
              onCancel={cancelTimer}
            />
          ))}
        </div>
      </section>

      <section className="schedules-section card-box" style={{ marginTop: '20px' }}>
        <h2 className="section-title">Time-of-Day Schedules</h2>
        {schedules.length === 0 ? (
          <EmptyState title="No Schedules Configured" message="Add automated on/off schedules to automate your desk." />
        ) : (
          <div className="schedules-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {schedules.map((sched) => (
              <ScheduleRow
                key={sched.index}
                schedule={sched}
                relayName={channels[sched.relayIndex]?.config?.name || `Relay ${sched.relayIndex + 1}`}
                onToggleEnabled={handleToggleSchedule}
                onDelete={handleDeleteSchedule}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SchedulesScreen;
