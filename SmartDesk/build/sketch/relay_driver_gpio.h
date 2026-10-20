#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_driver_gpio.h"
/**
 * relay_driver_gpio.h — Direct GPIO hardware driver for 4-channel relay module.
 *
 * Purpose : Drives up to 4 relay channels directly from ESP32-S3 GPIO pins.
 * Depends : relay_driver.h, pins.h, config.h.
 * Used by : relays.cpp.
 * Feature : FEATURE_RELAYS
 */

#pragma once

#include "relay_driver.h"
#include "pins.h"
#include "config.h"

class GpioRelayDriver : public RelayDriver {
public:
    GpioRelayDriver();
    virtual ~GpioRelayDriver() {}

    virtual void begin() override;
    virtual void setOutput(uint8_t index, uint8_t level) override;
    virtual void applyAll() override;
    virtual void safeStateAll() override;
    virtual uint8_t getChannelCount() const override;

    /**
     * Update the assigned GPIO pin for a specific channel.
     * Takes effect on the next applyAll() or reboot.
     */
    void setPin(uint8_t index, uint8_t gpioPin);

    /**
     * Set the safe electrical level to use for safeStateAll().
     */
    void setSafeLevel(uint8_t index, uint8_t level);

private:
    uint8_t _pins[RELAY_COUNT];
    uint8_t _levels[RELAY_COUNT];
    uint8_t _safeLevels[RELAY_COUNT];
    bool _initialized;
};

