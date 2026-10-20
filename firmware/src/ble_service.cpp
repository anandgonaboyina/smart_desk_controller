/**
 * ble_service.cpp — Implementation of BLE GATT Peripheral Service.
 *
 * Purpose : Configures custom GATT server, 25 characteristics, client roles,
 *           security passkey (123456), non-blocking callbacks, and notifications.
 * Depends : ble_service.h, NimBLEDevice.h, packing.h, and all firmware subsystems.
 * Used by : main.cpp and all subsystems broadcasting state.
 * Feature : Always compiled.
 */

#include "ble_service.h"
#include <NimBLEDevice.h>

#ifndef NIMBLE_PROPERTY_READ
#define NIMBLE_PROPERTY_READ     NIMBLE_PROPERTY::READ
#define NIMBLE_PROPERTY_WRITE    NIMBLE_PROPERTY::WRITE
#define NIMBLE_PROPERTY_NOTIFY   NIMBLE_PROPERTY::NOTIFY
#define NIMBLE_PROPERTY_WRITE_NR NIMBLE_PROPERTY::WRITE_NR
#endif
#include "features.h"
#include "../lib/packing/packing.h"
#include "relays.h"
#include "feature_switches.h"
#include "settings.h"
#include "log.h"
#include <Arduino.h>
#include <string.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

#if FEATURE_SCHEDULER
#include "scheduler.h"
#endif
#if FEATURE_TIMERS
#include "timers.h"
#endif
#if FEATURE_AWAY
#include "away.h"
#endif
#if FEATURE_LEDS
#include "leds.h"
#endif
#if FEATURE_MUSIC
#include "music.h"
#endif
#if FEATURE_CALLMODE
#include "calls.h"
#endif
#if FEATURE_HID
#include "hid.h"
#include "hid_guard.h"
#endif
#include "system_cmds.h"
#include "reliability.h"

enum BleCmdType {
    BLE_CMD_NONE = 0,
    BLE_CMD_RELAY_STATE,
    BLE_CMD_RELAY_CONFIG_READ,
    BLE_CMD_RELAY_CONFIG_RESET,
    BLE_CMD_RELAY_CONFIG_WRITE,
    BLE_CMD_FEATURE_SWITCH,
#if FEATURE_LEDS
    BLE_CMD_LED_STATE,
#endif
};

struct BleCommand {
    uint8_t type;
    uint8_t index;
    uint8_t val;
    RelayConfig cfg;
#if FEATURE_LEDS
    LedState led;
#endif
};

static QueueHandle_t s_bleCmdQueue = (QueueHandle_t)0;

static NimBLEServer*         s_server = (NimBLEServer*)0;
static NimBLEService*        s_service = (NimBLEService*)0;
static uint8_t               s_connectedCount = 0;
static bool                  s_displayClientConnected = false;

// Characteristics pointers
static NimBLECharacteristic* s_chrRelayState = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrRelayConfig = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrRelayDriver = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrRelayTest = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrSchedules = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrTimers = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrAway = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrLedState = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrLedSlots = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrLedPresets = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrCallMode = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrFeatureSwitches = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrHidTypeNow = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrHidSettings = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrHidLog = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrSystemCmd = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrDeviceStatus = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrNotifyBlink = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrBootSettings = (NimBLECharacteristic*)0;
static NimBLECharacteristic* s_chrDeviceLog = (NimBLECharacteristic*)0;

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        (void)pServer; (void)connInfo;
        s_connectedCount++;
        LOGI(TAG_BLE, ">>> BLE CLIENT CONNECTED! Active clients: %d", s_connectedCount);
#if FEATURE_LEDS
        ledsTriggerNotificationBlink(NOTIFY_EVENT_BLE_CONNECTED);
#endif
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        (void)pServer; (void)connInfo; (void)reason;
        if (s_connectedCount > 0) s_connectedCount--;
        LOGI(TAG_BLE, "Client disconnected (reason %d). Active clients: %d", reason, s_connectedCount);
        s_displayClientConnected = false;
#if FEATURE_HID
        hidGuardSetDisplayConnected(false);
#endif
#if FEATURE_LEDS
        ledsTriggerNotificationBlink(NOTIFY_EVENT_BLE_LOST);
#endif
        NimBLEDevice::startAdvertising();
    }
};

class RoleCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= 1) {
            LOGI(TAG_BLE, "Client role set: %s", (val[0] == ROLE_DISPLAY) ? "DISPLAY" : "REMOTE");
            if (val[0] == ROLE_DISPLAY) {
                s_displayClientConnected = true;
#if FEATURE_HID
                hidGuardSetDisplayConnected(true);
#endif
            }
        }
    }
};

class RelayStateCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t count = relaysGetActiveCount();
        uint8_t buf[RELAY_MAX + 1];
        buf[0] = count;
        relaysGetAllLoad(&buf[1], count);
        pChr->setValue(buf, count + 1);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= 2 && s_bleCmdQueue) {
            BleCommand cmd;
            memset(&cmd, 0, sizeof(cmd));
            cmd.type = BLE_CMD_RELAY_STATE;
            cmd.index = val[0];
            cmd.val = val[1];
            xQueueSend(s_bleCmdQueue, &cmd, 0);
        }
    }
};

class RelayConfigCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len < 2 || !s_bleCmdQueue) return;
        uint8_t cmdType = val[0];
        uint8_t idx = val[1];
        BleCommand cmd;
        memset(&cmd, 0, sizeof(cmd));
        cmd.index = idx;

        if (cmdType == RCFG_CMD_READ) {
            cmd.type = BLE_CMD_RELAY_CONFIG_READ;
            xQueueSend(s_bleCmdQueue, &cmd, 0);
        } else if (cmdType == RCFG_CMD_RESET) {
            cmd.type = BLE_CMD_RELAY_CONFIG_RESET;
            xQueueSend(s_bleCmdQueue, &cmd, 0);
        } else if (cmdType == RCFG_CMD_WRITE && len >= (RCFG_OFF_NAME_LEN + 2)) {
            cmd.type = BLE_CMD_RELAY_CONFIG_WRITE;
            cmd.cfg.enabled = val[2 + RCFG_OFF_ENABLED];
            cmd.cfg.polarity = val[2 + RCFG_OFF_POLARITY];
            cmd.cfg.wiring = val[2 + RCFG_OFF_WIRING];
            cmd.cfg.bootBehavior = val[2 + RCFG_OFF_BOOT];
            cmd.cfg.gpioPin = val[2 + RCFG_OFF_PIN];
            cmd.cfg.minSwitchMs = unpackUint16LE(&val[2 + RCFG_OFF_MIN_SW_LO]);
            cmd.cfg.affectedByAway = val[2 + RCFG_OFF_AWAY];

            uint8_t nLen = val[2 + RCFG_OFF_NAME_LEN];
            if (nLen > RCFG_MAX_NAME) nLen = RCFG_MAX_NAME;
            memcpy(cmd.cfg.name, &val[2 + 9], nLen);
            cmd.cfg.name[nLen] = '\0';

            uint8_t iLenOffset = 2 + 9 + nLen;
            if (len > iLenOffset) {
                uint8_t iLen = val[iLenOffset];
                if (iLen > RCFG_MAX_ICON) iLen = RCFG_MAX_ICON;
                memcpy(cmd.cfg.icon, &val[iLenOffset + 1], iLen);
                cmd.cfg.icon[iLen] = '\0';
            } else {
                cmd.cfg.icon[0] = '\0';
            }
            xQueueSend(s_bleCmdQueue, &cmd, 0);
        }
    }
};

class TimeSyncCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= TSYNC_SIZE) {
            uint32_t unixTs = unpackUint32LE(&val[0]);
            int16_t tzOffsetMin = unpackInt16LE(&val[4]);
#if FEATURE_SCHEDULER
            schedulerSyncTime(unixTs, tzOffsetMin);
#endif
        }
    }
};

#if FEATURE_MUSIC
class MusicStreamCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= MUSIC_PACKET_SIZE) {
            musicProcessPacket(val);
        }
    }
};
#endif

