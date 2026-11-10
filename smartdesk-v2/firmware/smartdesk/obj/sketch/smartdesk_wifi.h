#line 1 "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\smartdesk-v2\\firmware\\smartdesk\\smartdesk_wifi.h"
/**
 * smartdesk_wifi.h — Wi-Fi Subsystem, Multi-Network Manager, Captive Portal & Web API for SmartDesk V2
 *
 * Purpose : Manages Wi-Fi Station multi-network auto-connect, SoftAP captive portal,
 *           embedded responsive HTML dashboard, REST API for PWA remote control,
 *           college captive portal sign-in, and NTP time synchronization.
 * Depends : WiFi.h, WebServer.h, DNSServer.h, HTTPClient.h, time.h, Preferences.h, smartdesk_pins.h.
 * Used by : smartdesk.ino.
 */

#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <time.h>
#include <esp_wifi.h>
#include "smartdesk_pins.h"
#include "smartdesk_cloud.h"

static volatile int8_t s_reqConnectSlot = -1;
static volatile bool   s_reqConnectAny  = false;
static volatile bool   s_reqBleWifiScan = false;
bool                   s_softApActive   = false;

/* Forward Declarations */
static void startSoftApFallback();
static void stopSoftApFallback();
static void saveWifiNetworkToNVS(int idx);

/* ── Wi-Fi Multi-Network Configurations ───────────────────────────────────── */
#define MAX_WIFI_NETWORKS        6
#define DEFAULT_AP_SSID          "AnandSmartDesk"
#define DEFAULT_AP_PASS          "Anandsmartdesk"
#define DEFAULT_FORTINET_GATEWAY "https://192.168.80.1:1000/"
#define DNS_PORT                 53

struct SavedNetwork {
    bool valid;
    char ssid[65];
    char pass[65];
    char cpUrl[129];     // Optional Captive Portal Login URL
    char cpUser[65];     // Optional Username / Student ID
    char cpPass[65];     // Optional Password
    char cpFields[129];  // Optional custom POST payload format
};

struct ApConfig {
    char ssid[33];
    char pass[65];
};

/* ── External Forward Declarations from smartdesk.ino ────────────────────── */
extern RelayConfig s_relayConfigs[RELAY_COUNT];
extern uint8_t     s_relayLoads[RELAY_COUNT];
extern uint32_t    s_timerEndMs[RELAY_COUNT];
extern char        s_deviceName[25];
extern uint8_t     s_ledMode;
extern uint8_t     s_ledR;
extern uint8_t     s_ledG;
extern uint8_t     s_ledB;
extern uint8_t     s_ledBri;
extern uint8_t     s_ledSpd;
extern float       s_tempC;
extern float       s_humidity;
extern bool        s_sensorValid;
extern bool        s_buzzerMasterEnabled;
extern bool        s_connected;

extern void setRelayLoad(uint8_t idx, uint8_t load, const char* source);
extern void setRelayTimer(uint8_t idx, uint16_t mins);
extern void allRelaysOff(const char* source);
extern void notifyRelayState();
extern void notifyLedState();
extern void notifyEnvState();
extern void saveLedStateToNVS();
extern void saveRelayLoadsToNVS();
extern void getLocalTime(uint8_t* outH, uint8_t* outM, uint8_t* outS, uint8_t* outDOW);

/* ── Global Wi-Fi State ─────────────────────────────────────────────────── */
static SavedNetwork  s_savedNetworks[MAX_WIFI_NETWORKS];
static ApConfig      s_apConfig;
static bool          s_wifiOnAwayOnly   = false; // Default: Wi-Fi on all the time
static bool          s_wifiConnected    = false;
static char          s_currentSsid[65]  = {0};
static char          s_ipAddress[20]    = "0.0.0.0";
static int8_t        s_wifiRssi         = 0;
static bool          s_ntpSynced        = false;
static char          s_lastPortalStatus[64] = "None";
static uint32_t      s_lastInternetCheckMs  = 0;
static volatile uint8_t s_fortinetRetryCount = 0;
static char          s_wifiDebugLog[1200]   = "[BOOT] Wi-Fi Subsystem initialized\n";

static void appendDebugLog(const char* msg) {
    size_t curLen = strlen(s_wifiDebugLog);
    size_t addLen = strlen(msg);
    if (curLen + addLen + 30 >= sizeof(s_wifiDebugLog)) {
        memmove(s_wifiDebugLog, s_wifiDebugLog + 400, curLen - 400);
        curLen = strlen(s_wifiDebugLog);
    }
    snprintf(s_wifiDebugLog + curLen, sizeof(s_wifiDebugLog) - curLen, "[%lu] %s\n", millis() / 1000UL, msg);
    Serial.printf(">>> [WIFI LOG] %s\n", msg);
}

static WebServer     s_webServer(80);
static DNSServer     s_dnsServer;
static Preferences   s_wifiPrefs;

/* Scan Cache */
static int           s_scanCount        = 0;
static char          s_scanSsids[15][33];
static int32_t       s_scanRssi[15];
static bool          s_isScanning       = false;
static uint32_t      s_lastScanMs       = 0;
static uint32_t      s_lastWifiCheckMs  = 0;

/* ── NVS Persistence for Wi-Fi Networks ──────────────────────────────────── */
static void loadWifiFromNVS() {
    s_wifiPrefs.begin("desk_wifi", true);
    for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
        char kVal[16], kSsid[16], kPass[16], kUrl[16], kUser[16], kCPPass[16], kFld[16];
        snprintf(kVal, sizeof(kVal), "v_%d", i);
        snprintf(kSsid, sizeof(kSsid), "s_%d", i);
        snprintf(kPass, sizeof(kPass), "p_%d", i);
        snprintf(kUrl, sizeof(kUrl), "u_%d", i);
        snprintf(kUser, sizeof(kUser), "usr_%d", i);
        snprintf(kCPPass, sizeof(kCPPass), "cpp_%d", i);
        snprintf(kFld, sizeof(kFld), "f_%d", i);

        s_savedNetworks[i].valid = s_wifiPrefs.getBool(kVal, false);
        if (s_savedNetworks[i].valid) {
            String ss = s_wifiPrefs.getString(kSsid, "");
            String ps = s_wifiPrefs.getString(kPass, "");
            String ur = s_wifiPrefs.getString(kUrl, "");
            String us = s_wifiPrefs.getString(kUser, "");
            String cp = s_wifiPrefs.getString(kCPPass, "");
            String fl = s_wifiPrefs.getString(kFld, "");

            strncpy(s_savedNetworks[i].ssid, ss.c_str(), sizeof(s_savedNetworks[i].ssid) - 1);
            strncpy(s_savedNetworks[i].pass, ps.c_str(), sizeof(s_savedNetworks[i].pass) - 1);
            strncpy(s_savedNetworks[i].cpUrl, ur.c_str(), sizeof(s_savedNetworks[i].cpUrl) - 1);
            strncpy(s_savedNetworks[i].cpUser, us.c_str(), sizeof(s_savedNetworks[i].cpUser) - 1);
            strncpy(s_savedNetworks[i].cpPass, cp.c_str(), sizeof(s_savedNetworks[i].cpPass) - 1);
            strncpy(s_savedNetworks[i].cpFields, fl.c_str(), sizeof(s_savedNetworks[i].cpFields) - 1);
        } else {
            memset(&s_savedNetworks[i], 0, sizeof(SavedNetwork));
        }
    }
    s_wifiPrefs.end();

    // Ensure College Network Profile has user's credentials pre-populated
    bool hasNit = false;
    for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
        if (s_savedNetworks[i].valid && strstr(s_savedNetworks[i].ssid, "National Institute of Technology")) {
            hasNit = true;
            strncpy(s_savedNetworks[i].pass, "Nitgoa@2023", sizeof(s_savedNetworks[i].pass) - 1);
            strncpy(s_savedNetworks[i].cpUser, "24eee1017", sizeof(s_savedNetworks[i].cpUser) - 1);
            strncpy(s_savedNetworks[i].cpPass, "306888", sizeof(s_savedNetworks[i].cpPass) - 1);
            if (strlen(s_savedNetworks[i].cpUrl) == 0) {
                strncpy(s_savedNetworks[i].cpUrl, DEFAULT_FORTINET_GATEWAY, sizeof(s_savedNetworks[i].cpUrl) - 1);
            }
            saveWifiNetworkToNVS(i);
            break;
        }
    }
    if (!hasNit) {
        s_savedNetworks[0].valid = true;
        strncpy(s_savedNetworks[0].ssid, "National Institute of Technology", sizeof(s_savedNetworks[0].ssid) - 1);
        strncpy(s_savedNetworks[0].pass, "Nitgoa@2023", sizeof(s_savedNetworks[0].pass) - 1);
        strncpy(s_savedNetworks[0].cpUser, "24eee1017", sizeof(s_savedNetworks[0].cpUser) - 1);
        strncpy(s_savedNetworks[0].cpPass, "306888", sizeof(s_savedNetworks[0].cpPass) - 1);
        strncpy(s_savedNetworks[0].cpUrl, DEFAULT_FORTINET_GATEWAY, sizeof(s_savedNetworks[0].cpUrl) - 1);
        saveWifiNetworkToNVS(0);
    }

    // Load AP settings
    s_wifiPrefs.begin("desk_ap", true);
    String apS = s_wifiPrefs.getString("ssid", DEFAULT_AP_SSID);
    String apP = s_wifiPrefs.getString("pass", DEFAULT_AP_PASS);
    s_wifiOnAwayOnly = s_wifiPrefs.getBool("away_only", false);
    strncpy(s_apConfig.ssid, apS.c_str(), sizeof(s_apConfig.ssid) - 1);
    strncpy(s_apConfig.pass, apP.c_str(), sizeof(s_apConfig.pass) - 1);
    s_wifiPrefs.end();
}

