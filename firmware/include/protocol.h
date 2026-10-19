/**
 * protocol.h — BLE GATT protocol definition (firmware side).
 *
 * Purpose : Single source of truth for UUIDs, command IDs, error codes,
 *           byte layouts, and field offsets used in BLE communication.
 *           The PWA mirror is pwa/lib/pure/protocol-pack.js.
 *           The human-readable spec is docs/protocol.md.
 *           ALL THREE FILES MUST MATCH EXACTLY.
 * Depends : Nothing (standalone header).
 * Used by : ble_service.cpp, and any module that packs/parses BLE data.
 * Feature : Always compiled (BLE is core).
 *
 * Rules:
 *   - All multi-byte integers are LITTLE-ENDIAN.
 *   - Later protocol versions only ADD characteristics or command IDs.
 *   - Never reuse or renumber an existing ID.
 */

#pragma once
#include <stdint.h>

/* ════════════════════════════════════════════════════════════════════
 *  PROTOCOL VERSION
 * ════════════════════════════════════════════════════════════════════ */
#define PROTOCOL_VERSION        1

/* ════════════════════════════════════════════════════════════════════
 *  SERVICE & CHARACTERISTIC UUIDs
 *
 *  Base: d3a0XXXX-1b0e-4e6a-9b3f-c0f2a8d7e5b1
 *  Replace XXXX with the 4-digit hex suffix below.
 * ════════════════════════════════════════════════════════════════════ */

#define UUID_SERVICE            "d3a00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1"

// ── Read-only ───────────────────────────────────────────────────────
#define UUID_PROTOCOL_VERSION   "d3a00001-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R

// ── Client management ───────────────────────────────────────────────
#define UUID_CLIENT_ROLE        "d3a00002-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W

// ── Relay system ────────────────────────────────────────────────────
#define UUID_RELAY_STATE        "d3a00003-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N
#define UUID_RELAY_CONFIG       "d3a00004-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N
#define UUID_RELAY_DRIVER       "d3a00005-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W
#define UUID_RELAY_TEST         "d3a00006-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W

// ── Time & scheduling ───────────────────────────────────────────────
#define UUID_TIME_SYNC          "d3a00007-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W
#define UUID_SCHEDULES          "d3a00008-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N
#define UUID_TIMERS             "d3a00009-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N

// ── Away mode ───────────────────────────────────────────────────────
#define UUID_AWAY_MODE          "d3a0000a-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N

// ── LED strip ───────────────────────────────────────────────────────
#define UUID_LED_STATE          "d3a0000b-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N
#define UUID_LED_SLOTS          "d3a0000c-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N
#define UUID_LED_PRESETS        "d3a0000d-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N

// ── Music ───────────────────────────────────────────────────────────
#define UUID_MUSIC_STREAM       "d3a0000e-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W (no response)

// ── Call mode ───────────────────────────────────────────────────────
#define UUID_CALL_MODE          "d3a0000f-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N

// ── Feature switches ────────────────────────────────────────────────
#define UUID_FEATURE_SWITCHES   "d3a00010-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N

// ── PC unlock / HID ─────────────────────────────────────────────────
#define UUID_HID_PASSWORD       "d3a00011-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W
#define UUID_HID_TYPE_NOW       "d3a00012-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W/N
#define UUID_HID_CANCEL         "d3a00013-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W
#define UUID_HID_SETTINGS       "d3a00014-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W
#define UUID_HID_LOG            "d3a00015-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/N

// ── System & Diagnostics ────────────────────────────────────────────
#define UUID_SYSTEM_CMD         "d3a00016-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // W/N
#define UUID_DEVICE_STATUS      "d3a00017-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/N
#define UUID_LED_NOTIFY_BLINK   "d3a00018-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W/N
#define UUID_LED_BOOT_SETTINGS  "d3a00019-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/W
#define UUID_DEVICE_LOG         "d3a0001a-1b0e-4e6a-9b3f-c0f2a8d7e5b1"  // R/N


