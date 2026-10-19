/**
 * check-pure.mjs — Linter and unit test runner for pure layer.
 *
 * Purpose : Verifies pure layer isolation (no browser APIs, no React) AND
 *           runs real example input/output assertions for every exported pure function.
 * Depends : Node.js fs, path, url.
 * Used by : npm run check:pure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import * as colorMath from '../lib/pure/color-math.js';
import * as relayLogic from '../lib/pure/relay-logic.js';
import * as timeMath from '../lib/pure/time-math.js';
import * as scheduleFormat from '../lib/pure/schedule-format.js';
import * as musicBands from '../lib/pure/music-bands.js';
import * as rulesMatch from '../lib/pure/rules-match.js';
import * as protocolPack from '../lib/pure/protocol-pack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pureDir = path.resolve(__dirname, '../lib/pure');

let totalAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  [FAIL] ${message}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  assert(actualStr === expectedStr, `${message} (expected: ${expectedStr}, got: ${actualStr})`);
}

console.log('================================================================');
console.log(' 1. PURE LAYER ISOLATION SCAN (Forbidden Word Check)');
console.log('================================================================');

const FORBIDDEN_RULES = [
  { regex: /\bwindow\b/, desc: 'Browser window global' },
  { regex: /\bdocument\b/, desc: 'Browser document global' },
  { regex: /\bnavigator\b/, desc: 'Browser navigator global' },
  { regex: /\blocalStorage\b/, desc: 'Browser localStorage global' },
  { regex: /\bAudioContext\b/, desc: 'Web Audio API global' },
  { regex: /from\s+['"]react['"]/, desc: 'React import' },
  { regex: /\buseState\b/, desc: 'React hook' },
  { regex: /\buseEffect\b/, desc: 'React hook' },
  { regex: /['"]\.\.\/ble\.js['"]/, desc: 'Outer service import' },
  { regex: /['"]\.\.\/bus\.js['"]/, desc: 'Outer service import' },
];

const files = fs.readdirSync(pureDir).filter((f) => f.endsWith('.js'));
for (const file of files) {
  const filePath = path.join(pureDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/\/\*[\s\S]*?\*\//g, ''); // Strip block comments

  const lines = content.split('\n');
  let fileOk = true;

  lines.forEach((line, lineIdx) => {
    const codePart = line.replace(/\/\/.*$/, '').trim();
    if (!codePart) return;

    for (const { regex, desc } of FORBIDDEN_RULES) {
      if (regex.test(codePart)) {
        console.error(`  [FAIL] ${file}:${lineIdx + 1} forbidden ${desc}: "${codePart}"`);
        fileOk = false;
        failedAssertions++;
      }
    }
  });

  if (fileOk) {
    totalAssertions++;
    console.log(`  [PASS] ${file} has zero browser APIs & zero React imports.`);
  }
}

console.log('\n================================================================');
console.log(' 2. COLOR MATH ASSERTIONS (color-math.js)');
console.log('================================================================');

assertDeepEqual(colorMath.hsvToRgb(0, 100, 100), { r: 255, g: 0, b: 0 }, 'hsvToRgb: pure Red');
assertDeepEqual(colorMath.hsvToRgb(120, 100, 100), { r: 0, g: 255, b: 0 }, 'hsvToRgb: pure Green');
assertDeepEqual(colorMath.hsvToRgb(240, 100, 100), { r: 0, g: 0, b: 255 }, 'hsvToRgb: pure Blue');
assertDeepEqual(colorMath.hsvToRgb(0, 0, 100), { r: 255, g: 255, b: 255 }, 'hsvToRgb: pure White');

assert(colorMath.rgbToHex(255, 0, 0) === '#ff0000', 'rgbToHex: #ff0000');
assert(colorMath.rgbToHex(0, 255, 128) === '#00ff80', 'rgbToHex: #00ff80');

assertDeepEqual(colorMath.hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 }, 'hexToRgb: #ff0000');
assertDeepEqual(colorMath.hexToRgb('#00ff80'), { r: 0, g: 255, b: 128 }, 'hexToRgb: #00ff80');
assertDeepEqual(colorMath.hexToRgb('#fff'), { r: 255, g: 255, b: 255 }, 'hexToRgb: short hex #fff');

assert(colorMath.gammaCorrect(0) === 0, 'gammaCorrect: 0 -> 0');
assert(colorMath.gammaCorrect(128) === 56, 'gammaCorrect: 128 -> 56');
assert(colorMath.gammaCorrect(255) === 255, 'gammaCorrect: 255 -> 255');

assertDeepEqual(colorMath.gammaCorrectRgb({ r: 0, g: 128, b: 255 }), { r: 0, g: 56, b: 255 }, 'gammaCorrectRgb');

assertDeepEqual(
  colorMath.scaleBrightness({ r: 255, g: 255, b: 255 }, 100, 80),
  { r: 80, g: 80, b: 80 },
  'scaleBrightness: full white 100% with cap 80'
);
assertDeepEqual(
  colorMath.scaleBrightness({ r: 255, g: 0, b: 0 }, 50, 80),
  { r: 40, g: 0, b: 0 },
  'scaleBrightness: 50% red with cap 80'
);

assert(colorMath.estimateCurrentMa({ r: 255, g: 255, b: 255 }, 8, 100, 80) > 0, 'estimateCurrentMa: non-zero current');
assert(colorMath.isPhotosensitiveSafe(200, 200) === true, 'isPhotosensitiveSafe: 400ms is safe');
assert(colorMath.isPhotosensitiveSafe(100, 100) === false, 'isPhotosensitiveSafe: 200ms triggers hazard');

assert(colorMath.isBlinkOn(50, 200, 200) === true, 'isBlinkOn: phase 50ms in 200ms ON is true');
assert(colorMath.isBlinkOn(250, 200, 200) === false, 'isBlinkOn: phase 250ms in 200ms OFF is false');

assert(colorMath.isDoubleBlinkOn(50, 100, 50, 200) === true, 'isDoubleBlinkOn: flash 1');
assert(colorMath.isDoubleBlinkOn(120, 100, 50, 200) === false, 'isDoubleBlinkOn: gap');
assert(colorMath.isDoubleBlinkOn(160, 100, 50, 200) === true, 'isDoubleBlinkOn: flash 2');
assert(colorMath.isDoubleBlinkOn(260, 100, 50, 200) === false, 'isDoubleBlinkOn: pause');

assert(colorMath.getHeartbeatIntensity(50, 1000) > 0, 'getHeartbeatIntensity: beat 1');
assert(colorMath.getHeartbeatIntensity(200, 1000) === 0, 'getHeartbeatIntensity: gap');

console.log('\n================================================================');
console.log(' 3. RELAY LOGIC ASSERTIONS (All 4 Polarity x Wiring Combos)');
console.log('================================================================');

// 1. Active-LOW (0), NO (0)
assert(relayLogic.relayLoadToCoil(1, relayLogic.RELAY_WIRING_NO) === relayLogic.RELAY_COIL_ON, 'AL+NO: Load 1 -> Coil ON');
assert(relayLogic.relayCoilToLevel(1, relayLogic.RELAY_POLARITY_ACTIVE_LOW) === relayLogic.RELAY_LEVEL_LOW, 'AL+NO: Coil ON -> GPIO LOW');
assert(relayLogic.relayLoadToLevel(1, 0, 0) === 0, 'AL+NO: Load 1 -> GPIO LOW (0)');
assert(relayLogic.relayLoadToLevel(0, 0, 0) === 1, 'AL+NO: Load 0 -> GPIO HIGH (1)');
assert(relayLogic.relayLevelToLoad(0, 0, 0) === 1, 'AL+NO: Inverse GPIO 0 -> Load 1');
assert(relayLogic.relayLevelToLoad(1, 0, 0) === 0, 'AL+NO: Inverse GPIO 1 -> Load 0');

// 2. Active-LOW (0), NC (1)
assert(relayLogic.relayLoadToCoil(1, relayLogic.RELAY_WIRING_NC) === relayLogic.RELAY_COIL_OFF, 'AL+NC: Load 1 -> Coil OFF');
assert(relayLogic.relayCoilToLevel(0, relayLogic.RELAY_POLARITY_ACTIVE_LOW) === relayLogic.RELAY_LEVEL_HIGH, 'AL+NC: Coil OFF -> GPIO HIGH');
assert(relayLogic.relayLoadToLevel(1, 0, 1) === 1, 'AL+NC: Load 1 -> GPIO HIGH (1)');
assert(relayLogic.relayLoadToLevel(0, 0, 1) === 0, 'AL+NC: Load 0 -> GPIO LOW (0)');
assert(relayLogic.relayLevelToLoad(1, 0, 1) === 1, 'AL+NC: Inverse GPIO 1 -> Load 1');
assert(relayLogic.relayLevelToLoad(0, 0, 1) === 0, 'AL+NC: Inverse GPIO 0 -> Load 0');

// 3. Active-HIGH (1), NO (0)
assert(relayLogic.relayLoadToLevel(1, 1, 0) === 1, 'AH+NO: Load 1 -> GPIO HIGH (1)');
assert(relayLogic.relayLoadToLevel(0, 1, 0) === 0, 'AH+NO: Load 0 -> GPIO LOW (0)');
assert(relayLogic.relayLevelToLoad(1, 1, 0) === 1, 'AH+NO: Inverse GPIO 1 -> Load 1');
assert(relayLogic.relayLevelToLoad(0, 1, 0) === 0, 'AH+NO: Inverse GPIO 0 -> Load 0');

// 4. Active-HIGH (1), NC (1)
assert(relayLogic.relayLoadToLevel(1, 1, 1) === 0, 'AH+NC: Load 1 -> GPIO LOW (0)');
assert(relayLogic.relayLoadToLevel(0, 1, 1) === 1, 'AH+NC: Load 0 -> GPIO HIGH (1)');
assert(relayLogic.relayLevelToLoad(0, 1, 1) === 1, 'AH+NC: Inverse GPIO 0 -> Load 1');
assert(relayLogic.relayLevelToLoad(1, 1, 1) === 0, 'AH+NC: Inverse GPIO 1 -> Load 0');

// Safe OFF level
assert(relayLogic.relayGetSafeOffLevel(0, 0) === 1, 'relayGetSafeOffLevel: AL+NO -> 1 (HIGH)');
assert(relayLogic.relayGetSafeOffLevel(0, 1) === 0, 'relayGetSafeOffLevel: AL+NC -> 0 (LOW)');
assert(relayLogic.relayGetSafeOffLevel(1, 0) === 0, 'relayGetSafeOffLevel: AH+NO -> 0 (LOW)');
assert(relayLogic.relayGetSafeOffLevel(1, 1) === 1, 'relayGetSafeOffLevel: AH+NC -> 1 (HIGH)');

// Rate-limiting check
assert(relayLogic.relayCanSwitch(5000, 2000, 2000) === true, 'relayCanSwitch: 3000ms >= 2000ms min');
assert(relayLogic.relayCanSwitch(2500, 2000, 2000) === false, 'relayCanSwitch: 500ms < 2000ms min');

console.log('\n================================================================');
console.log(' 4. TIME MATH ASSERTIONS (time-math.js)');
console.log('================================================================');

assert(timeMath.getUnixTimestampSec(new Date('2026-01-01T00:00:00Z')) === 1767225600, 'getUnixTimestampSec: exact epoch');
assert(typeof timeMath.getTimezoneOffsetMinutes() === 'number', 'getTimezoneOffsetMinutes: returns number');

assert(timeMath.minutesToTimeString(0) === '00:00', 'minutesToTimeString: 0 -> 00:00');
assert(timeMath.minutesToTimeString(570) === '09:30', 'minutesToTimeString: 570 -> 09:30');
assert(timeMath.minutesToTimeString(1439) === '23:59', 'minutesToTimeString: 1439 -> 23:59');

assert(timeMath.timeStringToMinutes('09:30') === 570, 'timeStringToMinutes: 09:30 -> 570');
assert(timeMath.timeStringToMinutes('00:00') === 0, 'timeStringToMinutes: 00:00 -> 0');
assert(timeMath.timeStringToMinutes('23:59') === 1439, 'timeStringToMinutes: 23:59 -> 1439');
assert(timeMath.timeStringToMinutes('invalid') === -1, 'timeStringToMinutes: invalid -> -1');

assert(timeMath.formatCountdownSec(65) === '01:05', 'formatCountdownSec: 65s -> 01:05');
assert(timeMath.formatCountdownSec(300) === '05:00', 'formatCountdownSec: 300s -> 05:00');

assert(timeMath.formatDurationMin(45) === '45m', 'formatDurationMin: 45m');
assert(timeMath.formatDurationMin(90) === '1h 30m', 'formatDurationMin: 1h 30m');
assert(timeMath.formatDurationMin(120) === '2h', 'formatDurationMin: 2h');

assert(timeMath.isMinuteInWindow(600, 540, 1020) === true, 'isMinuteInWindow: daytime inside');
assert(timeMath.isMinuteInWindow(400, 540, 1020) === false, 'isMinuteInWindow: daytime outside');
assert(timeMath.isMinuteInWindow(1400, 1320, 360) === true, 'isMinuteInWindow: overnight inside (before mid)');
assert(timeMath.isMinuteInWindow(100, 1320, 360) === true, 'isMinuteInWindow: overnight inside (after mid)');
assert(timeMath.isMinuteInWindow(500, 1320, 360) === false, 'isMinuteInWindow: overnight outside');

console.log('\n================================================================');
console.log(' 5. SCHEDULE BITMASKS & FORMAT (schedule-format.js)');
console.log('================================================================');

assert(scheduleFormat.isDayInMask(0x7F, 3) === true, 'isDayInMask: day 3 in 0x7F');
assert(scheduleFormat.isDayInMask(0x3E, 0) === false, 'isDayInMask: Sunday not in Mon-Fri');
assert(scheduleFormat.isDayInMask(0x3E, 1) === true, 'isDayInMask: Monday in Mon-Fri');

assert(scheduleFormat.toggleDayInMask(0x3E, 0) === 0x3F, 'toggleDayInMask: add Sunday');
assert(scheduleFormat.toggleDayInMask(0x3E, 1) === 0x3C, 'toggleDayInMask: remove Monday');

assert(scheduleFormat.formatWeekdayMask(0x7F) === 'Every day', 'formatWeekdayMask: Every day');
assert(scheduleFormat.formatWeekdayMask(0x3E) === 'Weekdays (Mon-Fri)', 'formatWeekdayMask: Weekdays');
assert(scheduleFormat.formatWeekdayMask(0x41) === 'Weekends', 'formatWeekdayMask: Weekends');
assert(scheduleFormat.formatWeekdayMask(0x00) === 'Never', 'formatWeekdayMask: Never');

assert(scheduleFormat.formatTime(9, 30) === '09:30', 'formatTime: 9, 30 -> 09:30');
assert(scheduleFormat.formatTime(0xFF, 0) === '--:--', 'formatTime: 0xFF -> --:--');

const schedSummary = scheduleFormat.formatScheduleSummary(
  { onHour: 9, onMin: 0, offHour: 17, offMin: 0, weekdayMask: 0x3E },
  'Desk Lamp'
);
assert(schedSummary === 'Desk Lamp: ON 09:00, OFF 17:00 (Weekdays (Mon-Fri))', 'formatScheduleSummary');

console.log('\n================================================================');
console.log(' 6. MUSIC BAND MATH (music-bands.js)');
console.log('================================================================');

const mockFreq = new Uint8Array(512);
mockFreq.fill(100);
assert(musicBands.getBandEnergy(mockFreq, 44100, 1024, 20, 250) === 100, 'getBandEnergy: constant 100');

const bands = musicBands.extractBands(mockFreq, 44100, 1024);
assertDeepEqual(bands, { bass: 100, mid: 100, treble: 100 }, 'extractBands: all 100');

const beatRes = musicBands.detectBeat(220, 150, 1.3, 180, 1000, 500);
assert(beatRes.isBeat === true && beatRes.newLastBeatMs === 1000, 'detectBeat: beat detected');

const noBeatRes = musicBands.detectBeat(160, 150, 1.3, 180, 1000, 500);
assert(noBeatRes.isBeat === false && noBeatRes.newLastBeatMs === 500, 'detectBeat: no beat');

const musicPkt = musicBands.packMusicFrame(255, 128, 64, true);
assert(musicPkt.length === 4 && musicPkt[0] === 255 && musicPkt[3] === 1, 'packMusicFrame: 4-byte packed');

console.log('\n================================================================');
console.log(' 7. RULES MATCHING ASSERTIONS (rules-match.js)');
console.log('================================================================');

assert(rulesMatch.isRuleInCooldown({ cooldownMs: 5000 }, 6000, 2000) === true, 'isRuleInCooldown: active');
assert(rulesMatch.isRuleInCooldown({ cooldownMs: 2000 }, 5000, 2000) === false, 'isRuleInCooldown: expired');

assert(
  rulesMatch.formatCaption('${name} turned ON', { name: 'Monitor' }) === 'Monitor turned ON',
  'formatCaption: variable substitution'
);

const rules = [
  { id: 'r1', event: 'RELAY_TOGGLED', priority: 1 },
  { id: 'r2', event: 'RELAY_TOGGLED', priority: 5 },
  { id: 'r3', event: 'BLE_CONNECTED', priority: 10 },
];
const matching = rulesMatch.findMatchingRules(rules, 'RELAY_TOGGLED', {}, 1000, {});
assert(matching.length === 2, 'findMatchingRules: matched 2 rules for RELAY_TOGGLED');

const topRule = rulesMatch.selectHighestPriorityRule(matching);
assert(topRule && topRule.id === 'r2', 'selectHighestPriorityRule: selected r2 (prio 5)');

console.log('\n================================================================');
console.log(' 8. PROTOCOL-PACK ROUND-TRIP ASSERTIONS (protocol-pack.js)');
console.log('================================================================');

// 1. Relay State Write & Notify Round Trip
const rw = protocolPack.packRelayStateWrite(2, 1);
assert(rw.length === 2 && rw[0] === 2 && rw[1] === 1, 'packRelayStateWrite: index 2, load 1');

const rNotifyBuf = new Uint8Array([4, 1, 0, 1, 0]);
const rNotifyParsed = protocolPack.unpackRelayStateNotify(new DataView(rNotifyBuf.buffer));
assertDeepEqual(rNotifyParsed, { count: 4, loads: [1, 0, 1, 0] }, 'unpackRelayStateNotify: round-trip loads');

// 2. Relay Config Write & Notify Round Trip
const cfgWrite = protocolPack.packRelayConfigWrite(1, {
  enabled: true,
  polarity: 0,
  wiring: 1,
  bootBehavior: 2,
  gpioPin: 21,
  minSwitchMs: 2500,
  affectedByAway: true,
  name: 'Lamp',
  icon: 'lightbulb'
});
assert(cfgWrite[0] === 0x02 && cfgWrite[1] === 1, 'packRelayConfigWrite: cmd=2, idx=1');

// Create notify response for cfg (11 bytes fixed fields + 1 byte nameLen + name + 1 byte iconLen + icon)
const nameEnc = new TextEncoder().encode('Lamp');
const iconEnc = new TextEncoder().encode('lightbulb');
const cfgNotifyBuf = new Uint8Array(11 + 1 + nameEnc.length + 1 + iconEnc.length);
const cfgDv = new DataView(cfgNotifyBuf.buffer);
cfgNotifyBuf[0] = 0x00; // err OK
cfgNotifyBuf[1] = 0x02; // cmd WRITE
cfgNotifyBuf[2] = 1;    // index
cfgNotifyBuf[3] = 1;    // enabled
cfgNotifyBuf[4] = 0;    // polarity
cfgNotifyBuf[5] = 1;    // wiring
cfgNotifyBuf[6] = 2;    // bootBehavior
cfgNotifyBuf[7] = 21;   // gpioPin
cfgDv.setUint16(8, 2500, true); // minSwitchMs LE
cfgNotifyBuf[10] = 1;   // affectedByAway
cfgNotifyBuf[11] = nameEnc.length;
cfgNotifyBuf.set(nameEnc, 12);
const iconPos = 12 + nameEnc.length;
cfgNotifyBuf[iconPos] = iconEnc.length;
cfgNotifyBuf.set(iconEnc, iconPos + 1);

const parsedCfg = protocolPack.unpackRelayConfigNotify(cfgDv);
assert(
  parsedCfg.index === 1 &&
  parsedCfg.minSwitchMs === 2500 &&
  parsedCfg.name === 'Lamp' &&
  parsedCfg.icon === 'lightbulb',
  'unpackRelayConfigNotify: parsed accurately'
);

// 3. Time Sync
const timeSyncBuf = protocolPack.packTimeSync(1767225600, 330);
const timeDv = new DataView(timeSyncBuf.buffer);
assert(
  timeDv.getUint32(0, true) === 1767225600 && timeDv.getInt16(4, true) === 330,
  'packTimeSync: uint32 LE + int16 LE'
);

// 4. Schedules
const schedSet = protocolPack.packScheduleSet({
  index: 2,
  relayIndex: 1,
  weekdayMask: 0x3E,
  onHour: 9,
  onMin: 15,
  offHour: 17,
  offMin: 45,
  enabled: true,
  catchUpMin: 10
});
assert(schedSet.length === 10 && schedSet[0] === 0x02 && schedSet[4] === 9, 'packScheduleSet: length 10');

const schedDel = protocolPack.packScheduleDelete(3);
assert(schedDel.length === 2 && schedDel[0] === 0x03 && schedDel[1] === 3, 'packScheduleDelete');

// 5. Timers
const timerStart = protocolPack.packTimerStart(0, 45);
const tDv = new DataView(timerStart.buffer);
assert(timerStart[0] === 0x01 && tDv.getUint16(2, true) === 45, 'packTimerStart: 45 min LE');

const timerNotifyBuf = new Uint8Array([0x01, 0, 0x58, 0x02, 0x70, 0x17, 1, 0]);
const parsedTimer = protocolPack.unpackTimerNotify(new DataView(timerNotifyBuf.buffer));
assert(
  parsedTimer.relayIndex === 0 && parsedTimer.remainingSec === 600 && parsedTimer.totalSec === 6000,
  'unpackTimerNotify: parsed remainingSec LE'
);

// 6. Away Mode
const awaySettings = protocolPack.packAwaySettings(30, 480);
const aDv = new DataView(awaySettings.buffer);
assert(awaySettings[0] === 0x04 && aDv.getUint16(1, true) === 30 && aDv.getUint16(3, true) === 480, 'packAwaySettings');

const awayNotifyBuf = new Uint8Array([1, 30, 0, 0xE0, 1, 15, 0, 10, 0]);
const parsedAway = protocolPack.unpackAwayNotify(new DataView(awayNotifyBuf.buffer));
assert(parsedAway.state === 1 && parsedAway.maxDurMin === 480, 'unpackAwayNotify: parsed state & maxDur');

// 7. LED State Pack & Unpack Round Trip
const origLed = {
  mode: 1,
  effect: 2,
  r: 255,
  g: 100,
  b: 50,
  brightness: 80,
  speed: 15,
  autoResumeMin: 10,
  r2: 10,
  g2: 20,
  b2: 30,
  blinkOnMs: 400,
  blinkOffMs: 600
};
const packedLed = protocolPack.packLedState(origLed);
const unpackedLed = protocolPack.unpackLedState(new DataView(packedLed.buffer));
assertDeepEqual(unpackedLed, origLed, 'packLedState <-> unpackLedState round-trip match');

// 8. Music Stream
const musicStream = protocolPack.packMusicStream(200, 150, 100, 1);
assert(musicStream.length === 4 && musicStream[0] === 200 && musicStream[3] === 1, 'packMusicStream');

// 9. Feature Switches
const featSwitch = protocolPack.packFeatureSwitchWrite(5, 1);
assert(featSwitch[0] === 5 && featSwitch[1] === 1, 'packFeatureSwitchWrite');
const featUnpack = protocolPack.unpackFeatureSwitches(new DataView(new Uint8Array([1, 0, 1, 1]).buffer));
assertDeepEqual(featUnpack, [1, 0, 1, 1], 'unpackFeatureSwitches');

// 10. Call Mode
const callModeSet = protocolPack.packCallModeSettings(60);
assert(callModeSet[0] === 0x02 && callModeSet[1] === 60, 'packCallModeSettings');
const callUnpack = protocolPack.unpackCallMode(new DataView(new Uint8Array([1, 60]).buffer));
assertDeepEqual(callUnpack, { active: true, autoOffMin: 60 }, 'unpackCallMode');

// 11. HID Settings
const hidSet = protocolPack.packHidSetting(0x03, 1000);
const hidDv = new DataView(hidSet.buffer);
assert(hidSet[0] === 0x03 && hidDv.getUint16(1, true) === 1000, 'packHidSetting: autoDelay 1000ms');

const hidNotifyBuf = new Uint8Array([0, 1, 0xE8, 0x03, 1, 1, 0, 1, 0]);
const parsedHid = protocolPack.unpackHidSettings(new DataView(hidNotifyBuf.buffer));
assert(parsedHid.autoDelaySec === 1000 && parsedHid.passwordIsSet === true, 'unpackHidSettings');

// 12. System Commands
const sysCmd = protocolPack.packSystemCmd(0x0A, 'RESET');
assert(sysCmd.length === 6 && sysCmd[0] === 0x0A, 'packSystemCmd: FACTORY_RESET with "RESET"');

// 13. LED Notify Blink & Boot Settings
const notifyBlink = protocolPack.packLedNotifyBlink(1, 255, 0, 0, 3, 500);
const nbDv = new DataView(notifyBlink.buffer);
assert(notifyBlink[0] === 1 && notifyBlink[1] === 255 && nbDv.getUint16(6, true) === 500, 'packLedNotifyBlink');

const bootSet = protocolPack.packLedBootSettings(0, 1, true, false);
const parsedBoot = protocolPack.unpackLedBootSettings(new DataView(bootSet.buffer));
assertDeepEqual(parsedBoot, { behavior: 0, presetIndex: 1, bootSweep: true, bleStatus: false }, 'unpackLedBootSettings');

// 14. Device Log & Status
const logText = '[SYS] Uptime: 120s';
const logEnc = new TextEncoder().encode(logText);
assert(protocolPack.unpackDeviceLog(new DataView(logEnc.buffer)) === logText, 'unpackDeviceLog');

const statusBuf = new Uint8Array(14);
const statusDv = new DataView(statusBuf.buffer);
statusBuf[0] = 1; // resetReason
statusDv.setUint32(1, 3600, true); // uptimeSec
statusBuf[5] = 1; statusBuf[6] = 2; statusBuf[7] = 3; // version
statusDv.setUint32(8, 240000, true); // freeHeap
statusBuf[12] = 0; statusBuf[13] = 1; // driver, clients
const parsedStatus = protocolPack.unpackDeviceStatus(statusDv);
assert(parsedStatus.uptimeSec === 3600 && parsedStatus.freeHeap === 240000, 'unpackDeviceStatus');

console.log('\n================================================================');
console.log(` SUMMARY: ${totalAssertions} assertions run.`);
if (failedAssertions > 0) {
  console.error(` FAILED: ${failedAssertions} assertions failed!`);
  process.exit(1);
} else {
  console.log(` SUCCESS: All ${totalAssertions} assertions passed cleanly.`);
  process.exit(0);
}
