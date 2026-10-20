#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\SmartDesk\\password_obfuscation.h"
/**
 * password_obfuscation.h — Pure password obfuscation and key derivation.
 *
 * Purpose : Derives a 16-byte keystream from the ESP32 chip ID and provides
 *           reversible XOR-based obfuscation for storing PC login passwords
 *           in NVS.
 *           NOTE: This is obfuscation, NOT cryptographic encryption.
 * Depends : stdint.h (pure logic, no ESP32/NVS/hardware dependencies).
 * Used by : hid.cpp, settings.cpp.
 * Feature : FEATURE_HID
 */

#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define OBFUSCATION_KEY_LEN 16

/**
 * Derive a 16-byte pseudo-random keystream from a 64-bit hardware chip ID.
 * Pure arithmetic; deterministic output for same chipId.
 * Example:
 *   deriveKey(0x1122334455667788, keyOut, 16) -> fills keyOut with mixed bytes
 */
void deriveObfuscationKey(uint64_t chipId, uint8_t* keyOut, uint8_t keyLen);

/**
 * Obfuscate a plaintext password buffer using the derived keystream and position salt.
 * cipherOut[i] = plain[i] ^ key[i % keyLen] ^ (uint8_t)(0x5A + (i * 7));
 * Example:
 *   obfuscatePassword("pass", 4, key, 16, cipherOut) -> fills cipherOut with scrambled bytes
 */
void obfuscatePassword(const uint8_t* plain, uint8_t plainLen,
                       const uint8_t* key, uint8_t keyLen,
                       uint8_t* cipherOut);

/**
 * De-obfuscate a ciphertext buffer back to original plaintext.
 * Reversible operation: deobfuscate(obfuscate(text)) == text.
 * Example:
 *   deobfuscatePassword(cipher, 4, key, 16, plainOut) -> plainOut matches "pass"
 */
void deobfuscatePassword(const uint8_t* cipher, uint8_t cipherLen,
                         const uint8_t* key, uint8_t keyLen,
                         uint8_t* plainOut);

#ifdef __cplusplus
}
#endif

