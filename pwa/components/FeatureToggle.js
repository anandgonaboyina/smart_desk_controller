/**
 * FeatureToggle.js — Card toggle for individual runtime feature switch.
 *
 * Purpose : Presents title, description, and toggle for compiling and runtime feature flags.
 * Depends : React only.
 * Used by : FeaturesScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function FeatureToggle({ item, enabled = false, onChange }) {
  const { index, label, desc } = item;

  return (
    <div className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
      </div>

      <label className="toggle-label">
        <input
          type="checkbox"
          className="toggle-input"
          checked={enabled}
          onChange={(e) => onChange && onChange(index, e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
