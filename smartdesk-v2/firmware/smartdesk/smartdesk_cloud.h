/**
 * smartdesk_cloud.h — Cloud WebSocket Client for SmartDesk V2
 *
 * Purpose : Connects ESP32-S3 to the Node.js/Render cloud relay over WebSocket.
 *           Enables worldwide remote control with multi-user isolation.
 * Depends : WebSocketsClient.h, Arduino.h, smartdesk_pins.h
 * Used by : smartdesk_wifi.h, smartdesk.ino
 * Feature : Compiled when Wi-Fi and Cloud Remote are enabled.
 */

#ifndef SMARTDESK_CLOUD_H
#define SMARTDESK_CLOUD_H

#include <Arduino.h>
#include <WebSocketsClient.h>

/* ── Default Cloud Relay Settings (Configurable in NVS) ─────────────────── */
#define DEFAULT_CLOUD_HOST "192.168.80.113"
#define DEFAULT_CLOUD_PORT 3001
#define DEFAULT_CLOUD_PATH "/ws"
#define CLOUD_DEVICE_ID    "desk_anand_s3"
#define CLOUD_AUTH_KEY     "SmartDesk_Cloud_Secret_2026"

static WebSocketsClient s_cloudWs;
static bool             s_cloudConnected    = false;
static uint32_t         s_lastCloudPingMs   = 0;
static char             s_cloudHost[64]     = DEFAULT_CLOUD_HOST;
static uint16_t         s_cloudPort         = DEFAULT_CLOUD_PORT;

/* Forward declarations of functions implemented in smartdesk.ino */
void setRelayLoad(uint8_t idx, uint8_t load, const char* source);
void allRelaysOff(const char* source);
void saveLedStateToNVS();
void notifyRelayState();
void notifyLedState();
void notifyEnvState();

extern uint8_t s_relayLoads[RELAY_COUNT];
extern uint32_t s_timerEndMs[RELAY_COUNT];
extern uint8_t s_ledMode;
extern uint8_t s_ledR;
extern uint8_t s_ledG;
extern uint8_t s_ledB;
extern uint8_t s_ledBri;
extern uint8_t s_ledSpd;
extern float   s_tempC;
extern float   s_humidity;
extern bool    s_sensorValid;

/* ── Broadcast Hardware State to Cloud Relay ─────────────────────────────── */
inline void broadcastCloudState() {
    if (!s_cloudConnected) return;

    char msg[384];
    int len = snprintf(msg, sizeof(msg),
        "{\"type\":\"state_update\",\"deviceId\":\"%s\","
        "\"state\":{\"relays\":["
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u}],"
        "\"led\":{\"mode\":%u,\"r\":%u,\"g\":%u,\"b\":%u,\"bri\":%u,\"spd\":%u},"
        "\"env\":{\"tempC\":%.1f,\"humidity\":%.1f,\"valid\":%s}}}",
        CLOUD_DEVICE_ID,
        s_relayLoads[0] ? "true" : "false", (s_timerEndMs[0] > 0) ? (uint16_t)((s_timerEndMs[0] - millis()) / 60000UL) : 0,
        s_relayLoads[1] ? "true" : "false", (s_timerEndMs[1] > 0) ? (uint16_t)((s_timerEndMs[1] - millis()) / 60000UL) : 0,
        s_relayLoads[2] ? "true" : "false", (s_timerEndMs[2] > 0) ? (uint16_t)((s_timerEndMs[2] - millis()) / 60000UL) : 0,
        s_relayLoads[3] ? "true" : "false", (s_timerEndMs[3] > 0) ? (uint16_t)((s_timerEndMs[3] - millis()) / 60000UL) : 0,
        s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd,
        s_tempC, s_humidity, s_sensorValid ? "true" : "false"
    );

    if (len > 0 && len < (int)sizeof(msg)) {
        s_cloudWs.sendTXT(msg);
    }
}

/* ── Simple In-Place JSON Value Parser (Zero external JSON library overhead) */
static bool getJsonStr(const char* json, const char* key, char* out, size_t maxLen) {
    if (!json || !key || !out || maxLen == 0) return false;
    char needle[48];
    snprintf(needle, sizeof(needle), "\"%s\":\"", key);
    const char* p = strstr(json, needle);
    if (!p) return false;
    p += strlen(needle);
    const char* end = strchr(p, '"');
    if (!end) return false;
    size_t copyLen = (size_t)(end - p);
    if (copyLen >= maxLen) copyLen = maxLen - 1;
    memcpy(out, p, copyLen);
    out[copyLen] = '\0';
    return true;
}

static int getJsonInt(const char* json, const char* key, int defaultVal) {
    if (!json || !key) return defaultVal;
    char needle[48];
    snprintf(needle, sizeof(needle), "\"%s\":", key);
    const char* p = strstr(json, needle);
    if (!p) return defaultVal;
    p += strlen(needle);
    while (*p == ' ') p++;
    return atoi(p);
}