static void saveWifiNetworkToNVS(int idx) {
    if (idx < 0 || idx >= MAX_WIFI_NETWORKS) return;
    s_wifiPrefs.begin("desk_wifi", false);
    char kVal[16], kSsid[16], kPass[16], kUrl[16], kUser[16], kCPPass[16], kFld[16];
    snprintf(kVal, sizeof(kVal), "v_%d", idx);
    snprintf(kSsid, sizeof(kSsid), "s_%d", idx);
    snprintf(kPass, sizeof(kPass), "p_%d", idx);
    snprintf(kUrl, sizeof(kUrl), "u_%d", idx);
    snprintf(kUser, sizeof(kUser), "usr_%d", idx);
    snprintf(kCPPass, sizeof(kCPPass), "cpp_%d", idx);
    snprintf(kFld, sizeof(kFld), "f_%d", idx);

    // Flash Wear Protection: Read existing values before writing
    bool oldVal = s_wifiPrefs.getBool(kVal, false);
    String oldSsid = s_wifiPrefs.getString(kSsid, "");
    String oldPass = s_wifiPrefs.getString(kPass, "");
    String oldUrl = s_wifiPrefs.getString(kUrl, "");
    String oldUser = s_wifiPrefs.getString(kUser, "");
    String oldCPPass = s_wifiPrefs.getString(kCPPass, "");
    String oldFld = s_wifiPrefs.getString(kFld, "");

    if (oldVal != s_savedNetworks[idx].valid) {
        s_wifiPrefs.putBool(kVal, s_savedNetworks[idx].valid);
    }

    if (s_savedNetworks[idx].valid) {
        if (!oldSsid.equals(s_savedNetworks[idx].ssid)) {
            s_wifiPrefs.putString(kSsid, s_savedNetworks[idx].ssid);
        }
        if (!oldPass.equals(s_savedNetworks[idx].pass)) {
            s_wifiPrefs.putString(kPass, s_savedNetworks[idx].pass);
        }
        if (!oldUrl.equals(s_savedNetworks[idx].cpUrl)) {
            s_wifiPrefs.putString(kUrl, s_savedNetworks[idx].cpUrl);
        }
        if (!oldUser.equals(s_savedNetworks[idx].cpUser)) {
            s_wifiPrefs.putString(kUser, s_savedNetworks[idx].cpUser);
        }
        if (!oldCPPass.equals(s_savedNetworks[idx].cpPass)) {
            s_wifiPrefs.putString(kCPPass, s_savedNetworks[idx].cpPass);
        }
        if (!oldFld.equals(s_savedNetworks[idx].cpFields)) {
            s_wifiPrefs.putString(kFld, s_savedNetworks[idx].cpFields);
        }
    } else {
        if (oldSsid.length() > 0) s_wifiPrefs.remove(kSsid);
        if (oldPass.length() > 0) s_wifiPrefs.remove(kPass);
        if (oldUrl.length() > 0) s_wifiPrefs.remove(kUrl);
        if (oldUser.length() > 0) s_wifiPrefs.remove(kUser);
        if (oldCPPass.length() > 0) s_wifiPrefs.remove(kCPPass);
        if (oldFld.length() > 0) s_wifiPrefs.remove(kFld);
    }
    s_wifiPrefs.end();
}

static void saveApConfigToNVS() {
    s_wifiPrefs.begin("desk_ap", false);
    s_wifiPrefs.putString("ssid", s_apConfig.ssid);
    s_wifiPrefs.putString("pass", s_apConfig.pass);
    s_wifiPrefs.putBool("away_only", s_wifiOnAwayOnly);
    s_wifiPrefs.end();
}

/* ── Fortinet Captive Portal Bypass Helpers ─────────────────────────────── */

/**
 * RFC 3986 URL encoder for x-www-form-urlencoded payload components.
 * Converts characters like ':', '/', '?', '=', '&', '%' into '%XX'.
 */
