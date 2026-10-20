/**
 * smartdesk.ino — SmartDesk V2 Firmware
 *
 * Single-file firmware for ESP32-S3 (N16R8) smart desk controller.
 * Relays on GPIO 4, 5, 6, 7. WS2812B (8x) on GPIO 8.
 * NimBLE-Arduino 2.x, Adafruit NeoPixel, Preferences (NVS).
 *
 ================================================================================
 SMARTDESK-V2 BLE GATT PROTOCOL SPECIFICATION
 Service UUID: 7f781e04-c0ee-47c9-a1e4-0aafa8ee316b
 Advertised Name: smartDesk Controller (Configurable in NVS)

 1. RELAY Characteristic: 385d4ec5-88c3-417e-8aa5-2a70db5d49fa
    Properties: READ, WRITE (with response), NOTIFY
    - Write Command (1 to 4 bytes):
      * Set Relay : [1, idx, val] (idx: 0..3, val: 0=OFF, 1=ON) -> cancels timer
      * Set Timer : [2, idx, minLo, minHi] (idx: 0..3, minutes: 0..1440, 0=cancel)
      * All Off   : [3] -> turns all 4 relays OFF and cancels all timers
    - Read / Notify Payload (12 bytes):
      * Bytes 0..3 : Load states for relays 0..3 (0=OFF, 1=ON)
      * Bytes 4..5 : Relay 0 remaining minutes (uint16 little-endian: lo, hi)
      * Bytes 6..7 : Relay 1 remaining minutes (uint16 little-endian: lo, hi)
      * Bytes 8..9 : Relay 2 remaining minutes (uint16 little-endian: lo, hi)
      * Bytes 10..11: Relay 3 remaining minutes (uint16 little-endian: lo, hi)

 2. LED Characteristic: 1814a0cb-9d1f-4212-946a-72e78b64042e
    Properties: READ, WRITE (with response), NOTIFY
    - Read / Write / Notify Payload (6 to 10 bytes):
      * Standard Modes (0..15 - 6 bytes):
        - Byte 0: Mode (0..15: 0=Off, 1=Solid, 2=Breathe/Fade, 3=Rainbow, 4=Blink,
                  5=Chase L->R, 6=Chase R->L, 7=Color Cycle, 8=Scanner, 9=Sparkle,
                  10=Center Pulse, 11=Dual Chase, 12=Wipe L->R, 13=Wipe R->L,
                  14=Fire Flicker, 15=Aurora Wave)
        - Byte 1: Red (0..255)
        - Byte 2: Green (0..255)
        - Byte 3: Blue (0..255)
        - Byte 4: Brightness (0..100%, capped internally to LED_MAX_BRIGHT=80)
        - Byte 5: Speed (1..10)
      * Music Reactive Mode (Mode 16 - 6 to 15 bytes):
        - Byte 0: Mode = 16 (Music Reactive)
        - Byte 1: Music Brightness Cap (0..100%, independent of normal brightness)
        - 15-byte frame:
          * Byte 2: Disco SubMode (0..9: 0=Disco Party, 1=Bass Burst, 2=Neon Strobe,
                    3=Rhythm Ripple, 4=Disco Sparkle, 5=Beat Pump, 6=Dual Clash,
                    7=Cyber Spectrum, 8=Fire Dance, 9=Solo Beat Sync)
          * Byte 3: Beat / Bass Kick Intensity (0..255)
          * Bytes 4..6: RGB Color (0..255 each, used in Solo Beat Sync & Disco)
          * Bytes 7..14: Frequency Bands 0..7 (0..255 each)
        - 10-byte fallback: Bytes 2..9 = Intensity levels for LEDs 0..7 (0..255 each)
        - 6-byte fallback : Byte 2 = VU level (0..8), Bytes 3..5 = RGB color

 3. CONFIG Characteristic: 11848579-c357-45cb-bdb2-88f560c11708
    Properties: READ, WRITE (with response)
    - Write Relay Config Payload (9 to 25 bytes):
      * Byte 0: Relay Index (0..3)
      * Byte 1: Wiring (0=Normally Open [NO], 1=Normally Closed [NC])
      * Byte 2: ON Anim Enabled (0=Disabled, 1=Enabled)
      * Byte 3: ON Anim Mode (1..10)
      * Byte 4: ON Anim Duration (seconds: 1..10)
      * Byte 5: OFF Anim Enabled (0=Disabled, 1=Enabled)
      * Byte 6: OFF Anim Mode (1..10)
      * Byte 7: OFF Anim Duration (seconds: 1..10)
      * Byte 8: Name Length L (0..16)
      * Bytes 9..8+L: Name string ASCII (max 16 chars)
    - Write Rename Device Payload (3 to 22 bytes):
      * Byte 0: 0xFE (254)
      * Byte 1: Name Length L (1..20)
      * Bytes 2..1+L: Device Name string ASCII (max 20 chars)
    - Write Master Buzzer Payload (2 bytes):
      * Byte 0: 0xFD (253)
      * Byte 1: Master Buzzer Enabled (0=Muted, 1=Enabled)
    - Write Relay Buzzer Payload (5 bytes):
      * Byte 0: 0xFC (252)
      * Byte 1: Relay Index (0..3)
      * Byte 2: Beep on ON (0=Off, 1=On)
      * Byte 3: Beep on OFF (0=Off, 1=On)
      * Byte 4: Beep on Timer End (0=Off, 1=On)
    - Read Payload (125 bytes):
      * 4 Relay Records (25 bytes each, offsets 0, 25, 50, 75):
        - Byte 0: Index i (0..3)
        - Byte 1: Wiring (0=NO, 1=NC)
        - Byte 2: ON Anim Enabled (0 or 1)
        - Byte 3: ON Anim Mode (1..10)
        - Byte 4: ON Anim Duration (seconds: 1..10)
        - Byte 5: OFF Anim Enabled (0 or 1)
        - Byte 6: OFF Anim Mode (1..10)
        - Byte 7: OFF Anim Duration (seconds: 1..10)
        - Byte 8: Name Length L (0..16)
        - Bytes 9..24: Name string (16 bytes, ASCII null-padded)
      * Device Name Record (25 bytes, offset 100):
        - Byte 100: Device Name Length L (1..20)
        - Bytes 101..124: Device Name string (24 bytes, ASCII null-padded)

 4. INFO Characteristic: f1f28a13-9725-4636-a073-0666057bd91b
    Properties: READ
    - Read Payload: UTF-8 string: "BUILD ... | Name: ... | Up: ...s | Temp: ...C | Hum: ...% | Buzz: ..."

 5. ENV Characteristic: 4a1b0005-c0ee-47c9-a1e4-0aafa8ee316b
    Properties: READ, NOTIFY
    - Read / Notify Payload (8 bytes):
      * Byte 0: Sensor Valid (0=Connecting/Disconnected, 1=Valid)
      * Byte 1: Temp Integer (0..100 °C)
      * Byte 2: Temp Decimal (0..9)
      * Byte 3: Humidity Integer (0..100 % RH)
      * Byte 4: Humidity Decimal (0..9)
      * Byte 5: Master Buzzer State (0=Muted, 1=Enabled)
      * Bytes 6..7: Reserved (0)
 ================================================================================
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <NimBLEHIDDevice.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>

/* ── Hardware Constants ──────────────────────────────────────────────────── */
#define RELAY_COUNT         4
static const uint8_t RELAY_PINS[RELAY_COUNT] = {4, 5, 6, 7};
#define MIN_SWITCH_MS       250

#define LED_PIN             8
#define LED_COUNT           8
#define LED_MAX_BRIGHT      80    // Hard ceiling for NeoPixel brightness (0-255 scale)

#define DHT_PIN             9     // DHT11 Temperature & Humidity Sensor Data Pin
#define BUZZER_PIN          10    // Active Buzzer Signal Pin (Big Buzzer B27: HIGH=Beep, LOW=Silent)

#define DEFAULT_DEVICE_NAME "smartDesk Controller"
#define SERVICE_UUID        "7f781e04-c0ee-47c9-a1e4-0aafa8ee316b"
#define CHAR_RELAY_UUID     "385d4ec5-88c3-417e-8aa5-2a70db5d49fa"
#define CHAR_LED_UUID       "1814a0cb-9d1f-4212-946a-72e78b64042e"
#define CHAR_CONFIG_UUID    "11848579-c357-45cb-bdb2-88f560c11708"
#define CHAR_INFO_UUID      "f1f28a13-9725-4636-a073-0666057bd91b"
#define CHAR_ENV_UUID       "4a1b0005-c0ee-47c9-a1e4-0aafa8ee316b"

#define BUILD_MARKER        "BUILD " __DATE__ " " __TIME__ " TAG=V2-AUTOPRESENCE"

/* ── Fast Command Queue for Non-Blocking Callbacks ───────────────────────── */
enum WriteType { WT_NONE = 0, WT_RELAY, WT_LED, WT_CONFIG };

struct WriteCmd {
    WriteType type;
    uint8_t   len;
    uint8_t   data[32];
};

#define CMD_QUEUE_SIZE 16
static volatile uint8_t s_cmdHead = 0;
static volatile uint8_t s_cmdTail = 0;
static WriteCmd s_cmdQueue[CMD_QUEUE_SIZE];

static inline bool enqueueCmd(WriteType type, const uint8_t* data, size_t len) {
    uint8_t next = (s_cmdHead + 1) % CMD_QUEUE_SIZE;
    if (next == s_cmdTail) return false; // Queue full
    s_cmdQueue[s_cmdHead].type = type;
    s_cmdQueue[s_cmdHead].len  = (len > 32) ? 32 : (uint8_t)len;
    if (data && s_cmdQueue[s_cmdHead].len > 0) {
        memcpy(s_cmdQueue[s_cmdHead].data, data, s_cmdQueue[s_cmdHead].len);
    }
    s_cmdHead = next;
    return true;
}

/* ── Relay Configuration Structure ───────────────────────────────────────── */
struct RelayConfig {
    uint8_t wiring;          // 0 = Normally Open (NO), 1 = Normally Closed (NC) (default: 0)
    uint8_t onAnimEnabled;   // 0 = Disabled, 1 = Enabled (default: 1)
    uint8_t onAnimMode;      // 1..10 (default: 1: Fade/Pulse)
    uint8_t onAnimDuration;  // 1..10 seconds (default: 2)
    uint8_t offAnimEnabled;  // 0 = Disabled, 1 = Enabled (default: 1)
    uint8_t offAnimMode;     // 1..10 (default: 3: Wipe L->R)
    uint8_t offAnimDuration; // 1..10 seconds (default: 2)
    char    name[17];        // Up to 16 chars + null terminator
};

/* ── Global State ────────────────────────────────────────────────────────── */
static char        s_deviceName[25]             = DEFAULT_DEVICE_NAME;
static RelayConfig s_relayConfigs[RELAY_COUNT];
static uint8_t     s_relayLoads[RELAY_COUNT]    = {0, 0, 0, 0}; // 0 = OFF, 1 = ON
static uint32_t    s_lastSwitchMs[RELAY_COUNT]  = {0, 0, 0, 0};
static uint32_t    s_timerEndMs[RELAY_COUNT]    = {0, 0, 0, 0}; // 0 = no timer

// LED State (Modes 0..15)
static uint8_t  s_ledMode   = 1;    // 0=off, 1=solid, 2=breathe, 3=rainbow, etc.
static uint8_t  s_ledR      = 0;
static uint8_t  s_ledG      = 180;
static uint8_t  s_ledB      = 255;
static uint8_t  s_ledBri    = 50;   // 0..100%
static uint8_t  s_ledSpd    = 5;    // 1..10

// Dedicated Music Sync State (Independent brightness cap & 10 Disco Styles)
static uint8_t  s_musicBri       = 80;   // 0..100% independent brightness cap
static uint8_t  s_musicSubMode   = 0;    // 0..9 for the 10 Disco Styles
static uint8_t  s_musicBeatVal   = 0;    // 0..255 beat/bass kick energy
static uint8_t  s_musicColorR    = 0;    // Single color for Mode 9 (Solo Beat Sync)
static uint8_t  s_musicColorG    = 180;
static uint8_t  s_musicColorB    = 255;
static uint8_t  s_musicLevels[8] = {0, 0, 0, 0, 0, 0, 0, 0};
static uint8_t  s_musicStyle     = 0;    // Legacy fallback: 0 = Spectrum 8-band, 1 = VU level
static uint8_t  s_musicVuLevel   = 0;    // Legacy fallback: 0..8

// Transient Relay Switch Animation State (Restores previous mode automatically)
static bool     s_animActive     = false;
static uint32_t s_animStartMs    = 0;
static uint32_t s_animDurationMs = 2000; // ms
static uint8_t  s_animMode       = 1;
static bool     s_animIsOn       = false;// true if turning ON (emerald), false if turning OFF (crimson)

static uint8_t  s_savedLedMode = 1;
static uint8_t  s_savedLedR    = 0;
static uint8_t  s_savedLedG    = 180;
static uint8_t  s_savedLedB    = 255;
static uint8_t  s_savedLedBri  = 50;
static uint8_t  s_savedLedSpd  = 5;

static Adafruit_NeoPixel s_strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
static Preferences       s_prefs;

static NimBLEServer*         s_pServer      = nullptr;
static NimBLEHIDDevice*      s_pHid         = nullptr;
static NimBLECharacteristic* s_pRelayChar   = nullptr;
static NimBLECharacteristic* s_pLedChar     = nullptr;
static NimBLECharacteristic* s_pConfigChar  = nullptr;
static NimBLECharacteristic* s_pInfoChar    = nullptr;
static NimBLECharacteristic* s_pEnvChar     = nullptr;
static bool                  s_connected    = false;

// ── DHT11 Environmental State (GPIO 9) ──────────────────────────────────────
static float    s_tempC         = 0.0f;
static float    s_humidity      = 0.0f;
static bool     s_sensorValid   = false;
static uint32_t s_lastDhtReadMs = 0;

