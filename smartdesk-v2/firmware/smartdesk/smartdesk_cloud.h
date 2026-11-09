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
#define DEFAULT_CLOUD_HOST "smart-desk-controller.onrender.com"
#define DEFAULT_CLOUD_PORT 443
#define DEFAULT_CLOUD_PATH "/ws"
#define CLOUD_DEVICE_ID    "desk_anand_s3"
#define CLOUD_AUTH_KEY     "SmartDesk_Cloud_Secret_2026"
#define CLOUD_DEFAULT_USER "user_anand_primary"

static WebSocketsClient s_cloudWs;
static bool             s_cloudConnected        = false;
static bool             s_cloudAuthenticated    = false;
static bool             s_cloudWsStarted        = false;
static uint32_t         s_lastCloudPingMs       = 0;
static uint32_t         s_wsReconnectIntervalMs = 5000;
static uint32_t         s_lastWsDisconnectMs    = 0;
static uint8_t          s_wsReconnectAttempts   = 0;
static char             s_cloudHost[64]         = DEFAULT_CLOUD_HOST;
static uint16_t         s_cloudPort             = DEFAULT_CLOUD_PORT;
static char             s_cloudDeviceId[36]     = CLOUD_DEVICE_ID;
static char             s_cloudDeviceKey[48]    = CLOUD_AUTH_KEY;
static char             s_cloudUser[36]         = CLOUD_DEFAULT_USER;
static char             s_cloudPassword[36]     = ""; // Default empty / disabled (no password required initially)

/* ── NVS Persistence for Cloud Configuration ─────────────────────────────── */
static inline void loadCloudConfigFromNVS() {
    Preferences prefs;
    prefs.begin("desk_cloud", true);
    String host   = prefs.getString("host", DEFAULT_CLOUD_HOST);
    s_cloudPort   = prefs.getUShort("port", DEFAULT_CLOUD_PORT);
    String devId  = prefs.getString("dev_id", CLOUD_DEVICE_ID);
    String devKey = prefs.getString("dev_key", CLOUD_AUTH_KEY);
    String user   = prefs.getString("user", CLOUD_DEFAULT_USER);
    String pass   = prefs.getString("pass", "");
    prefs.end();

    strncpy(s_cloudHost, host.c_str(), sizeof(s_cloudHost) - 1);
    s_cloudHost[sizeof(s_cloudHost) - 1] = '\0';
    strncpy(s_cloudDeviceId, devId.c_str(), sizeof(s_cloudDeviceId) - 1);
    s_cloudDeviceId[sizeof(s_cloudDeviceId) - 1] = '\0';
    strncpy(s_cloudDeviceKey, devKey.c_str(), sizeof(s_cloudDeviceKey) - 1);
    s_cloudDeviceKey[sizeof(s_cloudDeviceKey) - 1] = '\0';
    strncpy(s_cloudUser, user.c_str(), sizeof(s_cloudUser) - 1);
    s_cloudUser[sizeof(s_cloudUser) - 1] = '\0';
    strncpy(s_cloudPassword, pass.c_str(), sizeof(s_cloudPassword) - 1);
    s_cloudPassword[sizeof(s_cloudPassword) - 1] = '\0';
}

static inline void saveCloudConfigToNVS(const char* host, uint16_t port, const char* devId, const char* devKey, const char* user, const char* pass) {
    Preferences prefs;
    prefs.begin("desk_cloud", false);
    if (host && strlen(host) > 0) {
        prefs.putString("host", host);
        strncpy(s_cloudHost, host, sizeof(s_cloudHost) - 1);
        s_cloudHost[sizeof(s_cloudHost) - 1] = '\0';
    }
    if (port > 0) {
        prefs.putUShort("port", port);
        s_cloudPort = port;
    }
    if (devId && strlen(devId) > 0) {
        prefs.putString("dev_id", devId);
        strncpy(s_cloudDeviceId, devId, sizeof(s_cloudDeviceId) - 1);
        s_cloudDeviceId[sizeof(s_cloudDeviceId) - 1] = '\0';
    }
    if (devKey && strlen(devKey) > 0) {
        prefs.putString("dev_key", devKey);
        strncpy(s_cloudDeviceKey, devKey, sizeof(s_cloudDeviceKey) - 1);
        s_cloudDeviceKey[sizeof(s_cloudDeviceKey) - 1] = '\0';
    }
    if (user && strlen(user) > 0) {
        prefs.putString("user", user);
        strncpy(s_cloudUser, user, sizeof(s_cloudUser) - 1);
        s_cloudUser[sizeof(s_cloudUser) - 1] = '\0';
    }
    if (pass) {
        prefs.putString("pass", pass);
        strncpy(s_cloudPassword, pass, sizeof(s_cloudPassword) - 1);
        s_cloudPassword[sizeof(s_cloudPassword) - 1] = '\0';
    }
    prefs.end();
}

/* Forward declarations of functions implemented in smartdesk.ino */
void setRelayLoad(uint8_t idx, uint8_t load, const char* source);
void setRelayTimer(uint8_t idx, uint16_t mins);
void applyRelayPin(uint8_t idx, uint8_t load, const char* reason);
void allRelaysOff(const char* source);
void saveLedStateToNVS();
void notifyRelayState();
void notifyLedState();
void notifyEnvState();
void initBleServer(const char* name);
void saveMatrixConfigToNVS();

extern RelayConfig s_relayConfigs[RELAY_COUNT];
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
extern char    s_deviceName[25];
extern uint16_t s_stripLen;
extern Adafruit_NeoPixel s_strip;
extern MatrixConfig s_matrixConfig;
extern void setTempOffset(float offset);
extern PresenceConfig s_presenceConfig;
extern char s_masterDeviceName[24];
extern uint32_t s_awayTimerEndMs;
extern uint32_t s_rgbTimerEndMs;
extern void setRgbTimer(uint16_t mins);
extern bool s_buzzerMasterEnabled;
extern void buzzerBeepTimerEnd();
extern void saveMatrixConfigToNVS();
extern void initMatrixHardware();
extern void savePresenceConfigToNVS();
extern ScheduleRule s_schedules[MAX_SCHEDULES];
extern void saveScheduleRuleToNVS(uint8_t id);
extern void executeScheduleAction(uint8_t ruleIdx, uint8_t action);
extern TimeSync s_timeSync;
extern void saveTimeBaseToNVS();

