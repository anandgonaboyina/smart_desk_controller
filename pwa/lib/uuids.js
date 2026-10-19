/**
 * uuids.js — BLE Service & Characteristic UUID definitions.
 *
 * Purpose : Single source of UUID constants on the PWA side.
 * Depends : Nothing.
 * Used by : ble.js, protocol-pack.js, demo.js.
 *
 * MUST MATCH firmware/include/protocol.h AND docs/protocol.md EXACTLY.
 */

export const UUID_SERVICE = 'd3a00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1';

export const UUIDS = {
  PROTOCOL_VERSION:   'd3a00001-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  CLIENT_ROLE:        'd3a00002-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  RELAY_STATE:        'd3a00003-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  RELAY_CONFIG:       'd3a00004-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  RELAY_DRIVER:       'd3a00005-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  RELAY_TEST:         'd3a00006-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  TIME_SYNC:          'd3a00007-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  SCHEDULES:          'd3a00008-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  TIMERS:             'd3a00009-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  AWAY_MODE:          'd3a0000a-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  LED_STATE:          'd3a0000b-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  LED_SLOTS:          'd3a0000c-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  LED_PRESETS:        'd3a0000d-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  MUSIC_STREAM:       'd3a0000e-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  CALL_MODE:          'd3a0000f-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  FEATURE_SWITCHES:   'd3a00010-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  HID_PASSWORD:       'd3a00011-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  HID_TYPE_NOW:       'd3a00012-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  HID_CANCEL:         'd3a00013-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  HID_SETTINGS:       'd3a00014-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  HID_LOG:            'd3a00015-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  SYSTEM_CMD:         'd3a00016-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  DEVICE_STATUS:      'd3a00017-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  LED_NOTIFY_BLINK:   'd3a00018-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  LED_BOOT_SETTINGS:  'd3a00019-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
  DEVICE_LOG:         'd3a0001a-1b0e-4e6a-9b3f-c0f2a8d7e5b1',
};

