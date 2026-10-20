#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\relay_driver.h"
/**
 * relay_driver.h — Abstract base class for hardware relay drivers.
 *
 * Purpose : Defines the unified hardware interface for controlling relays.
 *           Hides all hardware details (direct GPIO pins vs shift register)
 *           from the RelayManager.
 * Depends : stdint.h, stdbool.h.
 * Used by : relay_driver_gpio.h, relay_driver_595.h, relays.cpp.
 * Feature : FEATURE_RELAYS
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

class RelayDriver {
public:
    virtual ~RelayDriver() {}

    /**
     * Initialize hardware pins and place all outputs in a safe electrical state.
     */
    virtual void begin() = 0;

    /**
     * Set the target electrical logic level for a specific channel.
     * @param index Channel index (0 to channelCount - 1)
     * @param level Electrical level (0 = LOW, 1 = HIGH)
     */
    virtual void setOutput(uint8_t index, uint8_t level) = 0;

    /**
     * Flush all buffered channel levels to the physical hardware simultaneously.
     */
    virtual void applyAll() = 0;

    /**
     * Immediately set all channels to safe physical level (all coils de-energized).
     */
    virtual void safeStateAll() = 0;

    /**
     * Get the number of hardware channels supported by this driver.
     */
    virtual uint8_t getChannelCount() const = 0;
};

