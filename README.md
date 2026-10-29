
# ⚡ SmartDesk BLE Controller

<p align="center">
  <strong>An Offline-First IoT Smart Desk Automation System</strong>
  <br />
  Control desk appliances, charging timers, RGB lighting, and desktop interactions
  directly from a browser — without Wi-Fi, cloud dependencies, or third-party native apps.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-ESP32--S3-E7352C?logo=espressif" alt="ESP32-S3" />
  <img src="https://img.shields.io/badge/Firmware-C%2B%2B-00599C?logo=cplusplus" alt="C++" />
  <img src="https://img.shields.io/badge/Connectivity-Bluetooth%20LE-0082FC?logo=bluetooth" alt="Bluetooth Low Energy" />
  <img src="https://img.shields.io/badge/Frontend-Next.js%20PWA-000000?logo=next.js" alt="Next.js PWA" />
  <img src="https://img.shields.io/badge/Control-Offline--First-2EA44F" alt="Offline First" />
  <img src="https://img.shields.io/badge/Lighting-WS2812B-orange" alt="WS2812B" />
</p>

---

## 🌟 Project Overview

**SmartDesk BLE Controller** is a Bluetooth Low Energy (BLE) smart desk automation system built around an ESP32-S3 microcontroller and a browser-based Progressive Web App (PWA).

It bridges embedded hardware and modern web technologies, enabling wireless control of desk appliances, automated power switching, charging timers, scheduled actions, and ambient RGB lighting.

Unlike cloud-dependent smart home systems, SmartDesk is designed to operate **locally over Bluetooth Low Energy**. The ESP32 handles device-side logic, while the PWA provides an interactive control interface.

### 💡 Core Concept

- **Offline-first:** No Wi-Fi, cloud account, or internet connection is required for the intended BLE control workflow.
- **Browser-based control:** Use the Web Bluetooth API to communicate with the ESP32 from a supported browser.
- **Hardware-backed automation:** Device-side timers can continue running independently of the browser after a timer has been accepted by the firmware.
- **Context-aware control:** BLE connection and disconnection events can trigger configured appliance behavior.
- **Expandable hardware:** A 74HC595 shift register expands relay-control outputs without requiring a separate ESP32 GPIO for every relay.
- **Customizable lighting:** Control WS2812B RGB lighting, brightness, colors, and effects.

> **Key engineering principle:** The ESP32 is the source of truth for device state and automation. The PWA is the control and visualization layer, not the sole owner of time-critical operations.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📡 BLE Connectivity | Communicates directly with the ESP32-S3 using a BLE GATT service |
| 🔌 Relay Control | Controls connected desk appliances through configurable relay drivers |
| 👤 Presence Detection | Uses authorized-device connection and disconnection events to trigger configured behavior |
| ⏲️ Hardware-Backed Timers | Runs accepted countdown timers on the device so they can continue after the browser closes |
| 📅 Scheduled Automation | Supports custom ON/OFF schedules and weekly scheduling logic |
| 🌈 RGB Lighting | Controls WS2812B colors, brightness, and animated effects |
| 📴 Offline Operation | Designed for local Bluetooth control without cloud dependencies |
| 🏠 Away Mode | Provides away-related automation and relay safety behavior |
| 🎵 Music Synchronization | Supports music-related packets, LED synchronization, and audio features |
| 📞 Call Mode | Includes call-related functionality |
| 🖥️ PC Unlock | Includes USB HID keyboard functionality with safety guards |
| 😊 Animated Desk Companion | Provides an animated face and dedicated display mode |
| 🧪 Demo Mode | Allows PWA features to be explored without physical hardware |
| 🛡️ Reliability Features | Includes watchdog, brownout, reset logging, and relay-control safeguards |

---

## 🧠 How It Works

The system separates the browser interface from the hardware that controls the desk.

