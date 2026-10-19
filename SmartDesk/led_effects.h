/**
 * led_effects.h — LED strip effect rendering algorithms.
 *
 * Purpose : Renders color patterns across 8 WS2812B LEDs for all effect types:
 *           solid, breathe, rainbow, rainbow-chase, color-chase, twinkle, fire,
 *           gradient, strobe, blink, double-blink, and heartbeat.
 * Depends : stdint.h, stdbool.h, led_math.h, protocol.h, config.h.
 * Used by : leds.cpp.
 * Feature : FEATURE_LEDS
 */

#pragma once

#include "features.h"

#if FEATURE_LEDS

#include <stdint.h>
#include <stdbool.h>
#include "led_math.h"
#include "protocol.h"
#include "config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t  effect;
    RgbColor color1;
    RgbColor color2;        // Used for gradient
    uint8_t  speed;         // 0-255
    uint16_t blinkOnMs;
    uint16_t blinkOffMs;
} EffectParams;

/**
 * Render a single frame of the selected effect across an array of RGB LEDs.
 * @param frameTimeMs Current monotonic timestamp in milliseconds
 * @param params Effect configuration parameters
 * @param outLeds Output buffer of size count (e.g. 8 LEDs)
 * @param count Number of LEDs (LED_COUNT = 8)
 */
void ledEffectsRender(uint32_t frameTimeMs, const EffectParams* params,
                      RgbColor* outLeds, uint8_t count);

/**
 * Render boot sweep animation frame across the LED array.
 * Returns true while sweep is active, false when sweep has finished.
 */
bool ledEffectsRenderBootSweep(uint32_t elapsedMs, RgbColor color,
                               RgbColor* outLeds, uint8_t count);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_LEDS

