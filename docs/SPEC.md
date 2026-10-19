# SmartDesk Controller — Complete Specification

## 1. Project Overview & User Profile
- **User**: Anand (EEE & MERN background, solders own hardware and mains wiring; cannot debug C++).
- **Target Experience**: Software testable first with NOTHING connected; hardware wired later.
- **Form Factor**: ESP32-S3 BLE peripheral + Next.js 14 PWA running in Chrome on Windows (fullscreen, display role) and on Android/phone (remote role).

---

## 2. Technology Stack & Versions
- **Firmware**: PlatformIO with `pioarduino` platform (Arduino-ESP32 core 3.x), NimBLE-Arduino 2.x, Adafruit NeoPixel, Preferences (NVS), built-in TinyUSB HID (`ARDUINO_USB_MODE=0`, `ARDUINO_USB_CDC_ON_BOOT=0`).
- **UART Port**: CP2102/CH340 (GPIO43/44) for flashing and serial monitor at 115200 baud.
- **Native USB Port**: GPIO19/20 reserved strictly for TinyUSB HID keyboard to laptop.
- **PWA**: Next.js 14 App Router, React 18, static export (`output: 'export'`), plain JavaScript, plain CSS (CSS variables, dark theme default, no external fonts), all pages `"use client"`, browser APIs restricted to `useEffect`. Hand-written `public/sw.js`. Only dependencies: `next`, `react`, `react-dom`.

---

## 3. Hardware Architecture & Pin Map
- **MCU**: ESP32-S3 N16R8 (16MB Flash, 8MB Octal PSRAM).
- **Relays (Current)**: 4-channel isolated optocoupler relay module driven directly by GPIOs (3.3V logic confirmed).
  - CH1 = GPIO4
  - CH2 = GPIO5
  - CH3 = GPIO6
  - CH4 = GPIO7
- **Relay Driver Abstraction**:
  - `RelayDriver` abstract base class (`begin`, `setOutput`, `applyAll`, `safeStateAll`).
  - `GpioRelayDriver` (active now, 4 channels).
  - `ShiftRegisterRelayDriver` (compiled, 74HC595 on GPIO15 SER, 16 SRCLK, 17 RCLK, 18 OE; boot: OE HIGH, clear, load state, latch, OE LOW).
- **LED Strip**:
  - Exactly 8 WS2812B LEDs on 1 data line (DIN = GPIO8) through 74HC245 level shifter + 330Ω resistor. 1000µF capacitor across strip supply.
  - Power: 5V 3A adapter (do NOT power simultaneously with laptop USB without isolation).
- **Physical Controls**:
  - Push button on GPIO9 (to GND, internal pull-up).
  - Status LED on GPIO10 (+ 330Ω to GND).
- **Reserved Pins**:
  - GPIO1/2: Future I2C DS3231 RTC.
  - GPIO15/16/17/18: Future 74HC595 shift register.
  - GPIO19/20: Native USB D-/D+.
  - GPIO43/44: UART TX/RX for logs.
  - Strapping (0, 3, 45, 46), Flash/PSRAM (26-37), and Onboard LED (48) strictly forbidden.

---

## 4. Relay System Architecture
1. **Load-Term Abstraction**:
   - All UI, BLE, timers, schedules, and Away mode operate in **LOAD state** (is appliance powered?).
   - Conversion logic:
     `coil = (wiring == NC) ? !load : load;`
     `level = (polarity == ACTIVE_LOW) ? !coil : coil;`
2. **Per-Relay Configuration (NVS)**:
   - Name (up to 16 chars), enabled/hidden, icon keyword.
   - Input polarity: active-LOW (0) or active-HIGH (1). Default active-LOW.
   - Contact wiring: NO (0) or NC (1). Default NO.
   - Boot behavior: last state (0), always OFF (1), always ON (2). Default last state.
   - GPIO pin: validated against safe list with duplicate-pin check.
   - Min switch interval: default 2000 ms.
   - Affected by Away mode: checkbox.
3. **Safe Boot Sequence**:
   - Every relay pin initialized to OFF level immediately in `setup()`, before BLE/NVS/LED/USB init.
   - 10kΩ external pull-ups recommended for active-LOW modules to prevent reset float.
   - Min switch interval enforced per-channel to protect chargers from rapid cycling.

---

## 5. Firmware Features
1. **BLE GATT Peripheral**:
   - 1 custom service (`d3a00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1`), versioned protocol v1.1.
   - Up to 2 concurrent clients (Laptop Display + Phone Remote). Advertising restarts on connect & disconnect.
   - ESP32 is single source of truth; notifies all clients on every change. Last-write-wins.
   - Static PIN pairing (`123456`) when `SECURITY_MODE=1`.