static String urlEncode(const String &str) {
    String encoded = "";
    char hexBuf[4];
    for (unsigned int i = 0; i < str.length(); i++) {
        char c = str.charAt(i);
        if (isalnum((unsigned char)c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encoded += c;
        } else {
            snprintf(hexBuf, sizeof(hexBuf), "%%%02X", (unsigned char)c);
            encoded += hexBuf;
        }
    }
    return encoded;
}

/**
 * Lightweight HTML token scraper (no heavy DOM parser).
 * Finds hidden input values for name="key" or name='key'.
 */
static String extractToken(const String &html, const String &key) {
    // Pattern 1: name="key" value="..."
    String p1 = "name=\"" + key + "\" value=\"";
    int idx = html.indexOf(p1);
    if (idx != -1) {
        int start = idx + p1.length();
        int end = html.indexOf('"', start);
        if (end != -1) return html.substring(start, end);
    }

    // Pattern 2: name='key' value='...'
    String p2 = "name='" + key + "' value='";
    idx = html.indexOf(p2);
    if (idx != -1) {
        int start = idx + p2.length();
        int end = html.indexOf('\'', start);
        if (end != -1) return html.substring(start, end);
    }

    // Pattern 3: value="..." name="key" (attribute inversion)
    String p3 = "name=\"" + key + "\"";
    idx = html.indexOf(p3);
    if (idx != -1) {
        int tagStart = html.lastIndexOf('<', idx);
        int tagEnd = html.indexOf('>', idx);
        if (tagStart != -1 && tagEnd != -1) {
            String tag = html.substring(tagStart, tagEnd + 1);
            int vIdx = tag.indexOf("value=\"");
            if (vIdx != -1) {
                int s = vIdx + 7;
                int e = tag.indexOf('"', s);
                if (e != -1) return tag.substring(s, e);
            }
        }
    }

    return "";
}

// Internet Probe Rate-Limiting Cache (Prevents continuous polling and ESP32 heating)
static uint32_t s_lastProbeTimeMs = 0;
static bool     s_lastProbeResult = false;
static const uint32_t PROBE_COOLDOWN_MS = 60000UL; // Rate-limit to at most once per 60 seconds

/**
 * Tests if the ESP32 has real internet access by pinging Apple's probe URL.
 * Rate-limited to execute at most once every 60 seconds (unless force=true or explicit drop).
 * Returns true if HTTP 200 with "Success" in body is received.
 */
static bool checkInternetAccess(bool force = false) {
    uint32_t now = millis();

    // Return cached result if within 60-second cooldown window (unless force probe requested)
    if (!force && s_lastProbeTimeMs != 0 && (now - s_lastProbeTimeMs < PROBE_COOLDOWN_MS)) {
        return s_lastProbeResult;
    }

    Serial.println(">>> [PROBE] Pinging http://captive.apple.com/hotspot-detect.html ...");
    HTTPClient http;
    http.begin("http://captive.apple.com/hotspot-detect.html");
    http.setTimeout(3500);
    int httpCode = http.GET();
    bool hasInternet = false;

    if (httpCode == 200) {
        String body = http.getString();
        if (body.indexOf("Success") != -1) {
            hasInternet = true;
        }
    }
    http.end();

    s_lastProbeTimeMs = now;
    s_lastProbeResult = hasInternet;

    if (hasInternet) {
        Serial.println(">>> [PROBE RESULT] Internet is ACTIVE! (HTTP 200 'Success')");
    } else {
        Serial.printf(">>> [PROBE RESULT] Captive Portal DETECTED! (HTTP code: %d)\n", httpCode);
    }
    return hasInternet;
}

/**
 * Fortinet Captive Portal Auto-Bypass
 */
static bool performCaptivePortalLogin(const SavedNetwork& net) {
    if (checkInternetAccess()) {
        Serial.println(">>> [WIFI] Internet is already active. Skipping portal sign-in.");
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "Online (No Portal Needed)");
        return true;
    }

    String user = String(net.cpUser);
    String pass = String(net.cpPass);

    if (user.length() == 0 || pass.length() == 0) {
        Serial.println(">>> [FORTINET] No student credentials. Skipping portal login.");
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "No Credentials");
        return false;
    }

    Serial.println("\n=======================================================");
    Serial.println(">>> [FORTINET] Starting Captive Portal Bypass Sequence");
    
    // 1. Force the firewall to intercept us instead of guessing its IP/Port!
    String targetUrl = "http://captive.apple.com/hotspot-detect.html";
    Serial.printf(">>> [FORTINET] Triggering firewall intercept via: %s\n", targetUrl.c_str());

    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); 
    secureClient.setTimeout(10); 
    
    HTTPClient http;
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    http.begin(plainClient, targetUrl);
    
    // 2. CRITICAL: Spoof a Windows Chrome Browser to prevent "connection lost" TCP drops
    http.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    http.setTimeout(10000);

    int getCode = http.GET();
    String html = "";
    String actualUrl = http.getLocation();

    if (getCode > 0) {
        html = http.getString();
        Serial.printf(">>> [FORTINET] Intercepted HTML (%d bytes)\n", html.length());

        // --- NEW: HANDLE 133-BYTE META/JS REDIRECTS MANUALLY ---
        // If the HTML is tiny, Fortinet gave us a Meta Refresh or JS redirect instead of the real page.
        if (html.length() < 300) {
            Serial.println(">>> [FORTINET] Tiny HTML payload detected. Searching for hidden redirect URL...");
            String nextUrl = "";
            
            // Check for Meta Refresh (e.g. <meta http-equiv="refresh" content="0;url=https://...">)
            int urlIdx = html.indexOf("url=");
            if (urlIdx != -1) {
                int endQuote = html.indexOf('"', urlIdx);
                int endApos = html.indexOf('\'', urlIdx);
                int endIdx = (endQuote != -1 && endApos != -1) ? min(endQuote, endApos) : max(endQuote, endApos);
                if (endIdx == -1) endIdx = html.indexOf('>', urlIdx);
                if (endIdx != -1) {
                    nextUrl = html.substring(urlIdx + 4, endIdx);
                }
            }

            // Check for JS Window.Location (e.g. window.location="https://...")
            if (nextUrl.length() == 0) {
                int locIdx = html.indexOf("window.location");
                if (locIdx != -1) {
                    int httpIdx = html.indexOf("http", locIdx);
                    if (httpIdx != -1) {
                        int endQuote = html.indexOf('"', httpIdx);
                        int endApos = html.indexOf('\'', httpIdx);
                        int endIdx = (endQuote != -1 && endApos != -1) ? min(endQuote, endApos) : max(endQuote, endApos);
                        if (endIdx != -1) nextUrl = html.substring(httpIdx, endIdx);
                    }
                }
            }

            if (nextUrl.length() > 0) {
                Serial.printf(">>> [FORTINET] Found hidden redirect! Following to: %s\n", nextUrl.c_str());
                http.end(); // Close the old connection
                
                // Open new connection to the real login page
                if (nextUrl.startsWith("https")) {
                    http.begin(secureClient, nextUrl);
                } else {
                    http.begin(plainClient, nextUrl);
                }
                http.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
                http.setTimeout(10000);
                getCode = http.GET();
                if (getCode > 0) {
                    html = http.getString();
                    actualUrl = nextUrl;
                    Serial.printf(">>> [FORTINET] Downloaded REAL Login Page HTML (%d bytes)\n", html.length());
                }
            }
        }
        // --------------------------------------------------------
    }
    
    if (actualUrl.length() == 0) actualUrl = targetUrl;
    http.end();

    if (getCode <= 0) {
        s_fortinetRetryCount++;
        Serial.printf(">>> [FORTINET ERROR] Intercept GET failed: %s (Failure %d/3)\n", http.errorToString(getCode).c_str(), s_fortinetRetryCount);
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "GET Failed (%d/3)", s_fortinetRetryCount);
        if (s_fortinetRetryCount >= 3) {
            appendDebugLog("Fortinet max retries (3) reached -> Starting SoftAP");
            snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "Bypass Failed (Locked)");
            startSoftApFallback();
        }
        return false;
    }

    // 3. Extract tokens
    String magicToken = extractToken(html, "magic");
    String redirUrl   = extractToken(html, "4Tredir");
    
    // 4. Dynamically find the Form Action POST URL so we don't guess Port 1000 vs 1003
    String postUrl = "http://192.168.80.1:1000/fgtauth";
    int actionIdx = html.indexOf("action=\"");
    if (actionIdx != -1) {
        int start = actionIdx + 8;
        int end = html.indexOf('"', start);
        if (end != -1) {
            String parsedAction = html.substring(start, end);
            if (parsedAction.startsWith("http")) {
                postUrl = parsedAction;
            } else if (parsedAction.startsWith("/")) {
                int hostEnd = actualUrl.indexOf("/", 8);
                if (hostEnd == -1) hostEnd = actualUrl.length();
                postUrl = actualUrl.substring(0, hostEnd) + parsedAction;
            }
        }
    }
    
    html = ""; // Free memory

    if (magicToken.length() == 0) {
        s_fortinetRetryCount++;
        Serial.printf(">>> [FORTINET WARN] 'magic' token not found (Failure %d/3).\n", s_fortinetRetryCount);
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "No Magic (%d/3)", s_fortinetRetryCount);
        if (s_fortinetRetryCount >= 3) {
            startSoftApFallback();
        }
        return false;
    }

    if (redirUrl.length() == 0) redirUrl = "http://captive.apple.com/hotspot-detect.html";

    String encodedRedirect = urlEncode(redirUrl);
    String payload = "4Tredir=" + encodedRedirect + "&magic=" + magicToken + "&username=" + user + "&password=" + pass;

    Serial.printf(">>> [FORTINET] Scraped Magic Token : \"%s\"\n", magicToken.c_str());
    Serial.printf(">>> [FORTINET] POST Target       : %s\n", postUrl.c_str());
    
    // 5. Submit the form to exactly where Fortinet requested (handles both HTTP and HTTPS safely)
    bool isHttps = postUrl.startsWith("https");
    if (isHttps) {
        http.begin(secureClient, postUrl);
    } else {
        http.begin(plainClient, postUrl);
    }
    
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    http.setTimeout(10000);

    int postCode = http.POST((uint8_t*)payload.c_str(), payload.length());
    Serial.printf(">>> [FORTINET] POST Response Code: %d\n", postCode);
    
    if (postCode > 0) {
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "OK (HTTP %d)", postCode);
        Serial.println(">>> [FORTINET] Response snippet:");
        Serial.println(http.getString().substring(0, 250));
    } else {
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "Err (%s)", http.errorToString(postCode).c_str());
        Serial.printf(">>> [FORTINET ERROR] POST failed: %s\n", http.errorToString(postCode).c_str());
    }
    http.end();

    // 6. Verify internet connectivity (force fresh probe after portal login)
    delay(5000); 
    bool internetOk = checkInternetAccess(true);
    if (internetOk) {
        s_fortinetRetryCount = 0; 
        Serial.println(">>> [FORTINET SUCCESS] Internet access confirmed! Captive portal bypassed.");
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "Authenticated");
    } else {
        s_fortinetRetryCount++;
        Serial.printf(">>> [FORTINET WARN] Internet check failed after login (Failure %d/3).\n", s_fortinetRetryCount);
        snprintf(s_lastPortalStatus, sizeof(s_lastPortalStatus), "Bypass Failed (%d/3)", s_fortinetRetryCount);
        if (s_fortinetRetryCount >= 3) {
            startSoftApFallback();
        }
    }
    return internetOk;
}
 

/* ── String Sanitization Helper ──────────────────────────────────────────── */
static inline void sanitizeString(char* str) {
    if (!str) return;
    char* start = str;
    while (*start == ' ' || *start == '\t' || *start == '\r' || *start == '\n') {
        start++;
    }
    if (start != str) {
        memmove(str, start, strlen(start) + 1);
    }
    int len = (int)strlen(str);
    while (len > 0 && (str[len - 1] == ' ' || str[len - 1] == '\t' || str[len - 1] == '\r' || str[len - 1] == '\n')) {
        str[len - 1] = '\0';
        len--;
    }
}

/* ── NTP Real-Time Clock Synchronization ─────────────────────────────────── */
static void syncTimeFromNTP() {
    Serial.println(">>> [NTP] Initializing SNTP time sync via internet...");
    // IST = UTC + 5:30 = 19800 seconds offset
    configTime(19800, 0, "pool.ntp.org", "time.google.com", "time.nist.gov");

    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 3000)) {
        s_ntpSynced = true;
        s_timeSync.synced = true;
        uint32_t dow = timeinfo.tm_wday; // 0 = Sun
        s_timeSync.baseLocalSec = (dow * 86400UL) + (timeinfo.tm_hour * 3600UL) + (timeinfo.tm_min * 60UL) + timeinfo.tm_sec;
        s_timeSync.syncMillis = millis();
        saveTimeBaseToNVS();
        notifyEnvState();
        Serial.printf(">>> [NTP OK] Synchronized time: %02d:%02d:%02d (DOW=%d)\n",
                      timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec, dow);
    } else {
        Serial.println(">>> [NTP WARN] Could not acquire NTP time yet.");
    }
}

/* ── SoftAP Fallback Control ─────────────────────────────────────────────── */
static void startSoftApFallback() {
    if (s_softApActive) return;
    Serial.println(">>> [SOFTAP] Starting SoftAP fallback (AnandSmartDesk)...");
    appendDebugLog("Starting SoftAP fallback (No Internet on saved Wi-Fis)");
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(s_apConfig.ssid, s_apConfig.pass);
    IPAddress apIp = WiFi.softAPIP();
    s_dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
    s_dnsServer.start(DNS_PORT, "*", apIp);
    s_softApActive = true;
    notifyEnvState();
    Serial.printf(">>> [SOFTAP ACTIVE] SSID: \"%s\", IP: %s\n", s_apConfig.ssid, apIp.toString().c_str());
}

static void stopSoftApFallback() {
    if (!s_softApActive) return;
    if (WiFi.softAPgetStationNum() > 0) {
        Serial.println(">>> [SOFTAP] Client currently connected to SoftAP. Keeping AP active.");
        return;
    }
    Serial.println(">>> [SOFTAP] Stopping SoftAP fallback (Switching to pure Station mode)...");
    appendDebugLog("Stopping SoftAP fallback (Pure STA mode)");
    s_dnsServer.stop();
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    s_softApActive = false;
    notifyEnvState();
}

