/**
 * FaceSvg.js — Procedural animated SVG Robot Face.
 *
 * Purpose : Renders eyes, mouth, breathing oscillations, and mood glows.
 * Depends : React only.
 * Used by : DisplayScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function FaceSvg({
  params = {
    eyeScaleY: 1.0,
    eyeHeight: 40,
    eyeWidth: 32,
    eyeRadius: 16,
    eyeTiltDeg: 0,
    mouthPath: 'M 70,140 Q 100,152 130,140',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
  isBlinking = false,
  breathingOffset = 0,
}) {
  const currentEyeScaleY = isBlinking ? 0.08 : params.eyeScaleY;
  const leftTilt = params.eyeTiltDeg;
  const rightTilt = -params.eyeTiltDeg;

  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      style={{
        maxWidth: '360px',
        maxHeight: '360px',
        transform: `translateY(${breathingOffset}px)`,
        transition: 'transform 80ms ease-out',
        filter: `drop-shadow(0 0 24px ${params.glow})`,
      }}
    >
      {/* Visor background */}
      <rect
        x="15"
        y="15"
        width="170"
        height="170"
        rx="40"
        fill="#050811"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="2"
      />

      {/* Left Eye */}
      <g transform={`translate(60, 80) rotate(${leftTilt}) scale(1, ${currentEyeScaleY}) translate(-60, -80)`}>
        <rect
          x={60 - params.eyeWidth / 2}
          y={80 - params.eyeHeight / 2}
          width={params.eyeWidth}
          height={params.eyeHeight}
          rx={params.eyeRadius}
          fill={params.color}
        />
      </g>

      {/* Right Eye */}
      <g transform={`translate(140, 80) rotate(${rightTilt}) scale(1, ${currentEyeScaleY}) translate(-140, -80)`}>
        <rect
          x={140 - params.eyeWidth / 2}
          y={80 - params.eyeHeight / 2}
          width={params.eyeWidth}
          height={params.eyeHeight}
          rx={params.eyeRadius}
          fill={params.color}
        />
      </g>

      {/* Mouth */}
      <path
        d={params.mouthPath}
        fill="none"
        stroke={params.color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

