/**
 * smartdesk.ino — SmartDesk V2 Firmware (ESP32-S3)
 *
 * Core controller logic, dynamic strip allocation, 2D matrix engine,
 * opto-isolated relay driver, DHT11 environmental sensor, buzzer, and scheduler.
 *
 * Modular Architecture:
 * - smartdesk_pins.h : Pin definitions, UUIDs, hardware ceilings
 * - matrix_engine.h  : 2D Matrix display engine (XY mapping, font, Modes 17, 18, 19)
 * - smartdesk_ble.h   : NimBLE GATT server, HID auto-connect, callbacks & notifications
 */

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>

#include "smartdesk_pins.h"
#include "matrix_engine.h"

/* ── Relay Configuration Structure ───────────────────────────────────────── */
struct RelayConfig {
    uint8_t wiring;          // 0 = Normally Open (NO), 1 = Normally Closed (NC)
    uint8_t onAnimEnabled;   // 0 = Disabled, 1 = Enabled
    uint8_t onAnimMode;      // 1..10
    uint8_t onAnimDuration;  // 1..10 seconds
    uint8_t offAnimEnabled;  // 0 = Disabled, 1 = Enabled
    uint8_t offAnimMode;     // 1..10
    uint8_t offAnimDuration; // 1..10 seconds
    char    name[17];        // Up to 16 chars + null terminator
};

/* ── Global Application State ────────────────────────────────────────────── */
char        s_deviceName[25]            = DEFAULT_DEVICE_NAME;
RelayConfig s_relayConfigs[RELAY_COUNT];
uint8_t     s_relayLoads[RELAY_COUNT]   = {0, 0, 0, 0}; // 0 = OFF, 1 = ON
uint32_t    s_lastSwitchMs[RELAY_COUNT] = {0, 0, 0, 0};
uint32_t    s_timerEndMs[RELAY_COUNT]   = {0, 0, 0, 0}; // 0 = no timer
bool        s_connected                 = false;

// Strip Dynamic Length & Strip Instance
static uint16_t          s_stripLen = DEFAULT_STRIP_LEN; // Dynamic up to 800 LEDs
static Adafruit_NeoPixel s_strip(DEFAULT_STRIP_LEN, LED_PIN, NEO_GRB + NEO_KHZ800);
static Preferences       s_prefs;

// LED State (Modes 0..15)
uint8_t s_ledMode = 1;    // 0=off, 1=solid, 2=breathe, 3=rainbow, etc.
uint8_t s_ledR    = 0;
uint8_t s_ledG    = 180;
uint8_t s_ledB    = 255;
uint8_t s_ledBri  = 100;  // 0..100% (mapped to 0..255 uncapped)
uint8_t s_ledSpd  = 5;    // 1..10

// Dedicated Music Sync State (Independent brightness cap & 10 Disco Styles)
static uint8_t s_musicBri       = 100;
static uint8_t s_musicSubMode   = 0;    // 0..9 for the 10 Disco Styles
uint8_t s_musicBeatVal   = 0;    // 0..255 beat/bass kick energy
static uint8_t s_musicColorR    = 0;
static uint8_t s_musicColorG    = 180;
static uint8_t s_musicColorB    = 255;
uint8_t s_musicLevels[8] = {0, 0, 0, 0, 0, 0, 0, 0};

// Transient Relay Switch Animation State
static bool     s_animActive     = false;
static uint32_t s_animStartMs    = 0;
static uint32_t s_animDurationMs = 2000;
static uint8_t  s_animMode       = 1;
static bool     s_animIsOn       = false;

static uint8_t  s_savedLedMode   = 1;
static uint8_t  s_savedLedR      = 0;
static uint8_t  s_savedLedG      = 180;
static uint8_t  s_savedLedB      = 255;
static uint8_t  s_savedLedBri    = 100;
static uint8_t  s_savedLedSpd    = 5;

// DHT11 Environmental State
static float    s_tempC         = 0.0f;
static float    s_humidity      = 0.0f;
static bool     s_sensorValid   = false;
static uint32_t s_lastDhtReadMs = 0;

// Active Buzzer Driver (Big Buzzer B27 on GPIO 10)
static bool s_buzzerMasterEnabled = true;

struct RelayBuzzerConfig {
    bool beepOn;
    bool beepOff;
    bool beepTimerEnd;
};
static RelayBuzzerConfig s_buzzerConfigs[RELAY_COUNT] = {
    { true, true, true },
    { true, true, true },
    { true, true, true },
    { true, true, true }
};

struct ActiveBuzzer {
    bool     active;
    uint32_t endTimeMs;
    uint16_t pulseOnMs;
    uint16_t pulseOffMs;
    uint8_t  repeatCount;
    uint32_t nextToggleMs;
    bool     pinHigh;
};
static ActiveBuzzer s_activeBuzzer = { false, 0, 0, 0, 0, 0, false };

static inline void triggerBuzzerPattern(uint16_t onMs, uint16_t offMs, uint8_t repeats) {
    if (!s_buzzerMasterEnabled) return;
    s_activeBuzzer.active       = true;
    s_activeBuzzer.pulseOnMs    = onMs;
    s_activeBuzzer.pulseOffMs   = offMs;
    s_activeBuzzer.repeatCount  = repeats;
    s_activeBuzzer.pinHigh      = true;
    digitalWrite(BUZZER_PIN, HIGH);
    s_activeBuzzer.nextToggleMs = millis() + onMs;
    s_activeBuzzer.endTimeMs    = millis() + (repeats * (onMs + offMs));
}

static inline void buzzerBeepRelayOn()   { triggerBuzzerPattern(50, 40, 1); }
static inline void buzzerBeepRelayOff()  { triggerBuzzerPattern(35, 40, 2); }
static inline void buzzerBeepTimerEnd()  { triggerBuzzerPattern(120, 100, 3); }

static void updateActiveBuzzer(uint32_t now) {
    if (!s_activeBuzzer.active) return;
    if (now >= s_activeBuzzer.endTimeMs) {
        s_activeBuzzer.active = false;
        digitalWrite(BUZZER_PIN, LOW);
        return;
    }
    if (now >= s_activeBuzzer.nextToggleMs) {
        s_activeBuzzer.pinHigh = !s_activeBuzzer.pinHigh;
        digitalWrite(BUZZER_PIN, s_activeBuzzer.pinHigh ? HIGH : LOW);
        uint16_t dur = s_activeBuzzer.pinHigh ? s_activeBuzzer.pulseOnMs : s_activeBuzzer.pulseOffMs;
        s_activeBuzzer.nextToggleMs = now + dur;
    }
}

// DHT11 Bit-Bang Read
static bool readDHT11(float* outTemp, float* outHum) {
    uint8_t data[5] = {0, 0, 0, 0, 0};
    pinMode(DHT_PIN, OUTPUT);
    digitalWrite(DHT_PIN, LOW);
    delay(20);
    digitalWrite(DHT_PIN, HIGH);
    delayMicroseconds(30);
    pinMode(DHT_PIN, INPUT_PULLUP);

    uint32_t timeout = micros();
    while (digitalRead(DHT_PIN) == HIGH) { if (micros() - timeout > 100) return false; }
    timeout = micros();
    while (digitalRead(DHT_PIN) == LOW)  { if (micros() - timeout > 100) return false; }
    timeout = micros();
    while (digitalRead(DHT_PIN) == HIGH) { if (micros() - timeout > 100) return false; }

    for (int i = 0; i < 40; i++) {
        timeout = micros();
        while (digitalRead(DHT_PIN) == LOW) { if (micros() - timeout > 100) return false; }
        uint32_t startHigh = micros();
        while (digitalRead(DHT_PIN) == HIGH) { if (micros() - startHigh > 120) return false; }
        if (micros() - startHigh > 40) {
            data[i / 8] |= (1 << (7 - (i % 8)));
        }
    }
    uint8_t sum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
    if (data[4] != sum) return false;
    *outHum  = (float)data[0] + ((float)data[1] * 0.1f);
    *outTemp = (float)data[2] + ((float)data[3] * 0.1f);
    return true;
}

// Presence Configuration & Stored Clients
#define MAX_PAIRED_CLIENTS 10
struct PairedClient {
    bool valid;
    char addr[18];
    char name[20];
    bool trackPresence;
};

struct PresenceConfig {
    bool     enabled;
    uint16_t awayDelayMin;
    uint8_t  awayRelayMask;
    bool     awayRgbOff;
    uint8_t  arrivalRelayMask;
    bool     arrivalRgbOn;
    uint8_t  arrivalRgbMode;
};

static PresenceConfig s_presenceConfig = {
    false,  // Inactive by default
    5,
    0x0F,
    true,
    0x0F,
    true,
    1
};

static PairedClient s_knownClients[MAX_PAIRED_CLIENTS];
static uint32_t     s_awayTimerEndMs = 0;
static bool         s_isAwayTriggered = false;
static char         s_connectedClientName[24] = "Unknown Device";

// Time Sync (Browser Real Time)
struct TimeSync {
    bool     synced;
    uint32_t baseLocalSec;
    uint32_t syncMillis;
};
static TimeSync s_timeSync = { false, 0, 0 };

static void getLocalTime(uint8_t* outH, uint8_t* outM, uint8_t* outS, uint8_t* outDOW) {
    if (!s_timeSync.synced) {
        *outH = 0; *outM = 0; *outS = 0; *outDOW = 0;
        return;
    }
    uint32_t elapsedSec = (millis() - s_timeSync.syncMillis) / 1000UL;
    uint32_t curSec = (s_timeSync.baseLocalSec + elapsedSec) % (7UL * 86400UL);
    *outDOW = (uint8_t)(curSec / 86400UL);
    uint32_t secOfDay = curSec % 86400UL;
    *outH = (uint8_t)(secOfDay / 3600UL);
    *outM = (uint8_t)((secOfDay % 3600UL) / 60UL);
    *outS = (uint8_t)(secOfDay % 60UL);
}

