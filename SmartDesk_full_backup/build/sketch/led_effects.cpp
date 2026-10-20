#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\led_effects.cpp"
/**
 * led_effects.cpp — Implementation of LED strip effect rendering algorithms.
 *
 * Purpose : Renders 12 lighting effects across 8 WS2812B LEDs using integer math.
 * Depends : led_effects.h, led_math.h.
 * Used by : leds.cpp.
 * Feature : FEATURE_LEDS
 */

#include "features.h"

#if FEATURE_LEDS

#include "led_effects.h"
#include <string.h>

static void renderSolid(const EffectParams* p, RgbColor* leds, uint8_t count) {
    for (uint8_t i = 0; i < count; i++) leds[i] = p->color1;
}

static void renderBreathe(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    uint32_t period = 3000 - ((uint32_t)p->speed * 8); // 960ms to 3000ms
    if (period == 0) period = 1000;
    uint32_t phase = t % period;
    uint8_t intensity;
    if (phase < (period / 2)) {
        intensity = (uint8_t)((phase * 255) / (period / 2));
    } else {
        intensity = (uint8_t)(255 - (((phase - (period / 2)) * 255) / (period / 2)));
    }
    // Floor intensity at 20 (never completely dark)
    if (intensity < 20) intensity = 20;
    RgbColor c = ledScaleBrightness(p->color1, (uint8_t)((intensity * 100) / 255), 255);
    for (uint8_t i = 0; i < count; i++) leds[i] = c;
}

static void renderRainbow(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    uint8_t baseHue = (uint8_t)((t * (uint32_t)(p->speed + 10)) / 1000);
    for (uint8_t i = 0; i < count; i++) {
        uint8_t hue = baseHue + (i * (256 / count));
        leds[i] = ledHsvToRgb(hue, 255, 255);
    }
}

static void renderColorChase(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    uint32_t stepTime = 200 - ((uint32_t)p->speed * 150 / 255); // 50ms to 200ms
    if (stepTime == 0) stepTime = 50;
    uint8_t activePixel = (uint8_t)((t / stepTime) % count);

    for (uint8_t i = 0; i < count; i++) {
        if (i == activePixel) {
            leds[i] = p->color1;
        } else {
            // Dim trail
            leds[i] = ledScaleBrightness(p->color1, 10, 255);
        }
    }
}

static void renderTwinkle(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    for (uint8_t i = 0; i < count; i++) {
        // Integer pseudo-random hash based on time and pixel index
        uint32_t hash = ((t >> 6) + (uint32_t)i * 37) * 2654435761u;
        uint8_t bright = (uint8_t)(hash & 0xFF);
        if (bright < 80) bright = 0;
        leds[i] = ledScaleBrightness(p->color1, (uint8_t)((bright * 100) / 255), 255);
    }
}

static void renderFire(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    (void)p;
    for (uint8_t i = 0; i < count; i++) {
        uint32_t hash = ((t >> 5) + (uint32_t)i * 17) * 1664525u;
        uint8_t flicker = (uint8_t)(hash & 0x7F); // 0-127
        RgbColor fireColor;
        fireColor.r = 255;
        fireColor.g = (uint8_t)(40 + (flicker >> 1)); // 40-103 (red to yellow-orange)
        fireColor.b = 0;
        leds[i] = fireColor;
    }
}

static void renderGradient(const EffectParams* p, RgbColor* leds, uint8_t count) {
    if (count <= 1) {
        leds[0] = p->color1;
        return;
    }
    for (uint8_t i = 0; i < count; i++) {
        leds[i] = ledLerpRgb(p->color1, p->color2, i, count - 1);
    }
}

static void renderBlinkPatterns(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    bool on = false;
    if (p->effect == LED_EFFECT_BLINK) {
        on = ledIsBlinkOn(t, p->blinkOnMs, p->blinkOffMs);
    } else if (p->effect == LED_EFFECT_DOUBLE_BLINK) {
        on = ledIsDoubleBlinkOn(t, 120, 100, 600);
    } else if (p->effect == LED_EFFECT_STROBE) {
        on = ledIsBlinkOn(t, 50, 300); // 350ms cycle >= 334ms (safe < 3 Hz)
    }

    RgbColor c = on ? p->color1 : (RgbColor){0, 0, 0};
    for (uint8_t i = 0; i < count; i++) leds[i] = c;
}

static void renderHeartbeat(uint32_t t, const EffectParams* p, RgbColor* leds, uint8_t count) {
    uint8_t intensity = ledGetHeartbeatIntensity(t, 1000);
    RgbColor c = ledScaleBrightness(p->color1, (uint8_t)((intensity * 100) / 255), 255);
    for (uint8_t i = 0; i < count; i++) leds[i] = c;
}

void ledEffectsRender(uint32_t frameTimeMs, const EffectParams* params,
                      RgbColor* outLeds, uint8_t count) {
    if (params == (const EffectParams*)0 || outLeds == (RgbColor*)0 || count == 0) return;

    switch (params->effect) {
        case LED_EFFECT_SOLID:         renderSolid(params, outLeds, count); break;
        case LED_EFFECT_BREATHE:       renderBreathe(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_RAINBOW:       renderRainbow(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_RAINBOW_CHASE: renderRainbow(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_COLOR_CHASE:   renderColorChase(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_TWINKLE:       renderTwinkle(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_FIRE:          renderFire(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_GRADIENT:      renderGradient(params, outLeds, count); break;
        case LED_EFFECT_STROBE:
        case LED_EFFECT_BLINK:
        case LED_EFFECT_DOUBLE_BLINK:  renderBlinkPatterns(frameTimeMs, params, outLeds, count); break;
        case LED_EFFECT_HEARTBEAT:     renderHeartbeat(frameTimeMs, params, outLeds, count); break;
        default:                       renderSolid(params, outLeds, count); break;
    }
}

bool ledEffectsRenderBootSweep(uint32_t elapsedMs, RgbColor color,
                               RgbColor* outLeds, uint8_t count) {
    uint8_t activePixel = ledCalculateBootSweepPixel(elapsedMs, LBOOT_ANIM_SWEEP_MS, count);
    if (activePixel == 0xFF) return false;

    for (uint8_t i = 0; i < count; i++) {
        outLeds[i] = (i == activePixel) ? color : (RgbColor){0, 0, 0};
    }
    return true;
}

#endif // FEATURE_LEDS

