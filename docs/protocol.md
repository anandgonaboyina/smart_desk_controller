# SmartDesk BLE Protocol Specification v1.1

> **Single source of truth** for UUIDs, byte layouts, command IDs, and error codes.
> This document, `firmware/include/protocol.h`, and `pwa/lib/pure/protocol-pack.js`
> MUST match exactly. If any of the three disagrees, it's a bug.

## General Rules

- All multi-byte integers are **little-endian**.
- Protocol versions only **add** characteristics or command IDs; never renumber.
- Every write that modifies state triggers a **notify to ALL connected clients**.
- Error code is always byte 0 of a notify response (0x00 = success).
- BLE MTU is negotiated; payloads are designed to fit the default 20-byte ATT MTU
  where possible, with chunked reads for larger data.

---

## Service

| Field        | Value                                          |
|-------------|------------------------------------------------|
| Service UUID | `d3a00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1`       |
| Base pattern | `d3a0XXXX-1b0e-4e6a-9b3f-c0f2a8d7e5b1`       |

---

## Characteristics

| # | Name | UUID Suffix | Properties | Feature Flag |
|---|------|------------|------------|-------------|
| 1 | PROTOCOL_VERSION | 0001 | R | Core |
| 2 | CLIENT_ROLE | 0002 | W | Core |
| 3 | RELAY_STATE | 0003 | R/W/N | FEATURE_RELAYS |
| 4 | RELAY_CONFIG | 0004 | R/W/N | FEATURE_RELAYS |
| 5 | RELAY_DRIVER | 0005 | R/W | FEATURE_RELAYS |
| 6 | RELAY_TEST | 0006 | W/N | FEATURE_RELAYS |
| 7 | TIME_SYNC | 0007 | W | Core |
| 8 | SCHEDULES | 0008 | R/W/N | FEATURE_SCHEDULER |
| 9 | TIMERS | 0009 | R/W/N | FEATURE_TIMERS |
| 10 | AWAY_MODE | 000A | R/W/N | FEATURE_AWAY |
| 11 | LED_STATE | 000B | R/W/N | FEATURE_LEDS |
| 12 | LED_SLOTS | 000C | R/W/N | FEATURE_LED_AUTO |
| 13 | LED_PRESETS | 000D | R/W/N | FEATURE_LEDS |
| 14 | MUSIC_STREAM | 000E | W (no resp) | FEATURE_MUSIC |
| 15 | CALL_MODE | 000F | R/W/N | FEATURE_CALLMODE |
| 16 | FEATURE_SWITCHES | 0010 | R/W/N | Core |
| 17 | HID_PASSWORD | 0011 | W | FEATURE_HID |
| 18 | HID_TYPE_NOW | 0012 | W/N | FEATURE_HID |
| 19 | HID_CANCEL | 0013 | W | FEATURE_HID |
| 20 | HID_SETTINGS | 0014 | R/W | FEATURE_HID |
| 21 | HID_LOG | 0015 | R/N | FEATURE_HID |
| 22 | SYSTEM_CMD | 0016 | W/N | Core |
| 23 | DEVICE_STATUS | 0017 | R/N | Core |
| 24 | LED_NOTIFY_BLINK | 0018 | R/W/N | FEATURE_LEDS |
| 25 | LED_BOOT_SETTINGS | 0019 | R/W | FEATURE_LEDS |

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0x00 | OK | Success |
| 0x01 | FEATURE_DISABLED | The feature's runtime switch is OFF |
| 0x02 | INVALID_PARAM | Bad value, out of range, wrong length |
| 0x03 | BUSY | Another operation in progress |
| 0x04 | RATE_LIMITED | Min switch interval or music rate limit |
| 0x05 | AUTH_REQUIRED | Write requires bonded/paired connection |
| 0x06 | INVALID_PIN_NUM | GPIO number not in safe list |
| 0x07 | DUPLICATE_PIN | GPIO already assigned to another relay |
| 0x08 | UNSAFE_GPIO | GPIO is strapping, flash, USB, or UART |
| 0x09 | NOT_FOUND | Schedule, timer, preset, or slot not found |
| 0x0A | BUFFER_OVERFLOW | Payload too large |
| 0x0B | NVS_ERROR | Flash storage read/write failed |
| 0x0C | BLOCKED_BY_AWAY | Relay is locked by Away mode |
| 0x0D | COOLDOWN_ACTIVE | HID cooldown period active |
| 0x0E | IN_PROGRESS | HID typing or countdown in progress |
| 0x0F | CONFIRM_REQUIRED | Factory reset needs "RESET" confirmation |
| 0x10 | ERR_PHOTOSENSITIVITY | Blink rate exceeds 3 Hz safety cap (<334ms cycle) |

