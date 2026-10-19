/**
 * protocol-pack.js — Byte packing & parsing for BLE protocol.
 *
 * Purpose : Pure serialization and deserialization of BLE characteristics data.
 * Depends : Nothing (standard ArrayBuffer / DataView / Uint8Array).
 * Used by : ble.js, demo.js.
 *
 * MUST MATCH firmware/include/protocol.h AND docs/protocol.md EXACTLY.
 *
 * Rules:
 *   - All multi-byte integers are Little-Endian.
 *   - Pure functions only: no browser APIs, no React, no globals.
 */

// ── Relay State ─────────────────────────────────────────────────────────────
// Read/Notify: [count(1), load0(1), load1(1), ..., loadN(1)]
export function unpackRelayStateNotify(dataView) {
  if (!dataView || dataView.byteLength < 1) return { count: 0, loads: [] };
  const count = dataView.getUint8(0);
  const loads = [];
  for (let i = 0; i < count && (i + 1) < dataView.byteLength; i++) {
    loads.push(dataView.getUint8(i + 1));
  }
  return { count, loads };
}

// Write: [relay_index(1), desired_load(1)]
export function packRelayStateWrite(relayIndex, desiredLoad) {
  const buf = new Uint8Array(2);
  buf[0] = relayIndex & 0xFF;
  buf[1] = desiredLoad ? 1 : 0;
  return buf;
}

// ── Relay Config ────────────────────────────────────────────────────────────
export function packRelayConfigRead(relayIndex) {
  return new Uint8Array([0x01, relayIndex & 0xFF]);
}

export function packRelayConfigReset(relayIndex) {
  return new Uint8Array([0x03, relayIndex & 0xFF]);
}

export function packRelayConfigWrite(relayIndex, cfg) {
  const nameBytes = new TextEncoder().encode(cfg.name || '').slice(0, 16);
  const iconBytes = new TextEncoder().encode(cfg.icon || '').slice(0, 16);
  const totalLen = 2 + 8 + 1 + nameBytes.length + 1 + iconBytes.length;
  const buf = new Uint8Array(totalLen);
  const dv = new DataView(buf.buffer);

  buf[0] = 0x02; // CMD WRITE
  buf[1] = relayIndex & 0xFF;
  buf[2] = cfg.enabled ? 1 : 0;
  buf[3] = cfg.polarity ? 1 : 0;
  buf[4] = cfg.wiring ? 1 : 0;
  buf[5] = cfg.bootBehavior & 0xFF;
  buf[6] = cfg.gpioPin & 0xFF;
  dv.setUint16(7, cfg.minSwitchMs || 2000, true);
  buf[9] = cfg.affectedByAway ? 1 : 0;
  buf[10] = nameBytes.length;
  buf.set(nameBytes, 11);
  const iconOffset = 11 + nameBytes.length;
  buf[iconOffset] = iconBytes.length;
  buf.set(iconBytes, iconOffset + 1);

  return buf;
}

export function unpackRelayConfigNotify(dataView) {
  if (!dataView || dataView.byteLength < 11) return null;
  const err = dataView.getUint8(0);
  const cmd = dataView.getUint8(1);
  const index = dataView.getUint8(2);
  const enabled = dataView.getUint8(3);
  const polarity = dataView.getUint8(4);
  const wiring = dataView.getUint8(5);
  const bootBehavior = dataView.getUint8(6);
  const gpioPin = dataView.getUint8(7);
  const minSwitchMs = dataView.getUint16(8, true);
  const affectedByAway = dataView.getUint8(10);

  let offset = 11;
  const nameLen = dataView.getUint8(offset++);
  const nameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, nameLen);
  const name = new TextDecoder().decode(nameBytes);
  offset += nameLen;

  let icon = '';
  if (offset < dataView.byteLength) {
    const iconLen = dataView.getUint8(offset++);
    const iconBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, iconLen);
    icon = new TextDecoder().decode(iconBytes);
  }

  return {
    err, cmd, index, enabled, polarity, wiring, bootBehavior,
    gpioPin, minSwitchMs, affectedByAway, name, icon
  };
}

// ── Time Sync ───────────────────────────────────────────────────────────────
export function packTimeSync(unixTimestampSec, tzOffsetMin) {
  const buf = new Uint8Array(6);
  const dv = new DataView(buf.buffer);
  dv.setUint32(0, unixTimestampSec, true);
  dv.setInt16(4, tzOffsetMin, true);
  return buf;
}

// ── Schedules ───────────────────────────────────────────────────────────────
export function packScheduleSet(entry) {
  const buf = new Uint8Array(10);
  buf[0] = 0x02; // CMD SET
  buf[1] = entry.index & 0xFF;
  buf[2] = entry.relayIndex & 0xFF;
  buf[3] = entry.weekdayMask & 0xFF;
  buf[4] = entry.onHour & 0xFF;
  buf[5] = entry.onMin & 0xFF;
  buf[6] = entry.offHour & 0xFF;
  buf[7] = entry.offMin & 0xFF;
  buf[8] = entry.enabled ? 1 : 0;
  buf[9] = entry.catchUpMin & 0xFF;
  return buf;
}

