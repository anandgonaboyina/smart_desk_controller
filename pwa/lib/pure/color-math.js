/**
 * color-math.js — Pure color calculations, gamma correction, and LED math.
 *
 * Purpose : HSV/RGB/Hex conversion, Gamma 2.2 perceptual correction, brightness scaling,
 *           LED strip current estimation, photosensitivity safety check, and blink timing math.
 * Depends : Nothing (pure JavaScript).
 * Used by : LedScreen.js, LedPreview.js, useLeds.js, demo.js.
 */

// ── Gamma 2.2 Lookup Table (Precomputed for 0..255) ─────────────────────────
export const GAMMA_TABLE = new Uint8Array([
    0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,
    1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   2,   2,   2,   2,   2,   2,
    3,   3,   3,   3,   3,   4,   4,   4,   4,   5,   5,   5,   5,   6,   6,   6,
    6,   7,   7,   7,   8,   8,   8,   9,   9,   9,  10,  10,  11,  11,  11,  12,
   12,  13,  13,  13,  14,  14,  15,  15,  16,  16,  17,  17,  18,  18,  19,  19,
   20,  20,  21,  22,  22,  23,  23,  24,  25,  25,  26,  26,  27,  28,  28,  29,
   30,  30,  31,  32,  33,  33,  34,  35,  35,  36,  37,  38,  39,  39,  40,  41,
   42,  43,  43,  44,  45,  46,  47,  48,  49,  49,  50,  51,  52,  53,  54,  55,
   56,  57,  58,  59,  60,  61,  62,  63,  64,  65,  66,  67,  68,  69,  70,  71,
   73,  74,  75,  76,  77,  78,  79,  81,  82,  83,  84,  85,  87,  88,  89,  90,
   91,  93,  94,  95,  97,  98,  99, 100, 102, 103, 105, 106, 107, 109, 110, 111,
  113, 114, 116, 117, 119, 120, 121, 123, 124, 126, 127, 129, 130, 132, 133, 135,
  137, 138, 140, 141, 143, 145, 146, 148, 149, 151, 153, 154, 156, 158, 159, 161,
  163, 165, 166, 168, 170, 172, 173, 175, 177, 179, 181, 182, 184, 186, 188, 190,
  192, 194, 196, 197, 199, 201, 203, 205, 207, 209, 211, 213, 215, 217, 219, 221,
  223, 225, 227, 229, 231, 234, 236, 238, 240, 242, 244, 246, 248, 251, 253, 255
]);

/**
 * Photosensitivity safety constant:
 * Minimum allowable cycle time (onMs + offMs) is 334 ms (<= 3 flashes/sec).
 */
export const BLINK_MIN_CYCLE_MS = 334;

/**
 * Convert HSV to RGB.
 *
 * Example pairs:
 *   hsvToRgb(0, 100, 100)   -> { r: 255, g: 0, b: 0 }     (Red)
 *   hsvToRgb(120, 100, 100) -> { r: 0, g: 255, b: 0 }     (Green)
 *   hsvToRgb(240, 100, 100) -> { r: 0, g: 0, b: 255 }     (Blue)
 *   hsvToRgb(0, 0, 100)     -> { r: 255, g: 255, b: 255 } (White)
 *
 * @param {number} h - Hue (0..360)
 * @param {number} s - Saturation (0..100)
 * @param {number} v - Value/Brightness (0..100)
 * @returns {{ r: number, g: number, b: number }} RGB object (0..255 each)
 */
