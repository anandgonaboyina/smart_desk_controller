/**
 * smartdesk_single.ino — Single-file bring-up firmware for SmartDesk ESP32-S3.
 *
 * Purpose : Verification of 4-relay BLE control (read, write with response, notify)
 *           with pure NimBLE-Arduino 2.x, zero extra library dependencies,
 *           non-blocking BLE callbacks, and deterministic serial logging.
 *
 * Target  : ESP32-S3 (N16R8)
 * Pinout  : Relays on GPIO 4, 5, 6, 7
 */

#include <Arduino.h>
#include <NimBLEDevice.h>

/* ── Hardware & Safety Constants ─────────────────────────────────────────── */
#define ACTIVE_LOW          1       // 1 = Active-LOW relay module (0V=ON, 3.3V=OFF)
                                    // 0 = Active-HIGH (3.3V=ON, 0V=OFF)
#define MIN_SWITCH_MS       250     // Debounce rate-limit per relay (ms)
#define RELAY_COUNT         4

static const uint8_t RELAY_PINS[RELAY_COUNT] = {4, 5, 6, 7};

/* ── BLE Protocol UUIDs (New UUIDs to prevent Windows GATT cache issues) ─── */
#define DEVICE_NAME         "SmartDesk"
#define SERVICE_UUID        "d3b00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1"
#define CHAR_RELAYS_UUID    "d3b00001-1b0e-4e6a-9b3f-c0f2a8d7e5b1"

#define BUILD_MARKER        "BUILD " __DATE__ " " __TIME__ " TAG=SINGLE-1"

/* ── Global State Variables ──────────────────────────────────────────────── */
static uint8_t  s_relayLoads[RELAY_COUNT]    = {0, 0, 0, 0};
static uint32_t s_lastSwitchMs[RELAY_COUNT]  = {0, 0, 0, 0};

static NimBLEServer*         s_pServer     = nullptr;
static NimBLECharacteristic* s_pRelayChar  = nullptr;
static bool                  s_clientConnected = false;

/* ── Volatile Flags & Buffers for Non-Blocking BLE Callbacks ─────────────── */
static volatile bool     s_flagConnected     = false;
static volatile bool     s_flagDisconnected  = false;
static volatile uint16_t s_connHandle        = 0;
static volatile uint16_t s_connMtu           = 0;
static volatile uint16_t s_connInterval      = 0;
static volatile uint16_t s_connLatency       = 0;
static volatile uint16_t s_connTimeout       = 0;
static volatile int      s_discReason        = 0;

static volatile bool     s_flagWriteReceived = false;
static volatile uint8_t  s_writeBuf[2]       = {0, 0};

/* ── Pure Hardware Control Helpers ───────────────────────────────────────── */
static inline uint8_t loadToPinLevel(uint8_t load) {
    return ACTIVE_LOW ? (load ? LOW : HIGH) : (load ? HIGH : LOW);
}

void setRelay(uint8_t idx, uint8_t load, const char* source) {
    if (idx >= RELAY_COUNT) return;

    uint8_t normLoad = load ? 1 : 0;
    uint32_t now = millis();

    // Rate-limiting check
    if (s_lastSwitchMs[idx] != 0 && (now - s_lastSwitchMs[idx] < MIN_SWITCH_MS)) {
        Serial.printf("[RATE-LIMIT] Relay %d change dropped (< %u ms interval)\n", idx + 1, MIN_SWITCH_MS);
        return;
    }

    s_relayLoads[idx]   = normLoad;
    s_lastSwitchMs[idx] = now;

    uint8_t level = loadToPinLevel(normLoad);
    digitalWrite(RELAY_PINS[idx], level);

    Serial.printf(">>> [RELAY %d] LOAD=%s | GPIO %d Level=%s (%dV) | Trigger: %s\n",
                  idx + 1,
                  normLoad ? "ON " : "OFF",
                  RELAY_PINS[idx],
                  level == HIGH ? "HIGH" : "LOW",
                  level == HIGH ? 3 : 0,
                  source ? source : "UNKNOWN");

    // Broadcast state update to connected BLE client
    if (s_pRelayChar && s_clientConnected) {
        uint8_t payload[RELAY_COUNT];
        for (uint8_t i = 0; i < RELAY_COUNT; i++) {
            payload[i] = s_relayLoads[i];
        }
        s_pRelayChar->setValue(payload, RELAY_COUNT);
        s_pRelayChar->notify();
    }
}

/* ── Non-Blocking NimBLE Server Callbacks ─────────────────────────────────── */
class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        (void)pServer;
        s_clientConnected = true;
        s_connHandle   = connInfo.getConnHandle();
        s_connMtu      = connInfo.getMTU();
        s_connInterval = connInfo.getConnInterval();
        s_connLatency  = connInfo.getConnLatency();
        s_connTimeout  = connInfo.getConnTimeout();
        s_flagConnected = true;
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        (void)pServer; (void)connInfo;
        s_clientConnected = false;
        s_discReason = reason;
        s_flagDisconnected = true;
    }
};

/* ── Non-Blocking NimBLE Characteristic Callbacks ────────────────────────── */
class RelayCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t payload[RELAY_COUNT];
        for (uint8_t i = 0; i < RELAY_COUNT; i++) {
            payload[i] = s_relayLoads[i];
        }
        pChr->setValue(payload, RELAY_COUNT);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        // Keep copy of NimBLEAttValue alive in callback scope
        NimBLEAttValue val = pChr->getValue();
        size_t len = val.length();
        if (len >= 2) {
            s_writeBuf[0] = val[0];
            s_writeBuf[1] = val[1];
            s_flagWriteReceived = true;
        }
    }
};

