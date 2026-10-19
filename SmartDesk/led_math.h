/**
 * led_math.h — Pure LED calculations and pattern math.
 *
 * Purpose : Color conversion (HSV to RGB), gamma correction, current estimation,
 *           brightness scaling, linear color interpolation, photosensitivity checking,
 *           and pattern timing math (blink, double-blink, heartbeat, boot sweep).
 * Depends : stdint.h, stdbool.h, math.h (pure logic, no Arduino/FastLED/NeoPixel dependencies).
 * Used by : leds.cpp, led_effects.cpp.
 * Feature : FEATURE_LEDS
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t r;
    uint8_t g;
    uint8_t b;
} RgbColor;

typedef struct {
    uint8_t h; // 0-255
    uint8_t s; // 0-255
    uint8_t v; // 0-255
} HsvColor;

/**
 * Convert HSV (0-255 each) to RGB (0-255 each).
 * Pure math, integer arithmetic.
 * Example pairs:
 *   hsvToRgb(0, 255, 255)   -> {255, 0, 0}     (Red)
 *   hsvToRgb(85, 255, 255)  -> {0, 255, 0}     (Green)
 *   hsvToRgb(170, 255, 255) -> {0, 0, 255}     (Blue)
 *   hsvToRgb(0, 0, 255)     -> {255, 255, 255} (White)
 *   hsvToRgb(0, 0, 0)       -> {0, 0, 0}       (Black)
 */
RgbColor ledHsvToRgb(uint8_t h, uint8_t s, uint8_t v);

/**
 * Apply 2.2 gamma correction curve to an 8-bit color channel.
 * Makes LED fades look linear to human perception.
 * Example pairs:
 *   gammaCorrect(0)   -> 0
 *   gammaCorrect(128) -> ~55
 *   gammaCorrect(255) -> 255
 */
uint8_t ledGammaCorrect(uint8_t val);

/**
 * Apply gamma correction to all three channels of an RGB color.
 */
RgbColor ledGammaCorrectRgb(RgbColor c);

/**
 * Scale an RGB color by brightness percentage (0-100) and max cap (0-255).
 * Formula: val * (brightness / 100) * (maxCap / 255)
 * Example:
 *   scaleBrightness({255, 255, 255}, 100, 80) -> {80, 80, 80}
 *   scaleBrightness({255, 0, 0}, 50, 80)       -> {40, 0, 0}
 */
RgbColor ledScaleBrightness(RgbColor c, uint8_t brightnessPct, uint8_t maxCap);

/**
 * Linearly interpolate between two RGB colors.
 * Example:
 *   lerpRgb({0,0,0}, {100,200,50}, 5, 10) -> {50, 100, 25}
 */
RgbColor ledLerpRgb(RgbColor c1, RgbColor c2, uint16_t step, uint16_t totalSteps);

/**
 * Estimate total current in mA for a strip of RGB LEDs.
 * Assumes maxMaPerLed (typically 60mA) at full white {255, 255, 255}.
 * Formula: sum((r + g + b) / (3 * 255) * maxMaPerLed)
 * Example:
 *   8 LEDs full white, 60mA/LED -> 480 mA
 *   8 LEDs half white, 60mA/LED -> 240 mA
 *   8 LEDs black                -> 0 mA
 */
uint16_t ledEstimateCurrentMa(const RgbColor* leds, uint8_t count, uint8_t maxMaPerLed);

/**
 * Calculate scaling factor (0-255) if estimated current exceeds maxAllowedMa.
 * Returns 255 if within budget; returns (maxAllowedMa * 255 / estimatedMa) if exceeded.
 * Example:
 *   calculateCurrentScale(200, 300) -> 255 (no scale down)
 *   calculateCurrentScale(600, 300) -> 127 (~50% scale down)
 */
uint8_t ledCalculateCurrentScale(uint16_t estimatedMa, uint16_t maxAllowedMa);

/**
 * Photosensitivity safety check:
 * Returns true if cycle (onMs + offMs) >= 334 ms (<= 3 flashes per second).
 * Any cycle < 334 ms is considered a potential photosensitive epilepsy risk.
 * Example:
 *   isPhotosensitiveSafe(200, 200) -> true  (400 ms >= 334 ms)
 *   isPhotosensitiveSafe(100, 100) -> false (200 ms < 334 ms -> 5 Hz)
 */
bool ledIsPhotosensitiveSafe(uint16_t onMs, uint16_t offMs);

/**
 * Clamp blink timing values to valid ranges:
 *   onMs  in [50, 5000]
 *   offMs in [50, 5000]
 * Enforces photosensitivity safety if cycle < 334 ms by adjusting offMs.
 */
void ledClampBlinkTiming(uint16_t* onMs, uint16_t* offMs);

/**
 * Determine if LED should be ON during simple blink effect.
 * Example:
 *   elapsed 200ms with on=500, off=500 -> true
 *   elapsed 700ms with on=500, off=500 -> false
 */
bool ledIsBlinkOn(uint32_t elapsedMs, uint16_t onMs, uint16_t offMs);

/**
 * Determine if LED should be ON during double-blink effect:
 * Pattern: [Flash 1: flashOnMs] -> [Gap: flashOffMs] -> [Flash 2: flashOnMs] -> [Pause: pauseMs]
 * Example:
 *   flashOn=100, flashOff=100, pause=600 (total cycle = 900ms)
 *   elapsed 50ms   -> true (Flash 1)
 *   elapsed 150ms  -> false (Gap)
 *   elapsed 250ms  -> true (Flash 2)
 *   elapsed 500ms  -> false (Pause)
 */
bool ledIsDoubleBlinkOn(uint32_t elapsedMs, uint16_t flashOnMs, uint16_t flashOffMs, uint16_t pauseMs);

/**
 * Calculate intensity (0-255) for heartbeat "lub-dub" curve at a given time.
 * Lub-dub: Beat 1 (quick rise/fall) -> short pause -> Beat 2 (slightly smaller) -> long rest.
 * Example:
 *   cycle = 1000ms
 *   elapsed = 100ms -> strong beat (~200-255)
 *   elapsed = 300ms -> second beat (~150-180)
 *   elapsed = 600ms -> rest (0)
 */
uint8_t ledGetHeartbeatIntensity(uint32_t elapsedMs, uint16_t cycleMs);

/**
 * Calculate active pixel index (0 to numLeds - 1) for boot sweep animation.
 * Returns 0xFF when animation duration has finished.
 * Example:
 *   sweep 800ms across 8 LEDs: 0-99ms -> 0, 100-199ms -> 1, ..., >=800ms -> 0xFF
 */
uint8_t ledCalculateBootSweepPixel(uint32_t elapsedMs, uint32_t totalSweepMs, uint8_t numLeds);

#ifdef __cplusplus
}
#endif

