/**
 * demo.js — Complete browser-side ESP32 firmware simulator.
 *
 * Purpose : Allows 100% testing of all UI features with ZERO physical hardware connected.
 *           Simulates relays, schedules, timers, Away mode, 12 LED effects, notification
 *           blinks, power-on behavior, call mode, HID typing, and device telemetry.
 * Depends : bus.js, store.js, pure/relay-logic.js, pure/color-math.js, pure/time-math.js.
 * Used by : ble.js, Header.js, useBle.js, DevConsole.js.
 */

import bus from './bus.js';
import store from './store.js';
import {
  RELAY_LOAD_OFF, RELAY_LOAD_ON,
  RELAY_POLARITY_ACTIVE_LOW, RELAY_WIRING_NO,
  BOOT_BEHAVIOR_LAST, BOOT_BEHAVIOR_OFF
} from './pure/relay-logic.js';

class DemoSimulator {
  constructor() {
    this.active = false;
    this.intervalId = null;
    this.uptimeSec = 0;

    // ── Initial State ────────────────────────────────────────────────────────
    this.driverType = 0; // 0 = GPIO (4-ch), 1 = 595 (8-ch)
    this.relayCount = 4;
    this.loads = [0, 0, 0, 0];
    this.lastSwitchMs = [0, 0, 0, 0, 0, 0, 0, 0];

    this.configs = [
      {
        enabled: 1, polarity: RELAY_POLARITY_ACTIVE_LOW, wiring: RELAY_WIRING_NO,
        bootBehavior: BOOT_BEHAVIOR_LAST, gpioPin: 4, minSwitchMs: 2000,
        affectedByAway: 1, name: 'Desk Lamp', icon: '💡'
      },
      {
        enabled: 1, polarity: RELAY_POLARITY_ACTIVE_LOW, wiring: RELAY_WIRING_NO,
        bootBehavior: BOOT_BEHAVIOR_LAST, gpioPin: 5, minSwitchMs: 2000,
        affectedByAway: 1, name: 'Monitor Power', icon: '🖥️'
      },
      {
        enabled: 1, polarity: RELAY_POLARITY_ACTIVE_LOW, wiring: RELAY_WIRING_NO,
        bootBehavior: BOOT_BEHAVIOR_LAST, gpioPin: 6, minSwitchMs: 2000,
        affectedByAway: 0, name: 'Audio Amp', icon: '🔊'
      },
      {
        enabled: 1, polarity: RELAY_POLARITY_ACTIVE_LOW, wiring: RELAY_WIRING_NO,
        bootBehavior: BOOT_BEHAVIOR_OFF, gpioPin: 7, minSwitchMs: 2000,
        affectedByAway: 1, name: 'Soldering Iron', icon: '🔌'
      },
      // 595 extra channels (initially hidden)
      { enabled: 0, polarity: 0, wiring: 0, bootBehavior: 1, gpioPin: 0, minSwitchMs: 2000, affectedByAway: 1, name: 'Fan', icon: '🌀' },
      { enabled: 0, polarity: 0, wiring: 0, bootBehavior: 1, gpioPin: 0, minSwitchMs: 2000, affectedByAway: 1, name: 'Charger', icon: '🔋' },
      { enabled: 0, polarity: 0, wiring: 0, bootBehavior: 1, gpioPin: 0, minSwitchMs: 2000, affectedByAway: 0, name: 'Aux 1', icon: '⚡' },
      { enabled: 0, polarity: 0, wiring: 0, bootBehavior: 1, gpioPin: 0, minSwitchMs: 2000, affectedByAway: 0, name: 'Aux 2', icon: '⚡' },
    ];

    // Schedules
    this.schedules = [
      {
        index: 0, relayIndex: 0, weekdayMask: 0x3E, // Mon-Fri
        onHour: 9, onMin: 0, offHour: 18, offMin: 30,
        enabled: true, catchUpMin: 15
      }
    ];

    // Timers
    this.timers = [
      { active: false, remainingSec: 0, totalSec: 0, resumed: false },
      { active: false, remainingSec: 0, totalSec: 0, resumed: false },
      { active: false, remainingSec: 0, totalSec: 0, resumed: false },
      { active: false, remainingSec: 0, totalSec: 0, resumed: false },
    ];

    // Away Mode
    this.away = {
      state: 0, // 0=IDLE, 1=COUNTDOWN, 2=ACTIVE
      delaySec: 60,
      maxDurMin: 0,
      remainingDelay: 0,
      elapsedMin: 0,
      savedLoads: [0, 0, 0, 0],
    };

    // LED State & Additions
    this.ledState = {
      mode: 1, // 1=MANUAL
      effect: 0, // 0=SOLID
      r: 64, g: 150, b: 255, // Calm Cyan
      brightness: 75,
      speed: 128,
      autoResumeMin: 0,
      r2: 255, g2: 100, b2: 0,
      blinkOnMs: 500,
      blinkOffMs: 500,
    };

    this.ledBootSettings = {
      behavior: 0, // 0=last state, 1=preset, 2=off
      presetIndex: 0xFF,
      bootSweep: true,
      bleStatus: false,
    };

    this.ledSlots = [];
    this.ledPresets = [
      { index: 0, name: 'Warm White', r: 255, g: 180, b: 60, brightness: 70, effect: 0, speed: 128, r2: 0, g2: 0, b2: 0 },
      { index: 1, name: 'Neon Cyber', r: 0, g: 255, b: 200, brightness: 80, effect: 1, speed: 100, r2: 255, g2: 0, b2: 128 },
      { index: 2, name: 'Focus Amber', r: 255, g: 120, b: 0, brightness: 60, effect: 0, speed: 128, r2: 0, g2: 0, b2: 0 },
    ];

    // Call Mode
    this.callMode = {
      active: false,
      autoOffMin: 45,
    };

    // Feature Switches (13 switches)
    this.featureSwitches = [
      0, // PC_UNLOCK
      1, // USB_TYPING
      0, // BLE_HID
      0, // AUTO_TYPE
      1, // SCHEDULER
      1, // TIMERS
      1, // AWAY_MODE
      1, // LED_STRIP
      1, // LED_AUTO
      1, // MUSIC_SYNC
      1, // CALL_MODE
      0, // RELAY_LED_LINK
      0, // DAILY_REBOOT
    ];

    // HID Settings & Log
    this.hidSettings = {
      signInType: 0,
      pressEnter: true,
      autoDelaySec: 3,
      autoEnabled: false,
      usbEnabled: true,
      bleEnabled: false,
      passwordIsSet: true,
      usbKbDisabled: false,
    };
    this.hidLog = [
      { timestamp: Math.floor(Date.now() / 1000) - 3600, path: 1, reason: 0, success: 1 }
    ];
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start() {
    if (this.active) return;
    this.active = true;
    store.setDemoMode(true);

    // Emit initial status
    bus.emit('ble:status', {
      state: 'connected',
      deviceName: 'SmartDesk-Demo (Simulated)',
      error: null
    });

    this.broadcastAll();

    // Start 1 Hz simulation clock
    this.intervalId = setInterval(() => this.tick(), 1000);
    bus.emit('demo:toggle', true);
    bus.emit('system:toast', { message: 'Demo Mode active (no hardware required)', type: 'info' });
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    store.setDemoMode(false);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    bus.emit('ble:status', {
      state: 'disconnected',
      deviceName: null,
      error: null
    });
    bus.emit('demo:toggle', false);
  }

  toggle() {
    if (this.active) {
      this.stop();
    } else {
      this.start();
    }
  }

  broadcastAll() {
    bus.emit('ble:relay_state', { count: this.relayCount, loads: this.loads.slice(0, this.relayCount) });
    this.configs.slice(0, this.relayCount).forEach((_, idx) => this.broadcastRelayConfig(idx));
    bus.emit('ble:schedules', this.schedules);
    bus.emit('ble:away', this.away);
    bus.emit('ble:led_state', this.ledState);
    bus.emit('ble:led_presets', this.ledPresets);
    bus.emit('ble:boot_settings', this.ledBootSettings);
    bus.emit('ble:call_mode', this.callMode);
    bus.emit('ble:feature_switches', this.featureSwitches);
    bus.emit('ble:hid_settings', this.hidSettings);
    bus.emit('ble:device_status', this.getDeviceStatus());
  }

  broadcastRelayConfig(index) {
    if (index >= 0 && index < this.configs.length) {
      bus.emit('ble:relay_config', {
        err: 0, cmd: 2, index,
        ...this.configs[index]
      });
    }
  }

  getDeviceStatus() {
    return {
      resetReason: 1, // Power-on
      uptimeSec: this.uptimeSec,
      versionMajor: 1,
      versionMinor: 0,
      versionPatch: 0,
      freeHeap: 298450 - (this.uptimeSec % 1000),
      relayDriver: this.driverType,
      bleClients: 1,
    };
  }

  // ── 1 Hz Clock Tick ────────────────────────────────────────────────────────

  tick() {
    this.uptimeSec++;

    // 1. Tick Timers
    for (let i = 0; i < this.timers.length; i++) {
      const tm = this.timers[i];
      if (tm.active) {
        tm.remainingSec = Math.max(0, tm.remainingSec - 1);
        if (tm.remainingSec === 0) {
          tm.active = false;
          this.setRelayLoad(i, RELAY_LOAD_OFF, 'Timer expired');
          bus.emit('audio:play', 'timer_done');
          bus.emit('face:expression', 'HAPPY');
          bus.emit('caption:show', { text: `Timer finished for ${this.configs[i]?.name || 'Relay ' + (i + 1)}`, durationMs: 4000 });
          this.triggerNotifyBlink(0, 0, 255, 0, 3, 2000); // Green flash
        }
        bus.emit('ble:timers', {
          cmd: 1, relayIndex: i,
          remainingSec: tm.remainingSec,
          totalSec: tm.totalSec,
          active: tm.active,
          resumed: false
        });
      }
    }

    // 2. Tick Away Mode Countdown
    if (this.away.state === 1) { // COUNTDOWN
      this.away.remainingDelay = Math.max(0, this.away.remainingDelay - 1);
      if (this.away.remainingDelay === 0) {
        this.away.state = 2; // ACTIVE
        // Turn off affected relays
        for (let i = 0; i < this.relayCount; i++) {
          if (this.configs[i]?.affectedByAway) {
            this.setRelayLoad(i, RELAY_LOAD_OFF, 'Away mode activated');
          }
        }
        bus.emit('audio:play', 'away_enter');
        bus.emit('face:expression', 'AWAY');
        bus.emit('caption:show', { text: 'Away mode active — desk safe', durationMs: 4000 });
        this.triggerNotifyBlink(1, 255, 128, 0, 2, 1500); // Amber flash
      }
      bus.emit('ble:away', { ...this.away });
    }

    // 3. Periodic Telemetry (every 5 seconds)
    if (this.uptimeSec % 5 === 0) {
      bus.emit('ble:device_status', this.getDeviceStatus());
    }
  }

  // ── Relay Control ──────────────────────────────────────────────────────────

  setRelayLoad(index, desiredLoad, reason = 'User toggle') {
    if (index < 0 || index >= this.relayCount) return;

    // Away Mode force-off lock
    if (this.away.state === 2 && this.configs[index]?.affectedByAway && desiredLoad === RELAY_LOAD_ON) {
      bus.emit('system:toast', { message: 'Blocked by Away mode lock', type: 'error' });
      return;
    }

    const prev = this.loads[index];
    this.loads[index] = desiredLoad ? 1 : 0;

    bus.emit('ble:relay_state', {
      count: this.relayCount,
      loads: this.loads.slice(0, this.relayCount)
    });

    if (prev !== this.loads[index]) {
      bus.emit('audio:play', 'relay_click');
      bus.emit('face:expression', desiredLoad ? 'HAPPY' : 'NEUTRAL');
      const name = this.configs[index]?.name || `Relay ${index + 1}`;
      bus.emit('caption:show', { text: `${name} turned ${desiredLoad ? 'ON' : 'OFF'}`, durationMs: 3000 });
    }
  }

  setRelayConfig(index, cfg) {
    if (index < 0 || index >= this.configs.length) return;
    this.configs[index] = { ...this.configs[index], ...cfg };
    this.broadcastRelayConfig(index);
    bus.emit('system:toast', { message: `Saved settings for ${cfg.name || 'Relay ' + (index + 1)}`, type: 'success' });
  }

  resetRelayConfig(index) {
    if (index < 0 || index >= this.configs.length) return;
    this.configs[index] = {
      enabled: 1, polarity: 0, wiring: 0, bootBehavior: 0,
      gpioPin: 4 + index, minSwitchMs: 2000, affectedByAway: 1,
      name: `Relay ${index + 1}`, icon: '⚡'
    };
    this.broadcastRelayConfig(index);
  }

  testRelay(index) {
    if (index < 0 || index >= this.relayCount) return;
    const original = this.loads[index];
    this.setRelayLoad(index, original ? 0 : 1, 'Pulse test');
    setTimeout(() => {
      this.setRelayLoad(index, original, 'Pulse test revert');
    }, 1000);
  }

  setRelayDriver(driverType) {
    this.driverType = driverType ? 1 : 0;
    this.relayCount = this.driverType === 1 ? 8 : 4;
    bus.emit('ble:device_status', this.getDeviceStatus());
    bus.emit('ble:relay_state', { count: this.relayCount, loads: this.loads.slice(0, this.relayCount) });
    bus.emit('system:toast', { message: `Switched driver to ${this.driverType ? '74HC595 (8 ch)' : 'Direct GPIO (4 ch)'}`, type: 'info' });
  }

  // ── Timers ─────────────────────────────────────────────────────────────────

  startTimer(relayIndex, durationMinutes) {
    if (relayIndex < 0 || relayIndex >= this.timers.length) return;
    const durSec = Math.max(1, durationMinutes * 60);
    this.timers[relayIndex] = {
      active: true,
      remainingSec: durSec,
      totalSec: durSec,
      resumed: false,
    };
    // Ensure relay is ON
    this.setRelayLoad(relayIndex, RELAY_LOAD_ON, 'Timer started');
    bus.emit('ble:timers', {
      cmd: 1, relayIndex,
      remainingSec: durSec,
      totalSec: durSec,
      active: true,
      resumed: false
    });
  }

  cancelTimer(relayIndex) {
    if (relayIndex < 0 || relayIndex >= this.timers.length) return;
    this.timers[relayIndex].active = false;
    this.timers[relayIndex].remainingSec = 0;
    bus.emit('ble:timers', {
      cmd: 2, relayIndex,
      remainingSec: 0,
      totalSec: 0,
      active: false,
      resumed: false
    });
  }

  // ── Away Mode ──────────────────────────────────────────────────────────────

  activateAway() {
    this.away.state = 1; // COUNTDOWN
    this.away.remainingDelay = this.away.delaySec || 60;
    this.away.savedLoads = [...this.loads];
    bus.emit('ble:away', { ...this.away });
    bus.emit('caption:show', { text: `Away countdown: ${this.away.remainingDelay}s`, durationMs: 3000 });
  }

  cancelAway() {
    this.away.state = 0;
    this.away.remainingDelay = 0;
    bus.emit('ble:away', { ...this.away });
    bus.emit('caption:show', { text: 'Away mode cancelled', durationMs: 2500 });
  }

  endAway(restorePrev = true) {
    this.away.state = 0;
    this.away.remainingDelay = 0;
    if (restorePrev && this.away.savedLoads) {
      for (let i = 0; i < this.relayCount; i++) {
        this.setRelayLoad(i, this.away.savedLoads[i] || 0, 'Away returned');
      }
    }
    bus.emit('ble:away', { ...this.away });
    bus.emit('face:expression', 'HAPPY');
    bus.emit('caption:show', { text: 'Welcome back! Desk active', durationMs: 3000 });
  }

  // ── LED Strip & Additions ──────────────────────────────────────────────────

  setLedState(st) {
    this.ledState = { ...this.ledState, ...st };
    bus.emit('ble:led_state', { ...this.ledState });
  }

  triggerNotifyBlink(event, r, g, b, count, durationMs) {
    bus.emit('ble:notify_blink', { event, r, g, b, count, durationMs });
  }

  setLedBootSettings(settings) {
    this.ledBootSettings = { ...this.ledBootSettings, ...settings };
    bus.emit('ble:boot_settings', { ...this.ledBootSettings });
  }

  // ── Call Mode ──────────────────────────────────────────────────────────────

  toggleCallMode(active) {
    this.callMode.active = Boolean(active);
    bus.emit('ble:call_mode', { ...this.callMode });
    if (this.callMode.active) {
      bus.emit('face:expression', 'BUSY');
      bus.emit('caption:show', { text: 'Deep focus — Call active', durationMs: 4000 });
      bus.emit('audio:play', 'call_start');
    } else {
      bus.emit('face:expression', 'NEUTRAL');
      bus.emit('caption:show', { text: 'Call ended', durationMs: 2500 });
    }
  }

  // ── Feature Switches ───────────────────────────────────────────────────────

  setFeatureSwitch(index, val) {
    if (index >= 0 && index < this.featureSwitches.length) {
      this.featureSwitches[index] = val ? 1 : 0;
      bus.emit('ble:feature_switches', [...this.featureSwitches]);
    }
  }

  setHidPassword(password) {
    this.hidSettings.passwordIsSet = Boolean(password && password.length > 0);
    bus.emit('ble:hid_settings', { ...this.hidSettings });
    this.emitLog('INFO', 'HID', 'Password updated (write-only) [SIMULATED]');
    bus.emit('system:toast', { message: 'Password saved to device', type: 'success' });
  }

  eraseHidPassword() {
    this.hidSettings.passwordIsSet = false;
    bus.emit('ble:hid_settings', { ...this.hidSettings });
    this.emitLog('INFO', 'HID', 'Password erased from NVS [SIMULATED]');
    bus.emit('system:toast', { message: 'Password erased', type: 'info' });
  }

  setHidSetting(fieldId, val) {
    if (fieldId === 0x01) this.hidSettings.signInType = val;
    if (fieldId === 0x02) this.hidSettings.pressEnter = Boolean(val);
    if (fieldId === 0x03) this.hidSettings.autoDelaySec = val;
    if (fieldId === 0x04) this.hidSettings.autoEnabled = Boolean(val);
    if (fieldId === 0x05) this.hidSettings.usbEnabled = Boolean(val);
    if (fieldId === 0x06) this.hidSettings.bleEnabled = Boolean(val);
    if (fieldId === 0x07) this.hidSettings.passwordIsSet = false;
    if (fieldId === 0x08) this.hidSettings.usbKbDisabled = Boolean(val);
    bus.emit('ble:hid_settings', { ...this.hidSettings });
  }

  triggerHidTypeNow(path = 0) {
    bus.emit('caption:show', { text: 'Simulating PC unlock typing...', durationMs: 3000 });
    bus.emit('face:expression', 'TALKING');
    setTimeout(() => {
      bus.emit('audio:play', 'unlock_success');
      bus.emit('face:expression', 'HAPPY');
      bus.emit('caption:show', { text: 'PC Unlocked successfully!', durationMs: 3000 });
      this.hidLog.unshift({
        timestamp: Math.floor(Date.now() / 1000),
        path, reason: 0, success: 1
      });
      bus.emit('ble:hid_status', { error: 0, path, status: 1 });
    }, 1500);
  }

  // ── Logging & Diagnostics (Simulated) ─────────────────────────────────────

  emitLog(level, tag, text) {
    const s = Math.floor(this.uptimeSec);
    const ms = Math.floor((this.uptimeSec % 1) * 1000);
    const line = `[${String(s).padStart(4, ' ')}.${String(ms).padStart(3, '0')}] [${level}] [${tag}] ${text} [SIMULATED]`;
    bus.emit('ble:device_log', line);
  }

  runSelfTest() {
    this.emitLog('INFO', 'TEST', '==================================================');
    this.emitLog('INFO', 'TEST', '       SMART DESK CONTROLLER SELF-TEST (SIMULATED)');
    this.emitLog('INFO', 'TEST', '==================================================');
    this.emitLog('INFO', 'TEST', '[PASS] Reset Reason             : OK (Power-on)');
    this.emitLog('INFO', 'TEST', '[PASS] NVS Storage              : OK (Read/Write verified)');
    this.emitLog('INFO', 'TEST', '[PASS] Relay Pin Map            : OK (GPIO4,5,6,7 validated)');
    this.emitLog('INFO', 'TEST', '[PASS] Relay Electrical         : OK (Readback matches safe OFF)');
    this.emitLog('INFO', 'TEST', '[PASS] LED Driver               : OK (8x WS2812B GRB on GPIO8)');
    this.emitLog('INFO', 'TEST', '[PASS] BLE GATT Engine          : OK (Advertising SmartDesk)');
    this.emitLog('INFO', 'TEST', '[PASS] USB Keyboard HID         : OK (TinyUSB attached)');
    this.emitLog('INFO', 'TEST', '[PASS] System Heap Memory       : OK (298450 bytes free)');
    this.emitLog('INFO', 'TEST', '[PASS] Protocol Version         : OK (v1)');
    this.emitLog('INFO', 'TEST', '--------------------------------------------------');
    this.emitLog('INFO', 'TEST', 'Self-Test Finished: ALL TESTS PASSED [SIMULATED]');
    this.emitLog('INFO', 'TEST', '==================================================');
    bus.emit('system:toast', { message: 'Self-test completed: All tests passed (Simulated)', type: 'success' });
  }

  // ── System Commands ────────────────────────────────────────────────────────

  executeSystemCmd(cmdId, payloadStr = '') {
    switch (cmdId) {
      case 0x01: // Reboot
        bus.emit('system:toast', { message: 'ESP32 Rebooting...', type: 'warning' });
        this.uptimeSec = 0;
        setTimeout(() => this.broadcastAll(), 1500);
        break;
      case 0x0B: // All Load OFF
        for (let i = 0; i < this.relayCount; i++) this.loads[i] = 0;
        bus.emit('ble:relay_state', { count: this.relayCount, loads: this.loads.slice(0, this.relayCount) });
        this.emitLog('INFO', 'RELAY', 'All loads turned OFF by system command');
        bus.emit('system:toast', { message: 'All loads turned OFF', type: 'info' });
        break;
      case 0x0C: // Safe State
        for (let i = 0; i < this.relayCount; i++) this.loads[i] = 0;
        this.ledState.mode = 0;
        bus.emit('ble:relay_state', { count: this.relayCount, loads: this.loads.slice(0, this.relayCount) });
        bus.emit('ble:led_state', { ...this.ledState });
        this.emitLog('INFO', 'SYS', 'Safe state applied by system command');
        bus.emit('system:toast', { message: 'Safe state applied', type: 'info' });
        break;
      case 0x0D: // Set Log Level
        this.emitLog('INFO', 'SYS', `Log level set to ${payloadStr}`);
        break;
      case 0x0E: // Set Log Enabled
        this.emitLog('INFO', 'SYS', `Logging ${payloadStr ? 'ENABLED' : 'DISABLED'}`);
        break;
      case 0x0F: // Run Self-Test
        this.runSelfTest();
        break;
      default:
        break;
    }
  }
}


export const demo = new DemoSimulator();
export default demo;

