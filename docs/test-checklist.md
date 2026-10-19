# SmartDesk Controller — Production Bring-Up & Verification Checklist

This document is the master step-by-step verification checklist for bringing up both the ESP32-S3 firmware and Next.js PWA. Follow the stages in order.

---

## Stage 1: ESP32-S3 Standalone Serial Bring-up (Zero Hardware Attached)

> **Objective:** Verify firmware execution, NVS storage, FreeRTOS tasks, and interactive UART serial menu without any external sensors, relays, or LEDs connected.

1. **Connect USB-to-UART Cable:**
   - Plug the CP2102/CH340 USB cable into your computer and the ESP32-S3 UART port (GPIO43/44).
   - Open a terminal at **115200 baud, 8N1** (e.g., using PlatformIO Serial Monitor or PuTTY).
2. **Observe Boot Self-Test Report:**
   - Press the `EN` / `RST` button on the ESP32-S3.
   - Verify the boot banner and self-test table:
     ```text
     ================================================================
      SMARTDESK CONTROLLER v1.1.0 BOOT SELF-TEST REPORT
     ================================================================
     [PASS] Reset Reason: Power-on or software reset
     [PASS] NVS Storage: Opened partition 'smartdesk' successfully
     [PASS] Relay Config: Safe pin assignments, no duplicate pins
     [PASS] Relay Readback: All 4 channels initialized to SAFE OFF
     [PASS] LED Driver: WS2812B strip initialized (8 pixels)
     [PASS] LED Task: Running on core 1
     [PASS] BLE Stack: NimBLE server advertising 'SmartDesk-ESP32'
     [PASS] USB HID: TinyUSB stack ready
     [PASS] PSRAM Size: 8388608 bytes detected
     [PASS] Free Heap: > 180000 bytes available
     [PASS] Protocol Version: 1.1 matches specification
     ----------------------------------------------------------------
     RESULT: 11/11 PASS. 0 HARDWARE FAULTS, 0 CODE FAULTS.
     ================================================================
     ```
3. **Interactive Serial Menu Commands:**
   - Type `help` and press Enter. Verify the full list of commands appears.
   - Type `selftest` and press Enter. Confirm on-demand self-test runs and passes.
   - Type `status` and press Enter. Confirm uptime, heap, and client counts are displayed.
   - Type `log level d` and press Enter. Confirm `[SYS] Log level set to DEBUG`.
   - Type `relaytest 0`. Confirm relay 0 pulses and reports GPIO level readback.
   - Type `ledtest`. Confirm red, green, blue cycle logs appear.
   - Type `log level i` to restore normal logging level.

---

## Stage 2: PWA Browser Bring-up in Demo Mode (Zero Hardware Attached)

> **Objective:** Verify the Next.js 14 Progressive Web App in Chrome on localhost without requiring BLE hardware.

1. **Start Dev Server:**
   ```bash
   cd pwa
   npm run dev
   ```
2. **Open PWA in Chrome:**
   - Open `http://localhost:3000`.
   - Open Chrome DevTools (`F12`) and view the **Console** tab.
3. **Verify Demo Mode Banner & Storage:**
   - Click the "Demo Mode" toggle in the header or status bar.
   - Verify the Amber banner `Demo Mode (Simulated Data)` appears.
   - Verify simulated log entries stream into the Diagnostics screen.
4. **Interactive Screen Verification:**
   - **Dashboard / DisplayScreen:** Face blinks naturally, clock updates every second, captions update on events.
   - **RemoteScreen:** Relay switches toggle smoothly with simulated audio clicks.
   - **RelaySettingsScreen:** Edit relay name, change polarity (active-LOW / active-HIGH), change contact wiring (NO / NC). Verify load vs coil calculation updates immediately.
   - **LedScreen:** Change colors on the color wheel, adjust brightness slider, select effects (breathe, rainbow, twinkle, heartbeat). Verify 8 SVG preview circles update in real-time.
   - **DiagnosticsScreen:** View simulated device logs, filter by level (`ERROR`, `WARN`, `INFO`, `DEBUG`), click "Run Self-Test", and verify the simulated pass report.
   - **SystemScreen:** Click "Reboot Controller" and verify simulated disconnect toast.

---

## Stage 3: Real BLE Connection & Role Negotiation

> **Objective:** Connect real ESP32-S3 hardware via Web Bluetooth in Chrome.

1. **Prerequisites:**
   - Ensure Bluetooth is enabled on the host PC or phone.
   - Ensure the ESP32-S3 is powered and the serial monitor confirms BLE advertising.
