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
 Advertised Name: SmartDeskV2

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
    - Read / Write / Notify Payload (6 bytes):
      * Byte 0: Mode (0=Off, 1=Solid, 2=Breathe, 3=Rainbow, 4=Blink, 5=Chase)
      * Byte 1: Red (0..255)
      * Byte 2: Green (0..255)
      * Byte 3: Blue (0..255)
      * Byte 4: Brightness (0..100%, capped internally to LED_MAX_BRIGHT=80)
      * Byte 5: Speed (1..10)

 3. CONFIG Characteristic: 11848579-c357-45cb-bdb2-88f560c11708
    Properties: READ, WRITE (with response)
    - Write Payload (4 to 20 bytes):
      * Byte 0: Relay Index (0..3)
      * Byte 1: Polarity (0=Active-HIGH, 1=Active-LOW)
      * Byte 2: Wiring (0=NO, 1=NC)
      * Byte 3: Name Length L (0..16)
      * Bytes 4..3+L: Name string ASCII (max 16 chars)
    - Read Payload (80 bytes - 4 fixed 20-byte records for relays 0..3):
      * Each record i (offset i*20):
        - Byte 0: Index i (0..3)
        - Byte 1: Polarity (0=Active-HIGH, 1=Active-LOW)
        - Byte 2: Wiring (0=NO, 1=NC)
        - Byte 3: Name Length L (0..16)
        - Bytes 4..19: Name string (16 bytes, ASCII null-padded)

 4. INFO Characteristic: f1f28a13-9725-4636-a073-0666057bd91b
    Properties: READ
    - Read Payload: UTF-8 string: "BUILD <__DATE__> <__TIME__> TAG=V2-PROD | Uptime: <seconds>s"
 ================================================================================
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>

/* ── Hardware Constants ──────────────────────────────────────────────────── */
#define RELAY_COUNT         4
static const uint8_t RELAY_PINS[RELAY_COUNT] = {4, 5, 6, 7};
#define MIN_SWITCH_MS       250

#define LED_PIN             8
#define LED_COUNT           8
#define LED_MAX_BRIGHT      80    // Hard ceiling for NeoPixel brightness (0-255 scale)

#define DEVICE_NAME         "SmartDeskV2"
#define SERVICE_UUID        "7f781e04-c0ee-47c9-a1e4-0aafa8ee316b"
#define CHAR_RELAY_UUID     "385d4ec5-88c3-417e-8aa5-2a70db5d49fa"
#define CHAR_LED_UUID       "1814a0cb-9d1f-4212-946a-72e78b64042e"
#define CHAR_CONFIG_UUID    "11848579-c357-45cb-bdb2-88f560c11708"
#define CHAR_INFO_UUID      "f1f28a13-9725-4636-a073-0666057bd91b"

#define BUILD_MARKER        "BUILD " __DATE__ " " __TIME__ " TAG=V2-PROD"

/* ── Relay Configuration Structure ───────────────────────────────────────── */
struct RelayConfig {
    uint8_t polarity;   // 0 = Active-HIGH, 1 = Active-LOW (default: 1)
    uint8_t wiring;     // 0 = NO (Normally Open), 1 = NC (Normally Closed) (default: 0)
    char    name[17];   // Up to 16 chars + null terminator
};

/* ── Global State ────────────────────────────────────────────────────────── */
static RelayConfig s_relayConfigs[RELAY_COUNT];
static uint8_t     s_relayLoads[RELAY_COUNT]    = {0, 0, 0, 0}; // 0 = OFF, 1 = ON
static uint32_t    s_lastSwitchMs[RELAY_COUNT]  = {0, 0, 0, 0};
static uint32_t    s_timerEndMs[RELAY_COUNT]    = {0, 0, 0, 0}; // 0 = no timer

// LED State
static uint8_t  s_ledMode   = 1;    // 0=off, 1=solid, 2=breathe, 3=rainbow, 4=blink, 5=chase
static uint8_t  s_ledR      = 0;
static uint8_t  s_ledG      = 180;
static uint8_t  s_ledB      = 255;
static uint8_t  s_ledBri    = 50;   // 0..100%
static uint8_t  s_ledSpd    = 5;    // 1..10

