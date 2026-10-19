# Serial Diagnostics Menu (UART 115200 Baud)

The ESP32-S3 firmware provides an interactive diagnostic and control console over the UART programming port (GPIO43 TX / GPIO44 RX) at **115200 baud, 8-N-1**.

All commands are non-blocking and safe to use while BLE clients are actively connected.

---

## Command Reference

| Command | Description | Example Output |
| :--- | :--- | :--- |
| `selftest` | Executes the full boot self-test suite (12 hardware & software assertions). | `[PASS] Relay Electrical : OK`<br>`[FAIL] ... [HARDWARE] Check 10k pull-up` |
| `relaytest <n>` | Pulses relay channel `<n>` (1..4 or 1..8) for 1000ms. Reads electrical GPIO level before, during, and after. Flags hardware faults. | `Pre-test: Load=0, GPIO4=HIGH, Read=1`<br>`Active: GPIO4=LOW, Read=0`<br>`Reverted: GPIO4=HIGH (CODE & HARDWARE OK)` |
| `ledtest` | Executes an RGBW sweep across all 8 WS2812B LEDs (1s Red, 1s Green, 1s Blue, 1s White). Restores auto mode. | `Step 1: All RED (checking Red sub-pixels)`<br>`Step 4: All WHITE (checking 74HC245)` |
| `status` | Prints live telemetry: uptime, free heap memory, active relay driver, and connected BLE client count. | `Uptime: 342 s \| Free Heap: 294820 B \| Reset: 1`<br>`Driver: Direct GPIO (4 relays active)`<br>`BLE Clients: 1 connected` |
| `log on` | Enables live serial and BLE log dispatch. Persisted in NVS. | `[SYS] Logging ENABLED` |
| `log off` | Disables live log dispatch (except critical errors). Persisted in NVS. | `[SYS] Logging DISABLED` |
| `log level <x>` | Sets log filter level: `e` (ERROR), `w` (WARN), `i` (INFO), `d` (DEBUG). Persisted in NVS. | `[SYS] Log level set to DEBUG` |
| `1` - `8` | Toggles relay load state for the specified channel. | `[RELAY] Relay 1 (Desk Lamp) -> LOAD ON (coil=1, pin=4 LOW)` |
| `r` | Prints complete relay table: Load, Coil, GPIO level, Polarity, Wiring, Boot behavior, Min switch time. | `CH1: [Desk Lamp] Load=OFF (coil=0, pin=4 HIGH) \| MinSw=2000ms Away=YES` |
| `f` | Prints runtime status of all 15 feature switches. | `[00] PC_UNLOCK : DISABLED (OFF)`<br>`[07] LED_STRIP : ENABLED (ON)` |
| `R` | Reboots the ESP32-S3 cleanly via software reset. | `[SYS] Rebooting ESP32 by serial command...` |
| `?` or `help` | Prints the diagnostic menu help screen. | `=== SmartDesk ESP32-S3 Diagnostic Menu ===` |

---

## Hardware vs Code Troubleshooting Guide

1. **Relay Pin Mismatch on `relaytest <n>`:**
   - **Symptom:** `relaytest 1` outputs `WARNING: Pin level mismatch! HARDWARE fault or missing 10k pull-up resistor on GPIO4`.
   - **Root Cause:** Optocoupler module input is floating or shorted.
   - **Action:** Verify 10k pull-up resistor to 3.3V on GPIO4 and verify optocoupler VCC is connected to 3.3V.

2. **LED Test Fails on `ledtest`:**
   - **Symptom:** White step flickers or reboots the ESP32.
   - **Root Cause:** 5V power supply sag or missing 1000µF capacitor across the strip supply.
   - **Action:** Ensure 5V 2A power supply is connected and 74HC245 level shifter has stable 5V VCC.

