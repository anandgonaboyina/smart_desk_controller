/**
 * music-bands.js — Pure audio FFT frequency binning and beat detection.
 *
 * Purpose : Split Web Audio API FFT frequency data into Bass, Mid, and Treble energy bands,
 *           perform dynamic beat detection, and format 4-byte music stream frames.
 * Depends : Nothing (pure JavaScript).
 * Used by : audio-sync.js, demo.js.
 */

export const BASS_FREQ_LOW   = 20;
export const BASS_FREQ_HIGH  = 250;
export const MID_FREQ_LOW    = 250;
export const MID_FREQ_HIGH   = 2500;
export const TREBLE_FREQ_LOW = 2500;
export const TREBLE_FREQ_HIGH= 14000;

/**
 * Calculate energy (0..255) for a frequency band from FFT byte data.
 *
 * @param {Uint8Array} freqData   - AnalyserNode byte frequency data (0..255 per bin)
 * @param {number} sampleRate     - AudioContext sample rate (e.g. 44100 or 48000)
 * @param {number} fftSize        - FFT size (e.g. 1024 or 2048)
 * @param {number} lowFreq        - Lower frequency bound in Hz
 * @param {number} highFreq       - Upper frequency bound in Hz
 * @returns {number} Average energy (0..255)
 */
export function getBandEnergy(freqData, sampleRate, fftSize, lowFreq, highFreq) {
  if (!freqData || freqData.length === 0 || fftSize <= 0 || sampleRate <= 0) return 0;

  const binWidth = sampleRate / fftSize;
  const startBin = Math.max(0, Math.floor(lowFreq / binWidth));
  const endBin   = Math.min(freqData.length - 1, Math.ceil(highFreq / binWidth));

  if (startBin >= endBin) {
    return freqData[startBin] || 0;
  }

  let sum = 0;
  let count = 0;
  for (let i = startBin; i <= endBin; i++) {
    sum += freqData[i];
    count++;
  }

  return count > 0 ? Math.round(sum / count) : 0;
}

/**
 * Extract Bass, Mid, and Treble energies from FFT frequency data.
 *
 * @param {Uint8Array} freqData - Byte frequency data
 * @param {number} [sampleRate] - Defaults to 44100
 * @param {number} [fftSize]    - Defaults to 1024
 * @returns {{ bass: number, mid: number, treble: number }} Energies 0..255
 */
export function extractBands(freqData, sampleRate = 44100, fftSize = 1024) {
  return {
    bass: getBandEnergy(freqData, sampleRate, fftSize, BASS_FREQ_LOW, BASS_FREQ_HIGH),
    mid: getBandEnergy(freqData, sampleRate, fftSize, MID_FREQ_LOW, MID_FREQ_HIGH),
    treble: getBandEnergy(freqData, sampleRate, fftSize, TREBLE_FREQ_LOW, TREBLE_FREQ_HIGH),
  };
}

/**
 * Detect beat based on instantaneous bass vs recent rolling average bass.
 *
 * Example pairs:
 *   detectBeat(220, 150, 1.3, 180, 1000, 500) -> { isBeat: true,  newLastBeatMs: 1000 }
 *   detectBeat(160, 150, 1.3, 180, 1000, 500) -> { isBeat: false, newLastBeatMs: 500 }
 *
 * @param {number} instantBass      - Current frame bass (0..255)
 * @param {number} avgBass          - Rolling average bass (0..255)
 * @param {number} thresholdFactor  - Factor above average required for beat (e.g. 1.25)
 * @param {number} minIntervalMs    - Minimum time between beats (e.g. 180 ms)
 * @param {number} nowMs            - Current time ms
 * @param {number} lastBeatMs       - Time of previous beat ms
 * @returns {{ isBeat: boolean, newLastBeatMs: number }}
 */
export function detectBeat(instantBass, avgBass, thresholdFactor = 1.25, minIntervalMs = 180, nowMs = 0, lastBeatMs = 0) {
  const elapsed = Math.max(0, nowMs - lastBeatMs);
  if (elapsed < minIntervalMs) {
    return { isBeat: false, newLastBeatMs: lastBeatMs };
  }

  const threshold = Math.max(30, avgBass * thresholdFactor);
  if (instantBass >= threshold) {
    return { isBeat: true, newLastBeatMs: nowMs };
  }

  return { isBeat: false, newLastBeatMs: lastBeatMs };
}

/**
 * Pack 4-byte music frame for BLE transmission.
 *
 * @param {number} bass   - 0..255
 * @param {number} mid    - 0..255
 * @param {number} treble - 0..255
 * @param {boolean|number} beat - 0 or 1
 * @returns {Uint8Array} 4-byte frame
 */
export function packMusicFrame(bass, mid, treble, beat) {
  const buf = new Uint8Array(4);
  buf[0] = Math.max(0, Math.min(255, Math.round(bass || 0)));
  buf[1] = Math.max(0, Math.min(255, Math.round(mid || 0)));
  buf[2] = Math.max(0, Math.min(255, Math.round(treble || 0)));
  buf[3] = beat ? 1 : 0;
  return buf;
}