/* ── Broadcast Hardware State to Cloud Relay ─────────────────────────────── */
inline void broadcastCloudState() {
    if (!s_cloudConnected) return;

    uint8_t presState = 0;
    uint16_t presRemMin = 0;
    if (s_connected) {
        presState = 1;
    } else if (s_awayTimerEndMs > 0) {
        presState = 2;
        long remMs = (long)(s_awayTimerEndMs - millis());
        presRemMin = (remMs > 0) ? (uint16_t)((remMs + 59999UL) / 60000UL) : 0;
    }

    uint16_t rgbRemMin = (s_rgbTimerEndMs > 0 && millis() < s_rgbTimerEndMs)
        ? (uint16_t)(((s_rgbTimerEndMs - millis()) + 59999UL) / 60000UL) : 0;

    // Serialize Schedules Array for Cloud Sync
    char schedJson[1400];
    int sPos = snprintf(schedJson, sizeof(schedJson), "[");
    for (int i = 0; i < MAX_SCHEDULES; i++) {
        sPos += snprintf(schedJson + sPos, sizeof(schedJson) - sPos,
            "%s{\"id\":%d,\"enabled\":%s,\"daysMask\":%u,\"startHour\":%u,\"startMin\":%u,"
            "\"stopType\":%u,\"durationMin\":%u,\"stopHour\":%u,\"stopMin\":%u,"
            "\"targetType\":%u,\"targetAction\":%u,\"relayMask\":%u,\"ledTarget\":%s,"
            "\"rgbR\":%u,\"rgbG\":%u,\"rgbB\":%u,\"rgbBri\":%u}",
            (i > 0) ? "," : "",
            i, s_schedules[i].enabled ? "true" : "false", s_schedules[i].daysMask,
            s_schedules[i].startHour, s_schedules[i].startMin,
            s_schedules[i].stopType, s_schedules[i].durationMin,
            s_schedules[i].stopHour, s_schedules[i].stopMin,
            s_schedules[i].targetType, s_schedules[i].targetAction,
            s_schedules[i].relayMask, s_schedules[i].ledTarget ? "true" : "false",
            s_schedules[i].rgbR, s_schedules[i].rgbG, s_schedules[i].rgbB, s_schedules[i].rgbBri
        );
        if (sPos >= (int)sizeof(schedJson) - 10) break;
    }
    if (sPos < (int)sizeof(schedJson) - 2) {
        schedJson[sPos++] = ']';
        schedJson[sPos] = '\0';
    }

    // Send payload matching both top-level keys expected by server.js AND nested state for PWA clients
    static char msg[8192];
    int len = snprintf(msg, sizeof(msg),
        "{\"type\":\"state_update\",\"deviceId\":\"%s\",\"deviceName\":\"%s\",\"stripLen\":%u,"
        "\"matrix\":{\"mode\":%u,\"speed\":%u,\"bri\":%u,\"r\":%u,\"g\":%u,\"b\":%u,\"text\":\"%s\"},"
        "\"presence\":{\"enabled\":%s,\"awayDelayMin\":%u,\"masterDevice\":\"%s\",\"state\":%u,\"remainingMin\":%u,\"awayRelayMask\":%u,\"awayRgbOff\":%s},"
        "\"relays\":["
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u}],"
        "\"configs\":["
        "{\"name\":\"%s\",\"wiring\":%u},"
        "{\"name\":\"%s\",\"wiring\":%u},"
        "{\"name\":\"%s\",\"wiring\":%u},"
        "{\"name\":\"%s\",\"wiring\":%u}],"
        "\"led\":{\"mode\":%u,\"r\":%u,\"g\":%u,\"b\":%u,\"bri\":%u,\"spd\":%u,\"remainingMin\":%u},"
        "\"env\":{\"tempC\":%.1f,\"humidity\":%.1f,\"valid\":%s},"
        "\"schedules\":%s,"
        "\"state\":{\"deviceName\":\"%s\",\"stripLen\":%u,"
        "\"matrix\":{\"mode\":%u,\"speed\":%u,\"bri\":%u,\"r\":%u,\"g\":%u,\"b\":%u,\"text\":\"%s\"},"
        "\"presence\":{\"enabled\":%s,\"awayDelayMin\":%u,\"masterDevice\":\"%s\",\"state\":%u,\"remainingMin\":%u,\"awayRelayMask\":%u,\"awayRgbOff\":%s},"
        "\"relays\":["
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u},"
        "{\"load\":%s,\"remainingMin\":%u}],"
        "\"configs\":["
        "{\"name\":\"%s\",\"wiring\":%u},"
        "{\"name\":\"%s\",\"wiring\":%u},"
        "{\"name\":\"%s\",\"wiring\":%u},"
        "{\"name\":\"%s\",\"wiring\":%u}],"
        "\"led\":{\"mode\":%u,\"r\":%u,\"g\":%u,\"b\":%u,\"bri\":%u,\"spd\":%u,\"remainingMin\":%u},"
        "\"env\":{\"tempC\":%.1f,\"humidity\":%.1f,\"valid\":%s}}}",
        s_cloudDeviceId, s_deviceName, s_stripLen,
        s_matrixConfig.mode, s_matrixConfig.speed, s_matrixConfig.bri, s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, s_matrixConfig.text,
        s_presenceConfig.enabled ? "true" : "false", s_presenceConfig.awayDelayMin, s_masterDeviceName, presState, presRemMin, s_presenceConfig.awayRelayMask, s_presenceConfig.awayRgbOff ? "true" : "false",
        s_relayLoads[0] ? "true" : "false", (s_timerEndMs[0] > 0 && millis() < s_timerEndMs[0]) ? (uint16_t)(((s_timerEndMs[0] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayLoads[1] ? "true" : "false", (s_timerEndMs[1] > 0 && millis() < s_timerEndMs[1]) ? (uint16_t)(((s_timerEndMs[1] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayLoads[2] ? "true" : "false", (s_timerEndMs[2] > 0 && millis() < s_timerEndMs[2]) ? (uint16_t)(((s_timerEndMs[2] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayLoads[3] ? "true" : "false", (s_timerEndMs[3] > 0 && millis() < s_timerEndMs[3]) ? (uint16_t)(((s_timerEndMs[3] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayConfigs[0].name, s_relayConfigs[0].wiring,
        s_relayConfigs[1].name, s_relayConfigs[1].wiring,
        s_relayConfigs[2].name, s_relayConfigs[2].wiring,
        s_relayConfigs[3].name, s_relayConfigs[3].wiring,
        s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd, rgbRemMin,
        s_tempC, s_humidity, s_sensorValid ? "true" : "false",
        schedJson,
        s_deviceName, s_stripLen,
        s_matrixConfig.mode, s_matrixConfig.speed, s_matrixConfig.bri, s_matrixConfig.colorR, s_matrixConfig.colorG, s_matrixConfig.colorB, s_matrixConfig.text,
        s_presenceConfig.enabled ? "true" : "false", s_presenceConfig.awayDelayMin, s_masterDeviceName, presState, presRemMin, s_presenceConfig.awayRelayMask, s_presenceConfig.awayRgbOff ? "true" : "false",
        s_relayLoads[0] ? "true" : "false", (s_timerEndMs[0] > 0 && millis() < s_timerEndMs[0]) ? (uint16_t)(((s_timerEndMs[0] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayLoads[1] ? "true" : "false", (s_timerEndMs[1] > 0 && millis() < s_timerEndMs[1]) ? (uint16_t)(((s_timerEndMs[1] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayLoads[2] ? "true" : "false", (s_timerEndMs[2] > 0 && millis() < s_timerEndMs[2]) ? (uint16_t)(((s_timerEndMs[2] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayLoads[3] ? "true" : "false", (s_timerEndMs[3] > 0 && millis() < s_timerEndMs[3]) ? (uint16_t)(((s_timerEndMs[3] - millis()) + 59999UL) / 60000UL) : 0,
        s_relayConfigs[0].name, s_relayConfigs[0].wiring,
        s_relayConfigs[1].name, s_relayConfigs[1].wiring,
        s_relayConfigs[2].name, s_relayConfigs[2].wiring,
        s_relayConfigs[3].name, s_relayConfigs[3].wiring,
        s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd, rgbRemMin,
        s_tempC, s_humidity, s_sensorValid ? "true" : "false"
    );

    if (len > 0 && len < (int)sizeof(msg)) {
        s_cloudWs.sendTXT(msg);
        Serial.printf(">>> [CLOUD WS] State broadcast sent (%d bytes): R1=%d R2=%d R3=%d R4=%d, LED=%d, Temp=%.1f\n",
                      len, s_relayLoads[0], s_relayLoads[1], s_relayLoads[2], s_relayLoads[3], s_ledMode, s_tempC);
    } else {
        Serial.printf(">>> [CLOUD WS ERROR] State payload truncated! (len=%d, cap=%d)\n", len, (int)sizeof(msg));
    }
}

/* ── Simple In-Place JSON Value Parser (Zero external JSON library overhead) */
static bool getJsonStr(const char* json, const char* key, char* out, size_t maxLen) {
    if (!json || !key || !out || maxLen == 0) return false;
    char needle[48];
    snprintf(needle, sizeof(needle), "\"%s\":\"", key);
    const char* p = strstr(json, needle);
    if (!p) {
        snprintf(needle, sizeof(needle), "\"%s\": \"", key);
        p = strstr(json, needle);
        if (!p) return false;
    }
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
    while (*p == ' ' || *p == '\t' || *p == '"') p++;
    return atoi(p);
}

static bool getJsonBool(const char* json, const char* key, bool defaultVal) {
    if (!json || !key) return defaultVal;
    char needle[48];
    snprintf(needle, sizeof(needle), "\"%s\":", key);
    const char* p = strstr(json, needle);
    if (!p) return defaultVal;
    p += strlen(needle);
    while (*p == ' ' || *p == '\t' || *p == '"') p++;
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

    char action[32] = {0};
    getJsonStr(payload, "action", action, sizeof(action));

    // Normalize command: If type is "command" and action is provided, action is the command;
    // otherwise msgType itself is the command (e.g. "relay_set", "all_off", "led_set", "ping")
    const char* cmd = (strcmp(msgType, "command") == 0 && strlen(action) > 0) ? action : msgType;

    // 1. Authentication response from server
    if (strcmp(msgType, "auth_res") == 0) {
        bool ok = getJsonBool(payload, "ok", false);
        if (ok) {
            s_cloudAuthenticated    = true;
            s_wsReconnectIntervalMs = 5000;
            s_wsReconnectAttempts   = 0;
            Serial.printf(">>> [CLOUD WS] Device authenticated successfully as '%s' (User: %s)!\n", s_cloudDeviceId, s_cloudUser);

            // Auto-sync hardware clock if time is provided by Cloud Relay
            int h = getJsonInt(payload, "h", -1);
            int m = getJsonInt(payload, "m", -1);
            int s = getJsonInt(payload, "s", 0);
            int dow = getJsonInt(payload, "dow", -1);
            if (h >= 0 && m >= 0 && dow >= 0) {
                s_timeSync.synced = true;
                s_timeSync.baseLocalSec = ((uint32_t)dow * 86400UL) + ((uint32_t)h * 3600UL) + ((uint32_t)m * 60UL) + s;
                s_timeSync.syncMillis = millis();
                saveTimeBaseToNVS();
                notifyEnvState();
                Serial.printf(">>> [CLOUD WS] Clock auto-synchronized from Cloud: %02d:%02d:%02d (DOW=%d)\n", h, m, s, dow);
            }

            // PUSH CURRENT HARDWARE STATE IMMEDIATELY UPON AUTHENTICATION
            broadcastCloudState();
        } else {
            s_cloudAuthenticated = false;
            char err[64] = {0};
            getJsonStr(payload, "error", err, sizeof(err));
            Serial.printf(">>> [CLOUD WS WARN] Cloud authentication rejected: %s\n", strlen(err) > 0 ? err : "Invalid credentials");
        }
        return;
    }

    // Diagnostics: Check connection state
    if (!s_cloudConnected) {
        Serial.println(">>> [CLOUD WS WARN] Inbound message dropped: Cloud WebSocket is offline.");
        return;
    }

    // 2. Incoming Relay Control Command (Supports {type:"relay_set", channel:0, state:true} and {action:"relay", idx:0, load:1})
    if (strcmp(cmd, "relay_set") == 0 || strcmp(cmd, "relay") == 0) {
        int relay = getJsonInt(payload, "channel", -1);
        if (relay < 0) relay = getJsonInt(payload, "idx", -1);
        if (relay < 0) relay = getJsonInt(payload, "relay", -1);

        // State can be "state": true/false/1/0 or "load": true/false/1/0
        bool state = false;
        if (strstr(payload, "\"state\":")) {
            state = getJsonBool(payload, "state", false);
        } else if (strstr(payload, "\"load\":")) {
            state = getJsonBool(payload, "load", false);
        }

        if (relay >= 0 && relay < RELAY_COUNT) {
            Serial.printf(">>> [CLOUD WS] Relay %d -> %s (Source: Cloud Remote)\n", relay + 1, state ? "ON" : "OFF");
            setRelayLoad((uint8_t)relay, state ? 1 : 0, "Cloud Remote");
            notifyRelayState();
            broadcastCloudState();

            // Send Acknowledgment back to Cloud Server
            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"relay_set\",\"channel\":%d,\"success\":true}",
                s_cloudDeviceId, relay
            );
            s_cloudWs.sendTXT(ackMsg);
        } else {
            Serial.printf(">>> [CLOUD WS WARN] Invalid relay index received: %d\n", relay);
        }
        return;
    }

    // 3. Emergency All Relays Off Command
    if (strcmp(cmd, "all_off") == 0) {
        Serial.println(">>> [CLOUD WS] Command: All Relays OFF (Source: Cloud Remote)");
        allRelaysOff("Cloud Remote All-Off");
        notifyRelayState();
        broadcastCloudState();

        char ackMsg[128];
        snprintf(ackMsg, sizeof(ackMsg),
            "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"all_off\",\"success\":true}",
            s_cloudDeviceId
        );
        s_cloudWs.sendTXT(ackMsg);
        return;
    }

    // 4. Relay Countdown Timer Command
    if (strcmp(cmd, "relay_timer") == 0 || strcmp(cmd, "timer_set") == 0) {
        int channel = getJsonInt(payload, "channel", -1);
        if (channel < 0) channel = getJsonInt(payload, "idx", -1);
        if (channel < 0) channel = getJsonInt(payload, "relay", -1);
        int minutes = getJsonInt(payload, "minutes", 0);
        if (minutes < 0) minutes = 0;

        if (channel >= 0 && channel < RELAY_COUNT) {
            Serial.printf(">>> [CLOUD WS] Set Relay %d Timer -> %d min (Source: Cloud Remote)\n", channel + 1, minutes);
            setRelayTimer((uint8_t)channel, (uint16_t)minutes);

            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"relay_timer\",\"channel\":%d,\"minutes\":%d,\"success\":true}",
                s_cloudDeviceId, channel, minutes
            );
            s_cloudWs.sendTXT(ackMsg);
        } else {
            Serial.printf(">>> [CLOUD WS WARN] Invalid relay index for timer: %d\n", channel);
        }
        return;
    }

    // 5. Relay Configuration Command (Name & Wiring NO/NC)
    if (strcmp(cmd, "relay_config") == 0 || strcmp(cmd, "config_set") == 0) {
        int channel = getJsonInt(payload, "channel", -1);
        if (channel < 0) channel = getJsonInt(payload, "idx", -1);
        if (channel >= 0 && channel < RELAY_COUNT) {
            int wiring = getJsonInt(payload, "wiring", s_relayConfigs[channel].wiring);
            s_relayConfigs[channel].wiring = (uint8_t)wiring;
            char newName[24] = {0};
            if (getJsonStr(payload, "name", newName, sizeof(newName)) && strlen(newName) > 0) {
                strncpy(s_relayConfigs[channel].name, newName, sizeof(s_relayConfigs[channel].name) - 1);
                s_relayConfigs[channel].name[sizeof(s_relayConfigs[channel].name) - 1] = '\0';
            }

            Preferences prefs;
            prefs.begin("desk_cfg", false);
            char kWire[16], kName[16];
            snprintf(kWire, sizeof(kWire), "w_%d", channel);
            snprintf(kName, sizeof(kName), "n_%d", channel);
            prefs.putUChar(kWire, s_relayConfigs[channel].wiring);
            prefs.putString(kName, s_relayConfigs[channel].name);
            prefs.end();

            applyRelayPin((uint8_t)channel, s_relayLoads[channel], "Cloud Config Update");
            notifyRelayState();
            broadcastCloudState();
            Serial.printf(">>> [CLOUD WS] Saved Relay %d Config: Name='%s', Wiring=%s\n",
                          channel + 1, s_relayConfigs[channel].name, s_relayConfigs[channel].wiring ? "NC" : "NO");

            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"relay_config\",\"channel\":%d,\"success\":true}",
                s_cloudDeviceId, channel
            );
            s_cloudWs.sendTXT(ackMsg);
        }
        return;
    }

    // 6. LED Lighting Command
    if (strcmp(cmd, "led_set") == 0 || strcmp(cmd, "led") == 0) {
        s_ledMode = (uint8_t)getJsonInt(payload, "mode", s_ledMode);
        s_ledR    = (uint8_t)getJsonInt(payload, "r", s_ledR);
        s_ledG    = (uint8_t)getJsonInt(payload, "g", s_ledG);
        s_ledB    = (uint8_t)getJsonInt(payload, "b", s_ledB);
        s_ledBri  = (uint8_t)getJsonInt(payload, "bri", s_ledBri);
        s_ledSpd  = (uint8_t)getJsonInt(payload, "spd", s_ledSpd);
        saveLedStateToNVS();
        notifyLedState();
        broadcastCloudState();
        Serial.printf(">>> [CLOUD WS] LED Updated -> Mode=%d, RGB=(%d,%d,%d), Bri=%d, Spd=%d\n",
                      s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd);

        char ackMsg[128];
        snprintf(ackMsg, sizeof(ackMsg),
            "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"led_set\",\"success\":true}",
            s_cloudDeviceId
        );
        s_cloudWs.sendTXT(ackMsg);
        return;
    }

    // 7. Device Rename Command
    if (strcmp(cmd, "device_rename") == 0 || strcmp(cmd, "rename") == 0) {
        char newName[28] = {0};
        if (getJsonStr(payload, "name", newName, sizeof(newName)) && strlen(newName) > 0) {
            strncpy(s_deviceName, newName, sizeof(s_deviceName) - 1);
            s_deviceName[sizeof(s_deviceName) - 1] = '\0';
            Preferences prefs;
            prefs.begin("desk_cfg", false);
            prefs.putString("dev_name", s_deviceName);
            prefs.end();
            initBleServer(s_deviceName);
            broadcastCloudState();
            Serial.printf(">>> [CLOUD WS] Device Renamed to: '%s'\n", s_deviceName);

            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"device_rename\",\"name\":\"%s\",\"success\":true}",
                s_cloudDeviceId, s_deviceName
            );
            s_cloudWs.sendTXT(ackMsg);
        }
        return;
    }

    // 8. NeoPixel Primary Strip Dynamic Length Command
    if (strcmp(cmd, "strip_length") == 0 || strcmp(cmd, "strip") == 0) {
        int newLen = getJsonInt(payload, "length", s_stripLen);
        if (newLen >= 1 && newLen <= 800) {
            s_stripLen = (uint16_t)newLen;
            Preferences prefs;
            prefs.begin("desk_cfg", false);
            prefs.putUShort("strip_len", s_stripLen);
            prefs.end();
            s_strip.updateLength(s_stripLen);
            broadcastCloudState();
            Serial.printf(">>> [CLOUD WS] Strip Length set to %d LEDs\n", s_stripLen);

            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"strip_length\",\"length\":%d,\"success\":true}",
                s_cloudDeviceId, s_stripLen
            );
            s_cloudWs.sendTXT(ackMsg);
        }
        return;
    }

    // 9. 2D Matrix Mode, Text, Speed & Color Command
    if (strcmp(cmd, "matrix_set") == 0 || strcmp(cmd, "matrix") == 0) {
        s_matrixConfig.mode   = (uint8_t)getJsonInt(payload, "mode", s_matrixConfig.mode);
        s_matrixConfig.speed  = (uint8_t)getJsonInt(payload, "speed", s_matrixConfig.speed);
        s_matrixConfig.bri    = (uint8_t)getJsonInt(payload, "bri", s_matrixConfig.bri);
        s_matrixConfig.colorR = (uint8_t)getJsonInt(payload, "r", s_matrixConfig.colorR);
        s_matrixConfig.colorG = (uint8_t)getJsonInt(payload, "g", s_matrixConfig.colorG);
        s_matrixConfig.colorB = (uint8_t)getJsonInt(payload, "b", s_matrixConfig.colorB);
        char txt[64] = {0};
        if (getJsonStr(payload, "text", txt, sizeof(txt))) {
            strncpy(s_matrixConfig.text, txt, sizeof(s_matrixConfig.text) - 1);
            s_matrixConfig.text[sizeof(s_matrixConfig.text) - 1] = '\0';
        }
        saveMatrixConfigToNVS();
        notifyEnvState();
        broadcastCloudState();
        Serial.printf(">>> [CLOUD WS] Matrix display set: Mode=%d, Text='%s'\n", s_matrixConfig.mode, s_matrixConfig.text);

        char ackMsg[128];
        snprintf(ackMsg, sizeof(ackMsg),
            "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"matrix_set\",\"mode\":%d,\"success\":true}",
            s_cloudDeviceId, s_matrixConfig.mode
        );
        s_cloudWs.sendTXT(ackMsg);
        return;
    }

    // 10. Temperature Calibration Offset Command
    if (strcmp(cmd, "temp_offset") == 0 || strcmp(cmd, "cal_offset") == 0) {
        float offset = (float)getJsonInt(payload, "offset", 0);
        char offsetStr[16] = {0};
        if (getJsonStr(payload, "offset", offsetStr, sizeof(offsetStr))) {
            offset = atof(offsetStr);
        }
        setTempOffset(offset);
        broadcastCloudState();
        return;
    }

    // 11. Presence Configuration Command over Cloud WS
    if (strcmp(cmd, "presence_set") == 0 || strcmp(cmd, "presence_config") == 0) {
        if (strstr(payload, "\"enabled\":")) {
            s_presenceConfig.enabled = getJsonBool(payload, "enabled", s_presenceConfig.enabled);
        }
        int delay = getJsonInt(payload, "awayDelayMin", -1);
        if (delay < 0) delay = getJsonInt(payload, "delay", -1);
        if (delay > 0) s_presenceConfig.awayDelayMin = (uint16_t)delay;

        int awayMask = getJsonInt(payload, "awayRelayMask", -1);
        if (awayMask >= 0) s_presenceConfig.awayRelayMask = (uint8_t)awayMask;

        if (strstr(payload, "\"awayRgbOff\":")) {
            s_presenceConfig.awayRgbOff = getJsonBool(payload, "awayRgbOff", s_presenceConfig.awayRgbOff);
        }
        char masterName[24] = {0};
        if (getJsonStr(payload, "masterDevice", masterName, sizeof(masterName))) {
            strncpy(s_masterDeviceName, masterName, sizeof(s_masterDeviceName) - 1);
            s_masterDeviceName[sizeof(s_masterDeviceName) - 1] = '\0';
        }
        savePresenceConfigToNVS();
        Serial.printf(">>> [CLOUD WS] Presence configured: enabled=%d, awayDelay=%u min, master='%s'\n",
                      s_presenceConfig.enabled, s_presenceConfig.awayDelayMin, s_masterDeviceName);
        notifyEnvState();
        broadcastCloudState();
        return;
    }

    // 12. Set Master Device Command over Cloud WS
    if (strcmp(cmd, "set_master_device") == 0) {
        char masterName[24] = {0};
        if (getJsonStr(payload, "name", masterName, sizeof(masterName))) {
            strncpy(s_masterDeviceName, masterName, sizeof(s_masterDeviceName) - 1);
            s_masterDeviceName[sizeof(s_masterDeviceName) - 1] = '\0';
            savePresenceConfigToNVS();
            Serial.printf(">>> [CLOUD WS] Set Master Presence Device: '%s'\n", s_masterDeviceName);
            broadcastCloudState();
        }
        return;
    }

    // 5. State Request or Ping from Client
    if (strcmp(cmd, "request_state") == 0 || strcmp(cmd, "get_state") == 0 || strcmp(cmd, "ping") == 0) {
        Serial.println(">>> [CLOUD WS] State request/ping received from remote client. Broadcasting telemetry...");
        broadcastCloudState();
        return;
    }

    // 13. RGB Sleep Timer Command over Cloud WS
    if (strcmp(cmd, "rgb_timer") == 0 || strcmp(cmd, "set_rgb_timer") == 0) {
        int mins = getJsonInt(payload, "minutes", -1);
        if (mins < 0) mins = getJsonInt(payload, "min", 0);
        setRgbTimer((uint16_t)(mins > 0 ? mins : 0));
        return;
    }

    // 14. Matrix Hardware Config Command over Cloud WS
    if (strcmp(cmd, "matrix_config") == 0) {
        int rows = getJsonInt(payload, "rows", s_matrixConfig.rows);
        int cols = getJsonInt(payload, "cols", s_matrixConfig.cols);
        if (rows > 0 && cols > 0 && ((uint32_t)rows * (uint32_t)cols) <= MAX_MATRIX_LEDS) {
            s_matrixConfig.rows = (uint16_t)rows;
            s_matrixConfig.cols = (uint16_t)cols;
        }
        int wiring = getJsonInt(payload, "wiringType", -1);
        if (wiring >= 0) s_matrixConfig.wiringType = (uint8_t)wiring;
        int pin = getJsonInt(payload, "pin", -1);
        if (pin > 0 && isSafeMatrixPin((uint8_t)pin)) s_matrixConfig.pin = (uint8_t)pin;
        if (strstr(payload, "\"enabled\":")) {
            s_matrixConfig.enabled = getJsonBool(payload, "enabled", s_matrixConfig.enabled);
        }
        saveMatrixConfigToNVS();
        initMatrixHardware();
        notifyEnvState();
        broadcastCloudState();
        return;
    }

    // 15. Master Buzzer Command over Cloud WS
    if (strcmp(cmd, "buzzer_set") == 0 || strcmp(cmd, "set_buzzer") == 0) {
        if (strstr(payload, "\"enabled\":")) {
            s_buzzerMasterEnabled = getJsonBool(payload, "enabled", s_buzzerMasterEnabled);
            Preferences prefs;
            prefs.begin("desk_cfg", false);
            prefs.putBool("bz_master", s_buzzerMasterEnabled);
            prefs.end();
            notifyEnvState();
            broadcastCloudState();
        }
        return;
    }
    if (strcmp(cmd, "buzzer_beep") == 0 || strcmp(cmd, "test_buzzer") == 0) {
        buzzerBeepTimerEnd();
        return;
    }

    // 16. Schedule Save / Update Command over Cloud WS
    if (strcmp(cmd, "schedule_set") == 0 || strcmp(cmd, "set_schedule") == 0) {
        int id = getJsonInt(payload, "id", -1);
        if (id >= 0 && id < MAX_SCHEDULES) {
            if (strstr(payload, "\"enabled\":")) {
                s_schedules[id].enabled = getJsonBool(payload, "enabled", s_schedules[id].enabled);
            }
            s_schedules[id].daysMask     = (uint8_t)getJsonInt(payload, "daysMask", s_schedules[id].daysMask);
            s_schedules[id].startHour    = (uint8_t)getJsonInt(payload, "startHour", s_schedules[id].startHour);
            s_schedules[id].startMin     = (uint8_t)getJsonInt(payload, "startMin", s_schedules[id].startMin);
            s_schedules[id].stopType     = (uint8_t)getJsonInt(payload, "stopType", s_schedules[id].stopType);
            s_schedules[id].durationMin  = (uint16_t)getJsonInt(payload, "durationMin", s_schedules[id].durationMin);
            s_schedules[id].stopHour     = (uint8_t)getJsonInt(payload, "stopHour", s_schedules[id].stopHour);
            s_schedules[id].stopMin      = (uint8_t)getJsonInt(payload, "stopMin", s_schedules[id].stopMin);
            s_schedules[id].targetType   = (uint8_t)getJsonInt(payload, "targetType", s_schedules[id].targetType);
            s_schedules[id].targetAction = (uint8_t)getJsonInt(payload, "targetAction", s_schedules[id].targetAction);

            int rMask = getJsonInt(payload, "relayMask", -1);
            if (rMask >= 0) {
                s_schedules[id].relayMask = (uint8_t)rMask;
            } else if (s_schedules[id].targetType < RELAY_COUNT) {
                s_schedules[id].relayMask = (1 << s_schedules[id].targetType);
            } else if (s_schedules[id].targetType == 4) {
                s_schedules[id].relayMask = 0x0F;
            }

            if (strstr(payload, "\"ledTarget\":")) {
                s_schedules[id].ledTarget = getJsonBool(payload, "ledTarget", s_schedules[id].ledTarget);
            } else if (s_schedules[id].targetType == 5) {
                s_schedules[id].ledTarget = true;
            }

            s_schedules[id].rgbR   = (uint8_t)getJsonInt(payload, "rgbR", s_schedules[id].rgbR);
            s_schedules[id].rgbG   = (uint8_t)getJsonInt(payload, "rgbG", s_schedules[id].rgbG);
            s_schedules[id].rgbB   = (uint8_t)getJsonInt(payload, "rgbB", s_schedules[id].rgbB);
            s_schedules[id].rgbBri = (uint8_t)getJsonInt(payload, "rgbBri", s_schedules[id].rgbBri);
            s_schedules[id].lastFiredDayMinute = 0xFFFF;

            saveScheduleRuleToNVS((uint8_t)id);
            broadcastCloudState();
            Serial.printf(">>> [CLOUD WS] Saved Schedule Rule %d (En=%d, Days=0x%02X, Start=%02d:%02d, Relays=0x%02X, LED=%d, Act=%d)\n",
                          id + 1, s_schedules[id].enabled, s_schedules[id].daysMask,
                          s_schedules[id].startHour, s_schedules[id].startMin,
                          s_schedules[id].relayMask, s_schedules[id].ledTarget ? 1 : 0, s_schedules[id].targetAction);

            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"schedule_set\",\"id\":%d,\"success\":true}",
                s_cloudDeviceId, id
            );
            s_cloudWs.sendTXT(ackMsg);
        }
        return;
    }

    // 17. Schedule Delete / Disable Command over Cloud WS
    if (strcmp(cmd, "schedule_delete") == 0 || strcmp(cmd, "delete_schedule") == 0) {
        int id = getJsonInt(payload, "id", -1);
        if (id >= 0 && id < MAX_SCHEDULES) {
            s_schedules[id].enabled = false;
            saveScheduleRuleToNVS((uint8_t)id);
            broadcastCloudState();
            Serial.printf(">>> [CLOUD WS] Disabled Schedule Rule %d\n", id + 1);

            char ackMsg[128];
            snprintf(ackMsg, sizeof(ackMsg),
                "{\"type\":\"ack\",\"deviceId\":\"%s\",\"action\":\"schedule_delete\",\"id\":%d,\"success\":true}",
                s_cloudDeviceId, id
            );
            s_cloudWs.sendTXT(ackMsg);
        }
        return;
    }

    // 18. Schedule Test Command over Cloud WS
    if (strcmp(cmd, "schedule_test") == 0 || strcmp(cmd, "test_schedule") == 0) {
        int id = getJsonInt(payload, "id", -1);
        bool isStart = true;
        if (strstr(payload, "\"isStart\":")) {
            isStart = getJsonBool(payload, "isStart", true);
        }
        if (id >= 0 && id < MAX_SCHEDULES) {
            uint8_t act = isStart ? s_schedules[id].targetAction : ((s_schedules[id].targetAction == 1) ? 0 : 1);
            executeScheduleAction((uint8_t)id, act);
            Serial.printf(">>> [CLOUD WS] Tested Schedule Rule %d (Start=%d)\n", id + 1, isStart ? 1 : 0);
        }
        return;
    }

    // 19. Time Sync Command over Cloud WS
    if (strcmp(cmd, "time_sync") == 0 || strcmp(cmd, "sync_time") == 0) {
        int h = getJsonInt(payload, "h", -1);
        int m = getJsonInt(payload, "m", -1);
        int s = getJsonInt(payload, "s", 0);
        int dow = getJsonInt(payload, "dow", -1);
        if (h >= 0 && m >= 0 && dow >= 0) {
            s_timeSync.synced = true;
            s_timeSync.baseLocalSec = ((uint32_t)dow * 86400UL) + ((uint32_t)h * 3600UL) + ((uint32_t)m * 60UL) + s;
            s_timeSync.syncMillis = millis();
            saveTimeBaseToNVS();
            notifyEnvState();
            Serial.printf(">>> [CLOUD WS] Clock synchronized: %02d:%02d:%02d (DOW=%d)\n", h, m, s, dow);
            broadcastCloudState();
        }
        return;
    }

    // 20. Live Music Sync Frame over Cloud WS
    if (strcmp(cmd, "music_frame") == 0 || strcmp(cmd, "music_sync") == 0) {
        s_ledMode = 16;
        s_musicBri = (uint8_t)getJsonInt(payload, "bri", s_musicBri);
        uint8_t newSub = (uint8_t)getJsonInt(payload, "sub", s_musicSubMode);
        if (newSub != s_musicSubMode) {
            s_musicSubMode = newSub;
            saveLedStateToNVS();
        }
        s_musicBeatVal = (uint8_t)getJsonInt(payload, "beat", 0);
        s_musicColorR  = (uint8_t)getJsonInt(payload, "r", s_ledR);
        s_musicColorG  = (uint8_t)getJsonInt(payload, "g", s_ledG);
        s_musicColorB  = (uint8_t)getJsonInt(payload, "b", s_ledB);
        for (int i = 0; i < 8; i++) {
            char bKey[8];
            snprintf(bKey, sizeof(bKey), "b%d", i);
            s_musicLevels[i] = (uint8_t)getJsonInt(payload, bKey, s_musicBeatVal);
        }
        return;
    }

    // 21. Live Hardware State Request from Cloud Web Client
    if (strcmp(cmd, "request_state") == 0 || strcmp(cmd, "get_state") == 0 || strcmp(cmd, "ping") == 0) {
        Serial.println(">>> [CLOUD WS] Client requested hardware state -> broadcasting live state...");
        broadcastCloudState();
        return;
    }
}

/* ── WebSocket Event Dispatcher ──────────────────────────────────────────── */
static void onCloudWsEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            s_cloudConnected     = false;
            s_cloudAuthenticated = false;
            s_cloudWsStarted     = false;
            s_lastWsDisconnectMs = millis();
            if (s_wsReconnectAttempts == 0) s_wsReconnectIntervalMs = 5000;
            else if (s_wsReconnectAttempts == 1) s_wsReconnectIntervalMs = 12000;
            else if (s_wsReconnectAttempts == 2) s_wsReconnectIntervalMs = 25000;
            else if (s_wsReconnectAttempts == 3) s_wsReconnectIntervalMs = 40000;
            else s_wsReconnectIntervalMs = 60000;
            s_wsReconnectAttempts++;
            Serial.printf(">>> [CLOUD WS] Disconnected from cloud relay. Server may be spinning up (Render cold boot). Retrying in %lus (attempt %d)...\n",
                          s_wsReconnectIntervalMs / 1000UL, s_wsReconnectAttempts);
            break;

        case WStype_CONNECTED: {
            s_cloudConnected     = true;
            s_cloudAuthenticated = false;
            Serial.printf(">>> [CLOUD WS] Connected to %s:%d! Sending auth handshake...\n", s_cloudHost, s_cloudPort);
            
            // Increased buffer to 512 to prevent JSON truncation
            char authMsg[512];
            snprintf(authMsg, sizeof(authMsg),
                "{\"type\":\"auth\",\"role\":\"device\",\"deviceId\":\"%s\",\"deviceKey\":\"%s\",\"userId\":\"%s\",\"password\":\"%s\"}",
                s_cloudDeviceId, s_cloudDeviceKey, s_cloudUser, s_cloudPassword
            );
            s_cloudWs.sendTXT(authMsg);
            break;
        }

        case WStype_TEXT:
            handleCloudMessage((const char*)payload, length);
            break;

        case WStype_PONG:
            break;

        case WStype_ERROR:
            Serial.println(">>> [CLOUD WS ERROR] WebSocket transport error.");
            break;

        default:
            break;
    }
}


/* ── Cloud Client Lifecycle ──────────────────────────────────────────────── */
static void startCloudClient() {
    if (s_cloudWsStarted && s_cloudConnected) return;

    // Fully reset socket state between attempts
    s_cloudWs.disconnect();

    bool isSsl = (s_cloudPort == 443 || strstr(s_cloudHost, ".onrender.com") != NULL || strstr(s_cloudHost, ".vercel.app") != NULL);
    Serial.printf(">>> [CLOUD WS] Initializing WebSocket client -> %s://%s:%d%s\n",
                  isSsl ? "wss" : "ws", s_cloudHost, s_cloudPort, DEFAULT_CLOUD_PATH);

    // Disable internal library reconnect timer so our exponential backoff state machine has full control
    s_cloudWs.setReconnectInterval(0);

    // Set standard HTTP Host header for Cloudflare/Render reverse proxies
    char hostHeader[80];
    snprintf(hostHeader, sizeof(hostHeader), "Host: %s", s_cloudHost);
    s_cloudWs.setExtraHeaders(hostHeader);

    if (isSsl) {
        // Begin SSL without forcing subprotocol, allowing standard upgrade handshake
        s_cloudWs.beginSSL(s_cloudHost, s_cloudPort, DEFAULT_CLOUD_PATH, "");
    } else {
        s_cloudWs.begin(s_cloudHost, s_cloudPort, DEFAULT_CLOUD_PATH, "");
    }

    s_cloudWs.onEvent(onCloudWsEvent);
    s_cloudWs.enableHeartbeat(15000, 4000, 2);
    s_cloudWsStarted = true;
}

static void stopCloudClient() {
    if (s_cloudWsStarted) {
        s_cloudWs.disconnect();
        s_cloudConnected     = false;
        s_cloudAuthenticated = false;
        s_cloudWsStarted     = false;
        Serial.println(">>> [CLOUD WS] WebSocket client stopped.");
    }
}

static void updateCloudClient() {
    s_cloudWs.loop();
}

/* ── Local Cloud Credential Application & Live Re-Authentication ─────────── */
static inline void applyAndRestartCloudCredentials(const char* newDevId, const char* newUser, const char* newPass, const char* newDevName) {
    if (newDevName && strlen(newDevName) > 0) {
        strncpy(s_deviceName, newDevName, sizeof(s_deviceName) - 1);
        s_deviceName[sizeof(s_deviceName) - 1] = '\0';
        Preferences prefs;
        prefs.begin("desk_cfg", false);
        prefs.putString("dev_name", s_deviceName);
        prefs.end();
        // Do NOT call initBleServer() here as reinitializing BLE wipes active GATT client sessions
    }

    if (newDevId || newUser || newPass) {
        saveCloudConfigToNVS(NULL, 0, newDevId, NULL, newUser, newPass);
        Serial.printf(">>> [CLOUD CREDENTIALS] Assigned via local security interface (DevId: %s, User: %s, Desk: %s)\n",
                      s_cloudDeviceId, s_cloudUser, s_deviceName);

        // Disconnect existing socket and force immediate restart with new credentials
        stopCloudClient();
        startCloudClient();
    }
}

/* ── Status & Telemetry Accessors ────────────────────────────────────────── */
inline bool isCloudWsConnected() {
    return s_cloudConnected && s_cloudAuthenticated;
}

inline const char* getCloudDeviceId() {
    return s_cloudDeviceId;
}

inline const char* getCloudUser() {
    return s_cloudUser;
}

#endif // SMARTDESK_CLOUD_H
