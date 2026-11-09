/**
 * server.js — SmartDesk V2 Multi-User IoT Cloud Relay & WebSocket Server
 *
 * Purpose : Secure, multi-tenant cloud backend for SmartDesk V2.
 *           Routes remote commands between authorized Next.js PWA clients and ESP32-S3 controllers.
 *           Enforces multi-user isolation (zero cross-talk) and supports power-saving Remote Mode toggles.
 * Depends : express, ws, cors, dotenv
 * Host    : Designed for 1-click deployment on Render (or any cloud container)
 */

require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 3001;
const DEFAULT_AUTH_KEY = process.env.DEVICE_SECRET_KEY || "SmartDesk_Cloud_Secret_2026";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// In-Memory Multi-User & Multi-Device Routing Tables
// deviceId -> { ws, deviceKey, isOnline, remoteModeEnabled, lastSeen, state, name }
const devices = new Map();

// ws -> { role: 'client'|'device', userId, deviceId, authenticated: boolean, ip: string }
const connections = new Map();

/**
 * Helper: Find or initialize a device record in the registry
 */
function getOrCreateDevice(deviceId) {
  if (!devices.has(deviceId)) {
    devices.set(deviceId, {
      ws: null,
      deviceKey: DEFAULT_AUTH_KEY,
      isOnline: false,
      remoteModeEnabled: false, // Default: Remote WebSocket connection idle to save power
      lastSeen: 0,
      name: `SmartDesk-${deviceId.slice(-4)}`,
      state: {
        relays: [
          { load: false, remainingMin: 0 },
          { load: false, remainingMin: 0 },
          { load: false, remainingMin: 0 },
          { load: false, remainingMin: 0 },
        ],
        led: { mode: 1, r: 0, g: 180, b: 255, bri: 100, spd: 5 },
        env: { tempC: 0, humidity: 0, valid: false },
        presence: { state: 0, distanceM: 0, remainingMin: 0 },
      },
    });
  }
  return devices.get(deviceId);
}

/**
 * Helper: Tolerant device name matching for verification & client auth
 */
function isMatchingDeviceName(inputName, devId, actualName, defaultName) {
  if (!inputName || !inputName.trim()) return true;
  const input = inputName.trim().toLowerCase();
  const devIdLower = (devId || "").trim().toLowerCase();
  const actualLower = (actualName || "").trim().toLowerCase();
  const defaultLower = (defaultName || "").trim().toLowerCase();

  // 1. Direct equality matches
  if (input === devIdLower || input === actualLower || input === defaultLower) return true;

  // 2. Recognized standard defaults across all versions
  const recognizedDefaults = [
    "smartdesk",
    "smartdesk s3",
    "smartdesk controller",
    "smartdesk-s3",
    "anandsmartdesk",
    "desk_anand",
    "desk_anand_s3",
  ];
  if (recognizedDefaults.includes(input)) return true;

  // 3. Substring match: e.g. "smartdesk" in "smartDesk Controller" or "anand" in "desk_anand"
  if (actualLower && (actualLower.includes(input) || input.includes(actualLower))) return true;
  if (devIdLower && (devIdLower.includes(input) || input.includes(devIdLower))) return true;

  return false;
}

/**
 * Broadcast message strictly to all authenticated PWA clients linked to a specific deviceId
 */
function broadcastToDeviceClients(deviceId, payload) {
  const messageStr = JSON.stringify(payload);
  for (const [ws, meta] of connections.entries()) {
    if (meta.role === "client" && meta.authenticated && meta.deviceId === deviceId) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }
}

/* ── HTTP REST API ───────────────────────────────────────────────────────── */

// Render Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    activeDevices: Array.from(devices.values()).filter((d) => d.isOnline).length,
    activeClients: Array.from(connections.values()).filter((c) => c.role === "client" && c.authenticated).length,
    timestamp: new Date().toISOString(),
  });
});

// Device status polling endpoint (Used by ESP32 for lightweight power-saving checks)
app.get("/api/device/:deviceId/status", (req, res) => {
  const { deviceId } = req.params;
  const dev = getOrCreateDevice(deviceId);

  res.json({
    deviceId,
    isOnline: dev.isOnline,
    remoteModeEnabled: dev.remoteModeEnabled,
    lastSeen: dev.lastSeen,
    hasActiveWs: dev.ws !== null && dev.ws.readyState === WebSocket.OPEN,
  });
});

