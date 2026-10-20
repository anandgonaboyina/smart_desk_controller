# SmartDesk Single-File Bring-Up & Verification

This directory contains an isolated, single-file bring-up firmware and companion test harness designed to establish an absolute reference baseline for the SmartDesk ESP32-S3 hardware and Web Bluetooth communications.

---

## 1. Directory Structure

```
bringup/
├── README.md                           # This documentation
├── smartdesk_single/
│   └── smartdesk_single.ino            # Self-contained ESP32-S3 firmware
└── test-page/
    └── index.html                      # Standalone Web Bluetooth test UI
```

---

## 2. Firmware Specifications (`smartdesk_single.ino`)

- **Target Board**: ESP32-S3 (N16R8 — 16MB Flash, 8MB OPI PSRAM).
- **Core Dependencies**: Arduino-ESP32 3.x with built-in `NimBLE-Arduino` 2.x. Zero external dependencies.
- **Relay Outputs**: 
  - Relay 1: `GPIO 4`
  - Relay 2: `GPIO 5`
  - Relay 3: `GPIO 6`
  - Relay 4: `GPIO 7`
- **Safety Initialization**: First lines in `setup()` immediately pull all 4 relay GPIOs to OFF state (`ACTIVE_LOW = 1` -> `HIGH` / 3.3V) before Serial or Bluetooth stacks initialize.
- **Rate-Limiting**: `MIN_SWITCH_MS = 250` ms debounce per relay channel.
- **BLE GATT Configuration**:
  - Device Name: `SmartDesk`
  - Service UUID: `d3b00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1`
  - Relays Char UUID: `d3b00001-1b0e-4e6a-9b3f-c0f2a8d7e5b1`
  - Properties: `READ | WRITE | NOTIFY` (Write WITH response; no `WRITE_NR`).
  - Read/Notify Payload: 4 bytes `[R1_load, R2_load, R3_load, R4_load]` (0 = OFF, 1 = ON).
  - Write Payload: 2 bytes `[relayIndex, load]` (index: 0..3, load: 0 or 1).
- **Non-Blocking Architecture**:
  - BLE callbacks only copy data and set volatile flags; no delays, no relay writes, and no `notify()` calls inside NimBLE callback context.
  - `loop()` handles relay switching, Serial logging, and BLE notification dispatch.
- **Diagnostic Controls**:
  - Boot banner with dynamic compile timestamp marker (`BUILD <date> <time> TAG=SINGLE-1`).
  - Serial monitor keys `1`, `2`, `3`, `4` toggle relays directly.
  - Periodic 5-second heartbeat with heap memory and connection status.

---

## 3. Toolchain & Compilation

### Target FQBN
```text
esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=default,PartitionScheme=app3M_fat9M_16MB
```

### Compile Command
Using Arduino IDE's bundled `arduino-cli`:
```powershell
& "C:\Users\Anand Kumar\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" compile `
  --fqbn esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=default,PartitionScheme=app3M_fat9M_16MB `
  "d:\Organized files\webDev files\deployed Websites\smart_desk_controller\bringup\smartdesk_single"
```

### Upload Command (Port COM6)
```powershell
& "C:\Users\Anand Kumar\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" upload `
  -p COM6 `
  --fqbn esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=default,PartitionScheme=app3M_fat9M_16MB `
  "d:\Organized files\webDev files\deployed Websites\smart_desk_controller\bringup\smartdesk_single"
```

---

## 4. Running the Web Bluetooth Test Page

1. **Serve the test directory locally**:
   ```powershell
   cd "d:\Organized files\webDev files\deployed Websites\smart_desk_controller\bringup\test-page"
   python -m http.server 8000
   ```
2. **Open Chrome**: Navigate to `http://localhost:8000`.
3. **Connect**: Click **Connect SmartDesk**.
4. **Pairing**: In the Chrome Bluetooth picker, select **SmartDesk** and click **Pair**.
5. **Verify**:
   - Status badge turns green: `CONNECTED`.
   - Current 4-relay status is automatically read via GATT Read.
   - Click any relay button (**Turn ON** / **Turn OFF**) to issue a GATT Write with response.
   - The device will switch the relay, broadcast a GATT Notification, and the UI button will toggle.
   - Leave connected for > 60 seconds to verify link stability.