// Schedules (8 Rules)
#define MAX_SCHEDULES 8
struct ScheduleRule {
    bool     enabled;
    uint8_t  daysMask;
    uint8_t  startHour;
    uint8_t  startMin;
    uint8_t  stopType;
    uint16_t durationMin;
    uint8_t  stopHour;
    uint8_t  stopMin;
    uint8_t  targetType;
    uint8_t  targetAction;
    uint8_t  rgbR;
    uint8_t  rgbG;
    uint8_t  rgbB;
    uint8_t  rgbBri;
    uint16_t lastFiredDayMinute;
};
static ScheduleRule s_schedules[MAX_SCHEDULES];

/* ── Include BLE Plumbing ────────────────────────────────────────────────── */
#include "smartdesk_ble.h"

/* ── Payload Builders for BLE ────────────────────────────────────────────── */
void buildRelayPayload(uint8_t* out12) {
    for (int i = 0; i < RELAY_COUNT; i++) out12[i] = s_relayLoads[i];
    uint32_t now = millis();
    for (int i = 0; i < RELAY_COUNT; i++) {
        uint16_t remMin = 0;
        if (s_timerEndMs[i] > 0 && s_relayLoads[i] != 0) {
            if (now < s_timerEndMs[i]) {
                remMin = (uint16_t)(((s_timerEndMs[i] - now) + 59999UL) / 60000UL);
            }
        }
        out12[4 + i * 2]     = (uint8_t)(remMin & 0xFF);
        out12[4 + i * 2 + 1] = (uint8_t)((remMin >> 8) & 0xFF);
    }
}

void buildConfigPayload(uint8_t* payload, size_t maxLen) {
    if (!payload || maxLen < 335) return;
    for (int i = 0; i < RELAY_COUNT; i++) {
        int off = i * 25;
        payload[off + 0] = (uint8_t)i;
        payload[off + 1] = s_relayConfigs[i].wiring;
        payload[off + 2] = s_relayConfigs[i].onAnimEnabled;
        payload[off + 3] = s_relayConfigs[i].onAnimMode;
        payload[off + 4] = s_relayConfigs[i].onAnimDuration;
        payload[off + 5] = s_relayConfigs[i].offAnimEnabled;
        payload[off + 6] = s_relayConfigs[i].offAnimMode;
        payload[off + 7] = s_relayConfigs[i].offAnimDuration;
        size_t nlen = strlen(s_relayConfigs[i].name);
        if (nlen > 16) nlen = 16;
        payload[off + 8] = (uint8_t)nlen;
        memcpy(&payload[off + 9], s_relayConfigs[i].name, nlen);
    }
    size_t dlen = strlen(s_deviceName);
    if (dlen > 20) dlen = 20;
    payload[100] = (uint8_t)dlen;
    memcpy(&payload[101], s_deviceName, dlen);

    payload[125] = s_presenceConfig.enabled ? 1 : 0;
    payload[126] = s_presenceConfig.awayDelayMin & 0xFF;
    payload[127] = (s_presenceConfig.awayDelayMin >> 8) & 0xFF;
    payload[128] = s_presenceConfig.awayRelayMask;
    payload[129] = s_presenceConfig.awayRgbOff ? 1 : 0;
    payload[130] = s_presenceConfig.arrivalRelayMask;
    payload[131] = s_presenceConfig.arrivalRgbOn ? 1 : 0;
    payload[132] = s_presenceConfig.arrivalRgbMode;

    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
        int off = 135 + i * 20;
        payload[off + 0] = s_knownClients[i].valid ? 1 : 0;
        payload[off + 1] = s_knownClients[i].trackPresence ? 1 : 0;
        size_t nlen = strlen(s_knownClients[i].name);
        if (nlen > 17) nlen = 17;
        payload[off + 2] = (uint8_t)nlen;
        memcpy(&payload[off + 3], s_knownClients[i].name, nlen);
    }
}

void buildEnvPayload(uint8_t* out24) {
    if (!out24) return;
    memset(out24, 0, 24);
    out24[0] = s_sensorValid ? 1 : 0;
    int16_t t10 = (int16_t)(s_tempC * 10.0f);
    out24[1] = (uint8_t)(t10 / 10);
    out24[2] = (uint8_t)(abs(t10) % 10);
    int16_t h10 = (int16_t)(s_humidity * 10.0f);
    out24[3] = (uint8_t)(h10 / 10);
    out24[4] = (uint8_t)(abs(h10) % 10);
    out24[5] = s_buzzerMasterEnabled ? 1 : 0;
    out24[6] = s_timeSync.synced ? 1 : 0;
    uint8_t curH = 0, curM = 0, curS = 0, curDOW = 0;
    getLocalTime(&curH, &curM, &curS, &curDOW);
    out24[7] = curH;
    out24[8] = curM;
    out24[9] = curS;
    out24[10] = curDOW;

    out24[11] = s_presenceConfig.enabled ? 1 : 0;
    uint8_t presState = 0;
    uint8_t remMin = 0;
    if (s_connected) {
        presState = 1;
    } else if (s_awayTimerEndMs > 0) {
        presState = 2;
        long remMs = (long)(s_awayTimerEndMs - millis());
        remMin = (remMs > 0) ? (uint8_t)((remMs + 59999UL) / 60000UL) : 0;
    }
    out24[12] = presState;
    out24[13] = remMin;

    // Bytes 14..15: Strip Length (uint16 little-endian)
    out24[14] = (uint8_t)(s_stripLen & 0xFF);
    out24[15] = (uint8_t)((s_stripLen >> 8) & 0xFF);

    // Bytes 16..23: 2D Matrix Configuration
    out24[16] = (uint8_t)(s_matrixConfig.rows & 0xFF);
    out24[17] = (uint8_t)((s_matrixConfig.rows >> 8) & 0xFF);
    out24[18] = (uint8_t)(s_matrixConfig.cols & 0xFF);
    out24[19] = (uint8_t)((s_matrixConfig.cols >> 8) & 0xFF);
    out24[20] = s_matrixConfig.wiringType;
    out24[21] = s_matrixConfig.pin;
    out24[22] = s_matrixConfig.enabled ? 1 : 0;
    out24[23] = s_matrixConfig.mode;
}

/* ── Relay Hardware & Safety Control ─────────────────────────────────────── */
static void applyRelayPin(uint8_t idx, uint8_t load, const char* reason) {
    if (idx >= RELAY_COUNT) return;
    uint8_t coilLevel = (s_relayConfigs[idx].wiring == 1) ? (load ? 0 : 1) : (load ? 1 : 0);
    uint8_t pinLevel  = (coilLevel == 1) ? LOW : HIGH;
    digitalWrite(RELAY_PINS[idx], pinLevel);
    s_relayLoads[idx] = load;
    s_lastSwitchMs[idx] = millis();
    Serial.printf(">>> [RELAY %d] Load=%d Wiring=%s -> Coil=%d Pin=%s (GPIO %d) [%s]\n",
                  idx + 1, load, (s_relayConfigs[idx].wiring == 1) ? "NC" : "NO",
                  coilLevel, (pinLevel == LOW) ? "LOW" : "HIGH", RELAY_PINS[idx], reason);
}

static void triggerRelayAnimation(uint8_t idx, bool turningOn, uint8_t mode, uint8_t durationSec) {
    (void)idx;
    s_animActive     = true;
    s_animStartMs    = millis();
    s_animDurationMs = (durationSec < 1) ? 1000 : (uint32_t)durationSec * 1000UL;
    s_animMode       = (mode < 1 || mode > 10) ? 1 : mode;
    s_animIsOn       = turningOn;
}

static void setRelayLoad(uint8_t idx, uint8_t load, const char* source) {
    if (idx >= RELAY_COUNT) return;
    load = (load != 0) ? 1 : 0;
    uint32_t now = millis();
    if (now - s_lastSwitchMs[idx] < MIN_SWITCH_MS) return;

    uint8_t prevLoad = s_relayLoads[idx];
    applyRelayPin(idx, load, source);
    notifyRelayState();

    if (prevLoad != s_relayLoads[idx]) {
        if (s_relayLoads[idx] != 0 && s_buzzerConfigs[idx].beepOn) buzzerBeepRelayOn();
        else if (s_relayLoads[idx] == 0 && s_buzzerConfigs[idx].beepOff) buzzerBeepRelayOff();

        if (s_relayLoads[idx] != 0 && s_relayConfigs[idx].onAnimEnabled) {
            triggerRelayAnimation(idx, true, s_relayConfigs[idx].onAnimMode, s_relayConfigs[idx].onAnimDuration);
        } else if (s_relayLoads[idx] == 0 && s_relayConfigs[idx].offAnimEnabled) {
            triggerRelayAnimation(idx, false, s_relayConfigs[idx].offAnimMode, s_relayConfigs[idx].offAnimDuration);
        }
    }
}

static void setRelayTimer(uint8_t idx, uint16_t mins) {
    if (idx >= RELAY_COUNT) return;
    if (mins == 0) {
        s_timerEndMs[idx] = 0;
    } else {
        s_timerEndMs[idx] = millis() + ((uint32_t)mins * 60000UL);
        if (s_relayLoads[idx] == 0) setRelayLoad(idx, 1, "Timer Start");
    }
    notifyRelayState();
}

