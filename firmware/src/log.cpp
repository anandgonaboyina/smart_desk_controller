/**
 * log.cpp — Implementation of non-blocking logging and RAM ring buffer.
 *
 * Purpose : Non-blocking serial logging over UART (115200) and BLE log notifications.
 * Depends : log.h, Arduino.h, Preferences.h, freertos/queue.h.
 * Used by : main.cpp, ble_service.cpp, all subsystems.
 * Feature : Always compiled.
 */

#include "log.h"
#include <Arduino.h>
#include <Preferences.h>
#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#define LOG_QUEUE_SIZE 24

struct LogItem {
    uint32_t timestampMs;
    uint8_t level;
    char tag[8];
    char text[LOG_LINE_MAX_LEN];
};

static QueueHandle_t s_logQueue = NULL;
static TaskHandle_t s_logTaskHandle = NULL;
static Preferences s_logPrefs;
static bool s_enabled = true;
static uint8_t s_level = LOG_LEVEL_INFO;
static LogNotifyCallback s_notifyCb = NULL;

// In-memory RAM ring buffer
static char s_ring[LOG_RING_LINES][LOG_LINE_MAX_LEN];
static uint8_t s_ringHead = 0;
static uint8_t s_ringCount = 0;

static const char* s_levelNames[] = {
    "NONE", "ERROR", "WARN", "INFO", "DEBUG"
};

const char* logGetLevelName(uint8_t level) {
    if (level <= LOG_LEVEL_DEBUG) return s_levelNames[level];
    return "UNKNOWN";
}

uint8_t logParseLevel(char c) {
    switch (c) {
        case 'e': case 'E': return LOG_LEVEL_ERROR;
        case 'w': case 'W': return LOG_LEVEL_WARN;
        case 'i': case 'I': return LOG_LEVEL_INFO;
        case 'd': case 'D': return LOG_LEVEL_DEBUG;
        case '0': return LOG_LEVEL_NONE;
        default: return LOG_LEVEL_INFO;
    }
}

static void logTask(void* param) {
    (void)param;
    LogItem item;
    char formatted[120];

    while (1) {
        if (xQueueReceive(s_logQueue, &item, portMAX_DELAY) == pdTRUE) {
            if (!s_enabled || item.level > s_level) {
                continue;
            }

            uint32_t s = item.timestampMs / 1000;
            uint32_t ms = item.timestampMs % 1000;
            snprintf(formatted, sizeof(formatted), "[%4lu.%03lu] [%s] [%s] %s",
                     s, ms, logGetLevelName(item.level), item.tag, item.text);

            // 1. Output to UART Serial (115200)
            Serial.println(formatted);

            // 2. Append to in-memory RAM ring buffer
            strncpy(s_ring[s_ringHead], formatted, LOG_LINE_MAX_LEN - 1);
            s_ring[s_ringHead][LOG_LINE_MAX_LEN - 1] = '\0';
            s_ringHead = (s_ringHead + 1) % LOG_RING_LINES;
            if (s_ringCount < LOG_RING_LINES) {
                s_ringCount++;
            }

            // 3. Dispatch to BLE callback if connected
            if (s_notifyCb != NULL) {
                s_notifyCb(formatted);
            }
        }
    }
}

void logInit(void) {
    s_logPrefs.begin("log_cfg", false);
    s_enabled = s_logPrefs.getBool("enabled", true);
    s_level = s_logPrefs.getUChar("level", LOG_LEVEL_INFO);
    s_logPrefs.end();

    if (s_logQueue == NULL) {
        s_logQueue = xQueueCreate(LOG_QUEUE_SIZE, sizeof(LogItem));
    }

    if (s_logTaskHandle == NULL && s_logQueue != NULL) {
        xTaskCreatePinnedToCore(
            logTask,
            "logTask",
            3072,
            NULL,
            1, // Low priority background task
            &s_logTaskHandle,
            1  // Run on Core 1
        );
    }
}

void logMessage(uint8_t level, const char* tag, const char* fmt, ...) {
    if (!s_enabled || level > s_level || s_logQueue == NULL) {
        return;
    }

    LogItem item;
    item.timestampMs = millis();
    item.level = level;

    // Copy tag defensively
    if (tag) {
        strncpy(item.tag, tag, sizeof(item.tag) - 1);
        item.tag[sizeof(item.tag) - 1] = '\0';
    } else {
        strcpy(item.tag, "SYS");
    }

    va_list args;
    va_start(args, fmt);
    vsnprintf(item.text, sizeof(item.text), fmt, args);
    va_end(args);

    // Non-blocking: post to queue with 0 timeout. If full, drop to protect system timing.
    xQueueSend(s_logQueue, &item, 0);
}

void logSetEnabled(bool enabled) {
    s_enabled = enabled;
    s_logPrefs.begin("log_cfg", false);
    s_logPrefs.putBool("enabled", s_enabled);
    s_logPrefs.end();
}

bool logIsEnabled(void) {
    return s_enabled;
}

void logSetLevel(uint8_t level) {
    if (level <= LOG_LEVEL_DEBUG) {
        s_level = level;
        s_logPrefs.begin("log_cfg", false);
        s_logPrefs.putUChar("level", s_level);
        s_logPrefs.end();
    }
}

uint8_t logGetLevel(void) {
    return s_level;
}

uint8_t logGetRingBuffer(char* outBuf, uint16_t maxLen) {
    if (!outBuf || maxLen == 0 || s_ringCount == 0) return 0;

    uint8_t copied = 0;
    uint16_t written = 0;
    outBuf[0] = '\0';

    // Start from the oldest line
    uint8_t startIdx = (s_ringHead + LOG_RING_LINES - s_ringCount) % LOG_RING_LINES;

    for (uint8_t i = 0; i < s_ringCount; i++) {
        uint8_t idx = (startIdx + i) % LOG_RING_LINES;
        size_t len = strlen(s_ring[idx]);
        if (written + len + 2 >= maxLen) break;

        memcpy(&outBuf[written], s_ring[idx], len);
        written += len;
        outBuf[written++] = '\n';
        copied++;
    }
    outBuf[written] = '\0';
    return copied;
}

void logSetNotifyCallback(LogNotifyCallback cb) {
    s_notifyCb = cb;
}