// Device verification endpoint for PWA handshake verification
app.post("/api/device/:deviceId/verify", (req, res) => {
  const { deviceId } = req.params;
  const { userId, password, deviceName } = req.body || {};

  const dev = devices.get(deviceId);
  if (!dev || !dev.isOnline || !dev.ws || dev.ws.readyState !== WebSocket.OPEN) {
    return res.status(404).json({
      ok: false,
      error: "Connection failed: Device is offline or target ID not found on cloud relay.",
      deviceOnline: false,
    });
  }

  // Check user ownership if configured on device
  if (dev.ownerUser && dev.ownerUser.length > 0 && userId && userId !== dev.ownerUser) {
    return res.status(401).json({
      ok: false,
      error: "Connection failed: Device name verification mismatch or password error.",
      deviceOnline: false,
    });
  }

  // Check password if configured on device
  if (dev.password && dev.password.length > 0) {
    if (!password || password !== dev.password) {
      return res.status(401).json({
        ok: false,
        error: "Connection failed: Device name verification mismatch or password error.",
        deviceOnline: false,
      });
    }
  }

  // Check device name if provided and known on device
  const actualDevName = dev.state?.deviceName || dev.name;
  if (deviceName && actualDevName && deviceName.trim().length > 0) {
    if (!isMatchingDeviceName(deviceName, deviceId, actualDevName, dev.name)) {
      return res.status(401).json({
        ok: false,
        error: "Connection failed: Device name verification mismatch or password error.",
        deviceOnline: false,
      });
    }
  }

  res.json({
    ok: true,
    deviceId,
    deviceOnline: true,
    deviceName: actualDevName || deviceName,
  });
});

// Toggle Remote Mode ("User Away" Mode) via REST
app.post("/api/device/:deviceId/remote-mode", (req, res) => {
  const { deviceId } = req.params;
  const { enabled, userId } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Missing boolean field 'enabled'" });
  }

  const dev = getOrCreateDevice(deviceId);
  dev.remoteModeEnabled = enabled;

  console.log(`[REMOTE MODE] Device ${deviceId} -> Remote Mode set to ${enabled} by user ${userId || "unknown"}`);

  // If remote mode was disabled while device is actively connected via WebSocket,
  // notify the ESP32 to drop persistent WebSocket to conserve power
  if (!enabled && dev.ws && dev.ws.readyState === WebSocket.OPEN) {
    dev.ws.send(JSON.stringify({ type: "remote_mode_disabled" }));
  }

  // Notify all connected PWA clients of the state change
  broadcastToDeviceClients(deviceId, {
    type: "remote_mode_changed",
    deviceId,
    enabled,
    timestamp: Date.now(),
  });

  res.json({
    ok: true,
    deviceId,
    remoteModeEnabled: dev.remoteModeEnabled,
  });
});

// HTTP Command Fallback (Allows sending relay/led commands via standard POST)
app.post("/api/device/:deviceId/command", (req, res) => {
  const { deviceId } = req.params;
  const dev = getOrCreateDevice(deviceId);

  if (!dev.isOnline || !dev.ws || dev.ws.readyState !== WebSocket.OPEN) {
    return res.status(503).json({
      error: "Device offline or remote WebSocket not active",
      remoteModeEnabled: dev.remoteModeEnabled,
    });
  }

  const { action, ...params } = req.body;
  const cmdPayload = {
    type: "command",
    action,
    ...params,
    source: "http_api",
    timestamp: Date.now(),
  };

  dev.ws.send(JSON.stringify(cmdPayload));
  res.json({ ok: true, sent: cmdPayload });
});

/* ── WEBSOCKET MULTI-TENANT SERVER ───────────────────────────────────────── */

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: "/ws",
  handleProtocols: (protocols) => {
    // Gracefully accept any negotiated subprotocols (e.g. arduino, or none for browser PWA)
    for (const p of protocols) return p;
    return false;
  },
});