/* ── Wi-Fi Station Connection Machine ────────────────────────────────────── */
static bool connectToNetwork(const SavedNetwork& net) {
    if (!net.valid || strlen(net.ssid) == 0) return false;

    char targetSsid[65] = {0};
    char targetPass[65] = {0};
    strncpy(targetSsid, net.ssid, sizeof(targetSsid) - 1);
    strncpy(targetPass, net.pass, sizeof(targetPass) - 1);
    sanitizeString(targetSsid);
    sanitizeString(targetPass);

    Serial.println("-------------------------------------------------------");
    Serial.printf("Target SSID: [%s]\n", targetSsid);
    Serial.printf("Pass length: %d\n", (int)strlen(targetPass));
    Serial.printf("CP User:     [%s]\n", net.cpUser);
    Serial.println("-------------------------------------------------------");

    Serial.printf(">>> [WIFI] Scanning airwaves for strongest AP matching: [%s]\n", targetSsid);
    
    int nScan = WiFi.scanNetworks(false, true);
    int bestNetworkIdx = -1;
    int32_t bestRssi = -999;

    for (int i = 0; i < nScan; i++) {
        String scannedSsid = WiFi.SSID(i);
        if (scannedSsid.equals(targetSsid)) {
            int32_t currentRssi = WiFi.RSSI(i);
            if (currentRssi > bestRssi) {
                bestRssi = currentRssi;
                bestNetworkIdx = i;
            }
        }
    }

    uint8_t targetBssid[6];
    bool useBssid = false;
    int32_t targetChannel = 0;

    // EXTRACT DATA BEFORE DELETING SCAN!
    if (bestNetworkIdx != -1) {
        memcpy(targetBssid, WiFi.BSSID(bestNetworkIdx), 6);
        targetChannel = WiFi.channel(bestNetworkIdx);
        useBssid = true;
        Serial.printf(">>> [WIFI] Best AP found! RSSI: %d dBm, Channel: %d\n", bestRssi, targetChannel);
    } else {
        Serial.println(">>> [WIFI WARN] Target SSID not found in scan! Attempting blind connection...");
    }

    // Now it is safe to clear the memory
    WiFi.scanDelete();

    char dLog[96];
    snprintf(dLog, sizeof(dLog), "Target SSID: [%s]", targetSsid);
    appendDebugLog(dLog);

    // Safe Wi-Fi STA initialization preserving BLE
    WiFi.persistent(false);
    WiFi.disconnect(false);
    delay(50);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    delay(50);

    // Force connection to the SPECIFIC strongest router
    wl_status_t bStat;
    if (strlen(targetPass) > 0) {
        if (useBssid) {
            bStat = WiFi.begin(targetSsid, targetPass, targetChannel, targetBssid);
        } else {
            bStat = WiFi.begin(targetSsid, targetPass);
        }
    } else {
        if (useBssid) {
            bStat = WiFi.begin(targetSsid, nullptr, targetChannel, targetBssid);
        } else {
            bStat = WiFi.begin(targetSsid);
        }
    }
    Serial.printf(">>> [WIFI BEGIN] Initiated WiFi.begin, immediate return: %d\n", (int)bStat);

    uint32_t startMs = millis();
    uint32_t lastPrintMs = 0;
    while (WiFi.status() != WL_CONNECTED && (millis() - startMs < 16000)) {
        delay(200);
        if (millis() - lastPrintMs >= 1500) {
            lastPrintMs = millis();
            Serial.printf(">>> [WIFI CONNECTING] status=%d (%lu ms elapsed)\n", (int)WiFi.status(), millis() - startMs);
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        s_wifiConnected = true;
        strncpy(s_currentSsid, targetSsid, sizeof(s_currentSsid) - 1);
        strncpy(s_ipAddress, WiFi.localIP().toString().c_str(), sizeof(s_ipAddress) - 1);
        s_wifiRssi = WiFi.RSSI();
        Serial.printf(">>> [WIFI CONNECTED] IP: %s (RSSI: %d dBm)\n", s_ipAddress, s_wifiRssi);
        snprintf(dLog, sizeof(dLog), "Associated with '%s', IP %s", targetSsid, s_ipAddress);
        appendDebugLog(dLog);

        // 1. Initial Fast Check (3 seconds): Pause to let basic DHCP settle
        Serial.println(">>> [WIFI] Associated! Brief 3s pause for DHCP to settle...");
        delay(3000);

        // 2. Instant Proceed if Stable: Rapid check if gateway is reachable and internet probing succeeds
        bool internetOk = false;
        if (WiFi.gatewayIP() != IPAddress(0, 0, 0, 0)) {
            Serial.println(">>> [WIFI] Gateway reachable. Testing internet connection...");
            internetOk = checkInternetAccess(true);
            if (internetOk) {
                Serial.println(">>> [WIFI] Network fully active! Skipping remaining delay.");
            }
        }

        // 3. Adaptive Fallback Only for No Internet: Secondary check window (up to 15s)
        if (!internetOk) {
            Serial.println(">>> [WIFI] Internet not immediately available. Entering adaptive stabilization (up to 15s)...");
            uint32_t stabStart = millis();
            while (millis() - stabStart < 15000) {
                delay(1000);
                if (checkInternetAccess(true)) {
                    internetOk = true;
                    Serial.printf(">>> [WIFI] Internet confirmed during adaptive window after %lu ms!\n", millis() - stabStart);
                    break;
                }
            }
        }

        if (!internetOk && strlen(net.cpUser) > 0 && strlen(net.cpPass) > 0) {
            Serial.println(">>> [WIFI] Captive portal active. Attempting Fortinet login...");
            appendDebugLog("Captive portal detected -> Running Fortinet login...");
            internetOk = performCaptivePortalLogin(net);
        }

        if (internetOk) {
            Serial.println(">>> [WIFI SUCCESS] Internet connection confirmed!");
            appendDebugLog("Internet active & verified");
            syncTimeFromNTP();
            // --- NEW: WAKE UP RENDER SERVER ---
            Serial.println(">>> [CLOUD] Pinging Render health endpoint to wake up server...");
            HTTPClient httpPing;
            httpPing.begin("https://smart-desk-controller.onrender.com/health");
            httpPing.setTimeout(4000); 
            int pingCode = httpPing.GET();
            Serial.printf(">>> [CLOUD] Render wake-up ping HTTP code: %d\n", pingCode);
            httpPing.end();
            // ----------------------------------
            return true;
        } else {
            Serial.println(">>> [WIFI FAILED] No true internet access on this network.");
            appendDebugLog("No internet access on this network -> Disconnecting");
            WiFi.disconnect(false);
            s_wifiConnected = false;
            return false;
        }
    }

    Serial.printf(">>> [WIFI] Connection attempt failed or timed out. Final status=%d (1=NO_SSID, 4=CONNECT_FAIL, 6=DISCONNECTED)\n", (int)WiFi.status());
    snprintf(dLog, sizeof(dLog), "Failed to associate with '%s'", targetSsid);
    appendDebugLog(dLog);
    return false;
}
static bool connectToAnySavedNetwork() {
    int validCount = 0;
    for (int s = 0; s < MAX_WIFI_NETWORKS; s++) {
        if (s_savedNetworks[s].valid) validCount++;
    }
    if (validCount == 0) {
        Serial.println(">>> [WIFI] No saved networks configured in NVS.");
        return false;
    }

    Serial.printf(">>> [WIFI] Iterating through %d saved networks...\n", validCount);
    char dLog[64];
    snprintf(dLog, sizeof(dLog), "Iterating through %d saved networks...", validCount);
    appendDebugLog(dLog);

    for (int s = 0; s < MAX_WIFI_NETWORKS; s++) {
        if (!s_savedNetworks[s].valid) continue;
        if (connectToNetwork(s_savedNetworks[s])) {
            Serial.printf(">>> [WIFI] Connected to '%s' with confirmed internet!\n", s_savedNetworks[s].ssid);
            return true;
        }
    }

    Serial.println(">>> [WIFI] Failed to get internet access on ALL saved networks.");
    Serial.println(">>> [WIFI DIAGNOSTIC] Scanning 2.4GHz airwaves to inspect visible networks...");
    int nScan = WiFi.scanNetworks();
    Serial.printf(">>> [WIFI SCAN] Found %d visible 2.4GHz networks:\n", nScan);
    for (int i = 0; i < nScan && i < 15; i++) {
        Serial.printf("    [%02d] SSID: [%-32s] RSSI: %3d dBm  Ch: %2d  Auth: %d\n",
                      i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i), (int)WiFi.encryptionType(i));
    }
    WiFi.scanDelete();
    appendDebugLog("All saved networks failed to provide internet access");
    return false;
}

static void tryAutoConnectToSaved() {
    if (WiFi.status() == WL_CONNECTED && s_wifiConnected) return;
    if (WiFi.softAPgetStationNum() > 0) return;
    if (s_connected) return; // Do not scan airwaves when client is actively connected over BLE
    s_reqConnectAny = true;
}

