# SmartDesk Debug Guide

For each symptom, the files listed are the ONLY files you need to check.
When reporting a bug, paste those files and the requested log/console output.

---

## Firmware Symptoms

### Relay turns on/off the wrong way (load ON but appliance is OFF)

**Files to check:**
1. `firmware/lib/relay_logic/relay_logic.h` — the `loadToLevel()` function
2. `firmware/src/relays.cpp` — where `loadToLevel()` is called
3. `firmware/include/config.h` — DEFAULT_RELAY_POLARITY and DEFAULT_RELAY_WIRING

**What to send me:**
- Serial output: type `r` in serial menu to print relay config (polarity, wiring, pin, load state, coil state, GPIO level for each relay)
- Which relay, what you expected vs what happened

**Likely cause:** Polarity or wiring setting doesn't match your physical module. See the truth table in docs/protocol.md.

---

### Schedule not firing

**Files to check:**
1. `firmware/lib/schedule_logic/schedule_logic.h` — `isScheduleDue()` and `shouldCatchUp()`
2. `firmware/src/scheduler.cpp` — the scheduler task loop
3. `firmware/src/feature_switches.cpp` — is FSWITCH_SCHEDULER enabled?

**What to send me:**
- Serial output: type `s` to print all schedules (index, relay, times, weekday mask, enabled, last-fired)
- Serial output: type `t` to print current ESP32 time (has time been synced?)
- Is the scheduler feature switch ON? (type `f` to print feature switches)

**Likely cause:** Time not synced (connect the PWA first), wrong weekday mask, or scheduler feature switch OFF.

---

### Timer not resuming after reboot

**Files to check:**
1. `firmware/src/timers.cpp` — `timersBegin()` resume logic and `checkpointTimers()`
2. `firmware/src/settings.cpp` — NVS read/write for timer namespace

**What to send me:**
- Serial output at boot (look for "Timer resumed" or "No saved timers" messages)
- Was the timer running for at least 1 minute before reboot? (checkpoint is every 60s)

---

### LED color wrong (shows different color than set)

**Files to check:**
1. `firmware/lib/led_math/led_math.h` — `gammaCorrect()`, `hsvToRgb()`
2. `firmware/src/leds.cpp` — where color is applied to the NeoPixel strip
3. `firmware/include/config.h` — LED_COLOR_ORDER (must be NEO_GRB for WS2812B)

**What to send me:**
- The RGB values you sent (from PWA LED screen)
- What color actually shows on the strip
- Serial output: type `l` to print current LED state

---

### BLE won't connect / keeps disconnecting

**Files to check:**
1. `firmware/src/ble_service.cpp` — `bleBegin()`, callbacks
2. `firmware/include/config.h` — BLE_PIN and SECURITY_MODE

