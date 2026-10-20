# SmartDesk V2 — Firmware & Flashing Guide

This directory contains the single-file firmware for the ESP32-S3 SmartDesk V2 controller and the automated compile-and-flash toolchain.

---

## Quick Start: Flashing the Firmware

After making any changes to the firmware, simply run:

```powershell
.\flash.ps1
```

from the `smartdesk-v2/firmware` directory.

### What `flash.ps1` Does:
1. **Security Guard**: Refuses any port other than `COM6`.
2. **Port Check**: Verifies `COM6` is present and not locked by another program.
3. **Compilation**: Invokes `arduino-cli` with the exact ESP32-S3 N16R8 FQBN (`16M Flash`, `OPI PSRAM`, `app3M_fat9M_16MB` partitions, `CDC Boot Disabled`).
4. **Flash**: Uploads the binary at 921600 baud directly to `COM6`.
5. **Hardware Reset & Capture**: Pulses RTS to perform a clean boot into flash mode, monitors serial output at 115200 baud for 5 seconds.
6. **Verification**: Checks for the dynamic `BUILD <date> <time> TAG=V2-PROD` marker and reports `[PASS]` or `[FAIL]`.
7. **Clean Exit**: Releases `COM6` immediately so the port is free for monitoring.

---

## Crucial Setup for Clean Bluetooth Connections

Windows and Chrome aggressively cache Bluetooth GATT services and characteristics. To guarantee that stale GATT profiles do not disrupt communication:

1. **Remove Old Pairings in Windows**:
   - Open **Windows Settings** -> **Bluetooth & devices** -> **Devices**.
   - If you see any previous **SmartDesk** device, click `...` and select **Remove device**.
2. **Restart Chrome**:
   - Fully close all Google Chrome windows once. (You can also go to `chrome://bluetooth-internals` in Chrome to inspect live BLE connections).
3. **Power-Cycle or Reset the Board**:
   - The new firmware advertises as **`SmartDeskV2`** with a fresh Service UUID (`7f781e04-c0ee-47c9-a1e4-0aafa8ee316b`), ensuring no collision with prior GATT caches.

---

## Hardware Pinout Reference

| Function | Pin | Notes |
| :--- | :--- | :--- |
| **Relay Channel 1** | `GPIO 4` | Direct opto-isolated relay driver |
| **Relay Channel 2** | `GPIO 5` | Direct opto-isolated relay driver |
| **Relay Channel 3** | `GPIO 6` | Direct opto-isolated relay driver |
| **Relay Channel 4** | `GPIO 7` | Direct opto-isolated relay driver |
| **WS2812B Data** | `GPIO 8` | 8x RGB LEDs via 3.3V-to-5V level shifter |
| **UART Serial** | `COM6` | 115200 baud (CH343 USB-to-UART bridge) |

*Safety Note*: At startup, the first instructions executed in `setup()` immediately pull all relay pins to their OFF level before Serial or Bluetooth stacks begin execution.