/* ════════════════════════════════════════════════════════════════════
 *  ERROR CODES  (byte 0 of every notify response)
 * ════════════════════════════════════════════════════════════════════ */
#define ERR_OK                  0x00
#define ERR_FEATURE_DISABLED    0x01
#define ERR_INVALID_PARAM       0x02
#define ERR_BUSY                0x03
#define ERR_RATE_LIMITED        0x04
#define ERR_AUTH_REQUIRED       0x05
#define ERR_INVALID_PIN_NUM     0x06  // GPIO not in safe list
#define ERR_DUPLICATE_PIN       0x07  // GPIO already used by another relay
#define ERR_UNSAFE_GPIO         0x08  // GPIO is strapping/flash/USB
#define ERR_NOT_FOUND           0x09
#define ERR_BUFFER_OVERFLOW     0x0A
#define ERR_NVS_ERROR           0x0B
#define ERR_BLOCKED_BY_AWAY     0x0C
#define ERR_COOLDOWN_ACTIVE     0x0D
#define ERR_IN_PROGRESS         0x0E
#define ERR_CONFIRM_REQUIRED    0x0F
#define ERR_PHOTOSENSITIVITY    0x10


/* ════════════════════════════════════════════════════════════════════
 *  CLIENT ROLES  (written to UUID_CLIENT_ROLE on connect)
 * ════════════════════════════════════════════════════════════════════ */
#define ROLE_DISPLAY            0x00  // Laptop fullscreen (face, captions)
#define ROLE_REMOTE             0x01  // Phone compact controls


/* ════════════════════════════════════════════════════════════════════
 *  RELAY STATE  (UUID_RELAY_STATE)
 *
 *  Read/Notify: [count(1), load0(1), load1(1), ..., loadN(1)]
 *    load = 0 (OFF) or 1 (ON) — always in LOAD terms
 *
 *  Write: [relay_index(1), desired_load(1)]
 *    Response: full state notify to ALL clients
 * ════════════════════════════════════════════════════════════════════ */
#define RELAY_LOAD_OFF          0
#define RELAY_LOAD_ON           1


/* ════════════════════════════════════════════════════════════════════
 *  RELAY CONFIG  (UUID_RELAY_CONFIG)
 *
 *  Sub-commands (byte 0 of write):
 * ════════════════════════════════════════════════════════════════════ */
#define RCFG_CMD_READ           0x01  // [0x01, index] → notify with config
#define RCFG_CMD_WRITE          0x02  // [0x02, index, ...config] → notify
#define RCFG_CMD_RESET          0x03  // [0x03, index] → reset to defaults

/*  Config payload (after cmd + index):
 *  Offset  Size  Field
 *  0       1     enabled         (0/1)
 *  1       1     polarity        (0=active-LOW, 1=active-HIGH)
 *  2       1     wiring          (0=NO, 1=NC)
 *  3       1     boot_behavior   (0=last, 1=always-off, 2=always-on)
 *  4       1     gpio_pin
 *  5       2     min_switch_ms   (uint16 LE)
 *  7       1     affected_by_away (0/1)
 *  8       1     name_len        (0-16)
 *  9       N     name            (UTF-8, NOT null-terminated)
 *  9+N     1     icon_len        (0-16)
 *  10+N    M     icon            (UTF-8 emoji or keyword)
 */
#define RCFG_OFF_ENABLED        0
#define RCFG_OFF_POLARITY       1
#define RCFG_OFF_WIRING         2
#define RCFG_OFF_BOOT           3
#define RCFG_OFF_PIN            4
#define RCFG_OFF_MIN_SW_LO      5
#define RCFG_OFF_MIN_SW_HI      6
#define RCFG_OFF_AWAY           7
#define RCFG_OFF_NAME_LEN       8
// name bytes follow at offset 9
// then icon_len (1 byte), icon bytes

#define RCFG_MAX_NAME           16
#define RCFG_MAX_ICON           16

/* Polarity values */
#define POLARITY_ACTIVE_LOW     0
#define POLARITY_ACTIVE_HIGH    1