```text
┌────────────────────────────────────────────┐
│             Browser / PWA                  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Next.js Interface                    │  │
│  │                                      │  │
│  │ Relay Controls • Timers • Schedules  │  │
│  │ RGB Lighting • Away Mode • Effects   │  │
│  └──────────────────┬───────────────────┘  │
│                     ↕                      │
│             Web Bluetooth API              │
│              BLE GATT Client               │
└─────────────────────┬──────────────────────┘
                      ↕
             Bluetooth Low Energy
                      ↕
┌─────────────────────┴──────────────────────┐
│                 ESP32-S3                   │
│                                            │
│  BLE GATT Server                            │
│       │                                    │
│       ├── Relay Manager                     │
│       ├── Presence / Away Logic             │
│       ├── Countdown Timers                  │
│       ├── Weekly Scheduler                  │
│       ├── LED Effects Engine                │
│       ├── USB HID Logic                     │
│       └── Settings & Reliability            │
│                    │                       │
│             74HC595 Shift Register          │
│                    │                       │
│             Isolated Relay Modules          │
│                    │                       │
│          Desk Appliances / AC Loads         │
│                                            │
│             WS2812B RGB LED Strip            │
└────────────────────────────────────────────┘
```

### Example Operating Flow

1. The user opens the PWA in a compatible browser.
2. The user connects to the ESP32-S3 through Bluetooth.
3. The PWA discovers and communicates with the device's BLE GATT service.
4. The user changes a relay, timer, schedule, or lighting setting.
5. The firmware processes the command and updates the relevant hardware or device state.
6. Device-side automation continues according to the accepted configuration, without requiring the browser to remain open for supported timer operations.

---

## 🔌 Hardware Stack & Circuitry

### 1. ESP32-S3 — Main Controller

The ESP32-S3 handles BLE communication, application logic, timers, and peripheral control.

Responsibilities include:

- Running the firmware and BLE GATT server.
- Processing commands from the PWA.
- Managing relay states and scheduling.
- Running device-side countdown timers.
- Controlling RGB LED effects.
- Managing settings and reliability features.

### 2. 74HC595 Shift Register — I/O Expansion

The 74HC595 serial-in, parallel-out shift register allows the ESP32-S3 to control multiple relay outputs using a smaller number of GPIO signals.

Benefits:

- Expands the available digital output capacity.
- Reduces the number of ESP32 GPIO pins required for relay control.
- Keeps relay-output logic separate from the high-level application interface.
- Supports an interchangeable relay-driver architecture in the firmware.

The project includes both GPIO-based and 74HC595-based relay driver implementations.

### 3. Optically Isolated Relay Modules — AC Load Switching

Relay modules provide the switching interface between low-voltage control signals and connected AC appliances.

Potential applications include:

- Desk lamps.
- Monitors.
- Chargers.
- Speakers and other compatible desk peripherals.

The intended setup supports switching appropriately rated AC loads, including 110 V or 220 V systems, depending on the relay module and installation.

**Electrical safety:** Mains voltage can cause fatal electric shock or fire. Use appropriately rated, enclosed, isolated hardware, proper fusing, strain relief, and suitable wiring. Do not handle exposed mains wiring while powered. Have mains-side installation inspected by a qualified electrician. Never connect mains voltage directly to ESP32 GPIO pins or a shift register.

### 4. WS2812B Addressable RGB Lighting

The WS2812B LED strip provides individually addressable RGB LEDs for desk ambience.

Supported functionality includes:

- Custom colors.
- Brightness adjustment.
- Animated lighting effects.
- Music-related synchronization features.

---

## 💻 Software Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Microcontroller | ESP32-S3 | Embedded controller |
| Firmware Language | C++ | Hardware control and application logic |
| Firmware Environment | PlatformIO / Arduino-ESP32 | Build and upload workflow |
| RTOS / Timers | FreeRTOS facilities | Device-side task and timer handling |
| Wireless Communication | Bluetooth Low Energy | Local device communication |
| Communication Protocol | BLE GATT | Commands, state, and data exchange |
| Web Framework | Next.js 14 App Router | PWA interface |
| Frontend | React 18 | Interactive UI components |
| Client Language | JavaScript | Application logic |
| Styling | Plain CSS | UI styling |
| Browser Connectivity | Web Bluetooth API | BLE access from supported browsers |
| LED Library | Adafruit NeoPixel | WS2812B control |
| Hardware I/O | GPIO / 74HC595 | Relay-control outputs |
| Local Persistence | ESP32 NVS | Device settings storage |
| Testing | Pure-logic checks | Hardware-independent logic verification |

> The firmware project uses the PlatformIO configuration and library versions specified below. The project documentation references Arduino-ESP32 core 3.x and NimBLE-Arduino 2.x.

---

## 👤 Context-Aware Presence Detection

