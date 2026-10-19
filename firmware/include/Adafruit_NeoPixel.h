/**
 * Adafruit_NeoPixel.h — Adafruit_NeoPixel compatibility header.
 *
 * Purpose : Ensures clean IntelliSense resolution in VS Code while seamlessly
 *           delegating to the installed Adafruit NeoPixel library during compilation.
 * Depends : Nothing.
 * Used by : leds.cpp.
 * Feature : FEATURE_LEDS
 */

#pragma once

#if defined(__has_include_next)
  #if __has_include_next(<Adafruit_NeoPixel.h>)
    #include_next <Adafruit_NeoPixel.h>
    #define _REAL_NEOPIXEL_INCLUDED 1
  #endif
#endif

#ifndef _REAL_NEOPIXEL_INCLUDED
#include <stdint.h>
#include <stdbool.h>

#define NEO_GRB ((1 << 6) | (1 << 4) | (0 << 2) | (2))
#define NEO_KHZ800 0x0000

class Adafruit_NeoPixel {
public:
    Adafruit_NeoPixel(uint16_t n = 0, int16_t p = -1, uint16_t t = NEO_GRB + NEO_KHZ800) { (void)n; (void)p; (void)t; }
    ~Adafruit_NeoPixel() {}

    void begin() {}
    void show() {}
    void setPin(int16_t p) { (void)p; }
    void setPixelColor(uint16_t n, uint8_t r, uint8_t g, uint8_t b) { (void)n; (void)r; (void)g; (void)b; }
    void setPixelColor(uint16_t n, uint32_t c) { (void)n; (void)c; }
    void setBrightness(uint8_t b) { (void)b; }
    void clear() {}
    uint16_t numPixels() const { return 8; }
    static uint32_t Color(uint8_t r, uint8_t g, uint8_t b) {
        return ((uint32_t)r << 16) | ((uint32_t)g << 8) | (uint32_t)b;
    }
};

#endif // _REAL_NEOPIXEL_INCLUDED

