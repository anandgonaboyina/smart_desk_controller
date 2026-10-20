#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_driver_595.h"
/**
 * relay_driver_595.h — 74HC595 shift register hardware driver for up to 8 relays.
 *
 * Purpose : Drives up to 8 relay channels via a serial 74HC595 shift register.
 *           Compiled now for future expansion; active only when selected in settings.
 * Depends : relay_driver.h, pins.h, config.h, features.h.
 * Used by : relays.cpp.
 * Feature : FEATURE_RELAY_595
 */

#pragma once

#include "features.h"

#if FEATURE_RELAY_595

#include "relay_driver.h"
#include "pins.h"
#include "config.h"

class ShiftRegisterRelayDriver : public RelayDriver {
public:
    ShiftRegisterRelayDriver();
    virtual ~ShiftRegisterRelayDriver() {}

    virtual void begin() override;
    virtual void setOutput(uint8_t index, uint8_t level) override;
    virtual void applyAll() override;
    virtual void safeStateAll() override;
    virtual uint8_t getChannelCount() const override;

    void setSafeLevel(uint8_t index, uint8_t level);

private:
    uint8_t _outputByte;
    uint8_t _safeByte;
    bool _initialized;

    void shiftOutByte(uint8_t data);
    void pulseLatch();
};

#endif // FEATURE_RELAY_595

