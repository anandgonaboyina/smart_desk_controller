/**
 * store.js — Versioned local storage service.
 *
 * Purpose : Safe persistence for user preferences, client roles, audio settings,
 *           themes, recent device IDs, and offline demo state.
 * Depends : Nothing (browser localStorage API).
 * Used by : ble.js, demo.js, hooks, screens.
 */

export const STORAGE_KEYS = {
  VERSION:        'smartdesk_version',
  CLIENT_ROLE:    'smartdesk_client_role', // 'display' | 'remote'
  DEMO_MODE:      'smartdesk_demo_mode',   // boolean
  THEME:          'smartdesk_theme',       // 'dark' | 'light' | 'midnight'
  AUDIO_ENABLED:  'smartdesk_audio_enabled',
  AUDIO_VOLUME:   'smartdesk_audio_volume', // 0.0 - 1.0
  QUIET_HOURS:    'smartdesk_quiet_hours',  // { enabled, start: "22:00", end: "08:00" }
  LAST_DEVICE_ID: 'smartdesk_last_device_id',
  DEMO_STATE:     'smartdesk_demo_state',
};

const CURRENT_VERSION = 1;

class Store {
  constructor() {
    this._isAvailable = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  isAvailable() {
    return this._isAvailable;
  }

  getItem(key, defaultValue = null) {
    if (!this._isAvailable) return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  setItem(key, value) {
    if (!this._isAvailable) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[Store] Failed to write key "${key}":`, err);
      return false;
    }
  }

  removeItem(key) {
    if (!this._isAvailable) return;
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[Store] Failed to remove key "${key}":`, err);
    }
  }

  // ── Convenience Getters / Setters ──────────────────────────────────────────

  getClientRole() {
    return this.getItem(STORAGE_KEYS.CLIENT_ROLE, 'display');
  }

  setClientRole(role) {
    this.setItem(STORAGE_KEYS.CLIENT_ROLE, role === 'remote' ? 'remote' : 'display');
  }

  isDemoMode() {
    return Boolean(this.getItem(STORAGE_KEYS.DEMO_MODE, true));
  }

  setDemoMode(enabled) {
    this.setItem(STORAGE_KEYS.DEMO_MODE, Boolean(enabled));
  }

  getTheme() {
    return this.getItem(STORAGE_KEYS.THEME, 'dark');
  }

  setTheme(theme) {
    this.setItem(STORAGE_KEYS.THEME, theme);
  }

  getAudioEnabled() {
    return this.getItem(STORAGE_KEYS.AUDIO_ENABLED, true);
  }

  setAudioEnabled(enabled) {
    this.setItem(STORAGE_KEYS.AUDIO_ENABLED, Boolean(enabled));
  }

  getAudioVolume() {
    return this.getItem(STORAGE_KEYS.AUDIO_VOLUME, 0.7);
  }

  setAudioVolume(vol) {
    const clamped = Math.max(0, Math.min(1, Number(vol) || 0));
    this.setItem(STORAGE_KEYS.AUDIO_VOLUME, clamped);
  }

  getQuietHours() {
    return this.getItem(STORAGE_KEYS.QUIET_HOURS, {
      enabled: false,
      start: '22:00',
      end: '08:00',
    });
  }

  setQuietHours(settings) {
    this.setItem(STORAGE_KEYS.QUIET_HOURS, settings);
  }

  getLastDeviceId() {
    return this.getItem(STORAGE_KEYS.LAST_DEVICE_ID, null);
  }

  setLastDeviceId(id) {
    this.setItem(STORAGE_KEYS.LAST_DEVICE_ID, id);
  }
}

export const store = new Store();
export default store;