export function packScheduleDelete(index) {
  return new Uint8Array([0x03, index & 0xFF]);
}

// ── Timers ──────────────────────────────────────────────────────────────────
export function packTimerStart(relayIndex, durationMinutes) {
  const buf = new Uint8Array(4);
  const dv = new DataView(buf.buffer);
  buf[0] = 0x01; // START
  buf[1] = relayIndex & 0xFF;
  dv.setUint16(2, durationMinutes, true);
  return buf;
}

export function packTimerCancel(relayIndex) {
  return new Uint8Array([0x02, relayIndex & 0xFF]);
}

export function unpackTimerNotify(dataView) {
  if (!dataView || dataView.byteLength < 8) return null;
  return {
    cmd: dataView.getUint8(0),
    relayIndex: dataView.getUint8(1),
    remainingSec: dataView.getUint16(2, true),
    totalSec: dataView.getUint16(4, true),
    active: dataView.getUint8(6) !== 0,
    resumed: dataView.getUint8(7) !== 0,
  };
}

// ── Away Mode ───────────────────────────────────────────────────────────────
export function packAwayActivate() { return new Uint8Array([0x01]); }
export function packAwayCancel()   { return new Uint8Array([0x02]); }
export function packAwayEnd(restorePrev) { return new Uint8Array([0x03, restorePrev ? 1 : 0]); }
export function packAwaySettings(delaySec, maxDurMin) {
  const buf = new Uint8Array(5);
  const dv = new DataView(buf.buffer);
  buf[0] = 0x04;
  dv.setUint16(1, delaySec, true);
  dv.setUint16(3, maxDurMin, true);
  return buf;
}

export function unpackAwayNotify(dataView) {
  if (!dataView || dataView.byteLength < 9) return null;
  return {
    state: dataView.getUint8(0),
    delaySec: dataView.getUint16(1, true),
    maxDurMin: dataView.getUint16(3, true),
    remainingDelay: dataView.getUint16(5, true),
    elapsedMin: dataView.getUint16(7, true),
  };
}

// ── LED State ───────────────────────────────────────────────────────────────
export function packLedState(st) {
  const buf = new Uint8Array(15);
  const dv = new DataView(buf.buffer);
  buf[0] = st.mode & 0xFF;
  buf[1] = st.effect & 0xFF;
  buf[2] = st.r & 0xFF;
  buf[3] = st.g & 0xFF;
  buf[4] = st.b & 0xFF;
  buf[5] = st.brightness & 0xFF;
  buf[6] = st.speed & 0xFF;
  buf[7] = st.autoResumeMin & 0xFF;
  buf[8] = (st.r2 || 0) & 0xFF;
  buf[9] = (st.g2 || 0) & 0xFF;
  buf[10] = (st.b2 || 0) & 0xFF;
  dv.setUint16(11, st.blinkOnMs || 500, true);
  dv.setUint16(13, st.blinkOffMs || 500, true);
  return buf;
}

export function unpackLedState(dataView) {
  if (!dataView || dataView.byteLength < 11) return null;
  const dv = dataView;
  return {
    mode: dv.getUint8(0),
    effect: dv.getUint8(1),
    r: dv.getUint8(2),
    g: dv.getUint8(3),
    b: dv.getUint8(4),
    brightness: dv.getUint8(5),
    speed: dv.getUint8(6),
    autoResumeMin: dv.getUint8(7),
    r2: dv.getUint8(8),
    g2: dv.getUint8(9),
    b2: dv.getUint8(10),
    blinkOnMs: (dv.byteLength >= 13) ? dv.getUint16(11, true) : 500,
    blinkOffMs: (dv.byteLength >= 15) ? dv.getUint16(13, true) : 500,
  };
}

// ── Music Stream ────────────────────────────────────────────────────────────
export function packMusicStream(bass, mid, treble, beat) {
  const buf = new Uint8Array(4);
  buf[0] = Math.min(255, Math.max(0, bass));
  buf[1] = Math.min(255, Math.max(0, mid));
  buf[2] = Math.min(255, Math.max(0, treble));
  buf[3] = beat ? 1 : 0;
  return buf;
}

// ── Feature Switches ────────────────────────────────────────────────────────
export function packFeatureSwitchWrite(index, value) {
  return new Uint8Array([index & 0xFF, value ? 1 : 0]);
}

export function unpackFeatureSwitches(dataView) {
  if (!dataView) return [];
  const res = [];
  for (let i = 0; i < dataView.byteLength; i++) {
    res.push(dataView.getUint8(i));
  }
  return res;
}

