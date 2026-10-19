/**
 * audio-sync.js — Web Audio microphone capture & real-time music reactive streamer.
 *
 * Purpose : User-initiated microphone capture, FFT analysis, beat detection,
 *           and ~35 FPS streaming of 4-byte frames to ESP32 over BLE.
 * Depends : bus.js, ble.js, pure/music-bands.js.
 * Used by : LedScreen.js, AudioWorkletMic.js, useAudio.js.
 */

import bus from './bus.js';
import ble from './ble.js';
import { extractBands, detectBeat } from './pure/music-bands.js';

class AudioSyncService {
  constructor() {
    this.stream = null;
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.active = false;
    this.animId = null;

    this.freqData = null;
    this.lastFrameTime = 0;
    this.frameIntervalMs = 28; // ~35 FPS

    // Beat detection state
    this.rollingAvgBass = 100;
    this.lastBeatMs = 0;
  }

  isActive() {
    return this.active;
  }

  async start() {
    if (this.active) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      bus.emit('system:toast', { message: 'Microphone capture not supported in this browser.', type: 'error' });
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.6;

      this.source.connect(this.analyser);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.active = true;
      this.lastFrameTime = performance.now();
      bus.emit('music:active', true);
      bus.emit('system:toast', { message: 'Music Reactive sync started', type: 'info' });

      this.loop();
    } catch (err) {
      this.stop();
      bus.emit('system:toast', { message: `Microphone access denied: ${err.message}`, type: 'error' });
    }
  }

  stop() {
    if (!this.active && !this.stream) return;
    this.active = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }

    bus.emit('music:active', false);
    bus.emit('system:toast', { message: 'Music Reactive sync stopped', type: 'info' });
  }

  loop() {
    if (!this.active) return;
    this.animId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    if (now - this.lastFrameTime < this.frameIntervalMs) return;
    this.lastFrameTime = now;

    this.analyser.getByteFrequencyData(this.freqData);

    const { bass, mid, treble } = extractBands(
      this.freqData,
      this.ctx.sampleRate,
      this.analyser.fftSize
    );

    // Update rolling average bass with smoothing factor
    this.rollingAvgBass = this.rollingAvgBass * 0.9 + bass * 0.1;

    const beatResult = detectBeat(
      bass,
      this.rollingAvgBass,
      1.25,
      180,
      now,
      this.lastBeatMs
    );
    this.lastBeatMs = beatResult.newLastBeatMs;

    // Send packet to ESP32 over BLE
    ble.sendMusicStream(bass, mid, treble, beatResult.isBeat);

    // Also broadcast locally for PWA audio visualizer
    bus.emit('music:frame', {
      bass, mid, treble,
      beat: beatResult.isBeat,
    });
  }
}

export const audioSync = new AudioSyncService();
export default audioSync;