/* ── Wi-Fi Configuration over BLE (0xE1) ──────────────────────────────────── */
static bool saveWifiNetworkOverBle(const char* ssid, const char* pass, const char* cpUser, const char* cpPass, bool connectNow) {
    if (!ssid || strlen(ssid) == 0) return false;

    char cleanSsid[65]   = {0};
    char cleanPass[65]   = {0};
    char cleanUser[65]   = {0};
    char cleanCpPass[65] = {0};

    strncpy(cleanSsid, ssid, sizeof(cleanSsid) - 1);
    sanitizeString(cleanSsid);
    if (pass) {
        strncpy(cleanPass, pass, sizeof(cleanPass) - 1);
        sanitizeString(cleanPass);
    }
    if (cpUser) {
        strncpy(cleanUser, cpUser, sizeof(cleanUser) - 1);
        sanitizeString(cleanUser);
    }
    if (cpPass) {
        strncpy(cleanCpPass, cpPass, sizeof(cleanCpPass) - 1);
        sanitizeString(cleanCpPass);
    }

    Serial.println("-------------------------------------------------------");
    Serial.printf("Target SSID: [%s]\n", cleanSsid);
    Serial.printf("Pass length: %d\n", (int)strlen(cleanPass));
    Serial.println("-------------------------------------------------------");

    // Reset Fortinet retry counter only when new BLE credentials arrive!
    s_fortinetRetryCount = 0;

    int targetSlot = -1;
    for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
        if (s_savedNetworks[i].valid && strncmp(s_savedNetworks[i].ssid, cleanSsid, 64) == 0) {
            targetSlot = i;
            break;
        }
    }
    if (targetSlot < 0) {
        for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
            if (!s_savedNetworks[i].valid) {
                targetSlot = i;
                break;
            }
        }
    }
    if (targetSlot < 0) targetSlot = 0;

    s_savedNetworks[targetSlot].valid = true;
    strncpy(s_savedNetworks[targetSlot].ssid, cleanSsid, sizeof(s_savedNetworks[targetSlot].ssid) - 1);
    s_savedNetworks[targetSlot].ssid[sizeof(s_savedNetworks[targetSlot].ssid) - 1] = '\0';

    if (strlen(cleanPass) > 0) {
        strncpy(s_savedNetworks[targetSlot].pass, cleanPass, sizeof(s_savedNetworks[targetSlot].pass) - 1);
        s_savedNetworks[targetSlot].pass[sizeof(s_savedNetworks[targetSlot].pass) - 1] = '\0';
    } else {
        s_savedNetworks[targetSlot].pass[0] = '\0'; // Clears any previously saved password for open networks!
    }

    if (strlen(cleanUser) > 0) {
        strncpy(s_savedNetworks[targetSlot].cpUser, cleanUser, sizeof(s_savedNetworks[targetSlot].cpUser) - 1);
        s_savedNetworks[targetSlot].cpUser[sizeof(s_savedNetworks[targetSlot].cpUser) - 1] = '\0';
        if (strlen(s_savedNetworks[targetSlot].cpUrl) == 0) {
            strncpy(s_savedNetworks[targetSlot].cpUrl, DEFAULT_FORTINET_GATEWAY, sizeof(s_savedNetworks[targetSlot].cpUrl) - 1);
        }
    } else {
        s_savedNetworks[targetSlot].cpUser[0] = '\0';
    }

    if (strlen(cleanCpPass) > 0) {
        strncpy(s_savedNetworks[targetSlot].cpPass, cleanCpPass, sizeof(s_savedNetworks[targetSlot].cpPass) - 1);
        s_savedNetworks[targetSlot].cpPass[sizeof(s_savedNetworks[targetSlot].cpPass) - 1] = '\0';
    } else {
        s_savedNetworks[targetSlot].cpPass[0] = '\0';
    }

    saveWifiNetworkToNVS(targetSlot);
    char logMsg[96];
    snprintf(logMsg, sizeof(logMsg), "BLE saved Wi-Fi '%s' (Slot %d)", cleanSsid, targetSlot);
    appendDebugLog(logMsg);

    if (connectNow) {
        appendDebugLog("Queued Wi-Fi connect via background worker...");
        s_reqConnectSlot = targetSlot;
    }
    return true;
}

/* ── CORS & REST Response Utilities ──────────────────────────────────────── */
static inline void setCorsHeaders() {
    s_webServer.sendHeader("Access-Control-Allow-Origin", "*");
    s_webServer.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    s_webServer.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

static inline void handleOptions() {
    setCorsHeaders();
    s_webServer.send(204);
}

/* ── Embedded High-Contrast Responsive HTML Dashboard ────────────────────── */
static const char DASHBOARD_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartDesk V2 &bull; Wi-Fi Portal</title>
  <style>
    :root { --cyan: #06b6d4; --bg: #09090b; --card: #18181b; --border: #27272a; --txt: #fafafa; --dim: #a1a1aa; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--txt); padding: 16px; min-height: 100vh; }
    .max-w { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 2px solid var(--border); }
    .title { font-size: 20px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 11px; padding: 4px 10px; border-radius: 999px; font-weight: 800; text-transform: uppercase; }
    .badge-ok { background: #065f46; color: #34d399; border: 1px solid #059669; }
    .badge-off { background: #3f3f46; color: #d4d4d8; }
    .card { background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .card-title { font-size: 14px; font-weight: 800; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.5px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .btn { background: var(--cyan); color: #000; border: none; font-weight: 900; padding: 12px; border-radius: 10px; cursor: pointer; text-align: center; font-size: 13px; transition: transform 0.1s; }
    .btn:active { transform: scale(0.97); }
    .btn-zinc { background: #27272a; color: #fff; border: 1px solid #3f3f46; }
    .btn-red { background: #e11d48; color: #fff; }
    .input { background: #000; border: 2px solid var(--border); color: #fff; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; width: 100%; font-weight: 600; }
    .input:focus { border-color: var(--cyan); }
    .relay-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #000; border-radius: 10px; border: 1px solid var(--border); }
    .net-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #000; border-radius: 10px; border: 1px solid var(--border); }
    .footer { text-align: center; font-size: 12px; color: var(--dim); margin-top: 10px; }
  </style>
</head>
<body>
  <div class="max-w">
    <div class="header">
      <div class="title">⚡ SmartDesk V2</div>
      <div id="statBadge" class="badge badge-off">Connecting...</div>
    </div>

    <!-- Quick Status Card -->
    <div class="card">
      <div class="card-title">📡 Network Status</div>
      <div style="font-size:13px; line-height: 1.8;">
        <div>Connected Wi-Fi: <b id="lblSsid" style="color:var(--cyan)">None</b></div>
        <div>IP Address: <b id="lblIp" style="color:#fff">192.168.4.1</b></div>
        <div>Signal (RSSI): <span id="lblRssi">--</span> dBm</div>
        <div>Captive Portal: <span id="lblPortal">--</span></div>
      </div>
    </div>

    <!-- Relays Direct Toggle -->
    <div class="card">
      <div class="card-title">⚡ Relay Controls</div>
      <div id="relaysList" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button class="btn btn-red" onclick="allOff()">ALL RELAYS OFF</button>
    </div>

    <!-- Wi-Fi Scanner & Connect -->
    <div class="card">
      <div class="card-title">🔍 Wi-Fi Network Setup</div>
      <button class="btn btn-zinc" onclick="scanWifi()">SCAN FOR NETWORKS</button>
      <select id="scanSelect" class="input" style="display:none;" onchange="selectScanned(this.value)">
        <option value="">Select a scanned network...</option>
      </select>
      
      <input id="netSsid" class="input" placeholder="Wi-Fi SSID (Name)" />
      <input id="netPass" class="input" type="password" placeholder="Wi-Fi Password" />

      <!-- Expandable College Captive Portal Fields -->
      <details style="margin-top:4px;">
        <summary style="font-size:12px; font-weight:800; color:var(--cyan); cursor:pointer; padding:6px 0;">🏫 College / Restricted Wi-Fi Sign-In (Optional)</summary>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          <input id="netUrl" class="input" placeholder="Portal Login URL (e.g. http://10.0.0.1/login)" />
          <input id="netUser" class="input" placeholder="Student / Username ID" />
          <input id="netCPPass" class="input" type="password" placeholder="Portal Password" />
          <input id="netFields" class="input" placeholder="Custom POST fields (optional)" />
        </div>
      </details>

      <button class="btn" onclick="saveAndConnect()">SAVE &amp; CONNECT NOW</button>
    </div>

    <!-- Saved Networks Management -->
    <div class="card">
      <div class="card-title">💾 Saved Networks</div>
      <div id="savedList" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>

    <!-- SoftAP & Power Saver Settings -->
    <div class="card">
      <div class="card-title">⚙️ Desk Hotspot &amp; Away Mode</div>
      <input id="apSsid" class="input" placeholder="Hotspot Name" />
      <input id="apPass" class="input" type="password" placeholder="Hotspot Password" />
      <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; cursor:pointer;">
        <input type="checkbox" id="chkAwayWifi" style="width:18px; height:18px;" />
        Turn Wi-Fi ON only when Away (Power Saver)
      </label>
      <button class="btn btn-zinc" onclick="saveApSettings()">UPDATE HOTSPOT SETTINGS</button>
    </div>

    <div class="footer">SmartDesk V2 &bull; 24/7 Smart Desk Controller</div>
  </div>

  <script>
    async function loadStatus() {
      try {
        const res = await fetch('/api/status');
        const d = await res.json();
        document.getElementById('lblSsid').textContent = d.wifi.ssid || "Disconnected";
        document.getElementById('lblIp').textContent = d.wifi.ip;
        document.getElementById('lblRssi').textContent = d.wifi.rssi;
        document.getElementById('lblPortal').textContent = d.wifi.portal || "N/A";
        const b = document.getElementById('statBadge');
        if (d.wifi.connected) {
          b.className = "badge badge-ok"; b.textContent = "CONNECTED";
        } else {
          b.className = "badge badge-off"; b.textContent = "HOTSPOT ONLY";
        }

        // Render Relays
        let rHtml = '';
        d.relays.forEach((r, idx) => {
          rHtml += `
            <div class="relay-item">
              <div>
                <b>${r.name}</b>
                ${r.remMin > 0 ? `<span style="font-size:11px; color:#f59e0b"> &bull; ${r.remMin}m left</span>` : ''}
              </div>
              <button class="btn ${r.load ? '' : 'btn-zinc'}" style="padding:6px 14px; font-size:11px;" onclick="toggleRelay(${idx}, ${r.load ? 0 : 1})">
                ${r.load ? 'ON' : 'OFF'}
              </button>
            </div>`;
        });
        document.getElementById('relaysList').innerHTML = rHtml;

        // Render AP settings
        document.getElementById('apSsid').value = d.ap.ssid;
        document.getElementById('chkAwayWifi').checked = d.ap.awayOnly;

        // Render Saved Networks
        let sHtml = '';
        d.saved.forEach((n, idx) => {
          sHtml += `
            <div class="net-item">
              <div>
                <b>${n.ssid}</b>
                ${n.hasCP ? '<span style="font-size:10px; color:#06b6d4"> [PORTAL]</span>' : ''}
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn" style="padding:4px 10px; font-size:11px;" onclick="connectSaved(${idx})">Connect</button>
                <button class="btn btn-red" style="padding:4px 10px; font-size:11px;" onclick="deleteSaved(${idx})">Del</button>
              </div>
            </div>`;
        });
        document.getElementById('savedList').innerHTML = sHtml || '<div style="font-size:12px; color:#71717a">No saved networks.</div>';
      } catch (e) {
        console.error(e);
      }
    }

    async function toggleRelay(idx, load) {
      await fetch('/api/relay', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ idx, load }) });
      loadStatus();
    }

    async function allOff() {
      await fetch('/api/relay', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ allOff: true }) });
      loadStatus();
    }

    async function scanWifi() {
      const sel = document.getElementById('scanSelect');
      sel.style.display = 'block';
      sel.innerHTML = '<option>Scanning...</option>';
      const res = await fetch('/api/wifi/scan', { method: 'POST' });
      const d = await res.json();
      sel.innerHTML = '<option value="">Select a network...</option>' + d.networks.map(n => `<option value="${n.ssid}">${n.ssid} (${n.rssi} dBm)</option>`).join('');
    }

    function selectScanned(ssid) {
      if (ssid) document.getElementById('netSsid').value = ssid;
    }

    async function saveAndConnect() {
      const ssid = document.getElementById('netSsid').value.trim();
      const pass = document.getElementById('netPass').value;
      const cpUrl = document.getElementById('netUrl').value.trim();
      const cpUser = document.getElementById('netUser').value.trim();
      const cpPass = document.getElementById('netCPPass').value;
      const cpFields = document.getElementById('netFields').value.trim();
      if (!ssid) return alert('SSID is required');

      await fetch('/api/wifi/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ssid, pass, cpUrl, cpUser, cpPass, cpFields, connectNow: true })
      });
      alert('Network saved! Connecting...');
      setTimeout(loadStatus, 3000);
    }

    async function connectSaved(idx) {
      await fetch('/api/wifi/connect', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ idx }) });
      alert('Connecting...');
      setTimeout(loadStatus, 3000);
    }

    async function deleteSaved(idx) {
      if (!confirm('Delete this network?')) return;
      await fetch('/api/wifi/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ idx }) });
      loadStatus();
    }

    async function saveApSettings() {
      const ssid = document.getElementById('apSsid').value.trim();
      const pass = document.getElementById('apPass').value;
      const awayOnly = document.getElementById('chkAwayWifi').checked;
      await fetch('/api/wifi/ap', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ssid, pass, awayOnly })
      });
      alert('Hotspot settings updated!');
      loadStatus();
    }

    loadStatus();
    setInterval(loadStatus, 4000);
  </script>
