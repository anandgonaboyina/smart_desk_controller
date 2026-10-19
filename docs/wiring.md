# SmartDesk Wiring Guide

## ASCII Wiring Diagram (Current Setup)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ESP32-S3 N16R8 DevKitC                       │
│                                                                     │
│  UART USB port ←── serial monitor / upload (CP2102/CH340)           │
│  Native USB port ←── to laptop for HID keyboard (GPIO19/20)        │
│                                                                     │
│  GPIO4  ──── CH1 IN ──┐                                            │
│  GPIO5  ──── CH2 IN ──┤  4-CH OPTO-ISOLATED RELAY MODULE           │
│  GPIO6  ──── CH3 IN ──┤  (active-LOW inputs by default)            │
│  GPIO7  ──── CH4 IN ──┘                                            │
│                        VCC ──── 3.3V (from ESP32)                   │
│                        GND ──── GND (common)                        │
│                                                                     │
│  GPIO8  ──── DIR=VCC ──┐                                           │
│              A1 ───────┤  74HC245 Level Shifter                     │
│              VCC_A=3V3 ┤  (shifts 3.3V → 5V data)                  │
│              VCC_B=5V  ┤                                            │
│              OE=GND    ┤                                            │
│              B1 ───────┴── 330Ω ──── DIN of WS2812B strip          │
│                                                                     │
│           ┌───────────── WS2812B Strip (8 LEDs, GRB, 800kHz)       │
│           │  VCC ──── +5V (from 5V adapter, NOT from ESP32)        │
│           │  GND ──── GND (common with ESP32)                      │
│           │  1000µF electrolytic cap across VCC and GND             │
│           └─────────────────────────────────────────────────────    │
│                                                                     │
│  GPIO9  ──── Button ──── GND  (internal pull-up enabled)           │
│  GPIO10 ──── Status LED ──── 330Ω ──── GND                        │
│                                                                     │
│  ── RESERVED (not connected now) ──                                │
│  GPIO15 ──── (future 595 SER)                                      │
│  GPIO16 ──── (future 595 SRCLK)                                    │
│  GPIO17 ──── (future 595 RCLK)                                     │
│  GPIO18 ──── (future 595 OE, 10k pull-up to 3V3)                  │
│  GPIO1  ──── (future DS3231 SDA)                                   │
│  GPIO2  ──── (future DS3231 SCL)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Power Supply

```
    5V/3A adapter ──┬── WS2812B strip VCC (+5V)
                    └── ESP32 5V pin (powers the board via regulator)

    IMPORTANT: Do NOT power the ESP32 from BOTH the 5V adapter AND
    the laptop USB at the same time.  Choose ONE:
      Option A: 5V adapter through the 5V pin, USB cable for data only
                (cut the VBUS/+5V wire in the USB cable, or use a
                 data-only USB cable)
      Option B: USB power only (works for testing without the LED strip
                at full brightness; strip may dim or flicker above ~120mA)
```

## Relay Module Connections (Direct GPIO)

```
    ESP32 GPIO4 ─────── IN1 ┐
    ESP32 GPIO5 ─────── IN2 │  4-CH Relay Module
    ESP32 GPIO6 ─────── IN3 │  (opto-isolated)
    ESP32 GPIO7 ─────── IN4 ┘
    ESP32 3.3V  ─────── VCC
    ESP32 GND   ─────── GND
```

**Active-LOW note:** Most relay modules trigger when the input goes LOW.
This means during ESP32 reset/boot, the GPIOs float and may briefly
activate the relays.  To prevent this:

- Add a **10kΩ pull-up resistor** from each IN pin to 3.3V
- The firmware sets each pin to its OFF level as the very first thing
  in setup(), before any other initialization
- For production use, always add the pull-ups as a hardware safety measure

## WS2812B Level Shifter

The 74HC245 shifts the 3.3V data signal from the ESP32 to 5V for the
WS2812B LEDs:

```
    74HC245 Wiring:
    ┌──────────┐
    │ VCC_A=3V3│  (input side supply)
    │ VCC_B=5V │  (output side supply)
    │ DIR=VCC  │  (A→B direction)
    │ OE=GND   │  (output always enabled)
    │ A1=GPIO8 │  (3.3V data from ESP32)
    │ B1──330Ω──── DIN │  (5V data to LED strip)
    │ GND=GND  │
    └──────────┘
```

**Better options than the "diode trick":** A 74HCT245 or 74AHCT125 is the
correct solution for 3.3V→5V level shifting for WS2812B.  The "diode on the
VCC line" trick is unreliable across temperature and batches.  The 74HC245
works with a 3.3V input rail but the 74HCT245 is ideal because its input
threshold (0.8V/2.0V) naturally accepts 3.3V logic.

## Future 74HC595 Addition

When you're ready to switch to a shift register for 8 relay channels:

```
    ESP32 GPIO15 ──── SER    (serial data in)
    ESP32 GPIO16 ──── SRCLK  (shift clock)
    ESP32 GPIO17 ──── RCLK   (latch/storage clock)
    ESP32 GPIO18 ──── OE     (active LOW, 10k pull-up to 3V3)
    3V3          ──── SRCLR  (always HIGH = never clear)
    3V3          ──── VCC
    GND          ──── GND

    595 Q0-Q7 ──── 8x relay module inputs (through opto-isolators
                    or transistor drivers for inductive loads)

    Boot sequence (handled by firmware):
    1. OE HIGH (outputs disabled, guaranteed by 10k pull-up)
    2. Clear shift register (SRCLR pulse, or shift in zeros)
    3. Load desired state
    4. Latch (RCLK pulse)
    5. OE LOW (outputs enabled)
```

To switch: change the relay driver setting in the PWA → Relay Settings → Driver.
The firmware reboots and starts using the 595 pins.  Channels 5-8 appear in the UI.

## USB Power Isolation

```
    ┌──────────────────────────────────────────────────┐
    │  NEVER connect 5V adapter AND laptop USB power   │
    │  simultaneously without isolation!               │
    │                                                  │
    │  Safe configurations:                            │
    │  1. 5V adapter only → data-only USB cable to PC  │
    │  2. USB power only → no 5V adapter               │
    │  3. Both → use a USB isolator module              │
    │                                                  │
    │  Risk: back-powering the laptop USB port or the  │
    │  adapter; potential damage to both devices.       │
    └──────────────────────────────────────────────────┘
```

## Ground Connections

All grounds MUST be connected together:
- ESP32 GND
- Relay module GND
- WS2812B GND
- 74HC245 GND
- 5V power supply GND
- USB cable GND (through the cable shield)