static bool readDHT11(float* outTemp, float* outHum) {
    uint8_t data[5] = {0, 0, 0, 0, 0};

    // 1. Send start signal: pull LOW for 20ms
    pinMode(DHT_PIN, OUTPUT);
    digitalWrite(DHT_PIN, LOW);
    delay(20);
    digitalWrite(DHT_PIN, HIGH);
    delayMicroseconds(30);
    pinMode(DHT_PIN, INPUT_PULLUP);

    // 2. Wait for DHT response (80us LOW, 80us HIGH)
    uint32_t timeout = micros();
    while (digitalRead(DHT_PIN) == HIGH) {
        if (micros() - timeout > 100) return false;
    }
    timeout = micros();
    while (digitalRead(DHT_PIN) == LOW) {
        if (micros() - timeout > 100) return false;
    }
    timeout = micros();
    while (digitalRead(DHT_PIN) == HIGH) {
        if (micros() - timeout > 100) return false;
    }

    // 3. Read 40 bits (5 bytes)
    for (int i = 0; i < 40; i++) {
        timeout = micros();
        while (digitalRead(DHT_PIN) == LOW) {
            if (micros() - timeout > 100) return false;
        }
        uint32_t startHigh = micros();
        while (digitalRead(DHT_PIN) == HIGH) {
            if (micros() - startHigh > 120) return false;
        }
        uint32_t pulseLen = micros() - startHigh;
        if (pulseLen > 40) {
            data[i / 8] |= (1 << (7 - (i % 8)));
        }
    }

    // 4. Verify checksum
    uint8_t sum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
    if (data[4] != sum) return false;

    *outHum = (float)data[0] + ((float)data[1] * 0.1f);
    *outTemp = (float)data[2] + ((float)data[3] * 0.1f);
    return true;
}

// ── Active Buzzer Driver (Big Buzzer B27 on GPIO 10) ─────────────────────────
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

// Non-blocking active buzzer pulse generator (HIGH = buzz, LOW = quiet)
struct ActiveBuzzerState {
    uint8_t  totalToggles;    // count * 2
    uint8_t  currentToggle;   // 0 = idle
    uint16_t onMs;
    uint16_t offMs;
    uint32_t nextToggleMs;
    bool     pinHigh;
};
static ActiveBuzzerState s_activeBuzzer = { 0, 0, 0, 0, 0, false };

static void triggerActiveBuzzerBeeps(uint8_t count, uint16_t onMs, uint16_t offMs) {
    if (!s_buzzerMasterEnabled || count == 0) {
        digitalWrite(BUZZER_PIN, LOW);
        return;
    }
    s_activeBuzzer.totalToggles  = count * 2;
    s_activeBuzzer.currentToggle = 1;
    s_activeBuzzer.onMs          = onMs;
    s_activeBuzzer.offMs         = offMs;
    s_activeBuzzer.nextToggleMs  = millis() + onMs;
    s_activeBuzzer.pinHigh       = true;
    digitalWrite(BUZZER_PIN, HIGH);
}

static void updateActiveBuzzer(uint32_t now) {
    if (s_activeBuzzer.currentToggle == 0) return;
    if (!s_buzzerMasterEnabled) {
        s_activeBuzzer.currentToggle = 0;
        s_activeBuzzer.pinHigh = false;
        digitalWrite(BUZZER_PIN, LOW);
        return;
    }
    if ((long)(now - s_activeBuzzer.nextToggleMs) >= 0) {
        s_activeBuzzer.currentToggle++;
        if (s_activeBuzzer.currentToggle > s_activeBuzzer.totalToggles) {
            s_activeBuzzer.currentToggle = 0;
            s_activeBuzzer.pinHigh = false;
            digitalWrite(BUZZER_PIN, LOW);
        } else {
            s_activeBuzzer.pinHigh = !s_activeBuzzer.pinHigh;
            digitalWrite(BUZZER_PIN, s_activeBuzzer.pinHigh ? HIGH : LOW);
            uint16_t wait = s_activeBuzzer.pinHigh ? s_activeBuzzer.onMs : s_activeBuzzer.offMs;
            s_activeBuzzer.nextToggleMs = now + wait;
        }
    }
}

static void buzzerBeepRelayOn() {
    triggerActiveBuzzerBeeps(1, 65, 0); // 1 crisp 65ms beep
}

static void buzzerBeepRelayOff() {
    triggerActiveBuzzerBeeps(2, 45, 45); // 2 quick 45ms beeps
}

static void buzzerBeepTimerEnd() {
    triggerActiveBuzzerBeeps(3, 140, 90); // 3 alert beeps
}

// ── Real-Time Clock & Day Synchronization ───────────────────────────────────
struct TimeSyncState {
    bool     synced;
    uint32_t baseLocalSec;  // seconds in the week: (dayOfWeek * 86400) + (hour * 3600) + (min * 60) + sec
    uint32_t syncMillis;    // millis() when base was synchronized
};
static TimeSyncState s_timeSync = { false, 0, 0 };

static void getLocalTime(uint8_t* outHour, uint8_t* outMin, uint8_t* outSec, uint8_t* outDayOfWeek) {
    if (!s_timeSync.synced) {
        if (outHour) *outHour = 0;
        if (outMin) *outMin = 0;
        if (outSec) *outSec = 0;
        if (outDayOfWeek) *outDayOfWeek = 0;
        return;
    }
    uint32_t elapsedSec = (millis() - s_timeSync.syncMillis) / 1000UL;
    uint32_t totalSec   = (s_timeSync.baseLocalSec + elapsedSec) % (7UL * 86400UL); // 7-day week
    uint8_t  dow        = (uint8_t)(totalSec / 86400UL);
    uint32_t secInDay   = totalSec % 86400UL;
    uint8_t  h          = (uint8_t)(secInDay / 3600UL);
    uint8_t  m          = (uint8_t)((secInDay % 3600UL) / 60UL);
    uint8_t  s          = (uint8_t)(secInDay % 60UL);
    if (outHour) *outHour = h;
    if (outMin) *outMin = m;
    if (outSec) *outSec = s;
    if (outDayOfWeek) *outDayOfWeek = dow;
}

// ── Day Scheduler Engine (Up to 8 Rules Stored in NVS) ──────────────────────
#define MAX_SCHEDULES 8

struct ScheduleRule {
    bool     enabled;
    uint8_t  daysMask;     // Bit 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    uint8_t  startHour;    // 0..23
    uint8_t  startMin;     // 0..59
    uint8_t  stopType;     // 0=None, 1=DurationMinutes, 2=DirectStopTime
    uint16_t durationMin;  // for stopType == 1 (1..1440 min)
    uint8_t  stopHour;     // for stopType == 2 (0..23)
    uint8_t  stopMin;      // for stopType == 2 (0..59)
    uint8_t  targetType;   // 0=CH1, 1=CH2, 2=CH3, 3=CH4, 4=All Relays, 5=RGB Strip
    uint8_t  targetAction; // For Relay: 1=ON, 0=OFF. For RGB: Mode 0..15 (0=Off)
    uint8_t  rgbR;
    uint8_t  rgbG;
    uint8_t  rgbB;
    uint8_t  rgbBri;
    // Runtime execution flags:
    uint16_t lastFiredDayMinute; // (dayOfWeek * 1440) + (hour * 60) + min
    uint32_t autoStopMs;         // millis() for duration stop (0 = inactive)
};
static ScheduleRule s_schedules[MAX_SCHEDULES];

// ── Presence & Away Subsystem (10 Known Paired Devices) ─────────────────────
#define MAX_PAIRED_CLIENTS 10

struct PairedClient {
    char     addr[18];     // "XX:XX:XX:XX:XX:XX"
    char     name[24];     // Friendly device name (e.g. "Anand's Laptop")
    bool     valid;
    bool     trackPresence; // true = Track presence for Away/Arrival; false = Excluded (Idle Desk Device)
};

struct PresenceConfig {
    bool     enabled;          // Master Presence Switch
    uint16_t awayDelayMin;     // Delay before turning load off (1..60 min)
    uint8_t  awayRelayMask;    // Bits 0..3: Relays to turn OFF (0x00=None, 0x0F=All 4)
    bool     awayRgbOff;       // true = turn RGB strip OFF, false = leave RGB as is
    uint8_t  arrivalRelayMask; // Bits 0..3: Relays to turn ON (0x00=None, 0x0F=All 4)
    bool     arrivalRgbOn;     // true = turn RGB strip ON, false = leave RGB as is
    uint8_t  arrivalRgbMode;   // 1..15 Mode to activate when arrivalRgbOn is true
};

static PresenceConfig s_presenceConfig = {
    false,  // enabled (inactive by default until master device designated)
    5,      // 5 min away delay
    0x0F,   // awayRelayMask: CH1..CH4
    true,   // awayRgbOff: turn RGB off
    0x0F,   // arrivalRelayMask: CH1..CH4
    true,   // arrivalRgbOn: turn RGB on
    1       // arrivalRgbMode: 1 = solid white/ambient
};

static PairedClient s_knownClients[MAX_PAIRED_CLIENTS];
static uint32_t     s_awayTimerEndMs          = 0;   // 0 = inactive, >0 = countdown to away auto-off
static bool         s_isAwayTriggered         = false;
static char         s_connectedClientAddr[18] = {0};
static char         s_connectedClientName[24] = "Unknown Device";

static volatile bool s_flagConnected    = false;
static volatile bool s_flagDisconnected = false;
static volatile int  s_discReason       = 0;

/* ── Transient Relay Animation Trigger ───────────────────────────────────── */
static void triggerRelayAnimation(uint8_t relayIdx, bool isTurnOn, uint8_t animMode, uint8_t durationSec) {
    if (animMode == 0) return;
    if (durationSec < 1) durationSec = 1;
    if (durationSec > 10) durationSec = 10;

    if (!s_animActive) {
        // Save previous LED state before starting animation
        s_savedLedMode = s_ledMode;
        s_savedLedR    = s_ledR;
        s_savedLedG    = s_ledG;
        s_savedLedB    = s_ledB;
        s_savedLedBri  = s_ledBri;
        s_savedLedSpd  = s_ledSpd;
    }

    s_animActive     = true;
    s_animStartMs    = millis();
    s_animDurationMs = (uint32_t)durationSec * 1000UL;
    s_animMode       = animMode;
    s_animIsOn       = isTurnOn;

    Serial.printf("[LED-FEEDBACK] Relay %d %s -> Triggered Anim Mode %u (Duration: %us)\n",
                  relayIdx + 1, isTurnOn ? "ON" : "OFF", animMode, durationSec);
}

static void applyRelayPin(uint8_t idx, uint8_t load, const char* source) {
    if (idx >= RELAY_COUNT) return;
    uint8_t prevLoad = s_relayLoads[idx];
    s_relayLoads[idx]   = load ? 1 : 0;
    s_lastSwitchMs[idx] = millis();

    // Opto-isolated active-LOW relay driver with NO / NC contact mapping:
    // NO (wiring=0): load ON requires coil energized (pin LOW); load OFF requires coil resting (pin HIGH).
    // NC (wiring=1): load ON requires coil resting (pin HIGH); load OFF requires coil energized (pin LOW).
    uint8_t coil = (s_relayConfigs[idx].wiring == 1) ? (!s_relayLoads[idx]) : s_relayLoads[idx];
    uint8_t pinLevel = coil ? LOW : HIGH;
    digitalWrite(RELAY_PINS[idx], pinLevel);

    Serial.printf("[RELAY %d] LOAD=%s | Contact=%s | Coil=%s | GPIO%d Level=%s (%s) | Trigger: %s\n",
                  idx + 1,
                  s_relayLoads[idx] ? "ON " : "OFF",
                  (s_relayConfigs[idx].wiring == 1) ? "NC" : "NO",
                  coil ? "ENERGIZED" : "RESTING  ",
                  RELAY_PINS[idx],
                  (pinLevel == HIGH) ? "HIGH" : "LOW",
                  (pinLevel == HIGH) ? "3.3V" : "0V",
                  source ? source : "UNKNOWN");

    // Check buzzer audio feedback on state change
    if (prevLoad != s_relayLoads[idx]) {
        if (s_relayLoads[idx] != 0 && s_buzzerConfigs[idx].beepOn) {
            buzzerBeepRelayOn();
        } else if (s_relayLoads[idx] == 0 && s_buzzerConfigs[idx].beepOff) {
            buzzerBeepRelayOff();
        }

        if (s_relayLoads[idx] != 0 && s_relayConfigs[idx].onAnimEnabled) {
            triggerRelayAnimation(idx, true, s_relayConfigs[idx].onAnimMode, s_relayConfigs[idx].onAnimDuration);
        } else if (s_relayLoads[idx] == 0 && s_relayConfigs[idx].offAnimEnabled) {
            triggerRelayAnimation(idx, false, s_relayConfigs[idx].offAnimMode, s_relayConfigs[idx].offAnimDuration);
        }
    }
}

