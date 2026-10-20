/**
 * DisplayScreen.js — Fullscreen desk companion display screen.
 *
 * Purpose : Fullscreen borderless robot face (eyes and mouth only) with vertically
 *           centered side-by-side welcome text/captions, mood reactions, and a side toggle.
 * Depends : React, useFace.js, useBle.js, FaceSvg.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState, useEffect } from 'react';
import useFace from '../hooks/useFace.js';
import useBle from '../hooks/useBle.js';
import FaceSvg from '../components/FaceSvg.js';

const MOODS = [
  { id: 'HAPPY', label: 'Happy', icon: '😊' },
  { id: 'ANGER', label: 'Anger', icon: '😠' },
  { id: 'SHY', label: 'Shy', icon: '😳' },
  { id: 'BLUSH', label: 'Blush', icon: '🥰' },
  { id: 'CRAZY', label: 'Crazy', icon: '🤪' },
  { id: 'SLEEPY', label: 'Sleepy', icon: '🥱' },
  { id: 'NEUTRAL', label: 'Calm', icon: '🤖' },
];

export function DisplayScreen({ onSwitchToRemote }) {
  const {
    expressionName,
    currentParams,
    caption,
    isBlinking,
    isLeftWink,
    isRightWink,
    breathingOffset,
    gaze,
    eyePulse,
    setExpression,
  } = useFace();
  const { isConnected, isDemo, connect } = useBle();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fullscreen-face-viewport">
      {/* Side Toggle to Remote Mode */}
      <button
        className="face-side-toggle"
        onClick={onSwitchToRemote}
        title="Open Remote Control Dashboard"
        aria-label="Open Remote Control Dashboard"
      >
        <span className="toggle-icon">📱</span>
        <span className="toggle-label">Remote Mode →</span>
      </button>

      {/* Main Content: Face on Left, Vertically-Centered Text on Right */}
      <div className="face-layout-row">
        <div className="face-column">
          <FaceSvg
            params={currentParams}
            isBlinking={isBlinking}
            isLeftWink={isLeftWink}
            isRightWink={isRightWink}
            breathingOffset={breathingOffset}
            gaze={gaze}
            eyePulse={eyePulse}
            size={340}
          />
        </div>

        <div className="text-column">
          <div className="welcome-headline">Welcome Anand!</div>
          <div className="caption-text" style={{ color: currentParams.color }}>
            {caption || 'Desk companion active'}
          </div>
          <div className="clock-subrow">
            <span className="live-clock">{timeStr || '--:--'}</span>
            <span className="live-date">{dateStr}</span>
            <span
              className={`live-dot ${isConnected ? 'dot-active' : 'dot-idle'}`}
              onClick={!isConnected ? connect : undefined}
              style={{ cursor: !isConnected ? 'pointer' : 'default' }}
              title={!isConnected ? 'Click to connect SmartDesk' : undefined}
            >
              {isConnected ? (isDemo ? 'Demo Mode' : 'Connected') : 'Offline (Click to Connect)'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Reaction Test Bar */}
      <div className="mood-reactions-bar">
        {MOODS.map((m) => (
          <button
            key={m.id}
            className={`mood-btn ${expressionName === m.id ? 'active' : ''}`}
            onClick={() => setExpression(m.id)}
            style={{
              borderColor: expressionName === m.id ? currentParams.color : 'transparent',
            }}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default DisplayScreen;
