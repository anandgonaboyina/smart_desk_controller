/**
 * audio.js — Web Audio API synthesizer and sound service.
 *
 * Purpose : Synthesizes crisp mechanical relay clicks, chimes, and alert tones with
 *           ZERO external audio asset dependencies. Enforces volume and quiet hours.
 * Depends : bus.js, store.js, pure/time-math.js.
 * Used by : bus.js events, useAudio.js.
 */

import bus from './bus.js';
import store from './store.js';
import { timeStringToMinutes, isMinuteInWindow } from './pure/time-math.js';

class AudioService {
  constructor() {
    this.ctx = null;
    this.lastPlayed = new Map();
    this.cooldownMs = 120; // Default cooldown per sound ID

    // Auto-listen to bus events
    bus.on('audio:play', (soundId) => this.play(soundId));
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isQuietHoursActive() {
    const qh = store.getQuietHours();
    if (!qh || !qh.enabled) return false;

    const startMin = timeStringToMinutes(qh.start);
    const endMin = timeStringToMinutes(qh.end);
    if (startMin < 0 || endMin < 0) return false;

    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    return isMinuteInWindow(curMin, startMin, endMin);
  }

  play(soundId) {
    if (!store.getAudioEnabled()) return;
    if (this.isQuietHoursActive()) return;

    const now = Date.now();
    const last = this.lastPlayed.get(soundId) || 0;
    if (now - last < this.cooldownMs) return;
    this.lastPlayed.set(soundId, now);

    this.initContext();
    if (!this.ctx) return;

    const volume = store.getAudioVolume();

    switch (soundId) {
      case 'relay_click':
        this.synthRelayClick(volume);
        break;
      case 'timer_done':
        this.synthTimerDone(volume);
        break;
      case 'away_enter':
        this.synthAwayEnter(volume);
        break;
      case 'call_start':
        this.synthCallStart(volume);
        break;
      case 'unlock_success':
        this.synthUnlockSuccess(volume);
        break;
      case 'error_buzz':
        this.synthErrorBuzz(volume);
        break;
      default:
        this.synthRelayClick(volume);
        break;
    }
  }

  // ── Synthesizers ───────────────────────────────────────────────────────────

  synthRelayClick(vol = 0.7) {
    const t0 = this.ctx.currentTime;
    // High click (metal contact armature slap)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.015);

    gain.gain.setValueAtTime(0.6 * vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.02);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.025);

    // Low mechanical bounce thud
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(140, t0 + 0.005);
    osc2.frequency.exponentialRampToValueAtTime(50, t0 + 0.035);

    gain2.gain.setValueAtTime(0.4 * vol, t0 + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc2.start(t0 + 0.005);
    osc2.stop(t0 + 0.045);
  }

  synthTimerDone(vol = 0.7) {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const t0 = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t0 + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.4 * vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  synthAwayEnter(vol = 0.7) {
    const notes = [440, 329.63]; // A4 -> E4
    const t0 = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t0 + idx * 0.15;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.4 * vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.32);
    });
  }

  synthCallStart(vol = 0.7) {
    const t0 = this.ctx.currentTime;
    [0, 0.08].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t0 + offset;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, start);

      gain.gain.setValueAtTime(0.35 * vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.06);
    });
  }

  synthUnlockSuccess(vol = 0.7) {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const t0 = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t0 + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.4 * vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  synthErrorBuzz(vol = 0.7) {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t0);

    gain.gain.setValueAtTime(0.5 * vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!store.getAudioEnabled() || this.isQuietHoursActive()) return;

    try {
      const u = new SpeechSynthesisUtterance(text);
      u.volume = store.getAudioVolume();
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch (err) {
      console.warn('[Audio] Speech synthesis failed:', err);
    }
  }
}

export const audio = new AudioService();
export default audio;
