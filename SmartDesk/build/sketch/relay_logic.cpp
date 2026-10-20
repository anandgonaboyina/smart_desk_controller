#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_logic.cpp"
/**
 * relay_logic.cpp — Implementation of pure relay logic calculation.
 *
 * Purpose : Functions to convert between LOAD state, COIL state, and GPIO level.
 * Depends : relay_logic.h
 * Used by : relays.cpp, relay_driver_gpio.cpp, relay_driver_595.cpp.
 * Feature : Always compiled.
 */

#include "relay_logic.h"

uint8_t relayLoadToCoil(uint8_t load, uint8_t wiring) {
    uint8_t normLoad = (load != 0) ? 1 : 0;
    if (wiring == RELAY_WIRING_NC) {
        return (normLoad == 1) ? RELAY_COIL_OFF : RELAY_COIL_ON;
    }
    return (normLoad == 1) ? RELAY_COIL_ON : RELAY_COIL_OFF;
}

uint8_t relayCoilToLevel(uint8_t coil, uint8_t polarity) {
    uint8_t normCoil = (coil != 0) ? 1 : 0;
    if (polarity == RELAY_POLARITY_ACTIVE_LOW) {
        return (normCoil == 1) ? RELAY_LEVEL_LOW : RELAY_LEVEL_HIGH;
    }
    return (normCoil == 1) ? RELAY_LEVEL_HIGH : RELAY_LEVEL_LOW;
}

uint8_t relayLoadToLevel(uint8_t load, uint8_t polarity, uint8_t wiring) {
    uint8_t coil = relayLoadToCoil(load, wiring);
    return relayCoilToLevel(coil, polarity);
}

uint8_t relayLevelToLoad(uint8_t level, uint8_t polarity, uint8_t wiring) {
    uint8_t normLevel = (level != 0) ? 1 : 0;
    uint8_t coil;
    if (polarity == RELAY_POLARITY_ACTIVE_LOW) {
        coil = (normLevel == RELAY_LEVEL_LOW) ? RELAY_COIL_ON : RELAY_COIL_OFF;
    } else {
        coil = (normLevel == RELAY_LEVEL_HIGH) ? RELAY_COIL_ON : RELAY_COIL_OFF;
    }

    if (wiring == RELAY_WIRING_NC) {
        return (coil == RELAY_COIL_ON) ? RELAY_LOAD_OFF : RELAY_LOAD_ON;
    }
    return (coil == RELAY_COIL_ON) ? RELAY_LOAD_ON : RELAY_LOAD_OFF;
}

uint8_t relayGetSafeOffLevel(uint8_t polarity, uint8_t wiring) {
    return relayLoadToLevel(RELAY_LOAD_OFF, polarity, wiring);
}

bool relayCanSwitch(uint32_t nowMs, uint32_t lastSwitchMs, uint16_t minIntervalMs) {
    uint32_t elapsed = nowMs - lastSwitchMs;
    return (elapsed >= (uint32_t)minIntervalMs);
}

