/**
 * leds.h — LED strip controller subsystem.
 *
 * Purpose : Drives 8 WS2812B LEDs on GPIO8 with full effect rendering, 5-level
 *           priority engine, notification blinks, time-of-day slots, presets,
 *           power-on safety limits, and 60 FPS FreeRTOS rendering task.
 * Depends : stdint.h, stdbool.h, protocol.h, config.h, led_math.h.
 * Used by : main.cpp, ble_service.cpp, calls.cpp, music.cpp.
 * Feature : FEATURE_LEDS
 */

#pragma once

#include "features.h"

#if FEATURE_LEDS

#include <stdint.h>
#include <stdbool.h>
#include "protocol.h"
#include "config.h"
#include "../lib/led_math/led_math.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint8_t  mode;
    uint8_t  effect;
    uint8_t  r;
    uint8_t  g;
    uint8_t  b;
    uint8_t  brightness;        // 0-100%
    uint8_t  speed;             // 0-255
    uint8_t  autoResumeMin;     // Minutes before resuming auto mode (0 = stay manual)
    uint8_t  r2;                // Gradient secondary color
    uint8_t  g2;
    uint8_t  b2;
    uint16_t blinkOnMs;         // 50-5000 ms
    uint16_t blinkOffMs;        // 50-5000 ms
} LedState;

typedef struct {
    uint8_t  index;
    uint8_t  startHour;
    uint8_t  startMin;
    uint8_t  weekdayMask;
    uint8_t  r;
    uint8_t  g;
    uint8_t  b;
    uint8_t  brightness;
    uint8_t  effect;
    uint16_t fadeSeconds;
    uint8_t  presetIndex;       // 0xFF = use inline color
} LedSlot;

typedef struct {
    uint8_t index;
    uint8_t r;
    uint8_t g;
    uint8_t b;
    uint8_t brightness;
    uint8_t effect;
    uint8_t speed;
    uint8_t r2;
    uint8_t g2;
    uint8_t b2;
} LedPreset;

enum {
    NOTIFY_EVENT_TIMER_ENDED = 0,
    NOTIFY_EVENT_AWAY_STARTED,
    NOTIFY_EVENT_AWAY_ENDED,
    NOTIFY_EVENT_SCHED_FIRED,
    NOTIFY_EVENT_CALL_ON,
    NOTIFY_EVENT_BLE_CONNECTED,
    NOTIFY_EVENT_BLE_LOST,
    NOTIFY_EVENT_COUNT
};

typedef struct {
    uint8_t  eventId;
    uint8_t  enabled;
    uint8_t  r;
    uint8_t  g;
    uint8_t  b;
    uint8_t  count;             // 1-10 flashes
    uint16_t onMs;
    uint16_t offMs;
} NotifyBlinkConfig;

typedef struct {
    uint8_t bootBehavior;       // 0=last state, 1=preset, 2=off
    uint8_t presetIndex;
    uint8_t inrushLimit;        // % cap for 1st second (default 50)
    uint8_t bootAnim;           // 0=off, 1=sweep
    uint8_t bleIndication;      // 0=off, 1=blink while advertising
} LedBootSettings;

typedef void (*LedStateCallback)(const LedState* state);

/**
 * Initialize WS2812B strip, load presets/slots from NVS, start FreeRTOS LED task.
 */
void ledsBegin(void);

/**
 * Set manual LED state. Overrides Auto mode until autoResumeMin expires.
 */
uint8_t ledsSetState(const LedState* state);

/**
 * Get current active LED state.
 */
void ledsGetState(LedState* outState);

/**
 * Trigger temporary notification blink sequence on top of current mode.
 */
void ledsTriggerNotificationBlink(uint8_t eventId);

/**
 * Notify LED subsystem of Call Mode active/inactive state change.
 */
void ledsSetCallMode(bool onCall);

/**
 * Set or retrieve Auto slots.
 */
bool ledsGetSlot(uint8_t index, LedSlot* outSlot);
uint8_t ledsSetSlot(const LedSlot* slot);
uint8_t ledsDeleteSlot(uint8_t index);

/**
 * Presets management.
 */
bool ledsGetPreset(uint8_t index, LedPreset* outPreset);
uint8_t ledsSavePreset(const LedPreset* preset);
uint8_t ledsApplyPreset(uint8_t index);
uint8_t ledsDeletePreset(uint8_t index);

/**
 * Notification blinks & Boot settings.
 */
bool ledsGetNotifyBlink(uint8_t eventId, NotifyBlinkConfig* outConfig);
uint8_t ledsSetNotifyBlink(const NotifyBlinkConfig* config);
void ledsGetBootSettings(LedBootSettings* outSettings);
uint8_t ledsSetBootSettings(const LedBootSettings* inSettings);

/**
 * Register state notification callback for BLE clients.
 */
void ledsRegisterCallback(LedStateCallback cb);

#define LED_PRIO_AUTO           0
#define LED_PRIO_MANUAL         1
#define LED_PRIO_MUSIC          2
#define LED_PRIO_NOTIFY_BLINK   3
#define LED_PRIO_CALL_MODE      4

#define LED_BOOT_LAST_STATE     0
#define LED_BOOT_PRESET         1
#define LED_BOOT_OFF            2
#define LBOOT_DEFAULT_INRUSH    50

static inline void ledsSetManual(uint8_t r, uint8_t g, uint8_t b, uint8_t bright, uint8_t eff) {
    LedState st = {0};
    st.mode = LED_MODE_MANUAL;
    st.effect = eff;
    st.r = r; st.g = g; st.b = b;
    st.brightness = bright;
    ledsSetState(&st);
}

static inline void ledsSetAuto(void) {
    LedState st = {0};
    st.mode = LED_MODE_AUTO;
    ledsSetState(&st);
}

#ifdef __cplusplus
}
#endif

#endif // FEATURE_LEDS

