/**
 * server.js — SmartDesk V2 Multi-User IoT Cloud Relay & WebSocket Server
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

const devices = new Map();
const connections = new Map();

function getOrCreateDevice(deviceId) {
  if (!devices.has(deviceId)) {
    devices.set(deviceId, {
      ws: null,
      deviceKey: DEFAULT_AUTH_KEY,
      isOnline: false,
      remoteModeEnabled: false,
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

app.get("/health", (req, res) => {
  res.json({ status: "ok", activeDevices: Array.from(devices.values()).filter((d) => d.isOnline).length });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  connections.set(ws, { role: "unauthenticated", userId: null, deviceId: null, authenticated: false, ip });
  ws.isAlive = true;

  console.log(`\n[+] New socket connection from ${ip}`);

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      return ws.send(JSON.stringify({ type: "error", message: "Malformed JSON payload" }));
    }

    const meta = connections.get(ws);

    // --- X-RAY LOGGING (Ignore spammy state updates) ---
    if (msg.type !== "state_update") {
        console.log(`\n[RX] From Role: '${meta.role}' | Type: '${msg.type}'`);
        console.log(`[PAYLOAD]`, msg);
    }
    // ---------------------------------------------------

    if (msg.type === "auth") {
      const { role, deviceId, deviceKey, userId } = msg;

      if (!deviceId) return ws.send(JSON.stringify({ type: "auth_res", ok: false, error: "Missing deviceId" }));

      if (role === "device") {
        const dev = getOrCreateDevice(deviceId);
        dev.ws = ws;
        dev.isOnline = true;
        dev.lastSeen = Date.now();
        meta.role = "device";
        meta.deviceId = deviceId;
        meta.authenticated = true;

        console.log(`[AUTH OK] ESP32 Hardware linked to deviceId: "${deviceId}"`);
        ws.send(JSON.stringify({ type: "auth_res", ok: true, role: "device", deviceId, cachedState: dev.state }));
        return;
      }

      if (role === "client") {
        const dev = getOrCreateDevice(deviceId);
        meta.role = "client";
        meta.userId = userId;
        meta.deviceId = deviceId;
        meta.authenticated = true;

        console.log(`[AUTH OK] PWA App (User: ${userId}) linked to deviceId: "${deviceId}"`);
        ws.send(JSON.stringify({ type: "auth_res", ok: true, role: "client", deviceId, deviceOnline: (dev.isOnline && dev.ws !== null) }));
        return;
      }
    }

    if (!meta || !meta.authenticated) return;

    if (meta.role === "client") {
      const targetDev = getOrCreateDevice(meta.deviceId);

      if (msg.type === "relay_set" || msg.type === "led_set" || msg.type === "all_off" || msg.type === "timer_set") {
        console.log(`>>> [ROUTING] Attempting to send '${msg.type}' to ESP32 '${meta.deviceId}'...`);
        
        if (!targetDev.isOnline || !targetDev.ws || targetDev.ws.readyState !== WebSocket.OPEN) {
          console.log(`>>> [ROUTING FAILED] ESP32 '${meta.deviceId}' is offline! Dropping command.`);
          return ws.send(JSON.stringify({ type: "error", code: "DEVICE_OFFLINE", message: "ESP32 Offline" }));
        }

        const forwardPayload = { type: "command", action: msg.type, ...msg, sourceUser: meta.userId, timestamp: Date.now() };
        
        console.log(`>>> [ROUTING SUCCESS] Forwarded to ESP32:`, forwardPayload);
        targetDev.ws.send(JSON.stringify(forwardPayload));
      }
    }
  });

  ws.on("close", () => {
    const meta = connections.get(ws);
    if (meta && meta.role === "device") {
      const dev = devices.get(meta.deviceId);
      if (dev && dev.ws === ws) {
        dev.ws = null;
        dev.isOnline = false;
        console.log(`[DISCONNECT] ESP32 Hardware "${meta.deviceId}" went offline.`);
      }
    }
    connections.delete(ws);
  });
});

const heartbeatInterval = setInterval(() => {
  for (const [ws, meta] of connections.entries()) {
    if (ws.isAlive === false) { ws.terminate(); connections.delete(ws); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`\n>>> SmartDesk V2 Router Online on Port ${PORT} <<<`);
});