2. **First-Time Connection & Role Pairing:**
   - Open `http://localhost:3000` (or the deployed GitHub Pages URL).
   - In the PWA Header, click **Connect**.
   - Select `SmartDesk-ESP32` from the Chrome Bluetooth device picker.
   - If prompted for a pairing PIN, enter `123456`.
3. **Role Assignment Verification:**
   - On Laptop: Confirm the PWA writes `ROLE_DISPLAY` (0x00) to `UUID_CLIENT_ROLE`.
   - On Phone: Confirm the PWA writes `ROLE_REMOTE` (0x01) to `UUID_CLIENT_ROLE`.
   - Verify the ESP32 serial monitor logs:
     ```text
     [BLE] Client connected (conn_id: 0, addr: xx:xx:xx:xx:xx:xx)
     [BLE] Client 0 assigned role: DISPLAY
     ```
4. **State Synchronization:**
   - Observe that the PWA automatically subscribes to relay notifications, LED state, timers, and schedules.
   - Confirm all UI indicators show real-time state from the ESP32 within 200ms.

---

## Stage 4: Feature Switch Persistence & Runtime Lockouts

> **Objective:** Verify runtime feature toggling without firmware re-flashing.

1. **Toggle Switch via PWA:**
   - Navigate to the **Features** screen.
   - Toggle `Scheduler` OFF.
   - Verify serial log: `[FEAT] Switch 4 (Scheduler) changed to OFF`.
2. **Verify Runtime Lockout:**
   - Attempt to add or trigger a schedule.
   - Confirm the operation is rejected or schedules remain dormant.
3. **Reboot Persistence:**
   - Press the ESP32 reset button or click "Reboot" in SystemScreen.
   - After boot, verify `Scheduler` remains OFF in both firmware logs and PWA UI.
   - Toggle `Scheduler` back ON and verify normal scheduling resumes.

---

## Stage 5: Relay Logic, Polarity & Min Switching Interval

> **Objective:** Ensure mains loads cannot be damaged by rapid cycling or inverted logic.

1. **Load vs Coil Truth Table:**
   - For an **Active-LOW, Normally-Open (NO)** relay:
     - Load ON: Coil energized, GPIO = LOW (0V).
     - Load OFF: Coil de-energized, GPIO = HIGH (3.3V).
   - Verify on serial monitor: `[RELAY] Ch0: Load=1 -> Coil=1 -> GPIO=0 (LOW) [source: BLE]`.
2. **Min Switching Interval Protection (2000ms default):**
   - Click a relay toggle rapidly twice in less than 2000ms.
   - Confirm the second click is rejected:
     - Firmware logs: `[RELAY] Ch0 command rejected: MIN_SWITCH_INTERVAL active`.
     - PWA shows a warning toast or enforces UI debounce.

---

## Stage 6: Weekly Schedules & Countdown Timers with Reboot Survivability

> **Objective:** Verify automation rules and NVS checkpoint recovery across unexpected power cuts.

1. **Set Countdown Timer:**
   - In **Schedules & Timers**, set a 5-minute timer on Relay 1.
   - Verify the countdown starts ticking down in the PWA.
2. **Reboot Survivability Test:**
   - Wait 65 seconds (allowing the once-per-minute NVS checkpoint to save remaining time).
   - Unplug and reconnect the ESP32 power.
   - Monitor the serial console on boot:
     ```text
     [TIMER] Active timer restored for relay 1: 4 minutes remaining
     [TIMER] Relay 1 turned ON (timer resume overrides boot behavior)
     ```
   - Reconnect the PWA: verify the timer countdown resumes at ~4 minutes.
   - Wait for the timer to reach 0: confirm relay clicks OFF and notification sound plays.

---

## Stage 7: Away Mode Force-Off Lock & Return Restoration

> **Objective:** Ensure automated energy savings and tamper-proof safety locks when away.

1. **Configure Away Settings:**
   - Mark Relay 1 (Desk Lamp) and Relay 2 (Monitor) as "Affected by Away".
   - Turn both relays ON.
   - Set Exit Delay to 15 seconds.
2. **Activate Away Mode:**
   - Click "Activate Away" in the PWA or double-press the physical button (GPIO9).
   - Confirm 15-second visual countdown starts.
3. **Verify Force-Off & Safety Lock:**
   - When countdown expires, confirm Relays 1 and 2 turn OFF.
   - Attempt to turn Relay 1 ON via a schedule or timer.
   - Confirm command is blocked with `[AWAY] Relay 1 command locked: AWAY MODE ACTIVE`.
