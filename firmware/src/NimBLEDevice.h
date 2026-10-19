/**
 * NimBLEDevice.h — NimBLE-Arduino 2.x compatibility header.
 *
 * Purpose : Ensures clean IntelliSense resolution in VS Code while seamlessly
 *           delegating to the installed NimBLE-Arduino 2.x library during compilation.
 * Depends : Nothing.
 * Used by : ble_service.cpp.
 * Feature : Always compiled.
 */

#pragma once

#if defined(__has_include_next)
  #if __has_include_next(<NimBLEDevice.h>)
    #include_next <NimBLEDevice.h>
    #define _REAL_NIMBLE_INCLUDED 1
  #endif
#endif

#ifndef _REAL_NIMBLE_INCLUDED
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#define NIMBLE_PROPERTY_READ      0x01
#define NIMBLE_PROPERTY_WRITE     0x02
#define NIMBLE_PROPERTY_NOTIFY    0x04
#define NIMBLE_PROPERTY_WRITE_NR  0x08

class NimBLECharacteristic;
class NimBLEServer;
class NimBLEService;
class NimBLEAdvertising;
class NimBLEConnInfo;

class NimBLECharacteristicCallbacks {
public:
    virtual ~NimBLECharacteristicCallbacks() {}
    virtual void onRead(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) { (void)pCharacteristic; (void)connInfo; }
    virtual void onWrite(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) { (void)pCharacteristic; (void)connInfo; }
};

class NimBLEServerCallbacks {
public:
    virtual ~NimBLEServerCallbacks() {}
    virtual void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) { (void)pServer; (void)connInfo; }
    virtual void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) { (void)pServer; (void)connInfo; (void)reason; }
};

class NimBLECharacteristic {
public:
    void setCallbacks(NimBLECharacteristicCallbacks* pCallbacks) { (void)pCallbacks; }
    void setValue(const uint8_t* data, size_t size) { (void)data; (void)size; }
    void setValue(uint8_t val) { (void)val; }
    const uint8_t* getValue(size_t* len = 0) const { (void)len; return (const uint8_t*)0; }
    size_t getDataLength() const { return 0; }
    bool notify() { return true; }
};

class NimBLEService {
public:
    NimBLECharacteristic* createCharacteristic(const char* uuid, uint32_t properties) {
        (void)uuid; (void)properties; return (NimBLECharacteristic*)0;
    }
    bool start() { return true; }
};

class NimBLEServer {
public:
    void setCallbacks(NimBLEServerCallbacks* pCallbacks) { (void)pCallbacks; }
    NimBLEService* createService(const char* uuid) { (void)uuid; return (NimBLEService*)0; }
    size_t getConnectedCount() { return 0; }
    void disconnect(uint16_t conn_id) { (void)conn_id; }
};

class NimBLEAdvertising {
public:
    bool addServiceUUID(const char* uuid) { (void)uuid; return true; }
    bool start() { return true; }
    bool stop() { return true; }
    void setScanResponse(bool set) { (void)set; }
};

class NimBLEDevice {
public:
    static void init(const char* deviceName) { (void)deviceName; }
    static NimBLEServer* createServer() { return (NimBLEServer*)0; }
    static NimBLEAdvertising* getAdvertising() { return (NimBLEAdvertising*)0; }
    static void setSecurityAuth(bool bonding, bool mitm, bool sc) { (void)bonding; (void)mitm; (void)sc; }
    static void setSecurityPasskey(uint32_t passkey) { (void)passkey; }
    static void setSecurityIOCap(uint8_t iocap) { (void)iocap; }
};

#endif // _REAL_NIMBLE_INCLUDED

