/**
 * packing.cpp — Implementation of pure byte packing and unpacking helpers.
 *
 * Purpose : Serialize and deserialize multi-byte Little-Endian integers.
 * Depends : packing.h
 * Used by : ble_service.cpp.
 * Feature : Always compiled.
 */

#include "packing.h"

void packUint16LE(uint8_t* dest, uint16_t val) {
    if (dest == (uint8_t*)0) return;
    dest[0] = (uint8_t)(val & 0xFF);
    dest[1] = (uint8_t)((val >> 8) & 0xFF);
}

uint16_t unpackUint16LE(const uint8_t* src) {
    if (src == (const uint8_t*)0) return 0;
    return (uint16_t)src[0] | ((uint16_t)src[1] << 8);
}

void packInt16LE(uint8_t* dest, int16_t val) {
    packUint16LE(dest, (uint16_t)val);
}

int16_t unpackInt16LE(const uint8_t* src) {
    return (int16_t)unpackUint16LE(src);
}

void packUint32LE(uint8_t* dest, uint32_t val) {
    if (dest == (uint8_t*)0) return;
    dest[0] = (uint8_t)(val & 0xFF);
    dest[1] = (uint8_t)((val >> 8) & 0xFF);
    dest[2] = (uint8_t)((val >> 16) & 0xFF);
    dest[3] = (uint8_t)((val >> 24) & 0xFF);
}

uint32_t unpackUint32LE(const uint8_t* src) {
    if (src == (const uint8_t*)0) return 0;
    return (uint32_t)src[0] |
           ((uint32_t)src[1] << 8) |
           ((uint32_t)src[2] << 16) |
           ((uint32_t)src[3] << 24);
}

bool validatePayloadSize(uint16_t actualSize, uint16_t expectedMinSize) {
    return (actualSize >= expectedMinSize);
}

