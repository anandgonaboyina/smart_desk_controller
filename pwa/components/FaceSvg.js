/**
 * FaceSvg.js — Borderless living procedural SVG Robot Face.
 *
 * Purpose : Renders living animated eyes that change shape, morph, blink,
 *           shift gaze, and an expressive glowing mouth with zero borders.
 * Depends : React, face.js.
 * Used by : DisplayScreen.js, dev-preview.
 */

"use client";

import React from 'react';
import { getExpression } from '../lib/face.js';

export default function FaceSvg({
  params,
  expression = 'NEUTRAL',
  isBlinking = false,
  isLeftWink = false,
  isRightWink = false,
  breathingOffset = 0,
  gaze = { x: 0, y: 0 },
  eyePulse = 1,
  size = 320,
}) {
  const p = params || getExpression(expression);

  // Calculate eye scale with wink & blink states
  const leftBlink = isBlinking || isLeftWink;
  const rightBlink = isBlinking || isRightWink;

  const leftScaleY = leftBlink ? 0.08 : (p.eyeScaleY * eyePulse);
  const leftScaleX = leftBlink ? 1.05 : (1 * eyePulse);

  const rightScaleY = rightBlink ? 0.08 : (p.eyeScaleY * eyePulse);
  const rightScaleX = rightBlink ? 1.05 : (1 * eyePulse);

  const leftTilt = p.eyeTiltDeg || 0;
  const rightTilt = -(p.eyeTiltDeg || 0);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{
        maxWidth: '100%',
        height: 'auto',
        overflow: 'visible',
        transform: `translateY(${breathingOffset}px)`,
        transition: 'transform 120ms ease-out',
        filter: `drop-shadow(0 0 28px ${p.glow || p.color})`,
      }}
    >
      {/* Eyes Group with Living Micro-Gaze Transition */}
      <g
        style={{
          transform: `translate(${gaze.x}px, ${gaze.y}px)`,
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.3, 1)',
        }}
      >
        {/* Left Eye — Pure Rounded Morphing Pill */}
        <g
          transform={`translate(62, 78) rotate(${leftTilt}) scale(${leftScaleX}, ${leftScaleY}) translate(-62, -78)`}
          style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)' }}
        >
          <rect
            x={62 - p.eyeWidth / 2}
            y={78 - p.eyeHeight / 2}
            width={p.eyeWidth}
            height={p.eyeHeight}
            rx={leftBlink ? 3 : p.eyeRadius}
            ry={leftBlink ? 3 : p.eyeRadius}
            fill={p.color}
            style={{
              transition: 'fill 0.3s ease, rx 0.25s ease, ry 0.25s ease, width 0.25s ease, height 0.25s ease',
            }}
          />
        </g>

        {/* Right Eye — Pure Rounded Morphing Pill */}
        <g
          transform={`translate(138, 78) rotate(${rightTilt}) scale(${rightScaleX}, ${rightScaleY}) translate(-138, -78)`}
          style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)' }}
        >
          <rect
            x={138 - p.eyeWidth / 2}
            y={78 - p.eyeHeight / 2}
            width={p.eyeWidth}
            height={p.eyeHeight}
            rx={rightBlink ? 3 : p.eyeRadius}
            ry={rightBlink ? 3 : p.eyeRadius}
            fill={p.color}
            style={{
              transition: 'fill 0.3s ease, rx 0.25s ease, ry 0.25s ease, width 0.25s ease, height 0.25s ease',
            }}
          />
        </g>
      </g>

      {/* Expressive Mouth — Natural Glowing Curve with Breathing */}
      <path
        d={p.mouthPath || 'M 70,138 Q 100,150 130,138'}
        fill="none"
        stroke={p.color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'd 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), stroke 0.3s ease',
          transform: `translateY(${breathingOffset * 0.4}px)`,
        }}
      />
    </svg>
  );
}