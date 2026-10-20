"use client";

/**
 ================================================================================
 SMARTDESK-V2 BLE GATT PROTOCOL SPECIFICATION
 Service UUID: 7f781e04-c0ee-47c9-a1e4-0aafa8ee316b
 Advertised Name: SmartDeskV2

 1. RELAY Characteristic: 385d4ec5-88c3-417e-8aa5-2a70db5d49fa
    Properties: READ, WRITE (with response), NOTIFY
    - Write Command (1 to 4 bytes):
      * Set Relay : [1, idx, val] (idx: 0..3, val: 0=OFF, 1=ON) -> cancels timer
      * Set Timer : [2, idx, minLo, minHi] (idx: 0..3, minutes: 0..1440, 0=cancel)
      * All Off   : [3] -> turns all 4 relays OFF and cancels all timers
    - Read / Notify Payload (12 bytes):
      * Bytes 0..3 : Load states for relays 0..3 (0=OFF, 1=ON)
      * Bytes 4..5 : Relay 0 remaining minutes (uint16 little-endian: lo, hi)
      * Bytes 6..7 : Relay 1 remaining minutes (uint16 little-endian: lo, hi)
      * Bytes 8..9 : Relay 2 remaining minutes (uint16 little-endian: lo, hi)
      * Bytes 10..11: Relay 3 remaining minutes (uint16 little-endian: lo, hi)

 2. LED Characteristic: 1814a0cb-9d1f-4212-946a-72e78b64042e
    Properties: READ, WRITE (with response), NOTIFY
    - Read / Write / Notify Payload (6 bytes):
      * Byte 0: Mode (0=Off, 1=Solid, 2=Breathe, 3=Rainbow, 4=Blink, 5=Chase)
      * Byte 1: Red (0..255)
      * Byte 2: Green (0..255)
      * Byte 3: Blue (0..255)
      * Byte 4: Brightness (0..100%, capped internally to LED_MAX_BRIGHT=80)
      * Byte 5: Speed (1..10)

 3. CONFIG Characteristic: 11848579-c357-45cb-bdb2-88f560c11708
    Properties: READ, WRITE (with response)
    - Write Payload (4 to 20 bytes):
      * Byte 0: Relay Index (0..3)
      * Byte 1: Polarity (0=Active-HIGH, 1=Active-LOW)
      * Byte 2: Wiring (0=NO, 1=NC)
      * Byte 3: Name Length L (0..16)
      * Bytes 4..3+L: Name string ASCII (max 16 chars)
    - Read Payload (80 bytes - 4 fixed 20-byte records for relays 0..3):
      * Each record i (offset i*20):
        - Byte 0: Index i (0..3)
        - Byte 1: Polarity (0=Active-HIGH, 1=Active-LOW)
        - Byte 2: Wiring (0=NO, 1=NC)
        - Byte 3: Name Length L (0..16)
        - Bytes 4..19: Name string (16 bytes, ASCII null-padded)

 4. INFO Characteristic: f1f28a13-9725-4636-a073-0666057bd91b
    Properties: READ
    - Read Payload: UTF-8 string: "BUILD <__DATE__> <__TIME__> TAG=V2-PROD | Uptime: <seconds>s"
 ================================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ── Minimal Web Bluetooth Type Declarations ─────────────────────────────── */
interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: (this: this, ev: Event) => void): void;
  removeEventListener(type: string, listener: (this: this, ev: Event) => void): void;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValueWithResponse(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: (this: this, ev: Event) => void): void;
  removeEventListener(type: string, listener: (this: this, ev: Event) => void): void;
}

interface BluetoothRequestDeviceFilter {
  name?: string;
  namePrefix?: string;
  services?: string[];
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: string[];
  acceptAllDevices?: boolean;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  };
}