---

## Byte Layouts

### PROTOCOL_VERSION (0x0001) — Read

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | protocol_version (currently 1) |

### CLIENT_ROLE (0x0002) — Write

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | role: 0x00=Display, 0x01=Remote |

### RELAY_STATE (0x0003)

**Read / Notify:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | relay_count |
| 1 | N | load_state[0..N-1] (0=OFF, 1=ON) |

All values are in **LOAD terms** (is the appliance powered?), never coil/pin level.

**Write:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | relay_index (0-7) |
| 1 | 1 | desired_load (0=OFF, 1=ON) |

### RELAY_CONFIG (0x0004) — Sub-commands

**Write byte 0 = command:**
- `0x01` READ: `[0x01, relay_index]` → notify with config
- `0x02` WRITE: `[0x02, relay_index, ...config_payload]` → notify
- `0x03` RESET: `[0x03, relay_index]` → reset to defaults, notify

**Config payload (read response / write data, after error+cmd+index):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | enabled (0/1) |
| 1 | 1 | polarity (0=active-LOW, 1=active-HIGH) |
| 2 | 1 | wiring (0=NO, 1=NC) |
| 3 | 1 | boot_behavior (0=last, 1=always-off, 2=always-on) |
| 4 | 1 | gpio_pin |
| 5 | 2 | min_switch_ms (uint16 LE) |
| 7 | 1 | affected_by_away (0/1) |
| 8 | 1 | name_len (0-16) |
| 9 | N | name (UTF-8) |
| 9+N | 1 | icon_len (0-16) |
| 10+N | M | icon (UTF-8 emoji or keyword) |

### RELAY_DRIVER (0x0005)

**Read:** `[driver_type]` (0=GPIO, 1=74HC595)

**Write:** `[driver_type]` — shows warning, requires reboot to apply

### RELAY_TEST (0x0006)

**Write:** `[relay_index]` — pulses relay for 1 second

**Notify:** `[error, relay_index]`

### TIME_SYNC (0x0007) — Write

| Offset | Size | Field |
|--------|------|-------|
| 0 | 4 | unix_timestamp (uint32 LE, seconds since epoch) |
| 4 | 2 | tz_offset_minutes (int16 LE, e.g. +330 for IST) |

### SCHEDULES (0x0008) — Sub-commands

**Write byte 0 = command:**
- `0x01` LIST: `[0x01]` → notify each schedule
- `0x02` SET: `[0x02, ...schedule_payload]` → notify
- `0x03` DELETE: `[0x03, schedule_index]` → notify

**Schedule payload:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | schedule_index (0-15) |
| 1 | 1 | relay_index (0-7) |
| 2 | 1 | weekday_mask (bit0=Sun, bit1=Mon, ..., bit6=Sat) |
| 3 | 1 | on_hour (0-23, 0xFF=no on-action) |
| 4 | 1 | on_min (0-59) |
| 5 | 1 | off_hour (0-23, 0xFF=no off-action) |
| 6 | 1 | off_min (0-59) |
| 7 | 1 | enabled (0/1) |
| 8 | 1 | catch_up_min (0=off, 1-60=window) |

### TIMERS (0x0009) — Sub-commands

