/**
 * music.h — Music-reactive LED subsystem.
 *
 * Purpose : Receives 4-byte frequency packets [bass, mid, treble, beat] via BLE
 *           write-without-response, enforces 2-second timeout, and renders music-reactive
 *           patterns across the 8-LED strip.
 * Depends : stdint.h, stdbool.h, config.h, led_math.h.
 * Used by : main.cpp, ble_service.cpp, leds.cpp.
 * Feature : FEATURE_MUSIC
 */

#pragma once

#include "features.h"

#if FEATURE_MUSIC

#include <stdint.h>
#include <stdbool.h>
#include "config.h"
#include "led_math.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*MusicTimeoutCallback)(void);

/**
 * Initialize music reactive subsystem.
 */
void musicBegin(void);

/**
 * Process an incoming 4-byte music packet from BLE.
 * @param packet 4 bytes: [bass, mid, treble, beat]
 */
void musicProcessPacket(const uint8_t* packet);

/**
 * Check if music stream is currently active (within 2s timeout).
 */
bool musicIsActive(void);

/**
 * Periodic tick checking for packet stream timeout.
 */
void musicLoop(void);

/**
 * Render current music reactive frame to an array of 8 LEDs.
 */
void musicRenderLeds(RgbColor* outLeds, uint8_t count);

/**
 * Register callback invoked when music stream times out or client stops.
 */
void musicRegisterTimeoutCallback(MusicTimeoutCallback cb);

#ifdef __cplusplus
}
#endif

#endif // FEATURE_MUSIC

