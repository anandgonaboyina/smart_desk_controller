#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_driver_595.cpp"
/**
 * relay_driver_595.cpp — Implementation of 74HC595 shift register relay driver.
 *
 * Purpose : Drives up to 8 relays through a 74HC595 using a glitch-free boot sequence.
 * Depends : relay_driver_595.h, Arduino.h.
 * Used by : relays.cpp.
 * Feature : FEATURE_RELAY_595
 */

#include "features.h"

#if FEATURE_RELAY_595

#include "relay_driver_595.h"
#include <Arduino.h>

ShiftRegisterRelayDriver::ShiftRegisterRelayDriver()
    : _outputByte(0xFF), _safeByte(0xFF), _initialized(false) {
}

void ShiftRegisterRelayDriver::begin() {
    // 1. Output Enable HIGH immediately to hold outputs in high-impedance
    pinMode(PIN_595_OE, OUTPUT);
    digitalWrite(PIN_595_OE, HIGH);

    // 2. Configure SPI/clock lines
    pinMode(PIN_595_SER, OUTPUT);
    pinMode(PIN_595_SRCLK, OUTPUT);
    pinMode(PIN_595_RCLK, OUTPUT);
    digitalWrite(PIN_595_SER, LOW);
    digitalWrite(PIN_595_SRCLK, LOW);
    digitalWrite(PIN_595_RCLK, LOW);

    // 3. Shift in safe states and latch before enabling outputs
    shiftOutByte(_safeByte);
    pulseLatch();

    // 4. OE LOW to activate outputs safely
    digitalWrite(PIN_595_OE, LOW);
    _initialized = true;
}

void ShiftRegisterRelayDriver::setOutput(uint8_t index, uint8_t level) {
    if (index >= RELAY_MAX) return;
    if (level != 0) {
        _outputByte |= (1 << index);
    } else {
        _outputByte &= ~(1 << index);
    }
}

void ShiftRegisterRelayDriver::applyAll() {
    if (!_initialized) return;
    shiftOutByte(_outputByte);
    pulseLatch();
}

void ShiftRegisterRelayDriver::safeStateAll() {
    _outputByte = _safeByte;
    applyAll();
}

uint8_t ShiftRegisterRelayDriver::getChannelCount() const {
    return RELAY_MAX;
}

void ShiftRegisterRelayDriver::setSafeLevel(uint8_t index, uint8_t level) {
    if (index >= RELAY_MAX) return;
    if (level != 0) {
        _safeByte |= (1 << index);
    } else {
        _safeByte &= ~(1 << index);
    }
}

void ShiftRegisterRelayDriver::shiftOutByte(uint8_t data) {
    // Bit-bang 8 bits, MSB first (Q7 to Q0)
    for (int8_t i = 7; i >= 0; i--) {
        digitalWrite(PIN_595_SER, (data & (1 << i)) ? HIGH : LOW);
        digitalWrite(PIN_595_SRCLK, HIGH);
        digitalWrite(PIN_595_SRCLK, LOW);
    }
}

void ShiftRegisterRelayDriver::pulseLatch() {
    digitalWrite(PIN_595_RCLK, HIGH);
    digitalWrite(PIN_595_RCLK, LOW);
}

#endif // FEATURE_RELAY_595