static Adafruit_NeoPixel s_strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
static Preferences       s_prefs;

static NimBLEServer*         s_pServer      = nullptr;
static NimBLECharacteristic* s_pRelayChar   = nullptr;
static NimBLECharacteristic* s_pLedChar     = nullptr;
static NimBLECharacteristic* s_pConfigChar  = nullptr;
static NimBLECharacteristic* s_pInfoChar    = nullptr;
static bool                  s_connected    = false;

/* ── Fast Command Queue for Non-Blocking Callbacks ───────────────────────── */
enum WriteType { WT_NONE = 0, WT_RELAY, WT_LED, WT_CONFIG };

struct WriteCmd {
    WriteType type;
    uint8_t   len;
    uint8_t   data[24];
};

#define CMD_QUEUE_SIZE 8
static volatile uint8_t s_cmdHead = 0;
static volatile uint8_t s_cmdTail = 0;
static WriteCmd s_cmdQueue[CMD_QUEUE_SIZE];

static inline bool enqueueCmd(WriteType type, const uint8_t* data, size_t len) {
    uint8_t next = (s_cmdHead + 1) % CMD_QUEUE_SIZE;
    if (next == s_cmdTail) return false; // Queue full
    s_cmdQueue[s_cmdHead].type = type;
    s_cmdQueue[s_cmdHead].len  = (len > 24) ? 24 : (uint8_t)len;
    if (data && s_cmdQueue[s_cmdHead].len > 0) {
        memcpy(s_cmdQueue[s_cmdHead].data, data, s_cmdQueue[s_cmdHead].len);
    }
    s_cmdHead = next;
    return true;
}

static volatile bool s_flagConnected    = false;
static volatile bool s_flagDisconnected = false;
static volatile int  s_discReason       = 0;

/* ── Hardware Conversion Helper ──────────────────────────────────────────── */
static inline uint8_t calculatePinLevel(uint8_t idx, uint8_t load) {
    // coil = NC ? !load : load
    uint8_t coil = (s_relayConfigs[idx].wiring == 1) ? !load : load;
    // level = activeLow ? !coil : coil
    return (s_relayConfigs[idx].polarity == 1) ? (coil ? LOW : HIGH) : (coil ? HIGH : LOW);
}