/* ── Notify Helpers ──────────────────────────────────────────────────────── */
static void buildRelayPayload(uint8_t* out12) {
    for (int i = 0; i < RELAY_COUNT; i++) {
        out12[i] = s_relayLoads[i];
    }
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

static void notifyRelayState() {
    if (!s_pRelayChar || !s_connected) return;
    uint8_t payload[12];
    buildRelayPayload(payload);
    s_pRelayChar->setValue(payload, 12);
    s_pRelayChar->notify();
}

static void notifyLedState() {
    if (!s_pLedChar || !s_connected) return;
    uint8_t payload[6] = { s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd };
    s_pLedChar->setValue(payload, 6);
    s_pLedChar->notify();
}

static void buildEnvPayload(uint8_t* out14) {
    out14[0] = s_sensorValid ? 1 : 0;
    int16_t t10 = (int16_t)(s_tempC * 10.0f);
    out14[1] = (uint8_t)(t10 / 10);
    out14[2] = (uint8_t)(abs(t10) % 10);
    int16_t h10 = (int16_t)(s_humidity * 10.0f);
    out14[3] = (uint8_t)(h10 / 10);
    out14[4] = (uint8_t)(abs(h10) % 10);
    out14[5] = s_buzzerMasterEnabled ? 1 : 0;
    out14[6] = s_timeSync.synced ? 1 : 0;
    uint8_t curH = 0, curM = 0, curS = 0, curDOW = 0;
    getLocalTime(&curH, &curM, &curS, &curDOW);
    out14[7] = curH;
    out14[8] = curM;
    out14[9] = curS;
    out14[10] = curDOW;

    // Presence & Away Telemetry
    out14[11] = s_presenceConfig.enabled ? 1 : 0;
    uint8_t presState = 0;
    uint8_t remMin = 0;
    if (s_connected) {
        presState = 1; // 1 = Present / Connected
    } else if (s_awayTimerEndMs > 0) {
        presState = 2; // 2 = Away Timer Counting Down
        long remMs = (long)(s_awayTimerEndMs - millis());
        remMin = (remMs > 0) ? (uint8_t)((remMs + 59999UL) / 60000UL) : 0;
    }
    out14[12] = presState;
    out14[13] = remMin;
}

static void notifyEnvState() {
    if (!s_pEnvChar || !s_connected) return;
    uint8_t payload[14];
    buildEnvPayload(payload);
    s_pEnvChar->setValue(payload, 14);
    s_pEnvChar->notify();
}

/* ── NVS Configuration Storage ───────────────────────────────────────────── */
static void loadConfigsFromNVS() {
    s_prefs.begin("desk_cfg", false);

    // Device Name
    String savedName = s_prefs.getString("dev_name", DEFAULT_DEVICE_NAME);
    memset(s_deviceName, 0, sizeof(s_deviceName));
    strncpy(s_deviceName, savedName.c_str(), sizeof(s_deviceName) - 1);

    for (int i = 0; i < RELAY_COUNT; i++) {
        char kWir[12], kOnEn[12], kOnMd[12], kOnDu[12], kOffEn[12], kOffMd[12], kOffDu[12], kNam[12];
        snprintf(kWir, sizeof(kWir), "wir_%d", i);
        snprintf(kOnEn, sizeof(kOnEn), "on_en_%d", i);
        snprintf(kOnMd, sizeof(kOnMd), "on_md_%d", i);
        snprintf(kOnDu, sizeof(kOnDu), "on_du_%d", i);
        snprintf(kOffEn, sizeof(kOffEn), "of_en_%d", i);
        snprintf(kOffMd, sizeof(kOffMd), "of_md_%d", i);
        snprintf(kOffDu, sizeof(kOffDu), "of_du_%d", i);
        snprintf(kNam, sizeof(kNam), "nam_%d", i);

        s_relayConfigs[i].wiring          = (uint8_t)s_prefs.getUChar(kWir, 0);   // 0 = NO by default
        s_relayConfigs[i].onAnimEnabled   = (uint8_t)s_prefs.getUChar(kOnEn, 1);  // ON feedback enabled by default
        s_relayConfigs[i].onAnimMode      = (uint8_t)s_prefs.getUChar(kOnMd, 1);  // Mode 1: Breathe/Fade
        s_relayConfigs[i].onAnimDuration  = (uint8_t)s_prefs.getUChar(kOnDu, 2);  // 2s duration
        s_relayConfigs[i].offAnimEnabled  = (uint8_t)s_prefs.getUChar(kOffEn, 1); // OFF feedback enabled by default
        s_relayConfigs[i].offAnimMode     = (uint8_t)s_prefs.getUChar(kOffMd, 3); // Mode 3: Wipe
        s_relayConfigs[i].offAnimDuration = (uint8_t)s_prefs.getUChar(kOffDu, 2); // 2s duration

        char defaultName[16];
        snprintf(defaultName, sizeof(defaultName), "Relay %d", i + 1);
        String savedRelayName = s_prefs.getString(kNam, defaultName);
        memset(s_relayConfigs[i].name, 0, sizeof(s_relayConfigs[i].name));
        strncpy(s_relayConfigs[i].name, savedRelayName.c_str(), 16);

        char kOn[16], kOff[16], kEnd[16];
        snprintf(kOn, sizeof(kOn), "bz_on_%d", i);
        snprintf(kOff, sizeof(kOff), "bz_of_%d", i);
        snprintf(kEnd, sizeof(kEnd), "bz_en_%d", i);
        s_buzzerConfigs[i].beepOn       = s_prefs.getBool(kOn, true);
        s_buzzerConfigs[i].beepOff      = s_prefs.getBool(kOff, true);
        s_buzzerConfigs[i].beepTimerEnd = s_prefs.getBool(kEnd, true);
    }
    s_buzzerMasterEnabled = s_prefs.getBool("buzz_en", true);
    s_prefs.end();
}

static void saveConfigToNVS(uint8_t idx) {
    if (idx >= RELAY_COUNT) return;
    s_prefs.begin("desk_cfg", false);
    char kWir[12], kOnEn[12], kOnMd[12], kOnDu[12], kOffEn[12], kOffMd[12], kOffDu[12], kNam[12];
    snprintf(kWir, sizeof(kWir), "wir_%d", idx);
    snprintf(kOnEn, sizeof(kOnEn), "on_en_%d", idx);
    snprintf(kOnMd, sizeof(kOnMd), "on_md_%d", idx);
    snprintf(kOnDu, sizeof(kOnDu), "on_du_%d", idx);
    snprintf(kOffEn, sizeof(kOffEn), "of_en_%d", idx);
    snprintf(kOffMd, sizeof(kOffMd), "of_md_%d", idx);
    snprintf(kOffDu, sizeof(kOffDu), "of_du_%d", idx);
    snprintf(kNam, sizeof(kNam), "nam_%d", idx);

    s_prefs.putUChar(kWir, s_relayConfigs[idx].wiring);
    s_prefs.putUChar(kOnEn, s_relayConfigs[idx].onAnimEnabled);
    s_prefs.putUChar(kOnMd, s_relayConfigs[idx].onAnimMode);
    s_prefs.putUChar(kOnDu, s_relayConfigs[idx].onAnimDuration);
    s_prefs.putUChar(kOffEn, s_relayConfigs[idx].offAnimEnabled);
    s_prefs.putUChar(kOffMd, s_relayConfigs[idx].offAnimMode);
    s_prefs.putUChar(kOffDu, s_relayConfigs[idx].offAnimDuration);
    s_prefs.putString(kNam, s_relayConfigs[idx].name);
    s_prefs.end();
    Serial.printf("[NVS] Saved Relay %d: Wiring=%s OnEn=%d OnMd=%d OnDu=%d OffEn=%d OffMd=%d OffDu=%d Name='%s'\n",
                  idx + 1, (s_relayConfigs[idx].wiring == 1) ? "NC" : "NO",
                  s_relayConfigs[idx].onAnimEnabled, s_relayConfigs[idx].onAnimMode, s_relayConfigs[idx].onAnimDuration,
                  s_relayConfigs[idx].offAnimEnabled, s_relayConfigs[idx].offAnimMode, s_relayConfigs[idx].offAnimDuration,
                  s_relayConfigs[idx].name);
}

/* ── Relay Action Handlers ───────────────────────────────────────────────── */
static void setRelayLoad(uint8_t idx, uint8_t load, const char* source) {
    if (idx >= RELAY_COUNT) return;
    uint32_t now = millis();
    if (s_lastSwitchMs[idx] != 0 && (now - s_lastSwitchMs[idx] < MIN_SWITCH_MS)) {
        Serial.printf("[RATE-LIMIT] Relay %d change dropped (< %u ms interval)\n", idx + 1, MIN_SWITCH_MS);
        return;
    }

    // Manual switch cancels any active timer
    s_timerEndMs[idx] = 0;
    applyRelayPin(idx, load, source);
    notifyRelayState();
}

static void setRelayTimer(uint8_t idx, uint16_t minutes) {
    if (idx >= RELAY_COUNT) return;
    if (minutes > 1440) minutes = 1440; // Max 24 hours

    if (minutes == 0) {
        s_timerEndMs[idx] = 0;
        Serial.printf("[TIMER] Relay %d timer cancelled.\n", idx + 1);
    } else {
        s_timerEndMs[idx] = millis() + ((uint32_t)minutes * 60000UL);
        Serial.printf("[TIMER] Relay %d timer set for %u min (expires in %lu ms)\n",
                      idx + 1, minutes, (unsigned long)(minutes * 60000UL));
        // If currently OFF, turn it ON
        if (s_relayLoads[idx] == 0) {
            applyRelayPin(idx, 1, "Timer Start");
        }
    }
    notifyRelayState();
}

static void allRelaysOff(const char* source) {
    Serial.printf("[ALL-OFF] Turning all relays off (Source: %s)\n", source ? source : "Command");
    for (int i = 0; i < RELAY_COUNT; i++) {
        s_timerEndMs[i] = 0;
        applyRelayPin(i, 0, source);
    }
    notifyRelayState();
}

/* ── Day Scheduler Persistence & Evaluator ───────────────────────────────── */
static void loadSchedulesFromNVS() {
    s_prefs.begin("desk_sched", false);
    for (int i = 0; i < MAX_SCHEDULES; i++) {
        char kEn[12], kDays[12], kSh[12], kSm[12], kSt[12], kDur[12], kEh[12], kEm[12], kTt[12], kTa[12], kR[12], kG[12], kB[12], kBri[12];
        snprintf(kEn, sizeof(kEn), "en_%d", i);
        snprintf(kDays, sizeof(kDays), "dy_%d", i);
        snprintf(kSh, sizeof(kSh), "sh_%d", i);
        snprintf(kSm, sizeof(kSm), "sm_%d", i);
        snprintf(kSt, sizeof(kSt), "st_%d", i);
        snprintf(kDur, sizeof(kDur), "du_%d", i);
        snprintf(kEh, sizeof(kEh), "eh_%d", i);
        snprintf(kEm, sizeof(kEm), "em_%d", i);
        snprintf(kTt, sizeof(kTt), "tt_%d", i);
        snprintf(kTa, sizeof(kTa), "ta_%d", i);
        snprintf(kR, sizeof(kR), "r_%d", i);
        snprintf(kG, sizeof(kG), "g_%d", i);
        snprintf(kB, sizeof(kB), "b_%d", i);
        snprintf(kBri, sizeof(kBri), "br_%d", i);

        s_schedules[i].enabled            = s_prefs.getBool(kEn, false);
        s_schedules[i].daysMask           = (uint8_t)s_prefs.getUChar(kDays, 0x7F); // default everyday
        s_schedules[i].startHour          = (uint8_t)s_prefs.getUChar(kSh, 9);
        s_schedules[i].startMin           = (uint8_t)s_prefs.getUChar(kSm, 0);
        s_schedules[i].stopType           = (uint8_t)s_prefs.getUChar(kSt, 0);
        s_schedules[i].durationMin        = (uint16_t)s_prefs.getUShort(kDur, 60);
        s_schedules[i].stopHour           = (uint8_t)s_prefs.getUChar(kEh, 18);
        s_schedules[i].stopMin            = (uint8_t)s_prefs.getUChar(kEm, 0);
        s_schedules[i].targetType         = (uint8_t)s_prefs.getUChar(kTt, 0);
        s_schedules[i].targetAction       = (uint8_t)s_prefs.getUChar(kTa, 1);
        s_schedules[i].rgbR               = (uint8_t)s_prefs.getUChar(kR, 0);
        s_schedules[i].rgbG               = (uint8_t)s_prefs.getUChar(kG, 180);
        s_schedules[i].rgbB               = (uint8_t)s_prefs.getUChar(kB, 255);
        s_schedules[i].rgbBri             = (uint8_t)s_prefs.getUChar(kBri, 50);
        s_schedules[i].lastFiredDayMinute = 0xFFFF;
        s_schedules[i].autoStopMs         = 0;
    }
    s_prefs.end();
}

static void saveScheduleToNVS(uint8_t i) {
    if (i >= MAX_SCHEDULES) return;
    s_prefs.begin("desk_sched", false);
    char kEn[12], kDays[12], kSh[12], kSm[12], kSt[12], kDur[12], kEh[12], kEm[12], kTt[12], kTa[12], kR[12], kG[12], kB[12], kBri[12];
    snprintf(kEn, sizeof(kEn), "en_%d", i);
    snprintf(kDays, sizeof(kDays), "dy_%d", i);
    snprintf(kSh, sizeof(kSh), "sh_%d", i);
    snprintf(kSm, sizeof(kSm), "sm_%d", i);
    snprintf(kSt, sizeof(kSt), "st_%d", i);
    snprintf(kDur, sizeof(kDur), "du_%d", i);
    snprintf(kEh, sizeof(kEh), "eh_%d", i);
    snprintf(kEm, sizeof(kEm), "em_%d", i);
    snprintf(kTt, sizeof(kTt), "tt_%d", i);
    snprintf(kTa, sizeof(kTa), "ta_%d", i);
    snprintf(kR, sizeof(kR), "r_%d", i);
    snprintf(kG, sizeof(kG), "g_%d", i);
    snprintf(kB, sizeof(kB), "b_%d", i);
    snprintf(kBri, sizeof(kBri), "br_%d", i);

    s_prefs.putBool(kEn, s_schedules[i].enabled);
    s_prefs.putUChar(kDays, s_schedules[i].daysMask);
    s_prefs.putUChar(kSh, s_schedules[i].startHour);
    s_prefs.putUChar(kSm, s_schedules[i].startMin);
    s_prefs.putUChar(kSt, s_schedules[i].stopType);
    s_prefs.putUShort(kDur, s_schedules[i].durationMin);
    s_prefs.putUChar(kEh, s_schedules[i].stopHour);
    s_prefs.putUChar(kEm, s_schedules[i].stopMin);
    s_prefs.putUChar(kTt, s_schedules[i].targetType);
    s_prefs.putUChar(kTa, s_schedules[i].targetAction);
    s_prefs.putUChar(kR, s_schedules[i].rgbR);
    s_prefs.putUChar(kG, s_schedules[i].rgbG);
    s_prefs.putUChar(kB, s_schedules[i].rgbB);
    s_prefs.putUChar(kBri, s_schedules[i].rgbBri);
    s_prefs.end();
}

/* ── Time & Presence Persistence ─────────────────────────────────────────── */
static void saveTimeBaseToNVS() {
    if (!s_timeSync.synced) return;
    s_prefs.begin("desk_time", false);
    s_prefs.putBool("synced", true);
    s_prefs.putUInt("baseSec", s_timeSync.baseLocalSec);
    s_prefs.putUInt("syncMs", s_timeSync.syncMillis);
    s_prefs.end();
}

static void loadTimeBaseFromNVS() {
    s_prefs.begin("desk_time", true);
    bool synced = s_prefs.getBool("synced", false);
    if (synced) {
        s_timeSync.synced = true;
        s_timeSync.baseLocalSec = s_prefs.getUInt("baseSec", 0);
        s_timeSync.syncMillis = millis(); // continue counting forward from reboot
        Serial.println(">>> [TIME] Restored internal clock from flash memory.");
    }
    s_prefs.end();
}

static void loadPresenceFromNVS() {
    s_prefs.begin("desk_pres", true);
    s_presenceConfig.enabled          = s_prefs.getBool("en", false);
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

static void registerClientDevice(const char* macAddr, const char* friendlyName) {
    if (!macAddr || strlen(macAddr) == 0) return;

    int foundIdx = -1;
    int emptyIdx = -1;
    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
        if (s_knownClients[i].valid && strcasecmp(s_knownClients[i].addr, macAddr) == 0) {
            foundIdx = i;
            break;
        }
        if (!s_knownClients[i].valid && emptyIdx == -1) {
            emptyIdx = i;
        }
    }

    int targetIdx = (foundIdx != -1) ? foundIdx : (emptyIdx != -1 ? emptyIdx : 0);
    s_knownClients[targetIdx].valid = true;
    strncpy(s_knownClients[targetIdx].addr, macAddr, sizeof(s_knownClients[targetIdx].addr) - 1);
    if (friendlyName && strlen(friendlyName) > 0) {
        strncpy(s_knownClients[targetIdx].name, friendlyName, sizeof(s_knownClients[targetIdx].name) - 1);
    } else if (strlen(s_knownClients[targetIdx].name) == 0) {
        snprintf(s_knownClients[targetIdx].name, sizeof(s_knownClients[targetIdx].name), "Device %d", targetIdx + 1);
    }
    if (foundIdx == -1) {
        s_knownClients[targetIdx].trackPresence = true;
    }

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

    Serial.printf(">>> [PRESENCE] Known device stored (#%d): MAC=%s, Name=%s, Tracked=%d\n",
                  targetIdx + 1, s_knownClients[targetIdx].addr, s_knownClients[targetIdx].name, s_knownClients[targetIdx].trackPresence);
}

static void handleClientConnected(const char* macAddr) {
    if (macAddr && strlen(macAddr) > 0) {
        strncpy(s_connectedClientAddr, macAddr, sizeof(s_connectedClientAddr) - 1);
    }

    // Look up whether this device is tracked for presence
    int clientIdx = -1;
    for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
        if (s_knownClients[i].valid && strcasecmp(s_knownClients[i].addr, macAddr) == 0) {
            clientIdx = i;
            break;
        }
    }

    bool isTracked = true;
    if (clientIdx != -1) {
        isTracked = s_knownClients[clientIdx].trackPresence;
    }

    if (!isTracked) {
        Serial.printf(">>> [PRESENCE] Device connected (%s: \"%s\"), but is EXCLUDED from presence tracking (Idle Desk Device). Away/Arrival unaffected.\n",
                      macAddr, (clientIdx != -1) ? s_knownClients[clientIdx].name : "Unknown");
        return;
    }

    s_awayTimerEndMs = 0; // cancel away countdown
    bool wasAway = s_isAwayTriggered;
    s_isAwayTriggered = false;

    Serial.printf(">>> [PRESENCE] Tracked Client arrived: %s (\"%s\") | Away countdown cancelled.\n",
                  macAddr, (clientIdx != -1) ? s_knownClients[clientIdx].name : "Unknown");

    if (wasAway && s_presenceConfig.enabled) {
        Serial.println(">>> [PRESENCE] Arrival triggered! Executing configured arrival actions...");
        if (s_presenceConfig.arrivalRelayMask != 0) {
            for (int r = 0; r < RELAY_COUNT; r++) {
                if ((s_presenceConfig.arrivalRelayMask & (1 << r)) != 0) {
                    setRelayLoad(r, 1, "Presence Arrival");
                }
            }
        }
        if (s_presenceConfig.arrivalRgbOn) {
            s_ledMode = (s_presenceConfig.arrivalRgbMode > 0) ? s_presenceConfig.arrivalRgbMode : 1;
            notifyLedState();
            Serial.printf(">>> [PRESENCE] Arrival: Turned RGB ON (Mode %d)\n", s_ledMode);
        }
    }
}