#if FEATURE_LEDS
class LedStateCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        LedState st;
        ledsGetState(&st);
        uint8_t buf[LED_STATE_SIZE];
        buf[0] = st.mode; buf[1] = st.effect;
        buf[2] = st.r; buf[3] = st.g; buf[4] = st.b;
        buf[5] = st.brightness; buf[6] = st.speed; buf[7] = st.autoResumeMin;
        buf[8] = st.r2; buf[9] = st.g2; buf[10] = st.b2;
        packUint16LE(&buf[11], st.blinkOnMs);
        packUint16LE(&buf[13], st.blinkOffMs);
        pChr->setValue(buf, LED_STATE_SIZE);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= 7 && s_bleCmdQueue) {
            BleCommand cmd;
            memset(&cmd, 0, sizeof(cmd));
            cmd.type = BLE_CMD_LED_STATE;
            ledsGetState(&cmd.led);
            cmd.led.mode = val[0];
            cmd.led.effect = val[1];
            cmd.led.r = val[2]; cmd.led.g = val[3]; cmd.led.b = val[4];
            cmd.led.brightness = val[5];
            cmd.led.speed = val[6];
            if (len >= 8) cmd.led.autoResumeMin = val[7];
            if (len >= 11) { cmd.led.r2 = val[8]; cmd.led.g2 = val[9]; cmd.led.b2 = val[10]; }
            if (len >= 13) cmd.led.blinkOnMs = unpackUint16LE(&val[11]);
            if (len >= 15) cmd.led.blinkOffMs = unpackUint16LE(&val[13]);
            xQueueSend(s_bleCmdQueue, &cmd, 0);
        }
    }
};
#endif

class FeatureSwitchCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t buf[FSWITCH_COUNT];
        uint8_t cnt = getFeatureSwitches(buf, FSWITCH_COUNT);
        pChr->setValue(buf, cnt);
    }

    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= 2 && s_bleCmdQueue) {
            BleCommand cmd;
            memset(&cmd, 0, sizeof(cmd));
            cmd.type = BLE_CMD_FEATURE_SWITCH;
            cmd.index = val[0];
            cmd.val = val[1];
            xQueueSend(s_bleCmdQueue, &cmd, 0);
        }
    }
};

class SystemCmdCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        size_t len = pChr->getLength();
        const uint8_t* val = pChr->getValue().data();
        if (len >= 1) {
            uint8_t cmdId = val[0];
            const uint8_t* payload = (len > 1) ? &val[1] : (const uint8_t*)0;
            uint8_t res = systemCmdsExecute(cmdId, payload, (uint8_t)(len - 1));
            uint8_t resp[2] = {res, cmdId};
            pChr->setValue(resp, 2);
            pChr->notify();
        }
    }
};

class DeviceStatusCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
        (void)connInfo;
        uint8_t buf[DEVICE_STATUS_SIZE];
        buf[0] = reliabilityGetLastResetReason();
        packUint32LE(&buf[1], reliabilityGetUptimeSec());
        buf[5] = FIRMWARE_VERSION_MAJOR;
        buf[6] = FIRMWARE_VERSION_MINOR;
        buf[7] = FIRMWARE_VERSION_PATCH;
        packUint32LE(&buf[8], reliabilityGetFreeHeap());
        buf[12] = relaysGetDriverType();
        buf[13] = bleGetConnectedCount();
        pChr->setValue(buf, DEVICE_STATUS_SIZE);
    }
};

