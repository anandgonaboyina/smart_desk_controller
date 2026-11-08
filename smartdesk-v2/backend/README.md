# SmartDesk V2 Cloud Relay Backend

Secure, multi-user WebSocket & REST cloud relay backend for SmartDesk V2 (ESP32-S3 + Next.js PWA).

---

## Features
- **Multi-Tenant Routing (Zero Cross-Talk)**: Enforces pairing between authorized users and their specific ESP32 devices using `deviceId` and credentials.
- **Conditional "User Away / Remote Mode" Connection**: Conserves ESP32 power by keeping WebSocket idle until remote mode is enabled.
- **Bi-Directional Telemetry**: Relays real-time appliance states, climate sensor data, and radar presence to the PWA anywhere in the world.
- **Render Ready**: Automatic port binding via `process.env.PORT` with `/health` uptime monitoring.

---

## 1-Click Deploy to Render

1. Create a new **Web Service** on [Render.com](https://render.com).
2. Connect your Git repository.
3. Configure the following settings:
   - **Root Directory**: `smartdesk-v2/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free` (or Starter)
4. Add Environment Variables:
   - `DEVICE_SECRET_KEY`: `your_secure_random_key_here`
   - `NODE_ENV`: `production`

---

## API Endpoints

### 1. Health Check
- `GET /health`
- Returns server uptime, connected devices, and active client count.

### 2. Device Status (Lightweight ESP32 Polling)
- `GET /api/device/:deviceId/status`
- Used by the ESP32 to check whether Remote Mode is enabled before opening a persistent WebSocket.

### 3. Toggle Remote Mode
- `POST /api/device/:deviceId/remote-mode`
- Payload: `{"enabled": true, "userId": "user-123"}`

### 4. WebSocket Server
- URL: `wss://<your-render-app>.onrender.com/ws`
- Handshake (Device):
  ```json
  { "type": "auth", "role": "device", "deviceId": "desk-anand-01", "deviceKey": "..." }
  ```
- Handshake (PWA Client):
  ```json
  { "type": "auth", "role": "client", "userId": "user-anand", "deviceId": "desk-anand-01" }
  ```
