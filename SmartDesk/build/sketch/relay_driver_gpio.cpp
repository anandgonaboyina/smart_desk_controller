#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_driver_gpio.cpp"
/**
 * relay_driver_gpio.cpp — Implementation of direct GPIO relay driver.
 *
 * Purpose : Configures GPIO pins and writes logic levels to relay optocouplers.
 * Depends : relay_driver_gpio.h, Arduino.h.
 * Used by : relays.cpp.
 * Feature : FEATURE_RELAYS
 */

#include "relay_driver_gpio.h"
#include <Arduino.h>

GpioRelayDriver::GpioRelayDriver() : _initialized(false) {
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
        _pins[i] = DEFAULT_RELAY_PINS[i];
        // Default safe level is HIGH for active-LOW optocoupler relays
        _safeLevels[i] = 1;
        _levels[i] = 1;
    }
}

void GpioRelayDriver::begin() {
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
        uint8_t pin = _pins[i];
        if (isGpioSafe(pin)) {
            // Write safe level BEFORE setting mode to OUTPUT to prevent glitches
            digitalWrite(pin, _safeLevels[i]);
            pinMode(pin, OUTPUT);
            digitalWrite(pin, _safeLevels[i]);
        }
    }
    _initialized = true;
}

void GpioRelayDriver::setOutput(uint8_t index, uint8_t level) {
    if (index >= RELAY_COUNT) return;
    _levels[index] = (level != 0) ? 1 : 0;
    if (_initialized && isGpioSafe(_pins[index])) {
        digitalWrite(_pins[index], _levels[index]);
    }
}

void GpioRelayDriver::applyAll() {
    if (!_initialized) return;
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
        if (isGpioSafe(_pins[i])) {
            digitalWrite(_pins[i], _levels[i]);
        }
    }
}

void GpioRelayDriver::safeStateAll() {
    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
        _levels[i] = _safeLevels[i];
        if (_initialized && isGpioSafe(_pins[i])) {
            digitalWrite(_pins[i], _safeLevels[i]);
        }
    }
}

uint8_t GpioRelayDriver::getChannelCount() const {
    return RELAY_COUNT;
}

void GpioRelayDriver::setPin(uint8_t index, uint8_t gpioPin) {
    if (index >= RELAY_COUNT) return;
    if (isGpioSafe(gpioPin)) {
        _pins[index] = gpioPin;
        if (_initialized) {
            digitalWrite(gpioPin, _safeLevels[index]);
            pinMode(gpioPin, OUTPUT);
            digitalWrite(gpioPin, _levels[index]);
        }
    }
}

void GpioRelayDriver::setSafeLevel(uint8_t index, uint8_t level) {
    if (index >= RELAY_COUNT) return;
    _safeLevels[index] = (level != 0) ? 1 : 0;
}

