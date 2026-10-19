# BLE Protocol Symmetry & Verification Report

This document records the exact side-by-side comparison of **all 26 BLE characteristics** and commands between the ESP32 firmware specification ([`firmware/include/protocol.h`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/firmware/include/protocol.h)), the human specification ([`docs/protocol.md`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/docs/protocol.md)), and the client serialization implementation ([`pwa/lib/pure/protocol-pack.js`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/pwa/lib/pure/protocol-pack.js)).

Base UUID: `d3a0XXXX-1b0e-4e6a-9b3f-c0f2a8d7e5b1`

---

## Side-by-Side Characteristic Mapping

| Suffix | Characteristic | Properties | firmware/include/protocol.h | pwa/lib/pure/protocol-pack.js | Status / Mismatch Flags |
| :---: | :--- | :---: | :--- | :--- | :---: |
| `0001` | `PROTOCOL_VERSION` | R | uint8 (0x01) | Read raw byte (1) | **MATCH (100%)** |
| `0002` | `CLIENT_ROLE` | W | `ROLE_DISPLAY` (0), `ROLE_REMOTE` (1) | `packClientRole(role)`: [0/1] | **MATCH (100%)** |
| `0003` | `RELAY_STATE` | R/W/N | Read/Notify: `[count(1), load0..N]`<br>Write: `[index(1), load(1)]` | `unpackRelayStateNotify`<br>`packRelayStateWrite` | **MATCH (100%)** |
| `0004` | `RELAY_CONFIG` | R/W/N | Read: `[0x01, idx]`<br>Write: `[0x02, idx, en, pol, wire, boot, pin, minSw(2 LE), away, nLen, name, iLen, icon]`<br>Reset: `[0x03, idx]` | `packRelayConfigRead`<br>`packRelayConfigWrite`<br>`packRelayConfigReset`<br>`unpackRelayConfigNotify` | **MATCH (100%)** |
| `0005` | `RELAY_DRIVER` | R/W | `0` = Direct GPIO, `1` = 74HC595 | `packRelayDriver(driverType)`: [0/1] | **MATCH (100%)** |
| `0006` | `RELAY_TEST` | W/N | `[relay_index(1)]` | `packRelayTest(relayIndex)`: [idx] | **MATCH (100%)** |
| `0007` | `TIME_SYNC` | W | `[unix_sec(4 LE), tz_offset_min(2 LE)]` | `packTimeSync(unixTs, tzOffset)`: 6 bytes LE | **MATCH (100%)** |
| `0008` | `SCHEDULES` | R/W/N | Set: `[0x02, idx, rIdx, mask, onH, onM, offH, offM, en, catch]`<br>Del: `[0x03, idx]` | `packScheduleSet`<br>`packScheduleDelete` | **MATCH (100%)** |
| `0009` | `TIMERS` | R/W/N | Start: `[0x01, rIdx, durMin(2 LE)]`<br>Cancel: `[0x02, rIdx]`<br>Notify: `[cmd, idx, rem(2 LE), tot(2 LE), act, res]` | `packTimerStart`<br>`packTimerCancel`<br>`unpackTimerNotify` | **MATCH (100%)** |
| `000a` | `AWAY_MODE` | R/W/N | Act: `[0x01]`, Cancel: `[0x02]`, End: `[0x03, restore]`<br>Notify: `[st, del(2 LE), max(2 LE), remDel(2 LE), elap(2 LE)]` | `packAwayActivate`<br>`packAwayCancel`<br>`packAwayEnd`<br>`unpackAwayNotify` | **MATCH (100%)** |
| `000b` | `LED_STATE` | R/W/N | `[mode, eff, r, g, b, bright, spd, autoRes, r2, g2, b2, blinkOn(2 LE), blinkOff(2 LE)]` (15 bytes) | `packLedState`<br>`unpackLedState` | **MATCH (100%)** |
| `000c` | `LED_SLOTS` | R/W/N | Cmd `0x01` List, `0x02` Set (12 bytes), `0x03` Delete | `packLedSlotSet`<br>`packLedSlotDelete` | **MATCH (100%)** |
| `000d` | `LED_PRESETS` | R/W/N | Cmd `0x01` List, `0x02` Save, `0x03` Apply, `0x04` Del | `packLedPresetSave`<br>`packLedPresetApply`<br>`packLedPresetDelete` | **MATCH (100%)** |
| `000e` | `MUSIC_STREAM` | W_NR | `[bass(1), mid(1), treble(1), beat(1)]` (4 bytes) | `packMusicStream`: 4 bytes Uint8Array | **MATCH (100%)** |
| `000f` | `CALL_MODE` | R/W/N | Toggle: `[act(1)]`<br>Settings: `[0x02, autoOff(1)]`<br>Notify: `[act(1), autoOff(1)]` | `packCallModeToggle`<br>`packCallModeSettings`<br>`unpackCallMode` | **MATCH (100%)** |
| `0010` | `FEATURE_SWITCHES`| R/W/N | Read/Notify: 13 bytes uint8<br>Write: `[switch_index(1), value(1)]` | `packFeatureSwitchWrite`<br>`unpackFeatureSwitches` | **MATCH (100%)** |
| `0011` | `HID_PASSWORD` | W | `[password_bytes(N)]` (max 32 bytes UTF-8) | `packHidPassword(pw)`: max 32 bytes | **MATCH (100%)** |
| `0012` | `HID_TYPE_NOW` | W/N | Write: `[path(1)]`<br>Notify: `[err(1), path(1), status(1)]` | `packHidTypeNow(path)`: [path] | **MATCH (100%)** |
| `0013` | `HID_CANCEL` | W | `[0x01]` | `packHidCancel()`: [0x01] | **MATCH (100%)** |
| `0014` | `HID_SETTINGS` | R/W | 9 bytes: `[signType, enter, delay(2 LE), autoEn, usbEn, bleEn, pwSet, kbDis]` | `packHidSetting`<br>`unpackHidSettings` | **MATCH (100%)** |
| `0015` | `HID_LOG` | R/N | Req: `[0x01, page]`<br>Notify: `[count, entries(7*count)]` | Pack page query, unpack ring buffer | **MATCH (100%)** |
| `0016` | `SYSTEM_CMD` | W/N | Write: `[cmd_id(1), payload...]`<br>Notify: `[error(1), cmd_id(1)]` | `packSystemCmd(cmdId, payload)` | **MATCH (100%)** |
| `0017` | `DEVICE_STATUS` | R/N | 14 bytes: `[reason, uptime(4 LE), maj, min, patch, heap(4 LE), driver, clients]` | `unpackDeviceStatus`: 14 bytes LE | **MATCH (100%)** |
| `0018` | `LED_NOTIFY_BLINK`| R/W/N | 8 bytes: `[event(1), r, g, b, count, res, dur(2 LE)]` | `packLedNotifyBlink`: 8 bytes LE | **MATCH (100%)** |
| `0019` | `LED_BOOT_SETTINGS`| R/W | 4 bytes: `[behavior, presetIdx, bootSweep, bleStatus]` | `packLedBootSettings`<br>`unpackLedBootSettings` | **MATCH (100%)** |
| `001a` | `DEVICE_LOG` | R/N | Read/Notify: live formatted UTF-8 string (up to 84 bytes) | `unpackDeviceLog`: TextDecoder UTF-8 string | **MATCH (100%)** |

