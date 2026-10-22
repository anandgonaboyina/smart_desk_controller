/**
 * smartdesk_ble.h — NimBLE GATT Service & Fast Callback Subsystem for SmartDesk V2
 *
 * Purpose : Encapsulates NimBLE Server creation, HID device profile, GATT characteristics,
 *           non-blocking callback queue, and state notification dispatchers.
 * Depends : NimBLEDevice.h, NimBLEHIDDevice.h, smartdesk_pins.h.
 * Used by : smartdesk.ino.
 */

#pragma once

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <NimBLEHIDDevice.h>
#include "smartdesk_pins.h"

/* ── Fast Command Queue for Non-Blocking Callbacks ───────────────────────── */
enum WriteType { WT_NONE = 0, WT_RELAY, WT_LED, WT_CONFIG };

struct WriteCmd {
    WriteType type;
    uint8_t   len;
    uint8_t   data[72];
};

#define CMD_QUEUE_SIZE 32
static volatile uint8_t s_cmdHead = 0;
static volatile uint8_t s_cmdTail = 0;
static WriteCmd s_cmdQueue[CMD_QUEUE_SIZE];

static inline bool enqueueCmd(WriteType type, const uint8_t* data, size_t len) {
    uint8_t next = (s_cmdHead + 1) % CMD_QUEUE_SIZE;
    if (next == s_cmdTail) return false; // Queue full
    s_cmdQueue[s_cmdHead].type = type;
    s_cmdQueue[s_cmdHead].len  = (len > 72) ? 72 : (uint8_t)len;
    if (data && s_cmdQueue[s_cmdHead].len > 0) {
        memcpy(s_cmdQueue[s_cmdHead].data, data, s_cmdQueue[s_cmdHead].len);
    }
    s_cmdHead = next;
    return true;
}

/* ── Forward Declarations of State & Builders in smartdesk.ino ───────────── */
extern char     s_deviceName[25];
extern bool     s_connected;
extern uint8_t  s_ledMode;
extern uint8_t  s_ledR;
extern uint8_t  s_ledG;
extern uint8_t  s_ledB;
extern uint8_t  s_ledBri;
extern uint8_t  s_ledSpd;

extern void buildRelayPayload(uint8_t* out12);
extern void buildConfigPayload(uint8_t* outPayload, size_t maxLen);
extern void buildEnvPayload(uint8_t* outPayload);

/* ── NimBLE Server & Characteristic Handles ──────────────────────────────── */
static NimBLEServer*         s_pServer      = nullptr;
static NimBLEHIDDevice*      s_pHid         = nullptr;
static NimBLECharacteristic* s_pRelayChar   = nullptr;
static NimBLECharacteristic* s_pLedChar     = nullptr;
static NimBLECharacteristic* s_pConfigChar  = nullptr;
static NimBLECharacteristic* s_pInfoChar    = nullptr;
static NimBLECharacteristic* s_pEnvChar     = nullptr;

static volatile bool s_flagConnected       = false;
static volatile bool s_flagDisconnected    = false;
static volatile int  s_discReason          = 0;
static char          s_connectedClientAddr[18] = {0};

/* ── State Notification Dispatchers ──────────────────────────────────────── */
static inline void notifyRelayState() {
    if (!s_pRelayChar || !s_connected) return;
    uint8_t payload[12];
    buildRelayPayload(payload);
    s_pRelayChar->setValue(payload, 12);
    s_pRelayChar->notify();
}

static inline void notifyLedState() {
    if (!s_pLedChar || !s_connected) return;
    uint8_t payload[6] = { s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd };
    s_pLedChar->setValue(payload, 6);
    s_pLedChar->notify();
}

static inline void notifyEnvState() {
    if (!s_pEnvChar || !s_connected) return;
    uint8_t payload[24];
    buildEnvPayload(payload);
    s_pEnvChar->setValue(payload, sizeof(payload));
    s_pEnvChar->notify();
}

