/**
 * FaceSvg.js — Borderless procedural SVG Robot Face.
 *
 * Purpose : Renders borderless expressive eyes and mouth with mood glows,
 *           blushing cheeks, crazy eyes, breathing offset, and blinking.
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
  breathingOffset = 0,
  size = 320,
}) {
  const p = params || getExpression(expression);
  const currentEyeScaleY = isBlinking ? 0.08 : p.eyeScaleY;
  const leftTilt = p.eyeTiltDeg;
  const rightTilt = -p.eyeTiltDeg;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{
        maxWidth: '100%',
        height: 'auto',
        transform: `translateY(${breathingOffset}px)`,
        transition: 'transform 80ms ease-out',
        filter: `drop-shadow(0 0 28px ${p.glow})`,
        overflow: 'visible',
      }}
    >
      {/* Blushing Cheeks (for SHY and BLUSH / BLESH) */}
      {p.hasBlush && (
        <g opacity="0.85">
          <ellipse cx="44" cy="108" rx="16" ry="9" fill={p.blushColor} style={{ filter: 'blur(3px)' }} />
          <ellipse cx="156" cy="108" rx="16" ry="9" fill={p.blushColor} style={{ filter: 'blur(3px)' }} />
        </g>
      )}

      {/* Left Eye */}
      <g
        transform={`translate(60, 80) rotate(${leftTilt}) scale(${p.isCrazyEyes ? 1.2 : 1}, ${p.isCrazyEyes ? currentEyeScaleY * 1.3 : currentEyeScaleY}) translate(-60, -80)`}
      >
        <rect
          x={60 - p.eyeWidth / 2}
          y={80 - p.eyeHeight / 2}
          width={p.eyeWidth}
          height={p.eyeHeight}
          rx={p.eyeRadius}
          fill={p.color}
        />
        {p.isCrazyEyes && <circle cx="60" cy="80" r="5" fill="#000" />}
      </g>

      {/* Right Eye */}
      <g
        transform={`translate(140, 80) rotate(${p.isCrazyEyes ? 25 : rightTilt}) scale(${p.isCrazyEyes ? 0.85 : 1}, ${p.isCrazyEyes ? currentEyeScaleY * 0.75 : currentEyeScaleY}) translate(-140, -80)`}
      >
        <rect
          x={140 - p.eyeWidth / 2}
          y={80 - p.eyeHeight / 2}
          width={p.eyeWidth}
          height={p.eyeHeight}
          rx={p.eyeRadius}
          fill={p.color}
        />
        {p.isCrazyEyes && <circle cx="140" cy="80" r="4" fill="#000" />}
      </g>

      {/* Expressive Mouth */}
      <path
        d={p.mouthPath}
        fill={p.isCrazyEyes ? p.color : 'none'}
        stroke={p.color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