**Write byte 0 = command:**
- `0x01` START: `[0x01, relay_index, duration_min_lo, duration_min_hi]`
- `0x02` CANCEL: `[0x02, relay_index]`
- `0x03` LIST: `[0x03]` → notify each active timer

**Notify payload (after error byte):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | cmd echo |
| 1 | 1 | relay_index |
| 2 | 2 | remaining_sec (uint16 LE) |
| 4 | 2 | total_sec (uint16 LE) |
| 6 | 1 | active (0/1) |
| 7 | 1 | resumed (0/1, set after boot resume) |

### AWAY_MODE (0x000A) — Sub-commands

**Write byte 0 = command:**
- `0x01` ACTIVATE: `[0x01]`
- `0x02` CANCEL: `[0x02]`
- `0x03` END: `[0x03, restore_previous(1)]` — 0=keep off, 1=restore
- `0x04` SETTINGS: `[0x04, delay_s(2 LE), max_dur_min(2 LE)]`

**Read / Notify:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | state (0=off, 1=delaying, 2=active) |
| 1 | 2 | delay_sec (uint16 LE, configured) |
| 3 | 2 | max_dur_min (uint16 LE, 0=unlimited) |
| 5 | 2 | remaining_delay (uint16 LE) |
| 7 | 2 | elapsed_min (uint16 LE) |

### LED_STATE (0x000B)

**Read / Write / Notify (15 bytes):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | mode (0=OFF, 1=MANUAL, 2=AUTO, 3=MUSIC) |
| 1 | 1 | effect (0-11, see LED_EFFECT_*) |
| 2 | 1 | r |
| 3 | 1 | g |
| 4 | 1 | b |
| 5 | 1 | brightness (0-100%) |
| 6 | 1 | speed (0-255) |
| 7 | 1 | auto_resume_min (0=stay manual) |
| 8 | 1 | r2 (gradient second color) |
| 9 | 1 | g2 |
| 10 | 1 | b2 |
| 11 | 2 | blink_on_ms (uint16 LE, 50-5000) |
| 13 | 2 | blink_off_ms (uint16 LE, 50-5000) |

**Effects:**
- `0`: solid
- `1`: breathe
- `2`: rainbow
- `3`: rainbow-chase
- `4`: color-chase
- `5`: twinkle
- `6`: fire
- `7`: gradient
- `8`: strobe (rate-limited, off by default, confirm required)
- `9`: blink (adjustable on_ms / off_ms)
- `10`: double-blink (two quick flashes then pause)
- `11`: heartbeat (lub-dub pattern with pause)

**Priority (highest wins):**
Call mode (4) > Notification blink (3) > Music (2) > Manual (1) > Auto (0).
When a higher-priority mode ends, restore previous mode exactly.

**Photosensitivity Safety:**
Any blink/strobe cycle `< 334ms` (> 3 Hz) returns `ERR_PHOTOSENSITIVITY`.
`blink_on_ms + blink_off_ms >= 334` is enforced in firmware.

### LED_SLOTS (0x000C) — Sub-commands

**Write byte 0 = command:**
- `0x01` LIST, `0x02` SET, `0x03` DELETE

**Slot payload:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | slot_index (0-7) |
| 1 | 1 | start_hour (0-23) |
| 2 | 1 | start_min (0-59) |
| 3 | 1 | weekday_mask |
| 4 | 1 | r |
| 5 | 1 | g |
| 6 | 1 | b |
| 7 | 1 | brightness (0-100) |
| 8 | 1 | effect |
| 9 | 2 | fade_seconds (uint16 LE) |
| 11 | 1 | preset_index (0xFF = use inline color) |

### LED_PRESETS (0x000D) — Sub-commands

**Write byte 0 = command:**
- `0x01` LIST, `0x02` SAVE, `0x03` APPLY, `0x04` DELETE

