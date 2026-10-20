#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\led_math.cpp"
/**
 * led_math.cpp — Implementation of pure LED calculations and pattern math.
 *
 * Purpose : HSV/RGB conversion, gamma LUT, current limiting, photosensitivity checks,
 *           and pattern calculations.
 * Depends : led_math.h
 * Used by : leds.cpp, led_effects.cpp.
 * Feature : FEATURE_LEDS
 */

#include "led_math.h"

// Standard 2.2 gamma correction table for 8-bit values (0-255)
static const uint8_t GAMMA_TABLE[256] = {
      0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
      1,   1,   1,   1,   1,   1,   1,   1,   2,   2,   2,   2,   2,   2,   3,   3,
      3,   3,   4,   4,   4,   4,   5,   5,   5,   5,   6,   6,   6,   7,   7,   7,
      8,   8,   8,   9,   9,   9,  10,  10,  11,  11,  11,  12,  12,  13,  13,  14,
     14,  15,  15,  16,  16,  17,  17,  18,  18,  19,  19,  20,  20,  21,  22,  22,
     23,  23,  24,  25,  25,  26,  26,  27,  28,  28,  29,  30,  30,  31,  32,  33,
     33,  34,  35,  35,  36,  37,  38,  38,  39,  40,  41,  42,  42,  43,  44,  45,
     46,  47,  47,  48,  49,  50,  51,  52,  53,  54,  55,  55,  56,  57,  58,  59,
     60,  61,  62,  63,  64,  65,  66,  67,  68,  69,  70,  71,  73,  74,  75,  76,
     77,  78,  79,  81,  82,  83,  84,  85,  87,  88,  89,  90,  92,  93,  94,  95,
     97,  98,  99, 101, 102, 103, 105, 106, 108, 109, 110, 112, 113, 115, 116, 118,
    119, 121, 122, 124, 125, 127, 128, 130, 131, 133, 135, 136, 138, 140, 141, 143,
    145, 146, 148, 150, 152, 153, 155, 157, 159, 161, 162, 164, 166, 168, 170, 172,
    174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 196, 198, 200, 202, 204,
    207, 209, 211, 213, 216, 218, 220, 222, 225, 227, 229, 232, 234, 236, 239, 241,
    244, 246, 249, 251, 253, 255
};

RgbColor ledHsvToRgb(uint8_t h, uint8_t s, uint8_t v) {
    RgbColor out = {0, 0, 0};
    if (s == 0) {
        out.r = v; out.g = v; out.b = v;
        return out;
    }

    uint8_t region = h / 43; // 6 regions (0..5)
    uint8_t remainder = (h - (region * 43)) * 6; // 0..255

    uint8_t p = (v * (255 - s)) >> 8;
    uint8_t q = (v * (255 - ((s * remainder) >> 8))) >> 8;
    uint8_t t = (v * (255 - ((s * (255 - remainder)) >> 8))) >> 8;

    switch (region) {
        case 0:  out.r = v; out.g = t; out.b = p; break;
        case 1:  out.r = q; out.g = v; out.b = p; break;
        case 2:  out.r = p; out.g = v; out.b = t; break;
        case 3:  out.r = p; out.g = q; out.b = v; break;
        case 4:  out.r = t; out.g = p; out.b = v; break;
        default: out.r = v; out.g = p; out.b = q; break;
    }
    return out;
}

uint8_t ledGammaCorrect(uint8_t val) {
    return GAMMA_TABLE[val];
}

RgbColor ledGammaCorrectRgb(RgbColor c) {
    RgbColor out;
    out.r = GAMMA_TABLE[c.r];
    out.g = GAMMA_TABLE[c.g];
    out.b = GAMMA_TABLE[c.b];
    return out;
}

RgbColor ledScaleBrightness(RgbColor c, uint8_t brightnessPct, uint8_t maxCap) {
    if (brightnessPct > 100) brightnessPct = 100;
    RgbColor out;
    // Scale factor = (brightnessPct / 100.0) * (maxCap / 255.0)
    // Combined integer formula: (val * brightnessPct * maxCap) / (100 * 255)
    uint32_t denom = 25500;
    out.r = (uint8_t)(((uint32_t)c.r * brightnessPct * maxCap) / denom);
    out.g = (uint8_t)(((uint32_t)c.g * brightnessPct * maxCap) / denom);
    out.b = (uint8_t)(((uint32_t)c.b * brightnessPct * maxCap) / denom);
    return out;
}

RgbColor ledLerpRgb(RgbColor c1, RgbColor c2, uint16_t step, uint16_t totalSteps) {
    if (totalSteps == 0 || step >= totalSteps) return c2;
    if (step == 0) return c1;

    RgbColor out;
    int32_t dr = (int32_t)c2.r - (int32_t)c1.r;
    int32_t dg = (int32_t)c2.g - (int32_t)c1.g;
    int32_t db = (int32_t)c2.b - (int32_t)c1.b;

    out.r = (uint8_t)((int32_t)c1.r + (dr * (int32_t)step / (int32_t)totalSteps));
    out.g = (uint8_t)((int32_t)c1.g + (dg * (int32_t)step / (int32_t)totalSteps));
    out.b = (uint8_t)((int32_t)c1.b + (db * (int32_t)step / (int32_t)totalSteps));
    return out;
}

