/**
 * useSmartDeskBle.ts — Complete Web Bluetooth LE hook for SmartDesk controller.
 *
 * Purpose : Handles GATT communication, characteristic subscriptions, auto-connect,
 *           music sync audio processing, scheduling, presence, and telemetry.
 * Depends : types/smartdesk.ts
 * Used by : app/page.tsx
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SERVICE_UUID,
  CHAR_RELAY_UUID,
  CHAR_LED_UUID,
  CHAR_CONFIG_UUID,
  CHAR_INFO_UUID,
  CHAR_ENV_UUID,
  RelayState,
  RelayConfigItem,
  LedState,
  ScheduleRule,
  PresenceConfig,
  PresenceData,
  StoredClient,
  EspClock,
  EnvData,
  UiAnimState,
  LogEntry,
  MatrixConfig,
  LED_MODES,
  RELAY_ANIM_OPTIONS,
  DAYS_OF_WEEK,
} from "../types/smartdesk";

/* Web Bluetooth Types */
interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: (this: this, ev: any) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (this: this, ev: any) => void, options?: boolean | EventListenerOptions): void;
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
  addEventListener(type: string, listener: (this: this, ev: any) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (this: this, ev: any) => void, options?: boolean | EventListenerOptions): void;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice(options?: any): Promise<BluetoothDevice>;
    getDevices?(): Promise<BluetoothDevice[]>;
  };
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

interface UseSmartDeskBleOptions {
  onAlert?: (title: string, message: string) => void;
  onToast?: (message: string, type?: "info" | "success" | "warn" | "error") => void;
}

