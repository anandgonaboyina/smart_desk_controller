# SmartDesk BLE Controller

A BLE-only smart desk controller: ESP32-S3 firmware + Next.js PWA.

Relay control, scheduling, timers, Away mode, WS2812B LED strip with effects
and music sync, PC unlock via USB HID, and an animated face — all over
Bluetooth Low Energy with no Wi-Fi, no cloud, no internet required.

## Project Structure

```
smart_desk_controller/
├── firmware/                 # ESP32-S3 PlatformIO project
│   ├── platformio.ini        # Build config (pioarduino, core 3.x)
│   ├── include/              # Global headers
│   │   ├── pins.h            # GPIO assignments (single source)
│   │   ├── config.h          # Tuneable constants
│   │   ├── features.h        # Compile-time feature flags
│   │   └── protocol.h        # BLE protocol (UUIDs, layouts, errors)
│   ├── lib/                  # Pure helper libraries (no hardware)
│   │   ├── relay_logic/      # Load→coil→level conversion
│   │   ├── led_math/         # Gamma, HSV, current estimation
│   │   ├── schedule_logic/   # Is-due checks, weekday masks
│   │   ├── packing/          # Byte packing/parsing for BLE
│   │   └── password_obfuscation/
│   └── src/                  # Main implementation files
│       ├── main.cpp          # Entry point, setup(), loop()
│       ├── relays.cpp/h      # Relay manager
│       ├── relay_driver.h    # Abstract driver interface
│       ├── relay_driver_gpio.cpp/h
│       ├── relay_driver_595.cpp/h
│       ├── ble_service.cpp/h # BLE GATT server
│       ├── scheduler.cpp/h   # Weekly schedules
│       ├── timers.cpp/h      # Countdown timers
│       ├── away.cpp/h        # Away mode
│       ├── leds.cpp/h        # LED strip control
│       ├── led_effects.cpp/h # Effect rendering
│       ├── music.cpp/h       # Music packet handler
│       ├── calls.cpp/h       # Call mode
│       ├── hid.cpp/h         # USB HID keyboard
│       ├── hid_guard.cpp/h   # HID safety guards
│       ├── feature_switches.cpp/h
│       ├── system_cmds.cpp/h # Reboot, factory reset, etc.
│       ├── settings.cpp/h    # NVS storage helpers
│       └── reliability.cpp/h # Watchdog, brownout, reset log
├── pwa/                      # Next.js 14 PWA
│   ├── package.json
│   ├── next.config.js
│   ├── lib/
│   │   ├── pure/             # No browser APIs, no React
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
│   ├── protocol.md           # BLE protocol spec (source of truth)
│   ├── wiring.md             # Wiring diagrams
│   ├── components.md         # BOM
│   ├── debug-guide.md        # Troubleshooting by symptom
│   └── audio-files.md        # Required audio files list
├── .gitignore
└── README.md
```

## Versions

| Component | Version |
|-----------|---------|
| PlatformIO platform | pioarduino (Arduino-ESP32 core 3.x) |
| NimBLE-Arduino | 2.x (2.1.0+) |
| Adafruit NeoPixel | 1.12.x |
| Next.js | 14 (App Router) |
| React | 18 |
| Language (PWA) | Plain JavaScript, plain CSS |

## Quick Start

### Firmware

```bash
# Install PlatformIO CLI or use VS Code with PlatformIO extension
cd firmware

# Build
pio run

# Upload (connect UART USB port, may need to hold BOOT + tap RST)
pio run --target upload

# Serial monitor
pio device monitor
```

### PWA (Development & Testing)

```bash
cd pwa
npm install

# Run pure layer isolation check and unit tests (124 assertions)
npm run check:pure

# Start development server
npm run dev
# Open http://localhost:3000 in Chrome or Edge
# Click 'Demo Mode' in header to test all features with zero physical hardware!
```

### PWA (Production Build & GitHub Pages Deployment)

```bash
cd pwa

# 1. Set repository base path if deploying to GitHub Pages project site
# (e.g. for https://username.github.io/smart_desk_controller/)
export NEXT_PUBLIC_BASE_PATH="/smart_desk_controller"   # Linux/macOS
$env:NEXT_PUBLIC_BASE_PATH="/smart_desk_controller"      # Windows PowerShell

# 2. Build static export
npm run build

# 3. Deploy
# Next.js exports static files into the `out/` directory.
# Commit or publish `out/` to your gh-pages branch.
```

### Windows Startup Fullscreen Display Mode

To make a dedicated laptop or secondary monitor boot automatically into the animated desk companion display:

1. Press `Win + R` and type `shell:startup` (opens Windows Startup folder).
2. Right click → **New** → **Shortcut**.
3. Set target command line (adjust URL to your deployed GitHub Pages or local host):
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://yourusername.github.io/smart_desk_controller/ --start-fullscreen --autoplay-policy=no-user-gesture-required
```
4. Click **Next**, name the shortcut `SmartDesk Display`, and click **Finish**.
5. On Windows boot, Chrome launches in kiosk mode, skips audio gesture blocking, and connects to the desk companion.

## Key Design Decisions

- **BLE only**: No Wi-Fi, no cloud, works offline, low power
- **ESP32 is source of truth**: All state lives on the device; the PWA is a view
- **LOAD-based abstraction**: UI and BLE always deal in "is the appliance on?",
  never in coil/GPIO levels — polarity and wiring config handle the conversion
- **Feature switches**: Both compile-time (features.h) and runtime (BLE toggle)
- **Safety**: Relays set to OFF level before any other init; min switch interval
  prevents rapid cycling; Away mode force-locks relays; PC Unlock defaults to OFF

## Documentation

- [Bring-Up & Verification Checklist](docs/test-checklist.md) — 10-stage testing matrix
- [Protocol Specification](docs/protocol.md) — BLE GATT specification
- [Protocol Verification Check](docs/protocol-check.md) — Side-by-side firmware vs client mapping
- [Interactive Serial Menu](docs/serial-menu.md) — UART diagnostics & hardware test commands
- [Wiring Guide](docs/wiring.md) — Pinouts and electrical schematics
- [Component List](docs/components.md) — Bill of Materials (BOM)
- [Debug Guide](docs/debug-guide.md) — Troubleshooting by symptom
- [Audio Files](docs/audio-files.md) — Sound effects and Web Audio synthesizer