/* Wiring values */
#define WIRING_NO               0   // Normally Open
#define WIRING_NC               1   // Normally Closed

/* Boot behavior */
#define BOOT_LAST_STATE         0
#define BOOT_ALWAYS_OFF         1
#define BOOT_ALWAYS_ON          2


/* ════════════════════════════════════════════════════════════════════
 *  RELAY DRIVER  (UUID_RELAY_DRIVER)
 *
 *  Read: [driver_type(1)]
 *  Write: [driver_type(1)] — triggers reboot warning/confirm
 * ════════════════════════════════════════════════════════════════════ */
#define DRIVER_GPIO             0
#define DRIVER_595              1


/* ════════════════════════════════════════════════════════════════════
 *  RELAY TEST  (UUID_RELAY_TEST)
 *
 *  Write: [relay_index(1)]   — pulses for 1 second
 *  Notify: [error(1), relay_index(1)]
 * ════════════════════════════════════════════════════════════════════ */
#define RELAY_TEST_PULSE_MS     1000


/* ════════════════════════════════════════════════════════════════════
 *  TIME SYNC  (UUID_TIME_SYNC)
 *
 *  Write: [unix_ts(4 LE), tz_offset_min(2 LE, signed)]
 *    unix_ts = seconds since 1970-01-01 00:00 UTC
 *    tz_offset_min = local offset from UTC in minutes (+330 = IST)
 * ════════════════════════════════════════════════════════════════════ */
#define TSYNC_SIZE              6


/* ════════════════════════════════════════════════════════════════════
 *  SCHEDULES  (UUID_SCHEDULES)
 *
 *  Sub-commands (byte 0):
 * ════════════════════════════════════════════════════════════════════ */
#define SCHED_CMD_LIST          0x01  // [] → notify each schedule
#define SCHED_CMD_SET           0x02  // [0x02, ...schedule] → notify
#define SCHED_CMD_DELETE        0x03  // [0x03, sched_index] → notify

/*  Schedule payload (after cmd byte):
 *  Offset  Size  Field
 *  0       1     schedule_index  (0-15)
 *  1       1     relay_index     (0-7)
 *  2       1     weekday_mask    (bit0=Sun, bit1=Mon, ..., bit6=Sat)
 *  3       1     on_hour         (0-23, 0xFF = no on-action)
 *  4       1     on_min          (0-59)
 *  5       1     off_hour        (0-23, 0xFF = no off-action)
 *  6       1     off_min         (0-59)
 *  7       1     enabled         (0/1)
 *  8       1     catch_up_min    (0 = off, 1-60 = window)
 */
#define SCHED_OFF_INDEX         0
#define SCHED_OFF_RELAY         1
#define SCHED_OFF_WEEKDAY       2
#define SCHED_OFF_ON_HOUR       3
#define SCHED_OFF_ON_MIN        4
#define SCHED_OFF_OFF_HOUR      5
#define SCHED_OFF_OFF_MIN       6
#define SCHED_OFF_ENABLED       7
#define SCHED_OFF_CATCHUP       8
#define SCHED_PAYLOAD_SIZE      9

#define SCHED_NO_ACTION         0xFF  // Hour value meaning "no on/off action"


/* ════════════════════════════════════════════════════════════════════
 *  TIMERS  (UUID_TIMERS)
 *
 *  Sub-commands (byte 0):
 * ════════════════════════════════════════════════════════════════════ */
#define TIMER_CMD_START         0x01  // [0x01, relay(1), dur_min(2 LE)]
#define TIMER_CMD_CANCEL        0x02  // [0x02, relay(1)]
#define TIMER_CMD_LIST          0x03  // [] → notify each active timer

/*  Timer notify payload (after error byte):
 *  Offset  Size  Field
 *  0       1     cmd echo
 *  1       1     relay_index
 *  2       2     remaining_sec   (uint16 LE)
 *  4       2     total_sec       (uint16 LE)
 *  6       1     active          (0/1)
 *  7       1     resumed         (0/1, set on boot resume)
 */
