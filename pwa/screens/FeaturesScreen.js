/**
 * FeaturesScreen.js — Runtime feature switches management screen.
 *
 * Purpose : Enables or disables system modules dynamically at runtime (16-bit bitfield).
 * Depends : React, useFeatures.js, FeatureToggle.js.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import useFeatures from '../hooks/useFeatures.js';
import FeatureToggle from '../components/FeatureToggle.js';

export function FeaturesScreen() {
  const { switches, featureList, setSwitch } = useFeatures();

  const handleToggle = (index, enabled) => {
    setSwitch(index, enabled ? 1 : 0);
  };

  return (
    <div className="features-screen-container">
      <h1 className="screen-title">Runtime Features</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Toggle compiled-in hardware subsystems on or off. Disabling an item preserves stored data in NVS without executing hardware callbacks.
      </p>

      <div className="features-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {featureList.map((item) => (
          <FeatureToggle
            key={item.index}
            item={item}
            enabled={Boolean(switches[item.index])}
            onChange={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

export default FeaturesScreen;
