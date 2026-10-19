/**
 * leds.cpp — Implementation of LED strip controller.
 *
 * Purpose : Drives WS2812B LEDs on GPIO8 with 5-level priority engine,
 *           notification blinks, time-of-day slots, presets, current limiting,
 *           gamma correction, and a 60 FPS FreeRTOS rendering task.
 * Depends : leds.h, led_effects.h, led_math.h, music.h, feature_switches.h,
 *           Adafruit_NeoPixel.h, Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp, calls.cpp.
 * Feature : FEATURE_LEDS
 */

#include "features.h"

#if FEATURE_LEDS

#include "leds.h"
#include "pins.h"
#include "led_effects.h"
#include "led_math.h"
#include "music.h"
#include "feature_switches.h"
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>
#include <Arduino.h>
#include <string.h>
#include <stdio.h>

static Adafruit_NeoPixel s_strip(LED_COUNT, PIN_LED_DATA, NEO_GRB + NEO_KHZ800);

static LedState          s_manualState;
static LedSlot           s_slots[LSLOT_MAX];
static LedPreset         s_presets[LPRESET_MAX];
static NotifyBlinkConfig s_notifyConfigs[NOTIFY_EVENT_COUNT];
static LedBootSettings   s_bootSettings;
static LedStateCallback  s_callback = (LedStateCallback)0;
static Preferences       s_ledPrefs;

// Priority & notification state
static uint8_t s_priority = LED_PRIO_AUTO;
static bool    s_callActive = false;
static bool    s_notifyActive = false;
static uint8_t s_notifyFlashRemaining = 0;
static uint32_t s_notifyPhaseStartMs = 0;
static bool    s_notifyPhaseOn = false;
static NotifyBlinkConfig s_currentNotify;

static const NotifyBlinkConfig DEFAULT_NOTIFY_BLINKS[NOTIFY_EVENT_COUNT] = {
    {NOTIFY_EVENT_TIMER_ENDED,   1, 255, 165,   0, 3, 200, 200}, // Orange
    {NOTIFY_EVENT_AWAY_STARTED,  1,   0,   0, 255, 2, 300, 300}, // Blue
    {NOTIFY_EVENT_AWAY_ENDED,    1,   0, 255,   0, 2, 300, 300}, // Green
    {NOTIFY_EVENT_SCHED_FIRED,   1, 255, 255,   0, 1, 400, 100}, // Yellow
    {NOTIFY_EVENT_CALL_ON,       1, 255,   0,   0, 2, 250, 250}, // Red
    {NOTIFY_EVENT_BLE_CONNECTED, 1,   0, 255, 128, 1, 500, 100}, // Cyan
    {NOTIFY_EVENT_BLE_LOST,      1, 255,   0,   0, 3, 150, 150}  // Red
};

static void loadDefaults(void) {
    s_manualState.mode = LED_MODE_MANUAL;
    s_manualState.effect = LED_EFFECT_SOLID;
    s_manualState.r = 255; s_manualState.g = 200; s_manualState.b = 150; // Warm white
    s_manualState.brightness = 60;
    s_manualState.speed = 128;
    s_manualState.autoResumeMin = DEFAULT_AUTO_RESUME_MIN;
    s_manualState.r2 = 0; s_manualState.g2 = 0; s_manualState.b2 = 0;
    s_manualState.blinkOnMs = 500; s_manualState.blinkOffMs = 500;

    s_bootSettings.bootBehavior = LED_BOOT_LAST_STATE;
    s_bootSettings.presetIndex = 0;
    s_bootSettings.inrushLimit = LBOOT_DEFAULT_INRUSH;
    s_bootSettings.bootAnim = 0;
    s_bootSettings.bleIndication = 0;

    for (uint8_t i = 0; i < NOTIFY_EVENT_COUNT; i++) {
        s_notifyConfigs[i] = DEFAULT_NOTIFY_BLINKS[i];
    }
}