export function useSmartDeskBle(options?: UseSmartDeskBleOptions) {
  const onAlertRef = useRef(options?.onAlert);
  onAlertRef.current = options?.onAlert;
  const onToastRef = useRef(options?.onToast);
  onToastRef.current = options?.onToast;

  const [bluetoothSupported, setBluetoothSupported] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>("smartDesk Controller");
  const [persistedDeviceName, setPersistedDeviceName] = useState<string>("smartDesk Controller");
  const [showAllDevices, setShowAllDevices] = useState<boolean>(false);
  const [lastDeviceDetected, setLastDeviceDetected] = useState<BluetoothDevice | null>(null);

  const showAllDevicesRef = useRef(showAllDevices);
  showAllDevicesRef.current = showAllDevices;
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;

  const [relays, setRelays] = useState<RelayState[]>([
    { load: false, remainingMin: 0 },
    { load: false, remainingMin: 0 },
    { load: false, remainingMin: 0 },
    { load: false, remainingMin: 0 },
  ]);

  const [configs, setConfigs] = useState<RelayConfigItem[]>([
    { name: "Relay 1", wiring: 0, onAnimEnabled: true, onAnimMode: 1, onAnimDuration: 2, offAnimEnabled: true, offAnimMode: 3, offAnimDuration: 2, beepOn: true, beepOff: true, beepTimerEnd: true },
    { name: "Relay 2", wiring: 0, onAnimEnabled: true, onAnimMode: 1, onAnimDuration: 2, offAnimEnabled: true, offAnimMode: 3, offAnimDuration: 2, beepOn: true, beepOff: true, beepTimerEnd: true },
    { name: "Relay 3", wiring: 0, onAnimEnabled: true, onAnimMode: 1, onAnimDuration: 2, offAnimEnabled: true, offAnimMode: 3, offAnimDuration: 2, beepOn: true, beepOff: true, beepTimerEnd: true },
    { name: "Relay 4", wiring: 0, onAnimEnabled: true, onAnimMode: 1, onAnimDuration: 2, offAnimEnabled: true, offAnimMode: 3, offAnimDuration: 2, beepOn: true, beepOff: true, beepTimerEnd: true },
  ]);

  const configsRef = useRef<RelayConfigItem[]>(configs);
  configsRef.current = configs;

  const [led, setLed] = useState<LedState>({
    mode: 1,
    r: 0,
    g: 180,
    b: 255,
    bri: 50,
    spd: 5,
  });

  const [rgbTimerRemainingMin, setRgbTimerRemainingMin] = useState<number>(0);
  const rgbTimerEndMsRef = useRef<number>(0);

  const [musicSyncActive, setMusicSyncActive] = useState<boolean>(false);
  const [musicBri, setMusicBri] = useState<number>(85);
  const [musicSensitivity, setMusicSensitivity] = useState<number>(1.2);
  const [musicSubMode, setMusicSubMode] = useState<number>(0);
  const [soloColor, setSoloColor] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 240, b: 255 });
  const [micVolume, setMicVolume] = useState<number>(0);
  const [beatPulse, setBeatPulse] = useState<boolean>(false);

  const [envData, setEnvData] = useState<EnvData>({ valid: false, tempC: 0, humidity: 0 });
  const [masterBuzzer, setMasterBuzzer] = useState<boolean>(true);

  const [espClock, setEspClock] = useState<EspClock>({
    synced: false,
    hour: 0,
    minute: 0,
    second: 0,
    dayOfWeek: 0,
  });

  const [schedules, setSchedules] = useState<ScheduleRule[]>([
    {
      id: 0,
      enabled: false,
      name: "Morning Desk Power",
      daysMask: 62,
      startHour: 9,
      startMin: 0,
      stopType: 1,
      durationMin: 480,
      stopHour: 17,
      stopMin: 0,
      targetType: 4,
      targetAction: 1,
      rgbR: 0,
      rgbG: 180,
      rgbB: 255,
      rgbBri: 50,
    },
    {
      id: 1,
      enabled: false,
      name: "Evening Ambient Strip",
      daysMask: 127,
      startHour: 18,
      startMin: 30,
      stopType: 2,
      durationMin: 0,
      stopHour: 23,
      stopMin: 0,
      targetType: 5,
      targetAction: 15,
      rgbR: 255,
      rgbG: 120,
      rgbB: 20,
      rgbBri: 70,
    },
  ]);

  const [presenceData, setPresenceData] = useState<PresenceData>({
    enabled: true,
    state: 0,
    remainingMin: 0,
  });

  const [presenceConfig, setPresenceConfig] = useState<PresenceConfig>({
    enabled: false,
    awayDelayMin: 5,
    awayRelayMask: 0x0f,
    awayRgbOff: true,
    arrivalRelayMask: 0x0f,
    arrivalRgbOn: true,
    arrivalRgbMode: 1,
  });

  const [clientNickname, setClientNickname] = useState<string>("");
  const [designatedPresenceDevice, setDesignatedPresenceDevice] = useState<string>("");
  const [storedClients, setStoredClients] = useState<StoredClient[]>([]);
  const [customDelayInput, setCustomDelayInput] = useState<string>("5");
  const [stripLength, setStripLength] = useState<number>(8);
  const [matrixConfig, setMatrixConfig] = useState<MatrixConfig>({
    rows: 8,
    cols: 32,
    wiringType: 1, // 1 = Zig-Zag (Serpentine)
    pin: 11,
    enabled: true,
    mode: 17,
    speed: 5,
    bri: 70,
    colorR: 0,
    colorG: 240,
    colorB: 255,
    text: "SMARTDESK V2",
  });
  const [uiAnim, setUiAnim] = useState<UiAnimState | null>(null);
  const [infoString, setInfoString] = useState<string>("Not connected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewTick, setPreviewTick] = useState<number>(0);

  /* Audio Refs */
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastBleMusicWriteMsRef = useRef<number>(0);
  const lastVolUpdateRef = useRef<number>(0);
  const liveMusicLevelsRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const liveBeatValRef = useRef<number>(0);
  const bassAvgRef = useRef<number>(45);
  const savedLedBeforeMusicRef = useRef<LedState | null>(null);
  const stopMusicSyncRef = useRef<() => void>(() => {});

  const musicBriRef = useRef<number>(musicBri);
  musicBriRef.current = musicBri;
  const musicSensitivityRef = useRef<number>(musicSensitivity);
  musicSensitivityRef.current = musicSensitivity;
  const musicSubModeRef = useRef<number>(musicSubMode);
  musicSubModeRef.current = musicSubMode;
  const soloColorRef = useRef<{ r: number; g: number; b: number }>(soloColor);
  soloColorRef.current = soloColor;
  const matrixConfigRef = useRef<MatrixConfig>(matrixConfig);
  matrixConfigRef.current = matrixConfig;
  const connectedRef = useRef<boolean>(connected);
  connectedRef.current = connected;

  /* Hardware / BLE Refs */
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const relayCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const ledCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const configCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const infoCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const envCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const ledDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<(targetDevice?: BluetoothDevice, isAuto?: boolean) => Promise<void>>(null as any);
  const connectTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* Animation Tick for WS2812B 8-Dot Simulation */
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewTick((prev) => (prev + 1) % 720);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  /* Transient UI Animation Expiration */
  useEffect(() => {
    if (!uiAnim) return;
    const now = Date.now();
    const elapsed = now - uiAnim.startMs;
    const remaining = Math.max(0, uiAnim.durationMs - elapsed);

    const timeout = setTimeout(() => {
      setUiAnim(null);
    }, remaining);

    return () => clearTimeout(timeout);
  }, [uiAnim]);

  /* Watchdog to prevent getting stuck in connecting state */
  useEffect(() => {
    if (connecting) {
      if (connectTimeoutTimerRef.current) clearTimeout(connectTimeoutTimerRef.current);
      connectTimeoutTimerRef.current = setTimeout(() => {
        setConnecting(false);
        console.warn("[BLE Watchdog]: Reset stuck connecting flag after 10s timeout.");
      }, 10000);
    } else {
      if (connectTimeoutTimerRef.current) {
        clearTimeout(connectTimeoutTimerRef.current);
        connectTimeoutTimerRef.current = null;
      }
    }
    return () => {
      if (connectTimeoutTimerRef.current) clearTimeout(connectTimeoutTimerRef.current);
    };
  }, [connecting]);

  /* Automatic 24-Hour Log Purge Timer */
  useEffect(() => {
    const purgeInterval = setInterval(() => {
      const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
      setLogs((prev) => prev.filter((entry) => !entry.timestamp || entry.timestamp >= cutoff24h));
    }, 60 * 60 * 1000); // Check once per hour
    return () => clearInterval(purgeInterval);
  }, []);

  /* Logging Helper (Strictly in-memory, capped at last 150 items, max 24hr retention) */
  const addLog = useCallback(
    (text: string, type: "info" | "tx" | "rx" | "warn" | "err" = "info") => {
      const now = new Date();
      const nowMs = now.getTime();
      const cutoff24h = nowMs - 24 * 60 * 60 * 1000;
      const timeStr = now.toLocaleTimeString("en-GB", { hour12: false }) + "." +
        String(now.getMilliseconds()).padStart(3, "0");
      const entry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        time: timeStr,
        text,
        type,
        timestamp: nowMs,
      };
      setLogs((prev) => {
        // Enforce 24-hour retention window + last 150 entries ring buffer
        const nonExpired = prev.filter((item) => !item.timestamp || item.timestamp >= cutoff24h);
        return [...nonExpired.slice(-150), entry];
      });
      console.log(`[${timeStr}] [${type.toUpperCase()}] ${text}`);
    },
    []
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  /* Serialized BLE Write Queue */
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
          onAlertRef.current?.("SmartDesk BLE Write Error", `Operation: ${label}\nDetails: ${msg}`);
        });
      return writeQueueRef.current;
    },
    [addLog]
  );

  /* UI Transient Animation on Relay Switch */
  const triggerUiAnimation = useCallback((idx: number, isTurnOn: boolean) => {
    const cfg = configsRef.current[idx];
    if (!cfg) return;
    const enabled = isTurnOn ? cfg.onAnimEnabled : cfg.offAnimEnabled;
    if (!enabled) return;

    const mode = isTurnOn ? cfg.onAnimMode : cfg.offAnimMode;
    const duration = isTurnOn ? cfg.onAnimDuration : cfg.offAnimDuration;
    const animName = RELAY_ANIM_OPTIONS.find((a) => a.id === mode)?.label || `Anim ${mode}`;

    setUiAnim({
      active: true,
      isTurnOn,
      mode,
      durationMs: duration * 1000,
      startMs: Date.now(),
      label: `CH${idx + 1} ${isTurnOn ? "ON" : "OFF"}: ${animName}`,
    });
  }, []);

  /* Parse Relay Payload (12 Bytes) */
  const parseRelayData = useCallback(
    (dataView: DataView) => {
      if (dataView.byteLength < 12) return;
      setRelays((prev) => {
        const newStates: RelayState[] = [];
        for (let i = 0; i < 4; i++) {
          const load = dataView.getUint8(i) === 1;
          const remLo = dataView.getUint8(4 + i * 2);
          const remHi = dataView.getUint8(5 + i * 2);
          const remainingMin = remLo | (remHi << 8);
          newStates.push({ load, remainingMin });

          if (prev[i] && prev[i].load !== load) {
            triggerUiAnimation(i, load);
          }
        }
        return newStates;
      });
      addLog(`[RX RELAY] ${bytesToHex(dataView)}`, "rx");
    },
    [addLog, triggerUiAnimation]
  );

  /* Parse LED Payload (6 Bytes) */
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
      const modeName = LED_MODES.find((m) => m.id === mode)?.label || `Mode ${mode}`;
      addLog(`[RX LED] ${bytesToHex(dataView)} -> ${modeName} RGB:(${r},${g},${b}) Bri:${bri}% Spd:${spd}`, "rx");
    },
    [addLog]
  );

  /* Parse Config Payload */
  const parseConfigData = useCallback(
    (dataView: DataView) => {
      if (dataView.byteLength < 100) return;
      const decoder = new TextDecoder();
      const newConfigs: RelayConfigItem[] = [];
      for (let i = 0; i < 4; i++) {
        const offset = i * 25;
        const wiring = dataView.getUint8(offset + 1) || 0;
        const onEn = dataView.getUint8(offset + 2) === 1;
        const onMd = dataView.getUint8(offset + 3) || 1;
        const onDu = dataView.getUint8(offset + 4) || 2;
        const offEn = dataView.getUint8(offset + 5) === 1;
        const offMd = dataView.getUint8(offset + 6) || 3;
        const offDu = dataView.getUint8(offset + 7) || 2;
        const nameLen = Math.min(16, dataView.getUint8(offset + 8));
        const nameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + offset + 9, nameLen);
        const name = decoder.decode(nameBytes).replace(/\0/g, "").trim() || `Relay ${i + 1}`;
        let bz = { beepOn: true, beepOff: true, beepTimerEnd: true };
        if (typeof window !== "undefined") {
          try {
            const savedBz = localStorage.getItem(`smartdesk_relay_bz_${i}`);
            if (savedBz) bz = JSON.parse(savedBz);
          } catch (e) {}
        }
        newConfigs.push({
          name,
          wiring,
          onAnimEnabled: onEn,
          onAnimMode: onMd,
          onAnimDuration: onDu,
          offAnimEnabled: offEn,
          offAnimMode: offMd,
          offAnimDuration: offDu,
          beepOn: bz.beepOn ?? true,
          beepOff: bz.beepOff ?? true,
          beepTimerEnd: bz.beepTimerEnd ?? true,
        });
      }
      setConfigs(newConfigs);

      if (dataView.byteLength >= 102) {
        const devNameLen = Math.min(20, dataView.getUint8(100));
        if (devNameLen > 0) {
          const devNameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + 101, devNameLen);
          const devName = decoder.decode(devNameBytes).replace(/\0/g, "").trim();
          if (devName) {
            setDeviceName(devName);
          }
        }
      }

      if (dataView.byteLength >= 133) {
        const pEn = dataView.getUint8(125) === 1;
        const pDelay = dataView.getUint8(126) | (dataView.getUint8(127) << 8);
        const pAwayMask = dataView.getUint8(128);
        const pAwayRgb = dataView.getUint8(129) === 1;
        const pArrMask = dataView.getUint8(130);
        const pArrRgb = dataView.getUint8(131) === 1;
        const pArrMode = dataView.getUint8(132);

        setPresenceConfig((prev) => ({
          ...prev,
          enabled: pEn,
          awayDelayMin: pDelay > 0 ? pDelay : prev.awayDelayMin,
          awayRelayMask: pAwayMask,
          awayRgbOff: pAwayRgb,
          arrivalRelayMask: pArrMask,
          arrivalRgbOn: pArrRgb,
          arrivalRgbMode: pArrMode > 0 ? pArrMode : prev.arrivalRgbMode,
        }));
        if (pDelay > 0) {
          setCustomDelayInput(pDelay.toString());
        }
      }

      if (dataView.byteLength >= 155) {
        const clients: StoredClient[] = [];
        for (let i = 0; i < 10; i++) {
          const off = 135 + i * 20;
          if (off + 2 >= dataView.byteLength) break;
          const valid = dataView.getUint8(off + 0) === 1;
          const trackPresence = dataView.getUint8(off + 1) === 1;
          const nlen = Math.min(17, dataView.getUint8(off + 2));
          let devName = `Device ${i + 1}`;
          if (nlen > 0 && off + 3 + nlen <= dataView.byteLength) {
            const nameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + off + 3, nlen);
            devName = decoder.decode(nameBytes).replace(/\0/g, "").trim() || `Device ${i + 1}`;
          }
          if (valid) {
            clients.push({
              slot: i,
              valid,
              trackPresence,
              name: devName,
            });
          }
        }
        setStoredClients(clients);
      }

      addLog(`[RX CONFIG] Loaded configurations & NO/NC settings for all 4 relays.`, "rx");
    },
    [addLog]
  );

  /* Parse Environment & Clock */
  const parseEnvData = useCallback(
    (dataView: DataView) => {
      if (dataView.byteLength < 6) return;
      const valid = dataView.getUint8(0) === 1;
      const tempInt = dataView.getUint8(1);
      const tempDec = dataView.getUint8(2);
      const humInt = dataView.getUint8(3);
      const humDec = dataView.getUint8(4);
      const buzz = dataView.getUint8(5) === 1;

      setEnvData({
        valid,
        tempC: tempInt + tempDec * 0.1,
        humidity: humInt + humDec * 0.1,
      });
      setMasterBuzzer(buzz);

      if (dataView.byteLength >= 11) {
        const synced = dataView.getUint8(6) === 1;
        const hour = dataView.getUint8(7);
        const minute = dataView.getUint8(8);
        const second = dataView.getUint8(9);
        const dayOfWeek = dataView.getUint8(10);
        setEspClock({ synced, hour, minute, second, dayOfWeek });
      }

      if (dataView.byteLength >= 14) {
        const presEnabled = dataView.getUint8(11) === 1;
        const presState = dataView.getUint8(12);
        const awayRemMin = dataView.getUint8(13);
        setPresenceData({
          enabled: presEnabled,
          state: presState,
          remainingMin: awayRemMin,
        });
      }

      if (dataView.byteLength >= 16) {
        const sLen = dataView.getUint8(14) | (dataView.getUint8(15) << 8);
        if (sLen >= 1 && sLen <= 800) setStripLength(sLen);
      }

      if (dataView.byteLength >= 23) {
        const mRows = dataView.getUint8(16) | (dataView.getUint8(17) << 8);
        const mCols = dataView.getUint8(18) | (dataView.getUint8(19) << 8);
        const mWiring = dataView.getUint8(20);
        const mPin = dataView.getUint8(21);
        const mEn = dataView.getUint8(22) === 1;
        const mMode = dataView.byteLength >= 24 ? dataView.getUint8(23) : 17;
        setMatrixConfig((prev) => ({
          ...prev,
          rows: mRows,
          cols: mCols,
          wiringType: mWiring,
          pin: mPin,
          enabled: mEn,
          mode: mMode,
        }));
      }
    },
    []
  );

  /* Sync Real-Time Clock to ESP32 (0xFB) */
  const syncRealTime = useCallback(() => {
    if (!configCharRef.current) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const dow = now.getDay();
    const payload = new Uint8Array([0xFB, h, m, s, dow]);

    enqueueWrite("Sync Clock to ESP32", async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Sync Real-Time: ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}, Day=${DAYS_OF_WEEK[dow]})`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      setEspClock({ synced: true, hour: h, minute: m, second: s, dayOfWeek: dow });
    });
  }, [enqueueWrite, addLog]);

  /* Disconnect Cleanup */
  const handleDisconnected = useCallback(() => {
    addLog("Device disconnected from host.", "warn");
    setConnected(false);
    setConnecting(false);
    relayCharRef.current = null;
    ledCharRef.current = null;
    configCharRef.current = null;
    infoCharRef.current = null;
    envCharRef.current = null;
    deviceRef.current = null;
    setUiAnim(null);
    setEnvData({ valid: false, tempC: 0, humidity: 0 });
    stopMusicSyncRef.current();
  }, [addLog]);

  /* Connect Flow with Timeout and Staged GATT setup */
  const handleConnect = useCallback(
    async (targetDevice?: BluetoothDevice, isAuto: boolean = false) => {
      const nav = typeof window !== "undefined" ? (window.navigator as NavigatorWithBluetooth) : null;
      if (!nav?.bluetooth) {
        if (!isAuto) {
          onAlertRef.current?.(
            "Not Supported",
            "Web Bluetooth is not supported in this browser or in Incognito mode! Please open in a normal Chrome or Edge window."
          );
        }
        return;
      }

      try {
        setConnecting(true);

        let dev: BluetoothDevice | undefined = targetDevice;
        let connectedGatt: BluetoothRemoteGATTServer | null = null;

        // 1. If no targetDevice specified, check for pre-authorized / known device to connect instantly
        if (!dev) {
          if (deviceRef.current && deviceRef.current.gatt) {
            dev = deviceRef.current;
          } else if (lastDeviceDetected && lastDeviceDetected.gatt) {
            dev = lastDeviceDetected;
          } else if (nav.bluetooth.getDevices) {
            try {
              const knownDevices = await nav.bluetooth.getDevices();
              if (knownDevices && knownDevices.length > 0) {
                const lastId = typeof window !== "undefined" ? localStorage.getItem("smartdesk_last_device_id") : null;
                const matched =
                  (lastId && knownDevices.find((d) => d.id === lastId)) ||
                  knownDevices.find((d) => {
                    const n = (d.name || "").toLowerCase();
                    return n.includes("smartdesk") || n.includes("controller") || n.includes("desk") || n.includes("sd");
                  }) ||
                  knownDevices[0];
                if (matched) {
                  dev = matched;
                }
              }
            } catch (e) {
              console.warn("[getDevices check error]:", e);
            }
          }
        }

        // 2. If a pre-authorized device exists, attempt direct instant connection without popup
        if (dev) {
          addLog(`Step 1: Instantly reconnecting to previously connected device '${dev.name || "smartDesk"}'...`, "info");
          try {
            connectedGatt = dev.gatt?.connected
              ? dev.gatt
              : await Promise.race([
                  dev.gatt?.connect(),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Direct connection timed out after 4.5s")), 4500)
                  ),
                ]) || null;
          } catch (directErr) {
            addLog(`Direct reconnect to '${dev.name || "device"}' was unavailable: ${(directErr as Error).message}`, "info");
            connectedGatt = null;
            if (isAuto) {
              throw directErr;
            }
            // User manually clicked connect: fall back to chooser if previous device is offline/unreachable
            dev = undefined;
          }
        }

        // 3. If no pre-authorized device was found or direct connect failed, prompt device chooser (filtered for SmartDesk devices)
        if (!dev) {
          addLog("Step 1: Requesting Bluetooth device chooser (filtered for SmartDesk devices)...", "info");
          const reqOptions = showAllDevicesRef.current
            ? {
                acceptAllDevices: true,
                optionalServices: [SERVICE_UUID, "00001812-0000-1000-8000-00805f9b34fb"],
              }
            : {
                filters: [
                  { services: [SERVICE_UUID] },
                  { namePrefix: "SmartDesk" },
                  { namePrefix: "smartDesk" },
                  { namePrefix: "Smart Desk" },
                  { namePrefix: "Desk" },
                  { namePrefix: "SD-" },
                ],
                optionalServices: [SERVICE_UUID, "00001812-0000-1000-8000-00805f9b34fb"],
              };
          dev = await nav.bluetooth.requestDevice(reqOptions);
        }

        deviceRef.current = dev;
        setDeviceName(dev.name || "smartDesk Controller");
        dev.removeEventListener("gattserverdisconnected", handleDisconnected);
        dev.addEventListener("gattserverdisconnected", handleDisconnected);

        if (typeof window !== "undefined" && dev.name) {
          localStorage.setItem("smartdesk_last_device_id", dev.id);
          localStorage.setItem("smartdesk_last_device_name", dev.name);
          setPersistedDeviceName(dev.name);
        }

        addLog(`Step 2: Connecting to GATT server for '${dev.name}'...`, "info");

        // Wrap connect with a strict 7-second timeout to avoid Windows BLE hangs
        const gatt = connectedGatt || (dev.gatt?.connected
          ? dev.gatt
          : await Promise.race([
              dev.gatt?.connect(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("GATT connection timed out after 7 seconds")), 7000)
              ),
            ]));

        if (!gatt) throw new Error("Could not acquire GATT server connection.");
        await sleep(150);

        addLog("Step 3: GATT connected. Fetching Primary Service...", "info");
        const service = await gatt.getPrimaryService(SERVICE_UUID);
        await sleep(150);

        addLog("Step 4a: Acquiring RELAY characteristic...", "info");
        const rChar = await service.getCharacteristic(CHAR_RELAY_UUID);
        relayCharRef.current = rChar;
        await sleep(150);

        addLog("Step 4b: Acquiring LED characteristic...", "info");
        const lChar = await service.getCharacteristic(CHAR_LED_UUID);
        ledCharRef.current = lChar;
        await sleep(150);

        addLog("Step 4c: Acquiring CONFIG characteristic...", "info");
        const cChar = await service.getCharacteristic(CHAR_CONFIG_UUID);
        configCharRef.current = cChar;
        await sleep(150);

        let iChar: BluetoothRemoteGATTCharacteristic | null = null;
        try {
          iChar = await service.getCharacteristic(CHAR_INFO_UUID);
          infoCharRef.current = iChar;
          await sleep(150);
        } catch (e) {}

        let eChar: BluetoothRemoteGATTCharacteristic | null = null;
        try {
          eChar = await service.getCharacteristic(CHAR_ENV_UUID);
          envCharRef.current = eChar;
          await sleep(150);
        } catch (e) {}

        // Start notifications staged
        addLog("Step 5a: Starting notifications on RELAY...", "info");
        await rChar.startNotifications();
        rChar.addEventListener("characteristicvaluechanged", (e: any) => {
          if (e.target?.value) parseRelayData(e.target.value);
        });
        await sleep(150);

        addLog("Step 5b: Starting notifications on LED...", "info");
        await lChar.startNotifications();
        lChar.addEventListener("characteristicvaluechanged", (e: any) => {
          if (e.target?.value) parseLedData(e.target.value);
        });
        await sleep(150);

        if (eChar) {
          try {
            await eChar.startNotifications();
            eChar.addEventListener("characteristicvaluechanged", (e: any) => {
              if (e.target?.value) parseEnvData(e.target.value);
            });
            await sleep(150);
          } catch (e) {}
        }

        // Initial state reads staged
        addLog("Step 6: Reading initial hardware states...", "info");
        const rInitVal = await rChar.readValue();
        parseRelayData(rInitVal);
        await sleep(150);

        const lInitVal = await lChar.readValue();
        parseLedData(lInitVal);
        await sleep(150);

        const cInitVal = await cChar.readValue();
        parseConfigData(cInitVal);
        await sleep(150);

        if (iChar) {
          try {
            const iInitVal = await iChar.readValue();
            const decoder = new TextDecoder();
            setInfoString(decoder.decode(iInitVal));
          } catch (e) {}
        }

        if (eChar) {
          try {
            const eInitVal = await eChar.readValue();
            parseEnvData(eInitVal);
          } catch (e) {}
        }

        setConnected(true);
        setConnecting(false);
        setLastDeviceDetected(null);
        addLog(">>> CONNECTION ESTABLISHED & OPERATIONAL! <<<", "info");
        onToastRef.current?.("Connected to SmartDesk!", "success");

        setTimeout(() => {
          syncRealTime();
        }, 350);
      } catch (err: unknown) {
        setConnecting(false);
        setConnected(false);
        const isNotFound = (err as any)?.name === "NotFoundError" || String(err).includes("User cancelled");
        const msg = err instanceof Error ? err.message : String(err);

        if (isNotFound) {
          addLog("Device chooser cancelled by user.", "info");
        } else if (isAuto) {
          setLastDeviceDetected(null);
          addLog(`Auto-reconnect standby (${msg})`, "warn");
          console.warn("[BLE Auto-Connect Standby]:", msg);
        } else {
          addLog(`Connection failed: ${msg}`, "err");
          onAlertRef.current?.(
            "Connection Failed",
            `${msg}\n\nTips:\nEnsure ESP32-S3 is powered and running.\nDO NOT use Incognito / Private tabs (Chrome strictly disables Web Bluetooth in Incognito).\nIf on Windows 11 and previously paired, open Windows Settings > Bluetooth & Devices > Devices, click 'Remove device' on SmartDesk, and reconnect.\nEnsure Bluetooth is toggled ON in system settings.`
          );
        }
      }
    },
    [
      addLog,
      handleDisconnected,
      parseConfigData,
      parseEnvData,
      parseLedData,
      parseRelayData,
      syncRealTime,
    ]
  );

  connectRef.current = handleConnect;

  /* Teardown & Auto-Connect on Mount */
  useEffect(() => {
    // Teardown listener on actual page refresh/close (avoid pagehide so screen lock doesn't disconnect)
    const onCleanTeardown = () => {
      if (deviceRef.current?.gatt?.connected) {
        try {
          deviceRef.current.gatt.disconnect();
        } catch (_) {}
      }
    };
    window.addEventListener("beforeunload", onCleanTeardown);

    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smartdesk_last_device_name");
      if (savedName) setPersistedDeviceName(savedName);
      try {
        const savedScheds = localStorage.getItem("smartdesk_schedules");
        if (savedScheds) setSchedules(JSON.parse(savedScheds));
      } catch (e) {}
      const savedPresenceDev = localStorage.getItem("smartdesk_designated_presence_device");
      if (savedPresenceDev) setDesignatedPresenceDevice(savedPresenceDev);
      const savedNick = localStorage.getItem("smartdesk_client_nickname");
      if (savedNick) setClientNickname(savedNick);
    }

    const nav = typeof window !== "undefined" ? (window.navigator as NavigatorWithBluetooth) : null;
    if (!nav?.bluetooth) {
      setBluetoothSupported(false);
      return () => {
        window.removeEventListener("beforeunload", onCleanTeardown);
      };
    }

    let timeoutId: NodeJS.Timeout;
    const checkPersistentDevices = async () => {
      try {
        if (nav.bluetooth?.getDevices) {
          const knownDevices = await nav.bluetooth.getDevices();
          if (knownDevices && knownDevices.length > 0) {
            const lastId = localStorage.getItem("smartdesk_last_device_id");
            const matched = (lastId && knownDevices.find((d) => d.id === lastId)) ||
              knownDevices.find((d) => d.name?.toLowerCase().includes("smartdesk") || d.name?.toLowerCase().includes("controller") || d.name?.toLowerCase().includes("sd")) ||
              knownDevices[0];

            if (matched) {
              setLastDeviceDetected(matched);
              addLog(`Found pre-authorized device '${matched.name || "smartDesk"}'. Auto-reconnecting...`, "info");

              // Listen for live BLE advertisement if supported
              if ("watchAdvertisements" in matched) {
                try {
                  const abortCtrl = new AbortController();
                  matched.addEventListener("advertisementreceived", async () => {
                    abortCtrl.abort();
                    if (!connectedRef.current && !connectingRef.current) {
                      addLog(`BLE Advertisement detected from '${matched.name}'. Connecting...`, "info");
                      await connectRef.current(matched, true);
                    }
                  }, { once: true, signal: abortCtrl.signal });
                  await (matched as any).watchAdvertisements({ signal: abortCtrl.signal });
                } catch (_) {}
              }

              // Direct auto-connect attempt
              try {
                await connectRef.current(matched, true);
              } catch (_) {
                // If initial attempt fails due to reload GATT transition, retry once after 2.5s
                setTimeout(async () => {
                  if (!connectedRef.current && !connectingRef.current) {
                    try {
                      addLog("Retrying auto-connect...", "info");
                      await connectRef.current(matched, true);
                    } catch (_) {}
                  }
                }, 2500);
              }
            }
          }
        }
      } catch (e) {}
    };

    timeoutId = setTimeout(() => {
      checkPersistentDevices();
    }, 800);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("beforeunload", onCleanTeardown);
    };
  }, [addLog]);

  /* User-Initiated Connect: Synchronous call preserving user gesture */
  const triggerUserConnect = useCallback(async () => {
    if (connectingRef.current) {
      setConnecting(false);
      if (deviceRef.current?.gatt) {
        try { deviceRef.current.gatt.disconnect(); } catch (_) {}
      }
    }
    // Direct call with NO preceding sleep/delay to keep user activation alive
    await handleConnect(undefined, false);
  }, [handleConnect]);

  /* Relay Commands: Sends standard LOAD state (1=ON, 0=OFF); ESP32 hardware driver converts to coil levels */
  const toggleRelay = useCallback(
    (idx: number, explicitTarget?: boolean) => {
      const currentLoad = relays[idx]?.load ?? false;
      const nextLoad = explicitTarget !== undefined ? explicitTarget : !currentLoad;

      const payload = new Uint8Array([1, idx, nextLoad ? 1 : 0]);
      triggerUiAnimation(idx, nextLoad);
      setRelays((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, load: nextLoad, remainingMin: 0 } : r))
      );

      const rName = configsRef.current[idx]?.name || `CH${idx + 1}`;
      const wiringMode = configsRef.current[idx]?.wiring === 1 ? "NC" : "NO";

      enqueueWrite(`Set Relay ${idx + 1} -> ${nextLoad ? "ON" : "OFF"}`, async () => {
        addLog(`[TX RELAY] ${bytesToHex(payload)} (Set ${rName} Load -> ${nextLoad ? "ON" : "OFF"}, Contact=${wiringMode})`, "tx");
        await relayCharRef.current?.writeValueWithResponse(payload);
      });
      onToastRef.current?.(`${rName} turned ${nextLoad ? "ON" : "OFF"}`);
    },
    [triggerUiAnimation, enqueueWrite, addLog, relays]
  );

  const setRelayTimer = useCallback(
    (idx: number, minutes: number) => {
      const payload = new Uint8Array([2, idx, minutes & 0xff, (minutes >> 8) & 0xff]);
      enqueueWrite(`Set Relay ${idx + 1} Timer -> ${minutes}m`, async () => {
        addLog(`[TX RELAY] ${bytesToHex(payload)} (Set Relay ${idx + 1} Timer to ${minutes} min)`, "tx");
        await relayCharRef.current?.writeValueWithResponse(payload);
      });
      onToastRef.current?.(
        minutes > 0 ? `Timer set: ${configsRef.current[idx]?.name || `CH\${idx + 1}`} for ${minutes}m` : `Timer cancelled`
      );
    },
    [enqueueWrite, addLog]
  );

  const allRelaysOff = useCallback(() => {
    const payload = new Uint8Array([3]);
    setRelays((prev) => prev.map(() => ({ load: false, remainingMin: 0 })));
    enqueueWrite("All Relays OFF", async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (All Relays Safe OFF)`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
    onToastRef.current?.("All Relays turned OFF!", "warn");
  }, [enqueueWrite, addLog]);

  /* LED Commands */
  const sendLedCommand = useCallback(
    (mode: number, r: number, g: number, b: number, bri: number, spd: number) => {
      const payload = new Uint8Array([mode, r, g, b, bri, spd]);
      setLed({ mode, r, g, b, bri, spd });

      if (ledDebounceTimerRef.current) clearTimeout(ledDebounceTimerRef.current);
      ledDebounceTimerRef.current = setTimeout(() => {
        enqueueWrite("Set LED State", async () => {
          const modeName = LED_MODES.find((m) => m.id === mode)?.label || `Mode ${mode}`;
          addLog(`[TX LED] ${bytesToHex(payload)} (${modeName} RGB:(${r},${g},${b}) Bri:${bri}% Spd:${spd})`, "tx");
          await ledCharRef.current?.writeValueWithResponse(payload);
        });
      }, 50);
    },
    [enqueueWrite, addLog]
  );

  /* RGB Sleep Timer Handlers */
  const setRgbTimer = useCallback((minutes: number) => {
    if (minutes <= 0) {
      rgbTimerEndMsRef.current = 0;
      setRgbTimerRemainingMin(0);
      onToastRef.current?.("RGB Sleep Timer cancelled.");
    } else {
      rgbTimerEndMsRef.current = Date.now() + minutes * 60000;
      setRgbTimerRemainingMin(minutes);
      onToastRef.current?.(`RGB Sleep Timer set for ${minutes} min!`);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (rgbTimerEndMsRef.current > 0) {
        const diffMs = rgbTimerEndMsRef.current - Date.now();
        if (diffMs <= 0) {
          rgbTimerEndMsRef.current = 0;
          setRgbTimerRemainingMin(0);
          sendLedCommand(0, 0, 0, 0, 0, 0); // Turn RGB OFF
          onToastRef.current?.("RGB Light turned OFF by sleep timer!", "info");
        } else {
          setRgbTimerRemainingMin(Math.ceil(diffMs / 60000));
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sendLedCommand]);

  /* Config & Presence Commands */
  const savePresenceConfig = useCallback(
    (nextCfg: PresenceConfig) => {
      setPresenceConfig(nextCfg);
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_presence_config", JSON.stringify(nextCfg));
      }
      if (configCharRef.current) {
        const payload = new Uint8Array([
          0xF8,
          nextCfg.enabled ? 1 : 0,
          nextCfg.awayDelayMin & 0xff,
          (nextCfg.awayDelayMin >> 8) & 0xff,
          nextCfg.awayRelayMask,
          nextCfg.awayRgbOff ? 1 : 0,
          nextCfg.arrivalRelayMask,
          nextCfg.arrivalRgbOn ? 1 : 0,
          nextCfg.arrivalRgbMode,
        ]);
        enqueueWrite("Update Presence Config", async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Presence ${nextCfg.enabled ? "ENABLED" : "DISABLED"}, Delay: ${nextCfg.awayDelayMin}m)`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
      onToastRef.current?.("Presence settings updated!");
    },
    [enqueueWrite, addLog]
  );

  const toggleDevicePresenceTracking = useCallback(
    (slotIdx: number, currentTracked: boolean) => {
      if (!configCharRef.current) return;
      const nextTrack = currentTracked ? 0 : 1;
      const payload = new Uint8Array([0xF4, slotIdx, nextTrack]);
      enqueueWrite(`Set Slot ${slotIdx + 1} Tracking`, async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Slot #${slotIdx + 1}: ${nextTrack ? "TRACKED" : "EXCLUDED"})`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
        setStoredClients((prev) =>
          prev.map((c) => (c.slot === slotIdx ? { ...c, trackPresence: nextTrack === 1 } : c))
        );
      });
      onToastRef.current?.(`Slot #${slotIdx + 1} marked as ${nextTrack ? "Tracked (Master)" : "Excluded (Idle)"}`);
    },
    [enqueueWrite, addLog]
  );

  const clearKnownClients = useCallback(() => {
    if (configCharRef.current) {
      const payload = new Uint8Array([0xF6]);
      enqueueWrite("Clear Known Clients", async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Cleared all stored paired clients)`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
        setStoredClients([]);
      });
      onToastRef.current?.("All stored paired device slots cleared from flash");
    }
  }, [enqueueWrite, addLog]);

  const deleteStoredClient = useCallback(
    (slotIdx: number) => {
      if (configCharRef.current) {
        const payload = new Uint8Array([0xF6, slotIdx]);
        enqueueWrite(`Delete Slot #${slotIdx + 1}`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Deleted paired client slot #${slotIdx + 1})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
          setStoredClients((prev) => prev.filter((c) => c.slot !== slotIdx));
        });
        onToastRef.current?.(`Device removed from Slot #${slotIdx + 1}`);
      }
    },
    [enqueueWrite, addLog]
  );

  const registerClientName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setClientNickname(trimmed);
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_client_nickname", trimmed);
      }
      if (configCharRef.current) {
        const enc = new TextEncoder();
        const nameBytes = enc.encode(trimmed).slice(0, 23);
        const payload = new Uint8Array(2 + nameBytes.length);
        payload[0] = 0xF7;
        payload[1] = nameBytes.length;
        payload.set(nameBytes, 2);
        enqueueWrite("Register Client Name", async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Registered: "${trimmed}")`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
        onToastRef.current?.(`Registered client name: ${trimmed}`);
      }
    },
    [enqueueWrite, addLog]
  );

  const setAsDesignatedPresenceDevice = useCallback(
    (name: string) => {
      const clean = name.trim() || clientNickname.trim() || "My Phone";
      setDesignatedPresenceDevice(clean);
      setClientNickname(clean);
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_designated_presence_device", clean);
        localStorage.setItem("smartdesk_client_nickname", clean);
      }
      registerClientName(clean);
      savePresenceConfig({ ...presenceConfig, enabled: true });
      onToastRef.current?.(`"${clean}" designated as Presence Master!`, "success");
    },
    [clientNickname, registerClientName, savePresenceConfig, presenceConfig]
  );

  const removeDesignatedPresenceDevice = useCallback(() => {
    setDesignatedPresenceDevice("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("smartdesk_designated_presence_device");
    }
    savePresenceConfig({ ...presenceConfig, enabled: false });
    onToastRef.current?.("Designated presence device cleared. Presence tracking inactive.");
  }, [savePresenceConfig, presenceConfig]);

  /* Dynamic Strip Length Command (0xF3) */
  const saveStripLength = useCallback(
    (newLen: number) => {
      const clamped = Math.max(1, Math.min(800, Number(newLen) || 8));
      setStripLength(clamped);
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_strip_length", String(clamped));
      }
      if (configCharRef.current) {
        const payload = new Uint8Array([0xF3, clamped & 0xff, (clamped >> 8) & 0xff]);
        enqueueWrite(`Set Strip Length (${clamped})`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Strip Length: ${clamped} LEDs)`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
        onToastRef.current?.(`Strip length set to ${clamped} LEDs`, "success");
      }
    },
    [enqueueWrite, addLog]
  );

  /* 2D Matrix Hardware Config (0xF2) */
  const saveMatrixHardwareConfig = useCallback(
    (rows: number, cols: number, wiringType: number, pin: number = 11, enabled: boolean = true) => {
      const r = Math.max(1, Math.min(800, Number(rows) || 8));
      const c = Math.max(1, Math.min(800, Number(cols) || 32));
      const w = wiringType === 0 ? 0 : 1;
      const p = Math.max(1, Math.min(48, Number(pin) || 11));
      setMatrixConfig((prev) => ({ ...prev, rows: r, cols: c, wiringType: w, pin: p, enabled }));
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "smartdesk_matrix_config",
          JSON.stringify({ rows: r, cols: c, wiringType: w, pin: p, enabled })
        );
      }
      if (configCharRef.current) {
        const payload = new Uint8Array([
          0xF2,
          r & 0xff,
          (r >> 8) & 0xff,
          c & 0xff,
          (c >> 8) & 0xff,
          w,
          p,
          enabled ? 1 : 0,
        ]);
        enqueueWrite("Set Matrix Hardware Config", async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Matrix ${c}x${r} on GPIO ${p})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
        onToastRef.current?.(`Matrix configured: ${c}x${r} on GPIO ${p}`, "success");
      }
    },
    [enqueueWrite, addLog]
  );

  /* 2D Matrix Display Mode & Marquee Text (0xF1) */
  const setMatrixDisplay = useCallback(
    (
      mode: number,
      speed?: number,
      bri?: number,
      r?: number,
      g?: number,
      b?: number,
      text?: string
    ) => {
      const cur = matrixConfigRef.current;
      const finalSpeed = speed !== undefined ? speed : cur.speed;
      const finalBri = bri !== undefined ? bri : cur.bri;
      const finalR = r !== undefined ? r : cur.colorR;
      const finalG = g !== undefined ? g : cur.colorG;
      const finalB = b !== undefined ? b : cur.colorB;
      const cleanText = (text !== undefined ? text : cur.text || "SMARTDESK V2").slice(0, 60);

      setMatrixConfig((prev) => ({
        ...prev,
        mode,
        speed: finalSpeed,
        bri: finalBri,
        colorR: finalR,
        colorG: finalG,
        colorB: finalB,
        text: cleanText,
      }));
      if (configCharRef.current) {
        const enc = new TextEncoder();
        const tBytes = enc.encode(cleanText);
        const payload = new Uint8Array(8 + tBytes.length);
        payload[0] = 0xF1;
        payload[1] = mode;
        payload[2] = Math.max(1, Math.min(10, finalSpeed));
        payload[3] = Math.max(0, Math.min(255, Math.round((finalBri / 100) * 255)));
        payload[4] = finalR;
        payload[5] = finalG;
        payload[6] = finalB;
        payload[7] = tBytes.length;
        payload.set(tBytes, 8);
        enqueueWrite(`Set Matrix Mode ${mode}`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Matrix Mode ${mode}: "${cleanText}")`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
        onToastRef.current?.(
          `Matrix: ${
            mode === 17
              ? "Digital Clock"
              : mode === 18
              ? "Scrolling Text"
              : mode === 19
              ? "Matrix Rain"
              : "Off"
          }`
        );
      }
    },
    [enqueueWrite, addLog]
  );

  const saveRelayConfig = useCallback(
    (
      idx: number,
      newName: string,
      wiring: number,
      onEn: boolean,
      onMd: number,
      onDu: number,
      offEn: boolean,
      offMd: number,
      offDu: number,
      beepOn: boolean,
      beepOff: boolean,
      beepEnd: boolean
    ) => {
      const enc = new TextEncoder();
      const cleanName = newName.trim().slice(0, 16);
      const nameBytes = enc.encode(cleanName);
      const payload = new Uint8Array(9 + nameBytes.length);
      payload[0] = idx;
      payload[1] = wiring;
      payload[2] = onEn ? 1 : 0;
      payload[3] = onMd;
      payload[4] = onDu;
      payload[5] = offEn ? 1 : 0;
      payload[6] = offMd;
      payload[7] = offDu;
      payload[8] = nameBytes.length;
      payload.set(nameBytes, 9);

      setConfigs((prev) =>
        prev.map((c, i) =>
          i === idx
            ? {
                name: cleanName || `Relay ${idx + 1}`,
                wiring,
                onAnimEnabled: onEn,
                onAnimMode: onMd,
                onAnimDuration: onDu,
                offAnimEnabled: offEn,
                offAnimMode: offMd,
                offAnimDuration: offDu,
                beepOn,
                beepOff,
                beepTimerEnd: beepEnd,
              }
            : c
        )
      );

      if (typeof window !== "undefined") {
        localStorage.setItem(`smartdesk_relay_bz_${idx}`, JSON.stringify({ beepOn, beepOff, beepTimerEnd: beepEnd }));
      }

      if (configCharRef.current) {
        enqueueWrite(`Save Relay ${idx + 1} Config`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Relay ${idx + 1} Config: "${cleanName}", Wiring=${wiring ? "NC" : "NO"})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
      onToastRef.current?.(`Relay ${idx + 1} settings saved!`);
    },
    [enqueueWrite, addLog]
  );

  const saveRename = useCallback(
    (newName: string) => {
      const clean = newName.trim().slice(0, 20);
      if (!clean) return;
      const enc = new TextEncoder();
      const nameBytes = enc.encode(clean);
      const payload = new Uint8Array(2 + nameBytes.length);
      payload[0] = 0xFE;
      payload[1] = nameBytes.length;
      payload.set(nameBytes, 2);

      setDeviceName(clean);
      setPersistedDeviceName(clean);
      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_last_device_name", clean);
      }

      if (configCharRef.current) {
        enqueueWrite("Rename Device", async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Renamed to "${clean}")`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
      onToastRef.current?.(`Controller renamed to: ${clean}`);
    },
    [enqueueWrite, addLog]
  );

  /* Schedule Handlers */
  const saveScheduleRule = useCallback(
    (rule: ScheduleRule) => {
      const payload = new Uint8Array(16);
      payload[0] = 0xFA;
      payload[1] = rule.id;
      payload[2] = rule.enabled ? 1 : 0;
      payload[3] = rule.daysMask;
      payload[4] = rule.startHour;
      payload[5] = rule.startMin;
      payload[6] = rule.stopType;
      if (rule.stopType === 1) {
        payload[7] = rule.durationMin & 0xff;
        payload[8] = (rule.durationMin >> 8) & 0xff;
        payload[9] = 0;
      } else {
        payload[7] = rule.stopHour;
        payload[8] = 0;
        payload[9] = rule.stopMin;
      }
      payload[10] = rule.targetType;
      payload[11] = rule.targetAction;
      payload[12] = rule.rgbR ?? 0;
      payload[13] = rule.rgbG ?? 180;
      payload[14] = rule.rgbB ?? 255;
      payload[15] = rule.rgbBri ?? 50;

      setSchedules((prev) => {
        const next = prev.some((s) => s.id === rule.id)
          ? prev.map((s) => (s.id === rule.id ? rule : s))
          : [...prev, rule];
        if (typeof window !== "undefined") {
          localStorage.setItem("smartdesk_schedules", JSON.stringify(next));
        }
        return next;
      });

      if (configCharRef.current) {
        enqueueWrite(`Sync Schedule Rule ${rule.id + 1}`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Schedule Rule ${rule.id + 1}: ${rule.name})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
      onToastRef.current?.(`Schedule rule saved to ESP32 flash!`);
    },
    [enqueueWrite, addLog]
  );

  const deleteScheduleRule = useCallback(
    (ruleId: number) => {
      setSchedules((prev) => {
        const next = prev.filter((s) => s.id !== ruleId);
        if (typeof window !== "undefined") {
          localStorage.setItem("smartdesk_schedules", JSON.stringify(next));
        }
        return next;
      });

      if (configCharRef.current) {
        const payload = new Uint8Array([0xF9, ruleId]);
        enqueueWrite(`Disable Schedule Rule ${ruleId + 1}`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Disabled Rule ${ruleId + 1})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
      onToastRef.current?.(`Schedule rule removed`);
    },
    [enqueueWrite, addLog]
  );

  const handleTestScheduleRule = useCallback(
    (ruleId: number, isStart: boolean = true) => {
      if (!configCharRef.current) {
        onAlertRef.current?.("Not Connected", "Connect to SmartDesk first to test schedule rules!");
        return;
      }
      const payload = new Uint8Array([0xF5, ruleId, isStart ? 1 : 0]);
      enqueueWrite(`Test Schedule Rule ${ruleId + 1}`, async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Test Schedule #${ruleId + 1} ${isStart ? "TRIGGER" : "STOP"})`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
      });
      onToastRef.current?.(`Tested Rule #${ruleId + 1} (${isStart ? "Start" : "Stop"})`);
    },
    [enqueueWrite, addLog]
  );

  /* Buzzer Handlers */
  const toggleMasterBuzzer = useCallback(() => {
    if (!configCharRef.current) return;
    const nextState = !masterBuzzer;
    const payload = new Uint8Array([0xFD, nextState ? 1 : 0]);
    enqueueWrite(`Toggle Buzzer -> ${nextState ? "ON" : "MUTED"}`, async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Master Buzzer: ${nextState ? "ON" : "MUTED"})`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      setMasterBuzzer(nextState);
    });
    onToastRef.current?.(`Buzzer ${nextState ? "Enabled" : "Muted"}`);
  }, [masterBuzzer, enqueueWrite, addLog]);

  const testBuzzerBeep = useCallback(
    (freqHz: number = 2400, durationMs: number = 200) => {
      if (!configCharRef.current) return;
      const payload = new Uint8Array([
        0xF9,
        freqHz & 0xff,
        (freqHz >> 8) & 0xff,
        durationMs & 0xff,
        (durationMs >> 8) & 0xff,
      ]);
      enqueueWrite("Test Buzzer Beep", async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Test Buzzer: ${freqHz}Hz, ${durationMs}ms)`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
      });
    },
    [enqueueWrite, addLog]
  );

  /* Music Sync Start & Stop */
  const stopMusicSync = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMusicSyncActive(false);
    setMicVolume(0);
    setBeatPulse(false);

    if (savedLedBeforeMusicRef.current && ledCharRef.current && connectedRef.current) {
      const s = savedLedBeforeMusicRef.current;
      const payload = new Uint8Array([s.mode, s.r, s.g, s.b, s.bri, s.spd]);
      setLed(s);
      enqueueWrite("Restore Normal LED State", async () => {
        await ledCharRef.current?.writeValueWithResponse(payload);
      });
    }
  }, [enqueueWrite]);

  stopMusicSyncRef.current = stopMusicSync;

  const startMusicSync = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onAlertRef.current?.("Not Supported", "Microphone access is not supported in this browser.");
      return;
    }

    try {
      savedLedBeforeMusicRef.current = { ...led };
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMusicSyncActive(true);
      addLog("Music Sync active. FFT analyzing audio beats...", "info");

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const smoothBands = [0, 0, 0, 0, 0, 0, 0, 0];
      let smoothBass = 0;
      const agcHistory: number[] = [];
      let lastAgcTick = 0;

      const renderAudioFrame = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        const avg = sum / (freqData.length || 1);

        const now = Date.now();

        // Auto-Gain Control (AGC): 3-second rolling volume average
        if (now - lastAgcTick > 100) {
          lastAgcTick = now;
          agcHistory.push(avg);
          if (agcHistory.length > 30) agcHistory.shift(); // 30 samples * 100ms = 3.0s
        }
        const recentPeak = Math.max(16, ...agcHistory);
        const agcMultiplier = Math.max(0.6, Math.min(2.4, 75 / recentPeak));
        const effectiveSens = musicSensitivityRef.current * agcMultiplier;

        const normalizedVol = Math.min(100, Math.round((avg / 128) * 100 * effectiveSens));

        if (now - lastVolUpdateRef.current > 80) {
          lastVolUpdateRef.current = now;
          setMicVolume(normalizedVol);
        }

        // Fluid Falloff Audio Equalizer Decay
        const bands = [0, 0, 0, 0, 0, 0, 0, 0];
        const step = Math.max(1, Math.floor(freqData.length / 8));
        for (let i = 0; i < 8; i++) {
          let bSum = 0;
          for (let j = 0; j < step; j++) {
            bSum += freqData[i * step + j] || 0;
          }
          const instantVal = Math.min(255, Math.round((bSum / step) * effectiveSens));
          if (instantVal >= smoothBands[i]) {
            smoothBands[i] = instantVal; // Fast attack
          } else {
            smoothBands[i] = Math.max(0, Math.round(smoothBands[i] * 0.88 - 3)); // Smooth studio decay
          }
          bands[i] = smoothBands[i];
        }
        liveMusicLevelsRef.current = bands;

        const rawBass = (bands[0] * 1.5 + bands[1] * 1.2 + bands[2]) / 3.7;
        if (rawBass >= smoothBass) {
          smoothBass = rawBass;
        } else {
          smoothBass = Math.max(0, smoothBass * 0.85 - 4);
        }
        bassAvgRef.current = bassAvgRef.current * 0.9 + smoothBass * 0.1;
        const bassKick = smoothBass > bassAvgRef.current * 1.3 && smoothBass > 40;
        const beatVal = Math.min(255, Math.round(smoothBass * (bassKick ? 1.4 : 1.0)));
        liveBeatValRef.current = beatVal;

        if (bassKick) {
          setBeatPulse(true);
          setTimeout(() => setBeatPulse(false), 90);
        }

        if (now - lastBleMusicWriteMsRef.current >= 45 && ledCharRef.current && connectedRef.current) {
          lastBleMusicWriteMsRef.current = now;
          const sub = musicSubModeRef.current;
          const bri = musicBriRef.current;
          const col = soloColorRef.current;

          const frame = new Uint8Array(15);
          frame[0] = 16;
          frame[1] = bri;
          frame[2] = sub;
          frame[3] = beatVal;
          frame[4] = col.r;
          frame[5] = col.g;
          frame[6] = col.b;
          for (let b = 0; b < 8; b++) {
            frame[7 + b] = bands[b];
          }

          ledCharRef.current.writeValueWithResponse(frame).catch(() => {});
        }

        animFrameRef.current = requestAnimationFrame(renderAudioFrame);
      };

      animFrameRef.current = requestAnimationFrame(renderAudioFrame);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Could not access microphone: ${msg}`, "err");
      onAlertRef.current?.("Microphone Error", `Could not access microphone:\n\n${msg}`);
    }
  }, [led, addLog]);

  return {
    bluetoothSupported,
    connected,
    connecting,
    deviceName,
    persistedDeviceName,
    showAllDevices,
    setShowAllDevices,
    lastDeviceDetected,
    relays,
    configs,
    led,
    rgbTimerRemainingMin,
    setRgbTimer,
    musicSyncActive,
    musicBri,
    setMusicBri,
    musicSensitivity,
    setMusicSensitivity,
    musicSubMode,
    setMusicSubMode,
    soloColor,
    setSoloColor,
    micVolume,
    beatPulse,
    envData,
    masterBuzzer,
    espClock,
    schedules,
    presenceData,
    presenceConfig,
    clientNickname,
    setClientNickname,
    designatedPresenceDevice,
    setAsDesignatedPresenceDevice,
    removeDesignatedPresenceDevice,
    storedClients,
    deleteStoredClient,
    customDelayInput,
    setCustomDelayInput,
    stripLength,
    setStripLength,
    saveStripLength,
    matrixConfig,
    setMatrixConfig,
    saveMatrixHardwareConfig,
    setMatrixDisplay,
    uiAnim,
    infoString,
    logs,
    previewTick,
    liveMusicLevels: liveMusicLevelsRef.current,
    handleConnect: triggerUserConnect,
    handleDisconnected,
    toggleRelay,
    setRelayTimer,
    allRelaysOff,
    sendLedCommand,
    startMusicSync,
    stopMusicSync,
    savePresenceConfig,
    toggleDevicePresenceTracking,
    clearKnownClients,
    registerClientName,
    saveRelayConfig,
    saveRename,
    saveScheduleRule,
    deleteScheduleRule,
    handleTestScheduleRule,
    toggleMasterBuzzer,
    testBuzzerBeep,
    syncRealTime,
    addLog,
    clearLogs,
  };
}