#define TIMER_OFF_CMD           0
#define TIMER_OFF_RELAY         1
#define TIMER_OFF_REMAINING_LO  2
#define TIMER_OFF_REMAINING_HI  3
#define TIMER_OFF_TOTAL_LO      4
#define TIMER_OFF_TOTAL_HI      5
#define TIMER_OFF_ACTIVE        6
#define TIMER_OFF_RESUMED       7
#define TIMER_NOTIFY_SIZE       8


/* ════════════════════════════════════════════════════════════════════
 *  AWAY MODE  (UUID_AWAY_MODE)
 *
 *  Sub-commands (byte 0):
 * ════════════════════════════════════════════════════════════════════ */
#define AWAY_CMD_ACTIVATE       0x01  // [] → start exit delay
#define AWAY_CMD_CANCEL         0x02  // [] → cancel (during delay or active)
#define AWAY_CMD_END            0x03  // [restore_prev(1)] 0=keep off, 1=restore
#define AWAY_CMD_SETTINGS       0x04  // [delay_s(2 LE), max_dur_min(2 LE)]

/*  Read/Notify payload:
 *  Offset  Size  Field
 *  0       1     state           (0=off, 1=delaying, 2=active)
 *  1       2     delay_sec       (uint16 LE, configured)
 *  3       2     max_dur_min     (uint16 LE, configured, 0=unlimited)
 *  5       2     remaining_delay (uint16 LE, 0 if not delaying)
 *  7       2     elapsed_min     (uint16 LE, since activated)
 */
#define AWAY_STATE_OFF          0
#define AWAY_STATE_DELAYING     1
#define AWAY_STATE_ACTIVE       2
#define AWAY_NOTIFY_SIZE        9


/* ════════════════════════════════════════════════════════════════════
 *  LED STATE  (UUID_LED_STATE)
 *
 *  Read/Write/Notify:
 *  Offset  Size  Field
 *  0       1     mode            (LED_MODE_*)
 *  1       1     effect          (LED_EFFECT_*)
 *  2       1     r               (0-255)
 *  3       1     g               (0-255)
 *  4       1     b               (0-255)
 *  5       1     brightness      (0-100, percentage)
 *  6       1     speed           (0-255, effect speed)
 *  7       1     auto_resume_min (0 = stay in manual)
 *  8       1     r2              (gradient second color)
 *  9       1     g2
 *  10      1     b2
 * ════════════════════════════════════════════════════════════════════ */
#define LED_STATE_SIZE          11

#define LED_MODE_OFF            0
#define LED_MODE_MANUAL         1
#define LED_MODE_AUTO           2
#define LED_MODE_MUSIC          3

#define LED_EFFECT_SOLID        0
#define LED_EFFECT_BREATHE      1
#define LED_EFFECT_RAINBOW      2
#define LED_EFFECT_RAINBOW_CHASE 3
#define LED_EFFECT_COLOR_CHASE  4
#define LED_EFFECT_TWINKLE      5
#define LED_EFFECT_FIRE         6
#define LED_EFFECT_GRADIENT     7
#define LED_EFFECT_STROBE       8
#define LED_EFFECT_BLINK        9
#define LED_EFFECT_DOUBLE_BLINK 10
#define LED_EFFECT_HEARTBEAT    11
#define LED_EFFECT_COUNT        12

#define LBOOT_ANIM_SWEEP_MS     1000


/* ════════════════════════════════════════════════════════════════════
 *  LED SLOTS  (UUID_LED_SLOTS, auto time-of-day)
 *
 *  Sub-commands (byte 0):
 * ════════════════════════════════════════════════════════════════════ */
#define LSLOT_CMD_LIST          0x01
#define LSLOT_CMD_SET           0x02
#define LSLOT_CMD_DELETE        0x03

