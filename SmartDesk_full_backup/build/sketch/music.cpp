#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\music.cpp"
/**
 * music.cpp — Implementation of music-reactive LED subsystem.
 *
 * Purpose : Parses music stream packets, monitors stream timeout, and renders
 *           frequency-reactive audio visualizations across the 8-LED strip.
 * Depends : music.h, feature_switches.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp, leds.cpp.
 * Feature : FEATURE_MUSIC
 */

#include "features.h"

#if FEATURE_MUSIC

#include "music.h"
#include "feature_switches.h"
#include <Arduino.h>

static uint8_t s_bass = 0;
static uint8_t s_mid = 0;
static uint8_t s_treble = 0;
static bool    s_beat = false;
static uint8_t s_beatHue = 0;
static uint32_t s_lastPacketMs = 0;
static bool    s_active = false;
static MusicTimeoutCallback s_callback = (MusicTimeoutCallback)0;

void musicBegin(void) {
    s_active = false;
    s_lastPacketMs = 0;
    s_beatHue = 0;
}

void musicProcessPacket(const uint8_t* packet) {
    if (packet == (const uint8_t*)0) return;
    if (!isFeatureEnabled(FSWITCH_MUSIC_SYNC)) return;

    s_bass   = packet[0];
    s_mid    = packet[1];
    s_treble = packet[2];
    s_beat   = (packet[3] != 0);

    if (s_beat) {
        s_beatHue += 37; // Rotate hue on beat
    }

    s_lastPacketMs = millis();
    s_active = true;
}

bool musicIsActive(void) {
    return s_active;
}

void musicLoop(void) {
    if (!s_active) return;

    if (millis() - s_lastPacketMs >= MUSIC_TIMEOUT_MS) {
        s_active = false;
        if (s_callback) s_callback();
    }
}

void musicRenderLeds(RgbColor* outLeds, uint8_t count) {
    if (outLeds == (RgbColor*)0 || count == 0) return;

    // Map 8 LEDs across frequency bands:
    // LEDs 0..2: Bass (Warm Red/Orange)
    // LEDs 3..4: Mid  (Green/Yellow)
    // LEDs 5..7: Treble (Cyan/Blue)
    for (uint8_t i = 0; i < count; i++) {
        uint8_t bandLevel;
        uint8_t hue;

        if (i < 3) {
            bandLevel = s_bass;
            hue = (uint8_t)(s_beatHue + (i * 10)); // Bass hue
        } else if (i < 5) {
            bandLevel = s_mid;
            hue = (uint8_t)(s_beatHue + 85 + (i * 10)); // Mid hue
        } else {
            bandLevel = s_treble;
            hue = (uint8_t)(s_beatHue + 170 + (i * 10)); // Treble hue
        }

        RgbColor c = ledHsvToRgb(hue, 255, bandLevel);
        if (s_beat) {
            // White highlight flash on beat
            c.r = (uint8_t)((c.r >> 1) + 127);
            c.g = (uint8_t)((c.g >> 1) + 127);
            c.b = (uint8_t)((c.b >> 1) + 127);
        }
        outLeds[i] = c;
    }
}

void musicRegisterTimeoutCallback(MusicTimeoutCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_MUSIC