static void allRelaysOff(const char* source) {
    for (int i = 0; i < RELAY_COUNT; i++) {
        s_timerEndMs[i] = 0;
        setRelayLoad(i, 0, source);
    }
}

/* ── NVS Configurations Storage ─────────────────────────────────────────── */
static void loadConfigsFromNVS() {
    s_prefs.begin("desk_cfg", false);
    String savedName = s_prefs.getString("dev_name", DEFAULT_DEVICE_NAME);
    strncpy(s_deviceName, savedName.c_str(), sizeof(s_deviceName) - 1);
    s_buzzerMasterEnabled = s_prefs.getBool("bz_master", true);

    // Strip Length from NVS
    s_stripLen = s_prefs.getUShort("strip_len", DEFAULT_STRIP_LEN);
    if (s_stripLen < 1 || s_stripLen > MAX_STRIP_LEDS) s_stripLen = DEFAULT_STRIP_LEN;

    for (int i = 0; i < RELAY_COUNT; i++) {
        char kWire[16], kOnEn[16], kOnMd[16], kOnDu[16], kOffEn[16], kOffMd[16], kOffDu[16], kName[16];
        snprintf(kWire, sizeof(kWire), "w_%d", i);
        snprintf(kOnEn, sizeof(kOnEn), "on_en_%d", i);
        snprintf(kOnMd, sizeof(kOnMd), "on_md_%d", i);
        snprintf(kOnDu, sizeof(kOnDu), "on_du_%d", i);
        snprintf(kOffEn, sizeof(kOffEn), "of_en_%d", i);
        snprintf(kOffMd, sizeof(kOffMd), "of_md_%d", i);
        snprintf(kOffDu, sizeof(kOffDu), "of_du_%d", i);
        snprintf(kName, sizeof(kName), "n_%d", i);

        s_relayConfigs[i].wiring          = s_prefs.getUChar(kWire, 0);
        s_relayConfigs[i].onAnimEnabled   = s_prefs.getUChar(kOnEn, 1);
        s_relayConfigs[i].onAnimMode      = s_prefs.getUChar(kOnMd, 1);
        s_relayConfigs[i].onAnimDuration  = s_prefs.getUChar(kOnDu, 2);
        s_relayConfigs[i].offAnimEnabled  = s_prefs.getUChar(kOffEn, 1);
        s_relayConfigs[i].offAnimMode     = s_prefs.getUChar(kOffMd, 3);
        s_relayConfigs[i].offAnimDuration = s_prefs.getUChar(kOffDu, 2);

        String defName = "Relay " + String(i + 1);
        String savedRelayName = s_prefs.getString(kName, defName.c_str());
        strncpy(s_relayConfigs[i].name, savedRelayName.c_str(), sizeof(s_relayConfigs[i].name) - 1);
    }
    s_prefs.end();
}

static void loadPresenceFromNVS() {
    s_prefs.begin("desk_pres", true);
    s_presenceConfig.enabled          = s_prefs.getBool("en", false); // Default false
    s_presenceConfig.awayDelayMin     = s_prefs.getUShort("delay", 5);
    s_presenceConfig.awayRelayMask    = s_prefs.getUChar("away_mask", 0x0F);
    s_presenceConfig.awayRgbOff       = s_prefs.getBool("away_rgb", true);
    s_presenceConfig.arrivalRelayMask = s_prefs.getUChar("arr_mask", 0x0F);
    s_presenceConfig.arrivalRgbOn     = s_prefs.getBool("arr_rgb", true);
    s_presenceConfig.arrivalRgbMode   = s_prefs.getUChar("arr_mode", 1);
    s_prefs.end();

    s_prefs.begin("desk_clients", true);
    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
        char kAddr[16], kName[16], kVal[16], kTrk[16];
        snprintf(kAddr, sizeof(kAddr), "addr_%d", i);
        snprintf(kName, sizeof(kName), "name_%d", i);
        snprintf(kVal, sizeof(kVal), "val_%d", i);
        snprintf(kTrk, sizeof(kTrk), "trk_%d", i);

        s_knownClients[i].valid = s_prefs.getBool(kVal, false);
        if (s_knownClients[i].valid) {
            String a = s_prefs.getString(kAddr, "");
            String n = s_prefs.getString(kName, "");
            strncpy(s_knownClients[i].addr, a.c_str(), sizeof(s_knownClients[i].addr) - 1);
            strncpy(s_knownClients[i].name, n.c_str(), sizeof(s_knownClients[i].name) - 1);
            s_knownClients[i].trackPresence = s_prefs.getBool(kTrk, true);
        } else {
            memset(&s_knownClients[i], 0, sizeof(PairedClient));
            s_knownClients[i].trackPresence = true;
        }
    }
    s_prefs.end();
}

static void savePresenceConfigToNVS() {
    s_prefs.begin("desk_pres", false);
    s_prefs.putBool("en", s_presenceConfig.enabled);
    s_prefs.putUShort("delay", s_presenceConfig.awayDelayMin);
    s_prefs.putUChar("away_mask", s_presenceConfig.awayRelayMask);
    s_prefs.putBool("away_rgb", s_presenceConfig.awayRgbOff);
    s_prefs.putUChar("arr_mask", s_presenceConfig.arrivalRelayMask);
    s_prefs.putBool("arr_rgb", s_presenceConfig.arrivalRgbOn);
    s_prefs.putUChar("arr_mode", s_presenceConfig.arrivalRgbMode);
    s_prefs.end();
}

static void loadSchedulesFromNVS() {
    s_prefs.begin("desk_sched", true);
    for (int i = 0; i < MAX_SCHEDULES; i++) {
        char kEn[16], kDays[16], kSH[16], kSM[16], kST[16], kDur[16], kEH[16], kEM[16], kTT[16], kTA[16], kR[16], kG[16], kB[16], kBri[16];
        snprintf(kEn, sizeof(kEn), "en_%d", i);
        snprintf(kDays, sizeof(kDays), "dy_%d", i);
        snprintf(kSH, sizeof(kSH), "sh_%d", i);
        snprintf(kSM, sizeof(kSM), "sm_%d", i);
        snprintf(kST, sizeof(kST), "st_%d", i);
        snprintf(kDur, sizeof(kDur), "du_%d", i);
        snprintf(kEH, sizeof(kEH), "eh_%d", i);
        snprintf(kEM, sizeof(kEM), "em_%d", i);
        snprintf(kTT, sizeof(kTT), "tt_%d", i);
        snprintf(kTA, sizeof(kTA), "ta_%d", i);
        snprintf(kR, sizeof(kR), "r_%d", i);
        snprintf(kG, sizeof(kG), "g_%d", i);
        snprintf(kB, sizeof(kB), "b_%d", i);
        snprintf(kBri, sizeof(kBri), "br_%d", i);

        s_schedules[i].enabled            = s_prefs.getBool(kEn, false);
        s_schedules[i].daysMask           = s_prefs.getUChar(kDays, 0x7F);
        s_schedules[i].startHour          = s_prefs.getUChar(kSH, 9);
        s_schedules[i].startMin           = s_prefs.getUChar(kSM, 0);
        s_schedules[i].stopType           = s_prefs.getUChar(kST, 0);
        s_schedules[i].durationMin        = s_prefs.getUShort(kDur, 60);
        s_schedules[i].stopHour           = s_prefs.getUChar(kEH, 10);
        s_schedules[i].stopMin            = s_prefs.getUChar(kEM, 0);
        s_schedules[i].targetType         = s_prefs.getUChar(kTT, 0);
        s_schedules[i].targetAction       = s_prefs.getUChar(kTA, 1);
        s_schedules[i].rgbR               = s_prefs.getUChar(kR, 0);
        s_schedules[i].rgbG               = s_prefs.getUChar(kG, 240);
        s_schedules[i].rgbB               = s_prefs.getUChar(kB, 255);
        s_schedules[i].rgbBri             = s_prefs.getUChar(kBri, 100);
        s_schedules[i].lastFiredDayMinute = 0xFFFF;
    }
    s_prefs.end();
}

static void executeScheduleAction(uint8_t ruleIdx, uint8_t action) {
    if (ruleIdx >= MAX_SCHEDULES) return;
    const ScheduleRule& rule = s_schedules[ruleIdx];
    uint8_t targetType = rule.targetType;
    Serial.printf(">>> [SCHEDULE TRIGGER] Rule %d, Target=%d, Action=%d\n", ruleIdx, targetType, action);
    if (targetType < RELAY_COUNT) {
        setRelayLoad(targetType, action, "Schedule Rule");
        notifyRelayState();
    } else if (targetType == 4) { // All Relays
        for (int r = 0; r < RELAY_COUNT; r++) {
            setRelayLoad(r, action, "Schedule All");
        }
        notifyRelayState();
    } else if (targetType == 5) { // RGB Strip
        if (action == 1) {
            s_ledMode = 1; // Solid
            s_ledR   = rule.rgbR;
            s_ledG   = rule.rgbG;
            s_ledB   = rule.rgbB;
            s_ledBri = (rule.rgbBri > 0) ? rule.rgbBri : 100;
        } else {
            s_ledMode = 0; // Off
        }
        notifyLedState();
    }
}

