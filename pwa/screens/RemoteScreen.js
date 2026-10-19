/**
 * RemoteScreen.js — Compact desk remote control screen.
 *
 * Purpose : Primary mobile control panel for quick relay toggles, LED brightness,
 *           Away mode toggle, and PC unlock trigger.
 * Depends : React, useRelays, useLeds, useAway, useUnlock, components.
 * Used by : App shell (pwa/app/page.js).
 */

"use client";

import useRelays from '../hooks/useRelays.js';
import useLeds from '../hooks/useLeds.js';
import useAway from '../hooks/useAway.js';
import useUnlock from '../hooks/useUnlock.js';
import StatusBar from '../components/StatusBar.js';
import RelayCard from '../components/RelayCard.js';
import BrightnessSlider from '../components/BrightnessSlider.js';

export function RemoteScreen() {
  const { channels, toggleLoad } = useRelays();
  const { ledState = { mode: 1, brightness: 75 }, updateLedState } = useLeds();
  const { isActive: isAway, activateAway, endAway } = useAway();
  const { triggerTypeNow, passwordIsSet } = useUnlock();

  const toggleAway = () => {
    if (isAway) endAway(true);
    else activateAway();
  };

  const toggleLed = () => {
    updateLedState({ mode: ledState.mode ? 0 : 1 });
  };

  const setBrightness = (b) => {
    updateLedState({ brightness: b });
  };

  return (
    <div className="remote-screen-container">
      <StatusBar />

      <section className="remote-quick-actions">
        <button
          className={`quick-action-btn ${isAway ? 'active-away' : ''}`}
          onClick={toggleAway}
          title="Toggle Away Mode"
        >
          <span className="icon">🚶</span>
          <span>{isAway ? 'Disarm Away' : 'Arm Away'}</span>
        </button>

        <button
          className="quick-action-btn"
          onClick={() => triggerTypeNow(0)}
          disabled={!passwordIsSet}
          title={passwordIsSet ? 'Trigger PC Unlock' : 'Password Not Configured'}
        >
          <span className="icon">🔓</span>
          <span>Unlock PC</span>
        </button>

        <button
          className={`quick-action-btn ${ledState.mode ? 'active-led' : ''}`}
          onClick={toggleLed}
          title="Toggle Ambient LEDs"
        >
          <span className="icon">💡</span>
          <span>{ledState.mode ? 'LEDs On' : 'LEDs Off'}</span>
        </button>
      </section>

      <section className="remote-relays-section">
        <h2 className="section-title">Power Outlets</h2>
        <div className="relays-grid">
          {channels.map((ch) => (
            <RelayCard
              key={ch.index}
              channel={ch}
              onToggle={toggleLoad}
            />
          ))}
        </div>
      </section>

      <section className="remote-led-slider-section">
        <h2 className="section-title">Ambient Lighting</h2>
        <BrightnessSlider
          value={ledState.brightness}
          onChange={setBrightness}
          disabled={!ledState.mode}
        />
      </section>
    </div>
  );
}

export default RemoteScreen;
