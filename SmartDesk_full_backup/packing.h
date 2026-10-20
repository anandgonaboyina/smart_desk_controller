/**
 * packing.h — Pure byte serialization and deserialization helpers.
 *
 * Purpose : Pack and unpack multi-byte integers in standard Little-Endian
 *           format for the BLE protocol. Validates payload lengths defensibly.
 * Depends : stdint.h, stdbool.h (pure logic, no BLE/Arduino dependencies).
 * Used by : ble_service.cpp, and protocol packet encoders/decoders.
 * Feature : Always compiled (Protocol packing is core).
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Pack uint16 into 2 bytes Little-Endian.
 * Example:
 *   packUint16LE(buf, 0x1234) -> buf[0]=0x34, buf[1]=0x12
 */
void packUint16LE(uint8_t* dest, uint16_t val);

/**
 * Unpack uint16 from 2 bytes Little-Endian.
 * Example:
 *   unpackUint16LE({0x34, 0x12}) -> 0x1234 (4660)
 */
uint16_t unpackUint16LE(const uint8_t* src);

/**
 * Pack int16 into 2 bytes Little-Endian (signed).
 * Example:
 *   packInt16LE(buf, +330)  -> buf[0]=0x4A, buf[1]=0x01
 *   packInt16LE(buf, -300)  -> buf[0]=0xD4, buf[1]=0xFE
 */
void packInt16LE(uint8_t* dest, int16_t val);

/**
 * Unpack int16 from 2 bytes Little-Endian (signed).
 * Example:
 *   unpackInt16LE({0x4A, 0x01}) -> +330
 */
int16_t unpackInt16LE(const uint8_t* src);

/**
 * Pack uint32 into 4 bytes Little-Endian.
 * Example:
 *   packUint32LE(buf, 0x12345678) -> buf[0]=0x78, buf[1]=0x56, buf[2]=0x34, buf[3]=0x12
 */
void packUint32LE(uint8_t* dest, uint32_t val);

/**
 * Unpack uint32 from 4 bytes Little-Endian.
 * Example:
 *   unpackUint32LE({0x78, 0x56, 0x34, 0x12}) -> 0x12345678
 */
uint32_t unpackUint32LE(const uint8_t* src);

/**
 * Defensively check if an incoming packet meets minimum size requirements.
 * Example:
 *   validatePayloadSize(10, 8) -> true
 *   validatePayloadSize(4, 8)  -> false
 */
bool validatePayloadSize(uint16_t actualSize, uint16_t expectedMinSize);

#ifdef __cplusplus
}
#endif