static void checkSchedules() {
    if (!s_timeSync.synced) return;

    uint8_t curH = 0, curM = 0, curS = 0, curDOW = 0;
    getLocalTime(&curH, &curM, &curS, &curDOW);

    uint16_t curDayMinute = ((uint16_t)curH * 60) + curM;
    uint8_t dayBit = (1 << (curDOW % 7)); // Bit 0 = Sun, Bit 1 = Mon ... Bit 6 = Sat

    for (int i = 0; i < MAX_SCHEDULES; i++) {
        if (!s_schedules[i].enabled) continue;
        if ((s_schedules[i].daysMask & dayBit) == 0) continue;

        uint16_t startMinute = ((uint16_t)s_schedules[i].startHour * 60) + s_schedules[i].startMin;
        uint16_t stopMinute = 0;
        bool hasStop = false;

        if (s_schedules[i].stopType == 1 && s_schedules[i].durationMin > 0) { // Duration
            stopMinute = (startMinute + s_schedules[i].durationMin) % 1440;
            hasStop = true;
        } else if (s_schedules[i].stopType == 2) { // Direct End Time
            stopMinute = ((uint16_t)s_schedules[i].stopHour * 60) + s_schedules[i].stopMin;
            hasStop = true;
        }

        // Fire Start
        if (curDayMinute == startMinute && s_schedules[i].lastFiredDayMinute != curDayMinute) {
            s_schedules[i].lastFiredDayMinute = curDayMinute;
            executeScheduleAction(i, s_schedules[i].targetAction);
        }
        // Fire Stop (Opposite of targetAction)
        else if (hasStop && curDayMinute == stopMinute && s_schedules[i].lastFiredDayMinute != (curDayMinute | 0x8000)) {
            s_schedules[i].lastFiredDayMinute = (curDayMinute | 0x8000);
            uint8_t stopAction = (s_schedules[i].targetAction == 1) ? 0 : 1;
            executeScheduleAction(i, stopAction);
        }
    }
}

static void loadTimeBaseFromNVS() {
    s_prefs.begin("desk_time", true);
    s_timeSync.synced      = s_prefs.getBool("synced", false);
    s_timeSync.baseLocalSec = s_prefs.getUInt("base_sec", 0);
    s_timeSync.syncMillis  = millis();
    s_prefs.end();
}

static void saveTimeBaseToNVS() {
    s_prefs.begin("desk_time", false);
    s_prefs.putBool("synced", s_timeSync.synced);
    s_prefs.putUInt("base_sec", s_timeSync.baseLocalSec);
    s_prefs.end();
}

/* ── Presence Registration ───────────────────────────────────────────────── */
static void registerClientDevice(const char* macAddr, const char* friendlyName) {
    if (!macAddr || strlen(macAddr) == 0) return;
    int foundIdx = -1, emptyIdx = -1;
    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
        if (s_knownClients[i].valid && strcasecmp(s_knownClients[i].addr, macAddr) == 0) {
            foundIdx = i; break;
        }
        if (!s_knownClients[i].valid && emptyIdx == -1) emptyIdx = i;
    }
    int targetIdx = (foundIdx != -1) ? foundIdx : (emptyIdx != -1 ? emptyIdx : 0);
    s_knownClients[targetIdx].valid = true;
    strncpy(s_knownClients[targetIdx].addr, macAddr, sizeof(s_knownClients[targetIdx].addr) - 1);
    if (friendlyName && strlen(friendlyName) > 0) {
        strncpy(s_knownClients[targetIdx].name, friendlyName, sizeof(s_knownClients[targetIdx].name) - 1);
    } else if (strlen(s_knownClients[targetIdx].name) == 0) {
        snprintf(s_knownClients[targetIdx].name, sizeof(s_knownClients[targetIdx].name), "Device %d", targetIdx + 1);
    }
    if (foundIdx == -1) s_knownClients[targetIdx].trackPresence = true;

    s_prefs.begin("desk_clients", false);
    char kAddr[16], kName[16], kVal[16], kTrk[16];
    snprintf(kAddr, sizeof(kAddr), "addr_%d", targetIdx);
    snprintf(kName, sizeof(kName), "name_%d", targetIdx);
    snprintf(kVal, sizeof(kVal), "val_%d", targetIdx);
    snprintf(kTrk, sizeof(kTrk), "trk_%d", targetIdx);
    s_prefs.putBool(kVal, true);
    s_prefs.putString(kAddr, s_knownClients[targetIdx].addr);
    s_prefs.putString(kName, s_knownClients[targetIdx].name);
    s_prefs.putBool(kTrk, s_knownClients[targetIdx].trackPresence);
    s_prefs.end();
}

static void handleClientConnected(const char* macAddr) {
    if (macAddr && strlen(macAddr) > 0) {
        strncpy(s_connectedClientAddr, macAddr, sizeof(s_connectedClientAddr) - 1);
    }
    int clientIdx = -1;
    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
        if (s_knownClients[i].valid && strcasecmp(s_knownClients[i].addr, macAddr) == 0) {
            clientIdx = i; break;
        }
    }
    bool isTracked = (clientIdx != -1) ? s_knownClients[clientIdx].trackPresence : true;
    if (!isTracked) return;

    s_awayTimerEndMs = 0;
    bool wasAway = s_isAwayTriggered;
    s_isAwayTriggered = false;

    if (wasAway && s_presenceConfig.enabled) {
        if (s_presenceConfig.arrivalRelayMask != 0) {
            for (int r = 0; r < RELAY_COUNT; r++) {
                if ((s_presenceConfig.arrivalRelayMask & (1 << r)) != 0) setRelayLoad(r, 1, "Presence Arrival");
            }
        }
        if (s_presenceConfig.arrivalRgbOn) {
            s_ledMode = (s_presenceConfig.arrivalRgbMode > 0) ? s_presenceConfig.arrivalRgbMode : 1;
            s_ledBri  = 100;
            notifyLedState();
        }
    }
}

static void handleClientDisconnected() {
    if (!s_presenceConfig.enabled || s_presenceConfig.awayDelayMin == 0) return;
    s_awayTimerEndMs = millis() + ((uint32_t)s_presenceConfig.awayDelayMin * 60000UL);
}

/* ── Strip Color Math & Gamma Correction (Uncapped 255 Scale) ───────────── */
static inline uint8_t scaleBri(uint8_t userPercent) {
    if (userPercent > 100) userPercent = 100;
    return (uint8_t)((userPercent * LED_MAX_BRIGHT) / 100);
}

static inline uint32_t gammaCorrect(uint8_t r, uint8_t g, uint8_t b, uint8_t bri) {
    float bScale = (float)bri / 255.0f;
    float rf = (float)r * bScale;
    float gf = (float)g * bScale;
    float bf = (float)b * bScale;
    uint8_t gr = (uint8_t)(powf(rf / 255.0f, 2.2f) * 255.0f + 0.5f);
    uint8_t gg = (uint8_t)(powf(gf / 255.0f, 2.2f) * 255.0f + 0.5f);
    uint8_t gb = (uint8_t)(powf(bf / 255.0f, 2.2f) * 255.0f + 0.5f);
    return s_strip.Color(gr, gg, gb);
}

