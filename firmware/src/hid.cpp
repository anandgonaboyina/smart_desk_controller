/**
 * hid.cpp — Implementation of PC Unlock keyboard injection subsystem.
 *
 * Purpose : Emulates USB HID keyboard to inject login password/PIN or test strings,
 *           manages auto-type delay countdowns, and stores obfuscated passwords in NVS.
 * Depends : hid.h, hid_guard.h, password_obfuscation.h, USB.h, USBHIDKeyboard.h,
 *           Preferences.h, Arduino.h.
 * Used by : main.cpp, ble_service.cpp.
 * Feature : FEATURE_HID
 */

#include "features.h"

#if FEATURE_HID

#include "hid.h"
#include "../lib/password_obfuscation/password_obfuscation.h"
#include <USB.h>
#include <USBHIDKeyboard.h>
#include <Preferences.h>
#include <Arduino.h>
#include <esp_mac.h>
#include <string.h>

static USBHIDKeyboard s_keyboard;
static HidSettings    s_settings;
static uint16_t       s_countdownSec = 0;
static uint32_t       s_lastCountdownTickMs = 0;
static bool           s_autoTriggerPending = false;
static HidStatusCallback s_callback = (HidStatusCallback)0;
static Preferences    s_hidPrefs;

static uint64_t getChipId(void) {
    uint64_t chipId = 0;
    esp_read_mac((uint8_t*)&chipId, ESP_MAC_WIFI_STA);
    return chipId;
}

void hidBegin(void) {
    hidGuardBegin();
    s_hidPrefs.begin(NVS_NS_HID, true);
    s_settings.signInType = s_hidPrefs.getUChar("signType", HID_SIGN_IN_PASSWORD);
    s_settings.pressEnter = s_hidPrefs.getUChar("enter", 1);
    s_settings.autoDelaySec = s_hidPrefs.getUShort("autoDelay", DEFAULT_AUTOTYPE_DELAY_S);
    s_settings.autoEnabled = s_hidPrefs.getUChar("autoEn", 0);
    s_settings.usbEnabled = s_hidPrefs.getUChar("usbEn", 1);
    s_settings.bleEnabled = s_hidPrefs.getUChar("bleEn", 0);
    s_settings.passwordIsSet = s_hidPrefs.isKey("pwLen") ? 1 : 0;
    s_settings.usbKbDisabled = s_hidPrefs.getUChar("usbDis", 0);
    s_hidPrefs.end();

    if (!s_settings.usbKbDisabled) {
        USB.begin();
        s_keyboard.begin();
    }

    if (s_settings.autoEnabled && isFeatureEnabled(FSWITCH_AUTO_TYPE)) {
        s_countdownSec = s_settings.autoDelaySec;
        s_autoTriggerPending = true;
        s_lastCountdownTickMs = millis();
    }
}

static void sendKeystrokes(const char* str, bool pressEnter) {
    // Wake screen
    s_keyboard.press(0x20); // Spacebar
    delay(50);
    s_keyboard.releaseAll();
    delay(100);

    // Type string
    s_keyboard.print(str);
    delay(50);

    if (pressEnter) {
        s_keyboard.press(KEY_RETURN);
        delay(50);
        s_keyboard.releaseAll();
    }
}

static uint8_t performActualType(uint8_t path, uint8_t reason) {
    if (path == HID_PATH_TEST) {
        sendKeystrokes(HID_TEST_STRING, s_settings.pressEnter != 0);
        hidGuardRecordAttempt(path, HID_REASON_TEST, true);
        if (s_callback) s_callback(path, HID_STATUS_COMPLETE);
        return ERR_OK;
    }

    s_hidPrefs.begin(NVS_NS_HID, true);
    uint8_t pwLen = s_hidPrefs.getUChar("pwLen", 0);
    uint8_t cipher[HID_MAX_PASSWORD_LEN];
    size_t rLen = s_hidPrefs.getBytes("pwData", cipher, sizeof(cipher));
    s_hidPrefs.end();

    if (pwLen == 0 || rLen != pwLen) {
        hidGuardRecordAttempt(path, reason, false);
        if (s_callback) s_callback(path, HID_STATUS_ERROR);
        return ERR_NOT_FOUND;
    }

    uint8_t key[OBFUSCATION_KEY_LEN];
    deriveObfuscationKey(getChipId(), key, OBFUSCATION_KEY_LEN);

    char plain[HID_MAX_PASSWORD_LEN + 1];
    deobfuscatePassword(cipher, pwLen, key, OBFUSCATION_KEY_LEN, (uint8_t*)plain);
    plain[pwLen] = '\0';

    sendKeystrokes(plain, s_settings.pressEnter != 0);

    // Wipe plaintext buffer immediately from RAM
    memset(plain, 0, sizeof(plain));
    memset(key, 0, sizeof(key));

    hidGuardRecordAttempt(path, reason, true);
    if (s_callback) s_callback(path, HID_STATUS_COMPLETE);
    return ERR_OK;
}

