/**
 * Arduino.h — Arduino compatibility header.
 *
 * Purpose : Ensures clean IntelliSense resolution in VS Code while seamlessly
 *           delegating to the ESP32 Arduino Core during compilation.
 * Depends : Nothing.
 * Used by : All firmware files including <Arduino.h>.
 * Feature : Always compiled.
 */

#pragma once

#if defined(__has_include_next)
  #if __has_include_next(<Arduino.h>)
    #include_next <Arduino.h>
    #define _REAL_ARDUINO_CORE_INCLUDED 1
  #endif
#endif

#ifndef _REAL_ARDUINO_CORE_INCLUDED
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

#define HIGH 0x1
#define LOW  0x0

#define INPUT        0x01
#define OUTPUT       0x02
#define PULLUP       0x04
#define INPUT_PULLUP 0x05

#ifdef __cplusplus
extern "C" {
#endif

void pinMode(uint8_t pin, uint8_t mode);
void digitalWrite(uint8_t pin, uint8_t val);
int digitalRead(uint8_t pin);
uint32_t millis(void);
uint32_t micros(void);
void delay(uint32_t ms);
void delayMicroseconds(uint32_t us);
void yield(void);

#ifdef __cplusplus
}
#endif

#endif // _REAL_ARDUINO_CORE_INCLUDED