uint16_t ledEstimateCurrentMa(const RgbColor* leds, uint8_t count, uint8_t maxMaPerLed) {
    if (leds == (const RgbColor*)0 || count == 0) return 0;
    uint32_t totalChannelSum = 0;
    for (uint8_t i = 0; i < count; i++) {
        totalChannelSum += (uint32_t)leds[i].r + (uint32_t)leds[i].g + (uint32_t)leds[i].b;
    }
    // Each LED draws up to maxMaPerLed when r+g+b = 255 * 3 = 765
    return (uint16_t)((totalChannelSum * (uint32_t)maxMaPerLed) / 765);
}

uint8_t ledCalculateCurrentScale(uint16_t estimatedMa, uint16_t maxAllowedMa) {
    if (estimatedMa <= maxAllowedMa || estimatedMa == 0) return 255;
    return (uint8_t)(((uint32_t)maxAllowedMa * 255) / estimatedMa);
}

bool ledIsPhotosensitiveSafe(uint16_t onMs, uint16_t offMs) {
    uint32_t cycleMs = (uint32_t)onMs + (uint32_t)offMs;
    return (cycleMs >= 334);
}

void ledClampBlinkTiming(uint16_t* onMs, uint16_t* offMs) {
    if (onMs == (uint16_t*)0 || offMs == (uint16_t*)0) return;
    if (*onMs < 50) *onMs = 50;
    if (*onMs > 5000) *onMs = 5000;
    if (*offMs < 50) *offMs = 50;
    if (*offMs > 5000) *offMs = 5000;

    // Ensure cycle is at least 334ms (<= 3 Hz)
    if ((*onMs + *offMs) < 334) {
        *offMs = 334 - *onMs;
    }
}

bool ledIsBlinkOn(uint32_t elapsedMs, uint16_t onMs, uint16_t offMs) {
    uint32_t cycle = (uint32_t)onMs + (uint32_t)offMs;
    if (cycle == 0) return false;
    uint32_t phase = elapsedMs % cycle;
    return (phase < onMs);
}

bool ledIsDoubleBlinkOn(uint32_t elapsedMs, uint16_t flashOnMs, uint16_t flashOffMs, uint16_t pauseMs) {
    uint32_t cycle = (uint32_t)flashOnMs * 2 + (uint32_t)flashOffMs + (uint32_t)pauseMs;
    if (cycle == 0) return false;
    uint32_t phase = elapsedMs % cycle;

    // Flash 1: [0, flashOnMs)
    if (phase < flashOnMs) return true;
    // Gap 1: [flashOnMs, flashOnMs + flashOffMs)
    if (phase < (flashOnMs + flashOffMs)) return false;
    // Flash 2: [flashOnMs + flashOffMs, 2*flashOnMs + flashOffMs)
    if (phase < (2 * flashOnMs + flashOffMs)) return true;
    // Pause: rest of cycle
    return false;
}

uint8_t ledGetHeartbeatIntensity(uint32_t elapsedMs, uint16_t cycleMs) {
    if (cycleMs == 0) return 0;
    uint32_t phase = elapsedMs % cycleMs;

    // Lub-dub timing within cycle:
    // 0-120ms: First beat rise and fall (peak 255)
    // 120-180ms: Valley between beats
    // 180-280ms: Second beat rise and fall (peak 180)
    // 280-cycleMs: Quiescent rest period
    if (phase < 60) {
        return (uint8_t)((phase * 255) / 60); // Beat 1 rise
    } else if (phase < 120) {
        return (uint8_t)(255 - (((phase - 60) * 200) / 60)); // Beat 1 fall
    } else if (phase < 180) {
        return 55; // Dip
    } else if (phase < 230) {
        return (uint8_t)(55 + (((phase - 180) * 125) / 50)); // Beat 2 rise to 180
    } else if (phase < 280) {
        return (uint8_t)(180 - (((phase - 230) * 180) / 50)); // Beat 2 fall to 0
    }
    return 0; // Rest
}

uint8_t ledCalculateBootSweepPixel(uint32_t elapsedMs, uint32_t totalSweepMs, uint8_t numLeds) {
    if (elapsedMs >= totalSweepMs || numLeds == 0) return 0xFF;
    uint32_t pixelTime = totalSweepMs / numLeds;
    if (pixelTime == 0) return 0;
    uint8_t idx = (uint8_t)(elapsedMs / pixelTime);
    return (idx < numLeds) ? idx : 0xFF;
}