uint8_t hidTypeNow(uint8_t path, uint8_t* outStatus) {
    uint8_t blockedReason;
    if (!hidGuardCanType(path, false, &blockedReason)) {
        if (outStatus) *outStatus = HID_STATUS_BLOCKED;
        hidGuardRecordAttempt(path, blockedReason, false);
        if (s_callback) s_callback(path, HID_STATUS_BLOCKED);
        return ERR_FEATURE_DISABLED;
    }

    s_countdownSec = 0;
    s_autoTriggerPending = false;
    if (outStatus) *outStatus = HID_STATUS_STARTED;
    if (s_callback) s_callback(path, HID_STATUS_STARTED);

    return performActualType(path, HID_REASON_MANUAL);
}

void hidLoop(void) {
    if (!s_autoTriggerPending || s_countdownSec == 0) return;
    uint32_t now = millis();

    if (now - s_lastCountdownTickMs >= 1000) {
        s_lastCountdownTickMs += 1000;
        s_countdownSec--;

        if (s_countdownSec == 0) {
            s_autoTriggerPending = false;
            uint8_t blockedReason;
            if (hidGuardCanType(HID_PATH_USB, true, &blockedReason)) {
                performActualType(HID_PATH_USB, HID_REASON_AUTO_BOOT);
            } else {
                hidGuardRecordAttempt(HID_PATH_USB, blockedReason, false);
                if (s_callback) s_callback(HID_PATH_USB, HID_STATUS_BLOCKED);
            }
        }
    }
}

uint8_t hidCancel(void) {
    if (s_autoTriggerPending) {
        s_autoTriggerPending = false;
        s_countdownSec = 0;
        hidGuardRecordAttempt(HID_PATH_AUTO, HID_REASON_CANCELLED, true);
        if (s_callback) s_callback(HID_PATH_AUTO, HID_STATUS_CANCELLED);
    }
    return ERR_OK;
}

uint8_t hidSetPassword(const uint8_t* passwordBytes, uint8_t length) {
    if (passwordBytes == (const uint8_t*)0 || length == 0 || length > HID_MAX_PASSWORD_LEN) {
        return ERR_INVALID_PARAM;
    }

    uint8_t key[OBFUSCATION_KEY_LEN];
    deriveObfuscationKey(getChipId(), key, OBFUSCATION_KEY_LEN);

    uint8_t cipher[HID_MAX_PASSWORD_LEN];
    obfuscatePassword(passwordBytes, length, key, OBFUSCATION_KEY_LEN, cipher);
    memset(key, 0, sizeof(key));

    s_hidPrefs.begin(NVS_NS_HID, false);
    s_hidPrefs.putUChar("pwLen", length);
    s_hidPrefs.putBytes("pwData", cipher, length);
    s_hidPrefs.end();

    s_settings.passwordIsSet = 1;
    return ERR_OK;
}

void hidErasePassword(void) {
    s_hidPrefs.begin(NVS_NS_HID, false);
    s_hidPrefs.remove("pwLen");
    s_hidPrefs.remove("pwData");
    s_hidPrefs.end();
    s_settings.passwordIsSet = 0;
}

void hidGetSettings(HidSettings* outSettings) {
    if (outSettings) memcpy(outSettings, &s_settings, sizeof(HidSettings));
}

uint8_t hidSetSettings(const HidSettings* inSettings) {
    if (inSettings == (const HidSettings*)0) return ERR_INVALID_PARAM;
    if (inSettings->autoDelaySec < AUTOTYPE_MIN_DELAY_S ||
        inSettings->autoDelaySec > AUTOTYPE_MAX_DELAY_S) {
        return ERR_INVALID_PARAM;
    }

    memcpy(&s_settings, inSettings, sizeof(HidSettings));
    s_hidPrefs.begin(NVS_NS_HID, false);
    s_hidPrefs.putUChar("signType", s_settings.signInType);
    s_hidPrefs.putUChar("enter", s_settings.pressEnter);
    s_hidPrefs.putUShort("autoDelay", s_settings.autoDelaySec);
    s_hidPrefs.putUChar("autoEn", s_settings.autoEnabled);
    s_hidPrefs.putUChar("usbEn", s_settings.usbEnabled);
    s_hidPrefs.putUChar("bleEn", s_settings.bleEnabled);
    s_hidPrefs.putUChar("usbDis", s_settings.usbKbDisabled);
    s_hidPrefs.end();

    return ERR_OK;
}

uint16_t hidGetRemainingCountdown(void) {
    return s_autoTriggerPending ? s_countdownSec : 0;
}

void hidRegisterCallback(HidStatusCallback cb) {
    s_callback = cb;
}

#endif // FEATURE_HID

