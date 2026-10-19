/**
 * USB.h — USB compatibility header for TinyUSB stack.
 *
 * Purpose : Ensures clean IntelliSense resolution in VS Code while seamlessly
 *           delegating to the ESP32 USB library during compilation.
 * Depends : Nothing.
 * Used by : hid.cpp.
 * Feature : FEATURE_HID
 */

#pragma once

#if defined(__has_include_next)
  #if __has_include_next(<USB.h>)
    #include_next <USB.h>
    #define _REAL_USB_INCLUDED 1
  #endif
#endif

#ifndef _REAL_USB_INCLUDED
#include <stdint.h>
#include <stdbool.h>

class ESPUSB {
public:
    ESPUSB() {}
    bool begin() { return true; }
    void VID(uint16_t v) { (void)v; }
    void PID(uint16_t p) { (void)p; }
    void manufacturerName(const char* m) { (void)m; }
    void productName(const char* p) { (void)p; }
};

extern ESPUSB USB;

#endif // _REAL_USB_INCLUDED