static void handleClientDisconnected() {
    if (!s_presenceConfig.enabled || s_presenceConfig.awayDelayMin == 0) return;

    // Check if any tracked client remains connected
    bool anyTrackedConnected = false;
    if (s_pServer) {
        std::vector<uint16_t> peers = s_pServer->getPeerDevices();
        for (uint16_t connId : peers) {
            NimBLEConnInfo info = s_pServer->getPeerInfo(connId);
            std::string addr = info.getAddress().toString();
            for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
                if (s_knownClients[i].valid && s_knownClients[i].trackPresence && strcasecmp(s_knownClients[i].addr, addr.c_str()) == 0) {
                    anyTrackedConnected = true;
                    break;
                }
            }
        }
    }

    if (anyTrackedConnected) {
        Serial.println(">>> [PRESENCE] Client disconnected, but another tracked device is still connected. Presence active.");
    } else {
        s_awayTimerEndMs = millis() + ((uint32_t)s_presenceConfig.awayDelayMin * 60000UL);
        Serial.printf(">>> [PRESENCE] No tracked devices present. Away timer started: %d minutes countdown.\n", s_presenceConfig.awayDelayMin);
    }
}

static void evaluateSchedules(uint32_t now) {
    if (!s_timeSync.synced) return;
    uint8_t h = 0, m = 0, s = 0, dow = 0;
    getLocalTime(&h, &m, &s, &dow);
    uint16_t curDayMin = ((uint16_t)dow * 1440) + ((uint16_t)h * 60) + m;
    uint16_t curMinOfDay = ((uint16_t)h * 60) + m;

    // Periodic 30s status print for verification
    static uint32_t lastClockLogMs = 0;
    if (now - lastClockLogMs >= 30000UL) {
        lastClockLogMs = now;
        int activeCount = 0;
        for (int i = 0; i < MAX_SCHEDULES; i++) if (s_schedules[i].enabled) activeCount++;
        Serial.printf(">>> [CLOCK STATUS] %02d:%02d:%02d DOW=%d | Active Rules: %d\n",
                      h, m, s, dow, activeCount);
    }

    for (int i = 0; i < MAX_SCHEDULES; i++) {
        if (!s_schedules[i].enabled) continue;

        // Check if schedule is active for current day of week
        if ((s_schedules[i].daysMask & (1 << dow)) != 0) {
            uint16_t startMinOfDay = ((uint16_t)s_schedules[i].startHour * 60) + s_schedules[i].startMin;

            // 1. Exact Start Trigger
            if (h == s_schedules[i].startHour && m == s_schedules[i].startMin) {
                if (s_schedules[i].lastFiredDayMinute != curDayMin) {
                    s_schedules[i].lastFiredDayMinute = curDayMin;
                    Serial.printf(">>> [SCHEDULER] Rule %d START TRIGGERED! (Target: %d, Action: %d, Time: %02d:%02d)\n",
                                  i + 1, s_schedules[i].targetType, s_schedules[i].targetAction, h, m);

                    // Execute target action
                    if (s_schedules[i].targetType < RELAY_COUNT) {
                        setRelayLoad(s_schedules[i].targetType, s_schedules[i].targetAction, "Scheduler Rule");
                    } else if (s_schedules[i].targetType == 4) { // All Relays
                        if (s_schedules[i].targetAction == 0) {
                            allRelaysOff("Scheduler Rule");
                        } else {
                            for (int r = 0; r < RELAY_COUNT; r++) {
                                setRelayLoad(r, 1, "Scheduler Rule");
                            }
                        }
                    } else if (s_schedules[i].targetType == 5) { // RGB Strip
                        if (s_schedules[i].targetAction == 0) {
                            s_ledMode = 0;
                        } else {
                            s_ledMode = s_schedules[i].targetAction;
                            s_ledR    = s_schedules[i].rgbR;
                            s_ledG    = s_schedules[i].rgbG;
                            s_ledB    = s_schedules[i].rgbB;
                            s_ledBri  = s_schedules[i].rgbBri;
                        }
                        notifyLedState();
                    }

                    // Setup duration timer if stopType == 1
                    if (s_schedules[i].stopType == 1 && s_schedules[i].durationMin > 0) {
                        s_schedules[i].autoStopMs = now + ((uint32_t)s_schedules[i].durationMin * 60000UL);
                    }
                }
            }

            // 2. Direct Stop Time Trigger (stopType == 2)
            if (s_schedules[i].stopType == 2 && h == s_schedules[i].stopHour && m == s_schedules[i].stopMin) {
                uint16_t stopMarker = curDayMin + 20000;
                if (s_schedules[i].lastFiredDayMinute != stopMarker) {
                    s_schedules[i].lastFiredDayMinute = stopMarker;
                    Serial.printf(">>> [SCHEDULER] Rule %d DIRECT STOP reached! Turning target OFF.\n", i + 1);
                    if (s_schedules[i].targetType < RELAY_COUNT) {
                        setRelayLoad(s_schedules[i].targetType, 0, "Scheduler Direct Stop");
                    } else if (s_schedules[i].targetType == 4) {
                        allRelaysOff("Scheduler Direct Stop");
                    } else if (s_schedules[i].targetType == 5) {
                        s_ledMode = 0;
                        notifyLedState();
                    }
                }
            }

            // 3. Catch-up Window Trigger: If rule was enabled or device rebooted while inside active window
            if (s_schedules[i].stopType == 2) {
                uint16_t stopMinOfDay = ((uint16_t)s_schedules[i].stopHour * 60) + s_schedules[i].stopMin;
                bool inWindow = (startMinOfDay < stopMinOfDay)
                    ? (curMinOfDay >= startMinOfDay && curMinOfDay < stopMinOfDay)
                    : (curMinOfDay >= startMinOfDay || curMinOfDay < stopMinOfDay);

                if (inWindow && s_schedules[i].lastFiredDayMinute == 0xFFFF) {
                    s_schedules[i].lastFiredDayMinute = curDayMin;
                    Serial.printf(">>> [SCHEDULER] Rule %d is IN ACTIVE WINDOW (%02d:%02d-%02d:%02d)! Applying start action.\n",
                                  i + 1, s_schedules[i].startHour, s_schedules[i].startMin, s_schedules[i].stopHour, s_schedules[i].stopMin);
                    if (s_schedules[i].targetType < RELAY_COUNT) {
                        setRelayLoad(s_schedules[i].targetType, s_schedules[i].targetAction, "Scheduler Catch-up");
                    } else if (s_schedules[i].targetType == 4) {
                        if (s_schedules[i].targetAction == 0) allRelaysOff("Scheduler Catch-up");
                        else for (int r = 0; r < RELAY_COUNT; r++) setRelayLoad(r, 1, "Scheduler Catch-up");
                    } else if (s_schedules[i].targetType == 5) {
                        s_ledMode = s_schedules[i].targetAction;
                        s_ledR = s_schedules[i].rgbR; s_ledG = s_schedules[i].rgbG; s_ledB = s_schedules[i].rgbB; s_ledBri = s_schedules[i].rgbBri;
                        notifyLedState();
                    }
                }
            }
        }

        // 4. Check Duration Auto-Stop (stopType == 1)
        if (s_schedules[i].stopType == 1 && s_schedules[i].autoStopMs > 0) {
            if ((long)(now - s_schedules[i].autoStopMs) >= 0) {
                s_schedules[i].autoStopMs = 0;
                Serial.printf(">>> [SCHEDULER] Rule %d DURATION EXPIRED! Turning target OFF.\n", i + 1);
                if (s_schedules[i].targetType < RELAY_COUNT) {
                    setRelayLoad(s_schedules[i].targetType, 0, "Scheduler Duration End");
                } else if (s_schedules[i].targetType == 4) {
                    allRelaysOff("Scheduler Duration End");
                } else if (s_schedules[i].targetType == 5) {
                    s_ledMode = 0;
                    notifyLedState();
                }
            }
        }
    }
}

/* ── LED Math & Rendering Engine ─────────────────────────────────────────── */
static uint8_t scaleBrightness(uint8_t userPercent) {
    if (userPercent > 100) userPercent = 100;
    return (uint8_t)((userPercent * LED_MAX_BRIGHT) / 100);
}

static uint32_t gammaCorrect(uint8_t r, uint8_t g, uint8_t b, uint8_t bri) {
    uint32_t r_sc = (r * bri) / 255;
    uint32_t g_sc = (g * bri) / 255;
    uint32_t b_sc = (b * bri) / 255;
    uint8_t r_gam = (uint8_t)((r_sc * r_sc + 255) >> 8);
    uint8_t g_gam = (uint8_t)((g_sc * g_sc + 255) >> 8);
    uint8_t b_gam = (uint8_t)((b_sc * b_sc + 255) >> 8);
    return Adafruit_NeoPixel::Color(r_gam, g_gam, b_gam);
}