**Preset payload:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | preset_index (0-7) |
| 1 | 1 | r |
| 2 | 1 | g |
| 3 | 1 | b |
| 4 | 1 | brightness |
| 5 | 1 | effect |
| 6 | 1 | speed |
| 7 | 1 | r2 |
| 8 | 1 | g2 |
| 9 | 1 | b2 |
| 10 | 1 | name_len (0-16) |
| 11 | N | name |

### MUSIC_STREAM (0x000E) — Write Without Response

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | bass (0-255) |
| 1 | 1 | mid (0-255) |
| 2 | 1 | treble (0-255) |
| 3 | 1 | beat (0 or 1) |

One active streaming client at a time. Timeout: 2 seconds without a packet
reverts LEDs to the previous mode.

### CALL_MODE (0x000F)

**Read / Notify:** `[active(1), auto_off_min(1)]`

**Write:**
- Toggle: `[0x01, active(1)]`
- Settings: `[0x02, auto_off_min(1)]`

### FEATURE_SWITCHES (0x0010)

**Read / Notify:** `[sw0, sw1, ..., sw14]` — 15 bytes, each 0 or 1

| Index | Switch | Default |
|-------|--------|---------|
| 0 | PC_UNLOCK (master) | OFF (0) |
| 1 | USB_TYPING | ON (1) |
| 2 | BLE_HID | OFF (0) |
| 3 | AUTO_TYPE | OFF (0) |
| 4 | SCHEDULER | ON (1) |
| 5 | TIMERS | ON (1) |
| 6 | AWAY_MODE | ON (1) |
| 7 | LED_STRIP (master) | ON (1) |
| 8 | LED_AUTO | ON (1) |
| 9 | MUSIC_SYNC | ON (1) |
| 10 | CALL_MODE | ON (1) |
| 11 | RELAY_LED_LINK | OFF (0) |
| 12 | DAILY_REBOOT | OFF (0) |
| 13 | NOTIFY_BLINKS | ON (1) |
| 14 | BOOT_ANIMATION | OFF (0) |

**Write:** `[switch_index(1), value(1)]`

### HID_PASSWORD (0x0011) — Write Only

`[password_bytes(1-32)]` — stored obfuscated, never readable

### HID_TYPE_NOW (0x0012)

**Write:** `[path(1)]` — 0x00=auto, 0x01=USB, 0x02=BLE, 0x03=test

**Notify:** `[error(1), path(1), status(1)]`

Status: 0=started, 1=complete, 2=blocked, 3=cancelled, 4=in_progress, 5=error

### HID_CANCEL (0x0013) — Write

`[0x01]` — cancels current typing or countdown

### HID_SETTINGS (0x0014)

**Read:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | sign_in_type (0=password, 1=PIN) |
| 1 | 1 | press_enter (0/1) |
| 2 | 2 | auto_delay_sec (uint16 LE) |
| 4 | 1 | auto_enabled (0/1) |
| 5 | 1 | usb_enabled (0/1) |
| 6 | 1 | ble_enabled (0/1) |
| 7 | 1 | password_is_set (0/1, read-only) |
| 8 | 1 | usb_kb_disabled (0/1) |

**Write:** `[field_id(1), value...]`

Field IDs: 0x01-0x08 (see protocol.h for full list)

### HID_LOG (0x0015)

**Write:** `[0x01, page(1)]` — 8 entries per page

**Notify:** `[entry_count(1), entries...]`

Entry (7 bytes): `[timestamp(4 LE), path(1), reason(1), success(1)]`

### SYSTEM_CMD (0x0016)

**Write:** `[cmd_id(1), ...payload]`

| ID | Command | Payload |
|----|---------|---------|
| 0x01 | REBOOT | — |
| 0x02 | RESTART_BLE | — |
| 0x03 | DISCONNECT_ALL | — |
| 0x04 | CLEAR_SCHEDULES | — |
| 0x05 | CLEAR_TIMERS | — |
| 0x06 | CLEAR_LED_SLOTS | — |
| 0x07 | CLEAR_LED_PRESETS | — |
| 0x08 | RESET_RELAY_CONFIG | — |
| 0x09 | RESET_FEATURE_SWITCHES | — |
| 0x0A | FACTORY_RESET | "RESET" (5 bytes) + optional [erase_pw(1)] |
| 0x0B | ALL_LOAD_OFF | — |
| 0x0C | SAFE_STATE | — |

