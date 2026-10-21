/**
 * smartdesk.ts — Type definitions & protocol constants for SmartDesk PWA.
 *
 * Purpose : Shared interfaces, payload structures and configuration types.
 * Depends : None (Pure TS).
 * Used by : Hooks, screens, components.
 */

export const SERVICE_UUID = "7f781e04-c0ee-47c9-a1e4-0aafa8ee316b";
export const CHAR_RELAY_UUID = "385d4ec5-88c3-417e-8aa5-2a70db5d49fa";
export const CHAR_LED_UUID = "1814a0cb-9d1f-4212-946a-72e78b64042e";
export const CHAR_CONFIG_UUID = "11848579-c357-45cb-bdb2-88f560c11708";
export const CHAR_INFO_UUID = "f1f28a13-9725-4636-a073-0666057bd91b";
export const CHAR_ENV_UUID = "4a1b0005-c0ee-47c9-a1e4-0aafa8ee316b";

export interface RelayState {
  load: boolean;
  remainingMin: number;
}

export interface RelayConfigItem {
  name: string;
  wiring: number; // 0 = Normally Open (NO), 1 = Normally Closed (NC)
  onAnimEnabled: boolean;
  onAnimMode: number;
  onAnimDuration: number;
  offAnimEnabled: boolean;
  offAnimMode: number;
  offAnimDuration: number;
  beepOn?: boolean;
  beepOff?: boolean;
  beepTimerEnd?: boolean;
}

export interface LedState {
  mode: number;
  r: number;
  g: number;
  b: number;
  bri: number;
  spd: number;
}

export interface ScheduleRule {
  id: number;           // 0..7
  enabled: boolean;
  name: string;
  daysMask: number;     // bit 0=Sun, 1=Mon, ..., 6=Sat (127 = everyday)
  startHour: number;    // 0..23
  startMin: number;     // 0..59
  stopType: number;     // 0=None, 1=DurationMinutes, 2=DirectStopTime
  durationMin: number;  // 1..1440
  stopHour: number;     // 0..23
  stopMin: number;      // 0..59
  targetType: number;   // 0=CH1, 1=CH2, 2=CH3, 3=CH4, 4=All Relays, 5=RGB Strip
  targetAction: number; // For Relay: 1=ON, 0=OFF; For RGB: Mode 0..15
  rgbR: number;
  rgbG: number;
  rgbB: number;
  rgbBri: number;
}

export interface PresenceConfig {
  enabled: boolean;
  awayDelayMin: number;
  awayRelayMask: number; // Bits 0..3: Relays to turn OFF (0x0F = all 4, 0x00 = none)
  awayRgbOff: boolean;   // true = turn RGB strip OFF, false = leave RGB as is
  arrivalRelayMask: number; // Bits 0..3: Relays to turn ON (0x0F = all 4, 0x00 = none)
  arrivalRgbOn: boolean;    // true = turn RGB strip ON, false = leave RGB as is
  arrivalRgbMode: number;   // 1..15 Mode to activate on arrival
}

export interface PresenceData {
  enabled: boolean;
  state: number; // 0=Away/Standby, 1=Present/Connected, 2=Away Countdown
  remainingMin: number;
}

export interface StoredClient {
  slot: number;
  valid: boolean;
  trackPresence: boolean;
  name: string;
}

export interface EspClock {
  synced: boolean;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
}

export interface EnvData {
  valid: boolean;
  tempC: number;
  humidity: number;
}

export interface MatrixConfig {
  rows: number;
  cols: number;
  wiringType: number; // 0 = Progressive, 1 = Zig-Zag (Serpentine)
  pin: number;        // GPIO pin (default 11)
  enabled: boolean;
  mode: number;       // 0=Off, 17=Clock, 18=Scroll Text, 19=Matrix Rain
  speed: number;      // 1..10
  bri: number;        // 0..100
  colorR: number;
  colorG: number;
  colorB: number;
  text: string;
}

export interface UiAnimState {
  active: boolean;
  isTurnOn: boolean;
  mode: number;
  durationMs: number;
  startMs: number;
  label: string;
}

export type BuddyMood = "NEUTRAL" | "HAPPY" | "SAD" | "ANGRY" | "SURPRISED" | "SLEEPY" | "LOVE";

export interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: "info" | "tx" | "rx" | "warn" | "err";
  timestamp?: number;
}

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const LED_MODES = [
  { id: 0, label: "Off", desc: "All LEDs Dark", icon: "🌑" },
  { id: 1, label: "Solid", desc: "Static Color", icon: "💡" },
  { id: 2, label: "Breathe", desc: "Fade In & Out", icon: "🌊" },
  { id: 3, label: "Rainbow Wave", desc: "Full Spectrum Wave", icon: "🌈" },
  { id: 4, label: "Pulse Blink", desc: "Clean Pulse (<3Hz)", icon: "✨" },
  { id: 5, label: "Chase L→R", desc: "Left to Right Trail", icon: "➡️" },
  { id: 6, label: "Chase R→L", desc: "Right to Left Trail", icon: "⬅️" },
  { id: 7, label: "Color Cycle", desc: "Synchronized Spectrum", icon: "🔄" },
  { id: 8, label: "Scanner", desc: "Knight Rider Ping-Pong", icon: "↔️" },
  { id: 9, label: "Sparkle", desc: "Twinkling Pixels", icon: "⭐" },
  { id: 10, label: "Center Pulse", desc: "Middle Outward Expansion", icon: "🎯" },
  { id: 11, label: "Dual Chase", desc: "Crossing Light Beams", icon: "⚡" },
  { id: 12, label: "Wipe L→R", desc: "Progressive Fill Left", icon: "▶️" },
  { id: 13, label: "Wipe R→L", desc: "Progressive Fill Right", icon: "◀️" },
  { id: 14, label: "Fireplace", desc: "Organic Flame Flicker", icon: "🔥" },
  { id: 15, label: "Aurora", desc: "Two-Tone Ambient Shift", icon: "🌌" },
  // 10 Crazy New Ambient Modes
  { id: 17, label: "Cyberpunk", desc: "Hot Magenta & Neon Cyan", icon: "🌆" },
  { id: 18, label: "Plasma Wave", desc: "Harmonic Multi-Sine Wave", icon: "🔮" },
  { id: 19, label: "Matrix Glitch", desc: "Digital Matrix Code Runner", icon: "👾" },
  { id: 20, label: "Hyperdrive", desc: "Lightspeed Warp Jump", icon: "🚀" },
  { id: 21, label: "Lava Lamp", desc: "Viscous Crimson & Gold", icon: "🌋" },
  { id: 22, label: "Police Pursuit", desc: "Red & Blue Double Strobe", icon: "🚨" },
  { id: 23, label: "Ocean Tide", desc: "Aquamarine Deep Swell", icon: "🌊" },
  { id: 24, label: "Toxic Hazmat", desc: "Radioactive Lime Glow", icon: "☢️" },
  { id: 25, label: "Heartbeat EKG", desc: "Cardiovascular Pulse", icon: "💓" },
  { id: 26, label: "Meteor Shower", desc: "Prismatic Bursting Embers", icon: "☄️" },
];

export const RELAY_ANIM_OPTIONS = [
  { id: 1, label: "Fade In-Out / Breathe" },
  { id: 2, label: "Fast Pulse" },
  { id: 3, label: "Wipe Left → Right" },
  { id: 4, label: "Wipe Right → Left" },
  { id: 5, label: "Chase Left → Right" },
  { id: 6, label: "Chase Right → Left" },
  { id: 7, label: "Knight Rider / Scanner" },
  { id: 8, label: "Double Blink" },
  { id: 9, label: "Center Outward Pulse" },
  { id: 10, label: "Rainbow Wave" },
];

export const MUSIC_DISCO_MODES = [
  { id: 0, label: "Disco Party", desc: "Rotating club lights & beat jumps", icon: "🕺" },
  { id: 1, label: "Bass Burst", desc: "Center-outward explosion on kicks", icon: "💥" },
  { id: 2, label: "Neon Strobe", desc: "High-contrast nightclub beat flashes", icon: "⚡" },
  { id: 3, label: "Rhythm Ripple", desc: "Flowing light wave driven by tempo", icon: "🌊" },
  { id: 4, label: "Disco Sparkle", desc: "Shimmering random starbursts on beats", icon: "✨" },
  { id: 5, label: "Beat Pump", desc: "Color wheel pumping brightness with bass", icon: "🌈" },
  { id: 6, label: "Dual Clash", desc: "Beams colliding at center on beat", icon: "⚔️" },
  { id: 7, label: "Cyber Spectrum", desc: "8-band dancing cyberpunk equalizer", icon: "🎵" },
  { id: 8, label: "Fire Dance", desc: "Flaring flames on heavy bass/drums", icon: "🔥" },
  { id: 9, label: "Solo Beat Sync", desc: "Custom color pulsing to the song", icon: "🎯" },
];

export const MATRIX_MODES = [
  { id: 17, label: "Digital Clock", desc: "RTC Real-Time Clock Display", icon: "🕒" },
  { id: 18, label: "Scroll Left", desc: "Marquee text scrolling right to left", icon: "⬅️" },
  { id: 20, label: "Scroll Right", desc: "Marquee text scrolling left to right", icon: "➡️" },
  { id: 21, label: "Bounce Text", desc: "Alternating ping-pong scrolling", icon: "↔️" },
  { id: 22, label: "Rainbow Text", desc: "Dynamic color-cycling marquee", icon: "🌈" },
  { id: 23, label: "Fade In-Out", desc: "Breathing text fade transition", icon: "✨" },
  { id: 19, label: "Matrix Rain", desc: "Digital Cyberpunk falling rain", icon: "🌧️" },
  { id: 24, label: "Fireplace", desc: "Organic flickering flame simulation", icon: "🔥" },
  { id: 25, label: "Starfield", desc: "Twinkling starry night sparkle", icon: "⭐" },
  { id: 26, label: "Equalizer", desc: "Audio spectrum dancing visualizer", icon: "📊" },
  { id: 0, label: "Matrix Off", desc: "Matrix display dark", icon: "🌑" },
];

export const MATRIX_SAFE_GPIO_PINS = [
  { pin: 11, label: "GPIO 11 (Default • Recommended)" },
  { pin: 12, label: "GPIO 12" },
  { pin: 13, label: "GPIO 13" },
  { pin: 14, label: "GPIO 14" },
  { pin: 15, label: "GPIO 15" },
  { pin: 16, label: "GPIO 16" },
  { pin: 17, label: "GPIO 17" },
  { pin: 18, label: "GPIO 18" },
  { pin: 21, label: "GPIO 21" },
  { pin: 38, label: "GPIO 38" },
  { pin: 39, label: "GPIO 39" },
  { pin: 40, label: "GPIO 40" },
  { pin: 41, label: "GPIO 41" },
  { pin: 42, label: "GPIO 42" },
];