/*  Slot payload (after cmd byte):
 *  Offset  Size  Field
 *  0       1     slot_index      (0-7)
 *  1       1     start_hour      (0-23)
 *  2       1     start_min       (0-59)
 *  3       1     weekday_mask    (bit0=Sun..bit6=Sat, 0x7F=all)
 *  4       1     r
 *  5       1     g
 *  6       1     b
 *  7       1     brightness      (0-100)
 *  8       1     effect
 *  9       2     fade_seconds    (uint16 LE, smooth transition)
 *  11      1     preset_index    (0xFF = use inline color)
 */
#define LSLOT_OFF_INDEX         0
#define LSLOT_OFF_HOUR          1
#define LSLOT_OFF_MIN           2
#define LSLOT_OFF_WEEKDAY       3
#define LSLOT_OFF_R             4
#define LSLOT_OFF_G             5
#define LSLOT_OFF_B             6
#define LSLOT_OFF_BRIGHT        7
#define LSLOT_OFF_EFFECT        8
#define LSLOT_OFF_FADE_LO       9
#define LSLOT_OFF_FADE_HI       10
#define LSLOT_OFF_PRESET        11
#define LSLOT_PAYLOAD_SIZE      12
#define LSLOT_NO_PRESET         0xFF
#define LSLOT_MAX               8


/* ════════════════════════════════════════════════════════════════════
 *  LED PRESETS  (UUID_LED_PRESETS)
 *
 *  Sub-commands (byte 0):
 * ════════════════════════════════════════════════════════════════════ */
#define LPRESET_CMD_LIST        0x01
#define LPRESET_CMD_SAVE        0x02
#define LPRESET_CMD_APPLY       0x03
#define LPRESET_CMD_DELETE      0x04

/*  Preset payload (after cmd byte):
 *  Offset  Size  Field
 *  0       1     preset_index    (0-7)
 *  1       1     r
 *  2       1     g
 *  3       1     b
 *  4       1     brightness
 *  5       1     effect
 *  6       1     speed
 *  7       1     r2 (gradient)
 *  8       1     g2
 *  9       1     b2
 *  10      1     name_len        (0-16)
 *  11      N     name
 */
#define LPRESET_MAX             8
#define LPRESET_MAX_NAME        16


/* ════════════════════════════════════════════════════════════════════
 *  MUSIC STREAM  (UUID_MUSIC_STREAM, write-without-response)
 *
 *  Payload: [bass(1), mid(1), treble(1), beat(1)]
 *    bass/mid/treble = 0-255 energy level
 *    beat = 0 (no beat) or 1 (beat detected this frame)
 * ════════════════════════════════════════════════════════════════════ */
#define MUSIC_PACKET_SIZE       4


/* ════════════════════════════════════════════════════════════════════
 *  CALL MODE  (UUID_CALL_MODE)
 *
 *  Read/Notify: [active(1), auto_off_min(1)]
 *  Write: [active(1)]  or  [0x02, auto_off_min(1)] for settings
 * ════════════════════════════════════════════════════════════════════ */
#define CALL_CMD_TOGGLE         0x01
#define CALL_CMD_SETTINGS       0x02
#define CALL_NOTIFY_SIZE        2


/* ════════════════════════════════════════════════════════════════════
 *  FEATURE SWITCHES  (UUID_FEATURE_SWITCHES)
 *
 *  Read/Notify: [sw0(1), sw1(1), ..., sw12(1)]  — 13 switches
 *  Write: [switch_index(1), value(1)]
 * ════════════════════════════════════════════════════════════════════ */
#define FSWITCH_PC_UNLOCK       0   // Master: all HID paths
#define FSWITCH_USB_TYPING      1
#define FSWITCH_BLE_HID         2
#define FSWITCH_AUTO_TYPE       3
#define FSWITCH_SCHEDULER       4
#define FSWITCH_TIMERS          5
#define FSWITCH_AWAY_MODE       6
#define FSWITCH_LED_STRIP       7   // Master: all LED functionality
#define FSWITCH_LED_AUTO        8
#define FSWITCH_MUSIC_SYNC      9
#define FSWITCH_CALL_MODE       10
#define FSWITCH_RELAY_LED_LINK  11
#define FSWITCH_DAILY_REBOOT    12
#define FSWITCH_COUNT           13