static void setupCharacteristics(void) {
    // Protocol version (Read-only)
    NimBLECharacteristic* chrVer = s_service->createCharacteristic(UUID_PROTOCOL_VERSION, NIMBLE_PROPERTY_READ);
    chrVer->setValue((uint8_t)PROTOCOL_VERSION);

    // Client role
    NimBLECharacteristic* chrRole = s_service->createCharacteristic(UUID_CLIENT_ROLE, NIMBLE_PROPERTY_WRITE);
    static RoleCallbacks roleCb; chrRole->setCallbacks(&roleCb);

    // Relays
    s_chrRelayState = s_service->createCharacteristic(UUID_RELAY_STATE, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    static RelayStateCallbacks rStateCb; s_chrRelayState->setCallbacks(&rStateCb);

    s_chrRelayConfig = s_service->createCharacteristic(UUID_RELAY_CONFIG, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    static RelayConfigCallbacks rCfgCb; s_chrRelayConfig->setCallbacks(&rCfgCb);

    s_chrRelayDriver = s_service->createCharacteristic(UUID_RELAY_DRIVER, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE);
    s_chrRelayTest   = s_service->createCharacteristic(UUID_RELAY_TEST, NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);

    // Time & features
    NimBLECharacteristic* chrTime = s_service->createCharacteristic(UUID_TIME_SYNC, NIMBLE_PROPERTY_WRITE);
    static TimeSyncCallbacks timeCb; chrTime->setCallbacks(&timeCb);

    s_chrFeatureSwitches = s_service->createCharacteristic(UUID_FEATURE_SWITCHES, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    static FeatureSwitchCallbacks featCb; s_chrFeatureSwitches->setCallbacks(&featCb);

    // Schedules, Timers, Away
    s_chrSchedules = s_service->createCharacteristic(UUID_SCHEDULES, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrTimers    = s_service->createCharacteristic(UUID_TIMERS, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrAway      = s_service->createCharacteristic(UUID_AWAY_MODE, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);

    // LEDs & Music
#if FEATURE_LEDS
    s_chrLedState   = s_service->createCharacteristic(UUID_LED_STATE, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_WRITE_NR | NIMBLE_PROPERTY_NOTIFY);
    static LedStateCallbacks ledStateCb;
    s_chrLedState->setCallbacks(&ledStateCb);
#else
    s_chrLedState   = s_service->createCharacteristic(UUID_LED_STATE, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_NOTIFY);
#endif
    s_chrLedSlots   = s_service->createCharacteristic(UUID_LED_SLOTS, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrLedPresets = s_service->createCharacteristic(UUID_LED_PRESETS, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrNotifyBlink = s_service->createCharacteristic(UUID_LED_NOTIFY_BLINK, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrBootSettings = s_service->createCharacteristic(UUID_LED_BOOT_SETTINGS, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE);

#if FEATURE_MUSIC
    NimBLECharacteristic* chrMusic = s_service->createCharacteristic(UUID_MUSIC_STREAM, NIMBLE_PROPERTY_WRITE_NR);
    static MusicStreamCallbacks musicCb; chrMusic->setCallbacks(&musicCb);
#endif

    // Calls, HID, System
    s_chrCallMode     = s_service->createCharacteristic(UUID_CALL_MODE, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrHidTypeNow   = s_service->createCharacteristic(UUID_HID_TYPE_NOW, NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    s_chrHidSettings  = s_service->createCharacteristic(UUID_HID_SETTINGS, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_WRITE);
    s_chrHidLog       = s_service->createCharacteristic(UUID_HID_LOG, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_NOTIFY);

    s_chrSystemCmd    = s_service->createCharacteristic(UUID_SYSTEM_CMD, NIMBLE_PROPERTY_WRITE | NIMBLE_PROPERTY_NOTIFY);
    static SystemCmdCallbacks sysCmdCb; s_chrSystemCmd->setCallbacks(&sysCmdCb);

    s_chrDeviceStatus = s_service->createCharacteristic(UUID_DEVICE_STATUS, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_NOTIFY);
    static DeviceStatusCallbacks devStatCb; s_chrDeviceStatus->setCallbacks(&devStatCb);

    s_chrDeviceLog = s_service->createCharacteristic(UUID_DEVICE_LOG, NIMBLE_PROPERTY_READ | NIMBLE_PROPERTY_NOTIFY);
}

void bleBegin(void) {
    NimBLEDevice::init(DEVICE_NAME);

#if SECURITY_MODE == 1
    NimBLEDevice::setSecurityAuth(true, true, true);
    NimBLEDevice::setSecurityPasskey(BLE_PIN);
    NimBLEDevice::setSecurityIOCap(0); // Display only
#endif

    if (s_bleCmdQueue == (QueueHandle_t)0) {
        s_bleCmdQueue = xQueueCreate(16, sizeof(BleCommand));
    }
    s_server = NimBLEDevice::createServer();
    static ServerCallbacks srvCb;
    s_server->setCallbacks(&srvCb);

    s_service = s_server->createService(UUID_SERVICE);
    setupCharacteristics();
    s_service->start();

    // Wire subsystem state change callbacks
    relaysRegisterCallback([](uint8_t, uint8_t) { bleNotifyRelayState(); });
    registerFeatureSwitchCallback([](uint8_t, uint8_t) { bleNotifyFeatureSwitches(); });
#if FEATURE_LEDS
    ledsRegisterCallback([](const LedState*) { bleNotifyLedState(); });
#endif
    logSetNotifyCallback(bleNotifyDeviceLog);


    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();

    NimBLEAdvertisementData advData;
    advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
    advData.setName(DEVICE_NAME);
    pAdv->setAdvertisementData(advData);

    NimBLEAdvertisementData scanData;
    scanData.setCompleteServices(NimBLEUUID(UUID_SERVICE));
    pAdv->setScanResponseData(scanData);

    pAdv->setMinInterval(0x20); // 20ms fast advertising
    pAdv->setMaxInterval(0x40); // 40ms fast advertising
    pAdv->start();
}

void bleRestartAdvertising(void) {
    if (s_connectedCount < BLE_MAX_CLIENTS) {
        NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
        pAdv->stop();
        pAdv->start();
    }
}

void bleDisconnectAll(void) {
    if (s_server) {
        // Disconnect will trigger onDisconnect callback
        s_connectedCount = 0;
    }
}

uint8_t bleGetConnectedCount(void) {
    return s_connectedCount;
}

void bleNotifyRelayState(void) {
    if (s_chrRelayState && s_connectedCount > 0) {
        uint8_t count = relaysGetActiveCount();
        uint8_t buf[RELAY_MAX + 1];
        buf[0] = count;
        relaysGetAllLoad(&buf[1], count);
        s_chrRelayState->setValue(buf, count + 1);
        s_chrRelayState->notify();
    }
}

void bleNotifyRelayConfig(uint8_t relayIndex) {
    if (s_chrRelayConfig && s_connectedCount > 0) {
        RelayConfig cfg;
        if (relaysGetConfig(relayIndex, &cfg)) {
            uint8_t buf[64];
            buf[0] = ERR_OK;
            buf[1] = RCFG_CMD_READ;
            buf[2] = relayIndex;
            buf[3] = cfg.enabled;
            buf[4] = cfg.polarity;
            buf[5] = cfg.wiring;
            buf[6] = cfg.bootBehavior;
            buf[7] = cfg.gpioPin;
            packUint16LE(&buf[8], cfg.minSwitchMs);
            buf[10] = cfg.affectedByAway;
            uint8_t nLen = strlen(cfg.name);
            buf[11] = nLen;
            memcpy(&buf[12], cfg.name, nLen);
            uint8_t iLen = strlen(cfg.icon);
            buf[12 + nLen] = iLen;
            memcpy(&buf[13 + nLen], cfg.icon, iLen);
            s_chrRelayConfig->setValue(buf, 13 + nLen + iLen);
            s_chrRelayConfig->notify();
        }
    }
}

void bleNotifyFeatureSwitches(void) {
    if (s_chrFeatureSwitches && s_connectedCount > 0) {
        uint8_t buf[FSWITCH_COUNT];
        uint8_t cnt = getFeatureSwitches(buf, FSWITCH_COUNT);
        s_chrFeatureSwitches->setValue(buf, cnt);
        s_chrFeatureSwitches->notify();
    }
}

void bleNotifyTimer(uint8_t relayIndex) {
    (void)relayIndex;
}

void bleNotifyAway(void) {
    if (s_chrAway && s_connectedCount > 0) {
        uint8_t state; uint16_t delaySec, maxDur, remDelay, elapsed;
#if FEATURE_AWAY
        awayGetStatus(&state, &delaySec, &maxDur, &remDelay, &elapsed);
#else
        state = 0; delaySec = 0; maxDur = 0; remDelay = 0; elapsed = 0;
#endif
        uint8_t buf[AWAY_NOTIFY_SIZE];
        buf[0] = state;
        packUint16LE(&buf[1], delaySec);
        packUint16LE(&buf[3], maxDur);
        packUint16LE(&buf[5], remDelay);
        packUint16LE(&buf[7], elapsed);
        s_chrAway->setValue(buf, AWAY_NOTIFY_SIZE);
        s_chrAway->notify();
    }
}

void bleNotifyLedState(void) {
    if (s_chrLedState && s_connectedCount > 0) {
        LedState st;
#if FEATURE_LEDS
        ledsGetState(&st);
#else
        memset(&st, 0, sizeof(st));
#endif
        uint8_t buf[LED_STATE_SIZE];
        buf[0] = st.mode; buf[1] = st.effect;
        buf[2] = st.r; buf[3] = st.g; buf[4] = st.b;
        buf[5] = st.brightness; buf[6] = st.speed; buf[7] = st.autoResumeMin;
        buf[8] = st.r2; buf[9] = st.g2; buf[10] = st.b2;
        packUint16LE(&buf[11], st.blinkOnMs);
        packUint16LE(&buf[13], st.blinkOffMs);
        s_chrLedState->setValue(buf, LED_STATE_SIZE);
        s_chrLedState->notify();
    }
}

void bleNotifyCallMode(void) {
    if (s_chrCallMode && s_connectedCount > 0) {
        uint8_t buf[CALL_NOTIFY_SIZE];
#if FEATURE_CALLMODE
        buf[0] = callsIsActive() ? 1 : 0;
        buf[1] = callsGetAutoOffMin();
#else
        buf[0] = 0; buf[1] = 0;
#endif
        s_chrCallMode->setValue(buf, CALL_NOTIFY_SIZE);
        s_chrCallMode->notify();
    }
}

void bleNotifyDeviceStatus(void) {
    if (s_chrDeviceStatus && s_connectedCount > 0) {
        uint8_t buf[DEVICE_STATUS_SIZE];
        buf[0] = reliabilityGetLastResetReason();
        packUint32LE(&buf[1], reliabilityGetUptimeSec());
        buf[5] = FIRMWARE_VERSION_MAJOR;
        buf[6] = FIRMWARE_VERSION_MINOR;
        buf[7] = FIRMWARE_VERSION_PATCH;
        packUint32LE(&buf[8], reliabilityGetFreeHeap());
        buf[12] = relaysGetDriverType();
        buf[13] = bleGetConnectedCount();
        s_chrDeviceStatus->setValue(buf, DEVICE_STATUS_SIZE);
        s_chrDeviceStatus->notify();
    }
}

void bleNotifyDeviceLog(const char* line) {
    if (s_chrDeviceLog != NULL && s_connectedCount > 0 && line != NULL) {
        s_chrDeviceLog->setValue((const uint8_t*)line, strlen(line));
        s_chrDeviceLog->notify();
    }
}

void bleLoop(void) {
    if (!s_bleCmdQueue) return;

    BleCommand cmd;
    while (xQueueReceive(s_bleCmdQueue, &cmd, 0) == pdTRUE) {
        switch (cmd.type) {
            case BLE_CMD_RELAY_STATE:
                LOGI(TAG_BLE, ">>> Processing BLE RelayState: idx=%d desiredLoad=%d", cmd.index, cmd.val);
                relaysSetLoad(cmd.index, cmd.val);
                bleNotifyRelayState();
                break;
            case BLE_CMD_RELAY_CONFIG_READ:
                bleNotifyRelayConfig(cmd.index);
                break;
            case BLE_CMD_RELAY_CONFIG_RESET:
                settingsResetRelayConfig(cmd.index);
                bleNotifyRelayConfig(cmd.index);
                break;
            case BLE_CMD_RELAY_CONFIG_WRITE:
                LOGI(TAG_BLE, ">>> Processing BLE RelayConfig: idx=%d name='%s' pin=%d polar=%d",
                     cmd.index, cmd.cfg.name, cmd.cfg.gpioPin, cmd.cfg.polarity);
                relaysSetConfig(cmd.index, &cmd.cfg);
                bleNotifyRelayConfig(cmd.index);
                break;
            case BLE_CMD_FEATURE_SWITCH:
                LOGI(TAG_BLE, ">>> Processing BLE FeatureSwitch: idx=%d val=%d", cmd.index, cmd.val);
                setFeatureSwitch(cmd.index, cmd.val);
                bleNotifyFeatureSwitches();
                break;
#if FEATURE_LEDS
            case BLE_CMD_LED_STATE:
                LOGI(TAG_BLE, ">>> Processing BLE LED: mode=%u effect=%u bri=%u rgb=#%02X%02X%02X",
                     cmd.led.mode, cmd.led.effect, cmd.led.brightness, cmd.led.r, cmd.led.g, cmd.led.b);
                ledsSetState(&cmd.led);
                bleNotifyLedState();
                break;
#endif
            default:
                break;
        }
    }
}


