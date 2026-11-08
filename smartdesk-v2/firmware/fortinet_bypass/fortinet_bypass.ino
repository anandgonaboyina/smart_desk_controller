/**
 * fortinet_bypass.ino — Standalone Fortinet Captive Portal Bypass for ESP32
 *
 * Purpose : Automatically connects to Wi-Fi, tests internet connectivity via Apple hotspot-detect,
 *           scrapes dynamic 'magic' token and '4Tredir' URL from Fortinet gateway (192.168.80.1:1000),
 *           URL-encodes 4Tredir, constructs x-www-form-urlencoded POST payload, and logs in.
 * Depends : WiFi.h, HTTPClient.h
 */

#include <WiFi.h>
#include <HTTPClient.h>

/* ==============================================================================
   USER CREDENTIALS & NETWORK SETTINGS — ENTER YOUR DETAILS HERE
   ============================================================================== */
const char* wifiSSID        = "COLLEGE_WIFI_SSID";   // Put college Wi-Fi SSID
const char* wifiPassword    = "";                   // Usually open (empty string)

String studentUsername      = "YOUR_STUDENT_ID";    // e.g. "21B91A0501" or username
String studentPassword      = "YOUR_PASSWORD";      // e.g. "SecretPassword123"

// Fortinet Portal Gateway IP & Port (intercepted from network 192.168.80.x)
String fortinetGatewayUrl   = "http://192.168.80.1:1000/";
String fallbackRedirectUrl  = "http://captive.apple.com/hotspot-detect.html";

/* ==============================================================================
   HELPER FUNCTIONS
   ============================================================================== */

/**
 * RFC 3986 URL encoder for x-www-form-urlencoded payload components.
 * Converts characters like ':', '/', '?', '=', '&', '%' into '%XX'.
 */