SmartDesk can use the authorized device's BLE connection state to trigger configured desk automation.

### Arrival

When the authorized phone or laptop connects:

1. The ESP32 receives the relevant BLE connection event.
2. The configured presence logic evaluates the event.
3. The relay manager applies the configured behavior.
4. Primary desk loads, such as monitors or speakers, can be switched ON.

### Departure

When the BLE connection drops:

1. The ESP32 detects the disconnection.
2. Away-related logic evaluates the configured behavior.
3. The relay manager can switch designated loads OFF.
4. The system can reduce unnecessary power consumption.

### Important Behavior

BLE disconnection is a useful presence signal, but it is not proof that a person physically left the room. Range changes, radio interference, or a device shutting down Bluetooth can also cause disconnection.

For that reason, presence automation should be configurable, and essential equipment should not be switched off automatically unless doing so is appropriate for that equipment and use case.

---

## ⏲️ Hardware-Backed Charging Timers

One of the core design goals is to let the ESP32 manage countdown timers independently of the browser.

### The Problem

A browser-controlled timer can fail to complete its intended action if the browser closes, the laptop sleeps, or the client loses connectivity before issuing the final command.

### SmartDesk Approach

The PWA sends a timer configuration to the ESP32. Once the firmware accepts and starts the timer, the device manages the countdown and its configured relay action locally.

For example, a user could configure a two-hour charging timer:

1. Open the SmartDesk PWA.
2. Select the charging outlet or configured relay.
3. Set the countdown duration to two hours.
4. Send the timer configuration to the ESP32.
5. The firmware accepts the command and starts the device-side timer.
6. The browser can close or disconnect while the timer continues running.
7. When the countdown expires, the firmware executes the configured relay action.

### Why This Matters

- The browser does not need to remain open for the accepted timer to run.
- Timer execution is handled by the embedded device.
- The system is less dependent on a continuously connected web client.
- The timer can be useful for overnight charging and other time-limited loads.

### Timer Reliability Considerations

The exact behavior depends on the firmware's timer implementation, reset behavior, and relay state handling.

A normal FreeRTOS software timer does not automatically guarantee that a countdown survives a complete ESP32 reboot or power loss. If persistence across resets is required, the remaining time or deadline must be stored and recovered appropriately.

Likewise, automatic power cutoff is not, by itself, a guarantee against battery degradation. Use the device manufacturer's charging guidance and appropriate charging protection.

---

## 📅 Scheduled Automation

The scheduler supports custom ON/OFF schedules for desk peripherals.

The firmware includes a scheduler module with weekly scheduling logic.

Potential uses include:

- Turning selected desk appliances on at a configured time.
- Switching selected loads off at a configured time.
- Applying recurring schedules based on weekdays.
- Automating desk equipment without needing the PWA to stay open.

The firmware's schedule logic includes due-time checks and weekday masks.

---

## 🌈 RGB Lighting & Effects

The WS2812B lighting system is controlled through the ESP32 firmware and PWA interface.

### Lighting Controls

- Select custom RGB colors.
- Adjust brightness.
- Run animated lighting effects.
- Use supported music-related lighting synchronization.
- Configure ambient desk lighting from the browser.

The firmware separates LED control from effect rendering through dedicated modules:

- `leds.cpp/h` — LED strip control.
- `led_effects.cpp/h` — Effect rendering.
- `music.cpp/h` — Music-related packet handling.
- `calls.cpp/h` — Call-related behavior.

---

## 🛡️ Safety, Reliability & Design Decisions

### BLE-Only Architecture

The system is designed around local BLE communication rather than cloud connectivity.

- No Wi-Fi connection is required for the intended local control flow.
- No cloud account is required.
- No third-party native app is required for the browser control interface.
- The PWA communicates directly with the device through Web Bluetooth on supported platforms.

### ESP32 as the Source of Truth

Device-side state and automation are managed by the firmware.

The browser acts as a control and visualization interface. Supported device-side timers and automation are not dependent on the browser remaining open.

### Load-Based Relay Abstraction

The UI and BLE protocol operate in terms of whether an appliance should be ON or OFF, rather than exposing electrical coil levels or raw GPIO polarity.

The relay logic and hardware configuration handle conversion to the appropriate output level.

This separation makes the control interface less dependent on relay polarity and wiring configuration.

### Relay Initialization & Switching Protection

