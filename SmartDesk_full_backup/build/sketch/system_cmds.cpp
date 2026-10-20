#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\system_cmds.cpp"
/**
 * system_cmds.cpp — Implementation of system control commands executor.
 *
 * Purpose : Dispatches administrative system commands, clears persistent configs,
 *           validates factory reset confirmation string, and triggers software reboot.
 * Depends : system_cmds.h, relays.h, feature_switches.h, scheduler.h, timers.h,
 *           leds.h, hid.h, Arduino.h.
 * Used by : ble_service.cpp, main.cpp.
 * Feature : Always compiled.
 */

#include "system_cmds.h"
#include "relays.h"
#include "feature_switches.h"
#include "features.h"
#include "log.h"
#include "diagnostics.h"
#include <Arduino.h>
#include <string.h>

#if FEATURE_SCHEDULER
#include "scheduler.h"
#endif

#if FEATURE_TIMERS
#include "timers.h"
#endif

#if FEATURE_LEDS
#include "leds.h"
#endif

#if FEATURE_HID
#include "hid.h"
#endif

#include "ble_service.h"

static uint32_t s_rebootAtMs = 0;

void systemCmdsScheduleReboot(uint16_t delayMs) {
    s_rebootAtMs = millis() + delayMs;
}

void systemCmdsLoop(void) {
    if (s_rebootAtMs != 0 && millis() >= s_rebootAtMs) {
        s_rebootAtMs = 0;
        ESP.restart();
    }
}

static uint8_t handleFactoryReset(const uint8_t* payload, uint8_t payloadLen) {
    // Requires exact "RESET" magic string (5 bytes)
    if (payloadLen < FACTORY_RESET_MAGIC_LEN ||
        memcmp(payload, FACTORY_RESET_MAGIC, FACTORY_RESET_MAGIC_LEN) != 0) {
        return ERR_CONFIRM_REQUIRED;
    }

    settingsResetAllRelayConfigs();
    resetFeatureSwitches();

#if FEATURE_SCHEDULER
    schedulerClearAll();
#endif
#if FEATURE_TIMERS
    timersClearAll();
#endif
#if FEATURE_LEDS
    for (uint8_t i = 0; i < LSLOT_MAX; i++) ledsDeleteSlot(i);
    for (uint8_t i = 0; i < LPRESET_MAX; i++) ledsDeletePreset(i);
#endif

    // Erase password ONLY if separate optional byte is explicitly 1
    if (payloadLen > FACTORY_RESET_MAGIC_LEN && payload[FACTORY_RESET_MAGIC_LEN] == 1) {
#if FEATURE_HID
        hidErasePassword();
#endif
    }

    systemCmdsScheduleReboot(500);
    return ERR_OK;
}

uint8_t systemCmdsExecute(uint8_t cmdId, const uint8_t* payload, uint8_t payloadLen) {
    switch (cmdId) {
        case SYSCMD_REBOOT:
            systemCmdsScheduleReboot(300);
            return ERR_OK;

        case SYSCMD_RESTART_BLE:
            bleRestartAdvertising();
            return ERR_OK;

        case SYSCMD_DISCONNECT_ALL:
            bleDisconnectAll();
            return ERR_OK;

        case SYSCMD_CLEAR_SCHEDULES:
#if FEATURE_SCHEDULER
            schedulerClearAll();
            return ERR_OK;
#else
            return ERR_FEATURE_DISABLED;
#endif

        case SYSCMD_CLEAR_TIMERS:
#if FEATURE_TIMERS
            timersClearAll();
            return ERR_OK;
#else
            return ERR_FEATURE_DISABLED;
#endif

        case SYSCMD_CLEAR_LED_SLOTS:
#if FEATURE_LEDS
            for (uint8_t i = 0; i < LSLOT_MAX; i++) ledsDeleteSlot(i);
            return ERR_OK;
#else
            return ERR_FEATURE_DISABLED;
#endif

        case SYSCMD_CLEAR_LED_PRESETS:
#if FEATURE_LEDS
            for (uint8_t i = 0; i < LPRESET_MAX; i++) ledsDeletePreset(i);
            return ERR_OK;
#else
            return ERR_FEATURE_DISABLED;
#endif

        case SYSCMD_RESET_RELAY_CFG:
            settingsResetAllRelayConfigs();
            return ERR_OK;

        case SYSCMD_RESET_FEAT_SW:
            resetFeatureSwitches();
            return ERR_OK;

        case SYSCMD_FACTORY_RESET:
            return handleFactoryReset(payload, payloadLen);

        case SYSCMD_ALL_LOAD_OFF:
            relaysAllLoadOff();
            return ERR_OK;

        case SYSCMD_SAFE_STATE:
            relaysSafeStateAll();
            return ERR_OK;

        case SYSCMD_SET_LOG_LEVEL:
            if (payloadLen >= 1) {
                logSetLevel(payload[0]);
                return ERR_OK;
            }
            return ERR_INVALID_PARAM;

        case SYSCMD_SET_LOG_ENABLED:
            if (payloadLen >= 1) {
                logSetEnabled(payload[0] != 0);
                return ERR_OK;
            }
            return ERR_INVALID_PARAM;

        case SYSCMD_RUN_SELFTEST:
            diagnosticsRunSelfTest();
            return ERR_OK;

        default:
            return ERR_INVALID_PARAM;
    }
}


