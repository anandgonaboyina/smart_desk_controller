/**
 * log.h — Non-blocking multi-level logging and in-memory ring buffer.
 *
 * Purpose : Non-blocking serial logging over UART (115200) and BLE log notifications.
 *           In-memory ring buffer of recent logs for PWA live diagnostics.
 * Depends : stdint.h, stdbool.h.
 * Used by : All firmware subsystems (relays, leds, ble, hid, scheduler, etc.).
 * Feature : Always compiled.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// ── Log Levels ──────────────────────────────────────────────────────────────
#define LOG_LEVEL_NONE   0
#define LOG_LEVEL_ERROR  1
#define LOG_LEVEL_WARN   2
#define LOG_LEVEL_INFO   3
#define LOG_LEVEL_DEBUG  4

// ── Module Tags ─────────────────────────────────────────────────────────────
#define TAG_RELAY  "RELAY"
#define TAG_BLE    "BLE"
#define TAG_SCHED  "SCHED"
#define TAG_LED    "LED"
#define TAG_MUSIC  "MUSIC"
#define TAG_HID    "HID"
#define TAG_FEAT   "FEAT"
#define TAG_SYS    "SYS"
#define TAG_NVS    "NVS"
#define TAG_TEST   "TEST"

// ── Ring Buffer Specs ───────────────────────────────────────────────────────
#define LOG_RING_LINES      50
#define LOG_LINE_MAX_LEN    84

/**
 * Initialize logging queue, FreeRTOS background task, and NVS preferences.
 */
void logInit(void);

/**
 * Core logging dispatch. Formats line, enqueues to FreeRTOS queue, and returns immediately.
 */
void logMessage(uint8_t level, const char* tag, const char* fmt, ...);

/**
 * Enable or disable logging output at runtime (persisted in NVS).
 */
void logSetEnabled(bool enabled);
bool logIsEnabled(void);

/**
 * Set log level filter (persisted in NVS).
 * Levels: 0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG.
 */
void logSetLevel(uint8_t level);
uint8_t logGetLevel(void);

/**
 * Helper to parse level letter ('e', 'w', 'i', 'd') into level number.
 */
uint8_t logParseLevel(char c);
const char* logGetLevelName(uint8_t level);

/**
 * Copy recent log lines from RAM ring buffer to a destination buffer.
 * Returns number of lines copied.
 */
uint8_t logGetRingBuffer(char* outBuf, uint16_t maxLen);

/**
 * Register BLE notification hook called whenever a new log line is processed.
 */
typedef void (*LogNotifyCallback)(const char* line);
void logSetNotifyCallback(LogNotifyCallback cb);

// ── Convenience Macros ───────────────────────────────────────────────────────
#define LOGE(tag, fmt, ...) logMessage(LOG_LEVEL_ERROR, tag, fmt, ##__VA_ARGS__)
#define LOGW(tag, fmt, ...) logMessage(LOG_LEVEL_WARN,  tag, fmt, ##__VA_ARGS__)
#define LOGI(tag, fmt, ...) logMessage(LOG_LEVEL_INFO,  tag, fmt, ##__VA_ARGS__)
#define LOGD(tag, fmt, ...) logMessage(LOG_LEVEL_DEBUG, tag, fmt, ##__VA_ARGS__)

#ifdef __cplusplus
}
#endif