String urlEncode(const String &str) {
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
String extractToken(const String &html, const String &key) {
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

/**
 * Tests if the ESP32 has real internet access by pinging Apple's probe URL.
 * Returns true if HTTP 200 with "Success" in body is received.
 */
bool checkInternetAccess() {
    Serial.println(">>> [PROBE] Pinging http://captive.apple.com/hotspot-detect.html ...");
    HTTPClient http;
    http.begin("http://captive.apple.com/hotspot-detect.html");
    http.setTimeout(4000);
    int httpCode = http.GET();
    bool hasInternet = false;

    if (httpCode == 200) {
        String body = http.getString();
        if (body.indexOf("Success") != -1) {
            hasInternet = true;
        }
    }
    http.end();

    if (hasInternet) {
        Serial.println(">>> [PROBE RESULT] Internet is ACTIVE! (HTTP 200 'Success')");
    } else {
        Serial.printf(">>> [PROBE RESULT] Captive Portal DETECTED! (HTTP code: %d)\n", httpCode);
    }
    return hasInternet;
}

/**
 * Performs Fortinet Captive Portal authentication.
 */
bool performFortinetLogin() {
    Serial.println("\n=======================================================");
    Serial.println(">>> [FORTINET] Starting Captive Portal Bypass Sequence");
    Serial.println("=======================================================");

    // Step 1: Fetch Login Page HTML
    Serial.printf(">>> [FORTINET] Fetching login page from: %s\n", fortinetGatewayUrl.c_str());
    HTTPClient http;
    http.begin(fortinetGatewayUrl);
    http.setTimeout(7000);
    int getCode = http.GET();

    if (getCode <= 0) {
        Serial.printf(">>> [FORTINET ERROR] Could not reach portal gateway: %s\n", http.errorToString(getCode).c_str());
        http.end();
        return false;
    }

    String html = http.getString();
    http.end();

    Serial.printf(">>> [FORTINET] Received HTML response (%d bytes)\n", html.length());

    // Step 2: Parse 'magic' and '4Tredir' hidden input tokens
    String magicToken = extractToken(html, "magic");
    String redirUrl   = extractToken(html, "4Tredir");

    // CRITICAL: Clear large HTML string immediately to free heap memory
    html = "";

    Serial.println("-------------------------------------------------------");
    Serial.printf(">>> [FORTINET] Scraped Magic Token : \"%s\"\n", magicToken.c_str());
    Serial.printf(">>> [FORTINET] Scraped 4Tredir URL : \"%s\"\n", redirUrl.c_str());

    if (magicToken.length() == 0) {
        Serial.println(">>> [FORTINET WARN] 'magic' token not found in HTML. Check gateway URL or portal page.");
        return false;
    }

    if (redirUrl.length() == 0) {
        redirUrl = fallbackRedirectUrl;
        Serial.printf(">>> [FORTINET] Using fallback 4Tredir: \"%s\"\n", redirUrl.c_str());
    }

    // Step 3: Mandatory URL-Encoding of 4Tredir
    String encodedRedirect = urlEncode(redirUrl);
    Serial.printf(">>> [FORTINET] URL-Encoded 4Tredir  : \"%s\"\n", encodedRedirect.c_str());

    // Step 4: Construct exact POST payload
    // Structure: "4Tredir=" + redirectUrl + "&magic=" + magicToken + "&username=" + studentUsername + "&password=" + studentPassword
    String payload = "4Tredir=" + encodedRedirect + 
                     "&magic=" + magicToken + 
                     "&username=" + studentUsername + 
                     "&password=" + studentPassword;

    Serial.println("-------------------------------------------------------");
    Serial.println(">>> [FORTINET] Assembled POST Payload:");
    Serial.println(payload);
    Serial.println("-------------------------------------------------------");

    // Step 5: Send HTTP POST with strict headers
    Serial.printf(">>> [FORTINET] Submitting credentials to: %s\n", fortinetGatewayUrl.c_str());
    http.begin(fortinetGatewayUrl);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.setTimeout(8000);

    int postCode = http.POST((uint8_t*)payload.c_str(), payload.length());
    Serial.printf(">>> [FORTINET] POST Response Code: %d\n", postCode);

    if (postCode > 0) {
        String resp = http.getString();
        Serial.println(">>> [FORTINET] Response snippet:");
        Serial.println(resp.substring(0, min((unsigned int)resp.length(), 250U)));
        resp = "";
    } else {
        Serial.printf(">>> [FORTINET ERROR] POST failed: %s\n", http.errorToString(postCode).c_str());
    }
    http.end();

    // Step 6: Verify internet connectivity
    delay(1500);
    return checkInternetAccess();
}

/**
 * Ensures Wi-Fi Station is connected. Reconnects if dropped.
 */
void checkWifiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.printf(">>> [WIFI] Connecting to SSID: %s ...\n", wifiSSID);
        WiFi.disconnect();
        delay(100);
        WiFi.begin(wifiSSID, strlen(wifiPassword) > 0 ? wifiPassword : nullptr);

        uint32_t startMs = millis();
        while (WiFi.status() != WL_CONNECTED && (millis() - startMs < 10000)) {
            delay(250);
            Serial.print(".");
        }
        Serial.println();

        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf(">>> [WIFI CONNECTED] IP: %s (RSSI: %d dBm)\n",
                          WiFi.localIP().toString().c_str(), WiFi.RSSI());
            // Immediately run bypass sequence upon establishing Wi-Fi link
            if (!checkInternetAccess()) {
                performFortinetLogin();
            }
        } else {
            Serial.println(">>> [WIFI FAILED] Could not associate with SSID.");
        }
    }
}

/* ==============================================================================
   MAIN SETUP & LOOP
   ============================================================================== */

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n========================================================");
    Serial.println("   ESP32 Fortinet Captive Portal Auto-Bypass Tool       ");
    Serial.println("========================================================");
    Serial.printf("Configured User : %s\n", studentUsername.c_str());
    Serial.printf("Gateway Target  : %s\n", fortinetGatewayUrl.c_str());

    WiFi.mode(WIFI_STA);
    checkWifiConnection();
}

static uint32_t lastCheckMs = 0;

void loop() {
    // Keep Wi-Fi connection alive
    checkWifiConnection();

    // Re-verify internet every 30 seconds; auto-relogin if session expired
    if (millis() - lastCheckMs >= 30000) {
        lastCheckMs = millis();
        if (WiFi.status() == WL_CONNECTED) {
            if (!checkInternetAccess()) {
                Serial.println(">>> [WATCHDOG] Internet drop/session expiry detected. Running Fortinet bypass...");
                performFortinetLogin();
            }
        }
    }

    delay(100);
}
