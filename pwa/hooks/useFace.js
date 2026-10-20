/**
 * useFace.js — React hook for Robot Face expressions, living animations, and gaze.
 *
 * Purpose : Continuous organic living animation loop (gaze shifts, natural micro-blinks,
 *           breathing eye-pulse, mouth micro-movement, mood transitions).
 * Depends : React, bus.js, face.js.
 * Used by : DisplayScreen.js, FaceSvg.js.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import bus from '../lib/bus.js';
import { getExpression, getBreathingOffset } from '../lib/face.js';

export function useFace() {
  const [expressionName, setExpressionName] = useState('NEUTRAL');
  const [caption, setCaption] = useState('Desk companion active');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isLeftWink, setIsLeftWink] = useState(false);
  const [isRightWink, setIsRightWink] = useState(false);
  const [breathingOffset, setBreathingOffset] = useState(0);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [eyePulse, setEyePulse] = useState(1);

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
        setCaption('Desk companion active');
      }, durationMs);
    });

    // 1. Living Organic Action Loop (Continuous Animation with Small Delays)
    let actionTimeout;
    const livingActions = [
      'IDLE_CENTER',
      'LOOK_LEFT',
      'LOOK_RIGHT',
      'LOOK_UP',
      'CUTE_SQUINT',
      'CUTE_TILT',
      'CURIOUS',
      'WINK_LEFT',
      'WINK_RIGHT',
      'BLINK',
    ];

    const runLivingAction = () => {
      const nextDelay = 1800 + Math.random() * 1600; // Small delay (1.8s - 3.4s)
      actionTimeout = setTimeout(() => {
        const action = livingActions[Math.floor(Math.random() * livingActions.length)];

        switch (action) {
          case 'LOOK_LEFT':
            setGaze({ x: -10, y: (Math.random() - 0.5) * 4 });
            break;
          case 'LOOK_RIGHT':
            setGaze({ x: 10, y: (Math.random() - 0.5) * 4 });
            break;
          case 'LOOK_UP':
            setGaze({ x: (Math.random() - 0.5) * 4, y: -6 });
            break;
          case 'CUTE_SQUINT':
            setEyePulse(0.85);
            setGaze({ x: 0, y: 1 });
            setTimeout(() => setEyePulse(1), 700);
            break;
          case 'CUTE_TILT':
            setGaze({ x: 6, y: -3 });
            setEyePulse(1.1);
            setTimeout(() => {
              setGaze({ x: 0, y: 0 });
              setEyePulse(1);
            }, 800);
            break;
          case 'CURIOUS':
            setEyePulse(1.2);
            setGaze({ x: 0, y: -4 });
            setTimeout(() => {
              setEyePulse(1);
              setGaze({ x: 0, y: 0 });
            }, 900);
            break;
          case 'WINK_LEFT':
            setIsLeftWink(true);
            setTimeout(() => setIsLeftWink(false), 240);
            break;
          case 'WINK_RIGHT':
            setIsRightWink(true);
            setTimeout(() => setIsRightWink(false), 240);
            break;
          case 'BLINK':
          default:
            setIsBlinking(true);
            setTimeout(() => {
              setIsBlinking(false);
              // Occasional playful double-blink
              if (Math.random() < 0.3) {
                setTimeout(() => {
                  setIsBlinking(true);
                  setTimeout(() => setIsBlinking(false), 110);
                }, 130);
              }
            }, 120);
            // Center gaze with smooth return
            setGaze({ x: 0, y: 0 });
            break;
        }

        runLivingAction();
      }, nextDelay);
    };

    runLivingAction();

    // 2. Continuous Smooth Breathing Loop
    const breathInterval = setInterval(() => {
      const now = performance.now();
      const offset = getBreathingOffset(now);
      setBreathingOffset(offset);
    }, 40);

    return () => {
      unsubFace();
      unsubCaption();
      clearTimeout(actionTimeout);
      clearInterval(breathInterval);
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, []);

  const setExpression = useCallback((name) => {
    setExpressionName(name);
  }, []);

  const currentParams = getExpression(expressionName);

  return {
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
  };
}

export default useFace;