/* ── Transient Relay Animation Renderer ──────────────────────────────────── */
static void renderTransientAnimation(uint32_t now) {
    uint32_t elapsed = now - s_animStartMs;
    if (elapsed >= s_animDurationMs) {
        s_animActive = false;
        // Restore saved LED mode and parameters
        s_ledMode = s_savedLedMode;
        s_ledR    = s_savedLedR;
        s_ledG    = s_savedLedG;
        s_ledB    = s_savedLedB;
        s_ledBri  = s_savedLedBri;
        s_ledSpd  = s_savedLedSpd;
        Serial.printf("[LED-FEEDBACK] Animation complete. Auto-restored LED mode %u.\n", s_ledMode);
        if (s_ledMode == 0 || s_ledBri == 0) {
            s_strip.clear();
            s_strip.show();
        }
        return;
    }

    // Colors: Turn ON = Emerald Green (0, 255, 120) | Turn OFF = Crimson Amber-Red (255, 40, 15)
    uint8_t r = s_animIsOn ? 0   : 255;
    uint8_t g = s_animIsOn ? 255 : 40;
    uint8_t b = s_animIsOn ? 120 : 15;
    uint8_t maxBri = LED_MAX_BRIGHT;
    float progress = (float)elapsed / (float)s_animDurationMs; // 0.0 to 1.0

    switch (s_animMode) {
        case 1: { // 1. Fade In-Out / Breathe
            float sineVal = sinf(progress * 3.14159f);
            uint8_t bri = (uint8_t)(sineVal * maxBri);
            uint32_t col = gammaCorrect(r, g, b, bri);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, col);
            s_strip.show();
            break;
        }

        case 2: { // 2. Fast Pulse (2 peaks)
            float sineVal = fabsf(sinf(progress * 2.0f * 3.14159f));
            uint8_t bri = (uint8_t)(sineVal * maxBri);
            uint32_t col = gammaCorrect(r, g, b, bri);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, col);
            s_strip.show();
            break;
        }

        case 3: { // 3. Wipe Left-to-Right
            int activeIndex = (int)(progress * (LED_COUNT + 2));
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i <= activeIndex) {
                    s_strip.setPixelColor(i, gammaCorrect(r, g, b, maxBri));
                }
            }
            s_strip.show();
            break;
        }

        case 4: { // 4. Wipe Right-to-Left
            int activeIndex = (int)(progress * (LED_COUNT + 2));
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i <= activeIndex) {
                    s_strip.setPixelColor(LED_COUNT - 1 - i, gammaCorrect(r, g, b, maxBri));
                }
            }
            s_strip.show();
            break;
        }

        case 5: { // 5. Chase Left-to-Right
            int head = (int)(progress * (LED_COUNT * 2)) % LED_COUNT;
            uint32_t headCol = gammaCorrect(r, g, b, maxBri);
            uint32_t tailCol = gammaCorrect(r, g, b, maxBri / 4);
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == head) s_strip.setPixelColor(i, headCol);
                else if (i == ((head + LED_COUNT - 1) % LED_COUNT)) s_strip.setPixelColor(i, tailCol);
            }
            s_strip.show();
            break;
        }

        case 6: { // 6. Chase Right-to-Left
            int head = (LED_COUNT - 1) - ((int)(progress * (LED_COUNT * 2)) % LED_COUNT);
            uint32_t headCol = gammaCorrect(r, g, b, maxBri);
            uint32_t tailCol = gammaCorrect(r, g, b, maxBri / 4);
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == head) s_strip.setPixelColor(i, headCol);
                else if (i == ((head + 1) % LED_COUNT)) s_strip.setPixelColor(i, tailCol);
            }
            s_strip.show();
            break;
        }

        case 7: { // 7. Knight Rider / Scanner
            int cycle = (int)(progress * (LED_COUNT * 4)) % ((LED_COUNT - 1) * 2);
            int pos = (cycle < LED_COUNT) ? cycle : ((LED_COUNT - 1) * 2 - cycle);
            uint32_t headCol = gammaCorrect(r, g, b, maxBri);
            uint32_t tailCol = gammaCorrect(r, g, b, maxBri / 4);
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == pos) s_strip.setPixelColor(i, headCol);
                else if (abs(i - pos) == 1) s_strip.setPixelColor(i, tailCol);
            }
            s_strip.show();
            break;
        }

        case 8: { // 8. Double Blink
            uint32_t phase = elapsed % 400;
            bool on = (phase < 150);
            if (on) {
                uint32_t col = gammaCorrect(r, g, b, maxBri);
                for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, col);
            } else {
                s_strip.clear();
            }
            s_strip.show();
            break;
        }

        case 9: { // 9. Center Outward Pulse
            int rad = (int)(progress * 4.0f);
            uint32_t col = gammaCorrect(r, g, b, maxBri);
            s_strip.clear();
            int p1 = 3 - rad;
            int p2 = 4 + rad;
            if (p1 >= 0) s_strip.setPixelColor(p1, col);
            if (p2 < LED_COUNT) s_strip.setPixelColor(p2, col);
            s_strip.show();
            break;
        }

        case 10: { // 10. Rainbow Wave
            uint16_t baseHue = (uint16_t)(progress * 65536.0f);
            for (int i = 0; i < LED_COUNT; i++) {
                uint16_t pixelHue = baseHue + (i * 65536UL / LED_COUNT);
                uint32_t rawColor = s_strip.ColorHSV(pixelHue, 255, maxBri);
                uint8_t cr = (uint8_t)(rawColor >> 16);
                uint8_t cg = (uint8_t)(rawColor >> 8);
                uint8_t cb = (uint8_t)(rawColor);
                s_strip.setPixelColor(i, gammaCorrect(cr, cg, cb, 255));
            }
            s_strip.show();
            break;
        }

        default:
            s_animActive = false;
            break;
    }
}

static void renderLeds() {
    static uint32_t lastRenderMs = 0;
    uint32_t now = millis();
    if (now - lastRenderMs < 25) return; // ~40 FPS rendering
    lastRenderMs = now;

    // Handle Transient Relay Animation if active
    if (s_animActive) {
        renderTransientAnimation(now);
        return;
    }

    uint8_t maxBri = scaleBrightness(s_ledBri);
    if (s_ledMode == 0 || maxBri == 0) {
        s_strip.clear();
        s_strip.show();
        return;
    }

    uint8_t spd = s_ledSpd < 1 ? 1 : (s_ledSpd > 10 ? 10 : s_ledSpd);

    switch (s_ledMode) {
        case 1: { // 1. Solid
            uint32_t color = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, color);
            s_strip.show();
            break;
        }

        case 2: { // 2. Breathe / Fade In-Out
            uint32_t period = 4200 - (spd * 340);
            float phase = (float)(now % period) / (float)period;
            float sineVal = (sinf(phase * 2.0f * 3.14159f - 1.5708f) + 1.0f) * 0.5f; // 0.0 to 1.0
            uint8_t bBri = (uint8_t)(sineVal * maxBri);
            uint32_t color = gammaCorrect(s_ledR, s_ledG, s_ledB, bBri);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, color);
            s_strip.show();
            break;
        }

        case 3: { // 3. Rainbow Wave
            uint32_t period = 6500 - (spd * 550);
            uint16_t baseHue = (uint16_t)(((now % period) * 65536UL) / period);
            for (int i = 0; i < LED_COUNT; i++) {
                uint16_t pixelHue = baseHue + (i * 65536UL / LED_COUNT);
                uint32_t rawColor = s_strip.ColorHSV(pixelHue, 255, maxBri);
                uint8_t r = (uint8_t)(rawColor >> 16);
                uint8_t g = (uint8_t)(rawColor >> 8);
                uint8_t b = (uint8_t)(rawColor);
                s_strip.setPixelColor(i, gammaCorrect(r, g, b, 255));
            }
            s_strip.show();
            break;
        }

        case 4: { // 4. Blink (Strict <= 3 flashes per sec -> cycle >= 350ms)
            uint32_t cycleMs = 1200 - (spd * 85);
            if (cycleMs < 350) cycleMs = 350;
            bool isOn = ((now % cycleMs) < (cycleMs / 2));
            if (isOn) {
                uint32_t color = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
                for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, color);
            } else {
                s_strip.clear();
            }
            s_strip.show();
            break;
        }

        case 5: { // 5. Chase Left-to-Right (0 -> 7)
            uint32_t stepInterval = 240 - (spd * 20);
            uint8_t head = (now / stepInterval) % LED_COUNT;
            uint32_t headCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            uint32_t tailCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri / 4);
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == head) s_strip.setPixelColor(i, headCol);
                else if (i == ((head + LED_COUNT - 1) % LED_COUNT)) s_strip.setPixelColor(i, tailCol);
            }
            s_strip.show();
            break;
        }

        case 6: { // 6. Chase Right-to-Left (7 -> 0)
            uint32_t stepInterval = 240 - (spd * 20);
            uint8_t head = (LED_COUNT - 1) - ((now / stepInterval) % LED_COUNT);
            uint32_t headCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            uint32_t tailCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri / 4);
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == head) s_strip.setPixelColor(i, headCol);
                else if (i == ((head + 1) % LED_COUNT)) s_strip.setPixelColor(i, tailCol);
            }
            s_strip.show();
            break;
        }

        case 7: { // 7. Color Cycle (Whole strip smoothly transitions through hues together)
            uint32_t period = 7000 - (spd * 600);
            uint16_t hue = (uint16_t)(((now % period) * 65536UL) / period);
            uint32_t rawColor = s_strip.ColorHSV(hue, 255, maxBri);
            uint8_t r = (uint8_t)(rawColor >> 16);
            uint8_t g = (uint8_t)(rawColor >> 8);
            uint8_t b = (uint8_t)(rawColor);
            uint32_t color = gammaCorrect(r, g, b, 255);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, color);
            s_strip.show();
            break;
        }

        case 8: { // 8. Scanner / Knight Rider (Bounce 0 -> 7 -> 0)
            uint32_t stepInterval = 180 - (spd * 14);
            uint16_t step = (now / stepInterval) % ((LED_COUNT - 1) * 2);
            uint8_t pos = (step < LED_COUNT) ? step : ((LED_COUNT - 1) * 2 - step);
            uint32_t headCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            uint32_t tailCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri / 5);
            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == pos) s_strip.setPixelColor(i, headCol);
                else if (abs(i - pos) == 1) s_strip.setPixelColor(i, tailCol);
            }
            s_strip.show();
            break;
        }

        case 9: { // 9. Sparkle / Twinkle
            uint32_t stepInterval = 140 - (spd * 10);
            static uint32_t lastSparkleMs = 0;
            static uint8_t sparklePixel = 0;
            if (now - lastSparkleMs >= stepInterval) {
                lastSparkleMs = now;
                sparklePixel = random(LED_COUNT);
            }
            uint32_t dimCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri / 4);
            uint32_t brightCol = gammaCorrect(255, 255, 255, maxBri);
            for (int i = 0; i < LED_COUNT; i++) {
                s_strip.setPixelColor(i, (i == sparklePixel) ? brightCol : dimCol);
            }
            s_strip.show();
            break;
        }

        case 10: { // 10. Center Outward Pulse (Expand from 3,4 out to 0,7)
            uint32_t period = 2400 - (spd * 200);
            uint16_t frame = (now % period);
            float p = (float)frame / (float)period;
            int radius = (int)(p * 4.0f);
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            uint32_t dim = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri / 6);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, dim);
            int p1 = 3 - radius;
            int p2 = 4 + radius;
            if (p1 >= 0) s_strip.setPixelColor(p1, col);
            if (p2 < LED_COUNT) s_strip.setPixelColor(p2, col);
            s_strip.show();
            break;
        }

        case 11: { // 11. Dual Chase (Two dots crossing from 0->7 and 7->0)
            uint32_t stepInterval = 220 - (spd * 18);
            uint8_t p1 = (now / stepInterval) % LED_COUNT;
            uint8_t p2 = (LED_COUNT - 1) - p1;
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            s_strip.clear();
            s_strip.setPixelColor(p1, col);
            s_strip.setPixelColor(p2, col);
            s_strip.show();
            break;
        }

        case 12: { // 12. Wipe Left-to-Right
            uint32_t stepInterval = 200 - (spd * 16);
            uint16_t cycle = (now / stepInterval) % (LED_COUNT * 2);
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            s_strip.clear();
            if (cycle < LED_COUNT) {
                for (int i = 0; i <= cycle; i++) s_strip.setPixelColor(i, col);
            } else {
                for (int i = (cycle - LED_COUNT); i < LED_COUNT; i++) s_strip.setPixelColor(i, col);
            }
            s_strip.show();
            break;
        }

        case 13: { // 13. Wipe Right-to-Left
            uint32_t stepInterval = 200 - (spd * 16);
            uint16_t cycle = (now / stepInterval) % (LED_COUNT * 2);
            uint32_t col = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            s_strip.clear();
            if (cycle < LED_COUNT) {
                for (int i = 0; i <= cycle; i++) s_strip.setPixelColor(LED_COUNT - 1 - i, col);
            } else {
                for (int i = (cycle - LED_COUNT); i < LED_COUNT; i++) s_strip.setPixelColor(LED_COUNT - 1 - i, col);
            }
            s_strip.show();
            break;
        }

        case 14: { // 14. Fire / Warm Candle Flicker
            uint32_t stepInterval = 80 - (spd * 5);
            static uint32_t lastFlickerMs = 0;
            static uint8_t flickerBri[LED_COUNT];
            if (now - lastFlickerMs >= stepInterval) {
                lastFlickerMs = now;
                for (int i = 0; i < LED_COUNT; i++) {
                    flickerBri[i] = random(maxBri / 2, maxBri + 1);
                }
            }
            for (int i = 0; i < LED_COUNT; i++) {
                s_strip.setPixelColor(i, gammaCorrect(255, 80, 10, flickerBri[i]));
            }
            s_strip.show();
            break;
        }

        case 15: { // 15. Aurora Wave
            uint32_t period = 4500 - (spd * 350);
            for (int i = 0; i < LED_COUNT; i++) {
                float wave = sinf(((float)now / (float)period) * 2.0f * 3.14159f + (float)i * 0.7f);
                float factor = (wave + 1.0f) * 0.5f;
                uint8_t r = (uint8_t)(s_ledR * factor + (20 * (1.0f - factor)));
                uint8_t g = (uint8_t)(s_ledG * factor + (255 * (1.0f - factor)));
                uint8_t b = (uint8_t)(s_ledB * factor + (180 * (1.0f - factor)));
                s_strip.setPixelColor(i, gammaCorrect(r, g, b, maxBri));
            }
            s_strip.show();
            break;
        }

        case 16: { // 16. Music Reactive 10 Disco Styles (Dedicated independent brightness cap)
            uint8_t mBri = scaleBrightness(s_musicBri);
            if (mBri == 0) {
                s_strip.clear();
                s_strip.show();
                break;
            }

            uint8_t beat = s_musicBeatVal; // 0..255
            uint32_t now = millis();

            switch (s_musicSubMode) {
                case 0: { // 0. 🕺 Disco Club Party: Rotating party hues, beats trigger energetic color jumps
                    static uint16_t partyShift = 0;
                    static uint32_t lastBeatMs = 0;
                    if (beat > 140 && (now - lastBeatMs > 160)) {
                        partyShift = (partyShift + 13107) % 65536; // Jump 72 degrees on beat
                        lastBeatMs = now;
                    }
                    uint8_t pulseBri = (uint8_t)((beat * (uint16_t)mBri) / 255);
                    uint8_t minGlow = mBri / 5;
                    uint8_t activeBri = (pulseBri > minGlow) ? pulseBri : minGlow;
                    for (int i = 0; i < LED_COUNT; i++) {
                        uint16_t hue = (partyShift + (i * 65536UL / LED_COUNT)) % 65536;
                        uint32_t c = s_strip.ColorHSV(hue, 255, activeBri);
                        s_strip.setPixelColor(i, c);
                    }
                    break;
                }

                case 1: { // 1. 💥 Bass Burst: Outward explosion from center 2 LEDs (3 & 4) on kick drum
                    int radius = (beat * 4) / 255; // 0..3
                    uint8_t expBri = (uint8_t)((beat * (uint16_t)mBri) / 255);
                    s_strip.clear();
                    for (int i = 0; i < LED_COUNT; i++) {
                        int dist = (i < 4) ? (3 - i) : (i - 4);
                        if (dist <= radius) {
                            uint8_t fade = mBri - (dist * (mBri / 4));
                            // Center hot-pink / outer neon-cyan explosion
                            uint32_t col = (dist == 0) ? gammaCorrect(255, 0, 180, expBri) : gammaCorrect(0, 240, 255, fade);
                            s_strip.setPixelColor(i, col);
                        }
                    }
                    break;
                }

                case 2: { // 2. ⚡ Neon Beat Strobe: Club strobe flash on drum/bass hit, dims between beats
                    if (beat > 130) {
                        for (int i = 0; i < LED_COUNT; i++) {
                            s_strip.setPixelColor(i, gammaCorrect(245, 250, 255, mBri));
                        }
                    } else {
                        uint8_t dimBri = (uint8_t)((beat * (uint16_t)mBri) / 360);
                        for (int i = 0; i < LED_COUNT; i++) {
                            s_strip.setPixelColor(i, gammaCorrect(130, 0, 255, dimBri));
                        }
                    }
                    break;
                }

                case 3: { // 3. 🌊 Rhythm Ripple: Flowing light wave whose speed & glow are driven by music tempo
                    static uint16_t waveHead = 0;
                    uint8_t waveSpeed = 1 + (beat / 35);
                    waveHead = (waveHead + waveSpeed) % 80;
                    int headPos = waveHead / 10;
                    for (int i = 0; i < LED_COUNT; i++) {
                        int diff = abs(i - headPos);
                        uint8_t bri = (diff == 0) ? mBri : (diff == 1 ? mBri / 2 : (mBri / 6));
                        uint16_t hue = (28000 + (i * 4500)) % 65536; // Cyan -> Electric Blue -> Purple
                        s_strip.setPixelColor(i, s_strip.ColorHSV(hue, 255, bri));
                    }
                    break;
                }

                case 4: { // 4. ✨ Disco Sparkle: High frequency beats cause shimmering random starbursts
                    s_strip.clear();
                    uint8_t hiEnergy = (s_musicLevels[5] + s_musicLevels[6] + s_musicLevels[7]) / 3;
                    for (int i = 0; i < LED_COUNT; i++) {
                        if (s_musicLevels[i] > 110 || (hiEnergy > 90 && random(10) < 4)) {
                            uint16_t sparkHue = random(65536);
                            s_strip.setPixelColor(i, s_strip.ColorHSV(sparkHue, 255, mBri));
                        } else if (beat > 60) {
                            s_strip.setPixelColor(i, gammaCorrect(40, 0, 80, mBri / 8));
                        }
                    }
                    break;
                }

                case 5: { // 5. 🌈 Color Beat Pump: Rainbow cycling where brightness & intensity pump to the beat
                    uint16_t hue = (now * 24) % 65536;
                    uint8_t pumpBri = (uint8_t)((beat * (uint16_t)mBri) / 255);
                    uint8_t floorBri = mBri / 6;
                    uint8_t finalBri = (pumpBri > floorBri) ? pumpBri : floorBri;
                    for (int i = 0; i < LED_COUNT; i++) {
                        uint16_t pixelHue = (hue + (i * 65536UL / LED_COUNT)) % 65536;
                        s_strip.setPixelColor(i, s_strip.ColorHSV(pixelHue, 255, finalBri));
                    }
                    break;
                }

                case 6: { // 6. ⚔️ Dual Clash: Beams fire from ends (0 and 7) and collide at center on beat
                    int pos = (beat * 4) / 255; // 0..3
                    s_strip.clear();
                    for (int i = 0; i < LED_COUNT; i++) {
                        if (i <= pos) {
                            s_strip.setPixelColor(i, gammaCorrect(0, 255, 200, mBri)); // Cyan beam
                        }
                        if ((7 - i) <= pos) {
                            s_strip.setPixelColor(7 - i, gammaCorrect(255, 0, 120, mBri)); // Magenta beam
                        }
                    }
                    if (pos >= 3) { // Center clash flash
                        s_strip.setPixelColor(3, gammaCorrect(255, 255, 255, mBri));
                        s_strip.setPixelColor(4, gammaCorrect(255, 255, 255, mBri));
                    }
                    break;
                }

                case 7: { // 7. 🎶 Cyber Spectrum: Dynamic cyberpunk 8-band frequency visualizer
                    for (int i = 0; i < LED_COUNT; i++) {
                        uint8_t lvl = s_musicLevels[i];
                        if (lvl < 15) {
                            s_strip.setPixelColor(i, 0);
                        } else {
                            uint16_t hue = (48000 + (i * 4500)) % 65536;
                            uint8_t briVal = (uint8_t)((lvl * (uint16_t)mBri) / 255);
                            s_strip.setPixelColor(i, s_strip.ColorHSV(hue, 255, briVal));
                        }
                    }
                    break;
                }

                case 8: { // 8. 🔥 Fire Dance: Flames that flare up into blinding white-hot peaks on beat
                    for (int i = 0; i < LED_COUNT; i++) {
                        uint8_t flameVal = s_musicLevels[i];
                        if (beat > 150) flameVal = (flameVal / 2) + (beat / 2);
                        uint8_t briVal = (uint8_t)((flameVal * (uint16_t)mBri) / 255);
                        if (briVal < 10) {
                            s_strip.setPixelColor(i, 0);
                        } else if (briVal > (mBri * 85) / 100) {
                            s_strip.setPixelColor(i, gammaCorrect(255, 240, 160, briVal));
                        } else if (briVal > (mBri * 50) / 100) {
                            s_strip.setPixelColor(i, gammaCorrect(255, 120, 0, briVal));
                        } else {
                            s_strip.setPixelColor(i, gammaCorrect(220, 25, 0, briVal));
                        }
                    }
                    break;
                }

                case 9: { // 9. 🎯 Solo Beat Sync: User's custom color pulses & breathes synchronized to the song's beat
                    uint8_t pulseBri = (uint8_t)((beat * (uint16_t)mBri) / 255);
                    uint8_t floorBri = mBri / 8; // Gentle minimum glow so it doesn't vanish entirely
                    uint8_t activeBri = (pulseBri > floorBri) ? pulseBri : floorBri;
                    uint32_t col = gammaCorrect(s_musicColorR, s_musicColorG, s_musicColorB, activeBri);
                    for (int i = 0; i < LED_COUNT; i++) {
                        s_strip.setPixelColor(i, col);
                    }
                    break;
                }

                default:
                    s_strip.clear();
                    break;
            }
            s_strip.show();
            break;
        }

        default:
            s_strip.clear();
            s_strip.show();
            break;
    }
}