/* ── Setup Entry Point ───────────────────────────────────────────────────── */
void setup() {
    // 1. SAFETY LINE 1: Immediately drive all relay pins to OFF level before anything else
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
        uint8_t offLevel = ACTIVE_LOW ? HIGH : LOW;
        digitalWrite(RELAY_PINS[i], offLevel);
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], offLevel);
    }

    // 2. Start Serial
    Serial.begin(115200);
    delay(100);

    // 3. Print Boot Banner with exact BUILD marker
    Serial.println("\n\n==================================================");
    Serial.println("  SMARTDESK SINGLE-FILE BRING-UP CONTROLLER       ");
    Serial.println("==================================================");
    Serial.println(">>> " BUILD_MARKER);
    Serial.printf("Config: ACTIVE_LOW=%d | MIN_SWITCH_MS=%d\n", ACTIVE_LOW, MIN_SWITCH_MS);
    Serial.println("Pins  : CH1=GPIO4, CH2=GPIO5, CH3=GPIO6, CH4=GPIO7");
    Serial.printf("BLE   : Name=\"%s\"\n", DEVICE_NAME);
    Serial.printf("Service UUID: %s\n", SERVICE_UUID);
    Serial.printf("Relay   UUID: %s\n", CHAR_RELAYS_UUID);
    Serial.println("Keys  : Type 1, 2, 3, or 4 to toggle relays via Serial");
    Serial.println("==================================================\n");

    // 4. Initialize NimBLE Stack
    NimBLEDevice::init(DEVICE_NAME);

    s_pServer = NimBLEDevice::createServer();
    static ServerCallbacks srvCallbacks;
    s_pServer->setCallbacks(&srvCallbacks);

    NimBLEService* pService = s_pServer->createService(SERVICE_UUID);

    // READ, WRITE (with response, NO write-no-response), NOTIFY
    s_pRelayChar = pService->createCharacteristic(
        CHAR_RELAYS_UUID,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );

    static RelayCallbacks relayCallbacks;
    s_pRelayChar->setCallbacks(&relayCallbacks);

    // Set initial 4-byte payload: all 0
    uint8_t initialPayload[RELAY_COUNT] = {0, 0, 0, 0};
    s_pRelayChar->setValue(initialPayload, RELAY_COUNT);

    pService->start();

    // 5. Configure Advertising
    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    NimBLEAdvertisementData advData;
    advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
    advData.setName(DEVICE_NAME);
    pAdv->setAdvertisementData(advData);

    NimBLEAdvertisementData scanData;
    scanData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
    pAdv->setScanResponseData(scanData);

    pAdv->start();
    Serial.println(">>> [BLE] Advertising started successfully. Ready for connection.");
}

/* ── Main Loop ───────────────────────────────────────────────────────────── */
void loop() {
    // 1. Process deferred Connect event
    if (s_flagConnected) {
        s_flagConnected = false;
        Serial.println("==================================================");
        Serial.printf(">>> [BLE CONNECT] Client Connected!\n");
        Serial.printf("    Handle   : %u\n", s_connHandle);
        Serial.printf("    MTU      : %u bytes\n", s_connMtu);
        Serial.printf("    Interval : %.2f ms (%u)\n", s_connInterval * 1.25f, s_connInterval);
        Serial.printf("    Latency  : %u intervals\n", s_connLatency);
        Serial.printf("    Timeout  : %u ms (%u)\n", s_connTimeout * 10, s_connTimeout);
        Serial.println("==================================================");
    }

    // 2. Process deferred Disconnect event
    if (s_flagDisconnected) {
        s_flagDisconnected = false;
        int r = s_discReason;
        Serial.println("==================================================");
        Serial.printf(">>> [BLE DISCONNECT] Client Disconnected!\n");
        Serial.printf("    Reason Dec: %d\n", r);
        Serial.printf("    Reason Hex: 0x%04X (HCI Error 0x%02X)\n", (unsigned int)r, (unsigned int)(r & 0xFF));
        Serial.println("==================================================");

        // Restart advertising
        NimBLEDevice::startAdvertising();
        Serial.println(">>> [BLE] Advertising restarted.");
    }

    // 3. Process deferred Write command
    if (s_flagWriteReceived) {
        s_flagWriteReceived = false;
        uint8_t idx  = s_writeBuf[0];
        uint8_t load = s_writeBuf[1];
        Serial.printf(">>> [BLE WRITE] Received: idx=%u, load=%u\n", idx, load);
        if (idx < RELAY_COUNT) {
            setRelay(idx, load, "BLE Command");
        } else {
            Serial.printf("[BLE WRITE ERROR] Invalid relay index %u (must be 0..3)\n", idx);
        }
    }

    // 4. Handle Serial Monitor Key Input (1..4 toggle)
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c >= '1' && c <= '4') {
            uint8_t idx = c - '1';
            uint8_t nextLoad = s_relayLoads[idx] ? 0 : 1;
            Serial.printf("[SERIAL KEY '%c'] Toggling Relay %d...\n", c, idx + 1);
            setRelay(idx, nextLoad, "Serial Key");
        }
    }

    // 5. Periodic Heartbeat every 5 seconds
    static uint32_t lastHeartbeat = 0;
    uint32_t now = millis();
    if (now - lastHeartbeat >= 5000) {
        lastHeartbeat = now;
        Serial.printf("[HEARTBEAT %8lums] Relays: [%d,%d,%d,%d] | BLE Connected: %s | Free Heap: %lu B\n",
                      (unsigned long)now,
                      s_relayLoads[0], s_relayLoads[1], s_relayLoads[2], s_relayLoads[3],
                      s_clientConnected ? "YES" : "NO",
                      (unsigned long)esp_get_free_heap_size());
    }

    delay(5);
}