/* ── UUID Constants ──────────────────────────────────────────────────────── */
const SERVICE_UUID = "7f781e04-c0ee-47c9-a1e4-0aafa8ee316b";
const CHAR_RELAY_UUID = "385d4ec5-88c3-417e-8aa5-2a70db5d49fa";
const CHAR_LED_UUID = "1814a0cb-9d1f-4212-946a-72e78b64042e";
const CHAR_CONFIG_UUID = "11848579-c357-45cb-bdb2-88f560c11708";
const CHAR_INFO_UUID = "f1f28a13-9725-4636-a073-0666057bd91b";

/* ── Data Interfaces ─────────────────────────────────────────────────────── */
interface RelayState {
  load: boolean;
  remainingMin: number;
}

interface RelayConfigItem {
  name: string;
  polarity: number; // 0=High, 1=Low
  wiring: number; // 0=NO, 1=NC
}

interface LedState {
  mode: number;
  r: number;
  g: number;
  b: number;
  bri: number;
  spd: number;
}

interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: "info" | "tx" | "rx" | "warn" | "err";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bytesToHex = (arr: Uint8Array | DataView): string => {
  const bytes = arr instanceof DataView
    ? new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    : arr;
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
};

export default function SmartDeskPage() {
  /* ── Component State ───────────────────────────────────────────────────── */
  const [bluetoothSupported, setBluetoothSupported] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>("");

  const [relays, setRelays] = useState<RelayState[]>([
    { load: false, remainingMin: 0 },
    { load: false, remainingMin: 0 },
    { load: false, remainingMin: 0 },
    { load: false, remainingMin: 0 },
  ]);

  const [configs, setConfigs] = useState<RelayConfigItem[]>([
    { name: "Relay 1", polarity: 1, wiring: 0 },
    { name: "Relay 2", polarity: 1, wiring: 0 },
    { name: "Relay 3", polarity: 1, wiring: 0 },
    { name: "Relay 4", polarity: 1, wiring: 0 },
  ]);

  const [led, setLed] = useState<LedState>({
    mode: 1,
    r: 0,
    g: 180,
    b: 255,
    bri: 50,
    spd: 5,
  });

  const [infoString, setInfoString] = useState<string>("Not connected");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  /* ── Hardware / BLE References ─────────────────────────────────────────── */
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const relayCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const ledCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const configCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const infoCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  // Serialized BLE write queue
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const ledDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logBoxRef = useRef<HTMLDivElement | null>(null);

  /* ── Logging Helper ────────────────────────────────────────────────────── */
  const addLog = useCallback(
    (text: string, type: "info" | "tx" | "rx" | "warn" | "err" = "info") => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-GB", { hour12: false }) + "." +
        String(now.getMilliseconds()).padStart(3, "0");
      const entry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        time: timeStr,
        text,
        type,
      };
      setLogs((prev) => [...prev.slice(-150), entry]);
      console.log(`[${timeStr}] [${type.toUpperCase()}] ${text}`);
    },
    []
  );

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  /* ── Check Web Bluetooth Support on Mount ──────────────────────────────── */
  useEffect(() => {
    const nav = typeof window !== "undefined" ? (window.navigator as NavigatorWithBluetooth) : null;
    if (!nav?.bluetooth) {
      setBluetoothSupported(false);
      addLog("Web Bluetooth API is NOT supported in this browser. Please use Chrome/Edge on HTTPS or localhost.", "err");
    } else {
      addLog("Web Bluetooth initialized. Ready for SmartDesk V2 connection.", "info");
    }
  }, [addLog]);

  /* ── Serialized Write Queue ────────────────────────────────────────────── */
  const enqueueWrite = useCallback(
    (label: string, task: () => Promise<void>) => {
      writeQueueRef.current = writeQueueRef.current
        .then(async () => {
          await task();
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          addLog(`[FAIL] ${label}: ${msg}`, "err");
          console.error(`[BLE Error on ${label}]:`, err);
          alert(`[SmartDesk BLE Write Error]\n\nOperation: ${label}\nDetails: ${msg}`);
        });
      return writeQueueRef.current;
    },
    [addLog]
  );

  /* ── Parse Relay Characteristic Payload (12 Bytes) ─────────────────────── */
  const parseRelayData = useCallback(
    (dataView: DataView) => {
      if (dataView.byteLength < 12) return;
      const newStates: RelayState[] = [];
      for (let i = 0; i < 4; i++) {
        const load = dataView.getUint8(i) === 1;
        const remLo = dataView.getUint8(4 + i * 2);
        const remHi = dataView.getUint8(5 + i * 2);
        const remainingMin = remLo | (remHi << 8);
        newStates.push({ load, remainingMin });
      }
      setRelays(newStates);
      addLog(`[RX RELAY] ${bytesToHex(dataView)} -> [${newStates.map((s, idx) => `CH${idx + 1}:${s.load ? "ON" : "OFF"}${s.remainingMin ? `(${s.remainingMin}m)` : ""}`).join(", ")}]`, "rx");
    },
    [addLog]
  );

  /* ── Parse LED Characteristic Payload (6 Bytes) ────────────────────────── */
  const parseLedData = useCallback(
    (dataView: DataView) => {
      if (dataView.byteLength < 6) return;
      const mode = dataView.getUint8(0);
      const r = dataView.getUint8(1);
      const g = dataView.getUint8(2);
      const b = dataView.getUint8(3);
      const bri = dataView.getUint8(4);
      const spd = dataView.getUint8(5);
      setLed({ mode, r, g, b, bri, spd });
      addLog(`[RX LED] ${bytesToHex(dataView)} -> Mode:${mode} RGB:(${r},${g},${b}) Bri:${bri}% Spd:${spd}`, "rx");
    },
    [addLog]
  );

  /* ── Parse Config Characteristic Payload (80 Bytes) ────────────────────── */
  const parseConfigData = useCallback(
    (dataView: DataView) => {
      if (dataView.byteLength < 80) return;
      const decoder = new TextDecoder();
      const newConfigs: RelayConfigItem[] = [];
      for (let i = 0; i < 4; i++) {
        const offset = i * 20;
        const pol = dataView.getUint8(offset + 1);
        const wir = dataView.getUint8(offset + 2);
        const nameLen = Math.min(16, dataView.getUint8(offset + 3));
        const nameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + offset + 4, nameLen);
        const name = decoder.decode(nameBytes).replace(/\0/g, "").trim() || `Relay ${i + 1}`;
        newConfigs.push({ name, polarity: pol, wiring: wir });
      }
      setConfigs(newConfigs);
      addLog(`[RX CONFIG] Loaded configurations for all 4 relays.`, "rx");
    },
    [addLog]
  );

  /* ── Disconnect Cleanup ────────────────────────────────────────────────── */
  const handleDisconnected = useCallback(() => {
    addLog("Device disconnected from host.", "warn");
    setConnected(false);
    setConnecting(false);
    setDeviceName("");
    relayCharRef.current = null;
    ledCharRef.current = null;
    configCharRef.current = null;
    infoCharRef.current = null;
    deviceRef.current = null;
  }, [addLog]);

  /* ── Connect Flow (One-by-One GATT Setup) ───────────────────────────────── */
  const handleConnect = async () => {
    const nav = window.navigator as NavigatorWithBluetooth;
    if (!nav.bluetooth) {
      alert("Web Bluetooth is not supported in this browser!");
      return;
    }

    try {
      setConnecting(true);
      addLog("Step 1: Requesting Bluetooth device with filter [{namePrefix: 'SmartDesk'}]...", "info");

      const dev = await nav.bluetooth.requestDevice({
        filters: [{ namePrefix: "SmartDesk" }],
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = dev;
      setDeviceName(dev.name || "SmartDeskV2");
      dev.addEventListener("gattserverdisconnected", handleDisconnected);
      addLog(`Step 2: Selected device '${dev.name}' (${dev.id}). Connecting to GATT server...`, "info");

      const gatt = await dev.gatt?.connect();
      if (!gatt) throw new Error("Could not acquire GATT server connection.");
      await sleep(150);
      addLog("Step 3: GATT server connected! Fetching primary service...", "info");

      const service = await gatt.getPrimaryService(SERVICE_UUID);
      await sleep(150);
      addLog(`Step 4: Primary Service acquired: ${SERVICE_UUID}`, "info");

      // Acquire characteristics ONE BY ONE
      addLog("Step 5a: Acquiring RELAY characteristic...", "info");
      const rChar = await service.getCharacteristic(CHAR_RELAY_UUID);
      relayCharRef.current = rChar;
      await sleep(150);

      addLog("Step 5b: Acquiring LED characteristic...", "info");
      const lChar = await service.getCharacteristic(CHAR_LED_UUID);
      ledCharRef.current = lChar;
      await sleep(150);

      addLog("Step 5c: Acquiring CONFIG characteristic...", "info");
      const cChar = await service.getCharacteristic(CHAR_CONFIG_UUID);
      configCharRef.current = cChar;
      await sleep(150);

      addLog("Step 5d: Acquiring INFO characteristic...", "info");
      const iChar = await service.getCharacteristic(CHAR_INFO_UUID);
      infoCharRef.current = iChar;
      await sleep(150);

      // Start notifications: RELAY first, then LED
      addLog("Step 6a: Starting notifications on RELAY characteristic...", "info");
      await rChar.startNotifications();
      rChar.addEventListener("characteristicvaluechanged", (e: Event) => {
        const target = e.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) parseRelayData(target.value);
      });
      await sleep(150);

      addLog("Step 6b: Starting notifications on LED characteristic...", "info");
      await lChar.startNotifications();
      lChar.addEventListener("characteristicvaluechanged", (e: Event) => {
        const target = e.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) parseLedData(target.value);
      });
      await sleep(150);

      // Read initial values
      addLog("Step 7a: Reading initial RELAY state...", "info");
      const rVal = await rChar.readValue();
      parseRelayData(rVal);
      await sleep(150);

      addLog("Step 7b: Reading initial LED state...", "info");
      const lVal = await lChar.readValue();
      parseLedData(lVal);
      await sleep(150);

      addLog("Step 7c: Reading CONFIG data...", "info");
      const cVal = await cChar.readValue();
      parseConfigData(cVal);
      await sleep(150);

      addLog("Step 7d: Reading INFO banner...", "info");
      const iVal = await iChar.readValue();
      const infoText = new TextDecoder().decode(iVal);
      setInfoString(infoText);
      addLog(`[RX INFO] ${infoText}`, "rx");

      setConnected(true);
      setConnecting(false);
      addLog(">>> CONNECTION FULLY ESTABLISHED & OPERATIONAL! <<<", "info");
    } catch (err: unknown) {
      setConnecting(false);
      setConnected(false);
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Connection sequence failed: ${msg}`, "err");
      console.error("BLE Connect Sequence Error:", err);
      alert(`[Connection Failed]\n\n${msg}\n\nTips:\n- Remove old 'SmartDesk' devices in Windows Bluetooth settings.\n- Make sure ESP32-S3 is powered and running SmartDeskV2.`);
    }
  };

  const handleDisconnect = () => {
    if (deviceRef.current && deviceRef.current.gatt?.connected) {
      addLog("Disconnecting Bluetooth connection...", "info");
      deviceRef.current.gatt.disconnect();
    }
    handleDisconnected();
  };

  /* ── Relay Commands ────────────────────────────────────────────────────── */
  const toggleRelay = (idx: number) => {
    if (!relayCharRef.current) return;
    const nextVal = relays[idx].load ? 0 : 1;
    const payload = new Uint8Array([1, idx, nextVal]);
    enqueueWrite(`Toggle Relay ${idx + 1} -> ${nextVal ? "ON" : "OFF"}`, async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (Set CH${idx + 1} -> ${nextVal ? "ON" : "OFF"})`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
  };

  const setTimer = (idx: number, minutes: number) => {
    if (!relayCharRef.current) return;
    const minLo = minutes & 0xff;
    const minHi = (minutes >> 8) & 0xff;
    const payload = new Uint8Array([2, idx, minLo, minHi]);
    enqueueWrite(`Set Timer Relay ${idx + 1} (${minutes}m)`, async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (Timer CH${idx + 1} -> ${minutes}m)`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
  };

  const handleAllOff = () => {
    if (!relayCharRef.current) return;
    const payload = new Uint8Array([3]);
    enqueueWrite("All Relays Off", async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (All Off)`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
  };

  /* ── Config Commands ───────────────────────────────────────────────────── */
  const saveRelayConfig = (idx: number, pol: number, wir: number, newName: string) => {
    if (!configCharRef.current) return;
    const enc = new TextEncoder();
    const nameBytes = enc.encode(newName.slice(0, 16));
    const payload = new Uint8Array(4 + nameBytes.length);
    payload[0] = idx;
    payload[1] = pol;
    payload[2] = wir;
    payload[3] = nameBytes.length;
    payload.set(nameBytes, 4);

    enqueueWrite(`Save Config Relay ${idx + 1}`, async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Config CH${idx + 1}: Pol=${pol}, Wir=${wir}, Name='${newName}')`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      // Update local config immediately
      setConfigs((prev) => {
        const copy = [...prev];
        copy[idx] = { name: newName, polarity: pol, wiring: wir };
        return copy;
      });
    });
  };

  /* ── LED Commands ──────────────────────────────────────────────────────── */
  const dispatchLedUpdate = useCallback(
    (newState: LedState) => {
      if (!ledCharRef.current) return;
      const payload = new Uint8Array([
        newState.mode,
        newState.r,
        newState.g,
        newState.b,
        newState.bri,
        newState.spd,
      ]);
      enqueueWrite("Update LED State", async () => {
        addLog(`[TX LED] ${bytesToHex(payload)} (Mode:${newState.mode} RGB:(${newState.r},${newState.g},${newState.b}) Bri:${newState.bri}% Spd:${newState.spd})`, "tx");
        await ledCharRef.current?.writeValueWithResponse(payload);
      });
    },
    [enqueueWrite, addLog]
  );

  const updateLedDebounced = (patch: Partial<LedState>) => {
    const next = { ...led, ...patch };
    setLed(next);
    if (ledDebounceTimerRef.current) clearTimeout(ledDebounceTimerRef.current);
    ledDebounceTimerRef.current = setTimeout(() => {
      dispatchLedUpdate(next);
    }, 80);
  };

  const applyLedPreset = (preset: { mode: number; r: number; g: number; b: number; bri: number; spd: number }) => {
    setLed(preset);
    dispatchLedUpdate(preset);
  };

  /* ── Hex Color Converter ───────────────────────────────────────────────── */
  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  };

  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  /* ── 8-Dot Interactive LED Visualizer ──────────────────────────────────── */
  const render8DotPreview = () => {
    const dots = [];
    for (let i = 0; i < 8; i++) {
      let bg = "bg-zinc-800";
      let shadow = "none";

      if (led.mode === 0 || led.bri === 0) {
        bg = "#18181b";
      } else if (led.mode === 3) {
        // Rainbow preview
        const hue = (i * 360) / 8;
        bg = `hsl(${hue}, 100%, ${Math.max(20, Math.min(60, led.bri * 0.6))}%)`;
        shadow = `0 0 10px ${bg}`;
      } else {
        const alpha = Math.max(0.15, led.bri / 100);
        bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
        shadow = `0 0 12px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.8})`;
      }

      dots.push(
        <div
          key={i}
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-zinc-600 transition-all duration-200"
          style={{ backgroundColor: bg, boxShadow: shadow }}
        />
      );
    }
    return dots;
  };

  /* ── Render Main App UI ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-3 sm:p-6 lg:p-8 flex flex-col items-center select-none">
      <div className="w-full max-w-5xl flex flex-col gap-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-cyan-400">SmartDesk</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  V2
                </span>
              </h1>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                  connected
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-400"
                    : connecting
                    ? "bg-amber-950/80 border-amber-500 text-amber-400 animate-pulse"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connected
                      ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                      : connecting
                      ? "bg-amber-400"
                      : "bg-zinc-500"
                  }`}
                />
                {connected ? `Connected: ${deviceName}` : connecting ? "Connecting..." : "Disconnected"}
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              ESP32-S3 Single-File Controller • NimBLE 2.x • Web Bluetooth
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!connected ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting || !bluetoothSupported}
                className="flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
              >
                {connecting ? "Connecting..." : "⚡ Connect SmartDesk"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-bold text-sm border border-zinc-700 transition-all cursor-pointer"
              >
                Disconnect
              </button>
            )}

            <button
              type="button"
              onClick={handleAllOff}
              disabled={!connected}
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              🛑 All OFF
            </button>
          </div>
        </header>

        {/* ── BROWSER SUPPORT ALERT ──────────────────────────────────────── */}
        {!bluetoothSupported && (
          <div className="bg-red-950/70 border border-red-700 text-red-200 p-4 rounded-xl text-sm flex flex-col gap-1">
            <span className="font-bold">⚠️ Web Bluetooth Not Available</span>
            <span>
              Your browser does not expose <code>navigator.bluetooth</code>. Please open this page in Google Chrome or
              Microsoft Edge over <code>http://localhost:3000</code> or HTTPS.
            </span>
          </div>
        )}

        {/* ── 4 RELAY CARDS ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-mono font-bold tracking-wider text-zinc-400 uppercase">
              1. Opto-Isolated Relays (CH1..CH4)
            </h2>
            <span className="text-xs text-zinc-500 font-mono">250ms Rate-Limited</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relays.map((r, idx) => (
              <RelayCard
                key={idx}
                index={idx}
                state={r}
                config={configs[idx]}
                disabled={!connected}
                onToggle={() => toggleRelay(idx)}
                onSetTimer={(min) => setTimer(idx, min)}
                onSaveConfig={(pol, wir, name) => saveRelayConfig(idx, pol, wir, name)}
              />
            ))}
          </div>
        </section>

        {/* ── LED CONTROLLER PANEL ───────────────────────────────────────── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🌈 WS2812B LED Array</span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                  GPIO 8 • 8x RGB
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cap: 80/255 • Blink Rate Safe (&le; 3 flashes/s) • ~40 FPS Render
              </p>
            </div>
            <div className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              Mode {led.mode}
            </div>
          </div>

          {/* 8-Dot Visualizer */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-around items-center overflow-x-auto gap-2">
            {render8DotPreview()}
          </div>

          {/* Modes and Presets */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Effect Mode</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { m: 0, label: "Off" },
                  { m: 1, label: "Solid" },
                  { m: 2, label: "Breathe" },
                  { m: 3, label: "Rainbow" },
                  { m: 4, label: "Blink" },
                  { m: 5, label: "Chase" },
                ].map((modeItem) => (
                  <button
                    key={modeItem.m}
                    type="button"
                    disabled={!connected}
                    onClick={() => updateLedDebounced({ mode: modeItem.m })}
                    className={`min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                      led.mode === modeItem.m
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/50 border border-cyan-400"
                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60"
                    } disabled:opacity-40`}
                  >
                    {modeItem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "💡 Study", p: { mode: 1, r: 255, g: 255, b: 255, bri: 80, spd: 5 } },
                  { name: "🌅 Relax", p: { mode: 2, r: 255, g: 140, b: 20, bri: 50, spd: 3 } },
                  { name: "🌙 Night", p: { mode: 1, r: 200, g: 15, b: 0, bri: 20, spd: 2 } },
                  { name: "🎉 Party", p: { mode: 3, r: 0, g: 255, b: 200, bri: 80, spd: 8 } },
                  { name: "🔌 Off", p: { mode: 0, r: 0, g: 0, b: 0, bri: 0, spd: 5 } },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={!connected}
                    onClick={() => applyLedPreset(preset.p)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/60 transition-all cursor-pointer disabled:opacity-40 active:scale-95"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders and Color Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Color Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-zinc-400 font-bold uppercase">Color (RGB)</label>
                <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <input
                    type="color"
                    disabled={!connected}
                    value={rgbToHex(led.r, led.g, led.b)}
                    onChange={(e) => {
                      const { r, g, b } = hexToRgb(e.target.value);
                      updateLedDebounced({ r, g, b });
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div className="font-mono text-xs text-zinc-300">
                    rgb({led.r}, {led.g}, {led.b})
                  </div>
                </div>
              </div>

              {/* Brightness Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-zinc-400 font-bold uppercase">Brightness</label>
                  <span className="font-mono text-xs text-cyan-400">{led.bri}%</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center min-h-[52px]">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={!connected}
                    value={led.bri}
                    onChange={(e) => updateLedDebounced({ bri: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Speed Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-zinc-400 font-bold uppercase">Animation Speed</label>
                  <span className="font-mono text-xs text-cyan-400">{led.spd} / 10</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center min-h-[52px]">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    disabled={!connected}
                    value={led.spd}
                    onChange={(e) => updateLedDebounced({ spd: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DEVICE TELEMETRY / INFO ────────────────────────────────────── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
              Device Info &amp; Telemetry
            </h2>
            <button
              type="button"
              disabled={!connected}
              onClick={async () => {
                if (!infoCharRef.current) return;
                try {
                  const val = await infoCharRef.current.readValue();
                  const txt = new TextDecoder().decode(val);
                  setInfoString(txt);
                  addLog(`[RX INFO] ${txt}`, "rx");
                } catch (err: unknown) {
                  addLog(`Failed to refresh INFO: ${err}`, "err");
                }
              }}
              className="text-xs font-mono px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer disabled:opacity-40"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-xs text-cyan-300 break-all">
            {infoString}
          </div>
        </section>

        {/* ── LIVE BLE LOG CONSOLE ────────────────────────────────────────── */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
                GATT Event Console (TX / RX Hex Trace)
              </h2>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                {logs.length} entries
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const allText = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join("\n");
                  navigator.clipboard.writeText(allText);
                  alert("Console logs copied to clipboard!");
                }}
                className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
              >
                📋 Copy
              </button>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div
            ref={logBoxRef}
            className="h-56 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs overflow-y-auto flex flex-col gap-1"
          >
            {logs.length === 0 ? (
              <div className="text-zinc-600 italic">No events yet. Connect to SmartDesk V2 to begin streaming.</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="leading-relaxed break-all">
                  <span className="text-zinc-500 mr-2">[{l.time}]</span>
                  <span
                    className={`font-semibold mr-1.5 ${
                      l.type === "tx"
                        ? "text-cyan-400"
                        : l.type === "rx"
                        ? "text-emerald-400"
                        : l.type === "err"
                        ? "text-rose-400"
                        : l.type === "warn"
                        ? "text-amber-400"
                        : "text-zinc-400"
                    }`}
                  >
                    [{l.type.toUpperCase()}]
                  </span>
                  <span
                    className={
                      l.type === "err"
                        ? "text-rose-300 font-bold"
                        : l.type === "tx"
                        ? "text-cyan-200"
                        : l.type === "rx"
                        ? "text-emerald-200"
                        : "text-zinc-300"
                    }
                  >
                    {l.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Individual Relay Card Component ─────────────────────────────────────── */
interface RelayCardProps {
  index: number;
  state: RelayState;
  config: RelayConfigItem;
  disabled: boolean;
  onToggle: () => void;
  onSetTimer: (minutes: number) => void;
  onSaveConfig: (polarity: number, wiring: number, name: string) => void;
}

function RelayCard({
  index,
  state,
  config,
  disabled,
  onToggle,
  onSetTimer,
  onSaveConfig,
}: RelayCardProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [nameInput, setNameInput] = useState(config.name);
  const [polInput, setPolInput] = useState(config.polarity);
  const [wirInput, setWirInput] = useState(config.wiring);

  useEffect(() => {
    setNameInput(config.name);
    setPolInput(config.polarity);
    setWirInput(config.wiring);
  }, [config]);

  const gpioPin = 4 + index;

  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 ${
        state.load
          ? "border-cyan-500/80 shadow-[0_0_24px_rgba(6,182,212,0.15)] bg-gradient-to-b from-cyan-950/20 to-zinc-900"
          : "border-zinc-800"
      }`}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white">{config.name}</h3>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              GPIO {gpioPin}
            </span>
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            Wiring: {config.wiring === 0 ? "NO" : "NC"} • Polarity:{" "}
            {config.polarity === 1 ? "Active-LOW" : "Active-HIGH"}
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-xs font-mono font-black border transition-all ${
            state.load
              ? "bg-cyan-500 text-zinc-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
              : "bg-zinc-800 text-zinc-400 border-zinc-700"
          }`}
        >
          {state.load ? "POWERED" : "OFF"}
        </div>
      </div>

      {/* Main Toggle Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`w-full min-h-[48px] rounded-xl font-bold text-sm tracking-wide transition-all active:scale-98 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg ${
          state.load
            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40"
            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
        }`}
      >
        <span>{state.load ? "Turn Load OFF" : "Turn Load ON"}</span>
      </button>

      {/* Countdown Timer Status & Presets */}
      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono text-zinc-400 font-semibold">Countdown Timer:</span>
          {state.remainingMin > 0 ? (
            <span className="font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded">
              ⏳ {state.remainingMin}m remaining
            </span>
          ) : (
            <span className="font-mono text-zinc-500">None active</span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              disabled={disabled}
              onClick={() => onSetTimer(mins)}
              className="min-h-[44px] py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-mono font-semibold text-zinc-300 border border-zinc-700/80 transition-all cursor-pointer disabled:opacity-40"
            >
              +{mins}m
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || state.remainingMin === 0}
            onClick={() => onSetTimer(0)}
            className="min-h-[44px] py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 active:scale-95 text-xs font-mono font-semibold text-rose-300 border border-zinc-700/80 transition-all cursor-pointer disabled:opacity-30"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Config Toggle & Editor */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center justify-between py-1 cursor-pointer"
        >
          <span>⚙️ Hardware Config (NVS)</span>
          <span>{showConfig ? "▲ Hide" : "▼ Edit"}</span>
        </button>

        {showConfig && (
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col gap-3 mt-1">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Relay Name (max 16 chars)</label>
              <input
                type="text"
                maxLength={16}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Polarity</label>
                <select
                  value={polInput}
                  onChange={(e) => setPolInput(parseInt(e.target.value, 10))}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>Active-LOW (0V=ON)</option>
                  <option value={0}>Active-HIGH (3.3V=ON)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Wiring Contact</label>
                <select
                  value={wirInput}
                  onChange={(e) => setWirInput(parseInt(e.target.value, 10))}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={0}>NO (Normally Open)</option>
                  <option value={1}>NC (Normally Closed)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onSaveConfig(polInput, wirInput, nameInput);
                setShowConfig(false);
              }}
              className="min-h-[44px] rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-mono font-bold tracking-wide transition-all cursor-pointer disabled:opacity-40"
            >
              💾 Save to ESP32 NVS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