2. **Time Sync & Schedules**:
   - Time synced from PWA (UNIX timestamp + timezone offset in minutes).
   - Up to 16 weekly schedules (relay index, weekday mask, on/off time, optional catch-up window).
   - Up to 8 timers (turn off after N minutes). Checkpointed to NVS once per minute; active timers resume on reboot and override relay boot behavior. Notifies PWA on resume.
3. **Away Mode**:
   - Exit delay (default 60s, cancelable).
   - Forces off all relays marked "affected by Away".
   - Force-off lock: schedules/timers cannot turn those relays on while Away is active.
   - Return behavior: keep off or restore previous states.
   - Double-press physical button toggles Away. Short press turns all relays off. Hold 10s clears settings.
4. **LED Strip (8 LEDs, WS2812B)**:
   - Modes: OFF, MANUAL, AUTO (time-of-day slots), MUSIC reactive.
   - Effects: solid, breathe, rainbow, rainbow-chase, color-chase, twinkle, fire, gradient, strobe (safety rate-limited), blink (configurable on/off ms), double-blink, heartbeat.
   - Presets: up to 8 named scenes in NVS.
   - Priority: Call mode busy (4) > Notification blink (3) > Music (2) > Manual (1) > Auto (0).
   - Notification blinks: configurable patterns (color, count, on_ms, off_ms) for timer ended, away started/ended, schedule fired, call on, ble connect/lost.
   - Boot settings: last state / preset / off; 50% inrush brightness limit for first second; optional boot sweep animation; optional BLE status indication.
   - Safety caps: `LED_MAX_BRIGHTNESS` (80/255), software current estimate capped at `LED_MAX_MA` (300mA).
   - Photosensitivity cap: blinks/strobes faster than 3 flashes/second (<334ms cycle) rejected with `ERR_PHOTOSENSITIVITY`.
5. **Music Sync**:
   - 4-byte packets `[bass, mid, treble, beat]` written without response on `UUID_MUSIC_STREAM`.
   - Streaming client timeout (2s) reverts to previous mode.
   - AudioWorklet on PWA, mic requested only via user click.
6. **Call Mode**:
   - Manual toggle or auto-off timer. Busy LED color on strip, PWA audio muted.
7. **PC Unlock (USB HID Keyboard)**:
   - Types: wake key, delay, password/PIN, optional Enter.
   - Auto-type on fresh USB mount with configurable delay (default 150s, range 10-300s).
   - Safety guards: skips auto-type if Display client connected (already logged in); 5 min cooldown; max 3 auto-types per day; never types while manual type is active; master switch overrides all paths.
   - Password write-only, stored obfuscated with chip-ID derived key.
8. **Runtime Feature Switches (15 switches)**:
   - PC Unlock (master), USB typing, BLE HID, Auto-type, Scheduler, Timers, Away mode, LED strip (master), LED Auto, Music sync, Call mode, Relay-LED link, Daily reboot, Notification blinks, Boot animation.
   - Disabling stops task/rejects writes; stored data is never wiped.
9. **Reliability**:
   - Task watchdog, brownout logging, reset reason stored in NVS, no blocking in BLE callbacks (FreeRTOS queues), minimal String allocation.

---

## 6. PWA Architecture
- **Event Bus (`bus.js`)**: All services, UI, rules, and audio talk via publish/subscribe.
- **Layers**:
  - `pwa/lib/pure/`: pure algorithms (protocol packing, relay logic, time math, color math, rules matching, music bands).
  - `pwa/lib/`: browser API services (BLE, audio, audio-sync, storage, face, demo).
  - `pwa/hooks/`: React state hooks wiring bus to components.
  - `pwa/components/`: small presentational UI components (props in, JSX out, <=120 lines).
  - `pwa/screens/`: dashboard, relays, leds, unlock, schedules, away, features, system.
- **Two App Modes**:
  - Display: Fullscreen ambient dashboard for laptop with animated SVG face, captions, audio, and clock.
  - Remote: Compact high-efficiency control panels for phone.
- **Animated Face**:
  - Parameter-driven SVG (eye openness, pupil pos, eyebrow angle, mouth curve, cheek glow) with idle blinking, breathing, and mood transitions.
- **Rule Engine (`rules.js`)**:
  - Maps system events to face emotions, audio cues, and captions with cooldowns and quiet hours.
- **Demo Mode**:
  - Fully simulated ESP32 backend in browser when hardware is absent.

