/**
 * USBHIDKeyboard.h — USBHIDKeyboard compatibility header.
 *
 * Purpose : Ensures clean IntelliSense resolution in VS Code while seamlessly
 *           delegating to the ESP32 USBHIDKeyboard library during compilation.
 * Depends : Nothing.
 * Used by : hid.cpp.
 * Feature : FEATURE_HID
 */

#pragma once

#if defined(__has_include_next)
  #if __has_include_next(<USBHIDKeyboard.h>)
    #include_next <USBHIDKeyboard.h>
    #define _REAL_USBHIDKEYBOARD_INCLUDED 1
  #endif
#endif

#ifndef _REAL_USBHIDKEYBOARD_INCLUDED
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#define KEY_RETURN 0xB0

class USBHIDKeyboard {
public:
    USBHIDKeyboard() {}
    void begin() {}
    void end() {}
    size_t write(uint8_t c) { (void)c; return 1; }
    size_t write(const uint8_t *buffer, size_t size) { (void)buffer; return size; }
    size_t print(const char* s) { (void)s; return 1; }
    size_t println(const char* s) { (void)s; return 1; }
    void press(uint8_t k) { (void)k; }
    void release(uint8_t k) { (void)k; }
    void releaseAll() {}
};

#endif // _REAL_USBHIDKEYBOARD_INCLUDED