/* ── Characteristic Callbacks ────────────────────────────────────────────── */
class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        (void)pServer;
        s_connected = true;
        s_flagConnected = true;
        NimBLEAddress addr = connInfo.getAddress();
        strncpy(s_connectedClientAddr, addr.toString().c_str(), sizeof(s_connectedClientAddr) - 1);
        s_connectedClientAddr[sizeof(s_connectedClientAddr) - 1] = '\0';

        // Keep advertising active so secondary devices (e.g. Remote PWA) can discover
        // and connect concurrently even while mobile phone is paired/connected!
        NimBLEDevice::startAdvertising();
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        (void)connInfo;
        s_discReason = reason;

        // Only mark disconnected and trigger presence Away when NO clients remain connected!
        if (pServer->getConnectedCount() == 0) {
            s_connected = false;
            s_flagDisconnected = true;
        }

        // Always restart advertising so clients can reconnect
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
        buildConfigPayload(payload, sizeof(payload));
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
        uint8_t payload[24];
        buildEnvPayload(payload);
        pChr->setValue(payload, sizeof(payload));
    }
};

/* ── Full GATT Server Setup with HID Bonding ─────────────────────────────── */
static inline void initBleServer(const char* deviceName) {
    NimBLEDevice::init(deviceName);
    NimBLEDevice::setSecurityAuth(true, true, true);
    NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

    s_pServer = NimBLEDevice::createServer();

    // Setup BLE HID Device (Consumer Control / Media Remote) for background auto-reconnect
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

    // 1. RELAY: READ, WRITE, NOTIFY
    s_pRelayChar = pService->createCharacteristic(
        CHAR_RELAY_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    static RelayCallbacks relayCb;
    s_pRelayChar->setCallbacks(&relayCb);
    uint8_t initRelay[12];
    buildRelayPayload(initRelay);
    s_pRelayChar->setValue(initRelay, 12);

    // 2. LED: READ, WRITE, NOTIFY
    s_pLedChar = pService->createCharacteristic(
        CHAR_LED_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    static LedCallbacks ledCb;
    s_pLedChar->setCallbacks(&ledCb);
    uint8_t initLed[6] = { s_ledMode, s_ledR, s_ledG, s_ledB, s_ledBri, s_ledSpd };
    s_pLedChar->setValue(initLed, 6);

    // 3. CONFIG: READ, WRITE
    s_pConfigChar = pService->createCharacteristic(
        CHAR_CONFIG_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    static ConfigCallbacks configCb;
    s_pConfigChar->setCallbacks(&configCb);

    // 4. INFO: READ
    s_pInfoChar = pService->createCharacteristic(
        CHAR_INFO_UUID,
        NIMBLE_PROPERTY::READ
    );
    static InfoCallbacks infoCb;
    s_pInfoChar->setCallbacks(&infoCb);

    // 5. ENV: READ, NOTIFY
    s_pEnvChar = pService->createCharacteristic(
        CHAR_ENV_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    static EnvCallbacks envCb;
    s_pEnvChar->setCallbacks(&envCb);
    uint8_t initEnv[24];
    buildEnvPayload(initEnv);
    s_pEnvChar->setValue(initEnv, sizeof(initEnv));

    pService->start();

    // Setup and start fast advertising
    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    pAdv->setAppearance(GENERIC_HID);
    pAdv->addServiceUUID(NimBLEUUID(SERVICE_UUID));
    if (s_pHid) {
        pAdv->addServiceUUID(s_pHid->getHidService()->getUUID());
    }

    NimBLEAdvertisementData advData;
    advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
    advData.setName(deviceName);
    pAdv->setAdvertisementData(advData);

    NimBLEAdvertisementData scanData;
    scanData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
    pAdv->setScanResponseData(scanData);

    // Fast advertising interval: 20ms to 40ms for lightning-fast reconnects
    pAdv->setMinInterval(32);
    pAdv->setMaxInterval(64);
    pAdv->start();

    Serial.printf(">>> [BLE] Advertising started as \"%s\". Ready for connections.\n", deviceName);
}