export function hsvToRgb(h, s, v) {
  const normH = (((h % 360) + 360) % 360) / 60;
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const normV = Math.max(0, Math.min(100, v)) / 100;

  const c = normV * normS;
  const x = c * (1 - Math.abs((normH % 2) - 1));
  const m = normV - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (normH >= 0 && normH < 1)      { r1 = c; g1 = x; b1 = 0; }
  else if (normH >= 1 && normH < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (normH >= 2 && normH < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (normH >= 3 && normH < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (normH >= 4 && normH < 5) { r1 = x; g1 = 0; b1 = c; }
  else                              { r1 = c; g1 = 0; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/**
 * Convert RGB (0..255) to Hex string (#RRGGBB).
 *
 * Example pairs:
 *   rgbToHex(255, 0, 0)   -> "#ff0000"
 *   rgbToHex(0, 255, 128) -> "#00ff80"
 *
 * @param {number} r - 0..255
 * @param {number} g - 0..255
 * @param {number} b - 0..255
 * @returns {string} Hex color string
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert Hex string (#RRGGBB or #RGB) to RGB object.
 *
 * Example pairs:
 *   hexToRgb("#ff0000") -> { r: 255, g: 0, b: 0 }
 *   hexToRgb("#fff")    -> { r: 255, g: 255, b: 255 }
 *
 * @param {string} hex - Hex string
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 0xFF,
    g: (num >> 8) & 0xFF,
    b: num & 0xFF,
  };
}

/**
 * Apply Gamma 2.2 correction to an 8-bit channel.
 *
 * Example pairs:
 *   gammaCorrect(0)   -> 0
 *   gammaCorrect(128) -> 55
 *   gammaCorrect(255) -> 255
 *
 * @param {number} val - 0..255
 * @returns {number} Perceptually corrected 0..255
 */
export function gammaCorrect(val) {
  const idx = Math.max(0, Math.min(255, Math.round(val)));
  return GAMMA_TABLE[idx];
}

/**
 * Apply gamma correction to RGB.
 *
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {{ r: number, g: number, b: number }}
 */
export function gammaCorrectRgb({ r, g, b }) {
  return {
    r: gammaCorrect(r),
    g: gammaCorrect(g),
    b: gammaCorrect(b),
  };
}

/**
 * Scale an RGB color by brightness percentage and max cap.
 *
 * Example pairs:
 *   scaleBrightness({ r: 255, g: 255, b: 255 }, 100, 80) -> { r: 80, g: 80, b: 80 }
 *   scaleBrightness({ r: 255, g: 0, b: 0 }, 50, 80)       -> { r: 40, g: 0, b: 0 }
 *
 * @param {{ r: number, g: number, b: number }} color
 * @param {number} brightnessPct - 0..100
 * @param {number} maxCap        - 0..255 (default 80)
 * @returns {{ r: number, g: number, b: number }}
 */
export function scaleBrightness(color, brightnessPct, maxCap = 80) {
  const b = Math.max(0, Math.min(100, brightnessPct)) / 100;
  const cap = Math.max(0, Math.min(255, maxCap)) / 255;
  const factor = b * cap;

  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor),
  };
}

/**
 * Estimate current draw for 8 WS2812B LEDs in mA.
 * WS2812B draws approx 60mA at full white (20mA per channel) + 1mA quiescent.
 *
 * Example pairs:
 *   estimateCurrentMa({ r: 255, g: 255, b: 255 }, 8, 100) -> ~488 mA
 *   estimateCurrentMa({ r: 0, g: 0, b: 0 }, 8, 100)       -> ~8 mA (quiescent)
 *
 * @param {{ r: number, g: number, b: number }} color
 * @param {number} count         - Number of LEDs (8)
 * @param {number} brightnessPct - Brightness percentage (0..100)
 * @param {number} maxCap        - Max cap (80)
 * @returns {number} Estimated current in mA
 */
export function estimateCurrentMa(color, count = 8, brightnessPct = 100, maxCap = 80) {
  const scaled = scaleBrightness(color, brightnessPct, maxCap);
  const perLedMa = ((scaled.r + scaled.g + scaled.b) / (3 * 255)) * 60 + 1;
  return Math.round(perLedMa * count);
}

/**
 * Photosensitivity safety check:
 * Returns true if cycle (onMs + offMs) >= 334 ms (<= 3 flashes per second).
 *
 * Example pairs:
 *   isPhotosensitiveSafe(200, 200) -> true  (400 ms >= 334 ms -> 2.5 Hz)
 *   isPhotosensitiveSafe(100, 100) -> false (200 ms < 334 ms  -> 5.0 Hz)
 *
 * @param {number} onMs  - On duration in ms
 * @param {number} offMs - Off duration in ms
 * @returns {boolean} true if safe, false if photosensitive hazard
 */
export function isPhotosensitiveSafe(onMs, offMs) {
  return (Number(onMs) + Number(offMs)) >= BLINK_MIN_CYCLE_MS;
}

/**
 * Calculate simple blink state (ON or OFF) at elapsed time.
 *
 * @param {number} elapsedMs - Milliseconds elapsed in effect
 * @param {number} onMs      - On duration ms
 * @param {number} offMs     - Off duration ms
 * @returns {boolean} true if ON
 */
export function isBlinkOn(elapsedMs, onMs, offMs) {
  const cycle = Math.max(1, onMs + offMs);
  const phase = elapsedMs % cycle;
  return phase < onMs;
}

/**
 * Calculate double-blink state at elapsed time.
 * Pattern: [Flash 1] -> [Gap] -> [Flash 2] -> [Pause]
 *
 * @param {number} elapsedMs  - Milliseconds elapsed
 * @param {number} flashOnMs  - Flash duration ms
 * @param {number} flashOffMs - Short gap ms
 * @param {number} pauseMs    - Long pause ms
 * @returns {boolean} true if ON
 */
export function isDoubleBlinkOn(elapsedMs, flashOnMs, flashOffMs, pauseMs) {
  const total = flashOnMs + flashOffMs + flashOnMs + pauseMs;
  if (total <= 0) return false;
  const phase = elapsedMs % total;

  if (phase < flashOnMs) return true; // Flash 1
  if (phase < flashOnMs + flashOffMs) return false; // Gap
  if (phase < flashOnMs + flashOffMs + flashOnMs) return true; // Flash 2
  return false; // Long pause
}

/**
 * Calculate heartbeat intensity (0..255) for lub-dub curve.
 *
 * @param {number} elapsedMs - Milliseconds elapsed
 * @param {number} cycleMs   - Heartbeat cycle ms (e.g. 1000)
 * @returns {number} Intensity (0..255)
 */
export function getHeartbeatIntensity(elapsedMs, cycleMs = 1000) {
  const phase = elapsedMs % Math.max(1, cycleMs);
  const b1Len = Math.floor(cycleMs * 0.15);
  const gapLen = Math.floor(cycleMs * 0.10);
  const b2Len = Math.floor(cycleMs * 0.15);

  if (phase < b1Len) {
    const norm = Math.sin((phase / b1Len) * Math.PI);
    return Math.round(norm * 255);
  }
  if (phase < b1Len + gapLen) {
    return 0;
  }
  if (phase < b1Len + gapLen + b2Len) {
    const p2 = phase - (b1Len + gapLen);
    const norm = Math.sin((p2 / b2Len) * Math.PI);
    return Math.round(norm * 180);
  }
  return 0;
}