static void loadNvs(void) {
    s_ledPrefs.begin(NVS_NS_LED, true);
    size_t sLen = s_ledPrefs.getBytes("manual", &s_manualState, sizeof(LedState));
    if (sLen != sizeof(LedState)) loadDefaults();

    s_ledPrefs.getBytes("boot", &s_bootSettings, sizeof(LedBootSettings));
    for (uint8_t i = 0; i < LPRESET_MAX; i++) {
        char k[8]; snprintf(k, sizeof(k), "p%u", i);
        s_ledPrefs.getBytes(k, &s_presets[i], sizeof(LedPreset));
    }
    for (uint8_t i = 0; i < LSLOT_MAX; i++) {
        char k[8]; snprintf(k, sizeof(k), "sl%u", i);
        s_ledPrefs.getBytes(k, &s_slots[i], sizeof(LedSlot));
    }
    for (uint8_t i = 0; i < NOTIFY_EVENT_COUNT; i++) {
        char k[8]; snprintf(k, sizeof(k), "nb%u", i);
        s_ledPrefs.getBytes(k, &s_notifyConfigs[i], sizeof(NotifyBlinkConfig));
    }
    s_ledPrefs.end();
}

static void processNotificationBlink(RgbColor* outLeds, uint8_t count) {
    uint32_t elapsed = millis() - s_notifyPhaseStartMs;
    uint32_t targetDuration = s_notifyPhaseOn ? s_currentNotify.onMs : s_currentNotify.offMs;

    if (elapsed >= targetDuration) {
        s_notifyPhaseStartMs = millis();
        s_notifyPhaseOn = !s_notifyPhaseOn;
        if (!s_notifyPhaseOn) {
            if (s_notifyFlashRemaining > 0) s_notifyFlashRemaining--;
            if (s_notifyFlashRemaining == 0) s_notifyActive = false;
        }
    }

    RgbColor c = s_notifyPhaseOn
        ? (RgbColor){s_currentNotify.r, s_currentNotify.g, s_currentNotify.b}
        : (RgbColor){0, 0, 0};
    for (uint8_t i = 0; i < count; i++) outLeds[i] = c;
}

static void renderActiveFrame(uint32_t now, RgbColor* rawColors, uint8_t count) {
    if (s_callActive) {
        // Priority 4: Call mode busy indicator (Red)
        for (uint8_t i = 0; i < count; i++) rawColors[i] = (RgbColor){255, 0, 0};
    } else if (s_notifyActive) {
        // Priority 3: Notification blink pattern
        processNotificationBlink(rawColors, count);
#if FEATURE_MUSIC
    } else if (musicIsActive()) {
        // Priority 2: Music reactive stream
        musicRenderLeds(rawColors, count);
#endif
    } else if (s_manualState.mode == LED_MODE_OFF) {
        for (uint8_t i = 0; i < count; i++) rawColors[i] = (RgbColor){0, 0, 0};
    } else {
        // Priority 1 / 0: Manual / Auto effect rendering
        EffectParams p;
        p.effect = s_manualState.effect;
        p.color1 = (RgbColor){s_manualState.r, s_manualState.g, s_manualState.b};
        p.color2 = (RgbColor){s_manualState.r2, s_manualState.g2, s_manualState.b2};
        p.speed = s_manualState.speed;
        p.blinkOnMs = s_manualState.blinkOnMs;
        p.blinkOffMs = s_manualState.blinkOffMs;
        ledEffectsRender(now, &p, rawColors, count);
    }
}