wss.on("connection", (ws, req) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  connections.set(ws, { role: "unauthenticated", userId: null, deviceId: null, authenticated: false, ip });
  ws.isAlive = true;

  console.log(`[WS CONNECT] New connection from ${ip}`);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      return ws.send(JSON.stringify({ type: "error", message: "Malformed JSON payload" }));
    }

    const meta = connections.get(ws);

    // ── 1. Authentication Handshake ──
    if (msg.type === "auth") {
      const { role, deviceId, deviceKey, userId, password } = msg;

      if (!deviceId) {
        return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Missing deviceId" }));
      }

      // Role A: ESP32 Hardware Device
      if (role === "device") {
        const dev = getOrCreateDevice(deviceId);
        dev.ws = ws;
        dev.isOnline = true;
        dev.lastSeen = Date.now();
        if (typeof password === "string") dev.password = password;
        if (typeof userId === "string" && userId.length > 0) dev.ownerUser = userId;

        meta.role = "device";
        meta.deviceId = deviceId;
        meta.authenticated = true;

        console.log(`[DEVICE AUTH] ESP32 Device registered: "${deviceId}" (User: ${userId || "default"}, Password Protected: ${Boolean(dev.password && dev.password.length > 0)})`);

        // Compute IST (UTC + 5:30) time for ESP32 hardware clock sync
        const nowUtc = Date.now();
        const istDate = new Date(nowUtc + 5.5 * 3600 * 1000);
        const h = istDate.getUTCHours();
        const m = istDate.getUTCMinutes();
        const s = istDate.getUTCSeconds();
        const dow = istDate.getUTCDay();

        ws.send(
          JSON.stringify({
            type: "auth_res",
            ok: true,
            role: "device",
            deviceId,
            remoteModeEnabled: dev.remoteModeEnabled,
            cachedState: dev.state,
            h,
            m,
            s,
            dow,
            epoch: Math.floor(nowUtc / 1000),
          })
        );

        // Notify all watching PWA clients that device is ONLINE
        broadcastToDeviceClients(deviceId, {
          type: "device_status",
          deviceId,
          isOnline: true,
          timestamp: Date.now(),
        });
        return;
      }

      // Role B: Next.js PWA Client App
      if (role === "client") {
        if (!userId) {
          return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Missing userId" }));
        }

        const dev = getOrCreateDevice(deviceId);

        // Enforce user ownership if registered
        if (dev.ownerUser && dev.ownerUser.length > 0 && userId !== dev.ownerUser) {
          console.log(`[CLIENT AUTH REJECTED] User "${userId}" does not match device owner "${dev.ownerUser}"`);
          return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Connection failed: Device name verification mismatch or password error." }));
        }

        // Enforce device password if configured on ESP32
        if (dev.password && dev.password.length > 0) {
          if (!password || password !== dev.password) {
            console.log(`[CLIENT AUTH REJECTED] User "${userId}" failed password check for "${deviceId}"`);
            return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Connection failed: Device name verification mismatch or password error." }));
          }
        }

        // Enforce device name verification if provided
        const reqDevName = msg.deviceName || msg.name;
        const actualDevName = dev.state?.deviceName || dev.name;
        if (reqDevName && actualDevName && reqDevName.trim().length > 0) {
          if (!isMatchingDeviceName(reqDevName, deviceId, actualDevName, dev.name)) {
            console.log(`[CLIENT AUTH REJECTED] Device name mismatch for "${deviceId}": expected "${actualDevName}" but received "${reqDevName}"`);
            return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Connection failed: Device name verification mismatch or password error." }));
          }
        }

        meta.role = "client";
        meta.userId = userId;
        meta.deviceId = deviceId;
        meta.authenticated = true;

        console.log(`[CLIENT AUTH] PWA user "${userId}" connected to device "${deviceId}"`);

        ws.send(
          JSON.stringify({
            type: "auth_res",
            ok: true,
            role: "client",
            deviceId,
            userId,
            deviceOnline: dev.isOnline && dev.ws !== null,
            remoteModeEnabled: dev.remoteModeEnabled,
            currentState: dev.state,
          })
        );
        return;
      }

      return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Invalid role specified" }));
    }

    // Ensure connection is authenticated before processing commands
    if (!meta || !meta.authenticated) {
      return ws.send(JSON.stringify({ type: "error", code: "UNAUTHORIZED", message: "Please authenticate first" }));
    }

    // ── 2. Handle Messages from ESP32 Device ──
    if (meta.role === "device") {
      const dev = getOrCreateDevice(meta.deviceId);
      dev.lastSeen = Date.now();

      // Device State Telemetry Update
      if (msg.type === "state_update") {
        if (msg.relays) dev.state.relays = msg.relays;
        if (msg.configs) dev.state.configs = msg.configs;
        if (msg.led) dev.state.led = msg.led;
        if (msg.env) dev.state.env = msg.env;
        if (msg.presence) dev.state.presence = msg.presence;
        if (msg.deviceName) dev.state.deviceName = msg.deviceName;
        if (msg.stripLen !== undefined) dev.state.stripLen = msg.stripLen;
        if (msg.matrix) dev.state.matrix = msg.matrix;
        if (msg.schedules) dev.state.schedules = msg.schedules;

        // Broadcast directly to authorized clients watching this device
        broadcastToDeviceClients(meta.deviceId, {
          type: "state_update",
          deviceId: meta.deviceId,
          ...msg,
          timestamp: Date.now(),
        });
      }

      // Device Command Acknowledgement
      if (msg.type === "ack") {
        broadcastToDeviceClients(meta.deviceId, {
          type: "cmd_ack",
          deviceId: meta.deviceId,
          action: msg.action,
          success: msg.success,
        });
      }
      return;
    }

    // ── 3. Handle Messages from PWA Client (Forward to that User's ESP32) ──
    if (meta.role === "client") {
      const targetDev = getOrCreateDevice(meta.deviceId);

      // Toggle Remote Mode ("Away Mode")
      if (msg.type === "set_remote_mode") {
        const enabled = Boolean(msg.enabled);
        targetDev.remoteModeEnabled = enabled;

        console.log(`[REMOTE TOGGLE] Client ${meta.userId} set Remote Mode = ${enabled} for ${meta.deviceId}`);

        if (!enabled && targetDev.ws && targetDev.ws.readyState === WebSocket.OPEN) {
          targetDev.ws.send(JSON.stringify({ type: "remote_mode_disabled" }));
        }

        broadcastToDeviceClients(meta.deviceId, {
          type: "remote_mode_changed",
          deviceId: meta.deviceId,
          enabled,
          timestamp: Date.now(),
        });
        return;
      }

      // Device Control Commands (Relay, Countdown Timers, Configurations, LED, Rename, Strip Length, Matrix, All-Off, State Request, Credentials)
      if (
        msg.type === "relay_set" ||
        msg.type === "relay_timer" ||
        msg.type === "timer_set" ||
        msg.type === "relay_config" ||
        msg.type === "config_set" ||
        msg.type === "led_set" ||
        msg.type === "device_rename" ||
        msg.type === "rename" ||
        msg.type === "strip_length" ||
        msg.type === "strip" ||
        msg.type === "matrix_set" ||
        msg.type === "matrix" ||
        msg.type === "temp_offset" ||
        msg.type === "cal_offset" ||
        msg.type === "presence_set" ||
        msg.type === "presence_config" ||
        msg.type === "set_master_device" ||
        msg.type === "rgb_timer" ||
        msg.type === "set_rgb_timer" ||
        msg.type === "matrix_config" ||
        msg.type === "buzzer_set" ||
        msg.type === "set_buzzer" ||
        msg.type === "buzzer_beep" ||
        msg.type === "test_buzzer" ||
        msg.type === "schedule_set" ||
        msg.type === "set_schedule" ||
        msg.type === "schedule_delete" ||
        msg.type === "delete_schedule" ||
        msg.type === "schedule_test" ||
        msg.type === "test_schedule" ||
        msg.type === "time_sync" ||
        msg.type === "sync_time" ||
        msg.type === "music_frame" ||
        msg.type === "music_sync" ||
        msg.type === "all_off" ||
        msg.type === "request_state" ||
        msg.type === "get_state" ||
        msg.type === "ping"
      ) {
        if (!targetDev.isOnline || !targetDev.ws || targetDev.ws.readyState !== WebSocket.OPEN) {
          return ws.send(
            JSON.stringify({
              type: "error",
              code: "DEVICE_OFFLINE",
              message: "Your SmartDesk is currently offline or Remote Mode is disabled",
              remoteModeEnabled: targetDev.remoteModeEnabled,
            })
          );
        }

        // Forward strictly to that user's hardware device
        const forwardPayload = {
          type: "command",
          action: msg.type,
          ...msg,
          sourceUser: meta.userId,
          timestamp: Date.now(),
        };

        targetDev.ws.send(JSON.stringify(forwardPayload));

        // If client requested state, also immediately respond with server's cached state
        if ((msg.type === "request_state" || msg.type === "get_state") && targetDev.state) {
          ws.send(
            JSON.stringify({
              type: "state_update",
              deviceId: meta.deviceId,
              ...targetDev.state,
              timestamp: Date.now(),
            })
          );
        }
      }
    }
  });

  ws.on("close", () => {
    const meta = connections.get(ws);
    if (meta) {
      if (meta.role === "device") {
        const dev = devices.get(meta.deviceId);
        if (dev && dev.ws === ws) {
          dev.ws = null;
          dev.isOnline = false;
          console.log(`[DEVICE OFFLINE] ESP32 "${meta.deviceId}" disconnected`);
          broadcastToDeviceClients(meta.deviceId, {
            type: "device_status",
            deviceId: meta.deviceId,
            isOnline: false,
            timestamp: Date.now(),
          });
        }
      } else if (meta.role === "client") {
        console.log(`[CLIENT DISCONNECT] PWA user "${meta.userId}" disconnected`);
      }
      connections.delete(ws);
    }
  });

  ws.on("error", (err) => {
    console.error(`[WS ERROR] ${ip}: ${err.message}`);
  });
});

// Periodic Heartbeat to clean up dead connections (every 30 seconds)
const heartbeatInterval = setInterval(() => {
  for (const [ws, meta] of connections.entries()) {
    if (ws.isAlive === false) {
      console.log(`[TERMINATING DEAD SOCKET] ${meta.role} (${meta.deviceId || "anon"})`);
      ws.terminate();
      connections.delete(ws);
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`>>> SmartDesk V2 Cloud Relay Server listening on :${PORT}`);
  console.log(`>>> WebSocket Endpoint: ws://localhost:${PORT}/ws`);
  console.log(`>>> Health Check:       http://localhost:${PORT}/health`);
  console.log(`======================================================\n`);
});