static void applyRelayPin(uint8_t idx, uint8_t load, const char* source) {
    if (idx >= RELAY_COUNT) return;
    s_relayLoads[idx]   = load ? 1 : 0;
    s_lastSwitchMs[idx] = millis();

    uint8_t pinLevel = calculatePinLevel(idx, s_relayLoads[idx]);
    digitalWrite(RELAY_PINS[idx], pinLevel);

    Serial.printf("[RELAY %d] LOAD=%s | GPIO%d Level=%s (%s) | Trigger: %s\n",
                  idx + 1,
                  s_relayLoads[idx] ? "ON " : "OFF",
                  RELAY_PINS[idx],
                  (pinLevel == HIGH) ? "HIGH" : "LOW",
                  (pinLevel == HIGH) ? "3.3V" : "0V",
                  source ? source : "UNKNOWN");
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

/* ── NVS Configuration Storage ───────────────────────────────────────────── */
static void loadConfigsFromNVS() {
    s_prefs.begin("desk_cfg", false);
    for (int i = 0; i < RELAY_COUNT; i++) {
        char keyPol[12], keyWir[12], keyNam[12];
        snprintf(keyPol, sizeof(keyPol), "pol_%d", i);
        snprintf(keyWir, sizeof(keyWir), "wir_%d", i);
        snprintf(keyNam, sizeof(keyNam), "nam_%d", i);

        s_relayConfigs[i].polarity = (uint8_t)s_prefs.getUChar(keyPol, 1); // Default: Active-LOW
        s_relayConfigs[i].wiring   = (uint8_t)s_prefs.getUChar(keyWir, 0); // Default: NO (Normally Open)

        char defaultName[16];
        snprintf(defaultName, sizeof(defaultName), "Relay %d", i + 1);
        String savedName = s_prefs.getString(keyNam, defaultName);
        memset(s_relayConfigs[i].name, 0, sizeof(s_relayConfigs[i].name));
        strncpy(s_relayConfigs[i].name, savedName.c_str(), 16);
    }
    s_prefs.end();
}

static void saveConfigToNVS(uint8_t idx) {
    if (idx >= RELAY_COUNT) return;
    s_prefs.begin("desk_cfg", false);
    char keyPol[12], keyWir[12], keyNam[12];
    snprintf(keyPol, sizeof(keyPol), "pol_%d", idx);
    snprintf(keyWir, sizeof(keyWir), "wir_%d", idx);
    snprintf(keyNam, sizeof(keyNam), "nam_%d", idx);

    s_prefs.putUChar(keyPol, s_relayConfigs[idx].polarity);
    s_prefs.putUChar(keyWir, s_relayConfigs[idx].wiring);
    s_prefs.putString(keyNam, s_relayConfigs[idx].name);
    s_prefs.end();
    Serial.printf("[NVS] Saved Config for Relay %d: Pol=%d, Wir=%d, Name='%s'\n",
                  idx + 1, s_relayConfigs[idx].polarity, s_relayConfigs[idx].wiring, s_relayConfigs[idx].name);
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
    if (minutes > 1440) minutes = 1440;

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

/* ── LED Rendering Engine ────────────────────────────────────────────────── */
static uint8_t scaleBrightness(uint8_t userPercent) {
    if (userPercent > 100) userPercent = 100;
    // Scale 0..100% to 0..LED_MAX_BRIGHT
    return (uint8_t)((userPercent * LED_MAX_BRIGHT) / 100);
}

static uint32_t gammaCorrect(uint8_t r, uint8_t g, uint8_t b, uint8_t bri) {
    // 8-bit gamma 2.2 approximation
    uint32_t r_sc = (r * bri) / 255;
    uint32_t g_sc = (g * bri) / 255;
    uint32_t b_sc = (b * bri) / 255;
    uint8_t r_gam = (uint8_t)((r_sc * r_sc + 255) >> 8);
    uint8_t g_gam = (uint8_t)((g_sc * g_sc + 255) >> 8);
    uint8_t b_gam = (uint8_t)((b_sc * b_sc + 255) >> 8);
    return Adafruit_NeoPixel::Color(r_gam, g_gam, b_gam);
}

static void renderLeds() {
    static uint32_t lastRenderMs = 0;
    uint32_t now = millis();
    if (now - lastRenderMs < 25) return; // ~40 FPS rendering
    lastRenderMs = now;

    uint8_t maxBri = scaleBrightness(s_ledBri);
    if (s_ledMode == 0 || maxBri == 0) {
        s_strip.clear();
        s_strip.show();
        return;
    }

    uint8_t spd = s_ledSpd < 1 ? 1 : (s_ledSpd > 10 ? 10 : s_ledSpd);

    switch (s_ledMode) {
        case 1: { // Solid
            uint32_t color = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, color);
            s_strip.show();
            break;
        }
        case 2: { // Breathe (Sine wave modulation)
            // Period from ~4000ms (spd=1) to ~800ms (spd=10)
            uint32_t period = 4200 - (spd * 340);
            float phase = (float)(now % period) / (float)period;
            float sineVal = (sinf(phase * 2.0f * 3.14159f - 1.5708f) + 1.0f) * 0.5f; // 0.0 to 1.0
            uint8_t bBri = (uint8_t)(sineVal * maxBri);
            uint32_t color = gammaCorrect(s_ledR, s_ledG, s_ledB, bBri);
            for (int i = 0; i < LED_COUNT; i++) s_strip.setPixelColor(i, color);
            s_strip.show();
            break;
        }
        case 3: { // Rainbow
            // Cycle period from ~6000ms (spd=1) to ~1000ms (spd=10)
            uint32_t period = 6500 - (spd * 550);
            uint16_t baseHue = (uint16_t)(((now % period) * 65536UL) / period);
            for (int i = 0; i < LED_COUNT; i++) {
                uint16_t pixelHue = baseHue + (i * 65536UL / LED_COUNT);
                uint32_t rawColor = s_strip.ColorHSV(pixelHue, 255, maxBri);
                // Extract R, G, B
                uint8_t r = (uint8_t)(rawColor >> 16);
                uint8_t g = (uint8_t)(rawColor >> 8);
                uint8_t b = (uint8_t)(rawColor);
                s_strip.setPixelColor(i, gammaCorrect(r, g, b, 255));
            }
            s_strip.show();
            break;
        }
        case 4: { // Blink (Enforce <= 3 flashes per sec -> cycle >= 334ms)
            // Range from 1200ms (spd=1) down to 350ms (spd=10, 2.85 Hz)
            uint32_t cycleMs = 1200 - (spd * 85);
            if (cycleMs < 350) cycleMs = 350; // Strict photosensitivity cap
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
        case 5: { // Chase
            // Step interval from 220ms (spd=1) to 40ms (spd=10)
            uint32_t stepInterval = 240 - (spd * 20);
            uint8_t head = (now / stepInterval) % LED_COUNT;
            uint32_t headCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri);
            uint32_t tailCol = gammaCorrect(s_ledR, s_ledG, s_ledB, maxBri / 4);

            s_strip.clear();
            for (int i = 0; i < LED_COUNT; i++) {
                if (i == head) {
                    s_strip.setPixelColor(i, headCol);
                } else if (i == ((head + LED_COUNT - 1) % LED_COUNT)) {
                    s_strip.setPixelColor(i, tailCol);
                }
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
        (void)pServer; (void)connInfo;
        s_connected = true;
        s_flagConnected = true;
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        (void)pServer; (void)connInfo;
        s_connected = false;
        s_discReason = reason;
        s_flagDisconnected = true;
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
        uint8_t payload[80];
        memset(payload, 0, 80);
        for (int i = 0; i < RELAY_COUNT; i++) {
            payload[i * 20 + 0] = (uint8_t)i;
            payload[i * 20 + 1] = s_relayConfigs[i].polarity;
            payload[i * 20 + 2] = s_relayConfigs[i].wiring;
            size_t nlen = strlen(s_relayConfigs[i].name);
            if (nlen > 16) nlen = 16;
            payload[i * 20 + 3] = (uint8_t)nlen;
            memcpy(&payload[i * 20 + 4], s_relayConfigs[i].name, nlen);
        }
        pChr->setValue(payload, 80);
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
        char buf[96];
        snprintf(buf, sizeof(buf), "%s | Uptime: %lus", BUILD_MARKER, (unsigned long)(millis() / 1000UL));
        pChr->setValue((uint8_t*)buf, strlen(buf));
    }
};

/* ── Setup ───────────────────────────────────────────────────────────────── */
void setup() {
    // 1. SAFETY LINE 1: Force all 4 relay pins to OFF level before Serial and BLE
    for (int i = 0; i < RELAY_COUNT; i++) {
        digitalWrite(RELAY_PINS[i], HIGH); // Safe default for Active-LOW module
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], HIGH);
    }

    // 2. Initialize Serial
    Serial.begin(115200);
    delay(100);

    // 3. Print Boot Banner with exact BUILD marker
    Serial.println("\n\n==================================================");
    Serial.println("         SMARTDESK V2 CONTROLLER (ESP32-S3)       ");
    Serial.println("==================================================");
    Serial.println(">>> " BUILD_MARKER);
    Serial.printf("Relays: CH1=GPIO4, CH2=GPIO5, CH3=GPIO6, CH4=GPIO7\n");
    Serial.printf("LEDs  : 8x WS2812B on GPIO8 (Cap: %d/255)\n", LED_MAX_BRIGHT);
    Serial.printf("BLE   : Name=\"%s\"\n", DEVICE_NAME);
    Serial.printf("Service UUID: %s\n", SERVICE_UUID);
    Serial.println("Serial Commands: Keys 1..4 = Toggle Relay | 0 = All Off");
    Serial.println("==================================================\n");

    // 4. Load runtime configuration from NVS
    loadConfigsFromNVS();

    // Re-apply physical pin level based on loaded polarity and load=0
    for (int i = 0; i < RELAY_COUNT; i++) {
        applyRelayPin(i, 0, "Boot Init");
    }

    // 5. Initialize NeoPixel Strip
    s_strip.begin();
    s_strip.clear();
    s_strip.show();

    // 6. Initialize NimBLE
    NimBLEDevice::init(DEVICE_NAME);
    NimBLEDevice::deleteAllBonds(); // Clear bonds to prevent stale connection states

    s_pServer = NimBLEDevice::createServer();
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

    pService->start();

    // 7. Setup Advertising
    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    NimBLEAdvertisementData advData;
    advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
    advData.setName(DEVICE_NAME);
    pAdv->setAdvertisementData(advData);

    NimBLEAdvertisementData scanData;
    scanData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
    pAdv->setScanResponseData(scanData);

    pAdv->start();
    Serial.println(">>> [BLE] Advertising started. Ready for connections.");
}

/* ── Main Loop ───────────────────────────────────────────────────────────── */
void loop() {
    // 1. Process deferred Connect/Disconnect events
    if (s_flagConnected) {
        s_flagConnected = false;
        Serial.println(">>> [BLE CONNECT] Client connected to SmartDeskV2.");
    }

    if (s_flagDisconnected) {
        s_flagDisconnected = false;
        int r = s_discReason;
        Serial.printf(">>> [BLE DISCONNECT] Client disconnected. Reason: %d (0x%04X, HCI 0x%02X)\n",
                      r, (unsigned int)r, (unsigned int)(r & 0xFF));
        NimBLEDevice::startAdvertising();
        Serial.println(">>> [BLE] Advertising restarted.");
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
            s_ledMode = cmd.data[0];
            s_ledR    = cmd.data[1];
            s_ledG    = cmd.data[2];
            s_ledB    = cmd.data[3];
            s_ledBri  = cmd.data[4];
            s_ledSpd  = cmd.data[5];
            Serial.printf(">>> [BLE CMD] LED Update: Mode=%u RGB=(%u,%u,%u) Bri=%u%% Spd=%u\n",
                          s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd);
            notifyLedState();
        } else if (cmd.type == WT_CONFIG && cmd.len >= 4) {
            uint8_t idx     = cmd.data[0];
            uint8_t pol     = cmd.data[1];
            uint8_t wir     = cmd.data[2];
            uint8_t nameLen = cmd.data[3];
            if (idx < RELAY_COUNT) {
                s_relayConfigs[idx].polarity = pol ? 1 : 0;
                s_relayConfigs[idx].wiring   = wir ? 1 : 0;
                memset(s_relayConfigs[idx].name, 0, sizeof(s_relayConfigs[idx].name));
                if (nameLen > 16) nameLen = 16;
                if (cmd.len >= 4 + nameLen) {
                    memcpy(s_relayConfigs[idx].name, &cmd.data[4], nameLen);
                }
                saveConfigToNVS(idx);
                // Re-apply electrical level with new polarity/wiring
                applyRelayPin(idx, s_relayLoads[idx], "Config Update");
                notifyRelayState();
            }
        }
    }

    // 3. Check Relay Countdown Timers
    uint32_t now = millis();
    static uint32_t lastTimerTick = 0;
    bool timerExpired = false;
    for (int i = 0; i < RELAY_COUNT; i++) {
        if (s_timerEndMs[i] > 0) {
            if ((long)(now - s_timerEndMs[i]) >= 0) {
                Serial.printf(">>> [TIMER EXPIRED] Relay %d countdown finished. Turning load OFF.\n", i + 1);
                s_timerEndMs[i] = 0;
                applyRelayPin(i, 0, "Timer Expiration");
                timerExpired = true;
            }
        }
    }
    if (timerExpired) {
        notifyRelayState();
    } else if (now - lastTimerTick >= 10000) { // Notify remaining minutes every 10s if active
        lastTimerTick = now;
        bool hasActiveTimer = false;
        for (int i = 0; i < RELAY_COUNT; i++) {
            if (s_timerEndMs[i] > 0) hasActiveTimer = true;
        }
        if (hasActiveTimer && s_connected) {
            notifyRelayState();
        }
    }

    // 4. Render LEDs
    renderLeds();

    // 5. Handle Serial Monitor Key Input (1..4 = toggle, 0 = all off)
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

