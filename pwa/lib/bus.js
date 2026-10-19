/**
 * bus.js — Central typed event bus.
 *
 * Purpose : Decouple BLE and Demo services from React hooks and UI components.
 * Depends : Nothing (pure JavaScript).
 * Used by : ble.js, demo.js, audio.js, useBle.js, useRelays.js, useLeds.js, useFace.js.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event.
   *
   * @param {string} event - Event name (e.g. 'ble:relay_state')
   * @param {Function} handler - Callback receiving event payload
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    // Return cleanup unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event.
   *
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      const set = this.listeners.get(event);
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with payload.
   *
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      const set = this.listeners.get(event);
      for (const handler of set) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event "${event}":`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners for all events.
   */
  clear() {
    this.listeners.clear();
  }
}

export const bus = new EventBus();
export default bus;