The firmware design includes:

- Setting relay outputs to their OFF level before other initialization.
- A minimum switching interval to prevent excessively rapid relay cycling.
- Away mode behavior that force-locks relays according to its logic.
- PC Unlock defaulting to OFF.
- Configurable feature switches at compile time and runtime.

These mechanisms help reduce unsafe or unintended switching. They do not replace proper electrical protection or independent safety-rated hardware where required.

### Reliability Monitoring

The firmware includes a dedicated reliability module for:

- Watchdog handling.
- Brownout-related behavior.
- Reset logging.

Settings are handled through the ESP32's non-volatile storage helpers.

---

## 🖥️ PC Unlock & Desk Companion

In addition to appliance automation, the project includes USB HID functionality and a dedicated animated display experience.

### USB HID

The firmware contains:

- `hid.cpp/h` — USB HID keyboard functionality.
- `hid_guard.cpp/h` — HID safety guards.

PC Unlock is configured to default to OFF, helping avoid unintended keyboard actions.

### Animated Desk Companion

The PWA includes an animated face and supporting UI modules.

Related files include:

- `face.js`
- `captions.js`
- `audio.js`
- `audio-sync.js`

The project also includes music packet handling, call mode, and LED synchronization-related functionality.

---

## 📁 Project Structure

```text
smart_desk_controller/
├── firmware/                       # ESP32-S3 PlatformIO project
│   ├── platformio.ini               # Build configuration
│   ├── include/
│   │   ├── pins.h                   # GPIO assignments
│   │   ├── config.h                 # Configurable constants
│   │   ├── features.h               # Compile-time feature flags
│   │   └── protocol.h               # BLE UUIDs, layouts, and errors
│   ├── lib/                         # Hardware-independent helpers
│   │   ├── relay_logic/             # Load-to-coil/level conversion
│   │   ├── led_math/                # Gamma, HSV, current estimation
│   │   ├── schedule_logic/          # Due-time checks and weekday masks
│   │   ├── packing/                 # BLE byte packing and parsing
│   │   └── password_obfuscation/
│   └── src/
│       ├── main.cpp                 # setup() and loop()
│       ├── relays.cpp/h              # Relay manager
│       ├── relay_driver.h            # Abstract relay driver
│       ├── relay_driver_gpio.cpp/h   # GPIO-based relay driver
│       ├── relay_driver_595.cpp/h    # 74HC595 relay driver
│       ├── ble_service.cpp/h         # BLE GATT server
│       ├── scheduler.cpp/h           # Weekly schedules
│       ├── timers.cpp/h              # Countdown timers
│       ├── away.cpp/h                # Away mode
│       ├── leds.cpp/h                # LED strip control
│       ├── led_effects.cpp/h         # LED effect rendering
│       ├── music.cpp/h               # Music packet handler
│       ├── calls.cpp/h               # Call mode
│       ├── hid.cpp/h                 # USB HID keyboard
│       ├── hid_guard.cpp/h           # HID safety guards
│       ├── feature_switches.cpp/h    # Feature switches
│       ├── system_cmds.cpp/h         # Reboot, factory reset, etc.
│       ├── settings.cpp/h            # NVS storage helpers
│       └── reliability.cpp/h         # Watchdog, brownout, reset log
├── pwa/                              # Next.js 14 PWA
│   ├── package.json
│   ├── next.config.js
│   ├── lib/
│   │   ├── pure/                     # Browser/React-independent logic
│   │   │   ├── protocol-pack.js
│   │   │   ├── relay-logic.js
│   │   │   ├── color-math.js
│   │   │   ├── time-math.js
│   │   │   ├── rules-match.js
│   │   │   ├── music-bands.js
│   │   │   └── schedule-format.js
│   │   ├── uuids.js
│   │   ├── ble.js
│   │   ├── demo.js
│   │   ├── bus.js
│   │   ├── store.js
│   │   ├── face.js
│   │   ├── rules.js
│   │   ├── captions.js
│   │   ├── audio.js
│   │   ├── audio-sync.js
│   │   └── features.js
│   ├── hooks/
│   ├── components/
│   ├── screens/
│   ├── styles/
│   ├── app/
│   │   ├── layout.js
│   │   └── page.js
│   └── public/
│       ├── sw.js
│       ├── manifest.json
│       └── icons/
├── docs/
│   ├── test-checklist.md             # Bring-up and verification checklist
│   ├── protocol.md                   # BLE protocol specification
│   ├── protocol-check.md             # Firmware/client protocol comparison
│   ├── serial-menu.md                # UART diagnostics and test commands
│   ├── wiring.md                     # Wiring and electrical schematics
│   ├── components.md                 # Bill of Materials
│   ├── debug-guide.md                # Symptom-based troubleshooting
│   └── audio-files.md                # Required audio files
├── .gitignore
└── README.md
```