/* ── Strip LED Rendering (Modes 0..16, Floor Glow, Cyber Spectrum Heat Map) ─ */
static void renderLeds() {
    static uint32_t s_lastLedRenderMs = 0;
    uint32_t now = millis();
    if (now - s_lastLedRenderMs < 16) return;
    s_lastLedRenderMs = now;

    // Transient Animation (Relay Switch feedback)
    if (s_animActive) {
        uint32_t elapsed = now - s_animStartMs;
        if (elapsed >= s_animDurationMs) {
            s_animActive = false;
        } else {
            uint8_t r = s_animIsOn ? 16 : 244;
            uint8_t g = s_animIsOn ? 185 : 63;
            uint8_t b = s_animIsOn ? 129 : 94;
            float progress = (float)elapsed / (float)s_animDurationMs;
            uint8_t pulseBri = (uint8_t)(sinf(progress * 3.14159f) * 255.0f);
            uint32_t col = gammaCorrect(r, g, b, pulseBri);
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            s_strip.show();
            return;
        }
    }

    if (s_ledMode == 0) {
        s_strip.clear();
        s_strip.show();
        return;
    }

    uint8_t bri = scaleBri(s_ledBri);
    uint8_t spd = (s_ledSpd < 1) ? 1 : (s_ledSpd > 10 ? 10 : s_ledSpd);

    switch (s_ledMode) {
        case 1: { // 1. Solid Static
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, bri);
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            break;
        }
        case 2: { // 2. Breathe
            uint32_t period = 4500 - (spd * 350);
            float phase = (float)(now % period) / (float)period;
            float sineVal = (sinf(phase * 6.28318f - 1.57079f) + 1.0f) * 0.5f;
            uint8_t bBri = (uint8_t)(sineVal * (float)bri);
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, bBri);
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            break;
        }
        case 3: { // 3. Rainbow Wave
            uint32_t stepMs = 55 - (spd * 4);
            uint16_t startHue = (uint16_t)((now / stepMs) * 256UL);
            for (int i = 0; i < s_stripLen; i++) {
                uint16_t pixelHue = startHue + (i * 65536UL / (s_stripLen ? s_stripLen : 1));
                s_strip.setPixelColor(i, s_strip.gamma32(s_strip.ColorHSV(pixelHue, 255, bri)));
            }
            break;
        }
        case 4: { // 4. Pulse Blink (<3Hz safe photosensitivity cycle)
            uint32_t blinkPeriod = 1200 - (spd * 80);
            bool isOn = (now % blinkPeriod) < (blinkPeriod / 2);
            uint32_t col = isOn ? gammaCorrect(s_ledR, s_ledG, s_ledB, bri) : 0;
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            break;
        }
        case 5: { // 5. Comet Chase Left -> Right
            uint32_t speedDelay = 80 - (spd * 6);
            int head = (now / speedDelay) % (s_stripLen ? s_stripLen : 1);
            int tailLen = (s_stripLen > 6) ? (s_stripLen / 3) : 3;
            for (int i = 0; i < s_stripLen; i++) {
                int dist = (head - i + s_stripLen) % (s_stripLen ? s_stripLen : 1);
                if (dist < tailLen) {
                    float fade = 1.0f - ((float)dist / (float)tailLen);
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(fade * (float)bri)));
                } else {
                    s_strip.setPixelColor(i, 0);
                }
            }
            break;
        }
        case 6: { // 6. Comet Chase Right -> Left
            uint32_t speedDelay = 80 - (spd * 6);
            int head = (s_stripLen - 1) - ((now / speedDelay) % (s_stripLen ? s_stripLen : 1));
            int tailLen = (s_stripLen > 6) ? (s_stripLen / 3) : 3;
            for (int i = 0; i < s_stripLen; i++) {
                int dist = (i - head + s_stripLen) % (s_stripLen ? s_stripLen : 1);
                if (dist < tailLen) {
                    float fade = 1.0f - ((float)dist / (float)tailLen);
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(fade * (float)bri)));
                } else {
                    s_strip.setPixelColor(i, 0);
                }
            }
            break;
        }
        case 7: { // 7. Color Cycle (Synchronized whole-strip spectrum)
            uint32_t cycleMs = 12000 - (spd * 900);
            uint16_t globalHue = (uint16_t)((now % cycleMs) * 65536UL / cycleMs);
            uint32_t col = s_strip.gamma32(s_strip.ColorHSV(globalHue, 255, bri));
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            break;
        }
        case 8: { // 8. Scanner / Knight Rider / Cylon Ping-Pong
            int span = s_stripLen > 1 ? (s_stripLen - 1) : 1;
            uint32_t cycle = span * (100 - spd * 7);
            uint32_t pos = (now % (cycle * 2));
            int head = (pos < cycle) ? (pos * span / cycle) : (span - ((pos - cycle) * span / cycle));
            int tailLen = (s_stripLen > 6) ? (s_stripLen / 4) : 2;
            for (int i = 0; i < s_stripLen; i++) {
                int dist = abs(head - i);
                if (dist <= tailLen) {
                    float fade = 1.0f - ((float)dist / (float)(tailLen + 1));
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(fade * (float)bri)));
                } else {
                    s_strip.setPixelColor(i, 0);
                }
            }
            break;
        }
        case 9: { // 9. Sparkle / Twinkle
            for (int i = 0; i < s_stripLen; i++) {
                uint8_t rnd = (uint8_t)((sinf((float)(now * 0.005f * spd + i * 1.5f)) + 1.0f) * 127.0f);
                if (rnd > 205) {
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, bri));
                } else if (rnd > 130) {
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(bri * 0.35f)));
                } else {
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(bri * 0.05f)));
                }
            }
            break;
        }
        case 10: { // 10. Center Pulse / Ripple
            int mid = s_stripLen / 2;
            uint32_t pulsePeriod = 1600 - (spd * 120);
            float progress = (float)(now % pulsePeriod) / (float)pulsePeriod;
            int activeWave = (int)(progress * (float)mid);
            for (int i = 0; i < s_stripLen; i++) {
                int distFromMid = abs(i - mid);
                int waveDist = abs(distFromMid - activeWave);
                if (waveDist < 3) {
                    float fade = 1.0f - ((float)waveDist / 3.0f);
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(fade * (float)bri)));
                } else {
                    s_strip.setPixelColor(i, gammaCorrect(s_ledR, s_ledG, s_ledB, (uint8_t)(bri * 0.06f)));
                }
            }
            break;
        }
        case 11: { // 11. Dual Crossing Beams
            uint32_t speedDelay = 90 - (spd * 7);
            int head1 = (now / speedDelay) % (s_stripLen ? s_stripLen : 1);
            int head2 = (s_stripLen - 1) - head1;
            for (int i = 0; i < s_stripLen; i++) {
                int d1 = abs(head1 - i);
                int d2 = abs(head2 - i);
                float f1 = (d1 < 3) ? (1.0f - (float)d1 / 3.0f) : 0.0f;
                float f2 = (d2 < 3) ? (1.0f - (float)d2 / 3.0f) : 0.0f;
                uint8_t rVal = (uint8_t)(min(255.0f, (f1 * s_ledR + f2 * s_ledB) * (bri / 255.0f)));
                uint8_t gVal = (uint8_t)(min(255.0f, (f1 * s_ledG + f2 * s_ledG) * (bri / 255.0f)));
                uint8_t bVal = (uint8_t)(min(255.0f, (f1 * s_ledB + f2 * s_ledR) * (bri / 255.0f)));
                s_strip.setPixelColor(i, s_strip.Color(rVal, gVal, bVal));
            }
            break;
        }
        case 12: { // 12. Wipe Left -> Right
            uint32_t wipePeriod = 2200 - (spd * 170);
            uint32_t phase = now % (wipePeriod * 2);
            int filled = (phase < wipePeriod) ? (phase * s_stripLen / wipePeriod) : (s_stripLen - ((phase - wipePeriod) * s_stripLen / wipePeriod));
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, bri);
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, (i <= filled) ? col : 0);
            break;
        }
        case 13: { // 13. Wipe Right -> Left
            uint32_t wipePeriod = 2200 - (spd * 170);
            uint32_t phase = now % (wipePeriod * 2);
            int filled = (phase < wipePeriod) ? (phase * s_stripLen / wipePeriod) : (s_stripLen - ((phase - wipePeriod) * s_stripLen / wipePeriod));
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, bri);
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, (i >= (s_stripLen - 1 - filled)) ? col : 0);
            break;
        }
        case 14: { // 14. Fireplace / Flame Flicker
            for (int i = 0; i < s_stripLen; i++) {
                uint8_t flicker = random(55, 255);
                uint8_t rVal = (uint8_t)(((uint16_t)255 * flicker * bri) / 65025);
                uint8_t gVal = (uint8_t)(((uint16_t)random(40, 110) * flicker * bri) / 65025);
                uint8_t bVal = (uint8_t)(((uint16_t)random(0, 15) * flicker * bri) / 65025);
                s_strip.setPixelColor(i, s_strip.Color(rVal, gVal, bVal));
            }
            break;
        }
        case 15: { // 15. Aurora Borealis (Emerald & Violet Ambient Waves)
            float t = (float)now * 0.0015f * ((float)spd * 0.4f);
            for (int i = 0; i < s_stripLen; i++) {
                float wave = sinf(t + (float)i * 0.35f) * 0.5f + 0.5f;
                uint8_t rA = (uint8_t)(wave * 80.0f * (bri / 255.0f));
                uint8_t gA = (uint8_t)((1.0f - wave) * 220.0f * (bri / 255.0f));
                uint8_t bA = (uint8_t)(200.0f * (bri / 255.0f));
                s_strip.setPixelColor(i, s_strip.Color(rA, gA, bA));
            }
            break;
        }
        case 16: { // 16. Music Reactive Engine (Pro-DJ Visualizer)
            uint8_t mBri = scaleBri(s_musicBri);
            uint8_t floorBri = (uint8_t)(((uint16_t)mBri * 10) / 100); // 10% Floor Glow
            if (floorBri < 5 && mBri > 0) floorBri = 5;

            switch (s_musicSubMode) {
                case 7: { // 7. Cyber Spectrum: Amplitude Heat-Mapped Visualizer
                    for (int i = 0; i < s_stripLen; i++) {
                        uint8_t bandIdx = (i * 8) / (s_stripLen ? s_stripLen : 1);
                        uint8_t lvl = s_musicLevels[bandIdx];
                        uint8_t activeBri = (lvl > floorBri) ? lvl : floorBri;
                        uint8_t briVal = (uint8_t)((activeBri * (uint16_t)mBri) / 255);

                        uint32_t heatCol;
                        if (lvl < 80) {
                            heatCol = gammaCorrect(0, (uint8_t)((lvl * 220) / 80), 255, briVal);
                        } else if (lvl < 180) {
                            uint8_t progress = lvl - 80;
                            heatCol = gammaCorrect((uint8_t)((progress * 255) / 100), 255, 0, briVal);
                        } else {
                            uint8_t peak = lvl - 180;
                            heatCol = gammaCorrect(255, (uint8_t)(255 - ((peak * 200) / 75)), (uint8_t)(peak / 3), briVal);
                        }
                        s_strip.setPixelColor(i, heatCol);
                    }
                    break;
                }
                case 9: { // 9. Solo Beat Sync with Floor Glow
                    uint8_t beat = s_musicBeatVal;
                    uint8_t activeBri = (beat > floorBri) ? beat : floorBri;
                    uint8_t finalBri = (uint8_t)((activeBri * (uint16_t)mBri) / 255);
                    uint32_t col = gammaCorrect(s_musicColorR, s_musicColorG, s_musicColorB, finalBri);
                    for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
                    break;
                }
                default: { // Other disco modes with Floor Glow guarantee
                    uint8_t beat = s_musicBeatVal;
                    uint8_t activeBri = (beat > floorBri) ? beat : floorBri;
                    uint8_t finalBri = (uint8_t)((activeBri * (uint16_t)mBri) / 255);
                    uint16_t hue = (now * 8) % 65536;
                    for (int i = 0; i < s_stripLen; i++) {
                        s_strip.setPixelColor(i, s_strip.ColorHSV((hue + (i * 65536UL / (s_stripLen ? s_stripLen : 1))) % 65536, 255, finalBri));
                    }
                    break;
                }
            }
            break;
        }
        case 17: { // 17. Neon Cyberpunk (Hot Magenta & Electric Cyan Synthwave)
            float t = (float)now * 0.003f * (float)spd;
            for (int i = 0; i < s_stripLen; i++) {
                float wave = sinf(t + (float)i * 0.5f);
                uint32_t col = (wave > 0)
                    ? gammaCorrect(255, 0, 128, (uint8_t)(wave * (float)bri))     // Hot Magenta
                    : gammaCorrect(0, 240, 255, (uint8_t)(-wave * (float)bri));   // Electric Cyan
                s_strip.setPixelColor(i, col);
            }
            break;
        }
        case 18: { // 18. Plasma Wave (Harmonic Multi-Sine Synthesis)
            float t = (float)now * 0.002f * (float)spd;
            for (int i = 0; i < s_stripLen; i++) {
                float v1 = sinf((float)i * 0.4f + t);
                float v2 = sinf((float)i * 0.2f - t * 1.5f);
                float v3 = sinf((float)i * 0.6f + t * 0.7f);
                uint16_t hue = (uint16_t)(((v1 + v2 + v3 + 3.0f) / 6.0f) * 65535.0f);
                s_strip.setPixelColor(i, s_strip.gamma32(s_strip.ColorHSV(hue, 255, bri)));
            }
            break;
        }
        case 19: { // 19. Glitch Strobe / Cyber Matrix (Digital rain code runner)
            uint32_t step = now / (70 - spd * 5);
            int runner = step % (s_stripLen ? s_stripLen : 1);
            for (int i = 0; i < s_stripLen; i++) {
                int dist = (runner - i + s_stripLen) % (s_stripLen ? s_stripLen : 1);
                if (dist == 0) {
                    s_strip.setPixelColor(i, gammaCorrect(240, 255, 240, bri));
                } else if (dist < 6) {
                    uint8_t fade = 255 - dist * 40;
                    s_strip.setPixelColor(i, gammaCorrect(0, fade, 20, (uint8_t)(bri * (fade / 255.0f))));
                } else if (random(0, 35) == 0) {
                    s_strip.setPixelColor(i, gammaCorrect(0, 255, 60, (uint8_t)(bri * 0.5f)));
                } else {
                    s_strip.setPixelColor(i, 0);
                }
            }
            break;
        }
        case 20: { // 20. Hyperdrive / Warp Speed (Acceleration jump from center)
            int mid = s_stripLen / 2;
            float t = (float)(now % 1200) / 1200.0f;
            float curved = t * t * (float)mid;
            int active = (int)curved;
            for (int i = 0; i < s_stripLen; i++) {
                int dist = abs(i - mid);
                if (abs(dist - active) < 2) {
                    uint8_t pBri = (uint8_t)((0.4f + t * 0.6f) * (float)bri);
                    s_strip.setPixelColor(i, gammaCorrect(180, 220, 255, pBri));
                } else {
                    s_strip.setPixelColor(i, gammaCorrect(10, 30, 80, (uint8_t)(bri * 0.05f)));
                }
            }
            break;
        }
        case 21: { // 21. Lava Lamp (Viscous Crimson & Gold)
            float t = (float)now * 0.001f * (float)spd;
            for (int i = 0; i < s_stripLen; i++) {
                float blob1 = sinf((float)i * 0.25f + t);
                float blob2 = sinf((float)i * 0.45f - t * 0.7f);
                float heat = (blob1 + blob2 + 2.0f) * 0.25f;
                uint32_t col = (heat > 0.65f)
                    ? gammaCorrect(255, 210, 20, bri)
                    : (heat > 0.35f ? gammaCorrect(245, 80, 0, bri) : gammaCorrect(160, 0, 10, (uint8_t)(bri * 0.7f)));
                s_strip.setPixelColor(i, col);
            }
            break;
        }
        case 22: { // 22. Police Pursuit (Red & Blue Double Strobe)
            uint32_t cycle = now % 600;
            int mid = s_stripLen / 2;
            bool redFlash = (cycle < 80) || (cycle >= 140 && cycle < 220);
            bool blueFlash = (cycle >= 300 && cycle < 380) || (cycle >= 440 && cycle < 520);
            for (int i = 0; i < s_stripLen; i++) {
                if (i < mid) {
                    s_strip.setPixelColor(i, redFlash ? gammaCorrect(255, 0, 0, bri) : 0);
                } else {
                    s_strip.setPixelColor(i, blueFlash ? gammaCorrect(0, 50, 255, bri) : 0);
                }
            }
            break;
        }
        case 23: { // 23. Ocean Deep Tide (Aquamarine & Abyssal Indigo)
            float t = (float)now * 0.002f * (float)spd;
            for (int i = 0; i < s_stripLen; i++) {
                float swell = sinf((float)i * 0.2f + t) * 0.5f + 0.5f;
                uint8_t rSea = 0;
                uint8_t gSea = (uint8_t)(swell * 230.0f * (bri / 255.0f));
                uint8_t bSea = (uint8_t)((120.0f + swell * 135.0f) * (bri / 255.0f));
                s_strip.setPixelColor(i, s_strip.Color(rSea, gSea, bSea));
            }
            break;
        }
        case 24: { // 24. Toxic Hazmat (Radioactive Lime Glow with Pulsing Amber Flares)
            float pulse = (sinf((float)now * 0.004f * (float)spd) + 1.0f) * 0.5f;
            for (int i = 0; i < s_stripLen; i++) {
                uint8_t limeG = (uint8_t)(255.0f * (bri / 255.0f));
                uint8_t limeR = (uint8_t)((40.0f + pulse * 120.0f) * (bri / 255.0f));
                s_strip.setPixelColor(i, s_strip.Color(limeR, limeG, 0));
            }
            break;
        }
        case 25: { // 25. Heartbeat EKG (Cardiovascular Anatomical Pulse)
            uint32_t beatCycle = now % (1200 - spd * 40);
            float beatBri = 0.05f;
            if (beatCycle < 80) {
                beatBri = sinf((float)beatCycle / 80.0f * 3.14159f);
            } else if (beatCycle >= 160 && beatCycle < 280) {
                beatBri = sinf((float)(beatCycle - 160) / 120.0f * 3.14159f) * 0.85f;
            }
            uint32_t col = gammaCorrect((s_ledR == 0 && s_ledG == 0) ? 255 : s_ledR, s_ledG, s_ledB, (uint8_t)(beatBri * (float)bri));
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            break;
        }
        case 26: { // 26. Prismatic Meteor Shower (Bursting Ember Streamers)
            uint32_t speedDelay = 70 - (spd * 5);
            int meteorPos = (now / speedDelay) % (s_stripLen ? s_stripLen : 1);
            for (int i = 0; i < s_stripLen; i++) {
                int dist = (meteorPos - i + s_stripLen) % (s_stripLen ? s_stripLen : 1);
                if (dist == 0) {
                    s_strip.setPixelColor(i, s_strip.Color(255, 255, 255));
                } else if (dist < 8) {
                    uint16_t emberHue = (uint16_t)((now * 4 + dist * 5000) % 65536);
                    uint8_t emberBri = (uint8_t)((1.0f - (float)dist / 8.0f) * (float)bri);
                    s_strip.setPixelColor(i, s_strip.gamma32(s_strip.ColorHSV(emberHue, 255, emberBri)));
                } else {
                    s_strip.setPixelColor(i, 0);
                }
            }
            break;
        }
        default: { // Standard fallback
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, bri);
            for (int i = 0; i < s_stripLen; i++) s_strip.setPixelColor(i, col);
            break;
        }
    }
    s_strip.show();
}

