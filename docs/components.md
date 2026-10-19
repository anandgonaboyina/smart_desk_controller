# SmartDesk — Component List

## Current Build (Active Now)

| # | Component | Qty | Notes |
|---|-----------|-----|-------|
| 1 | ESP32-S3 N16R8 DevKitC-1 | 1 | 16MB flash, 8MB PSRAM (octal) |
| 2 | 4-channel opto-isolated relay module | 1 | Active-LOW inputs, driven directly by 3.3V GPIOs |
| 3 | WS2812B LED strip | 1 | Exactly 8 LEDs, GRB color order, 800kHz |
| 4 | 74HC245 octal bus transceiver | 1 | Level shifter for LED data (3.3V→5V) |
| 5 | 330Ω resistor | 2 | 1× LED data line, 1× status LED |
| 6 | 1000µF 10V electrolytic capacitor | 1 | Across LED strip VCC/GND |
| 7 | Momentary push button | 1 | To GND, uses internal pull-up on GPIO9 |
| 8 | Status LED (any color) | 1 | On GPIO10, with 330Ω series resistor |
| 9 | 5V 3A power adapter | 1 | Powers strip + ESP32; do NOT use simultaneously with USB power |
| 10 | USB-A to USB-C cable (data) | 1 | UART port: upload + serial monitor |
| 11 | USB-C to USB-C cable (data) | 1 | Native USB port: HID keyboard to laptop |
| 12 | Hookup wire | — | For connections |

### Recommended Additions (Current Build)

| # | Component | Qty | Notes |
|---|-----------|-----|-------|
| 1 | 10kΩ pull-up resistor | 4 | IN1-IN4 to 3.3V; prevents relay activation during ESP32 reset |
| 2 | Data-only USB cable | 1 | For laptop HID connection when using 5V adapter (no VBUS pin) |
| 3 | USB isolator module | 1 | Alternative to data-only cable for USB power isolation |

## Future Expansion (Not Connected Now)

| # | Component | Qty | Notes |
|---|-----------|-----|-------|
| 1 | 74HC595 shift register | 1 | 8-bit output for 8 relay channels |
| 2 | 10kΩ pull-up resistor | 1 | 595 OE pin to 3.3V (safe boot: outputs disabled) |
| 3 | 8-channel relay module | 1 | Replaces the 4-channel module |
| 4 | DS3231 RTC module | 1 | I2C real-time clock (GPIO1 SDA, GPIO2 SCL) |
| 5 | 74HCT245 or 74AHCT125 | 1 | Better level shifter upgrade (lower input threshold) |

## Notes

- **74HCT245 vs 74HC245**: The 74HCT245 is the better choice for level shifting
  WS2812B data. Its input HIGH threshold is 2.0V (vs 3.15V for HC at 5V VCC),
  so it reliably accepts 3.3V logic from the ESP32. The HC variant works in this
  circuit because VCC_A=3.3V, but the HCT is the industry-standard solution.

- **Relay module current**: Each relay coil draws ~70mA through the optocoupler.
  With 4 channels all on: ~280mA from the 3.3V rail. The ESP32-S3's LDO can
  supply ~500mA at 3.3V, so 4 channels are within budget. For 8 channels (595),
  use an external 3.3V or 5V rail for the relay module VCC.

- **LED strip current**: 8 LEDs × 60mA worst case = 480mA. The LED_MAX_MA=300mA
  software limit keeps it safe on USB power. At full white, firmware scales
  brightness to stay under the limit.