// ── Client Role ─────────────────────────────────────────────────────────────
export function packClientRole(role) {
  return new Uint8Array([role ? 1 : 0]);
}

// ── Relay Driver & Test ─────────────────────────────────────────────────────
export function packRelayDriver(driverType) {
  return new Uint8Array([driverType & 0xFF]);
}

export function packRelayTest(relayIndex) {
  return new Uint8Array([relayIndex & 0xFF]);
}

// ── Call Mode ───────────────────────────────────────────────────────────────
export function packCallModeToggle(active) {
  return new Uint8Array([active ? 1 : 0]);
}

export function packCallModeSettings(autoOffMin) {
  return new Uint8Array([0x02, autoOffMin & 0xFF]);
}

export function unpackCallMode(dataView) {
  if (!dataView || dataView.byteLength < 2) return { active: false, autoOffMin: 0 };
  return {
    active: dataView.getUint8(0) !== 0,
    autoOffMin: dataView.getUint8(1),
  };
}

// ── HID & PC Unlock ─────────────────────────────────────────────────────────
export function packHidPassword(password) {
  const enc = new TextEncoder();
  const bytes = enc.encode(password || '');
  return bytes.slice(0, 32);
}

export function packHidTypeNow(path = 0) {
  return new Uint8Array([path & 0xFF]);
}

export function packHidCancel() {
  return new Uint8Array([0x01]);
}

export function packHidSetting(fieldId, val) {
  if (fieldId === 0x03) { // AUTO_DELAY (uint16 LE)
    const buf = new Uint8Array(3);
    const dv = new DataView(buf.buffer);
    buf[0] = 0x03;
    dv.setUint16(1, val, true);
    return buf;
  }
  if (fieldId === 0x07) { // ERASE_PASSWORD
    return new Uint8Array([0x07]);
  }
  return new Uint8Array([fieldId & 0xFF, val ? 1 : 0]);
}

export function unpackHidSettings(dataView) {
  if (!dataView || dataView.byteLength < 9) return null;
  return {
    signInType: dataView.getUint8(0),
    pressEnter: dataView.getUint8(1) !== 0,
    autoDelaySec: dataView.getUint16(2, true),
    autoEnabled: dataView.getUint8(4) !== 0,
    usbEnabled: dataView.getUint8(5) !== 0,
    bleEnabled: dataView.getUint8(6) !== 0,
    passwordIsSet: dataView.getUint8(7) !== 0,
    usbKbDisabled: dataView.getUint8(8) !== 0,
  };
}

// ── System Commands ─────────────────────────────────────────────────────────
export function packSystemCmd(cmdId, payloadStr = '') {
  const enc = new TextEncoder();
  const extra = enc.encode(payloadStr);
  const buf = new Uint8Array(1 + extra.length);
  buf[0] = cmdId & 0xFF;
  if (extra.length > 0) {
    buf.set(extra, 1);
  }
  return buf;
}

// ── LED Notify Blink & Boot Settings ────────────────────────────────────────
export function packLedNotifyBlink(event, r, g, b, count, durationMs) {
  const buf = new Uint8Array(8);
  const dv = new DataView(buf.buffer);
  buf[0] = event & 0xFF;
  buf[1] = r & 0xFF;
  buf[2] = g & 0xFF;
  buf[3] = b & 0xFF;
  buf[4] = count & 0xFF;
  buf[5] = 0; // reserved
  dv.setUint16(6, durationMs, true);
  return buf;
}

export function packLedBootSettings(behavior, presetIndex, bootSweep, bleStatus) {
  return new Uint8Array([
    behavior & 0xFF,
    presetIndex & 0xFF,
    bootSweep ? 1 : 0,
    bleStatus ? 1 : 0,
  ]);
}

export function unpackLedBootSettings(dataView) {
  if (!dataView || dataView.byteLength < 4) {
    return { behavior: 0, presetIndex: 0xFF, bootSweep: true, bleStatus: false };
  }
  return {
    behavior: dataView.getUint8(0),
    presetIndex: dataView.getUint8(1),
    bootSweep: dataView.getUint8(2) !== 0,
    bleStatus: dataView.getUint8(3) !== 0,
  };
}

// ── Device Status ───────────────────────────────────────────────────────────
export function unpackDeviceStatus(dataView) {
  if (!dataView || dataView.byteLength < 14) return null;
  return {
    resetReason: dataView.getUint8(0),
    uptimeSec: dataView.getUint32(1, true),
    versionMajor: dataView.getUint8(5),
    versionMinor: dataView.getUint8(6),
    versionPatch: dataView.getUint8(7),
    freeHeap: dataView.getUint32(8, true),
    relayDriver: dataView.getUint8(12),
    bleClients: dataView.getUint8(13),
  };
}