static void applySafetyAndOutput(RgbColor* rawColors, uint8_t count) {
    // 1. Current limiting check
    uint16_t estMa = ledEstimateCurrentMa(rawColors, count, LED_MA_PER_LED);
    uint8_t currentScale = ledCalculateCurrentScale(estMa, LED_MAX_MA);

    // 2. Power-on inrush limit for first 1000ms
    uint8_t effectiveCap = LED_MAX_BRIGHTNESS;
    if (millis() < 1000 && s_bootSettings.inrushLimit < 100) {
        effectiveCap = (uint8_t)(((uint32_t)effectiveCap * s_bootSettings.inrushLimit) / 100);
    }

    // 3. Brightness scaling, current cap, gamma, and hardware transmission
    for (uint8_t i = 0; i < count; i++) {
        RgbColor c = ledScaleBrightness(rawColors[i], s_manualState.brightness, effectiveCap);
        if (currentScale < 255) {
            c = ledScaleBrightness(c, (uint8_t)((currentScale * 100) / 255), 255);
        }
        RgbColor gc = ledGammaCorrectRgb(c);
        s_strip.setPixelColor(i, gc.r, gc.g, gc.b);
    }
    s_strip.show();
}

static void ledTask(void* param) {
    (void)param;
    RgbColor rawColors[LED_COUNT];

    while (1) {
        if (!isFeatureEnabled(FSWITCH_LED_STRIP)) {
            s_strip.clear();
            s_strip.show();
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        uint32_t now = millis();
        renderActiveFrame(now, rawColors, LED_COUNT);
        applySafetyAndOutput(rawColors, LED_COUNT);

        vTaskDelay(pdMS_TO_TICKS(16)); // ~60 FPS
    }
}

void ledsBegin(void) {
    loadNvs();
    s_strip.begin();
    s_strip.clear();
    s_strip.show();

    // Start 60 FPS FreeRTOS rendering task
    xTaskCreatePinnedToCore(ledTask, "ledTask", LED_TASK_STACK, NULL,
                            LED_TASK_PRIORITY, NULL, 1);
}

uint8_t ledsSetState(const LedState* state) {
    if (state == (const LedState*)0) return ERR_INVALID_PARAM;
    if (!ledIsPhotosensitiveSafe(state->blinkOnMs, state->blinkOffMs)) {
        return ERR_PHOTOSENSITIVITY;
    }

    bool changed = (memcmp(&s_manualState, state, sizeof(LedState)) != 0);
    if (!changed) return ERR_OK;

    memcpy(&s_manualState, state, sizeof(LedState));
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.putBytes("manual", &s_manualState, sizeof(LedState));
    s_ledPrefs.end();

    if (s_callback) s_callback(&s_manualState);
    return ERR_OK;
}

void ledsGetState(LedState* outState) {
    if (outState) memcpy(outState, &s_manualState, sizeof(LedState));
}

void ledsTriggerNotificationBlink(uint8_t eventId) {
    if (eventId >= NOTIFY_EVENT_COUNT) return;
    if (!isFeatureEnabled(FSWITCH_LED_STRIP) || !s_notifyConfigs[eventId].enabled) return;

    s_currentNotify = s_notifyConfigs[eventId];
    s_notifyFlashRemaining = s_currentNotify.count;
    s_notifyPhaseStartMs = millis();
    s_notifyPhaseOn = true;
    s_notifyActive = true;
}

void ledsSetCallMode(bool onCall) {
    s_callActive = onCall;
}

bool ledsGetSlot(uint8_t index, LedSlot* outSlot) {
    if (index >= LSLOT_MAX || outSlot == (LedSlot*)0) return false;
    memcpy(outSlot, &s_slots[index], sizeof(LedSlot));
    return true;
}

uint8_t ledsSetSlot(const LedSlot* slot) {
    if (slot == (const LedSlot*)0 || slot->index >= LSLOT_MAX) return ERR_INVALID_PARAM;
    memcpy(&s_slots[slot->index], slot, sizeof(LedSlot));
    char k[8]; snprintf(k, sizeof(k), "sl%u", slot->index);
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.putBytes(k, &s_slots[slot->index], sizeof(LedSlot));
    s_ledPrefs.end();
    return ERR_OK;
}

uint8_t ledsDeleteSlot(uint8_t index) {
    if (index >= LSLOT_MAX) return ERR_INVALID_PARAM;
    memset(&s_slots[index], 0, sizeof(LedSlot));
    char k[8]; snprintf(k, sizeof(k), "sl%u", index);
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.remove(k);
    s_ledPrefs.end();
    return ERR_OK;
}

bool ledsGetPreset(uint8_t index, LedPreset* outPreset) {
    if (index >= LPRESET_MAX || outPreset == (LedPreset*)0) return false;
    memcpy(outPreset, &s_presets[index], sizeof(LedPreset));
    return true;
}

uint8_t ledsSavePreset(const LedPreset* preset) {
    if (preset == (const LedPreset*)0 || preset->index >= LPRESET_MAX) return ERR_INVALID_PARAM;
    memcpy(&s_presets[preset->index], preset, sizeof(LedPreset));
    char k[8]; snprintf(k, sizeof(k), "p%u", preset->index);
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.putBytes(k, &s_presets[preset->index], sizeof(LedPreset));
    s_ledPrefs.end();
    return ERR_OK;
}

uint8_t ledsApplyPreset(uint8_t index) {
    if (index >= LPRESET_MAX) return ERR_NOT_FOUND;
    s_manualState.r = s_presets[index].r;
    s_manualState.g = s_presets[index].g;
    s_manualState.b = s_presets[index].b;
    s_manualState.brightness = s_presets[index].brightness;
    s_manualState.effect = s_presets[index].effect;
    s_manualState.speed = s_presets[index].speed;
    s_manualState.r2 = s_presets[index].r2;
    s_manualState.g2 = s_presets[index].g2;
    s_manualState.b2 = s_presets[index].b2;
    return ledsSetState(&s_manualState);
}

uint8_t ledsDeletePreset(uint8_t index) {
    if (index >= LPRESET_MAX) return ERR_INVALID_PARAM;
    memset(&s_presets[index], 0, sizeof(LedPreset));
    char k[8]; snprintf(k, sizeof(k), "p%u", index);
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.remove(k);
    s_ledPrefs.end();
    return ERR_OK;
}

bool ledsGetNotifyBlink(uint8_t eventId, NotifyBlinkConfig* outConfig) {
    if (eventId >= NOTIFY_EVENT_COUNT || outConfig == (NotifyBlinkConfig*)0) return false;
    memcpy(outConfig, &s_notifyConfigs[eventId], sizeof(NotifyBlinkConfig));
    return true;
}

uint8_t ledsSetNotifyBlink(const NotifyBlinkConfig* config) {
    if (config == (const NotifyBlinkConfig*)0 || config->eventId >= NOTIFY_EVENT_COUNT) {
        return ERR_INVALID_PARAM;
    }
    if (!ledIsPhotosensitiveSafe(config->onMs, config->offMs)) {
        return ERR_PHOTOSENSITIVITY;
    }
    memcpy(&s_notifyConfigs[config->eventId], config, sizeof(NotifyBlinkConfig));
    char k[8]; snprintf(k, sizeof(k), "nb%u", config->eventId);
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.putBytes(k, &s_notifyConfigs[config->eventId], sizeof(NotifyBlinkConfig));
    s_ledPrefs.end();
    return ERR_OK;
}

void ledsGetBootSettings(LedBootSettings* outSettings) {
    if (outSettings) memcpy(outSettings, &s_bootSettings, sizeof(LedBootSettings));
}

uint8_t ledsSetBootSettings(const LedBootSettings* inSettings) {
    if (inSettings == (const LedBootSettings*)0) return ERR_INVALID_PARAM;
    memcpy(&s_bootSettings, inSettings, sizeof(LedBootSettings));
    s_ledPrefs.begin(NVS_NS_LED, false);
    s_ledPrefs.putBytes("boot", &s_bootSettings, sizeof(LedBootSettings));
    s_ledPrefs.end();
    return ERR_OK;
}

void ledsRegisterCallback(LedStateCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_LEDS