/* ── Main Setup ──────────────────────────────────────────────────────────── */
void setup() {
    for (int i = 0; i < RELAY_COUNT; i++) {
        digitalWrite(RELAY_PINS[i], HIGH);
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH);
    }

    Serial.begin(115200);
    delay(100);

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(DHT_PIN, INPUT_PULLUP);

    loadConfigsFromNVS();
    loadSchedulesFromNVS();
    loadPresenceFromNVS();
    loadTimeBaseFromNVS();
    loadMatrixConfigFromNVS();

    // Re-apply physical relay state
    for (int i = 0; i < RELAY_COUNT; i++) applyRelayPin(i, 0, "Boot Init");

    // Initialize NeoPixel Strip
    s_strip.updateLength(s_stripLen);
    s_strip.begin();
    s_strip.clear();
    s_strip.show();

    // Initialize BLE Server with HID Auto-Connect
    initBleServer(s_deviceName);

    Serial.println("\n>>> SMARTDESK V2 FIRMWARE READY <<<");
    Serial.printf("Strip Length: %d LEDs on GPIO %d\n", s_stripLen, LED_PIN);
    Serial.printf("Matrix Display: %dx%d on GPIO %d [Wiring: %d, Mode: %d]\n",
                  s_matrixConfig.cols, s_matrixConfig.rows, s_matrixConfig.pin, s_matrixConfig.wiringType, s_matrixConfig.mode);
}