/* ── Non-Blocking NimBLE Callbacks ───────────────────────────────────────── */
class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        (void)pServer;
        s_connected = true;
        s_flagConnected = true;
        NimBLEAddress addr = connInfo.getAddress();
        strncpy(s_connectedClientAddr, addr.toString().c_str(), sizeof(s_connectedClientAddr) - 1);
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        (void)pServer; (void)connInfo;
        s_connected = false;
        s_discReason = reason;
        s_flagDisconnected = true;
        NimBLEDevice::startAdvertising();
    }
};

class RelayCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t payload[12];
        buildRelayPayload(payload);
        pChr->setValue(payload, 12);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        NimBLEAttValue val = pChr->getValue();
        enqueueCmd(WT_RELAY, val.data(), val.length());
    }
};

class LedCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t payload[6] = { s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd };
        pChr->setValue(payload, 6);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        NimBLEAttValue val = pChr->getValue();
        enqueueCmd(WT_LED, val.data(), val.length());
    }
};

class ConfigCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t payload[335];
        memset(payload, 0, sizeof(payload));

        // 4 Relay Records (25 bytes each, offsets 0, 25, 50, 75)
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

        // Device Name Record (Offset 100)
        size_t dlen = strlen(s_deviceName);
        if (dlen > 20) dlen = 20;
        payload[100] = (uint8_t)dlen;
        memcpy(&payload[101], s_deviceName, dlen);

        // Presence Settings Record (Offset 125)
        payload[125] = s_presenceConfig.enabled ? 1 : 0;
        payload[126] = s_presenceConfig.awayDelayMin & 0xFF;
        payload[127] = (s_presenceConfig.awayDelayMin >> 8) & 0xFF;
        payload[128] = s_presenceConfig.awayRelayMask;
        payload[129] = s_presenceConfig.awayRgbOff ? 1 : 0;
        payload[130] = s_presenceConfig.arrivalRelayMask;
        payload[131] = s_presenceConfig.arrivalRgbOn ? 1 : 0;
        payload[132] = s_presenceConfig.arrivalRgbMode;

        // 10 Known Paired Client Records (20 bytes each, starting at offset 135)
        for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
            int off = 135 + i * 20;
            payload[off + 0] = s_knownClients[i].valid ? 1 : 0;
            payload[off + 1] = s_knownClients[i].trackPresence ? 1 : 0;
            size_t nlen = strlen(s_knownClients[i].name);
            if (nlen > 17) nlen = 17;
            payload[off + 2] = (uint8_t)nlen;
            memcpy(&payload[off + 3], s_knownClients[i].name, nlen);
        }

        pChr->setValue(payload, sizeof(payload));
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        NimBLEAttValue val = pChr->getValue();
        enqueueCmd(WT_CONFIG, val.data(), val.length());
    }
};

class InfoCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        char buf[128];
        snprintf(buf, sizeof(buf), "%s | Name: %s | Uptime: %lus", BUILD_MARKER, s_deviceName, (unsigned long)(millis() / 1000UL));
        pChr->setValue((uint8_t*)buf, strlen(buf));
    }
};

class EnvCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t payload[14];
        buildEnvPayload(payload);
        pChr->setValue(payload, sizeof(payload));
    }
};

