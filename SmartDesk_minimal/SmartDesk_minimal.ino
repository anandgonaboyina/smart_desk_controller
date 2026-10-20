#include <Arduino.h>
#include <NimBLEDevice.h>

#define LED_PIN         4
#define DEVICE_NAME     "SmartDesk-MIN"
#define SERVICE_UUID    "d3a00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1"
#define LED_CHAR_UUID   "d3a00003-1b0e-4e6a-9b3f-c0f2a8d7e5b1"

static NimBLEServer* s_pServer = nullptr;
static NimBLECharacteristic* s_pLedChar = nullptr;
static bool s_clientConnected = false;
static uint8_t s_ledState = 0;

void setLed(uint8_t state) {
    s_ledState = (state != 0) ? 1 : 0;
    digitalWrite(LED_PIN, s_ledState ? HIGH : LOW);

    Serial.println("----------------------------------------");
    Serial.printf(">>> [BASELINE HARDWARE] GPIO %d is now %s (%s)\n",
                  LED_PIN,
                  s_ledState ? "HIGH" : "LOW",
                  s_ledState ? "LED ON (3.3V)" : "LED OFF (0V)");
    Serial.println("----------------------------------------");

    if (s_pLedChar && s_clientConnected) {
        uint8_t payload = s_ledState;
        s_pLedChar->setValue(&payload, 1);
        s_pLedChar->notify();
    }
}

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        (void)pServer;
        s_clientConnected = true;
        Serial.println("========================================");
        Serial.printf(">>> [BASELINE BLE CONNECT] Handle=%u | MTU=%u | Interval=%.2fms | Latency=%u | Timeout=%ums\n",
                      connInfo.getConnHandle(), connInfo.getMTU(),
                      connInfo.getConnInterval() * 1.25f,
                      connInfo.getConnLatency(),
                      connInfo.getConnTimeout() * 10);
        Serial.println("========================================");
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        (void)pServer; (void)connInfo;
        s_clientConnected = false;
        Serial.println("========================================");
        Serial.printf(">>> [BASELINE BLE DISCONNECT] Reason=%d (0x%04X, HCI=0x%02X)\n",
                      reason, (unsigned int)reason, (unsigned int)(reason & 0xFF));
        Serial.println("========================================");
        NimBLEDevice::startAdvertising();
    }
};

class LedCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t payload = s_ledState;
        pChr->setValue(&payload, 1);
        Serial.printf("[BASELINE BLE READ] GPIO %d state: %d\n", LED_PIN, s_ledState);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= 1) {
            uint8_t desiredState = val[0];
            if (len >= 2) {
                desiredState = val[1];
            }
            Serial.printf("[BASELINE BLE WRITE] Received %u bytes. Commanded State: %d\n", (unsigned int)len, desiredState);
            setLed(desiredState);
        }
    }
};

void setup() {
    Serial.begin(115200);
    delay(500);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    s_ledState = 0;

    Serial.println("\n\n========================================");
    Serial.println(">>> SMARTDESK BASELINE MINIMAL SKETCH");
    Serial.println(">>> BUILD " __DATE__ " " __TIME__ ", tag BASELINE-1");
    Serial.println("========================================");

    NimBLEDevice::init(DEVICE_NAME);

    s_pServer = NimBLEDevice::createServer();
    static ServerCallbacks srvCallbacks;
    s_pServer->setCallbacks(&srvCallbacks);

    NimBLEService* pService = s_pServer->createService(SERVICE_UUID);

    s_pLedChar = pService->createCharacteristic(
        LED_CHAR_UUID,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::WRITE_NR |
        NIMBLE_PROPERTY::NOTIFY
    );

    static LedCallbacks ledCallbacks;
    s_pLedChar->setCallbacks(&ledCallbacks);
    uint8_t initVal = 0;
    s_pLedChar->setValue(&initVal, 1);

    pService->start();

    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    NimBLEAdvertisementData advData;
    advData.setFlags(0x06);
    advData.setName(DEVICE_NAME);
    pAdvertising->setAdvertisementData(advData);

    NimBLEAdvertisementData scanData;
    scanData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
    pAdvertising->setScanResponseData(scanData);

    pAdvertising->start();
    Serial.println(">>> [BASELINE BLE] Advertising started as SmartDesk-MIN");
}

void loop() {
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '1') {
            Serial.println("[SERIAL] '1' entered:");
            setLed(1);
        } else if (c == '0') {
            Serial.println("[SERIAL] '0' entered:");
            setLed(0);
        }
    }

    static uint32_t lastHeartbeat = 0;
    uint32_t now = millis();
    if (now - lastHeartbeat >= 4000) {
        lastHeartbeat = now;
        Serial.printf("[BASELINE Heartbeat %lums] GPIO %d=%s | BLE Clients: %d\n",
                      (unsigned long)now, LED_PIN,
                      s_ledState ? "HIGH (ON)" : "LOW (OFF)",
                      s_clientConnected ? 1 : 0);
    }
    delay(10);
}