---

## System Command ID Verification (`UUID_SYSTEM_CMD`)

| Command ID | Constant Name | Payload Structure | Firmware Handler | PWA Packer | Verification Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| `0x01` | `SYSCMD_REBOOT` | None | `systemCmdsScheduleReboot(300)` | `packSystemCmd(0x01)` | **MATCH** |
| `0x02` | `SYSCMD_RESTART_BLE` | None | `bleRestartAdvertising()` | `packSystemCmd(0x02)` | **MATCH** |
| `0x03` | `SYSCMD_DISCONNECT_ALL`| None | `bleDisconnectAll()` | `packSystemCmd(0x03)` | **MATCH** |
| `0x04` | `SYSCMD_CLEAR_SCHEDULES`| None | `schedulerClearAll()` | `packSystemCmd(0x04)` | **MATCH** |
| `0x05` | `SYSCMD_CLEAR_TIMERS` | None | `timersClearAll()` | `packSystemCmd(0x05)` | **MATCH** |
| `0x06` | `SYSCMD_CLEAR_LED_SLOTS`| None | `ledsDeleteSlot(i)` | `packSystemCmd(0x06)` | **MATCH** |
| `0x07` | `SYSCMD_CLEAR_LED_PRESETS`| None | `ledsDeletePreset(i)` | `packSystemCmd(0x07)` | **MATCH** |
| `0x08` | `SYSCMD_RESET_RELAY_CFG`| None | `settingsResetAllRelayConfigs()` | `packSystemCmd(0x08)` | **MATCH** |
| `0x09` | `SYSCMD_RESET_FEAT_SW` | None | `resetFeatureSwitches()` | `packSystemCmd(0x09)` | **MATCH** |
| `0x0A` | `SYSCMD_FACTORY_RESET` | Magic `"RESET"` + `[erase_pw(1)]` | `handleFactoryReset()` | `packSystemCmd(0x0A, "RESET")` | **MATCH** |
| `0x0B` | `SYSCMD_ALL_LOAD_OFF` | None | `relaysAllLoadOff()` | `packSystemCmd(0x0B)` | **MATCH** |
| `0x0C` | `SYSCMD_SAFE_STATE` | None | `relaysSafeStateAll()` | `packSystemCmd(0x0C)` | **MATCH** |
| `0x0D` | `SYSCMD_SET_LOG_LEVEL` | `[level(1)]` (0..4) | `logSetLevel(payload[0])` | `packSetLogLevel(level)` | **MATCH** |
| `0x0E` | `SYSCMD_SET_LOG_ENABLED`| `[enabled(1)]` (0/1) | `logSetEnabled(payload[0] != 0)` | `packSetLogEnabled(enabled)` | **MATCH** |
| `0x0F` | `SYSCMD_RUN_SELFTEST` | None | `diagnosticsRunSelfTest()` | `packRunSelfTest()` | **MATCH** |

---

## Discrepancies and Mismatch Check
**Flagged Mismatches:** **0**.
All 26 UUIDs, endianness conventions (Little-Endian across all multi-byte integers), byte offsets, and command IDs match between firmware, documentation, and JavaScript serialization with 100% precision.