/* ── Setup ───────────────────────────────────────────────────────────────── */
void setup() {
    // 1. SAFETY LINE 1: Force all 4 relay pins to initial resting level (HIGH for active-LOW opto-isolated)
    for (int i = 0; i < RELAY_COUNT; i++) {
        digitalWrite(RELAY_PINS[i], HIGH);
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH);
    }

    // 2. Initialize Serial
    Serial.begin(115200);
    delay(100);

    // Initialize Buzzer and DHT pins
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(DHT_PIN, INPUT_PULLUP);

    // 3. Load runtime configuration & schedules from NVS
    loadConfigsFromNVS();
    loadSchedulesFromNVS();
    loadPresenceFromNVS();
    loadTimeBaseFromNVS();

    // Print Boot Banner with exact BUILD marker
    Serial.println("\n\n==================================================");
    Serial.println("         SMARTDESK V2 CONTROLLER (ESP32-S3)       ");
    Serial.println("==================================================");
    Serial.println(">>> " BUILD_MARKER);
    Serial.printf("Relays: CH1=GPIO4, CH2=GPIO5, CH3=GPIO6, CH4=GPIO7\n");
    Serial.printf("LEDs  : 8x WS2812B on GPIO8 (16 Modes, Auto-Restore Relay Actions)\n");
    Serial.printf("DHT11 : Data on GPIO%d (3.3V, GND)\n", DHT_PIN);
    Serial.printf("Buzzer: Active Buzzer (B27) on GPIO%d (HIGH=Beep, LOW=Silent)\n", BUZZER_PIN);
    Serial.println("Scheduler: 8 NVS Rules • Synchronized to Browser Real Time");
    Serial.printf("Presence: Max 10 Paired Devices • Away Timer = %d min\n", s_presenceConfig.awayDelayMin);
    Serial.printf("BLE   : Name=\"%s\"\n", s_deviceName);
    Serial.printf("Service UUID: %s\n", SERVICE_UUID);
    Serial.println("Serial Commands: Keys 1..4 = Toggle Relay | 0 = All Off");
    Serial.println("==================================================\n");

    // 4. Re-apply physical pin level based on load=0 and loaded wiring contact
    for (int i = 0; i < RELAY_COUNT; i++) {
        applyRelayPin(i, 0, "Boot Init");
    }

    // 5. Initialize NeoPixel Strip
    s_strip.begin();
    s_strip.clear();
    s_strip.show();

    // 6. Initialize NimBLE with Security & Bonding enabled for Auto-Connect
    NimBLEDevice::init(s_deviceName);
    NimBLEDevice::setSecurityAuth(true, true, true);
    NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

    s_pServer = NimBLEDevice::createServer();
    // Setup BLE HID Device (Consumer Control / Media Remote) for OS background auto-connect
    static const uint8_t hidReportDesc[] = {
        0x05, 0x0C,        // Usage Page (Consumer)
        0x09, 0x01,        // Usage (Consumer Control)
        0xA1, 0x01,        // Collection (Application)
        0x85, 0x01,        //   Report ID (1)
        0x09, 0xE9,        //   Usage (Volume Increment)
        0x09, 0xEA,        //   Usage (Volume Decrement)
        0x09, 0xE2,        //   Usage (Mute)
        0x09, 0xCD,        //   Usage (Play/Pause)
        0x09, 0xB5,        //   Usage (Scan Next Track)
        0x09, 0xB6,        //   Usage (Scan Previous Track)
        0x15, 0x00,        //   Logical Minimum (0)
        0x25, 0x01,        //   Logical Maximum (1)
        0x75, 0x01,        //   Report Size (1)
        0x95, 0x06,        //   Report Count (6)
        0x81, 0x02,        //   Input (Data,Var,Abs)
        0x75, 0x01,        //   Report Size (1)
        0x95, 0x02,        //   Report Count (2)
        0x81, 0x03,        //   Input (Const,Var,Abs)
        0xC0               // End Collection
    };
    s_pHid = new NimBLEHIDDevice(s_pServer);
    s_pHid->setManufacturer("SmartDesk");
    s_pHid->setPnp(0x02, 0x02e5, 0xabcd, 0x0110);
    s_pHid->setHidInfo(0x00, 0x01);
    s_pHid->setReportMap((uint8_t*)hidReportDesc, sizeof(hidReportDesc));
    s_pHid->setBatteryLevel(100);
    static ServerCallbacks srvCb;
    s_pServer->setCallbacks(&srvCb);

    NimBLEService* pService = s_pServer->createService(SERVICE_UUID);

    // RELAY: READ, WRITE (with response), NOTIFY
    s_pRelayChar = pService->createCharacteristic(
        CHAR_RELAY_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    static RelayCallbacks relayCb;
    s_pRelayChar->setCallbacks(&relayCb);
    uint8_t initRelay[12];
    buildRelayPayload(initRelay);
    s_pRelayChar->setValue(initRelay, 12);

    // LED: READ, WRITE (with response), NOTIFY
    s_pLedChar = pService->createCharacteristic(
        CHAR_LED_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    static LedCallbacks ledCb;
    s_pLedChar->setCallbacks(&ledCb);
    uint8_t initLed[6] = { s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd };
    s_pLedChar->setValue(initLed, 6);

    // CONFIG: READ, WRITE (with response)
    s_pConfigChar = pService->createCharacteristic(
        CHAR_CONFIG_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    static ConfigCallbacks configCb;
    s_pConfigChar->setCallbacks(&configCb);

    // INFO: READ
    s_pInfoChar = pService->createCharacteristic(
        CHAR_INFO_UUID,
        NIMBLE_PROPERTY::READ
    );
    static InfoCallbacks infoCb;
    s_pInfoChar->setCallbacks(&infoCb);

    // ENV: READ, NOTIFY (Temp, Humidity, Buzzer State, Clock Sync)
    s_pEnvChar = pService->createCharacteristic(
        CHAR_ENV_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    static EnvCallbacks envCb;
    s_pEnvChar->setCallbacks(&envCb);
    uint8_t initEnv[11];
    buildEnvPayload(initEnv);
    s_pEnvChar->setValue(initEnv, 11);

    pService->start();

    // 7. Setup Advertising
    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    pAdv->setAppearance(GENERIC_HID);
    pAdv->addServiceUUID(NimBLEUUID(SERVICE_UUID));
    if (s_pHid) {
        pAdv->addServiceUUID(s_pHid->getHidService()->getUUID());
    }

    NimBLEAdvertisementData advData;
    advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
    advData.setName(s_deviceName);
    pAdv->setAdvertisementData(advData);

    NimBLEAdvertisementData scanData;
    scanData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
    pAdv->setScanResponseData(scanData);

    // Fast advertising interval: 20ms to 40ms for lightning-fast reconnects
    pAdv->setMinInterval(32);
    pAdv->setMaxInterval(64);

    pAdv->start();
    Serial.printf(">>> [BLE] Advertising started as \"%s\". Ready for connections.\n", s_deviceName);
}

/* ── Main Loop ───────────────────────────────────────────────────────────── */
void loop() {
    // 1. Process deferred Connect/Disconnect events
    if (s_flagConnected) {
        s_flagConnected = false;
        Serial.printf(">>> [BLE CONNECT] Client connected to \"%s\" (Addr: %s).\n", s_deviceName, s_connectedClientAddr);
        handleClientConnected(s_connectedClientAddr);
        notifyRelayState();
        notifyLedState();
        notifyEnvState();
    }

    if (s_flagDisconnected) {
        s_flagDisconnected = false;
        int r = s_discReason;
        Serial.printf(">>> [BLE DISCONNECT] Client disconnected. Reason: %d (0x%04X, HCI 0x%02X)\n",
                      r, (unsigned int)r, (unsigned int)(r & 0xFF));
        handleClientDisconnected();
        NimBLEDevice::startAdvertising();
        Serial.println(">>> [BLE] Advertising restarted.");
        notifyEnvState();
    }

    // 2. Process Command Queue from BLE callbacks
    while (s_cmdTail != s_cmdHead) {
        WriteCmd cmd = s_cmdQueue[s_cmdTail];
        s_cmdTail = (s_cmdTail + 1) % CMD_QUEUE_SIZE;

        if (cmd.type == WT_RELAY && cmd.len >= 1) {
            uint8_t op = cmd.data[0];
            if (op == 1 && cmd.len >= 3) { // [1, idx, val]
                uint8_t idx = cmd.data[1];
                uint8_t val = cmd.data[2];
                Serial.printf(">>> [BLE CMD] Set Relay %d -> %s\n", idx + 1, val ? "ON" : "OFF");
                setRelayLoad(idx, val, "BLE Set Relay");
            } else if (op == 2 && cmd.len >= 4) { // [2, idx, minLo, minHi]
                uint8_t idx = cmd.data[1];
                uint16_t mins = cmd.data[2] | ((uint16_t)cmd.data[3] << 8);
                Serial.printf(">>> [BLE CMD] Set Timer Relay %d -> %u min\n", idx + 1, mins);
                setRelayTimer(idx, mins);
            } else if (op == 3) { // [3] All off
                allRelaysOff("BLE All-Off");
            }
        } else if (cmd.type == WT_LED && cmd.len >= 6) {
            uint8_t newMode = cmd.data[0];
            if (newMode == 16) {
                // Music Sync Mode: independent brightness cap in cmd.data[1]
                s_ledMode = 16;
                s_musicBri = cmd.data[1];
                if (cmd.len >= 15) {
                    // 15 bytes: [16, musicBri, subMode, beatVal, r, g, b, b0..b7]
                    s_musicSubMode = cmd.data[2];
                    s_musicBeatVal = cmd.data[3];
                    s_musicColorR  = cmd.data[4];
                    s_musicColorG  = cmd.data[5];
                    s_musicColorB  = cmd.data[6];
                    for (int i = 0; i < 8; i++) {
                        s_musicLevels[i] = cmd.data[7 + i];
                    }
                } else if (cmd.len >= 10) {
                    s_musicSubMode = 7; // Cyber Spectrum fallback
                    for (int i = 0; i < 8; i++) {
                        s_musicLevels[i] = cmd.data[2 + i];
                    }
                } else {
                    s_musicSubMode = 9; // Solo Beat Sync fallback
                    s_musicBeatVal = cmd.data[2];
                    s_musicColorR  = cmd.data[3];
                    s_musicColorG  = cmd.data[4];
                    s_musicColorB  = cmd.data[5];
                }
            } else {
                s_ledMode = cmd.data[0];
                s_ledR    = cmd.data[1];
                s_ledG    = cmd.data[2];
                s_ledB    = cmd.data[3];
                s_ledBri  = cmd.data[4];
                s_ledSpd  = cmd.data[5];
                // If transient animation was running, update saved state so change is retained
                if (s_animActive) {
                    s_savedLedMode = s_ledMode;
                    s_savedLedR    = s_ledR;
                    s_savedLedG    = s_ledG;
                    s_savedLedB    = s_ledB;
                    s_savedLedBri  = s_ledBri;
                    s_savedLedSpd  = s_ledSpd;
                }
                Serial.printf(">>> [BLE CMD] LED Update: Mode=%u RGB=(%u,%u,%u) Bri=%u%% Spd=%u\n",
                              s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd);
                notifyLedState();
            }
        } else if (cmd.type == WT_CONFIG && cmd.len >= 1) {
            if (cmd.data[0] == 0xFE) { // 0xFE = Device Rename [0xFE, len, ...nameBytes]
                uint8_t nameLen = cmd.data[1];
                if (nameLen > 20) nameLen = 20;
                if (nameLen > 0 && cmd.len >= 2 + nameLen) {
                    memset(s_deviceName, 0, sizeof(s_deviceName));
                    memcpy(s_deviceName, &cmd.data[2], nameLen);

                    s_prefs.begin("desk_cfg", false);
                    s_prefs.putString("dev_name", s_deviceName);
                    s_prefs.end();

                    Serial.printf(">>> [BLE CMD] Device Renamed to: '%s'\n", s_deviceName);

                    // Update live BLE advertising
                    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
                    pAdv->stop();
                    NimBLEAdvertisementData advData;
                    advData.setFlags(0x06);
                    advData.setName(s_deviceName);
                    pAdv->setAdvertisementData(advData);
                    NimBLEAdvertisementData scanData;
                    scanData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
                    pAdv->setScanResponseData(scanData);
                    pAdv->start();
                    Serial.printf(">>> [BLE] Advertising updated with new name: \"%s\"\n", s_deviceName);
                }
            } else if (cmd.len >= 9 && cmd.data[0] < RELAY_COUNT) { // Relay Config [idx, wiring, onEn, onMd, onDu, offEn, offMd, offDu, nameLen, ...name]
                uint8_t idx         = cmd.data[0];
                uint8_t wiring      = cmd.data[1];
                uint8_t onEn        = cmd.data[2];
                uint8_t onMd        = cmd.data[3];
                uint8_t onDu        = cmd.data[4];
                uint8_t offEn       = cmd.data[5];
                uint8_t offMd       = cmd.data[6];
                uint8_t offDu       = cmd.data[7];
                uint8_t nameLen     = cmd.data[8];
                if (idx < RELAY_COUNT) {
                    s_relayConfigs[idx].wiring          = wiring ? 1 : 0;
                    s_relayConfigs[idx].onAnimEnabled   = onEn ? 1 : 0;
                    s_relayConfigs[idx].onAnimMode      = onMd;
                    s_relayConfigs[idx].onAnimDuration  = onDu ? onDu : 2;
                    s_relayConfigs[idx].offAnimEnabled  = offEn ? 1 : 0;
                    s_relayConfigs[idx].offAnimMode     = offMd;
                    s_relayConfigs[idx].offAnimDuration = offDu ? offDu : 2;
                    memset(s_relayConfigs[idx].name, 0, sizeof(s_relayConfigs[idx].name));
                    if (nameLen > 16) nameLen = 16;
                    if (cmd.len >= 9 + nameLen) {
                        memcpy(s_relayConfigs[idx].name, &cmd.data[9], nameLen);
                    }
                    saveConfigToNVS(idx);
                    // Re-apply physical pin level based on updated wiring contact
                    applyRelayPin(idx, s_relayLoads[idx], "Wiring/Config Updated");
                    notifyRelayState();
                }
            } else if (cmd.data[0] == 0xFD && cmd.len >= 2) { // 0xFD: Master Buzzer Toggle [0xFD, enabled 0/1]
                s_buzzerMasterEnabled = (cmd.data[1] == 1);
                s_prefs.begin("desk_cfg", false);
                s_prefs.putBool("buzz_en", s_buzzerMasterEnabled);
                s_prefs.end();
                Serial.printf(">>> [BLE CMD] Master Buzzer %s\n", s_buzzerMasterEnabled ? "ENABLED" : "MUTED");
                notifyEnvState();
            } else if (cmd.data[0] == 0xFC && cmd.len >= 5) { // 0xFC: Relay Buzzer Config [0xFC, idx, beepOn, beepOff, beepEnd]
                uint8_t idx = cmd.data[1];
                if (idx < RELAY_COUNT) {
                    s_buzzerConfigs[idx].beepOn       = (cmd.data[2] == 1);
                    s_buzzerConfigs[idx].beepOff      = (cmd.data[3] == 1);
                    s_buzzerConfigs[idx].beepTimerEnd = (cmd.data[4] == 1);
                    s_prefs.begin("desk_cfg", false);
                    char kOn[16], kOff[16], kEnd[16];
                    snprintf(kOn, sizeof(kOn), "bz_on_%d", idx);
                    snprintf(kOff, sizeof(kOff), "bz_of_%d", idx);
                    snprintf(kEnd, sizeof(kEnd), "bz_en_%d", idx);
                    s_prefs.putBool(kOn, s_buzzerConfigs[idx].beepOn);
                    s_prefs.putBool(kOff, s_buzzerConfigs[idx].beepOff);
                    s_prefs.putBool(kEnd, s_buzzerConfigs[idx].beepTimerEnd);
                    s_prefs.end();
                    Serial.printf(">>> [BLE CMD] Relay %d Buzzer: On=%d Off=%d End=%d\n",
                                  idx + 1, s_buzzerConfigs[idx].beepOn, s_buzzerConfigs[idx].beepOff, s_buzzerConfigs[idx].beepTimerEnd);
                }
            } else if (cmd.data[0] == 0xFB && cmd.len >= 5) { // 0xFB: Time Sync [0xFB, hour, min, sec, dow]
                uint8_t h   = cmd.data[1];
                uint8_t m   = cmd.data[2];
                uint8_t s   = cmd.data[3];
                uint8_t dow = cmd.data[4];
                s_timeSync.synced = true;
                s_timeSync.baseLocalSec = ((uint32_t)dow * 86400UL) + ((uint32_t)h * 3600UL) + ((uint32_t)m * 60UL) + s;
                s_timeSync.syncMillis = millis();
                saveTimeBaseToNVS();
                // Reset rule evaluation flags so any currently active window triggers immediately!
                for (int i = 0; i < MAX_SCHEDULES; i++) {
                    s_schedules[i].lastFiredDayMinute = 0xFFFF;
                }
                Serial.printf(">>> [TIME-SYNC] Clock Synchronized: %02d:%02d:%02d, DayOfWeek=%d\n", h, m, s, dow);
                notifyEnvState();
            } else if (cmd.data[0] == 0xFA && cmd.len >= 15) { // 0xFA: Set Schedule Rule
                // [0xFA, idx, enabled, daysMask, startH, startM, stopType, durOrStopH_Lo, durOrStopH_Hi, stopMin, targetType, targetAction, r, g, b, bri]
                uint8_t idx = cmd.data[1];
                if (idx < MAX_SCHEDULES) {
                    s_schedules[idx].enabled            = (cmd.data[2] == 1);
                    s_schedules[idx].daysMask           = cmd.data[3];
                    s_schedules[idx].startHour          = cmd.data[4];
                    s_schedules[idx].startMin           = cmd.data[5];
                    s_schedules[idx].stopType           = cmd.data[6];
                    uint16_t dur = cmd.data[7] | ((uint16_t)cmd.data[8] << 8);
                    s_schedules[idx].durationMin        = dur;
                    s_schedules[idx].stopHour           = cmd.data[7];
                    s_schedules[idx].stopMin            = cmd.data[9];
                    s_schedules[idx].targetType         = cmd.data[10];
                    s_schedules[idx].targetAction       = cmd.data[11];
                    s_schedules[idx].rgbR               = cmd.data[12];
                    s_schedules[idx].rgbG               = cmd.data[13];
                    s_schedules[idx].rgbB               = cmd.data[14];
                    s_schedules[idx].rgbBri             = (cmd.len >= 16) ? cmd.data[15] : 50;
                    s_schedules[idx].lastFiredDayMinute = 0xFFFF; // Reset so evaluation checks active window right away!
                    s_schedules[idx].autoStopMs         = 0;
                    saveScheduleToNVS(idx);
                    Serial.printf(">>> [SCHEDULER] Updated Rule %d: Target=%d Action=%d Start=%02d:%02d StopType=%d Enabled=%d\n",
                                  idx + 1, s_schedules[idx].targetType, s_schedules[idx].targetAction,
                                  s_schedules[idx].startHour, s_schedules[idx].startMin, s_schedules[idx].stopType, s_schedules[idx].enabled);
                }
            } else if (cmd.data[0] == 0xF9 && cmd.len >= 2) { // 0xF9: Disable Schedule Rule [0xF9, idx]
                uint8_t idx = cmd.data[1];
                if (idx < MAX_SCHEDULES) {
                    s_schedules[idx].enabled = false;
                    s_schedules[idx].autoStopMs = 0;
                    saveScheduleToNVS(idx);
                    Serial.printf(">>> [SCHEDULER] Disabled Rule %d\n", idx + 1);
                }
            } else if (cmd.data[0] == 0xF8 && cmd.len >= 5) { // 0xF8: Set Presence Config
                s_presenceConfig.enabled          = (cmd.data[1] == 1);
                s_presenceConfig.awayDelayMin     = (cmd.data[2] | ((uint16_t)cmd.data[3] << 8));
                if (s_presenceConfig.awayDelayMin < 1) s_presenceConfig.awayDelayMin = 1;
                s_presenceConfig.awayRelayMask    = cmd.data[4];
                s_presenceConfig.awayRgbOff       = (cmd.len >= 6) ? (cmd.data[5] == 1) : true;
                s_presenceConfig.arrivalRelayMask = (cmd.len >= 7) ? cmd.data[6] : 0x0F;
                s_presenceConfig.arrivalRgbOn     = (cmd.len >= 8) ? (cmd.data[7] == 1) : true;
                s_presenceConfig.arrivalRgbMode   = (cmd.len >= 9) ? cmd.data[8] : 1;
                if (!s_presenceConfig.enabled) {
                    s_awayTimerEndMs = 0;
                    s_isAwayTriggered = false;
                    Serial.println(">>> [PRESENCE] Master Switch turned OFF -> All countdowns & presence actions stopped.");
                }
                savePresenceConfigToNVS();
                Serial.printf(">>> [BLE CMD] Presence Config: Enabled=%d, AwayDelay=%dm, AwayRelays=0x%02X, AwayRGB=%d, ArrRelays=0x%02X, ArrRGB=%d (Mode %d)\n",
                              s_presenceConfig.enabled, s_presenceConfig.awayDelayMin,
                              s_presenceConfig.awayRelayMask, s_presenceConfig.awayRgbOff ? 1 : 0,
                              s_presenceConfig.arrivalRelayMask, s_presenceConfig.arrivalRgbOn ? 1 : 0,
                              s_presenceConfig.arrivalRgbMode);
                notifyEnvState();
            } else if (cmd.data[0] == 0xF7 && cmd.len >= 2) { // 0xF7: Register Client Name [0xF7, len, chars...]
                uint8_t nlen = cmd.data[1];
                if (nlen > 23) nlen = 23;
                if (cmd.len >= 2 + nlen) {
                    memset(s_connectedClientName, 0, sizeof(s_connectedClientName));
                    memcpy(s_connectedClientName, &cmd.data[2], nlen);
                    if (strlen(s_connectedClientAddr) > 0) {
                        registerClientDevice(s_connectedClientAddr, s_connectedClientName);
                    }
                    Serial.printf(">>> [BLE CMD] Registered Client Name: '%s'\n", s_connectedClientName);
                }
            } else if (cmd.data[0] == 0xF6) { // 0xF6: Delete Stored Slot [0xF6, slotIdx] or Clear All [0xF6]
                if (cmd.len >= 2) {
                    uint8_t slotIdx = cmd.data[1];
                    if (slotIdx < MAX_PAIRED_CLIENTS) {
                        memset(&s_knownClients[slotIdx], 0, sizeof(PairedClient));
                        s_prefs.begin("desk_clients", false);
                        char kVal[16], kAddr[16], kName[16], kTrk[16];
                        snprintf(kVal, sizeof(kVal), "val_%d", slotIdx);
                        snprintf(kAddr, sizeof(kAddr), "addr_%d", slotIdx);
                        snprintf(kName, sizeof(kName), "name_%d", slotIdx);
                        snprintf(kTrk, sizeof(kTrk), "trk_%d", slotIdx);
                        s_prefs.remove(kVal);
                        s_prefs.remove(kAddr);
                        s_prefs.remove(kName);
                        s_prefs.remove(kTrk);
                        s_prefs.end();
                        Serial.printf(">>> [BLE CMD] Deleted paired client slot #%d from flash.\n", slotIdx + 1);
                        notifyEnvState();
                    }
                } else {
                s_prefs.begin("desk_clients", false);
                s_prefs.clear();
                s_prefs.end();
                for (int i = 0; i < MAX_PAIRED_CLIENTS; i++) {
                    memset(&s_knownClients[i], 0, sizeof(PairedClient));
                }
                Serial.println(">>> [BLE CMD] Cleared all known clients from flash.");
                notifyEnvState();
            }
            } else if (cmd.data[0] == 0xF5 && cmd.len >= 3) { // 0xF5: Test Schedule Rule [0xF5, ruleIdx, isStart 1/0]
                uint8_t idx = cmd.data[1];
                bool isStart = (cmd.data[2] == 1);
                if (idx < MAX_SCHEDULES) {
                    Serial.printf(">>> [BLE CMD] Manual Test Schedule Rule %d (%s)\n", idx + 1, isStart ? "START" : "STOP");
                    if (isStart) {
                        if (s_schedules[idx].targetType < RELAY_COUNT) {
                            setRelayLoad(s_schedules[idx].targetType, s_schedules[idx].targetAction, "Manual Test Rule");
                        } else if (s_schedules[idx].targetType == 4) {
                            if (s_schedules[idx].targetAction == 0) allRelaysOff("Manual Test Rule");
                            else for (int r = 0; r < RELAY_COUNT; r++) setRelayLoad(r, 1, "Manual Test Rule");
                        } else if (s_schedules[idx].targetType == 5) {
                            s_ledMode = s_schedules[idx].targetAction;
                            s_ledR = s_schedules[idx].rgbR; s_ledG = s_schedules[idx].rgbG; s_ledB = s_schedules[idx].rgbB; s_ledBri = s_schedules[idx].rgbBri;
                            notifyLedState();
                        }
                    } else {
                        if (s_schedules[idx].targetType < RELAY_COUNT) setRelayLoad(s_schedules[idx].targetType, 0, "Manual Test Stop");
                        else if (s_schedules[idx].targetType == 4) allRelaysOff("Manual Test Stop");
                        else if (s_schedules[idx].targetType == 5) { s_ledMode = 0; notifyLedState(); }
                    }
                }
            } else if (cmd.data[0] == 0xF4 && cmd.len >= 3) { // 0xF4: Set Client Presence Tracking [0xF4, slotIdx, trackPresence 1/0]
                uint8_t slotIdx = cmd.data[1];
                uint8_t trackEn = cmd.data[2];
                if (slotIdx < MAX_PAIRED_CLIENTS && s_knownClients[slotIdx].valid) {
                    s_knownClients[slotIdx].trackPresence = (trackEn == 1);
                    s_prefs.begin("desk_clients", false);
                    char kTrk[16];
                    snprintf(kTrk, sizeof(kTrk), "trk_%d", slotIdx);
                    s_prefs.putBool(kTrk, s_knownClients[slotIdx].trackPresence);
                    s_prefs.end();
                    Serial.printf(">>> [PRESENCE] Slot #%d (\"%s\") Presence Tracking set to %s\n",
                                  slotIdx + 1, s_knownClients[slotIdx].name, s_knownClients[slotIdx].trackPresence ? "TRACKED" : "EXCLUDED");
                    notifyEnvState();
                }
            }
        }
    }
#if 0
                    }
                }
            } else if (cmd.data[0] == 0xF4 && cmd.len >= 3) { // 0xF4: Set Client Presence Tracking [0xF4, slotIdx, trackPresence 1/0]
                uint8_t slotIdx = cmd.data[1];
                uint8_t trackEn = cmd.data[2];
                if (slotIdx < MAX_PAIRED_CLIENTS && s_knownClients[slotIdx].valid) {
                    s_knownClients[slotIdx].trackPresence = (trackEn == 1);
                    s_prefs.begin("desk_clients", false);
                    char kTrk[16];
                    snprintf(kTrk, sizeof(kTrk), "trk_%d", slotIdx);
                    s_prefs.putBool(kTrk, s_knownClients[slotIdx].trackPresence);
                    s_prefs.end();
                    Serial.printf(">>> [PRESENCE] Slot #%d (\"%s\") Presence Tracking set to %s\n",
                                  slotIdx + 1, s_knownClients[slotIdx].name, s_knownClients[slotIdx].trackPresence ? "TRACKED" : "EXCLUDED");
                    notifyEnvState();
                }
            } else if (cmd.data[0] == 0xF4 && cmd.len >= 3) { // 0xF4: Set Client Presence Tracking [0xF4, slotIdx, trackPresence 1/0]
                uint8_t slotIdx = cmd.data[1];
                uint8_t trackEn = cmd.data[2];
                if (slotIdx < MAX_PAIRED_CLIENTS && s_knownClients[slotIdx].valid) {
                    s_knownClients[slotIdx].trackPresence = (trackEn == 1);
                    s_prefs.begin("desk_clients", false);
                    char kTrk[16];
                    snprintf(kTrk, sizeof(kTrk), "trk_%d", slotIdx);
                    s_prefs.putBool(kTrk, s_knownClients[slotIdx].trackPresence);
                    s_prefs.end();
                    Serial.printf(">>> [PRESENCE] Slot #%d (\"%s\") Presence Tracking set to %s\n",
                                  slotIdx + 1, s_knownClients[slotIdx].name, s_knownClients[slotIdx].trackPresence ? "TRACKED" : "EXCLUDED");
                    notifyEnvState();
                    }
                }
            }
        }
    }

    uint32_t now = millis();

