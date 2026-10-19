/**
 * ble.js — Web Bluetooth GATT client service.
 *
 * Purpose : Connect to ESP32-S3 over Web Bluetooth, serialize GATT commands,
 *           subscribe to notifications, handle disconnections/reconnection,
 *           and gracefully delegate to demo.js when Demo Mode is active.
 * Depends : bus.js, store.js, uuids.js, demo.js, pure/protocol-pack.js, pure/time-math.js.
 * Used by : useBle.js, useRelays.js, useLeds.js, useSystem.js.
 */

import bus from './bus.js';
import store from './store.js';
import demo from './demo.js';
import { UUID_SERVICE, UUIDS } from './uuids.js';
import * as pack from './pure/protocol-pack.js';
import { getUnixTimestampSec, getTimezoneOffsetMinutes } from './pure/time-math.js';

class BleService {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristics = new Map();
    this.connecting = false;
    this.writeQueue = Promise.resolve();
    this.timeSyncInterval = null;

    // Check if demo mode was active previously
    if (store.isDemoMode()) {
      setTimeout(() => demo.start(), 100);
    }
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  isConnected() {
    if (demo.active) return true;
    return Boolean(this.server && this.server.connected);
  }

  // ── Connection Management ──────────────────────────────────────────────────

  async connect() {
    if (demo.active) {
      demo.stop();
    }

    if (!this.isSupported()) {
      bus.emit('system:toast', { message: 'Web Bluetooth is not supported in this browser.', type: 'error' });
      throw new Error('Web Bluetooth not supported');
    }

    if (this.connecting || this.isConnected()) return;
    this.connecting = true;
    bus.emit('ble:status', { state: 'connecting', deviceName: null, error: null });

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'SmartDesk' }],
        optionalServices: [UUID_SERVICE],
      });

      this.device.addEventListener('gattserverdisconnected', () => this.handleDisconnected());
      store.setLastDeviceId(this.device.id);

      this.server = await this.device.gatt.connect();
      this.service = await this.server.getPrimaryService(UUID_SERVICE);

      await this.discoverCharacteristics();
      await this.sendClientRole();
      await this.syncTime();
      await this.subscribeNotifications();
      await this.readInitialStates();

      this.connecting = false;
      bus.emit('ble:status', {
        state: 'connected',
        deviceName: this.device.name || 'SmartDesk',
        error: null,
      });
      bus.emit('system:toast', { message: `Connected to ${this.device.name || 'SmartDesk'}`, type: 'success' });

      // Start periodic time sync (every 30 min)
      this.startTimeSync();
    } catch (err) {
      this.connecting = false;
      this.handleDisconnected(err.message || 'Connection failed');
      throw err;
    }
  }

  async disconnect() {
    if (demo.active) {
      demo.stop();
      return;
    }
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnected();
  }

  handleDisconnected(error = null) {
    this.stopTimeSync();
    this.characteristics.clear();
    this.server = null;
    this.service = null;
    bus.emit('ble:status', { state: 'disconnected', deviceName: null, error });
  }

  async discoverCharacteristics() {
    for (const [key, uuid] of Object.entries(UUIDS)) {
      try {
        const chr = await this.service.getCharacteristic(uuid);
        this.characteristics.set(key, chr);
      } catch (err) {
        console.warn(`[BLE] Characteristic ${key} (${uuid}) not found:`, err);
      }
    }
  }

  async subscribeNotifications() {
    const notifyKeys = [
      'RELAY_STATE', 'RELAY_CONFIG', 'SCHEDULES', 'TIMERS', 'AWAY_MODE',
      'LED_STATE', 'LED_SLOTS', 'LED_PRESETS', 'LED_NOTIFY_BLINK',
      'CALL_MODE', 'FEATURE_SWITCHES', 'HID_TYPE_NOW', 'SYSTEM_CMD', 'DEVICE_STATUS'
    ];

    for (const key of notifyKeys) {
      const chr = this.characteristics.get(key);
      if (chr && chr.properties.notify) {
        try {
          await chr.startNotifications();
          chr.addEventListener('characteristicvaluechanged', (e) => this.handleNotification(key, e.target.value));
        } catch (err) {
          console.warn(`[BLE] Failed to subscribe notifications for ${key}:`, err);
        }
      }
    }
  }

  async readInitialStates() {
    const readKeys = [
      'RELAY_STATE', 'FEATURE_SWITCHES', 'LED_STATE',
      'CALL_MODE', 'AWAY_MODE', 'DEVICE_STATUS', 'HID_SETTINGS'
    ];

    for (const key of readKeys) {
      const chr = this.characteristics.get(key);
      if (chr && chr.properties.read) {
        try {
          const val = await chr.readValue();
          this.handleNotification(key, val);
        } catch (err) {
          console.warn(`[BLE] Failed to read ${key}:`, err);
        }
      }
    }
  }

  // ── Notification Parser ────────────────────────────────────────────────────

  handleNotification(key, dataView) {
    if (!dataView) return;

    switch (key) {
      case 'RELAY_STATE':
        bus.emit('ble:relay_state', pack.unpackRelayStateNotify(dataView));
        break;
      case 'RELAY_CONFIG':
        bus.emit('ble:relay_config', pack.unpackRelayConfigNotify(dataView));
        break;
      case 'TIMERS':
        bus.emit('ble:timers', pack.unpackTimerNotify(dataView));
        break;
      case 'AWAY_MODE':
        bus.emit('ble:away', pack.unpackAwayNotify(dataView));
        break;
      case 'LED_STATE':
        bus.emit('ble:led_state', pack.unpackLedState(dataView));
        break;
      case 'LED_BOOT_SETTINGS':
        bus.emit('ble:boot_settings', pack.unpackLedBootSettings(dataView));
        break;
      case 'CALL_MODE':
        bus.emit('ble:call_mode', pack.unpackCallMode(dataView));
        break;
      case 'FEATURE_SWITCHES':
        bus.emit('ble:feature_switches', pack.unpackFeatureSwitches(dataView));
        break;
      case 'DEVICE_STATUS':
        bus.emit('ble:device_status', pack.unpackDeviceStatus(dataView));
        break;
      case 'HID_SETTINGS':
        bus.emit('ble:hid_settings', pack.unpackHidSettings(dataView));
        break;
      default:
        break;
    }
  }

  // ── GATT Write Queue ───────────────────────────────────────────────────────

  enqueueWrite(charKey, buffer, writeWithoutResponse = false) {
    if (demo.active) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.writeQueue = this.writeQueue.then(async () => {
        const chr = this.characteristics.get(charKey);
        if (!chr) {
          return reject(new Error(`Characteristic ${charKey} not available`));
        }
        try {
          if (writeWithoutResponse && chr.writeValueWithoutResponse) {
            await chr.writeValueWithoutResponse(buffer);
          } else {
            await chr.writeValueWithResponse(buffer);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      }).catch((err) => {
        console.error(`[BLE Write Error] ${charKey}:`, err);
        reject(err);
      });
    });
  }

  // ── High-Level Command API (Mirrors Hardware & Demo) ───────────────────────

  async sendClientRole() {
    const role = store.getClientRole() === 'remote' ? 1 : 0;
    const buf = pack.packClientRole(role);
    return this.enqueueWrite('CLIENT_ROLE', buf);
  }

  async syncTime() {
    const unixTs = getUnixTimestampSec();
    const tzOffset = getTimezoneOffsetMinutes();
    const buf = pack.packTimeSync(unixTs, tzOffset);
    return this.enqueueWrite('TIME_SYNC', buf);
  }

  startTimeSync() {
    this.stopTimeSync();
    this.timeSyncInterval = setInterval(() => this.syncTime(), 30 * 60 * 1000);
  }

  stopTimeSync() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
      this.timeSyncInterval = null;
    }
  }

  async setRelayLoad(index, desiredLoad) {
    if (demo.active) {
      demo.setRelayLoad(index, desiredLoad);
      return;
    }
    const buf = pack.packRelayStateWrite(index, desiredLoad);
    return this.enqueueWrite('RELAY_STATE', buf);
  }

  async setRelayConfig(index, cfg) {
    if (demo.active) {
      demo.setRelayConfig(index, cfg);
      return;
    }
    const buf = pack.packRelayConfigWrite(index, cfg);
    return this.enqueueWrite('RELAY_CONFIG', buf);
  }

  async resetRelayConfig(index) {
    if (demo.active) {
      demo.resetRelayConfig(index);
      return;
    }
    const buf = pack.packRelayConfigReset(index);
    return this.enqueueWrite('RELAY_CONFIG', buf);
  }

  async testRelay(index) {
    if (demo.active) {
      demo.testRelay(index);
      return;
    }
    const buf = pack.packRelayTest(index);
    return this.enqueueWrite('RELAY_TEST', buf);
  }

  async setRelayDriver(driverType) {
    if (demo.active) {
      demo.setRelayDriver(driverType);
      return;
    }
    const buf = pack.packRelayDriver(driverType);
    return this.enqueueWrite('RELAY_DRIVER', buf);
  }

  async startTimer(relayIndex, durationMinutes) {
    if (demo.active) {
      demo.startTimer(relayIndex, durationMinutes);
      return;
    }
    const buf = pack.packTimerStart(relayIndex, durationMinutes);
    return this.enqueueWrite('TIMERS', buf);
  }

  async cancelTimer(relayIndex) {
    if (demo.active) {
      demo.cancelTimer(relayIndex);
      return;
    }
    const buf = pack.packTimerCancel(relayIndex);
    return this.enqueueWrite('TIMERS', buf);
  }

  async activateAway() {
    if (demo.active) {
      demo.activateAway();
      return;
    }
    const buf = pack.packAwayActivate();
    return this.enqueueWrite('AWAY_MODE', buf);
  }

  async cancelAway() {
    if (demo.active) {
      demo.cancelAway();
      return;
    }
    const buf = pack.packAwayCancel();
    return this.enqueueWrite('AWAY_MODE', buf);
  }

  async endAway(restorePrev = true) {
    if (demo.active) {
      demo.endAway(restorePrev);
      return;
    }
    const buf = pack.packAwayEnd(restorePrev);
    return this.enqueueWrite('AWAY_MODE', buf);
  }

  async setLedState(st) {
    if (demo.active) {
      demo.setLedState(st);
      return;
    }
    const buf = pack.packLedState(st);
    return this.enqueueWrite('LED_STATE', buf);
  }

  async testNotifyBlink(event, r, g, b, count, durationMs) {
    if (demo.active) {
      demo.triggerNotifyBlink(event, r, g, b, count, durationMs);
      return;
    }
    const buf = pack.packLedNotifyBlink(event, r, g, b, count, durationMs);
    return this.enqueueWrite('LED_NOTIFY_BLINK', buf);
  }

  async setLedBootSettings(behavior, presetIndex, bootSweep, bleStatus) {
    if (demo.active) {
      demo.setLedBootSettings({ behavior, presetIndex, bootSweep, bleStatus });
      return;
    }
    const buf = pack.packLedBootSettings(behavior, presetIndex, bootSweep, bleStatus);
    return this.enqueueWrite('LED_BOOT_SETTINGS', buf);
  }

  sendMusicStream(bass, mid, treble, beat) {
    if (demo.active) return;
    const buf = pack.packMusicStream(bass, mid, treble, beat);
    this.enqueueWrite('MUSIC_STREAM', buf, true).catch(() => {});
  }

  async toggleCallMode(active) {
    if (demo.active) {
      demo.toggleCallMode(active);
      return;
    }
    const buf = pack.packCallModeToggle(active);
    return this.enqueueWrite('CALL_MODE', buf);
  }

  async setFeatureSwitch(index, val) {
    if (demo.active) {
      demo.setFeatureSwitch(index, val);
      return;
    }
    const buf = pack.packFeatureSwitchWrite(index, val);
    return this.enqueueWrite('FEATURE_SWITCHES', buf);
  }

  async triggerHidTypeNow(path = 0) {
    if (demo.active) {
      demo.triggerHidTypeNow(path);
      return;
    }
    const buf = pack.packHidTypeNow(path);
    return this.enqueueWrite('HID_TYPE_NOW', buf);
  }

  async sendSystemCmd(cmdId, payloadStr = '') {
    if (demo.active) {
      demo.executeSystemCmd(cmdId, payloadStr);
      return;
    }
    const buf = pack.packSystemCmd(cmdId, payloadStr);
    return this.enqueueWrite('SYSTEM_CMD', buf);
  }
}

export const ble = new BleService();
export default ble;

