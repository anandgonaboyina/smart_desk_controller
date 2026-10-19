/**
 * face.js — SVG Robot face parameter engine & expression presets.
 *
 * Purpose : Defines procedural geometry parameters for eyes and mouth,
 *           interpolation between moods, periodic blinking, and breathing cycles.
 * Depends : Nothing (pure JavaScript).
 * Used by : FaceSvg.js, useFace.js.
 */

export const EXPRESSIONS = {
  NEUTRAL: {
    eyeScaleY: 1.0,
    eyeHeight: 40,
    eyeWidth: 32,
    eyeRadius: 16,
    eyeTiltDeg: 0,
    mouthPath: 'M 70,140 Q 100,152 130,140',
    color: 'var(--accent-primary, #38bdf8)',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
  HAPPY: {
    eyeScaleY: 1.0,
    eyeHeight: 36,
    eyeWidth: 34,
    eyeRadius: 18,
    eyeTiltDeg: -5,
    mouthPath: 'M 65,135 Q 100,165 135,135',
    color: '#34d399', // Emerald
    glow: 'rgba(52, 211, 153, 0.5)',
  },
  BUSY: {
    eyeScaleY: 0.6,
    eyeHeight: 25,
    eyeWidth: 36,
    eyeRadius: 8,
    eyeTiltDeg: 8,
    mouthPath: 'M 75,142 L 125,142',
    color: '#f87171', // Red/Coral
    glow: 'rgba(248, 113, 113, 0.5)',
  },
  AWAY: {
    eyeScaleY: 0.15,
    eyeHeight: 10,
    eyeWidth: 32,
    eyeRadius: 4,
    eyeTiltDeg: 0,
    mouthPath: 'M 80,144 Q 100,140 120,144',
    color: '#fbbf24', // Amber
    glow: 'rgba(251, 191, 36, 0.3)',
  },
  SLEEPY: {
    eyeScaleY: 0.3,
    eyeHeight: 15,
    eyeWidth: 30,
    eyeRadius: 6,
    eyeTiltDeg: -10,
    mouthPath: 'M 80,145 Q 100,142 120,145',
    color: '#818cf8', // Indigo
    glow: 'rgba(129, 140, 248, 0.3)',
  },
  TALKING: {
    eyeScaleY: 1.0,
    eyeHeight: 40,
    eyeWidth: 32,
    eyeRadius: 16,
    eyeTiltDeg: 0,
    mouthPath: 'M 75,135 Q 100,160 125,135 Q 100,150 75,135',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.5)',
  },
  SURPRISED: {
    eyeScaleY: 1.2,
    eyeHeight: 46,
    eyeWidth: 40,
    eyeRadius: 20,
    eyeTiltDeg: 0,
    mouthPath: 'M 88,144 A 12,12 0 1,0 112,144 A 12,12 0 1,0 88,144',
    color: '#f472b6', // Pink
    glow: 'rgba(244, 114, 182, 0.5)',
  },
};

/**
 * Get expression configuration with fallback to NEUTRAL.
 *
 * @param {string} name
 * @returns {object} Expression parameters
 */
export function getExpression(name) {
  const key = (name || '').toUpperCase();
  return EXPRESSIONS[key] || EXPRESSIONS.NEUTRAL;
}

/**
 * Calculate natural sinusoidal breathing offset.
 *
 * @param {number} timestampMs
 * @returns {number} Vertical pixel offset (-2 to +2 px)
 */
export function getBreathingOffset(timestampMs) {
  const periodMs = 4000;
  const phase = (timestampMs % periodMs) / periodMs;
  return Math.sin(phase * 2 * Math.PI) * 2;
}