</body>
</html>
)rawliteral";

/* ── Web API Routes ──────────────────────────────────────────────────────── */
static void handleRoot() {
    setCorsHeaders();
    s_webServer.send_P(200, "text/html", DASHBOARD_HTML);
}

static void handleApiStatus() {
    setCorsHeaders();
    uint8_t h = 0, m = 0, s = 0, dow = 0;
    getLocalTime(&h, &m, &s, &dow);

    String json = "{";
    json += "\"device\":\"" + String(s_deviceName) + "\",";
    json += "\"uptime\":" + String(millis() / 1000UL) + ",";
    json += "\"time\":{\"h\":" + String(h) + ",\"m\":" + String(m) + ",\"s\":" + String(s) + ",\"dow\":" + String(dow) + ",\"synced\":" + (s_ntpSynced ? "true" : "false") + "},";
    
    // Wi-Fi Status
    json += "\"wifi\":{";
    json += "\"connected\":" + String(s_wifiConnected ? "true" : "false") + ",";
    json += "\"ssid\":\"" + String(s_currentSsid) + "\",";
    json += "\"ip\":\"" + String(s_ipAddress) + "\",";
    json += "\"rssi\":" + String(s_wifiRssi) + ",";
    json += "\"portal\":\"" + String(s_lastPortalStatus) + "\"";
    json += "},";

    // SoftAP & Away Config
    json += "\"ap\":{";
    json += "\"ssid\":\"" + String(s_apConfig.ssid) + "\",";
    json += "\"awayOnly\":" + String(s_wifiOnAwayOnly ? "true" : "false");
    json += "},";

    // Relays
    json += "\"relays\":[";
    for (int i = 0; i < RELAY_COUNT; i++) {
        uint16_t remMin = 0;
        if (s_timerEndMs[i] > 0 && s_relayLoads[i] != 0 && millis() < s_timerEndMs[i]) {
            remMin = (uint16_t)(((s_timerEndMs[i] - millis()) + 59999UL) / 60000UL);
        }
        json += "{\"name\":\"" + String(s_relayConfigs[i].name) + "\",";
        json += "\"load\":" + String(s_relayLoads[i] ? "true" : "false") + ",";
        json += "\"remMin\":" + String(remMin) + "}";
        if (i < RELAY_COUNT - 1) json += ",";
    }
    json += "],";

    // Saved Networks List (without passwords for safety)
    json += "\"saved\":[";
    bool firstNet = true;
    for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
        if (!s_savedNetworks[i].valid) continue;
        if (!firstNet) json += ",";
        json += "{\"idx\":" + String(i) + ",\"ssid\":\"" + String(s_savedNetworks[i].ssid) + "\",";
        json += "\"cpUser\":\"" + String(s_savedNetworks[i].cpUser) + "\",";
        json += "\"hasCP\":" + String((strlen(s_savedNetworks[i].cpUrl) > 0 || strlen(s_savedNetworks[i].cpUser) > 0) ? "true" : "false") + "}";
        firstNet = false;
    }
    json += "],";

    // Environment Sensor
    json += "\"env\":{\"valid\":" + String(s_sensorValid ? "true" : "false") + ",";
    json += "\"temp\":" + String(s_tempC, 1) + ",\"hum\":" + String(s_humidity, 1) + "},";

    // LED State
    json += "\"led\":{\"mode\":" + String(s_ledMode) + ",\"r\":" + String(s_ledR) + ",\"g\":" + String(s_ledG) + ",\"b\":" + String(s_ledB) + ",\"bri\":" + String(s_ledBri) + ",\"spd\":" + String(s_ledSpd) + "}";
    json += "}";

    s_webServer.send(200, "application/json", json);
}

static void handleApiRelay() {
    setCorsHeaders();
    if (!s_webServer.hasArg("plain")) {
        s_webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
    }
    String body = s_webServer.arg("plain");

    if (body.indexOf("\"allOff\":true") >= 0 || body.indexOf("\"allOff\": 1") >= 0) {
        allRelaysOff("Web All-Off");
        s_webServer.send(200, "application/json", "{\"ok\":true}");
        return;
    }

    int idxKey = body.indexOf("\"idx\":");
    int loadKey = body.indexOf("\"load\":");
    int timerKey = body.indexOf("\"timerMin\":");

    if (idxKey >= 0) {
        int idx = body.substring(idxKey + 6).toInt();
        if (idx >= 0 && idx < RELAY_COUNT) {
            if (timerKey >= 0) {
                int tm = body.substring(timerKey + 11).toInt();
                setRelayTimer(idx, tm);
            } else if (loadKey >= 0) {
                int ld = body.substring(loadKey + 7).toInt();
                setRelayLoad(idx, ld, "Web API");
            }
        }
    }
    s_webServer.send(200, "application/json", "{\"ok\":true}");
}

static void handleApiLed() {
    setCorsHeaders();
    if (!s_webServer.hasArg("plain")) {
        s_webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
    }
    String body = s_webServer.arg("plain");

    int modeIdx = body.indexOf("\"mode\":");
    int rIdx    = body.indexOf("\"r\":");
    int gIdx    = body.indexOf("\"g\":");
    int bIdx    = body.indexOf("\"b\":");
    int briIdx  = body.indexOf("\"bri\":");
    int spdIdx  = body.indexOf("\"spd\":");

    if (modeIdx >= 0) s_ledMode = body.substring(modeIdx + 7).toInt();
    if (rIdx >= 0)    s_ledR    = body.substring(rIdx + 4).toInt();
    if (gIdx >= 0)    s_ledG    = body.substring(gIdx + 4).toInt();
    if (bIdx >= 0)    s_ledB    = body.substring(bIdx + 4).toInt();
    if (briIdx >= 0)  s_ledBri  = body.substring(briIdx + 6).toInt();
    if (spdIdx >= 0)  s_ledSpd  = body.substring(spdIdx + 6).toInt();

    saveLedStateToNVS();
    notifyLedState();
    s_webServer.send(200, "application/json", "{\"ok\":true}");
}

