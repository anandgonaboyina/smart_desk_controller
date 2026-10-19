/**
 * BootAnimPicker.js — 10 Power-On Boot & Shutdown RGB Animation Selector.
 *
 * Purpose : Select from 10 boot/shutdown transitions (sweep, expand, fade, rainbow, scanner, etc.)
 *           with live interactive preview test buttons and power-on behavior config.
 * Depends : React, pure/color-math.js.
 * Used by : LedScreen.js.
 */

"use client";

import React, { useState } from 'react';
import { BOOT_ANIMATIONS } from '../lib/pure/color-math.js';

export default function BootAnimPicker({
  selectedAnimId = 0,
  bootBehavior = 0,
  onSelectAnim,
  onSelectBehavior,
  onTestAnimation,
}) {
  const [activeTestId, setActiveTestId] = useState(null);

  const handleTest = (animId) => {
    setActiveTestId(animId);
    if (onTestAnimation) onTestAnimation(animId);
    const meta = BOOT_ANIMATIONS.find((a) => a.id === animId);
    setTimeout(() => setActiveTestId(null), (meta?.durationMs || 1500) + 200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Power-On Boot Behavior */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
          Power-On Boot Behavior
        </label>
        <select
          className="input-select"
          value={bootBehavior}
          onChange={(e) => onSelectBehavior && onSelectBehavior(Number(e.target.value))}
          style={{ width: '100%', height: '42px' }}
        >
          <option value={0}>Restore Last Saved State</option>
          <option value={1}>Turn Off on Startup</option>
          <option value={2}>Default Warm White Ambient</option>
        </select>
      </div>

      {/* 10 Boot / Shutdown Transition Animations */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
          Boot & Shutdown RGB Animation (10 Styles)
        </label>
        <select
          className="input-select"
          value={selectedAnimId}
          onChange={(e) => onSelectAnim && onSelectAnim(Number(e.target.value))}
          style={{ width: '100%', height: '42px' }}
        >
          {BOOT_ANIMATIONS.map((anim) => (
            <option key={anim.id} value={anim.id}>
              {anim.id + 1}. {anim.label} ({anim.type.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {/* Interactive Animation Test Buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={() => handleTest(selectedAnimId)}
          disabled={activeTestId !== null}
          style={{ flex: 1, minWidth: '150px' }}
        >
          {activeTestId === selectedAnimId ? 'Playing Preview...' : '▶️ Test Selected Animation'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => handleTest(5)} // ID 5: Smooth Fade-Out
          disabled={activeTestId !== null}
          style={{ flex: 1, minWidth: '150px' }}
        >
          {activeTestId === 5 ? 'Playing Shutdown...' : '⏹️ Test Shutdown Fade'}
        </button>
      </div>
    </div>
  );
}