/* ── Main Loop ───────────────────────────────────────────────────────────── */
void loop() {
    // 1. Process deferred Connect/Disconnect events
    if (s_flagConnected) {
        s_flagConnected = false;
        handleClientConnected(s_connectedClientAddr);
        notifyRelayState();
        notifyLedState();
        notifyEnvState();
    }
    if (s_flagDisconnected) {
        s_flagDisconnected = false;
        handleClientDisconnected();
        notifyEnvState();
    }

    // 2. Process Command Queue from BLE callbacks
    while (s_cmdTail != s_cmdHead) {
        WriteCmd cmd = s_cmdQueue[s_cmdTail];
        s_cmdTail = (s_cmdTail + 1) % CMD_QUEUE_SIZE;

        if (cmd.type == WT_RELAY && cmd.len >= 1) {
            uint8_t op = cmd.data[0];
            if (op == 1 && cmd.len >= 3) {
                setRelayLoad(cmd.data[1], cmd.data[2], "BLE Set Relay");
            } else if (op == 2 && cmd.len >= 4) {
                uint16_t mins = cmd.data[2] | ((uint16_t)cmd.data[3] << 8);
                setRelayTimer(cmd.data[1], mins);
            } else if (op == 3) {
                allRelaysOff("BLE All-Off");
            }
        } else if (cmd.type == WT_LED && cmd.len >= 6) {
            if (cmd.data[0] == 16) {
                s_ledMode = 16;
                s_musicBri = cmd.data[1];
                if (cmd.len >= 15) {
                    s_musicSubMode = cmd.data[2];
                    s_musicBeatVal = cmd.data[3];
                    s_musicColorR  = cmd.data[4];
                    s_musicColorG  = cmd.data[5];
                    s_musicColorB  = cmd.data[6];
                    for (int i = 0; i < 8; i++) s_musicLevels[i] = cmd.data[7 + i];
                }
            } else {
                s_ledMode = cmd.data[0];
                s_ledR    = cmd.data[1];
                s_ledG    = cmd.data[2];
                s_ledB    = cmd.data[3];
                s_ledBri  = cmd.data[4];
                s_ledSpd  = cmd.data[5];
                notifyLedState();
            }
        } else if (cmd.type == WT_CONFIG && cmd.len >= 1) {
            if (cmd.data[0] < RELAY_COUNT && cmd.len >= 9) { // 0..3: Relay Config [idx, wiring, onEn, onMd, onDu, offEn, offMd, offDu, nameLen, ...name]
                uint8_t idx = cmd.data[0];
                s_relayConfigs[idx].wiring          = cmd.data[1];
                s_relayConfigs[idx].onAnimEnabled   = cmd.data[2];
                s_relayConfigs[idx].onAnimMode      = cmd.data[3];
                s_relayConfigs[idx].onAnimDuration  = cmd.data[4];
                s_relayConfigs[idx].offAnimEnabled  = cmd.data[5];
                s_relayConfigs[idx].offAnimMode     = cmd.data[6];
                s_relayConfigs[idx].offAnimDuration = cmd.data[7];
                uint8_t nlen = cmd.data[8];
                if (nlen > 16) nlen = 16;
                memset(s_relayConfigs[idx].name, 0, sizeof(s_relayConfigs[idx].name));
                if (cmd.len >= 9 + nlen && nlen > 0) {
                    memcpy(s_relayConfigs[idx].name, &cmd.data[9], nlen);
                } else if (strlen(s_relayConfigs[idx].name) == 0) {
                    snprintf(s_relayConfigs[idx].name, sizeof(s_relayConfigs[idx].name), "Relay %d", idx + 1);
                }

                s_prefs.begin("desk_cfg", false);
                char kWire[16], kOnEn[16], kOnMd[16], kOnDu[16], kOffEn[16], kOffMd[16], kOffDu[16], kName[16];
                snprintf(kWire, sizeof(kWire), "w_%d", idx);
                snprintf(kOnEn, sizeof(kOnEn), "on_en_%d", idx);
                snprintf(kOnMd, sizeof(kOnMd), "on_md_%d", idx);
                snprintf(kOnDu, sizeof(kOnDu), "on_du_%d", idx);
                snprintf(kOffEn, sizeof(kOffEn), "of_en_%d", idx);
                snprintf(kOffMd, sizeof(kOffMd), "of_md_%d", idx);
                snprintf(kOffDu, sizeof(kOffDu), "of_du_%d", idx);
                snprintf(kName, sizeof(kName), "n_%d", idx);

                s_prefs.putUChar(kWire, s_relayConfigs[idx].wiring);
                s_prefs.putUChar(kOnEn, s_relayConfigs[idx].onAnimEnabled);
                s_prefs.putUChar(kOnMd, s_relayConfigs[idx].onAnimMode);
                s_prefs.putUChar(kOnDu, s_relayConfigs[idx].onAnimDuration);
                s_prefs.putUChar(kOffEn, s_relayConfigs[idx].offAnimEnabled);
                s_prefs.putUChar(kOffMd, s_relayConfigs[idx].offAnimMode);
                s_prefs.putUChar(kOffDu, s_relayConfigs[idx].offAnimDuration);
                s_prefs.putString(kName, s_relayConfigs[idx].name);
                s_prefs.end();

                // Re-apply physical coil level with new wiring configuration immediately
                applyRelayPin(idx, s_relayLoads[idx], "Config Wiring Update");
                notifyRelayState();
            } else if (cmd.data[0] == 0xFE) { // Rename Device
                uint8_t nameLen = cmd.data[1];
                if (nameLen > 20) nameLen = 20;
                if (nameLen > 0 && cmd.len >= 2 + nameLen) {
                    memset(s_deviceName, 0, sizeof(s_deviceName));
                    memcpy(s_deviceName, &cmd.data[2], nameLen);
                    s_prefs.begin("desk_cfg", false);
                    s_prefs.putString("dev_name", s_deviceName);
                    s_prefs.end();
                    initBleServer(s_deviceName);
                }
            } else if (cmd.data[0] == 0xFD && cmd.len >= 2) { // Master Buzzer
                s_buzzerMasterEnabled = (cmd.data[1] == 1);
                s_prefs.begin("desk_cfg", false);
                s_prefs.putBool("bz_master", s_buzzerMasterEnabled);
                s_prefs.end();
                notifyEnvState();
            } else if (cmd.data[0] == 0xFC && cmd.len >= 5) { // Relay Buzzer
                uint8_t idx = cmd.data[1];
                if (idx < RELAY_COUNT) {
                    s_buzzerConfigs[idx].beepOn       = (cmd.data[2] == 1);
                    s_buzzerConfigs[idx].beepOff      = (cmd.data[3] == 1);
                    s_buzzerConfigs[idx].beepTimerEnd = (cmd.data[4] == 1);
                }
            } else if (cmd.data[0] == 0xFB && cmd.len >= 5) { // Time Sync
                uint8_t h = cmd.data[1], m = cmd.data[2], s = cmd.data[3], dow = cmd.data[4];
                s_timeSync.synced = true;
                s_timeSync.baseLocalSec = ((uint32_t)dow * 86400UL) + ((uint32_t)h * 3600UL) + ((uint32_t)m * 60UL) + s;
                s_timeSync.syncMillis = millis();
                saveTimeBaseToNVS();
                notifyEnvState();
            } else if (cmd.data[0] == 0xFA && cmd.len >= 12) { // 0xFA: Save Schedule Rule
                uint8_t id = cmd.data[1];
                if (id < MAX_SCHEDULES) {
                    s_schedules[id].enabled      = (cmd.data[2] == 1);
                    s_schedules[id].daysMask     = cmd.data[3];
                    s_schedules[id].startHour    = cmd.data[4];
                    s_schedules[id].startMin     = cmd.data[5];
                    s_schedules[id].stopType     = cmd.data[6];
                    if (s_schedules[id].stopType == 1) {
                        s_schedules[id].durationMin = cmd.data[7] | ((uint16_t)cmd.data[8] << 8);
                    } else {
                        s_schedules[id].stopHour = cmd.data[7];
                        s_schedules[id].stopMin  = (cmd.len >= 10) ? cmd.data[9] : 0;
                    }
                    s_schedules[id].targetType   = cmd.data[10];
                    s_schedules[id].targetAction = cmd.data[11];
                    if (cmd.len >= 16) {
                        s_schedules[id].rgbR   = cmd.data[12];
                        s_schedules[id].rgbG   = cmd.data[13];
                        s_schedules[id].rgbB   = cmd.data[14];
                        s_schedules[id].rgbBri = cmd.data[15];
                    }
                    s_schedules[id].lastFiredDayMinute = 0xFFFF;

                    s_prefs.begin("desk_sched", false);
                    char kEn[16], kDays[16], kSH[16], kSM[16], kST[16], kDur[16], kEH[16], kEM[16], kTT[16], kTA[16], kR[16], kG[16], kB[16], kBri[16];
                    snprintf(kEn, sizeof(kEn), "en_%d", id);
                    snprintf(kDays, sizeof(kDays), "dy_%d", id);
                    snprintf(kSH, sizeof(kSH), "sh_%d", id);
                    snprintf(kSM, sizeof(kSM), "sm_%d", id);
                    snprintf(kST, sizeof(kST), "st_%d", id);
                    snprintf(kDur, sizeof(kDur), "du_%d", id);
                    snprintf(kEH, sizeof(kEH), "eh_%d", id);
                    snprintf(kEM, sizeof(kEM), "em_%d", id);
                    snprintf(kTT, sizeof(kTT), "tt_%d", id);
                    snprintf(kTA, sizeof(kTA), "ta_%d", id);
                    snprintf(kR, sizeof(kR), "r_%d", id);
                    snprintf(kG, sizeof(kG), "g_%d", id);
                    snprintf(kB, sizeof(kB), "b_%d", id);
                    snprintf(kBri, sizeof(kBri), "br_%d", id);

                    s_prefs.putBool(kEn, s_schedules[id].enabled);
                    s_prefs.putUChar(kDays, s_schedules[id].daysMask);
                    s_prefs.putUChar(kSH, s_schedules[id].startHour);
                    s_prefs.putUChar(kSM, s_schedules[id].startMin);
                    s_prefs.putUChar(kST, s_schedules[id].stopType);
                    s_prefs.putUShort(kDur, s_schedules[id].durationMin);
                    s_prefs.putUChar(kEH, s_schedules[id].stopHour);
                    s_prefs.putUChar(kEM, s_schedules[id].stopMin);
                    s_prefs.putUChar(kTT, s_schedules[id].targetType);
                    s_prefs.putUChar(kTA, s_schedules[id].targetAction);
                    s_prefs.putUChar(kR, s_schedules[id].rgbR);
                    s_prefs.putUChar(kG, s_schedules[id].rgbG);
                    s_prefs.putUChar(kB, s_schedules[id].rgbB);
                    s_prefs.putUChar(kBri, s_schedules[id].rgbBri);
                    s_prefs.end();

                    Serial.printf(">>> [SCHEDULE] Saved Rule %d (En=%d, Days=0x%02X, Start=%02d:%02d, Target=%d, Act=%d)\n",
                                  id, s_schedules[id].enabled, s_schedules[id].daysMask,
                                  s_schedules[id].startHour, s_schedules[id].startMin,
                                  s_schedules[id].targetType, s_schedules[id].targetAction);
                }
            } else if (cmd.data[0] == 0xF9 && cmd.len >= 2) { // 0xF9: Delete/Disable Schedule Rule
                uint8_t id = cmd.data[1];
                if (id < MAX_SCHEDULES) {
                    s_schedules[id].enabled = false;
                    s_prefs.begin("desk_sched", false);
                    char kEn[16];
                    snprintf(kEn, sizeof(kEn), "en_%d", id);
                    s_prefs.putBool(kEn, false);
                    s_prefs.end();
                    Serial.printf(">>> [SCHEDULE] Disabled Rule %d\n", id);
                }
            } else if (cmd.data[0] == 0xF8 && cmd.len >= 8) { // Presence Config
                s_presenceConfig.enabled          = (cmd.data[1] == 1);
                s_presenceConfig.awayDelayMin     = cmd.data[2] | ((uint16_t)cmd.data[3] << 8);
                s_presenceConfig.awayRelayMask    = cmd.data[4];
                s_presenceConfig.awayRgbOff       = (cmd.data[5] == 1);
                s_presenceConfig.arrivalRelayMask = cmd.data[6];
                s_presenceConfig.arrivalRgbOn     = (cmd.data[7] == 1);
                s_presenceConfig.arrivalRgbMode   = (cmd.len >= 9) ? cmd.data[8] : 1;
                savePresenceConfigToNVS();
                notifyEnvState();
            } else if (cmd.data[0] == 0xF7 && cmd.len >= 2) { // Register Client Name
                uint8_t nlen = (cmd.data[1] > 23) ? 23 : cmd.data[1];
                if (cmd.len >= 2 + nlen) {
                    memset(s_connectedClientName, 0, sizeof(s_connectedClientName));
                    memcpy(s_connectedClientName, &cmd.data[2], nlen);
                    if (strlen(s_connectedClientAddr) > 0) {
                        registerClientDevice(s_connectedClientAddr, s_connectedClientName);
                    }
                    notifyEnvState();
                }
            } else if (cmd.data[0] == 0xF6) { // 0xF6: Delete Slot [0xF6, slotIdx] or Clear All [0xF6]
                if (cmd.len >= 2) {
                    uint8_t slotIdx = cmd.data[1];
                    if (slotIdx < MAX_PAIRED_CLIENTS) {
                        memset(&s_knownClients[slotIdx], 0, sizeof(PairedClient));
                        s_prefs.begin("desk_clients", false);
                        char kVal[16]; snprintf(kVal, sizeof(kVal), "val_%d", slotIdx);
                        s_prefs.remove(kVal);
                        s_prefs.end();
                        notifyEnvState();
                    }
                } else {
                    s_prefs.begin("desk_clients", false);
                    s_prefs.clear();
                    s_prefs.end();
                    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) memset(&s_knownClients[i], 0, sizeof(PairedClient));
                    notifyEnvState();
                }
            } else if (cmd.data[0] == 0xF3 && cmd.len >= 3) { // 0xF3: Set Dynamic Strip Length [0xF3, lenLo, lenHi]
                uint16_t newLen = cmd.data[1] | ((uint16_t)cmd.data[2] << 8);
                if (newLen >= 1 && newLen <= MAX_STRIP_LEDS) {
                    s_stripLen = newLen;
                    s_prefs.begin("desk_cfg", false);
                    s_prefs.putUShort("strip_len", s_stripLen);
                    s_prefs.end();
                    s_strip.updateLength(s_stripLen);
                    s_strip.clear();
                    s_strip.show();
                    Serial.printf(">>> [BLE CMD] Strip Length updated to %d LEDs\n", s_stripLen);
                    notifyEnvState();
                }
            } else if (cmd.data[0] == 0xF2 && cmd.len >= 6) { // 0xF2: Matrix Config [0xF2, rowsLo, rowsHi, colsLo, colsHi, wiring, pin, en]
                uint16_t reqRows = cmd.data[1] | ((uint16_t)cmd.data[2] << 8);
                uint16_t reqCols = cmd.data[3] | ((uint16_t)cmd.data[4] << 8);
                uint32_t totalLeds = (uint32_t)reqRows * (uint32_t)reqCols;
                if (totalLeds == 0 || totalLeds > MAX_MATRIX_LEDS) {
                    reqRows = DEFAULT_MATRIX_ROWS;
                    reqCols = DEFAULT_MATRIX_COLS;
                }
                s_matrixConfig.rows       = reqRows;
                s_matrixConfig.cols       = reqCols;
                s_matrixConfig.wiringType = (cmd.data[5] == 1) ? 1 : 0;
                uint8_t reqPin = (cmd.len >= 7 && cmd.data[6] > 0) ? cmd.data[6] : MATRIX_PIN;
                s_matrixConfig.pin        = isSafeMatrixPin(reqPin) ? reqPin : MATRIX_PIN;
                s_matrixConfig.enabled    = (cmd.len >= 8) ? (cmd.data[7] == 1) : true;
                saveMatrixConfigToNVS();
                initMatrixHardware();
                notifyEnvState();
            } else if (cmd.data[0] == 0xF1 && cmd.len >= 7) { // 0xF1: Matrix Mode & Text [0xF1, mode, spd, bri, r, g, b, len, ...text]
                s_matrixConfig.mode   = cmd.data[1];
                s_matrixConfig.speed  = cmd.data[2];
                s_matrixConfig.bri    = cmd.data[3];
                s_matrixConfig.colorR = cmd.data[4];
                s_matrixConfig.colorG = cmd.data[5];
                s_matrixConfig.colorB = cmd.data[6];
                if (cmd.len >= 8) {
                    uint8_t tlen = (cmd.data[7] > 60) ? 60 : cmd.data[7];
                    if (cmd.len >= 8 + tlen) {
                        memset(s_matrixConfig.text, 0, sizeof(s_matrixConfig.text));
                        memcpy(s_matrixConfig.text, &cmd.data[8], tlen);
                        s_matrixConfig.text[sizeof(s_matrixConfig.text) - 1] = '\0';
                    }
                }
                saveMatrixConfigToNVS();
                notifyEnvState();
            }
        }
    }

    uint32_t now = millis();

    // Check Presence Away Timeout
    if (s_awayTimerEndMs > 0 && (long)(now - s_awayTimerEndMs) >= 0) {
        s_awayTimerEndMs = 0;
        s_isAwayTriggered = true;
        if (s_presenceConfig.awayRelayMask != 0) {
            for (int r = 0; r < RELAY_COUNT; r++) {
                if ((s_presenceConfig.awayRelayMask & (1 << r)) != 0) setRelayLoad(r, 0, "Away Timeout");
            }
        }
        if (s_presenceConfig.awayRgbOff) {
            s_ledMode = 0;
            notifyLedState();
        }
        notifyEnvState();
    }

    updateActiveBuzzer(now);

    // Read DHT11 Sensor every 4 seconds
    if (now - s_lastDhtReadMs >= 4000) {
        s_lastDhtReadMs = now;
        float t, h;
        if (readDHT11(&t, &h)) {
            s_tempC = t;
            s_humidity = h;
            s_sensorValid = true;
            notifyEnvState();
        }
    }

    // Check Relay Timers
    static uint32_t s_lastTimerNotifyMs = 0;
    bool hasActiveTimer = false;
    for (int i = 0; i < RELAY_COUNT; i++) {
        if (s_timerEndMs[i] > 0) {
            hasActiveTimer = true;
            if ((long)(now - s_timerEndMs[i]) >= 0) {
                s_timerEndMs[i] = 0;
                applyRelayPin(i, 0, "Timer Expiration");
                if (s_buzzerConfigs[i].beepTimerEnd) buzzerBeepTimerEnd();
                notifyRelayState();
            }
        }
    }
    if (hasActiveTimer && (now - s_lastTimerNotifyMs >= 15000)) {
        s_lastTimerNotifyMs = now;
        notifyRelayState();
    }

    // Render Primary Strip LEDs (GPIO 8)
    renderLeds();

    // Render 2D Matrix Display (GPIO 11)
    uint8_t rtcH = 0, rtcM = 0, rtcS = 0, rtcDOW = 0;
    getLocalTime(&rtcH, &rtcM, &rtcS, &rtcDOW);
    renderMatrixLeds(rtcH, rtcM, rtcS);

    // Check and Execute Schedules (24/7 Hardware Scheduler)
    static uint32_t s_lastSchedCheckMs = 0;
    if (now - s_lastSchedCheckMs >= 1000UL) {
        s_lastSchedCheckMs = now;
        checkSchedules();
    }

    delay(2);
}
