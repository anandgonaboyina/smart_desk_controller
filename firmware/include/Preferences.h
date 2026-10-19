/**
 * Preferences.h — Preferences NVS compatibility header.
 *
 * Purpose : Ensures clean IntelliSense resolution in VS Code while seamlessly
 *           delegating to the ESP32 Preferences library during compilation.
 * Depends : Nothing.
 * Used by : settings.cpp, relays.cpp, feature_switches.cpp, etc.
 * Feature : Always compiled.
 */

#pragma once

#if defined(__has_include_next)
  #if __has_include_next(<Preferences.h>)
    #include_next <Preferences.h>
    #define _REAL_PREFERENCES_INCLUDED 1
  #endif
#endif

#ifndef _REAL_PREFERENCES_INCLUDED
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

class Preferences {
public:
    Preferences() {}
    ~Preferences() {}

    bool begin(const char* name, bool readOnly = false) { (void)name; (void)readOnly; return true; }
    void end() {}
    bool clear() { return true; }
    bool remove(const char* key) { (void)key; return true; }
    bool isKey(const char* key) { (void)key; return false; }

    size_t putUChar(const char* key, uint8_t value) { (void)key; (void)value; return 1; }
    uint8_t getUChar(const char* key, uint8_t defaultValue = 0) { (void)key; return defaultValue; }

    size_t putUShort(const char* key, uint16_t value) { (void)key; (void)value; return 2; }
    uint16_t getUShort(const char* key, uint16_t defaultValue = 0) { (void)key; return defaultValue; }

    size_t putUInt(const char* key, uint32_t value) { (void)key; (void)value; return 4; }
    uint32_t getUInt(const char* key, uint32_t defaultValue = 0) { (void)key; return defaultValue; }

    size_t putBool(const char* key, bool value) { (void)key; (void)value; return 1; }
    bool getBool(const char* key, bool defaultValue = false) { (void)key; return defaultValue; }

    size_t putString(const char* key, const char* value) { (void)key; (void)value; return 0; }
    size_t getString(const char* key, char* value, size_t maxLen) { (void)key; (void)value; (void)maxLen; return 0; }

    size_t putBytes(const char* key, const void* value, size_t len) { (void)key; (void)value; return len; }
    size_t getBytes(const char* key, void* buf, size_t maxLen) { (void)key; (void)buf; return maxLen; }
};

#endif // _REAL_PREFERENCES_INCLUDED