#endif

    uint32_t now = millis();

    // Check Presence Away Timeout
    if (s_awayTimerEndMs > 0 && (long)(now - s_awayTimerEndMs) >= 0) {
        s_awayTimerEndMs = 0;
        s_isAwayTriggered = true;
        Serial.printf(">>> [AWAY TRIGGER] Presence away timeout (%d min) reached! Executing configured away actions.\n",
                      s_presenceConfig.awayDelayMin);
        if (s_presenceConfig.awayRelayMask != 0) {
            for (int r = 0; r < RELAY_COUNT; r++) {
                if ((s_presenceConfig.awayRelayMask & (1 << r)) != 0) {
                    setRelayLoad(r, 0, "Presence Away Timeout");
                }
            }
        }
        if (s_presenceConfig.awayRgbOff) {
            s_ledMode = 0; // Turn RGB strip off
            notifyLedState();
            Serial.println(">>> [AWAY TRIGGER] Turned RGB Strip OFF.");
        }
        notifyEnvState();
    }

    // Active Buzzer non-blocking updates (Big Buzzer B27)
    updateActiveBuzzer(now);

    // Evaluate Day Scheduler Rules every 1 second
    static uint32_t lastSchedCheckMs = 0;
    if (now - lastSchedCheckMs >= 1000) {
        lastSchedCheckMs = now;
        evaluateSchedules(now);
    }

    // 3. Check Relay Countdown Timers
    static uint32_t lastTimerTick = 0;
    bool timerExpired = false;
    for (int i = 0; i < RELAY_COUNT; i++) {
        if (s_timerEndMs[i] > 0) {
            if ((long)(now - s_timerEndMs[i]) >= 0) {
                Serial.printf(">>> [TIMER EXPIRED] Relay %d countdown finished. Turning load OFF.\n", i + 1);
                s_timerEndMs[i] = 0;
                applyRelayPin(i, 0, "Timer Expiration");
                timerExpired = true;
                if (s_buzzerConfigs[i].beepTimerEnd) {
                    buzzerBeepTimerEnd();
                }
            }
        }
    }
    if (timerExpired) {
        notifyRelayState();
    } else if (now - lastTimerTick >= 10000) {
        lastTimerTick = now;
        bool hasActiveTimer = false;
        for (int i = 0; i < RELAY_COUNT; i++) {
            if (s_timerEndMs[i] > 0) hasActiveTimer = true;
        }
        if (hasActiveTimer && s_connected) {
            notifyRelayState();
        }
    }

    // 4. Periodic DHT11 Sensor Reading (every 2.5s)
    if (now - s_lastDhtReadMs >= 2500) {
        s_lastDhtReadMs = now;
        float t = 0.0f, h = 0.0f;
        if (readDHT11(&t, &h)) {
            s_tempC = t;
            s_humidity = h;
            s_sensorValid = true;
            notifyEnvState();
        } else {
            if (!s_sensorValid) {
                notifyEnvState();
            }
        }
    }

    // 5. Render LEDs (Modes 0..15 or transient animation)
    renderLeds();

    // 6. Handle Serial Monitor Key Input (1..4 = toggle, 0 = all off)
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c >= '1' && c <= '4') {
            uint8_t idx = c - '1';
            uint8_t nextLoad = s_relayLoads[idx] ? 0 : 1;
            Serial.printf("[SERIAL] Key '%c' -> Toggling Relay %d to %s\n", c, idx + 1, nextLoad ? "ON" : "OFF");
            setRelayLoad(idx, nextLoad, "Serial Key");
        } else if (c == '0') {
            allRelaysOff("Serial Key '0'");
        }
    }

    delay(2);
}