---

## 📦 Versions

| Component | Version |
|---|---|
| PlatformIO platform | pioarduino |
| Arduino-ESP32 core | 3.x |
| NimBLE-Arduino | 2.x (2.1.0+) |
| Adafruit NeoPixel | 1.12.x |
| Next.js | 14 (App Router) |
| React | 18 |
| PWA language | Plain JavaScript |
| PWA styling | Plain CSS |
| Firmware language | C++ |

---

## 🚀 Quick Start

### Prerequisites

- ESP32-S3 development board.
- USB cable suitable for data transfer.
- PlatformIO CLI or VS Code with the PlatformIO extension.
- Node.js and npm.
- A compatible browser with Web Bluetooth support for real-device testing.
- The required relay, shift-register, and LED hardware for the features being tested.

### 1. Firmware: Build and Upload

Navigate to the firmware directory:

```bash
cd firmware
```

Build the firmware:

```bash
pio run
```

Connect the ESP32-S3 through the appropriate USB/UART port, then upload:

```bash
pio run --target upload
```

Some boards may require holding BOOT and briefly pressing RESET to enter the bootloader.

Open the serial monitor:

```bash
pio device monitor
```

### 2. PWA: Development and Testing

Navigate to the PWA directory:

```bash
cd pwa
```

Install dependencies:

```bash
npm install
```

Run the hardware-independent logic checks:

```bash
npm run check:pure
```

The existing project documentation reports **124 assertions** for this check. The actual assertion count depends on the current test suite.

Start the development server:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

Click **Demo Mode** in the header to test the PWA features without connecting physical hardware.

### 3. PWA: Production Build and GitHub Pages

Navigate to the PWA directory:

```bash
cd pwa
```

If deploying to a GitHub Pages project site, configure the repository base path before building.

For example, for:

```text
https://username.github.io/smart_desk_controller/
```

On Linux/macOS:

```bash
export NEXT_PUBLIC_BASE_PATH="/smart_desk_controller"
npm run build
```

On Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/smart_desk_controller"
npm run build
```

The project configuration is expected to export static files into the `out/` directory.

Publish the generated static output using your configured GitHub Pages deployment workflow, such as a `gh-pages` branch.

> The base-path setting, static export configuration, and browser BLE permissions must match the actual deployment. Web Bluetooth generally requires a secure context such as HTTPS, except for supported local development contexts.

---

## 🪟 Windows Startup: Fullscreen Desk Display

The PWA can be opened in an application-style Chrome window when Windows starts. This is useful for a dedicated laptop or secondary monitor used as a desk companion display.

### Setup

1. Press `Win + R`.
2. Enter:

   ```text
   shell:startup
   ```

3. Right-click inside the Startup folder and select **New → Shortcut**.
4. Use a command similar to the following, updating the Chrome path and deployed URL:

   ```cmd
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://yourusername.github.io/smart_desk_controller/ --start-fullscreen
   ```

5. Click **Next**, name the shortcut `SmartDesk Display`, and select **Finish**.
6. Restart or sign in to Windows to test the startup behavior.

### Notes

- Replace the example URL with your actual deployment URL.
- The `--app` and `--start-fullscreen` flags launch Chrome in an application-style fullscreen window.
- Browser autoplay and Bluetooth permissions remain subject to browser policies. Fullscreen mode does not automatically bypass these restrictions.
- The PWA may still require user interaction to initiate a BLE connection.

---

## 🧪 Testing & Verification

The project includes hardware-independent logic checks and documentation for testing the firmware and hardware.

### Automated / Hardware-Independent Checks

```bash
cd pwa
npm run check:pure
```

The pure logic layer is designed to isolate functionality that does not require browser APIs, React, or physical hardware.

Relevant modules include:

- `protocol-pack.js`
- `relay-logic.js`
- `color-math.js`
- `time-math.js`
- `rules-match.js`
- `music-bands.js`
- `schedule-format.js`

### Hardware Verification

Use the project's bring-up checklist and serial diagnostic tools to verify the hardware before connecting AC loads.

Recommended checks include:

- Confirm BLE advertising and GATT connectivity.
- Verify protocol mappings between firmware and PWA.
- Test relay logic with safe low-voltage loads first.
- Verify countdown expiration and relay action.
- Test scheduled actions and weekday handling.
- Verify LED colors, brightness, and effects.
- Test reconnection and disconnection behavior.
- Inspect watchdog, brownout, and reset logs.
- Confirm relay outputs initialize to their configured OFF state.

**Do not use exposed mains wiring as a debugging setup.** Validate the logic using low-voltage test equipment or suitable isolated test fixtures before any qualified mains-side installation.

---

## 📚 Documentation

The repository includes the following supporting documents:

| Document | Description |
|---|---|
| [Bring-Up & Verification Checklist](docs/test-checklist.md) | Ten-stage testing matrix |
| [Protocol Specification](docs/protocol.md) | BLE GATT protocol specification |
| [Protocol Verification Check](docs/protocol-check.md) | Firmware and client protocol mapping |
| [Interactive Serial Menu](docs/serial-menu.md) | UART diagnostics and hardware test commands |
| [Wiring Guide](docs/wiring.md) | Pinouts and electrical schematics |
| [Component List](docs/components.md) | Bill of Materials (BOM) |
| [Debug Guide](docs/debug-guide.md) | Troubleshooting by symptom |
| [Audio Files](docs/audio-files.md) | Required audio files and Web Audio synthesizer details |

---

## 🧭 Design Decisions at a Glance

| Design Decision | Reason |
|---|---|
| BLE-only connectivity | Local control without cloud or Wi-Fi dependencies |
| ESP32 as source of truth | Device-side state and automation are not solely browser-dependent |
| Load-based relay abstraction | Separates appliance ON/OFF semantics from electrical output polarity |
| GPIO and 74HC595 relay drivers | Supports different relay-output configurations |
| Hardware-backed countdowns | Allows accepted timer operations to continue after browser disconnection |
| Compile-time and runtime feature switches | Enables configurable functionality |
| Dedicated pure logic modules | Makes important logic easier to test without hardware |
| Relay OFF initialization | Helps prevent unintended relay activation during startup |
| Switching interval safeguards | Reduces excessively rapid relay cycling |
| Watchdog and reset logging | Helps diagnose reliability issues |

---

## 🛣️ Future Improvements

Potential areas for further development include:

- [ ] Persistent countdown recovery across unexpected resets.
- [ ] More comprehensive automated firmware tests.
- [ ] Additional relay-driver and board configurations.
- [ ] Improved diagnostics for BLE disconnections and reconnections.
- [ ] More configurable presence-detection policies.
- [ ] Expanded timer and schedule testing.
- [ ] Enhanced PWA feedback for device state and command failures.
- [ ] Additional RGB animations and music-synchronized effects.
- [ ] Expanded hardware verification and safety documentation.

These are possible future improvements, not claims that every item is currently implemented.

---

## 🤝 Contributing

Contributions, bug reports, testing feedback, and feature suggestions are welcome.

### How to Contribute

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes.
4. Run the relevant tests and build checks.
5. Commit and push your branch.
6. Open a Pull Request describing the change and how it was tested.

For hardware-related changes, include wiring details, affected pins, and relevant test results. Do not publish credentials, private keys, or sensitive device information.

---

## 👨‍💻 Author

**Gonaboyina Anand Kumar**

**GitHub:** [@anandgonaboyina](https://github.com/anandgonaboyina)

SmartDesk BLE Controller explores the integration of embedded systems, wireless communication, web interfaces, and practical desk automation.

The project brings together ESP32-S3 firmware, BLE GATT communication, a browser-based PWA, expandable relay control, device-side countdown timers, scheduling, and RGB lighting.

A key design goal is to keep the hardware responsible for its own control logic while allowing the browser to provide a flexible, cross-platform interface without cloud dependencies.

---

<p align="center">
  <strong>Built to connect embedded hardware with modern web technologies. ⚡</strong>
  <br />
  <em>Local control. Hardware-backed automation. No cloud required.</em>
</p>