**Notify:** `[error(1), cmd_id(1)]`

### DEVICE_STATUS (0x0017)

**Read / Notify:**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | reset_reason |
| 1 | 4 | uptime_sec (uint32 LE) |
| 5 | 1 | version_major |
| 6 | 1 | version_minor |
| 7 | 1 | version_patch |
| 8 | 4 | free_heap (uint32 LE) |
| 12 | 1 | relay_driver (0=GPIO, 1=595) |
| 13 | 1 | ble_clients (connected count) |

### LED_NOTIFY_BLINK (0x0018)

Short configurable flash patterns for events.

**Write byte 0 = command:**
- `0x01` LIST: `[0x01]` → notify each event config
- `0x02` SET: `[0x02, ...config]` → notify
- `0x03` TEST: `[0x03, event_id]` → test flash pattern immediately

**Notification event IDs:**
- `0`: TIMER_ENDED
- `1`: AWAY_STARTED
- `2`: AWAY_ENDED
- `3`: SCHED_FIRED
- `4`: CALL_ON
- `5`: BLE_CONNECTED
- `6`: BLE_LOST

**Per-event config payload (after error + cmd):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | event_id (0-6) |
| 1 | 1 | enabled (0/1) |
| 2 | 1 | r (0-255) |
| 3 | 1 | g (0-255) |
| 4 | 1 | b (0-255) |
| 5 | 1 | count (1-10 flashes) |
| 6 | 2 | on_ms (uint16 LE, 50-5000) |
| 8 | 2 | off_ms (uint16 LE, 50-5000) |

### LED_BOOT_SETTINGS (0x0019)

**Read / Write (5 bytes):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 1 | boot_behavior (0=last state, 1=preset, 2=off) |
| 1 | 1 | preset_index (0-7, used when boot_behavior=1) |
| 2 | 1 | inrush_limit (brightness % cap for 1st second, default 50) |
| 3 | 1 | boot_anim (0=off, 1=sweep) |
| 4 | 1 | ble_indication (0=off, 1=blink while advertising) |

### DEVICE_LOG (0x001A) — Read / Notify

**Properties:** Read, Notify.
Emits live log lines formatted as UTF-8 text strings (up to 84 bytes per notification).
Read returns the latest buffered log line.

**System Commands for Logging & Diagnostics (UUID_SYSTEM_CMD):**
- `0x0D`: `SYSCMD_SET_LOG_LEVEL` — payload: `[level(1)]` (0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG)
- `0x0E`: `SYSCMD_SET_LOG_ENABLED` — payload: `[enabled(1)]` (0=OFF, 1=ON)
- `0x0F`: `SYSCMD_RUN_SELFTEST` — triggers the full boot self-test suite and outputs structured PASS/FAIL report


---

## Load / Coil / Level Conversion

All UI, BLE, schedules, and timers use **LOAD state** (is the appliance powered?).

Conversion chain:
```
coil = (wiring == NC) ? !load : load
level = (polarity == ACTIVE_LOW) ? !coil : coil
```

Truth table:

| Wiring | Polarity | Load ON → | Coil | GPIO Level |
|--------|----------|-----------|------|------------|
| NO | Active-LOW | ON | HIGH | LOW |
| NO | Active-HIGH | ON | HIGH | HIGH |
| NC | Active-LOW | ON | LOW | HIGH |
| NC | Active-HIGH | ON | LOW | LOW |
| NO | Active-LOW | OFF | LOW | HIGH |
| NO | Active-HIGH | OFF | LOW | LOW |
| NC | Active-LOW | OFF | HIGH | LOW |
| NC | Active-HIGH | OFF | HIGH | HIGH |