/*  Default values for feature switches (at first boot).
 *  Index maps to FSWITCH_* constants above.
 *  PC_UNLOCK and AUTO_TYPE default OFF for safety.
 */
static const uint8_t FSWITCH_DEFAULTS[FSWITCH_COUNT] = {
    0,  // PC_UNLOCK       — OFF until user enables
    1,  // USB_TYPING      — ON (but gated by master)
    0,  // BLE_HID         — OFF (experimental)
    0,  // AUTO_TYPE       — OFF (risky)
    1,  // SCHEDULER       — ON
    1,  // TIMERS          — ON
    1,  // AWAY_MODE       — ON
    1,  // LED_STRIP       — ON
    1,  // LED_AUTO        — ON
    1,  // MUSIC_SYNC      — ON
    1,  // CALL_MODE       — ON
    0,  // RELAY_LED_LINK  — OFF
    0,  // DAILY_REBOOT    — OFF
};


/* ════════════════════════════════════════════════════════════════════
 *  HID PASSWORD  (UUID_HID_PASSWORD)
 *
 *  Write: [password_bytes(N)]  — max 32 bytes, write-only
 *    Stored obfuscated in NVS using a key derived from chip ID.
 *    NEVER readable, NEVER exported in backups.
 * ════════════════════════════════════════════════════════════════════ */
// No additional constants; see HID_MAX_PASSWORD_LEN in config.h


/* ════════════════════════════════════════════════════════════════════
 *  HID TYPE NOW  (UUID_HID_TYPE_NOW)
 *
 *  Write: [path(1)]  — which typing path to use
 *  Notify: [error(1), path(1), status(1)]
 * ════════════════════════════════════════════════════════════════════ */
#define HID_PATH_AUTO           0x00  // Prefer USB, fall back to BLE
#define HID_PATH_USB            0x01
#define HID_PATH_BLE            0x02
#define HID_PATH_TEST           0x03  // Type test string instead of password

#define HID_STATUS_STARTED      0x00
#define HID_STATUS_COMPLETE     0x01
#define HID_STATUS_BLOCKED      0x02  // Feature off, cooldown, etc.
#define HID_STATUS_CANCELLED    0x03
#define HID_STATUS_IN_PROGRESS  0x04  // Auto-type countdown active
#define HID_STATUS_ERROR        0x05


/* ════════════════════════════════════════════════════════════════════
 *  HID SETTINGS  (UUID_HID_SETTINGS)
 *
 *  Read: full settings block
 *  Write: [field_id(1), value...]
 * ════════════════════════════════════════════════════════════════════ */

/*  Read layout:
 *  Offset  Size  Field
 *  0       1     sign_in_type    (0=password, 1=PIN)
 *  1       1     press_enter     (0/1)
 *  2       2     auto_delay_sec  (uint16 LE)
 *  4       1     auto_enabled    (0/1)
 *  5       1     usb_enabled     (0/1)
 *  6       1     ble_enabled     (0/1)
 *  7       1     password_is_set (0/1, read-only)
 *  8       1     usb_kb_disabled (0/1, "disable USB keyboard entirely")
 */
#define HID_SETTINGS_SIZE       9

#define HID_SET_SIGN_IN_TYPE    0x01
#define HID_SET_PRESS_ENTER     0x02
#define HID_SET_AUTO_DELAY      0x03  // + 2 bytes LE
#define HID_SET_AUTO_ENABLED    0x04
#define HID_SET_USB_ENABLED     0x05
#define HID_SET_BLE_ENABLED     0x06
#define HID_SET_ERASE_PASSWORD  0x07  // No value bytes
#define HID_SET_DISABLE_USB_KB  0x08  // + 1 byte (applies after reboot)

#define HID_SIGN_IN_PASSWORD    0
#define HID_SIGN_IN_PIN         1