4. **Deactivate Away Mode:**
   - Click "Return" in the PWA or double-press the button again.
   - Verify Relays 1 and 2 are restored to their previous ON states (if configured).

---

## Stage 8: Addressable LED Strip (WS2812B) Modes & Safety Caps

> **Objective:** Verify visual feedback, priority stack, and photosensitivity safety guards.

1. **Inrush Current Protection:**
   - On cold boot, observe that the LED strip powers on at ≤50% brightness for the first second before ramping to user setting.
2. **Priority Stack Verification:**
   - Set LED mode to **Auto (Time-of-Day)** or **Manual Green**.
   - Trigger a notification blink (e.g., Timer ended): verify strip blinks Amber (Priority 3) then immediately restores Green (Priority 1).
   - Turn **Call Mode** ON: verify strip switches to Busy Red (Priority 4).
   - Turn Call Mode OFF: verify strip immediately returns to Green.
3. **Photosensitivity Rate Limit Guard (<334ms):**
   - Attempt to configure a blink effect with ON = 100ms and OFF = 100ms (5 flashes/sec).
   - In PWA: Confirm photosensitivity warning dialog appears requiring explicit user confirmation.
   - In Firmware: Confirm any frequency > 3 flashes/second without safety override is rejected with `ERR_PHOTOSENSITIVITY`.

---

## Stage 9: TinyUSB PC Unlock Auto-Type & Multi-Guard Security

> **Objective:** Secure auto-login via native USB HID keyboard emulation without password leakage.

1. **Safety Preparation:**
   - Open Windows **Notepad** and ensure the cursor is focused inside the text area.
   - Connect the ESP32 Native USB port (GPIO19/20) to the PC.
2. **Manual Type Test:**
   - In the PWA Unlock screen, enter a test string (e.g., `HelloSmartDesk123`).
   - Click **Test Typing (Immediate)**.
   - Observe keystrokes appearing inside Notepad after the configured wake delay.
   - Verify the password is NEVER printed in serial logs or BLE characteristics.
3. **Multi-Guard Auto-Type Decisions:**
   - Connect the PWA with `ROLE_DISPLAY` (Laptop display connected).
   - Plug the ESP32 Native USB port into the PC.
   - Verify serial log: `[HID] Auto-type suppressed: Display client is already connected`.
   - Verify 5-minute cooldown guard prevents rapid repeat typing.
   - Toggle **PC Unlock Master Switch** OFF: verify all typing commands are completely blocked.

---

## Stage 10: Music Reactive Streaming & Audio Synchronization

> **Objective:** Real-time visual music reactivity via Web Audio API.

1. **Start Music Reactive Mode:**
   - Navigate to the **LEDs** screen and click **Start Music Sync**.
   - Allow microphone / audio capture in Chrome if prompted.
   - Play an upbeat song through your speakers or desktop audio.
2. **Verify Reactive Lighting:**
   - Observe Bass beats triggering LED strip pulses.
   - Observe Mid/Treble energy modulating LED color hues.
3. **Streaming Timeout Fallback:**
   - Pause or stop music audio.
   - After 2.0 seconds of no audio packets, verify firmware automatically falls back to the previous LED mode (`[MUSIC] Stream timeout: reverting to previous LED mode`).

---

## Bring-Up Sign-Off Matrix

| Stage | Subsystem | Hardware Required? | Tested Date | Result (PASS / FAIL) | Tester |
|:---:|:---|:---:|:---:|:---:|:---:|
| 1 | UART Serial Menu & Self-Test | No | | | |
| 2 | PWA Demo Mode & Screens | No | | | |
| 3 | Real BLE GATT Pairing & Roles | Yes (ESP32) | | | |
| 4 | Feature Switch Persistence | Yes (ESP32) | | | |
| 5 | Relays & Min Switch Interval | Yes (ESP32 + Module) | | | |
| 6 | Schedules & Timer Reboot Surv. | Yes (ESP32) | | | |
| 7 | Away Mode & Force-Off Lock | Yes (ESP32) | | | |
| 8 | WS2812B LEDs & Priority Stack | Yes (ESP32 + 8 LEDs) | | | |
| 9 | TinyUSB PC Unlock & Guards | Yes (ESP32 USB) | | | |
| 10 | Music Reactive Stream & Fallback| Yes (ESP32 + Mic) | | | |