static void handleApiWifiScan() {
    setCorsHeaders();
    int n = WiFi.scanNetworks();
    String json = "{\"networks\":[";
    for (int i = 0; i < n && i < 15; i++) {
        json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
        if (i < n - 1 && i < 14) json += ",";
    }
    json += "]}";
    WiFi.scanDelete();
    s_webServer.send(200, "application/json", json);
}

static void handleApiWifiSave() {
    setCorsHeaders();
    if (!s_webServer.hasArg("plain")) {
        s_webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
    }
    String body = s_webServer.arg("plain");

    // Simple parse helper
    auto getJsonVal = [&](const char* key) -> String {
        int k = body.indexOf(key);
        if (k < 0) return "";
        int start = body.indexOf('"', k + strlen(key));
        if (start < 0) return "";
        int end = body.indexOf('"', start + 1);
        if (end < 0) return "";
        return body.substring(start + 1, end);
    };

    String ssid = getJsonVal("\"ssid\"");
    String pass = getJsonVal("\"pass\"");
    String cpUrl = getJsonVal("\"cpUrl\"");
    String cpUser = getJsonVal("\"cpUser\"");
    String cpPass = getJsonVal("\"cpPass\"");
    String cpFields = getJsonVal("\"cpFields\"");

    if (ssid.length() == 0) {
        s_webServer.send(400, "application/json", "{\"error\":\"SSID empty\"}");
        return;
    }

    // Find slot (either matching existing SSID or first empty slot)
    int targetSlot = -1, emptySlot = -1;
    for (int i = 0; i < MAX_WIFI_NETWORKS; i++) {
        if (s_savedNetworks[i].valid && strcmp(s_savedNetworks[i].ssid, ssid.c_str()) == 0) {
            targetSlot = i; break;
        }
        if (!s_savedNetworks[i].valid && emptySlot == -1) emptySlot = i;
    }
    if (targetSlot == -1) targetSlot = (emptySlot != -1) ? emptySlot : 0;

    s_savedNetworks[targetSlot].valid = true;
    strncpy(s_savedNetworks[targetSlot].ssid, ssid.c_str(), sizeof(s_savedNetworks[targetSlot].ssid) - 1);
    if (pass.length() > 0) strncpy(s_savedNetworks[targetSlot].pass, pass.c_str(), sizeof(s_savedNetworks[targetSlot].pass) - 1);
    strncpy(s_savedNetworks[targetSlot].cpUrl, cpUrl.c_str(), sizeof(s_savedNetworks[targetSlot].cpUrl) - 1);
    strncpy(s_savedNetworks[targetSlot].cpUser, cpUser.c_str(), sizeof(s_savedNetworks[targetSlot].cpUser) - 1);
    if (cpPass.length() > 0) strncpy(s_savedNetworks[targetSlot].cpPass, cpPass.c_str(), sizeof(s_savedNetworks[targetSlot].cpPass) - 1);
    strncpy(s_savedNetworks[targetSlot].cpFields, cpFields.c_str(), sizeof(s_savedNetworks[targetSlot].cpFields) - 1);

    saveWifiNetworkToNVS(targetSlot);

    if (body.indexOf("\"connectNow\":true") >= 0 || body.indexOf("\"connectNow\": true") >= 0) {
        connectToNetwork(s_savedNetworks[targetSlot]);
    }

    s_webServer.send(200, "application/json", "{\"ok\":true,\"slot\":" + String(targetSlot) + "}");
}

static void handleApiWifiDelete() {
    setCorsHeaders();
    if (!s_webServer.hasArg("plain")) {
        s_webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
    }
    String body = s_webServer.arg("plain");
    int idxKey = body.indexOf("\"idx\":");
    if (idxKey >= 0) {
        int idx = body.substring(idxKey + 6).toInt();
        if (idx >= 0 && idx < MAX_WIFI_NETWORKS) {
            memset(&s_savedNetworks[idx], 0, sizeof(SavedNetwork));
            s_savedNetworks[idx].valid = false;
            saveWifiNetworkToNVS(idx);
            s_webServer.send(200, "application/json", "{\"ok\":true}");
            return;
        }
    }
    s_webServer.send(400, "application/json", "{\"error\":\"Invalid index\"}");
}

static void handleApiWifiConnect() {
    setCorsHeaders();
    if (!s_webServer.hasArg("plain")) {
        s_webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
    }
    String body = s_webServer.arg("plain");
    int idxKey = body.indexOf("\"idx\":");
    if (idxKey >= 0) {
        int idx = body.substring(idxKey + 6).toInt();
        if (idx >= 0 && idx < MAX_WIFI_NETWORKS && s_savedNetworks[idx].valid) {
            bool ok = connectToNetwork(s_savedNetworks[idx]);
            s_webServer.send(200, "application/json", ok ? "{\"ok\":true}" : "{\"ok\":false,\"error\":\"Connect failed\"}");
            return;
        }
    }
    s_webServer.send(400, "application/json", "{\"error\":\"Invalid index\"}");
}

static void handleApiWifiAp() {
    setCorsHeaders();
    if (!s_webServer.hasArg("plain")) {
        s_webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
    }
    String body = s_webServer.arg("plain");

    auto getJsonVal = [&](const char* key) -> String {
        int k = body.indexOf(key);
        if (k < 0) return "";
        int start = body.indexOf('"', k + strlen(key));
        if (start < 0) return "";
        int end = body.indexOf('"', start + 1);
        if (end < 0) return "";
        return body.substring(start + 1, end);
    };

    String ssid = getJsonVal("\"ssid\"");
    String pass = getJsonVal("\"pass\"");
    if (ssid.length() > 0) strncpy(s_apConfig.ssid, ssid.c_str(), sizeof(s_apConfig.ssid) - 1);
    if (pass.length() >= 8) strncpy(s_apConfig.pass, pass.c_str(), sizeof(s_apConfig.pass) - 1);

    int awKey = body.indexOf("\"awayOnly\":");
    if (awKey >= 0) {
        s_wifiOnAwayOnly = (body.substring(awKey + 11).indexOf("true") == 0 || body.substring(awKey + 11).toInt() == 1);
    }

    saveApConfigToNVS();
    s_webServer.send(200, "application/json", "{\"ok\":true}");
}

static void handleApiWifiLogs() {
    setCorsHeaders();
    String raw = String(s_wifiDebugLog);
    raw.replace("\\", "\\\\");
    raw.replace("\"", "\\\"");
    raw.replace("\r", "");
    raw.replace("\n", "\\n");
    String json = "{\"ok\":true,\"logs\":\"" + raw + "\"}";
    s_webServer.send(200, "application/json", json);
}

static void handleCaptiveRedirect() {
    s_webServer.sendHeader("Location", "http://192.168.4.1/", true);
    s_webServer.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    s_webServer.sendHeader("Pragma", "no-cache");
    s_webServer.sendHeader("Expires", "-1");
    s_webServer.send(302, "text/html",
        "<!DOCTYPE html><html><head><meta http-equiv='refresh' content='0;url=http://192.168.4.1/'></head>"
        "<body><p>Redirecting to <a href='http://192.168.4.1/'>SmartDesk Portal</a>...</p></body></html>");
}

/* ── FreeRTOS Background Wi-Fi Worker (Runs on Core 0) ───────────────────── */
static TaskHandle_t s_wifiTaskHandle = NULL;

