/**
 * password_obfuscation.cpp — Implementation of pure password obfuscation.
 *
 * Purpose : Key derivation from chip ID and reversible XOR obfuscation.
 * Depends : password_obfuscation.h
 * Used by : hid.cpp, settings.cpp.
 * Feature : FEATURE_HID
 */

#include "password_obfuscation.h"

void deriveObfuscationKey(uint64_t chipId, uint8_t* keyOut, uint8_t keyLen) {
    if (keyOut == (uint8_t*)0 || keyLen == 0) return;

    // Split 64-bit ID into two 32-bit state words
    uint32_t stateA = (uint32_t)(chipId & 0xFFFFFFFF);
    uint32_t stateB = (uint32_t)((chipId >> 32) & 0xFFFFFFFF);

    // If chipId was zero, use fallback constants
    if (stateA == 0 && stateB == 0) {
        stateA = 0xDEADBEEF;
        stateB = 0xCAFEBABE;
    }

    for (uint8_t i = 0; i < keyLen; i++) {
        // Linear feedback mixing step
        stateA = (stateA * 1664525u) + 1013904223u;
        stateB = (stateB * 22695477u) + 1u;
        uint32_t mixed = stateA ^ (stateB >> 11) ^ (stateA << 5);
        keyOut[i] = (uint8_t)((mixed ^ (mixed >> 8) ^ (mixed >> 16) ^ (mixed >> 24)) & 0xFF);
    }
}

void obfuscatePassword(const uint8_t* plain, uint8_t plainLen,
                       const uint8_t* key, uint8_t keyLen,
                       uint8_t* cipherOut) {
    if (plain == (const uint8_t*)0 || cipherOut == (uint8_t*)0) return;
    if (key == (const uint8_t*)0 || keyLen == 0) return;

    for (uint8_t i = 0; i < plainLen; i++) {
        uint8_t keyByte = key[i % keyLen];
        uint8_t salt = (uint8_t)(0x5A + (i * 7));
        cipherOut[i] = plain[i] ^ keyByte ^ salt;
    }
}

void deobfuscatePassword(const uint8_t* cipher, uint8_t cipherLen,
                         const uint8_t* key, uint8_t keyLen,
                         uint8_t* plainOut) {
    // XOR obfuscation with identical key and salt is its own inverse
    obfuscatePassword(cipher, cipherLen, key, keyLen, plainOut);
}

