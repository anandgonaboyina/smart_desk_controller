/**
 * face.js — SVG Robot face parameter engine & expression presets.
 *
 * Purpose : Defines procedural geometry parameters for eyes, mouth, and blushing cheeks,
 *           supporting moods: NEUTRAL, HAPPY, ANGER, SHY, BLUSH, CRAZY, BUSY, AWAY, SLEEPY.
 * Depends : Nothing (pure JavaScript).
 * Used by : FaceSvg.js, useFace.js, DisplayScreen.js.
 */

export const EXPRESSIONS = {
  NEUTRAL: {
    eyeScaleY: 1.0,
    eyeHeight: 40,
    eyeWidth: 32,
    eyeRadius: 16,
    eyeTiltDeg: 0,
    mouthPath: 'M 70,140 Q 100,152 130,140',
    color: '#38bdf8', // Cyan
    glow: 'rgba(56, 189, 248, 0.5)',
    hasBlush: false,
  },
  HAPPY: {
    eyeScaleY: 1.0,
    eyeHeight: 36,
    eyeWidth: 34,
    eyeRadius: 18,
    eyeTiltDeg: -5,
    mouthPath: 'M 65,135 Q 100,165 135,135',
    color: '#34d399', // Emerald
    glow: 'rgba(52, 211, 153, 0.6)',
    hasBlush: false,
  },
  ANGER: {
    eyeScaleY: 0.85,
    eyeHeight: 36,
    eyeWidth: 36,
    eyeRadius: 8,
    eyeTiltDeg: 20, // Inward furious slant
    mouthPath: 'M 65,152 Q 100,130 135,152', // Sharp inverted frown
    color: '#ef4444', // Fiery Red
    glow: 'rgba(239, 68, 68, 0.75)',
    hasBlush: false,
  },
  SHY: {
    eyeScaleY: 0.65,
    eyeHeight: 28,
    eyeWidth: 32,
    eyeRadius: 14,
    eyeTiltDeg: -10, // Timid gaze looking down/away
    mouthPath: 'M 82,142 Q 100,148 118,142', // Small timid curve
    color: '#c084fc', // Soft Lavender
    glow: 'rgba(192, 132, 252, 0.55)',
    hasBlush: true,
    blushColor: 'rgba(244, 114, 182, 0.65)',
  },
  BLUSH: {
    eyeScaleY: 0.85,
    eyeHeight: 32,
    eyeWidth: 36,
    eyeRadius: 16,
    eyeTiltDeg: -5,
    mouthPath: 'M 72,138 Q 86,152 100,142 Q 114,152 128,138', // Cute happy kitty smile
    color: '#fb7185', // Warm Rose Pink
    glow: 'rgba(251, 113, 133, 0.7)',
    hasBlush: true,
    blushColor: 'rgba(255, 90, 160, 0.85)',
  },
  CRAZY: {
    eyeScaleY: 1.25,
    eyeHeight: 46,
    eyeWidth: 40,
    eyeRadius: 20,
    eyeTiltDeg: 12,
    isCrazyEyes: true, // Wild asymmetric eyes
    mouthPath: 'M 65,135 Q 100,175 135,135 Q 100,146 65,135', // Wide open wacky tongue grin
    color: '#a3e635', // Electric Neon Lime
    glow: 'rgba(163, 230, 53, 0.8)',
    hasBlush: false,
  },
  BUSY: {
    eyeScaleY: 0.6,
    eyeHeight: 25,
    eyeWidth: 36,
    eyeRadius: 8,
    eyeTiltDeg: 8,
    mouthPath: 'M 75,142 L 125,142',
    color: '#f87171',
    glow: 'rgba(248, 113, 113, 0.5)',
    hasBlush: false,
  },
  AWAY: {
    eyeScaleY: 0.15,
    eyeHeight: 10,
    eyeWidth: 32,
    eyeRadius: 4,
    eyeTiltDeg: 0,
    mouthPath: 'M 80,144 Q 100,140 120,144',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.3)',
    hasBlush: false,
  },
  SLEEPY: {
    eyeScaleY: 0.3,
    eyeHeight: 15,
    eyeWidth: 30,
    eyeRadius: 6,
    eyeTiltDeg: -10,
    mouthPath: 'M 80,145 Q 100,142 120,145',
    color: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.4)',
    hasBlush: false,
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
    hasBlush: false,
  },
  SURPRISED: {
    eyeScaleY: 1.2,
    eyeHeight: 46,
    eyeWidth: 40,
    eyeRadius: 20,
    eyeTiltDeg: 0,
    mouthPath: 'M 88,144 A 12,12 0 1,0 112,144 A 12,12 0 1,0 88,144',
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.5)',
    hasBlush: false,
  },
};

/**
 * Get expression configuration with aliases and fallback to NEUTRAL.
 *
 * @param {string} name
 * @returns {object} Expression parameters
 */
export function getExpression(name) {
  const key = (name || '').toUpperCase().trim();
  if (key === 'ANGRY' || key === 'ANGER') return EXPRESSIONS.ANGER;
  if (key === 'SHY') return EXPRESSIONS.SHY;
  if (key === 'BLESH' || key === 'BLUSH' || key === 'BLUSHING') return EXPRESSIONS.BLUSH;
  if (key === 'CRAZY' || key === 'GOOFY') return EXPRESSIONS.CRAZY;
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
