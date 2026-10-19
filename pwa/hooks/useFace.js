/**
 * useFace.js — React hook for Robot Face expressions, breathing, and captions.
 *
 * Purpose : Subscribes to face mood and caption events, animates natural
 *           blinking and breathing cycles, and returns geometry parameters.
 * Depends : React, bus.js, pure/rules-match.js, face.js.
 * Used by : DisplayScreen.js, FaceSvg.js, CaptionBar.js.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import bus from '../lib/bus.js';
import { getExpression, getBreathingOffset } from '../lib/face.js';

export function useFace() {
  const [expressionName, setExpressionName] = useState('NEUTRAL');
  const [caption, setCaption] = useState('Desk standing by');
  const [isBlinking, setIsBlinking] = useState(false);
  const [breathingOffset, setBreathingOffset] = useState(0);

  const captionTimerRef = useRef(null);

  useEffect(() => {
    const unsubFace = bus.on('face:expression', (expr) => {
      if (expr) setExpressionName(expr);
    });

    const unsubCaption = bus.on('caption:show', (payload) => {
      if (!payload) return;
      const text = typeof payload === 'string' ? payload : payload.text;
      const durationMs = payload.durationMs || 3500;

      setCaption(text);
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
      captionTimerRef.current = setTimeout(() => {
        setCaption('Desk standing by');
      }, durationMs);
    });

    // 1. Natural Blinking Loop (every 3.8s, blink for 140ms)
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3800);

    // 2. Breathing Oscillation Loop (smooth requestAnimationFrame or 30ms interval)
    const breathInterval = setInterval(() => {
      setBreathingOffset(getBreathingOffset(performance.now()));
    }, 40);

    return () => {
      unsubFace();
      unsubCaption();
      clearInterval(blinkInterval);
      clearInterval(breathInterval);
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, []);

  const setExpression = useCallback((name) => {
    setExpressionName(name);
  }, []);

  const showCaption = useCallback((text, durationMs = 3500) => {
    bus.emit('caption:show', { text, durationMs });
  }, []);

  const currentParams = getExpression(expressionName);

  return {
    expressionName,
    currentParams,
    caption,
    isBlinking,
    breathingOffset,
    setExpression,
    showCaption,
  };
}

export default useFace;

