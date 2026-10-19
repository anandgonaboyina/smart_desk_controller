/**
 * SkeletonLoader.js — Animated placeholder shimmer for loading states.
 *
 * Purpose : Clean placeholder placeholders during BLE discovery and state synchronization.
 * Depends : React only.
 * Used by : Screens, dev-preview.
 */

"use client";

import React from 'react';

export default function SkeletonLoader({ count = 3, height = '80px' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={idx}
          style={{
            height,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%)',
            backgroundSize: '200% 100%',
            border: '1px solid var(--border-subtle)',
            animation: 'skeletonShimmer 1.5s infinite linear',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