**What to send me:**
- Chrome DevTools console: filter for "bluetooth" or "BLE"
- Serial output: any "BLE:" prefixed lines at connect time
- Are you using Chrome or Edge? (other browsers don't support Web Bluetooth)
- Is the device already paired with another device? (Windows Bluetooth settings)

---

### PC unlock not typing / wrong characters

**Files to check:**
1. `firmware/src/hid.cpp` — USB HID report sending
2. `firmware/src/hid_guard.cpp` — guard checks (cooldown, daily max, feature off)
3. `firmware/src/feature_switches.cpp` — is FSWITCH_PC_UNLOCK enabled?

**What to send me:**
- Serial output: type `h` to print HID state (feature on/off, password set, cooldown, daily count)
- Serial output: any "HID:" lines during the typing attempt
- Use "Test with Notepad" first — what appears in Notepad?

---

### Feature switch ignored (turning it off doesn't stop the feature)

**Files to check:**
1. `firmware/src/feature_switches.cpp` — `isFeatureEnabled()` function
2. The specific feature's source file (e.g., `scheduler.cpp` should check `isFeatureEnabled(FSWITCH_SCHEDULER)` before every action)

**What to send me:**
- Serial output: type `f` to print all feature switches
- Which feature, what behavior you expected

---

### "No COM port" / Serial monitor shows nothing

**Not a code bug — hardware/driver issue:**
1. Check Device Manager → Ports for "CP2102" or "CH340"
2. Install the correct USB-to-serial driver (Silicon Labs CP2102 or CH340G)
3. Make sure you're connected to the UART port, not the native USB port
4. Check baud rate is 115200
5. Try a different USB cable (some are charge-only with no data wires)
6. Verify `ARDUINO_USB_CDC_ON_BOOT=0` in platformio.ini (if =1, logs go to native USB instead)

---

## PWA Symptoms

### UI not updating after relay/LED/timer change

**Files to check:**
1. `pwa/lib/ble.js` — notification handler for the relevant characteristic
2. `pwa/lib/bus.js` — is the event being published?
3. The relevant `pwa/hooks/` file — is it subscribed to the right event?

**What to send me:**
- Chrome console: any errors or warnings
- Chrome console: enable verbose logging (`localStorage.setItem('debug', 'true')`)
- Network tab → filter "bluetooth" for BLE traffic

---

### BLE connect fails in Chrome

**Files to check:**
1. `pwa/lib/ble.js` — `connect()` function
2. `pwa/lib/pure/protocol-pack.js` — UUID strings (must match protocol.h)

**What to send me:**
- Chrome console errors (exact text)
- Are you on Chrome or Edge? (required)
- Is the page served over HTTPS or localhost? (Web Bluetooth requires secure context)
- Windows: is the device already paired in Bluetooth settings? (try removing it)

**Common fixes:**
- `chrome://flags/#enable-experimental-web-platform-features` → Enabled
- Clear Chrome Bluetooth cache: `chrome://bluetooth-internals` → Devices → Forget

---

### Wrong colors in LED preview

**Files to check:**
1. `pwa/lib/pure/color-math.js` — `hsvToRgb()`, `hexToRgb()`, `rgbToHex()`
2. `pwa/components/LedPreview.js` — SVG circle fill rendering

**What to send me:**
- The hex/RGB value you entered
- What the preview shows vs what the strip shows

---

### Face not reacting to events

**Files to check:**
1. `pwa/lib/rules.js` — rules config array and matching
2. `pwa/lib/face.js` — parameter interpolation
3. `pwa/hooks/useFace.js` — event subscription

**What to send me:**
- Which event (relay on, BLE connect, etc.)
- Chrome console: look for "RULE:" or "FACE:" log lines

---

### Audio silent / not playing

**Files to check:**
1. `pwa/lib/audio.js` — AudioContext creation and `playSound()`
2. `pwa/lib/rules.js` — sound field in the matching rule

**What to send me:**
- Chrome console: look for "AUDIO:" log lines
- Did you click/tap the page after opening? (autoplay policy)
- Is audio toggle ON in the UI?
- Are the audio files present in `pwa/public/sounds/`?

---

### Offline not working / old version showing

**Files to check:**
1. `pwa/public/sw.js` — cache name version, precache list
2. `pwa/next.config.js` — basePath setting

**What to send me:**
- Chrome DevTools → Application → Service Workers (is it active?)
- Chrome DevTools → Application → Cache Storage (which version?)
- Try: Chrome DevTools → Application → Service Workers → Unregister, then hard refresh

---

### Layout broken on mobile

**Files to check:**
1. `pwa/styles/layout.css` — media queries for <768px
2. `pwa/styles/base.css` — safe-area-inset, viewport meta
3. The specific `pwa/screens/` file for the broken view

**What to send me:**
- Device and screen width (or Chrome DevTools responsive mode size)
- Screenshot of the broken layout

---

## Protocol Mismatch Debugging

If behavior is generally weird (wrong data, partial updates, garbled values),
check that these three files agree:

1. `firmware/include/protocol.h` — byte offsets and sizes
2. `docs/protocol.md` — human-readable spec
3. `pwa/lib/pure/protocol-pack.js` — JavaScript pack/parse functions

A mismatch here means one side writes bytes at different offsets than the other
reads them. Compare the offset tables side by side.

---

## How to Tell a Hardware Fault from a Code Fault

Run `selftest` in the serial console or click **Run Self-Test** in the PWA Diagnostics panel.
Review the structured output:

### 1. Reset Reason Failures
- **`[FAIL] Reset Reason : [HARDWARE] Brownout detected!`**
  - **Fault:** HARDWARE. The 5V power supply sagged below 4.5V under load (e.g. all 4 relay coils or WS2812B LEDs energized simultaneously).
  - **Fix:** Connect a dedicated 5V 2A power supply with 1000µF capacitor across the power rail. Never power relay coils directly from the ESP32 3.3V pin.
- **`[FAIL] Reset Reason : [CODE] Watchdog reset!`**
  - **Fault:** CODE. A FreeRTOS task or BLE callback blocked the scheduler for > 5 seconds.
  - **Fix:** Ensure no `delay()` or blocking calls exist in BLE write callbacks or main loop.

### 2. Relay Electrical Readback
- Run `relaytest 1` in serial console:
  - If output says: `WARNING: Pin level mismatch! HARDWARE fault or missing 10k pull-up resistor on GPIO4`:
    - **Fault:** HARDWARE. The ESP32 is outputting the correct electrical level, but the physical optocoupler input is floating, disconnected, or inverted.
    - **Fix:** Verify 10k external pull-up resistor to 3.3V on the active-LOW optocoupler input, and confirm common ground between ESP32 and relay board.
  - If output says: `(CODE & HARDWARE OK)`:
    - Both software pin logic and physical electrical levels agree.

### 3. LED Lighting Faults
- Run `ledtest` in serial console:
  - If LEDs stay completely dark across all 4 steps:
    - **Fault:** HARDWARE. Check 74HC245 level shifter wiring (VCC=5V, OE=GND, DIR=HIGH). WS2812B DIN requires 5V logic; 3.3V logic will not reliably trigger the first LED.
  - If LEDs show red when green was requested:
    - **Fault:** CODE / CONFIG. Open `firmware/include/config.h` and change `LED_COLOR_ORDER` from `NEO_RGB` to `NEO_GRB`.