/* ════════════════════════════════════════════════════════════════════
 *  HID LOG  (UUID_HID_LOG)
 *
 *  Write: [0x01, page(1)]  — request page (8 entries/page)
 *  Notify: [entry_count(1), entries...]
 *    Entry: [timestamp(4 LE), path(1), reason(1), success(1)] = 7 bytes
 * ════════════════════════════════════════════════════════════════════ */
#define HID_LOG_ENTRIES_PER_PAGE 8
#define HID_LOG_ENTRY_SIZE      7
#define HID_LOG_MAX_ENTRIES     32  // Ring buffer in NVS

/* Reason codes for log entries */
#define HID_REASON_MANUAL       0x00
#define HID_REASON_AUTO_BOOT    0x01
#define HID_REASON_AUTO_USB     0x02
#define HID_REASON_TEST         0x03
#define HID_REASON_BLOCKED_OFF  0x10  // Feature off
#define HID_REASON_BLOCKED_COOL 0x11  // Cooldown
#define HID_REASON_BLOCKED_MAX  0x12  // Daily max
#define HID_REASON_BLOCKED_BUSY 0x13  // Another type in progress
#define HID_REASON_BLOCKED_DISP 0x14  // Display client connected
#define HID_REASON_CANCELLED    0x20


/* ════════════════════════════════════════════════════════════════════
 *  SYSTEM COMMANDS  (UUID_SYSTEM_CMD)
 *
 *  Write: [cmd_id(1), ...payload]
 *  Notify: [error(1), cmd_id(1)]
 * ════════════════════════════════════════════════════════════════════ */
#define SYSCMD_REBOOT           0x01
#define SYSCMD_RESTART_BLE      0x02
#define SYSCMD_DISCONNECT_ALL   0x03
#define SYSCMD_CLEAR_SCHEDULES  0x04
#define SYSCMD_CLEAR_TIMERS     0x05
#define SYSCMD_CLEAR_LED_SLOTS  0x06
#define SYSCMD_CLEAR_LED_PRESETS 0x07
#define SYSCMD_RESET_RELAY_CFG  0x08
#define SYSCMD_RESET_FEAT_SW    0x09
#define SYSCMD_FACTORY_RESET    0x0A  // Payload: "RESET" + optional [erase_pw(1)]
#define SYSCMD_ALL_LOAD_OFF     0x0B
#define SYSCMD_SAFE_STATE       0x0C
#define SYSCMD_SET_LOG_LEVEL    0x0D  // Payload: [level(1)] (0=none, 1=err, 2=warn, 3=info, 4=debug)
#define SYSCMD_SET_LOG_ENABLED  0x0E  // Payload: [enabled(1)] (0/1)
#define SYSCMD_RUN_SELFTEST     0x0F  // Triggers self-test suite

#define FACTORY_RESET_MAGIC     "RESET"
#define FACTORY_RESET_MAGIC_LEN 5


/* ════════════════════════════════════════════════════════════════════
 *  DEVICE LOG  (UUID_DEVICE_LOG)
 *
 *  Read: returns the most recent log line or status
 *  Notify: emits each formatted log line string (UTF-8, max ~84 bytes)
 * ════════════════════════════════════════════════════════════════════ */
#define DEVICE_LOG_MAX_LEN      84



/* ════════════════════════════════════════════════════════════════════
 *  DEVICE STATUS  (UUID_DEVICE_STATUS)
 *
 *  Read/Notify:
 *  Offset  Size  Field
 *  0       1     reset_reason    (ESP reset reason enum)
 *  1       4     uptime_sec      (uint32 LE)
 *  5       1     version_major
 *  6       1     version_minor
 *  7       1     version_patch
 *  8       4     free_heap       (uint32 LE, bytes)
 *  12      1     relay_driver    (0=GPIO, 1=595)
 *  13      1     ble_clients     (connected count)
 * ════════════════════════════════════════════════════════════════════ */
#define DEVICE_STATUS_SIZE      14
