/**
 * DisplayScreen.js — Fullscreen desk companion display screen.
 *
 * Purpose : Renders animated robot desk face, live digital clock, and transient speech captions.
 * Depends : React, useFace.js, useBle.js, FaceSvg.js, CaptionBar.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import { useState, useEffect } from 'react';
import useFace from '../hooks/useFace.js';
import useBle from '../hooks/useBle.js';
import FaceSvg from '../components/FaceSvg.js';
import CaptionBar from '../components/CaptionBar.js';

export function DisplayScreen() {
  const { expression, caption, isTalking } = useFace();
  const { isConnected, isDemo } = useBle();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="display-screen-container">
      <div className="display-screen-header">
        <div className="display-clock">{timeStr || '--:--:--'}</div>
        <div className={`display-status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot" />
          <span>{isConnected ? (isDemo ? 'Demo Mode' : 'Connected') : 'Offline'}</span>
        </div>
      </div>

      <main className="display-face-area">
        <div className="face-wrapper">
          <FaceSvg expression={expression} isTalking={isTalking} size={300} />
        </div>
      </main>

      <footer className="display-caption-area">
        <CaptionBar text={caption} />
      </footer>
    </div>
  );
}

export default DisplayScreen;