static void wifiWorkerTask(void* pvParameters) {
    vTaskDelay(pdMS_TO_TICKS(2000)); // Allow Core 1 setup() & BLE to finish completely before Wi-Fi starts
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(25)); // 25ms tick for fast background response
        // --- Hardware Sleep Window Check ---
        static bool s_wasSleeping = false;
        if (isCloudSleepTime()) {
            if (!s_wasSleeping) {
                Serial.println(">>> [POWER SAVE] Sleep window active. Shutting down Wi-Fi radio & Cloud...");
                stopCloudClient();
                WiFi.disconnect(true, true);
                WiFi.mode(WIFI_OFF);
                s_wifiConnected = false;
                s_wasSleeping = true;
            }
            vTaskDelay(pdMS_TO_TICKS(1000));
            continue; // Skip all other Wi-Fi operations while sleeping
        } else if (s_wasSleeping) {
            Serial.println(">>> [POWER SAVE] Sleep window ended. Waking up Wi-Fi radio...");
            WiFi.mode(WIFI_STA);
            s_reqConnectAny = true; 
            s_wasSleeping = false;
        }
        // 1. Handle BLE Wi-Fi Airwave Scan Request (0xEE)
        if (s_reqBleWifiScan) {
            s_reqBleWifiScan = false;
            appendDebugLog("Scanning Wi-Fi airwaves for BLE client...");
            int n = WiFi.scanNetworks(false, true);
            if (n < 0) n = 0;
            int maxToSend = (n > 12) ? 12 : n;
            for (int i = 0; i < maxToSend; i++) {
                String curSsid = WiFi.SSID(i);
                int32_t r = WiFi.RSSI(i);
                uint8_t rAbs = (uint8_t)abs(r);
                uint8_t sLen = curSsid.length() > 32 ? 32 : (uint8_t)curSsid.length();

                uint8_t scanPacket[40];
                scanPacket[0] = 0xEE;
                scanPacket[1] = (uint8_t)i;
                scanPacket[2] = (uint8_t)maxToSend;
                scanPacket[3] = rAbs;
                scanPacket[4] = sLen;
                if (sLen > 0) {
                    memcpy(&scanPacket[5], curSsid.c_str(), sLen);
                }
                if (s_pConfigChar && s_connected) {
                    s_pConfigChar->setValue(scanPacket, 5 + sLen);
                    s_pConfigChar->notify();
                    vTaskDelay(pdMS_TO_TICKS(25));
                }
            }
            uint8_t endPacket[5] = { 0xEE, 0xFF, (uint8_t)maxToSend, 0, 0 };
            if (s_pConfigChar && s_connected) {
                s_pConfigChar->setValue(endPacket, sizeof(endPacket));
                s_pConfigChar->notify();
            }
            WiFi.scanDelete();
            char sDoneMsg[64];
            snprintf(sDoneMsg, sizeof(sDoneMsg), "Airwave scan completed (%d networks found)", n);
            appendDebugLog(sDoneMsg);
        }

        // 2. Handle direct connection requests triggered via BLE (0xE1 / 0xE2) or Web API
        if (s_reqConnectSlot >= 0) {
            int slot = s_reqConnectSlot;
            s_reqConnectSlot = -1;
            if (slot < MAX_WIFI_NETWORKS && s_savedNetworks[slot].valid) {
                if (connectToNetwork(s_savedNetworks[slot])) {
                    stopSoftApFallback();
                    startCloudClient(); // WebSocket ONLY connects when internet is confirmed!
                } else {
                    stopCloudClient();
                    startSoftApFallback(); // Fallback to SoftAP if connection fails
                }
                notifyEnvState();
            }
        }

        // 3. Handle Auto-Connect to Any Saved Network request
        if (s_reqConnectAny) {
            s_reqConnectAny = false;
            if (connectToAnySavedNetwork()) {
                stopSoftApFallback();
                startCloudClient(); // WebSocket ONLY connects when internet is confirmed!
            } else {
                stopCloudClient();
                startSoftApFallback(); // SoftAP only triggers if all saved networks fail!
            }
            notifyEnvState();
        }

        // 4. Update cloud WebSocket client if internet is active
        if (s_wifiConnected) {
            if (s_connected) {
                // BLE is actively connected. Drop the Cloud WS to save Render hours.
                if (s_cloudConnected) {
                    Serial.println(">>> [POWER SAVE] BLE connected. Dropping Cloud WebSocket...");
                    stopCloudClient();
                }
            } else {
                updateCloudClient();
                if (!s_cloudConnected) {
                    static uint32_t s_lastWsAutoReconnectMs = 0;
                    if (millis() - s_lastWsAutoReconnectMs >= 15000UL) {
                        s_lastWsAutoReconnectMs = millis();
                        if (checkInternetAccess()) {
                            Serial.println(">>> [CLOUD WS] Auto-reconnecting to cloud relay...");
                            startCloudClient();
                        }
                    }
                } else {
                    // Prevent Render Free Tier from sleeping ONLY when actively using the cloud
                    static uint32_t s_lastRenderKeepAliveMs = millis();
                    if (millis() - s_lastRenderKeepAliveMs >= 840000UL) { // 14 minutes
                        s_lastRenderKeepAliveMs = millis();
                        HTTPClient httpPing;
                        httpPing.begin("https://smart-desk-controller.onrender.com/health");
                        httpPing.setTimeout(3500);
                        httpPing.GET();
                        httpPing.end();
                        Serial.println(">>> [CLOUD] Sent 14-min keep-alive ping to Render to prevent sleep.");
                    }
                }
            }
        }

        uint32_t now = millis();

        // 5. Periodic STA connection health & auto-reconnect (every 15s)
        if (now - s_lastWifiCheckMs >= 15000UL) {
            s_lastWifiCheckMs = now;

            // If Away-Only mode is enabled, only connect when client is disconnected/away
            if (s_wifiOnAwayOnly && s_connected) {
                if (WiFi.status() == WL_CONNECTED) {
                    Serial.println(">>> [WIFI POWER SAVE] Mobile connected via BLE. Disconnecting Wi-Fi STA.");
                    stopCloudClient();
                    WiFi.disconnect();
                    s_wifiConnected = false;
                    s_lastProbeTimeMs = 0;
                    s_lastProbeResult = false;
                }
                continue;
            }

            // Do not scan or reconnect if a phone is actively connected to SoftAP!
            if (WiFi.softAPgetStationNum() > 0) {
                continue;
            }

            if (WiFi.status() == WL_CONNECTED && s_wifiConnected) {
                s_wifiRssi = WiFi.RSSI();
                strncpy(s_ipAddress, WiFi.localIP().toString().c_str(), sizeof(s_ipAddress) - 1);

                // Internet & Captive Portal Watchdog (rate-limited to 60s)
                if (now - s_lastInternetCheckMs >= 60000UL) {
                    s_lastInternetCheckMs = now;
                    if (!checkInternetAccess(true)) {
                        Serial.println(">>> [WATCHDOG] Captive portal / internet drop detected. Blocking cloud WebSocket...");
                        stopCloudClient(); // BLOCK WebSocket immediately

                        SavedNetwork curNet;
                        bool found = false;
                        for (int s = 0; s < MAX_WIFI_NETWORKS; s++) {
                            if (s_savedNetworks[s].valid && strncmp(s_savedNetworks[s].ssid, s_currentSsid, 32) == 0) {
                                curNet = s_savedNetworks[s];
                                found = true;
                                break;
                            }
                        }

                        bool restored = false;
                        if (found && strlen(curNet.cpUser) > 0 && strlen(curNet.cpPass) > 0) {
                            restored = performCaptivePortalLogin(curNet);
                        }

                        if (restored && checkInternetAccess(true)) {
                            Serial.println(">>> [WATCHDOG] Internet access restored. Resuming cloud WebSocket...");
                            startCloudClient();
                        } else {
                            Serial.println(">>> [WATCHDOG] Re-authentication failed. Triggering network reconnection...");
                            WiFi.disconnect();
                            s_wifiConnected = false;
                            s_lastProbeTimeMs = 0;
                            s_lastProbeResult = false;
                            s_reqConnectAny = true;
                        }
                    }
                }
            } else {
                s_wifiConnected = false;
                s_lastProbeTimeMs = 0;
                s_lastProbeResult = false;
                stopCloudClient();
                if (!s_connected && WiFi.softAPgetStationNum() == 0) {
                    s_reqConnectAny = true;
                }
            }
        }
    }
}

static void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
    if (event == ARDUINO_EVENT_WIFI_STA_START) {
        Serial.println(">>> [WIFI EVENT] STA Started");
    } else if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
        Serial.println(">>> [WIFI EVENT] STA Connected to AP (L2 802.11 OK)");
    } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
        Serial.printf(">>> [WIFI EVENT] STA Got IP: %s\n", IPAddress(info.got_ip.ip_info.ip.addr).toString().c_str());
    } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
        Serial.printf(">>> [WIFI EVENT] STA Disconnected! Reason: %d\n", (int)info.wifi_sta_disconnected.reason);
    }
}

/* ── Initialization & Loop Tick ──────────────────────────────────────────── */
static void initWifiSubsystem() {
    loadWifiFromNVS();

    WiFi.onEvent(onWiFiEvent);
    // Start in pure Station mode initially (SoftAP stays OFF until needed)
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    wifi_country_t country = { "IN", 1, 13, 20, WIFI_COUNTRY_POLICY_AUTO };
    esp_wifi_set_country(&country);
    s_softApActive = false;

    // Register Web Server Routes
    s_webServer.on("/", HTTP_GET, handleRoot);
    s_webServer.on("/api/status", HTTP_GET, handleApiStatus);
    s_webServer.on("/api/status", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/relay", HTTP_POST, handleApiRelay);
    s_webServer.on("/api/relay", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/led", HTTP_POST, handleApiLed);
    s_webServer.on("/api/led", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/wifi/scan", HTTP_POST, handleApiWifiScan);
    s_webServer.on("/api/wifi/scan", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/wifi/save", HTTP_POST, handleApiWifiSave);
    s_webServer.on("/api/wifi/save", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/wifi/delete", HTTP_POST, handleApiWifiDelete);
    s_webServer.on("/api/wifi/delete", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/wifi/connect", HTTP_POST, handleApiWifiConnect);
    s_webServer.on("/api/wifi/connect", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/wifi/ap", HTTP_POST, handleApiWifiAp);
    s_webServer.on("/api/wifi/ap", HTTP_OPTIONS, handleOptions);
    s_webServer.on("/api/wifi/logs", HTTP_GET, handleApiWifiLogs);
    s_webServer.on("/api/wifi/logs", HTTP_OPTIONS, handleOptions);

    // Captive Portal Detection Endpoints (Android, iOS, Windows)
    s_webServer.on("/generate_204", handleCaptiveRedirect);
    s_webServer.on("/gen_204", handleCaptiveRedirect);
    s_webServer.on("/hotspot-detect.html", handleCaptiveRedirect);
    s_webServer.on("/ncsi.txt", handleCaptiveRedirect);
    s_webServer.on("/connecttest.txt", handleCaptiveRedirect);
    s_webServer.on("/canonical.html", handleCaptiveRedirect);
    s_webServer.onNotFound(handleCaptiveRedirect);

    s_webServer.begin();
    Serial.println(">>> [HTTP SERVER] Web Server listening on port 80.");

    // Launch Wi-Fi background maintenance task on Core 0 (keeps Core 1 & BLE 100% latency-free!)
    xTaskCreatePinnedToCore(
        wifiWorkerTask,
        "wifiWorker",
        8192,
        NULL,
        1, // Priority 1 (low)
        &s_wifiTaskHandle,
        0  // Pin to Core 0
    );

    // Queue initial connection across saved networks
    s_reqConnectAny = true;
}

static void updateWifiSubsystem() {
    if (s_softApActive) {
        s_dnsServer.processNextRequest();
    }
    s_webServer.handleClient();
}