static bool getJsonBool(const char* json, const char* key, bool defaultVal) {
    if (!json || !key) return defaultVal;
    char needle[48];
    snprintf(needle, sizeof(needle), "\"%s\":", key);
    const char* p = strstr(json, needle);
    if (!p) return defaultVal;
    p += strlen(needle);
    while (*p == ' ') p++;
    if (strncmp(p, "true", 4) == 0 || *p == '1') return true;
    if (strncmp(p, "false", 5) == 0 || *p == '0') return false;
    return defaultVal;
}

/* ── Inbound Cloud Message Handler ───────────────────────────────────────── */
static void handleCloudMessage(const char* payload, size_t length) {
    (void)length;
    if (!payload) return;

    char msgType[32] = {0};
    getJsonStr(payload, "type", msgType, sizeof(msgType));

    // 1. Authentication response from server
    if (strcmp(msgType, "auth_res") == 0) {
        bool ok = getJsonBool(payload, "ok", false);
        if (ok) {
            Serial.println(">>> [CLOUD WS] Device authenticated successfully with cloud relay!");
            broadcastCloudState();
        } else {
            Serial.println(">>> [CLOUD WS WARN] Cloud authentication rejected.");
        }
        return;
    }

    // 2. Incoming control command from remote user
    if (strcmp(msgType, "command") == 0) {
        char action[32] = {0};
        getJsonStr(payload, "action", action, sizeof(action));

        if (strcmp(action, "relay") == 0 || strcmp(action, "relay_set") == 0) {
            int relay = getJsonInt(payload, "relay", -1);
            if (relay < 0) relay = getJsonInt(payload, "channel", -1);
            bool state = getJsonBool(payload, "state", false);
            if (relay >= 0 && relay < RELAY_COUNT) {
                setRelayLoad((uint8_t)relay, state ? 1 : 0, "Cloud Remote");
                notifyRelayState();
                broadcastCloudState();
            }
        } else if (strcmp(action, "all_off") == 0) {
            allRelaysOff("Cloud Remote All-Off");
            notifyRelayState();
            broadcastCloudState();
        } else if (strcmp(action, "led") == 0 || strcmp(action, "led_set") == 0) {
            s_ledMode = (uint8_t)getJsonInt(payload, "mode", s_ledMode);
            s_ledR    = (uint8_t)getJsonInt(payload, "r", s_ledR);
            s_ledG    = (uint8_t)getJsonInt(payload, "g", s_ledG);
            s_ledB    = (uint8_t)getJsonInt(payload, "b", s_ledB);
            s_ledBri  = (uint8_t)getJsonInt(payload, "bri", s_ledBri);
            s_ledSpd  = (uint8_t)getJsonInt(payload, "spd", s_ledSpd);
            saveLedStateToNVS();
            notifyLedState();
            broadcastCloudState();
        }
    }
}

/* ── WebSocket Event Dispatcher ──────────────────────────────────────────── */
static void onCloudWsEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            s_cloudConnected = false;
            Serial.println(">>> [CLOUD WS] Disconnected from cloud relay.");
            break;

        case WStype_CONNECTED: {
            s_cloudConnected = true;
            Serial.printf(">>> [CLOUD WS] Connected to %s:%d! Sending auth handshake...\n", s_cloudHost, s_cloudPort);
            char authMsg[160];
            snprintf(authMsg, sizeof(authMsg),
                "{\"type\":\"auth\",\"role\":\"device\",\"deviceId\":\"%s\",\"deviceKey\":\"%s\"}",
                CLOUD_DEVICE_ID, CLOUD_AUTH_KEY
            );
            s_cloudWs.sendTXT(authMsg);
            break;
        }

        case WStype_TEXT:
            handleCloudMessage((const char*)payload, length);
            break;

        case WStype_PONG:
            break;

        default:
            break;
    }
}

/* ── Cloud Client Lifecycle ──────────────────────────────────────────────── */
static void startCloudClient() {
    Serial.printf(">>> [CLOUD WS] Initializing WebSocket client -> ws://%s:%d%s\n",
                  s_cloudHost, s_cloudPort, DEFAULT_CLOUD_PATH);
    s_cloudWs.begin(s_cloudHost, s_cloudPort, DEFAULT_CLOUD_PATH);
    s_cloudWs.onEvent(onCloudWsEvent);
    s_cloudWs.setReconnectInterval(5000);
    s_cloudWs.enableHeartbeat(15000, 3000, 2);
}

static void stopCloudClient() {
    if (s_cloudConnected) {
        s_cloudWs.disconnect();
        s_cloudConnected = false;
    }
}

static void updateCloudClient() {
    s_cloudWs.loop();
}

#endif // SMARTDESK_CLOUD_H
