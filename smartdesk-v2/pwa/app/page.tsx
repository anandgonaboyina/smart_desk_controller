"use client";

/**
 ================================================================================
 SMARTDESK-V1 BLE GATT PROTOCOL SPECIFICATION
 Service UUID: 7f781e04-c0ee-47c9-a1e4-0aafa8ee316b
 Advertised Name: smartDesk Controller (Configurable in NVS)

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
    - Read / Write / Notify Payload (6 to 10 bytes):
      * Standard Modes (0..15 - 6 bytes):
        - Byte 0: Mode (0..15: 0=Off, 1=Solid, 2=Breathe/Fade, 3=Rainbow, 4=Blink,
                  5=Chase L->R, 6=Chase R->L, 7=Color Cycle, 8=Scanner, 9=Sparkle,
                  10=Center Pulse, 11=Dual Chase, 12=Wipe L->R, 13=Wipe R->L,
                  14=Fire Flicker, 15=Aurora Wave)
        - Byte 1: Red (0..255)
        - Byte 2: Green (0..255)
        - Byte 3: Blue (0..255)
        - Byte 4: Brightness (0..100%, capped internally to LED_MAX_BRIGHT=80)
        - Byte 5: Speed (1..10)
      * Music Reactive Mode (Mode 16 - 6 to 15 bytes):
        - Byte 0: Mode = 16 (Music Reactive)
        - Byte 1: Music Brightness Cap (0..100%, independent of normal brightness)
        - 15-byte frame:
          * Byte 2: Disco SubMode (0..9: 0=Disco Party, 1=Bass Burst, 2=Neon Strobe,
                    3=Rhythm Ripple, 4=Disco Sparkle, 5=Beat Pump, 6=Dual Clash,
                    7=Cyber Spectrum, 8=Fire Dance, 9=Solo Beat Sync)
          * Byte 3: Beat / Bass Kick Intensity (0..255)
          * Bytes 4..6: RGB Color (0..255 each, used in Solo Beat Sync & Disco)
          * Bytes 7..14: Frequency Bands 0..7 (0..255 each)
        - 10-byte fallback: Bytes 2..9 = Intensity levels for LEDs 0..7 (0..255 each)
        - 6-byte fallback : Byte 2 = VU level (0..8), Bytes 3..5 = RGB color

 3. CONFIG Characteristic: 11848579-c357-45cb-bdb2-88f560c11708
    Properties: READ, WRITE (with response)
    - Write Relay Config Payload (9 to 25 bytes):
      * Byte 0: Relay Index (0..3)
      * Byte 1: Wiring (0=Normally Open [NO], 1=Normally Closed [NC])
      * Byte 2: ON Anim Enabled (0=Disabled, 1=Enabled)
      * Byte 3: ON Anim Mode (1..10)
      * Byte 4: ON Anim Duration (seconds: 1..10)
      * Byte 5: OFF Anim Enabled (0=Disabled, 1=Enabled)
      * Byte 6: OFF Anim Mode (1..10)
      * Byte 7: OFF Anim Duration (seconds: 1..10)
      * Byte 8: Name Length L (0..16)
      * Bytes 9..8+L: Name string ASCII (max 16 chars)
    - Write Rename Device Payload (3 to 22 bytes):
      * Byte 0: 0xFE (254)
      * Byte 1: Name Length L (1..20)
      * Bytes 2..1+L: Device Name string ASCII (max 20 chars)
    - Write Presence Config (0xF8, 6..7 bytes):
      * [0xF8, enabled, delayLo, delayHi, awayAction, arrivalAction, arrivalRelayMask]
    - Write Register Client Name (0xF7, 2..25 bytes):
      * [0xF7, nameLength, nameChars...]
    - Write Clear Known Clients (0xF6, 1 byte):
      * [0xF6]
    - Write Test Schedule Rule (0xF5, 3 bytes):
      * [0xF5, ruleIndex, isStart (1/0)]
    - Read Payload (125 bytes):
      * 4 Relay Records (25 bytes each, offsets 0, 25, 50, 75):
        - Byte 0: Index i (0..3)
        - Byte 1: Wiring (0=NO, 1=NC)
        - Byte 2: ON Anim Enabled (0 or 1)
        - Byte 3: ON Anim Mode (1..10)
        - Byte 4: ON Anim Duration (seconds: 1..10)
        - Byte 5: OFF Anim Enabled (0 or 1)
        - Byte 6: OFF Anim Mode (1..10)
        - Byte 7: OFF Anim Duration (seconds: 1..10)
        - Byte 8: Name Length L (0..16)
        - Bytes 9..24: Name string (16 bytes, ASCII null-padded)
      * Device Name Record (25 bytes, offset 100):
        - Byte 100: Device Name Length L (1..20)
        - Bytes 101..124: Device Name string (24 bytes, ASCII null-padded)

 4. INFO Characteristic: f1f28a13-9725-4636-a073-0666057bd91b
    Properties: READ
    - Read Payload: UTF-8 string: "BUILD <__DATE__> <__TIME__> TAG=V2-AUTOPRESENCE | Name: <devName> | Uptime: <seconds>s"

 5. ENV Characteristic: 4a1b0005-c0ee-47c9-a1e4-0aafa8ee316b
    Properties: READ, NOTIFY
    - Read / Notify Payload (14 bytes):
      * Byte 0: Sensor Valid (0/1)
      * Byte 1..2: Temp (Integer, Decimal)
      * Byte 3..4: Humidity (Integer, Decimal)
      * Byte 5: Master Buzzer (0/1)
      * Byte 6..10: Time & DOW (synced, H, M, S, DOW)
      * Byte 11: Presence Enabled (0/1)
      * Byte 12: Presence State (0=Away/Standby, 1=Present/Connected, 2=Away Countdown)
      * Byte 13: Away Remaining Minutes (0..60)
 ================================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

/*  Minimal Web Bluetooth Type Declarations  */
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

/*  UUID Constants  */
const SERVICE_UUID = "7f781e04-c0ee-47c9-a1e4-0aafa8ee316b";
const CHAR_RELAY_UUID = "385d4ec5-88c3-417e-8aa5-2a70db5d49fa";
const CHAR_LED_UUID = "1814a0cb-9d1f-4212-946a-72e78b64042e";
const CHAR_CONFIG_UUID = "11848579-c357-45cb-bdb2-88f560c11708";
const CHAR_INFO_UUID = "f1f28a13-9725-4636-a073-0666057bd91b";
const CHAR_ENV_UUID = "4a1b0005-c0ee-47c9-a1e4-0aafa8ee316b";

/*  Data Interfaces  */
interface RelayState {
  load: boolean;
  remainingMin: number;
}

interface RelayConfigItem {
  name: string;
  wiring: number; // 0 = Normally Open (NO), 1 = Normally Closed (NC)
  onAnimEnabled: boolean;
  onAnimMode: number;
  onAnimDuration: number;
  offAnimEnabled: boolean;
  offAnimMode: number;
  offAnimDuration: number;
  beepOn?: boolean;
  beepOff?: boolean;
  beepTimerEnd?: boolean;
}

interface LedState {
  mode: number;
  r: number;
  g: number;
  b: number;
  bri: number;
  spd: number;
}

interface ScheduleRule {
  id: number;           // 0..7
  enabled: boolean;
  name: string;
  daysMask: number;     // bit 0=Sun, 1=Mon, ..., 6=Sat (127 = everyday)
  startHour: number;    // 0..23
  startMin: number;     // 0..59
  stopType: number;     // 0=None, 1=DurationMinutes, 2=DirectStopTime
  durationMin: number;  // 1..1440
  stopHour: number;     // 0..23
  stopMin: number;      // 0..59
  targetType: number;   // 0=CH1, 1=CH2, 2=CH3, 3=CH4, 4=All Relays, 5=RGB Strip
  targetAction: number; // For Relay: 1=ON, 0=OFF; For RGB: Mode 0..15
  rgbR: number;
  rgbG: number;
  rgbB: number;
  rgbBri: number;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: "info" | "tx" | "rx" | "warn" | "err";
}

const LED_MODES = [
  { id: 0, label: "Off", desc: "All LEDs Dark" },
  { id: 1, label: "Solid", desc: "Static Color" },
  { id: 2, label: "Breathe", desc: "Fade In & Out" },
  { id: 3, label: "Rainbow", desc: "Full Spectrum Wave" },
  { id: 4, label: "Blink", desc: "Clean Pulse (<3Hz)" },
  { id: 5, label: "Chase Lâ†’R", desc: "Left to Right Trail" },
  { id: 6, label: "Chase Râ†’L", desc: "Right to Left Trail" },
  { id: 7, label: "Color Cycle", desc: "Synchronized Spectrum" },
  { id: 8, label: "Scanner", desc: "Knight Rider Ping-Pong" },
  { id: 9, label: "Sparkle", desc: "Twinkling Pixels" },
  { id: 10, label: "Center Pulse", desc: "Middle Outward Expansion" },
  { id: 11, label: "Dual Chase", desc: "Crossing Light Beams" },
  { id: 12, label: "Wipe Lâ†’R", desc: "Progressive Fill Left" },
  { id: 13, label: "Wipe Râ†’L", desc: "Progressive Fill Right" },
  { id: 14, label: "Fireplace", desc: "Organic Flame Flicker" },
  { id: 15, label: "Aurora", desc: "Two-Tone Ambient Shift" },
];

const RELAY_ANIM_OPTIONS = [
  { id: 1, label: "Fade In-Out / Breathe" },
  { id: 2, label: "Fast Pulse" },
  { id: 3, label: "Wipe Left â†’ Right" },
  { id: 4, label: "Wipe Right â†’ Left" },
  { id: 5, label: "Chase Left â†’ Right" },
  { id: 6, label: "Chase Right â†’ Left" },
  { id: 7, label: "Knight Rider / Scanner" },
  { id: 8, label: "Double Blink" },
  { id: 9, label: "Center Outward Pulse" },
  { id: 10, label: "Rainbow Wave" },
];

const MUSIC_DISCO_MODES = [
  { id: 0, label: "ðŸ•º Disco Party", desc: "Rotating club lights & beat jumps" },
  { id: 1, label: "ðŸ’¥ Bass Burst", desc: "Center-outward explosion on kicks" },
  { id: 2, label: " Neon Strobe", desc: "High-contrast nightclub beat flashes" },
  { id: 3, label: "ðŸŒŠ Rhythm Ripple", desc: "Flowing light wave driven by tempo" },
  { id: 4, label: "âœ¨ Disco Sparkle", desc: "Shimmering random starbursts on beats" },
  { id: 5, label: "ðŸŒˆ Beat Pump", desc: "Color wheel pumping brightness with bass" },
  { id: 6, label: "” Dual Clash", desc: "Beams colliding at center on beat" },
  { id: 7, label: "ðŸŽ¶ Cyber Spectrum", desc: "8-band dancing cyberpunk equalizer" },
  { id: 8, label: "ðŸ”¥ Fire Dance", desc: "Flaring flames on heavy bass/drums" },
  { id: 9, label: "ðŸŽ¯ Solo Beat Sync", desc: "Custom color pulsing to the song" },
];

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
  /*  Component State  */
  const [bluetoothSupported, setBluetoothSupported] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>("smartDesk Controller");
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>("smartDesk Controller");
  const [showAllDevices, setShowAllDevices] = useState<boolean>(false);
  const [climateWidgetMinimized, setClimateWidgetMinimized] = useState<boolean>(false);

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

  const [led, setLed] = useState<LedState>({
    mode: 1,
    r: 0,
    g: 180,
    b: 255,
    bri: 50,
    spd: 5,
  });

  // Dedicated Music Sync State (Independent brightness & 10 Disco Styles)
  const [musicSyncActive, setMusicSyncActive] = useState<boolean>(false);
  const [musicBri, setMusicBri] = useState<number>(85); // Dedicated Music Brightness Cap (0..100%), independent of led.bri
  const [musicSensitivity, setMusicSensitivity] = useState<number>(1.2); // 0.5x to 3.0x
  const [musicSubMode, setMusicSubMode] = useState<number>(0); // 0..9 for the 10 Disco Styles
  const [soloColor, setSoloColor] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 240, b: 255 });
  const [micVolume, setMicVolume] = useState<number>(0); // 0..100% volume for UI level meter
  const [beatPulse, setBeatPulse] = useState<boolean>(false); // UI beat pulse visual indicator

  // Audio Analysis Refs
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
  const connectedRef = useRef<boolean>(connected);
  connectedRef.current = connected;

  // Environmental & Climate State (DHT11 Sensor on GPIO 9)
  const [envData, setEnvData] = useState<{ valid: boolean; tempC: number; humidity: number }>({
    valid: false,
    tempC: 0,
    humidity: 0,
  });

  // Active Buzzer State (Big Buzzer B27 on GPIO 10)
  const [masterBuzzer, setMasterBuzzer] = useState<boolean>(true);

  // ESP32 Internal Real-Time Clock (Synchronized via 0xFB)
  const [espClock, setEspClock] = useState<{
    synced: boolean;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: number;
  }>({
    synced: false,
    hour: 0,
    minute: 0,
    second: 0,
    dayOfWeek: 0,
  });

  // Auto-Connect & Refresh Persistence
  const [lastDeviceDetected, setLastDeviceDetected] = useState<BluetoothDevice | null>(null);

  // Autonomous Day Scheduler Rules (Up to 8 Rules synced to ESP32 NVS)
  const [schedules, setSchedules] = useState<ScheduleRule[]>([
    {
      id: 0,
      enabled: false,
      name: "Morning Desk Power",
      daysMask: 62, // Mon..Fri (2|4|8|16|32)
      startHour: 9,
      startMin: 0,
      stopType: 1, // Duration
      durationMin: 480, // 8 Hours
      stopHour: 17,
      stopMin: 0,
      targetType: 4, // All Relays
      targetAction: 1, // Turn ON
      rgbR: 0,
      rgbG: 180,
      rgbB: 255,
      rgbBri: 50,
    },
    {
      id: 1,
      enabled: false,
      name: "Evening Ambient Strip",
      daysMask: 127, // Everyday
      startHour: 18,
      startMin: 30,
      stopType: 2, // Direct Stop Time
      durationMin: 0,
      stopHour: 23,
      stopMin: 0,
      targetType: 5, // RGB Strip
      targetAction: 15, // Aurora
      rgbR: 255,
      rgbG: 120,
      rgbB: 20,
      rgbBri: 70,
    },
  ]);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRule | null>(null);

  // Presence & Away Subsystem State (Max 10 Devices in ESP32 Flash)
  const [presenceData, setPresenceData] = useState<{
    enabled: boolean;
    state: number; // 0=Away/Standby, 1=Present/Connected, 2=Away Countdown
    remainingMin: number;
  }>({
    enabled: true,
    state: 0,
    remainingMin: 0,
  });

  const [presenceConfig, setPresenceConfig] = useState<{
    enabled: boolean,
    awayDelayMin: number,
    awayRelayMask: number, // Bits 0..3: Relays to turn OFF (0x0F = all 4, 0x00 = none)
    awayRgbOff: boolean,   // true = turn RGB strip OFF, false = leave RGB as is
    arrivalRelayMask: number, // Bits 0..3: Relays to turn ON (0x0F = all 4, 0x00 = none)
    arrivalRgbOn: boolean,    // true = turn RGB strip ON, false = leave RGB as is
    arrivalRgbMode: number,   // 1..15 Mode to activate on arrival
  }>({
    enabled: true,
    awayDelayMin: 5,
    awayRelayMask: 0x0f,
    awayRgbOff: true,
    arrivalRelayMask: 0x0f,
    arrivalRgbOn: true,
    arrivalRgbMode: 1,
  });

  const [clientNickname, setClientNickname] = useState<string>("");
  const [storedClients, setStoredClients] = useState<{ slot: number; valid: boolean; trackPresence: boolean; name: string }[]>([]);
  const [customDelayInput, setCustomDelayInput] = useState<string>("5");
  const [mounted, setMounted] = useState<boolean>(false);
  const [persistedDeviceName, setPersistedDeviceName] = useState<string>("smartDesk Controller");

  // Synchronized References to Avoid Stale Closures during Auto-Connect & Background Writes
  const schedulesRef = useRef<ScheduleRule[]>(schedules);
  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  const presenceConfigRef = useRef(presenceConfig);
  useEffect(() => {
    presenceConfigRef.current = presenceConfig;
  }, [presenceConfig]);

  const connectRef = useRef<(targetDevice?: BluetoothDevice, isAuto?: boolean) => Promise<void>>(null as any);

  // UI Simulation State for Transient Relay Action (Visible directly in browser)
  const [uiAnim, setUiAnim] = useState<{
    active: boolean;
    isTurnOn: boolean;
    mode: number;
    durationMs: number;
    startMs: number;
    label: string;
  } | null>(null);

  const [infoString, setInfoString] = useState<string>("Not connected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewTick, setPreviewTick] = useState<number>(0);

  /*  Hardware / BLE References  */
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const relayCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const ledCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const configCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const infoCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const envCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const ledDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logBoxRef = useRef<HTMLDivElement | null>(null);

  /*  Animation Tick for 8-Dot Visualizer  */
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewTick((prev) => (prev + 1) % 720);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Handle expiration of UI transient animation
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

  /*  Logging Helper  */
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

  /*  Check Web Bluetooth Support & Auto-Connect on Mount  */
  useEffect(() => {
    // 1. Load saved configs, schedules & presence from localStorage
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smartdesk_last_device_name");
      if (savedName) setPersistedDeviceName(savedName);
    }
    if (typeof window !== "undefined") {
      try {
        const savedScheds = localStorage.getItem("smartdesk_schedules");
        if (savedScheds) {
          const parsed = JSON.parse(savedScheds);
          setSchedules(parsed);
          schedulesRef.current = parsed;
        }
        const savedPres = localStorage.getItem("smartdesk_presence_config");
        if (savedPres) {
          const parsedPres = JSON.parse(savedPres);
          setPresenceConfig(parsedPres);
          presenceConfigRef.current = parsedPres;
        }
        const savedNick = localStorage.getItem("smartdesk_client_nickname");
        if (savedNick) {
          setClientNickname(savedNick);
        } else {
          const defaultNick = typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
            ? "Windows PC"
            : typeof navigator !== "undefined" && navigator.userAgent.includes("Android")
            ? "Android Phone"
            : "My Device";
          setClientNickname(defaultNick);
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // Gracefully disconnect GATT before page reload to avoid Windows BLE stack driver hangs
    const onCleanTeardown = () => {
      if (deviceRef.current?.gatt?.connected) {
        try {
          deviceRef.current.gatt.disconnect();
        } catch (_) {}
      }
    };
    window.addEventListener("beforeunload", onCleanTeardown);
    window.addEventListener("pagehide", onCleanTeardown);

    const nav = typeof window !== "undefined" ? (window.navigator as NavigatorWithBluetooth) : null;
    if (!nav?.bluetooth) {
      setBluetoothSupported(false);
      addLog("Web Bluetooth API is NOT supported in this browser. Please use Chrome/Edge on HTTPS or localhost.", "err");
      return () => {
        window.removeEventListener("beforeunload", onCleanTeardown);
        window.removeEventListener("pagehide", onCleanTeardown);
      };
    }

    addLog("Web Bluetooth initialized. Ready for SmartDesk V2 connection.", "info");

    // 2. Check for previously paired devices with 600ms grace period to let Windows reset GATT channel
    let timeoutId: NodeJS.Timeout;
    const checkPersistentDevices = async () => {
      try {
        if ("getDevices" in nav.bluetooth!) {
          const devices = await (nav.bluetooth as any).getDevices();
          if (devices && devices.length > 0) {
            const lastId = localStorage.getItem("smartdesk_last_device_id");
            const matched = devices.find((d: BluetoothDevice) => d.id === lastId) || devices[0];
            if (matched) {
              setLastDeviceDetected(matched);
              addLog(`Found paired device '${matched.name || "smartDesk Controller"}'. Attempting auto-reconnect...`, "info");
              
              // 1. Try waking Windows radio using watchAdvertisements if supported
              if ("watchAdvertisements" in matched) {
                try {
                  const abortController = new AbortController();
                  (matched as any).watchAdvertisements({ signal: abortController.signal }).catch(() => {});
                  matched.addEventListener(
                    "advertisementreceived",
                    async () => {
                      addLog("SmartDesk advertising beacon detected! Connecting...", "info");
                      try { abortController.abort(); } catch (_) {}
                      await connectRef.current(matched, true);
                    },
                    { once: true }
                  );
                } catch (_) {}
              }

              // 2. Attempt background auto-connect with backoff
              let connectedOk = false;
              for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                  await connectRef.current(matched, true);
                  if (deviceRef.current?.gatt?.connected) {
                    connectedOk = true;
                    break;
                  }
                } catch (autoErr) {
                  if (attempt < 2) {
                    await sleep(400);
                  }
                }
              }

              if (!connectedOk) {
                addLog("Auto-reconnect ready: tap ' 1-Click Connect' to resume session.", "info");
                // Fallback: 1st tap anywhere auto-connects
                const onOneTouchConnect = async () => {
                  window.removeEventListener("pointerdown", onOneTouchConnect);
                  if (!deviceRef.current?.gatt?.connected) {
                    try {
                      await connectRef.current(matched, true);
                    } catch (_) {}
                  }
                };
                window.addEventListener("pointerdown", onOneTouchConnect, { once: true });
              }
            }
          }
        }
      } catch (err) {
        // getDevices permission check
      }
    };

    timeoutId = setTimeout(() => {
      checkPersistentDevices();
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("beforeunload", onCleanTeardown);
      window.removeEventListener("pagehide", onCleanTeardown);
    };
  }, [addLog]);

  /*  Serialized Write Queue  */
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

  /*  Trigger UI Animation on Relay Switch  */
  const triggerUiAnimation = useCallback((idx: number, isTurnOn: boolean) => {
    const cfg = configs[idx];
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
  }, [configs]);

  /*  Parse Relay Characteristic Payload (12 Bytes)  */
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

          // Detect state change from notification and trigger UI simulation
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

  /*  Parse LED Characteristic Payload (6 Bytes)  */
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

  /*  Parse Config Characteristic Payload (125 Bytes)  */
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

      // Parse Device Name from offset 100 if present
      if (dataView.byteLength >= 102) {
        const devNameLen = Math.min(20, dataView.getUint8(100));
        if (devNameLen > 0) {
          const devNameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset + 101, devNameLen);
          const devName = decoder.decode(devNameBytes).replace(/\0/g, "").trim();
          if (devName) {
            setDeviceName(devName);
            setRenameInput(devName);
          }
        }
      }

      // Parse Presence Config from offset 125
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

      // Parse 10 Known Paired Devices from offset 135
      if (dataView.byteLength >= 155) {
        const clients: { slot: number; valid: boolean; trackPresence: boolean; name: string }[] = [];
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

  /*  Parse Environment, Buzzer & Clock (11 Bytes)  */
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
        const presState = dataView.getUint8(12); // 0=Away/Standby, 1=Present/Connected, 2=Away Countdown
        const awayRemMin = dataView.getUint8(13);
        setPresenceData({
          enabled: presEnabled,
          state: presState,
          remainingMin: awayRemMin,
        });
      }
    },
    []
  );

  /*  Synchronize Real-Time Clock to ESP32 (0xFB)  */
  const syncRealTime = useCallback(() => {
    if (!configCharRef.current) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const dow = now.getDay(); // 0=Sun..6=Sat
    const payload = new Uint8Array([0xFB, h, m, s, dow]);

    enqueueWrite("Sync Clock to ESP32", async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Sync Real-Time: ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}, Day=${DAYS_OF_WEEK[dow]})`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      setEspClock({ synced: true, hour: h, minute: m, second: s, dayOfWeek: dow });
    });
  }, [enqueueWrite, addLog]);

  /*  Sync Schedule Rule to ESP32 (0xFA)  */
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
        schedulesRef.current = next;
        if (typeof window !== "undefined") {
          localStorage.setItem("smartdesk_schedules", JSON.stringify(next));
        }
        return next;
      });

      if (configCharRef.current) {
        enqueueWrite(`Sync Schedule Rule ${rule.id + 1}`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Saved Schedule Rule ${rule.id + 1}: ${rule.name})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
    },
    [enqueueWrite, addLog]
  );

  /*  Delete / Disable Schedule Rule (0xF9)  */
  const deleteScheduleRule = useCallback(
    (ruleId: number) => {
      setSchedules((prev) => {
        const next = prev.filter((s) => s.id !== ruleId);
        schedulesRef.current = next;
        if (typeof window !== "undefined") {
          localStorage.setItem("smartdesk_schedules", JSON.stringify(next));
        }
        return next;
      });

      if (configCharRef.current) {
        const payload = new Uint8Array([0xF9, ruleId]);
        enqueueWrite(`Disable Schedule Rule ${ruleId + 1}`, async () => {
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Disabled Schedule Rule ${ruleId + 1})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
    },
    [enqueueWrite, addLog]
  );

  /*  Manual Test Schedule Rule on Hardware (0xF5)  */
  const handleTestScheduleRule = useCallback(
    (ruleId: number, isStart: boolean = true) => {
      if (!configCharRef.current) {
        alert("Connect to SmartDesk first to test schedule rules on hardware!");
        return;
      }
      const payload = new Uint8Array([0xF5, ruleId, isStart ? 1 : 0]);
      enqueueWrite(`Test Schedule Rule ${ruleId + 1}`, async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Manual Test Schedule Rule #${ruleId + 1} - ${isStart ? "TRIGGER START" : "STOP"})`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
      });
    },
    [enqueueWrite, addLog]
  );

  /*  Presence & Away Configuration Handlers  */
  const savePresenceConfig = useCallback(
    (nextCfg: typeof presenceConfig) => {
      setPresenceConfig(nextCfg);
      presenceConfigRef.current = nextCfg;
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
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Presence ${nextCfg.enabled ? "ENABLED" : "DISABLED"}, Delay: ${nextCfg.awayDelayMin}m, AwayRelays: 0x${nextCfg.awayRelayMask.toString(16)}, AwayRGB: ${nextCfg.awayRgbOff ? "OFF" : "KEEP"}, ArrRelays: 0x${nextCfg.arrivalRelayMask.toString(16)}, ArrRGB: ${nextCfg.arrivalRgbOn ? "ON" : "KEEP"})`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
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
          addLog(`[TX CONFIG] ${bytesToHex(payload)} (Registered Client Name: "${trimmed}")`, "tx");
          await configCharRef.current?.writeValueWithResponse(payload);
        });
      }
    },
    [enqueueWrite, addLog]
  );

  const clearKnownClients = useCallback(() => {
    if (!confirm("Are you sure you want to clear all 10 stored paired device slots from ESP32 flash?")) return;
    if (configCharRef.current) {
      const payload = new Uint8Array([0xF6]);
      enqueueWrite("Clear Known Clients", async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Cleared all stored paired clients from ESP32 flash)`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
      });
    }
  }, [enqueueWrite, addLog]);

  const toggleDevicePresenceTracking = useCallback(
    (slotIdx: number, currentTracked: boolean) => {
      if (!configCharRef.current) return;
      const nextTrack = currentTracked ? 0 : 1;
      const payload = new Uint8Array([0xF4, slotIdx, nextTrack]);
      enqueueWrite(`Set Slot ${slotIdx + 1} Tracking`, async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Set Device Slot #${slotIdx + 1} Tracking: ${nextTrack ? "TRACKED" : "EXCLUDED"})`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
        setStoredClients((prev) =>
          prev.map((c) => (c.slot === slotIdx ? { ...c, trackPresence: nextTrack === 1 } : c))
        );
      });
    },
    [enqueueWrite, addLog]
  );

  const handleAddNewSchedule = useCallback(() => {
    const nextId = [0, 1, 2, 3, 4, 5, 6, 7].find((id) => !schedules.some((s) => s.id === id)) ?? schedules.length;
    if (nextId >= 8) {
      alert("Maximum 8 schedule rules allowed on ESP32 flash!");
      return;
    }
    setEditingSchedule({
      id: nextId,
      enabled: true,
      name: `Schedule Rule ${nextId + 1}`,
      daysMask: 127,
      startHour: 9,
      startMin: 0,
      stopType: 1,
      durationMin: 120,
      stopHour: 17,
      stopMin: 0,
      targetType: 0,
      targetAction: 1,
      rgbR: 0,
      rgbG: 180,
      rgbB: 255,
      rgbBri: 50,
    });
    setShowScheduleModal(true);
  }, [schedules]);

  /*  Master Buzzer Toggle (0xFD)  */
  const toggleMasterBuzzer = useCallback(() => {
    if (!configCharRef.current) return;
    const nextState = !masterBuzzer;
    const payload = new Uint8Array([0xFD, nextState ? 1 : 0]);
    enqueueWrite(`Toggle Buzzer -> ${nextState ? "ON" : "MUTED"}`, async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Master Active Buzzer: ${nextState ? "ON" : "MUTED"})`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      setMasterBuzzer(nextState);
    });
  }, [masterBuzzer, enqueueWrite, addLog]);

  /*  Save Individual Relay Buzzer Config (0xFC)  */
  const saveRelayBuzzerConfig = useCallback(
    (idx: number, beepOn: boolean, beepOff: boolean, beepTimerEnd: boolean) => {
      if (!configCharRef.current) return;
      const payload = new Uint8Array([
        0xFC,
        idx,
        beepOn ? 1 : 0,
        beepOff ? 1 : 0,
        beepTimerEnd ? 1 : 0,
      ]);
      enqueueWrite(`Save Relay ${idx + 1} Buzzer Settings`, async () => {
        addLog(`[TX CONFIG] ${bytesToHex(payload)} (Relay ${idx + 1} Buzzer: On=${beepOn} Off=${beepOff} End=${beepTimerEnd})`, "tx");
        await configCharRef.current?.writeValueWithResponse(payload);
      });
    },
    [enqueueWrite, addLog]
  );

  /*  Disconnect Cleanup  */
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

  /*  Connect Flow (One-by-One GATT Setup)  */
  const handleConnect = async (targetDevice?: BluetoothDevice, isAuto: boolean = false) => {
    const nav = window.navigator as NavigatorWithBluetooth;
    if (!nav.bluetooth) {
      if (!isAuto) alert("Web Bluetooth is not supported in this browser!");
      return;
    }

    try {
      setConnecting(true);

      let dev: BluetoothDevice;
      if (targetDevice) {
        addLog(`Step 1: Connecting directly to pre-authorized device '${targetDevice.name}'...`, "info");
        dev = targetDevice;
      } else {
        addLog("Step 1: Requesting Bluetooth device...", "info");
        const reqOptions: RequestDeviceOptions = showAllDevices
          ? {
              acceptAllDevices: true,
              optionalServices: [SERVICE_UUID],
            }
          : {
              filters: [
                { services: [SERVICE_UUID] },
                { namePrefix: "smart" },
                { namePrefix: "Smart" },
                { namePrefix: "sd" },
                { namePrefix: "SD" },
                { namePrefix: "desk" },
                { namePrefix: "Desk" },
                { namePrefix: "controller" },
                { namePrefix: "Controller" },
                ...(deviceName ? [{ name: deviceName }] : []),
              ],
              optionalServices: [SERVICE_UUID],
            };
        dev = await nav.bluetooth.requestDevice(reqOptions);
      }

      deviceRef.current = dev;
      setDeviceName(dev.name || "smartDesk Controller");
      setRenameInput(dev.name || "smartDesk Controller");
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

      let eChar: BluetoothRemoteGATTCharacteristic | null = null;
      try {
        addLog("Step 5e: Acquiring ENV (Climate/Buzzer/Clock) characteristic...", "info");
        eChar = await service.getCharacteristic(CHAR_ENV_UUID);
        envCharRef.current = eChar;
        await sleep(150);
      } catch (err: unknown) {
        addLog("ENV characteristic not found or optional.", "warn");
      }

      // Start notifications: RELAY first, then LED, then ENV
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

      if (eChar) {
        try {
          addLog("Step 6c: Starting notifications on ENV characteristic...", "info");
          await eChar.startNotifications();
          eChar.addEventListener("characteristicvaluechanged", (e: Event) => {
            const target = e.target as BluetoothRemoteGATTCharacteristic;
            if (target.value) parseEnvData(target.value);
          });
          await sleep(150);
        } catch (err: unknown) {
          addLog("Could not start ENV notifications.", "warn");
        }
      }

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

      if (eChar) {
        try {
          const eVal = await eChar.readValue();
          parseEnvData(eVal);
        } catch (err: unknown) {
          // ignore
        }
      }

      // Step 7e: Synchronize Browser Real-Time to ESP32 Clock
      try {
        const now = new Date();
        const timePayload = new Uint8Array([0xFB, now.getHours(), now.getMinutes(), now.getSeconds(), now.getDay()]);
        addLog(`Step 7e: Synchronizing Browser Real-Time (${now.toLocaleTimeString()}) to ESP32...`, "info");
        await cChar.writeValueWithResponse(timePayload);
        setEspClock({ synced: true, hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds(), dayOfWeek: now.getDay() });
      } catch (tErr) {
        addLog("Real-time clock sync optional/skipped.", "warn");
      }

      // Step 7f: Synchronize Active Day Schedules to ESP32
      try {
        const rulesToSync = schedulesRef.current;
        for (const rule of rulesToSync) {
          if (rule.enabled) {
            const schedPayload = new Uint8Array(16);
            schedPayload[0] = 0xFA;
            schedPayload[1] = rule.id;
            schedPayload[2] = 1;
            schedPayload[3] = rule.daysMask;
            schedPayload[4] = rule.startHour;
            schedPayload[5] = rule.startMin;
            schedPayload[6] = rule.stopType;
            if (rule.stopType === 1) {
              schedPayload[7] = rule.durationMin & 0xff;
              schedPayload[8] = (rule.durationMin >> 8) & 0xff;
              schedPayload[9] = 0;
            } else {
              schedPayload[7] = rule.stopHour;
              schedPayload[8] = 0;
              schedPayload[9] = rule.stopMin;
            }
            schedPayload[10] = rule.targetType;
            schedPayload[11] = rule.targetAction;
            schedPayload[12] = rule.rgbR ?? 0;
            schedPayload[13] = rule.rgbG ?? 180;
            schedPayload[14] = rule.rgbB ?? 255;
            schedPayload[15] = rule.rgbBri ?? 50;
            await cChar.writeValueWithResponse(schedPayload);
          }
        }
        addLog(`Step 7f: Synchronized ${rulesToSync.filter((r) => r.enabled).length} active schedule rules to ESP32.`, "info");
      } catch (sErr) {
        addLog("Schedule sync optional/skipped.", "warn");
      }

      // Step 7g: Synchronize Presence & Away Config to ESP32 (0xF8)
      try {
        const pCfg = presenceConfigRef.current;
        const presPayload = new Uint8Array([
          0xF8,
          pCfg.enabled ? 1 : 0,
          pCfg.awayDelayMin & 0xff,
          (pCfg.awayDelayMin >> 8) & 0xff,
          pCfg.awayRelayMask,
          pCfg.awayRgbOff ? 1 : 0,
          pCfg.arrivalRelayMask,
          pCfg.arrivalRgbOn ? 1 : 0,
          pCfg.arrivalRgbMode,
        ]);
        await cChar.writeValueWithResponse(presPayload);
        addLog(`Step 7g: Synchronized Presence Config (Away delay: ${pCfg.awayDelayMin}m, AwayRelays: 0x${pCfg.awayRelayMask.toString(16)}, ArrRelays: 0x${pCfg.arrivalRelayMask.toString(16)}).`, "info");
      } catch (pErr) {
        addLog("Presence config sync optional/skipped.", "warn");
      }

      // Step 7h: Register Client Name for Presence List (0xF7)
      try {
        const nick = localStorage.getItem("smartdesk_client_nickname") || clientNickname || "Web Client";
        const enc = new TextEncoder();
        const nBytes = enc.encode(nick).slice(0, 23);
        const namePayload = new Uint8Array(2 + nBytes.length);
        namePayload[0] = 0xF7;
        namePayload[1] = nBytes.length;
        namePayload.set(nBytes, 2);
        await cChar.writeValueWithResponse(namePayload);
        addLog(`Step 7h: Registered client device name "${nick}" with ESP32.`, "info");
      } catch (nErr) {
        // optional
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("smartdesk_last_device_id", dev.id);
        localStorage.setItem("smartdesk_last_device_name", dev.name || "smartDesk Controller");
      }

      setConnected(true);
      setConnecting(false);
      setLastDeviceDetected(null);
      addLog(">>> CONNECTION FULLY ESTABLISHED & OPERATIONAL! <<<", "info");
    } catch (err: unknown) {
      setConnecting(false);
      setConnected(false);
      const isNotFound = (err as any)?.name === "NotFoundError" || String(err).includes("User cancelled");
      const msg = err instanceof Error ? err.message : String(err);
      if (isNotFound) {
        addLog("Device chooser cancelled by user.", "info");
      } else if (isAuto) {
        // During silent auto-connect, treat as info/warn to prevent Next.js dev overlay
        addLog(`Auto-reconnect standby (${msg})`, "warn");
        console.warn("[BLE Auto-Connect Standby]:", msg);
      } else {
        addLog(`Connection attempt failed: ${msg}`, "err");
        console.error("BLE Connect Sequence Error:", err);
        alert(`[Connection Failed]\n\n${msg}\n\nTips:\n- Ensure ESP32-S3 is powered and running.\n- If Windows was previously paired, ensure Bluetooth is toggled ON.`);
      }
    }
  };
  connectRef.current = handleConnect;

  const handleDisconnect = () => {
    if (deviceRef.current && deviceRef.current.gatt?.connected) {
      addLog("Disconnecting Bluetooth connection...", "info");
      deviceRef.current.gatt.disconnect();
    }
    handleDisconnected();
  };

  /*  Relay Commands  */
  const toggleRelay = (idx: number) => {
    if (!relayCharRef.current) return;
    const nextVal = relays[idx].load ? 0 : 1;
    const payload = new Uint8Array([1, idx, nextVal]);
    // Also trigger UI transient visualizer simulation immediately
    triggerUiAnimation(idx, nextVal === 1);

    enqueueWrite(`Toggle Relay ${idx + 1} -> ${nextVal ? "ON" : "OFF"}`, async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (Set CH${idx + 1} -> ${nextVal ? "ON" : "OFF"})`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
  };

  const setTimer = (idx: number, minutes: number) => {
    if (!relayCharRef.current) return;
    const clamped = Math.max(0, Math.min(1440, minutes));
    const minLo = clamped & 0xff;
    const minHi = (clamped >> 8) & 0xff;
    const payload = new Uint8Array([2, idx, minLo, minHi]);

    if (clamped > 0 && !relays[idx].load) {
      triggerUiAnimation(idx, true);
    }

    enqueueWrite(`Set Timer Relay ${idx + 1} (${clamped}m)`, async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (Timer CH${idx + 1} -> ${clamped}m)`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
  };

  const handleAllOff = () => {
    if (!relayCharRef.current) return;
    const payload = new Uint8Array([3]);
    setUiAnim({
      active: true,
      isTurnOn: false,
      mode: 3, // Wipe
      durationMs: 2000,
      startMs: Date.now(),
      label: "All Relays Turned OFF",
    });
    enqueueWrite("All Relays Off", async () => {
      addLog(`[TX RELAY] ${bytesToHex(payload)} (All Off)`, "tx");
      await relayCharRef.current?.writeValueWithResponse(payload);
    });
  };

  /*  Config Commands  */
  const saveRelayConfig = (
    idx: number,
    wiring: number,
    onEn: boolean,
    onMd: number,
    onDu: number,
    offEn: boolean,
    offMd: number,
    offDu: number,
    newName: string,
    beepOn: boolean = true,
    beepOff: boolean = true,
    beepEnd: boolean = true
  ) => {
    if (!configCharRef.current) return;
    const enc = new TextEncoder();
    const nameBytes = enc.encode(newName.slice(0, 16));
    const payload = new Uint8Array(9 + nameBytes.length);
    payload[0] = idx;
    payload[1] = wiring ? 1 : 0;
    payload[2] = onEn ? 1 : 0;
    payload[3] = onMd;
    payload[4] = onDu;
    payload[5] = offEn ? 1 : 0;
    payload[6] = offMd;
    payload[7] = offDu;
    payload[8] = nameBytes.length;
    payload.set(nameBytes, 9);

    enqueueWrite(`Save Config Relay ${idx + 1}`, async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Save Relay ${idx + 1}: Contact=${wiring ? "NC" : "NO"})`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      setConfigs((prev) => {
        const copy = [...prev];
        copy[idx] = {
          name: newName,
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
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(`smartdesk_relay_bz_${idx}`, JSON.stringify({ beepOn, beepOff, beepEnd }));
        }
        return copy;
      });
      // Synchronize Buzzer Settings (0xFC) to ESP32
      saveRelayBuzzerConfig(idx, beepOn, beepOff, beepEnd);
      alert(`Settings saved for ${newName}!\n\n- Contact Wiring: ${wiring ? "NC (Normally Closed)" : "NO (Normally Open)"}\n- ON RGB Action: ${onEn ? `Enabled (${RELAY_ANIM_OPTIONS.find((a) => a.id === onMd)?.label}, ${onDu}s)` : "Disabled"}\n- OFF RGB Action: ${offEn ? `Enabled (${RELAY_ANIM_OPTIONS.find((a) => a.id === offMd)?.label}, ${offDu}s)` : "Disabled"}\n- Buzzer: ON=${beepOn ? "Beep" : "Off"}, OFF=${beepOff ? "Beep" : "Off"}, TimerEnd=${beepEnd ? "Beep" : "Off"}`);
    });
  };

  const renameDevice = (newName: string) => {
    if (!configCharRef.current) return;
    const clean = newName.trim().slice(0, 20);
    if (!clean) {
      alert("Device name cannot be empty!");
      return;
    }
    const enc = new TextEncoder();
    const nameBytes = enc.encode(clean);
    const payload = new Uint8Array(2 + nameBytes.length);
    payload[0] = 0xfe;
    payload[1] = nameBytes.length;
    payload.set(nameBytes, 2);

    enqueueWrite(`Rename Device -> "${clean}"`, async () => {
      addLog(`[TX CONFIG] ${bytesToHex(payload)} (Rename Device -> "${clean}")`, "tx");
      await configCharRef.current?.writeValueWithResponse(payload);
      setDeviceName(clean);
      setShowRenameModal(false);
      alert(`Bluetooth Device Name successfully updated to: "${clean}"!\n\nSaved to ESP32 NVS. Live BLE advertising updated.`);
    });
  };

  /*  LED Commands  */
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
        const mLabel = LED_MODES.find((m) => m.id === newState.mode)?.label || `Mode ${newState.mode}`;
        addLog(`[TX LED] ${bytesToHex(payload)} (${mLabel} RGB:(${newState.r},${newState.g},${newState.b}) Bri:${newState.bri}% Spd:${newState.spd})`, "tx");
        await ledCharRef.current?.writeValueWithResponse(payload);
      });
    },
    [enqueueWrite, addLog]
  );

  const updateLedDebounced = (patch: Partial<LedState>) => {
    if (patch.mode !== undefined && musicSyncActive) {
      stopMusicSyncRef.current();
    }
    const next = { ...led, ...patch };
    setLed(next);
    if (ledDebounceTimerRef.current) clearTimeout(ledDebounceTimerRef.current);
    ledDebounceTimerRef.current = setTimeout(() => {
      dispatchLedUpdate(next);
    }, 80);
  };

  const applyLedPreset = (preset: { mode: number; r: number; g: number; b: number; bri: number; spd: number }) => {
    if (musicSyncActive) {
      stopMusicSyncRef.current();
    }
    setLed(preset);
    dispatchLedUpdate(preset);
  };

  /*  Music Sync Functions (Microphone Live Audio Reactivity)  */
  const stopMusicSync = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMusicSyncActive(false);
    setMicVolume(0);
    setBeatPulse(false);
    liveBeatValRef.current = 0;
    liveMusicLevelsRef.current = [0, 0, 0, 0, 0, 0, 0, 0];

    // Restore previous normal LED mode and normal brightness!
    if (savedLedBeforeMusicRef.current) {
      const restored = savedLedBeforeMusicRef.current;
      setLed(restored);
      dispatchLedUpdate(restored);
      savedLedBeforeMusicRef.current = null;
      addLog("Microphone listening stopped. Restored previous LED mode & brightness.", "info");
    }
  }, [addLog, dispatchLedUpdate]);

  useEffect(() => {
    stopMusicSyncRef.current = stopMusicSync;
  }, [stopMusicSync]);

  const startMusicSync = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert("Microphone access is not supported in this browser. Please use Google Chrome or Microsoft Edge on HTTPS or localhost:3000.");
      return;
    }

    try {
      // Save current normal LED state before starting Music Sync
      savedLedBeforeMusicRef.current = { ...led };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // 32 frequency bins
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMusicSyncActive(true);
      addLog("ðŸŽ™ Microphone listening started for Music Sync.", "info");

      const bufferLength = analyser.frequencyBinCount; // 32 bins
      const dataArray = new Uint8Array(bufferLength);

      const tickAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // 8 frequency bands
        const sens = musicSensitivityRef.current;
        const rawBands = [
          dataArray[1] || 0, // 0: Sub-bass
          dataArray[2] || 0, // 1: Bass
          Math.round(((dataArray[3] || 0) + (dataArray[4] || 0)) / 2), // 2: Low-mid
          Math.round(((dataArray[5] || 0) + (dataArray[6] || 0)) / 2), // 3: Mid
          Math.round(((dataArray[7] || 0) + (dataArray[8] || 0)) / 2), // 4: Upper-mid
          Math.round(((dataArray[9] || 0) + (dataArray[11] || 0)) / 2), // 5: High-mid
          Math.round(((dataArray[12] || 0) + (dataArray[15] || 0)) / 2), // 6: Presence
          Math.round(((dataArray[16] || 0) + (dataArray[22] || 0)) / 2), // 7: Treble
        ];

        const scaledBands = rawBands.map((v) => Math.min(255, Math.round(v * sens)));
        liveMusicLevelsRef.current = scaledBands;

        // Dynamic beat detection on low frequencies (bass kicks)
        const bassEnergy = Math.max(scaledBands[0], scaledBands[1]);
        bassAvgRef.current = bassAvgRef.current * 0.88 + bassEnergy * 0.12;
        const isBeat = bassEnergy > 1.25 * bassAvgRef.current && bassEnergy > 50;
        const beatVal = Math.min(255, Math.round(bassEnergy));
        liveBeatValRef.current = beatVal;

        let sum = 0;
        for (let i = 0; i < 8; i++) sum += scaledBands[i];
        const avg = Math.round(sum / 8);

        const now = Date.now();
        if (now - lastVolUpdateRef.current >= 60) {
          lastVolUpdateRef.current = now;
          setMicVolume(Math.round((avg / 255) * 100));
          setBeatPulse(isBeat);
        }

        // Throttle BLE write to ~12-14 Hz (~75ms)
        if (connectedRef.current && ledCharRef.current && (now - lastBleMusicWriteMsRef.current >= 75)) {
          lastBleMusicWriteMsRef.current = now;
          const currentBri = musicBriRef.current;
          const currentSub = musicSubModeRef.current;
          const sColor = soloColorRef.current;

          // 15-byte frame: [16, musicBri, subMode, beatVal, r, g, b, b0..b7]
          const payload = new Uint8Array([
            16,
            currentBri,
            currentSub,
            beatVal,
            sColor.r,
            sColor.g,
            sColor.b,
            ...scaledBands,
          ]);
          ledCharRef.current.writeValueWithResponse(payload).catch(() => {});
        }

        animFrameRef.current = requestAnimationFrame(tickAudio);
      };

      animFrameRef.current = requestAnimationFrame(tickAudio);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Microphone access error: ${msg}`, "err");
      alert(`Could not access microphone:\n\n${msg}\n\nPlease allow microphone access in your browser to use Music Sync.`);
      stopMusicSync();
    }
  };

  /*  Hex Color Converter  */
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

  /*  8-Dot Interactive LED Visualizer (Simulates all 16 modes & Relay Transient)  */
  const render8DotPreview = () => {
    const dots = [];
    const t = previewTick;

    // Check if active transient relay animation is overriding the visualizer
    if (uiAnim && uiAnim.active) {
      const elapsed = Date.now() - uiAnim.startMs;
      const progress = Math.min(1.0, elapsed / uiAnim.durationMs);

      // Emerald Green on Turn ON, Crimson Red on Turn OFF
      const baseR = uiAnim.isTurnOn ? 0 : 255;
      const baseG = uiAnim.isTurnOn ? 255 : 35;
      const baseB = uiAnim.isTurnOn ? 120 : 15;

      for (let i = 0; i < 8; i++) {
        let bg = "#18181b";
        let shadow = "none";

        switch (uiAnim.mode) {
          case 1: { // Fade In-Out / Breathe
            const sine = Math.sin(progress * Math.PI);
            bg = `rgba(${baseR}, ${baseG}, ${baseB}, ${Math.max(0.1, sine)})`;
            shadow = `0 0 ${20 * sine}px rgba(${baseR}, ${baseG}, ${baseB}, ${sine})`;
            break;
          }
          case 2: { // Fast Pulse
            const sine = Math.abs(Math.sin(progress * 2.0 * Math.PI));
            bg = `rgba(${baseR}, ${baseG}, ${baseB}, ${sine})`;
            shadow = `0 0 16px rgba(${baseR}, ${baseG}, ${baseB}, ${sine})`;
            break;
          }
          case 3: { // Wipe L->R
            const active = Math.floor(progress * 10);
            if (i <= active) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 14px rgba(${baseR}, ${baseG}, ${baseB}, 0.8)`;
            }
            break;
          }
          case 4: { // Wipe R->L
            const active = Math.floor(progress * 10);
            if (7 - i <= active) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 14px rgba(${baseR}, ${baseG}, ${baseB}, 0.8)`;
            }
            break;
          }
          case 5: { // Chase L->R
            const head = Math.floor(progress * 16) % 8;
            if (i === head) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 16px rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            } else if (i === (head + 7) % 8) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 0.3)`;
            }
            break;
          }
          case 6: { // Chase R->L
            const head = 7 - (Math.floor(progress * 16) % 8);
            if (i === head) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 16px rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            } else if (i === (head + 1) % 8) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 0.3)`;
            }
            break;
          }
          case 7: { // Scanner
            const pos = Math.abs((Math.floor(progress * 28) % 14) - 7);
            if (i === pos) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 16px rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            } else if (Math.abs(i - pos) === 1) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 0.3)`;
            }
            break;
          }
          case 8: { // Double Blink
            const phase = elapsed % 400;
            if (phase < 160) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 16px rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            }
            break;
          }
          case 9: { // Center Pulse
            const rad = Math.floor(progress * 4);
            if (i === 3 - rad || i === 4 + rad) {
              bg = `rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
              shadow = `0 0 16px rgba(${baseR}, ${baseG}, ${baseB}, 1)`;
            }
            break;
          }
          case 10: { // Rainbow
            const hue = (i * 45 + progress * 360) % 360;
            bg = `hsl(${hue}, 100%, 50%)`;
            shadow = `0 0 14px ${bg}`;
            break;
          }
          default:
            bg = `rgba(${baseR}, ${baseG}, ${baseB}, 0.8)`;
            break;
        }

        dots.push(
          <div
            key={i}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-zinc-600 transition-all duration-75"
            style={{ backgroundColor: bg, boxShadow: shadow }}
          />
        );
      }
      return dots;
    }

    // Check if Music Sync is active (10 Disco Styles Live Simulation)
    if (musicSyncActive) {
      const levels = liveMusicLevelsRef.current;
      const alpha = Math.max(0.15, musicBri / 100);
      const beat = liveBeatValRef.current;
      const normBeat = beat / 255; // 0.0 .. 1.0

      for (let i = 0; i < 8; i++) {
        let bg = "#18181b";
        let shadow = "none";

        switch (musicSubMode) {
          case 0: { // 0. ðŸ•º Disco Party: Rotating party hues jumping on beats
            const shift = (t * 6 + (beat > 120 ? 120 : 0)) % 360;
            const hue = (shift + i * 45) % 360;
            const bBri = Math.max(0.2, normBeat * alpha);
            bg = `hsl(${hue}, 100%, ${Math.min(65, 30 + bBri * 35)}%)`;
            shadow = `0 0 ${Math.round(20 * bBri)}px hsl(${hue}, 100%, 50%)`;
            break;
          }

          case 1: { // 1. ðŸ’¥ Bass Burst: Center 2 LEDs (3 & 4) explode outward
            const dist = i < 4 ? 3 - i : i - 4;
            const radius = Math.floor(normBeat * 4);
            if (dist <= radius) {
              const fade = Math.max(0.1, (1 - dist / 4) * normBeat * alpha);
              const col = dist === 0 ? "255, 0, 180" : "0, 240, 255";
              bg = `rgba(${col}, ${fade})`;
              shadow = `0 0 ${Math.round(18 * fade)}px rgba(${col}, 0.9)`;
            }
            break;
          }

          case 2: { // 2.  Neon Strobe: High-contrast nightclub flash on beats
            if (beat > 120) {
              bg = `rgba(245, 250, 255, ${alpha})`;
              shadow = `0 0 24px rgba(245, 250, 255, 1)`;
            } else {
              const dim = Math.max(0.05, normBeat * 0.25 * alpha);
              bg = `rgba(130, 0, 255, ${dim})`;
              shadow = `0 0 8px rgba(130, 0, 255, ${dim})`;
            }
            break;
          }

          case 3: { // 3. ðŸŒŠ Rhythm Ripple: Flowing light wave driven by tempo
            const head = Math.floor((t * (0.2 + normBeat * 0.5)) % 8);
            const diff = Math.abs(i - head);
            const rippleBri = diff === 0 ? alpha : diff === 1 ? alpha * 0.5 : alpha * 0.15;
            const hue = (190 + i * 20) % 360; // Cyan -> Blue -> Purple
            bg = `hsl(${hue}, 100%, ${Math.min(65, 25 + rippleBri * 40)}%)`;
            shadow = `0 0 ${Math.round(16 * rippleBri)}px hsl(${hue}, 100%, 50%)`;
            break;
          }

          case 4: { // 4. âœ¨ Disco Sparkle: Shimmering random starbursts on beats & treble
            const hi = (levels[5] + levels[6] + levels[7]) / 3;
            const isSparkle = levels[i] > 110 || (hi > 90 && ((t + i * 3) % 4 === 0));
            if (isSparkle) {
              const sparkHue = (i * 70 + t * 25) % 360;
              bg = `hsl(${sparkHue}, 100%, 65%)`;
              shadow = `0 0 18px hsl(${sparkHue}, 100%, 50%)`;
            } else if (normBeat > 0.3) {
              bg = `rgba(70, 0, 140, ${alpha * 0.2})`;
            }
            break;
          }

          case 5: { // 5. ðŸŒˆ Beat Pump: Color wheel pumping brightness to the bass
            const hue = (t * 4 + i * 45) % 360;
            const pump = Math.max(0.18, normBeat * alpha);
            bg = `hsl(${hue}, 100%, ${Math.min(65, 25 + pump * 40)}%)`;
            shadow = `0 0 ${Math.round(20 * pump)}px hsl(${hue}, 100%, 50%)`;
            break;
          }

          case 6: { // 6. ” Dual Clash: Beams colliding at center on beat
            const pos = Math.floor(normBeat * 4);
            const isCyan = i <= pos;
            const isMagenta = (7 - i) <= pos;
            if (pos >= 3 && (i === 3 || i === 4)) {
              bg = `rgba(255, 255, 255, ${alpha})`;
              shadow = `0 0 20px rgba(255, 255, 255, 1)`;
            } else if (isCyan && isMagenta) {
              bg = `rgba(255, 255, 255, ${alpha * 0.8})`;
              shadow = `0 0 14px white`;
            } else if (isCyan) {
              bg = `rgba(0, 255, 200, ${alpha})`;
              shadow = `0 0 14px rgba(0, 255, 200, 0.8)`;
            } else if (isMagenta) {
              bg = `rgba(255, 0, 120, ${alpha})`;
              shadow = `0 0 14px rgba(255, 0, 120, 0.8)`;
            }
            break;
          }

          case 7: { // 7. ðŸŽ¶ Cyber Spectrum: 8-band dancing cyberpunk equalizer
            const lvl = levels[i] || 0;
            const intensity = (lvl / 255) * alpha;
            if (intensity > 0.05) {
              const hue = (260 + i * 35) % 360;
              bg = `hsl(${hue}, 100%, ${Math.min(65, 25 + intensity * 45)}%)`;
              shadow = `0 0 ${Math.round(18 * intensity)}px hsl(${hue}, 100%, 50%)`;
            }
            break;
          }

          case 8: { // 8. ðŸ”¥ Fire Dance: Flames flaring into white-hot peaks
            const fVal = Math.max(levels[i] || 0, Math.round(normBeat * 200));
            const intensity = (fVal / 255) * alpha;
            if (intensity > 0.7) {
              bg = `rgba(255, 240, 170, ${intensity})`;
              shadow = `0 0 20px rgba(255, 220, 100, 1)`;
            } else if (intensity > 0.35) {
              bg = `rgba(255, 120, 0, ${intensity})`;
              shadow = `0 0 14px rgba(255, 100, 0, 0.8)`;
            } else if (intensity > 0.08) {
              bg = `rgba(220, 25, 0, ${intensity})`;
              shadow = `0 0 10px rgba(200, 20, 0, 0.5)`;
            }
            break;
          }

          case 9: { // 9. ðŸŽ¯ Solo Beat Sync: User's custom color pulsing & breathing to the song
            const pulse = Math.max(0.12, normBeat * alpha);
            bg = `rgba(${soloColor.r}, ${soloColor.g}, ${soloColor.b}, ${pulse})`;
            shadow = `0 0 ${Math.round(22 * pulse)}px rgba(${soloColor.r}, ${soloColor.g}, ${soloColor.b}, 0.9)`;
            break;
          }

          default:
            bg = "#18181b";
            break;
        }

        dots.push(
          <div
            key={i}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-zinc-600 transition-all duration-75"
            style={{ backgroundColor: bg, boxShadow: shadow }}
          />
        );
      }
      return dots;
    }

    // Standard LED Visualizer (Normal Modes 0..15)
    for (let i = 0; i < 8; i++) {
      let bg = "#18181b";
      let shadow = "none";
      const alpha = Math.max(0.15, led.bri / 100);

      if (led.mode === 0 || led.bri === 0) {
        bg = "#18181b";
      } else if (led.mode === 1) { // Solid
        bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
        shadow = `0 0 12px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.8})`;
      } else if (led.mode === 2) { // Breathe
        const sine = (Math.sin((t * 0.1) * (led.spd * 0.3)) + 1) * 0.5;
        const bBri = alpha * sine;
        bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${Math.max(0.05, bBri)})`;
        shadow = `0 0 ${16 * sine}px rgba(${led.r}, ${led.g}, ${led.b}, ${bBri})`;
      } else if (led.mode === 3) { // Rainbow Wave
        const hue = ((i * 45) + (t * 5)) % 360;
        bg = `hsl(${hue}, 100%, ${Math.max(25, Math.min(60, led.bri * 0.6))}%)`;
        shadow = `0 0 10px ${bg}`;
      } else if (led.mode === 4) { // Blink
        const on = (t % 12) < 6;
        if (on) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
          shadow = `0 0 12px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
        }
      } else if (led.mode === 5) { // Chase L->R
        const head = Math.floor((t * (led.spd * 0.2)) % 8);
        if (i === head) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
          shadow = `0 0 14px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
        } else if (i === (head + 7) % 8) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.3})`;
        }
      } else if (led.mode === 6) { // Chase R->L
        const head = 7 - Math.floor((t * (led.spd * 0.2)) % 8);
        if (i === head) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
          shadow = `0 0 14px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
        } else if (i === (head + 1) % 8) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.3})`;
        }
      } else if (led.mode === 7) { // Color Cycle
        const hue = (t * 4) % 360;
        bg = `hsl(${hue}, 95%, ${Math.max(25, Math.min(60, led.bri * 0.6))}%)`;
        shadow = `0 0 10px ${bg}`;
      } else if (led.mode === 8) { // Scanner
        const pos = Math.abs((Math.floor(t * 0.25) % 14) - 7);
        if (i === pos) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
          shadow = `0 0 14px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})`;
        } else if (Math.abs(i - pos) === 1) {
          bg = `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.25})`;
        }
      } else if (led.mode === 9) { // Sparkle
        const isTwinkle = ((t + i * 3) % 7) === 0;
        bg = isTwinkle ? `rgba(255, 255, 255, ${alpha})` : `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.25})`;
        shadow = isTwinkle ? `0 0 12px white` : "none";
      } else if (led.mode === 10) { // Center Pulse
        const rad = Math.floor(t * 0.2) % 4;
        const active = i === (3 - rad) || i === (4 + rad);
        bg = active ? `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})` : `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha * 0.2})`;
        shadow = active ? `0 0 12px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})` : "none";
      } else if (led.mode === 11) { // Dual Chase
        const p1 = Math.floor(t * 0.25) % 8;
        const p2 = 7 - p1;
        const active = i === p1 || i === p2;
        bg = active ? `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})` : "#18181b";
        shadow = active ? `0 0 12px rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})` : "none";
      } else if (led.mode === 12) { // Wipe L->R
        const cycle = Math.floor(t * 0.2) % 16;
        const active = cycle < 8 ? i <= cycle : i >= (cycle - 8);
        bg = active ? `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})` : "#18181b";
      } else if (led.mode === 13) { // Wipe R->L
        const cycle = Math.floor(t * 0.2) % 16;
        const active = cycle < 8 ? (7 - i) <= cycle : (7 - i) >= (cycle - 8);
        bg = active ? `rgba(${led.r}, ${led.g}, ${led.b}, ${alpha})` : "#18181b";
      } else if (led.mode === 14) { // Fire
        const f = 0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.5);
        bg = `rgba(255, ${Math.floor(60 + f * 40)}, 10, ${alpha * (0.6 + f * 0.4)})`;
        shadow = `0 0 10px rgba(255, 80, 0, 0.5)`;
      } else if (led.mode === 15) { // Aurora
        const wave = (Math.sin(t * 0.08 + i * 0.7) + 1) * 0.5;
        const hue = 150 + wave * 90;
        bg = `hsl(${hue}, 100%, ${Math.max(20, Math.min(55, led.bri * 0.55))}%)`;
        shadow = `0 0 10px ${bg}`;
      }

      dots.push(
        <div
          key={i}
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-zinc-600 transition-all duration-150"
          style={{ backgroundColor: bg, boxShadow: shadow }}
        />
      );
    }
    return dots;
  };

  /*  Render Main App UI  */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-3 sm:p-6 lg:p-8 flex flex-col items-center select-none">
      <div className="w-full max-w-5xl flex flex-col gap-6">

        {/*  AUTO-RECONNECT BANNER  */}
        {!connected && (
          <div className="bg-gradient-to-r from-cyan-950 via-zinc-900 to-cyan-950 border border-cyan-500/70 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shadow-cyan-950/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse"></span>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Target SmartDesk Controller:</span>
                  <span className="text-cyan-300 font-mono underline font-bold" suppressHydrationWarning>{mounted ? (lastDeviceDetected?.name || persistedDeviceName) : "smartDesk Controller"}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Click to connect! On Windows Chrome, enable <code className="text-cyan-400 bg-zinc-950 px-1 py-0.5 rounded">chrome://flags/#enable-web-bluetooth-new-permissions-backend</code> to allow automatic zero-dialog reconnect across refreshes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (lastDeviceDetected) {
                  try {
                    await handleConnect(lastDeviceDetected, false);
                    if (deviceRef.current?.gatt?.connected) return;
                  } catch (_) {}
                }
                // Fallback to opening chooser if direct connect failed
                await handleConnect(undefined, false);
              }}
              disabled={connecting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/30 cursor-pointer whitespace-nowrap"
            >
              {connecting ? "Connecting..." : " 1-Click Connect"}
            </button>
          </div>
        )}

        {/*  HEADER  */}
        <header className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-3">
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

              {connected && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameInput(deviceName);
                      setShowRenameModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold border border-zinc-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    title="Change Bluetooth Device Name"
                  >
                    âœ Rename
                  </button>

                  <button
                    type="button"
                    onClick={toggleMasterBuzzer}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                      masterBuzzer
                        ? "bg-amber-950/70 border-amber-600 text-amber-300 hover:bg-amber-900/80"
                        : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
                    }`}
                    title="Active Buzzer B27 (GPIO 10) Master Toggle"
                  >
                    {masterBuzzer ? "ðŸ”Š Buzzer ON" : "ðŸ”‡ Muted"}
                  </button>

                  {envData.valid && (
                    <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700 text-xs font-mono text-emerald-300">
                      <span>ðŸŒ¡ {envData.tempC.toFixed(1)}Â°C</span>
                      <span className="text-zinc-600"></span>
                      <span>ðŸ’§ {envData.humidity.toFixed(0)}%</span>
                    </div>
                  )}

                  {espClock.synced && (
                    <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700 text-xs font-mono text-cyan-300" title="ESP32 Autonomous Real-Time Clock">
                      <span>ðŸ•’</span>
                      <span>{String(espClock.hour).padStart(2, "0")}:{String(espClock.minute).padStart(2, "0")}:{String(espClock.second).padStart(2, "0")}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              ESP32-S3 Controller  16 LED Modes  Auto-Restore Relay Actions  Configurable NO/NC Contacts
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {!connected && (
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 cursor-pointer select-none px-1">
                <input
                  type="checkbox"
                  checked={showAllDevices}
                  onChange={(e) => setShowAllDevices(e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
                />
                <span>Show all nearby Bluetooth devices</span>
              </label>
            )}

            <div className="flex items-center gap-3">
              {!connected ? (
                <button
                  type="button"
                  onClick={() => handleConnect()}
                  disabled={connecting || !bluetoothSupported}
                  className="flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
                >
                  {connecting ? "Connecting..." : " Connect SmartDesk"}
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
                ðŸ›‘ All OFF
              </button>
            </div>
          </div>
        </header>

        {/*  RENAME DEVICE MODAL  */}
        {showRenameModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>âœ Rename Bluetooth Device</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="text-zinc-400 hover:text-white font-mono text-sm px-2 py-1 rounded"
                >
                  âœ•
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Set a custom Bluetooth name for your desk controller (max 20 characters). This updates both the live BLE advertising and saves permanently to ESP32 NVS flash.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Bluetooth Device Name</label>
                <input
                  type="text"
                  maxLength={20}
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="smartDesk Controller"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] font-mono text-zinc-500 text-right">{renameInput.length} / 20 chars</span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => renameDevice(renameInput)}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
                >
                  Save New Name
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  BROWSER SUPPORT ALERT  */}
        {!bluetoothSupported && (
          <div className="bg-red-950/70 border border-red-700 text-red-200 p-4 rounded-xl text-sm flex flex-col gap-1">
            <span className="font-bold">  Web Bluetooth Not Available</span>
            <span>
              Your browser does not expose <code>navigator.bluetooth</code>. Please open this page in Google Chrome or
              Microsoft Edge over <code>http://localhost:3000</code> or HTTPS.
            </span>
          </div>
        )}

        {/*  4 RELAY CARDS  */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-mono font-bold tracking-wider text-zinc-400 uppercase">
              1. Relays, NO/NC Contacts, Custom Timers &amp; RGB Actions (CH1..CH4)
            </h2>
            <span className="text-xs text-zinc-500 font-mono">1 min to 24 hrs Timers</span>
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
                onSaveConfig={(wiring, onEn, onMd, onDu, offEn, offMd, offDu, name, bzOn, bzOff, bzEnd) =>
                  saveRelayConfig(idx, wiring, onEn, onMd, onDu, offEn, offMd, offDu, name, bzOn, bzOff, bzEnd)
                }
              />
            ))}
          </div>
        </section>

        {/* 2. AUTONOMOUS REAL-TIME DAY SCHEDULER (ESP32 NVS) */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ðŸ“… 2. Autonomous Day Scheduler</span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                  ESP32 Real-Time Clock &amp; NVS
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rules persist in ESP32 flash memory and execute 24/7 autonomously even when phone/PC is disconnected.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-cyan-300">
                <span>ðŸ•’</span>
                <span>
                  {espClock.synced
                    ? `${String(espClock.hour).padStart(2, "0")}:${String(espClock.minute).padStart(2, "0")}:${String(espClock.second).padStart(2, "0")} (${DAYS_OF_WEEK[espClock.dayOfWeek]})`
                    : "Clock Unsynced"}
                </span>
                {espClock.synced && <span className="text-[10px] text-emerald-400 font-bold">âœ“</span>}
              </div>

              <button
                type="button"
                onClick={syncRealTime}
                disabled={!connected}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-cyan-400 text-xs font-mono font-semibold border border-zinc-700 transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                title="Sync ESP32 Clock to Current Browser Time"
              >
                â± Sync Clock
              </button>

              <button
                type="button"
                onClick={handleAddNewSchedule}
                disabled={schedules.length >= 8}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/50 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                âž• Add Rule
              </button>
            </div>
          </div>

          {/* Schedule Rules Grid */}
          {schedules.length === 0 ? (
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
              <span className="text-3xl">ðŸ“…</span>
              <p className="text-sm font-semibold text-zinc-300">No autonomous schedules configured yet</p>
              <p className="text-xs text-zinc-500 max-w-md">
                Create scheduled rules to automatically power your desk appliances, turn relays on/off, or trigger ambient WS2812B lighting at specific times of day.
              </p>
              <button
                type="button"
                onClick={handleAddNewSchedule}
                className="mt-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Create First Schedule Rule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((rule) => {
                const isRelay = rule.targetType < 5;
                const targetName =
                  rule.targetType < 4
                    ? `${configs[rule.targetType]?.name || `Relay ${rule.targetType + 1}`} (CH${rule.targetType + 1})`
                    : rule.targetType === 4
                    ? "All Relays (CH1..CH4)"
                    : "WS2812B RGB Strip (GPIO 8)";

                const actionText = isRelay
                  ? rule.targetAction === 1
                    ? "Turn LOAD ON"
                    : "Turn LOAD OFF"
                  : `Mode: ${LED_MODES.find((m) => m.id === rule.targetAction)?.label || `Mode ${rule.targetAction}`} (${rule.rgbBri}% Bri)`;

                return (
                  <div
                    key={rule.id}
                    className={`bg-zinc-950/80 border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all ${
                      rule.enabled
                        ? "border-cyan-500/60 shadow-[0_0_16px_rgba(6,182,212,0.1)]"
                        : "border-zinc-800/80 opacity-70"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{rule.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Rule #{rule.id + 1}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400 mt-0.5">
                          Target: <strong className="text-zinc-200">{targetName}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => saveScheduleRule({ ...rule, enabled: !rule.enabled })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border transition-all cursor-pointer ${
                          rule.enabled
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }`}
                      >
                        {rule.enabled ? "ACTIVE" : "PAUSED"}
                      </button>
                    </div>

                    {/* Action & Timing Badge */}
                    <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800/80 flex flex-col gap-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Action:</span>
                        <span className={`font-bold ${isRelay ? (rule.targetAction === 1 ? "text-emerald-400" : "text-rose-400") : "text-cyan-400"}`}>
                          {actionText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Start Time:</span>
                        <span className="text-zinc-200 font-bold">
                          {String(rule.startHour).padStart(2, "0")}:{String(rule.startMin).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Stop Condition:</span>
                        <span className="text-amber-300">
                          {rule.stopType === 1
                            ? `â³ Duration: ${Math.floor(rule.durationMin / 60)}h ${rule.durationMin % 60}m`
                            : rule.stopType === 2
                            ? `ðŸ›‘ Stops at ${String(rule.stopHour).padStart(2, "0")}:${String(rule.stopMin).padStart(2, "0")}`
                            : "â™¾ Continuous Run"}
                        </span>
                      </div>
                    </div>

                    {/* Active Days Pill Row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        {DAYS_OF_WEEK.map((day, dIdx) => {
                          const active = Boolean(rule.daysMask & (1 << dIdx));
                          return (
                            <span
                              key={dIdx}
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                                active
                                  ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/60"
                                  : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                              }`}
                            >
                              {day.charAt(0)}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestScheduleRule(rule.id, true)}
                          title="Trigger this schedule rule action immediately on ESP32 hardware"
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-950/60 text-emerald-400 text-xs font-mono transition-all active:scale-95 cursor-pointer"
                        >
                          â–¶ Test
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSchedule({ ...rule });
                            setShowScheduleModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-cyan-400 text-xs font-mono transition-all active:scale-95 cursor-pointer"
                        >
                          âœ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteScheduleRule(rule.id)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-950/60 text-rose-400 text-xs font-mono transition-all active:scale-95 cursor-pointer"
                        >
                          ðŸ—‘
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/*  SCHEDULE EDIT / CREATE MODAL  */}
        {showScheduleModal && editingSchedule && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 my-8">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>ðŸ“… Configure Autonomous Schedule Rule #{editingSchedule.id + 1}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="text-zinc-400 hover:text-white font-mono text-sm px-2 py-1 rounded cursor-pointer"
                >
                  âœ•
                </button>
              </div>

              {/* Rule Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Rule Name</label>
                <input
                  type="text"
                  maxLength={24}
                  value={editingSchedule.name}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, name: e.target.value })}
                  placeholder="e.g. Work Hours Desk Power"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Target & Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Target Device</label>
                  <select
                    value={editingSchedule.targetType}
                    onChange={(e) => {
                      const t = parseInt(e.target.value, 10);
                      setEditingSchedule({
                        ...editingSchedule,
                        targetType: t,
                        targetAction: t === 5 ? 1 : 1,
                      });
                    }}
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={0}>Relay CH1 ({configs[0]?.name})</option>
                    <option value={1}>Relay CH2 ({configs[1]?.name})</option>
                    <option value={2}>Relay CH3 ({configs[2]?.name})</option>
                    <option value={3}>Relay CH4 ({configs[3]?.name})</option>
                    <option value={4}> All Relays (CH1..CH4)</option>
                    <option value={5}>ðŸŒˆ WS2812B RGB Strip (GPIO 8)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Trigger Action</label>
                  {editingSchedule.targetType < 5 ? (
                    <select
                      value={editingSchedule.targetAction}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, targetAction: parseInt(e.target.value, 10) })}
                      className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value={1}> Turn LOAD ON</option>
                      <option value={0}>ðŸ›‘ Turn LOAD OFF</option>
                    </select>
                  ) : (
                    <select
                      value={editingSchedule.targetAction}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, targetAction: parseInt(e.target.value, 10) })}
                      className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {LED_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.desc})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* RGB Brightness & Color if RGB Strip selected */}
              {editingSchedule.targetType === 5 && (
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-zinc-400 uppercase font-bold">LED Brightness &amp; Color:</span>
                    <span className="font-mono text-cyan-400 font-bold">{editingSchedule.rgbBri}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={editingSchedule.rgbBri}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, rgbBri: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-mono text-zinc-400">Target Color:</span>
                    <input
                      type="color"
                      value={`#${((1 << 24) + (editingSchedule.rgbR << 16) + (editingSchedule.rgbG << 8) + editingSchedule.rgbB).toString(16).slice(1)}`}
                      onChange={(e) => {
                        const hex = e.target.value.slice(1);
                        const r = parseInt(hex.slice(0, 2), 16);
                        const g = parseInt(hex.slice(2, 4), 16);
                        const b = parseInt(hex.slice(4, 6), 16);
                        setEditingSchedule({ ...editingSchedule, rgbR: r, rgbG: g, rgbB: b });
                      }}
                      className="w-10 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-zinc-500">
                      RGB({editingSchedule.rgbR}, {editingSchedule.rgbG}, {editingSchedule.rgbB})
                    </span>
                  </div>
                </div>
              )}

              {/* Days of Week Mask */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Active Days of Week</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingSchedule({ ...editingSchedule, daysMask: 127 })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 cursor-pointer"
                    >
                      Everyday
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSchedule({ ...editingSchedule, daysMask: 62 })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 cursor-pointer"
                    >
                      Mon-Fri
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSchedule({ ...editingSchedule, daysMask: 65 })}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 cursor-pointer"
                    >
                      Weekends
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day, dIdx) => {
                    const active = Boolean(editingSchedule.daysMask & (1 << dIdx));
                    return (
                      <button
                        key={dIdx}
                        type="button"
                        onClick={() =>
                          setEditingSchedule({
                            ...editingSchedule,
                            daysMask: editingSchedule.daysMask ^ (1 << dIdx),
                          })
                        }
                        className={`min-h-[36px] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          active
                            ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30 font-black"
                            : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Time */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Start Time (24h)</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2">
                    <span className="text-xs font-mono text-zinc-500">Hour</span>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={editingSchedule.startHour}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          startHour: Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)),
                        })
                      }
                      className="w-12 bg-transparent text-sm font-mono text-white text-center focus:outline-none"
                    />
                  </div>
                  <span className="text-lg font-bold text-zinc-500">:</span>
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2">
                    <span className="text-xs font-mono text-zinc-500">Min</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editingSchedule.startMin}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          startMin: Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)),
                        })
                      }
                      className="w-12 bg-transparent text-sm font-mono text-white text-center focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Stop Condition: Duration vs Specific Stop Time vs None */}
              <div className="flex flex-col gap-2 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Stop Behavior</label>
                
                {/* Radio 1: Duration */}
                <label className="flex items-start gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    name="stopType"
                    checked={editingSchedule.stopType === 1}
                    onChange={() => setEditingSchedule({ ...editingSchedule, stopType: 1 })}
                    className="mt-0.5 accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="font-bold">Auto-Stop After Duration (Minutes / Hours)</span>
                    {editingSchedule.stopType === 1 && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={Math.floor(editingSchedule.durationMin / 60)}
                          onChange={(e) => {
                            const h = Math.max(0, Math.min(24, parseInt(e.target.value, 10) || 0));
                            const m = editingSchedule.durationMin % 60;
                            setEditingSchedule({ ...editingSchedule, durationMin: Math.max(1, h * 60 + m) });
                          }}
                          className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                        />
                        <span className="text-zinc-400">hours</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editingSchedule.durationMin % 60}
                          onChange={(e) => {
                            const h = Math.floor(editingSchedule.durationMin / 60);
                            const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                            setEditingSchedule({ ...editingSchedule, durationMin: Math.max(1, h * 60 + m) });
                          }}
                          className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                        />
                        <span className="text-zinc-400">minutes</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Radio 2: Specific Stop Time */}
                <label className="flex items-start gap-2 text-xs font-mono text-zinc-300 cursor-pointer pt-2 border-t border-zinc-800">
                  <input
                    type="radio"
                    name="stopType"
                    checked={editingSchedule.stopType === 2}
                    onChange={() => setEditingSchedule({ ...editingSchedule, stopType: 2 })}
                    className="mt-0.5 accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="font-bold">Auto-Stop at Specific Time of Day</span>
                    {editingSchedule.stopType === 2 && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editingSchedule.stopHour}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              stopHour: Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                          className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                        />
                        <span className="text-zinc-400">h</span>
                        <span className="text-zinc-500">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editingSchedule.stopMin}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              stopMin: Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                          className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                        />
                        <span className="text-zinc-400">m</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Radio 3: Continuous Run */}
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer pt-2 border-t border-zinc-800">
                  <input
                    type="radio"
                    name="stopType"
                    checked={editingSchedule.stopType === 0}
                    onChange={() => setEditingSchedule({ ...editingSchedule, stopType: 0 })}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <span>Continuous Run (Does not auto-stop until next manual toggle)</span>
                </label>
              </div>

              {/* Active Immediately Checkbox */}
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={editingSchedule.enabled}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, enabled: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
                <span>Enable this schedule immediately upon saving</span>
              </label>

              {/* Dialog Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveScheduleRule(editingSchedule);
                    setShowScheduleModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
                >
                  ðŸ’¾ Save to ESP32 Flash
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  3. SMART PRESENCE & AWAY MODE (ESP32 HARDWARE LISTENER)  */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ðŸ“¡ Smart Presence &amp; Away Mode</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  10 Stored Devices  ESP32 Autonomy
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatically switches desk appliances ON upon arrival and OFF after you step away.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Presence Status Pill */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
                  connected
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-600/80"
                    : presenceData.state === 2
                    ? "bg-amber-950/80 text-amber-300 border-amber-600/80 animate-pulse"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                <span>
                  {connected
                    ? "ðŸŸ¢ Home / Present"
                    : presenceData.state === 2
                    ? `â³ Away: ${presenceData.remainingMin}m left`
                    : "ª Away Standby"}
                </span>
              </div>

              {/* Master Presence Switch */}
              <button
                type="button"
                onClick={() =>
                  savePresenceConfig({
                    ...presenceConfig,
                    enabled: !presenceConfig.enabled,
                  })
                }
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all cursor-pointer ${
                  presenceConfig.enabled
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 hover:bg-cyan-500/30"
                    : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-750"
                }`}
              >
                {presenceConfig.enabled ? "PRESENCE: ON" : "PRESENCE: OFF"}
              </button>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Away Timer & Custom Actions */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold">1. Away Auto-Off Delay</h3>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {presenceConfig.awayDelayMin} min
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Delay after all known devices disconnect before executing Away actions.
                </p>

                {/* Quick Delay Presets */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[1, 2, 5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          awayDelayMin: mins,
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        presenceConfig.awayDelayMin === mins
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 font-bold"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                {/* Custom Delay Input */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-900">
                  <span className="text-[11px] font-mono text-zinc-400">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={customDelayInput}
                    onChange={(e) => setCustomDelayInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Math.max(1, Math.min(1440, Number(customDelayInput) || 1));
                        savePresenceConfig({ ...presenceConfig, awayDelayMin: val });
                      }
                    }}
                    placeholder="Min"
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] font-mono text-zinc-500">min</span>
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(1, Math.min(1440, Number(customDelayInput) || 1));
                      savePresenceConfig({ ...presenceConfig, awayDelayMin: val });
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                  >
                    Set
                  </button>
                </div>
              </div>

                {/* Custom Delay Input */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-900">
                  <span className="text-[11px] font-mono text-zinc-400">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={customDelayInput}
                    onChange={(e) => setCustomDelayInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Math.max(1, Math.min(1440, Number(customDelayInput) || 1));
                        savePresenceConfig({ ...presenceConfig, awayDelayMin: val });
                      }
                    }}
                    placeholder="Min"
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] font-mono text-zinc-500">min</span>
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(1, Math.min(1440, Number(customDelayInput) || 1));
                      savePresenceConfig({ ...presenceConfig, awayDelayMin: val });
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                  >
                    Set
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                    Turn OFF Channels:
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          awayRelayMask: 0x0f,
                          awayRgbOff: true,
                        })
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          awayRelayMask: 0x00,
                          awayRgbOff: true,
                        })
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300"
                    >
                      RGB
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          awayRelayMask: 0x0f,
                          awayRgbOff: false,
                        })
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300"
                    >
                      Relays
                    </button>
                  </div>
                </div>

                {/* 4 Relay Toggle Chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((idx) => {
                    const isTurnOff = Boolean(presenceConfig.awayRelayMask & (1 << idx));
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const nextMask = presenceConfig.awayRelayMask ^ (1 << idx);
                          savePresenceConfig({
                            ...presenceConfig,
                            awayRelayMask: nextMask,
                          });
                        }}
                        className={`py-1 px-0.5 rounded text-center text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                          isTurnOff
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/60"
                            : "bg-zinc-900 text-zinc-500 border-zinc-800"
                        }`}
                        title={configs[idx]?.name || `CH${idx + 1}`}
                      >
                        CH{idx + 1} {isTurnOff ? "OFF" : "ON"}
                      </button>
                    );
                  })}
                </div>

                {/* RGB Strip Off Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    savePresenceConfig({
                      ...presenceConfig,
                      awayRgbOff: !presenceConfig.awayRgbOff,
                    })
                  }
                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold border flex items-center justify-between transition-all cursor-pointer ${
                    presenceConfig.awayRgbOff
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/60"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}
                >
                  <span>ðŸŒˆ WS2812B RGB Strip:</span>
                  <span>{presenceConfig.awayRgbOff ? "TURN OFF" : "KEEP AS IS"}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Arrival Action & Custom Combination */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold">2. Arrival Auto-On</h3>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {presenceConfig.arrivalRelayMask > 0 || presenceConfig.arrivalRgbOn ? "Custom Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Custom power-on combination when returning within Bluetooth range.
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                    Turn ON Channels:
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          arrivalRelayMask: 0x0f,
                          arrivalRgbOn: true,
                        })
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          arrivalRelayMask: 0x00,
                          arrivalRgbOn: true,
                        })
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300"
                    >
                      RGB
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        savePresenceConfig({
                          ...presenceConfig,
                          arrivalRelayMask: 0x0f,
                          arrivalRgbOn: false,
                        })
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300"
                    >
                      Relays
                    </button>
                  </div>
                </div>

                {/* 4 Relay Toggle Chips */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const isTurnOn = Boolean(presenceConfig.arrivalRelayMask & (1 << idx));
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const nextMask = presenceConfig.arrivalRelayMask ^ (1 << idx);
                          savePresenceConfig({
                            ...presenceConfig,
                            arrivalRelayMask: nextMask,
                          });
                        }}
                        className={`py-1 px-0.5 rounded text-center text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                          isTurnOn
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60"
                            : "bg-zinc-900 text-zinc-500 border-zinc-800"
                        }`}
                        title={configs[idx]?.name || `CH${idx + 1}`}
                      >
                        CH{idx + 1} {isTurnOn ? "ON" : "OFF"}
                      </button>
                    );
                  })}
                </div>
              </div>

                <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
                {/* RGB Strip On Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    savePresenceConfig({
                      ...presenceConfig,
                      arrivalRgbOn: !presenceConfig.arrivalRgbOn,
                    })
                  }
                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold border flex items-center justify-between transition-all cursor-pointer ${
                    presenceConfig.arrivalRgbOn
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}
                >
                  <span>ðŸŒˆ WS2812B RGB Strip:</span>
                  <span>{presenceConfig.arrivalRgbOn ? "TURN ON" : "DO NOTHING"}</span>
                </button>

                {presenceConfig.arrivalRgbOn && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">Mode:</span>
                    <select
                      value={presenceConfig.arrivalRgbMode}
                      onChange={(e) =>
                        savePresenceConfig({
                          ...presenceConfig,
                          arrivalRgbMode: Number(e.target.value),
                        })
                      }
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono flex-1 focus:outline-none focus:border-cyan-500"
                    >
                      <option value={1}>Solid Amber/White</option>
                      <option value={2}>Breathe (Fade)</option>
                      <option value={3}>Rainbow Glow</option>
                      <option value={15}>Aurora Wave</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Paired Devices & Exclusion */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold">3. Devices &amp; Exclusion</h3>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    {storedClients.length} Registered
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Exclude permanent desk devices (e.g. idle laptop) so leaving with your phone triggers Away auto-off.
                </p>

                {/* Nickname Input for Current Device */}
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={20}
                      value={clientNickname}
                      onChange={(e) => setClientNickname(e.target.value)}
                      placeholder="Current Device Nickname"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => registerClientName(clientNickname)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono cursor-pointer transition-all active:scale-95"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Stored Devices List with Track / Exclude Toggles */}
                <div className="mt-2.5 flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                  {storedClients.length === 0 ? (
                    <div className="text-[11px] font-mono text-zinc-600 italic py-1">
                      No devices stored yet. Connect via Bluetooth to register!
                    </div>
                  ) : (
                    storedClients.map((dev) => (
                      <div
                        key={dev.slot}
                        className="flex items-center justify-between p-1.5 rounded bg-zinc-900/90 border border-zinc-800 text-xs font-mono gap-1"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] text-zinc-500 font-bold">#{dev.slot + 1}</span>
                          <span className="text-zinc-200 font-medium truncate">{dev.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDevicePresenceTracking(dev.slot, dev.trackPresence)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                            dev.trackPresence
                              ? "bg-emerald-950/70 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/80"
                              : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                          }`}
                          title={
                            dev.trackPresence
                              ? "Click to exclude (Idle Desk Device - departure ignored)"
                              : "Click to track presence (Carried Master Device)"
                          }
                        >
                          {dev.trackPresence ? "Tracked (Master)" : "Excluded (Idle)"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">Max 10 Slots in ESP32</span>
                <button
                  type="button"
                  onClick={clearKnownClients}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-rose-950/60 text-rose-400 text-[10px] font-mono border border-zinc-800 transition-all cursor-pointer"
                >
                  Clear Stored Slots
                </button>
              </div>
            </div>
          </div>
        </section>

        {/*  4. LED CONTROLLER PANEL (16 MODES + SIMULATOR)  */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ðŸŒˆ WS2812B 8-LED Array</span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                  GPIO 8  Live Simulation
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {uiAnim?.active ? (
                  <span className="text-emerald-400 font-bold animate-pulse">
                     {uiAnim.label} (Simulating...)
                  </span>
                ) : (
                  "16 Visual Modes  Safe Photosensitivity Cap  Auto-Restores Previous State"
                )}
              </p>
            </div>
            <div className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-zinc-800 text-cyan-300 border border-zinc-700">
              {uiAnim?.active
                ? "Relay Action Triggered"
                : musicSyncActive
                ? `ðŸŽ™ ${MUSIC_DISCO_MODES.find((m) => m.id === musicSubMode)?.label || "Music Sync"}`
                : LED_MODES.find((m) => m.id === led.mode)?.label || `Mode ${led.mode}`}
            </div>
          </div>

          {/* 8-Dot Visualizer */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-around items-center overflow-x-auto gap-2">
            {render8DotPreview()}
          </div>

          {/*  MUSIC SYNC (LIVE MICROPHONE AUDIO REACTIVITY)  */}
          <div className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-4 ${
            musicSyncActive
              ? "bg-gradient-to-b from-purple-950/40 via-zinc-900 to-zinc-900 border-purple-500/80 shadow-[0_0_24px_rgba(168,85,247,0.2)]"
              : "bg-zinc-950/60 border-zinc-800"
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">ðŸŽ™</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-wide">
                      Microphone Music Sync
                    </span>
                    {musicSyncActive && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        LISTENING
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Live browser microphone input  10 Disco Party Sync Modes  Auto-restores normal LED mode on stop
                  </p>
                </div>
              </div>

              {/* Main Toggle Button */}
              <button
                type="button"
                disabled={!connected}
                onClick={() => {
                  if (musicSyncActive) {
                    stopMusicSync();
                  } else {
                    startMusicSync();
                  }
                }}
                className={`min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 select-none shadow-md disabled:opacity-40 active:scale-95 ${
                  musicSyncActive
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 border border-rose-400 animate-pulse"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50 border border-purple-400"
                }`}
              >
                {musicSyncActive ? (
                  <>
                    <span>â¹</span>
                    <span>Stop Music Sync</span>
                  </>
                ) : (
                  <>
                    <span>ðŸŽ™</span>
                    <span>Start Music Sync</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Volume & Beat Meter Bar (When Active) */}
            {musicSyncActive && (
              <div className="flex flex-col gap-1.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-bold uppercase">Live Audio Volume</span>
                    {beatPulse && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/40 animate-pulse">
                        ðŸ’¥ BEAT
                      </span>
                    )}
                  </div>
                  <span className={`font-bold ${micVolume > 75 ? "text-rose-400" : micVolume > 35 ? "text-amber-400" : "text-emerald-400"}`}>
                    {micVolume}%
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                    style={{ width: `${Math.min(100, Math.max(0, micVolume))}%` }}
                  />
                </div>
              </div>
            )}

            {/* 10 Disco Music Sync Styles Grid */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                  <span>ðŸ•º</span>
                  <span>10 Disco Music Sync Styles</span>
                </label>
                <span className="text-[11px] font-mono text-purple-400 font-bold">
                  {MUSIC_DISCO_MODES.find((m) => m.id === musicSubMode)?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {MUSIC_DISCO_MODES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMusicSubMode(s.id)}
                    className={`min-h-[50px] py-2 px-2.5 rounded-xl flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                      musicSubMode === s.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/50 border border-purple-400 font-bold"
                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 hover:bg-zinc-750"
                    }`}
                  >
                    <span className="text-xs leading-none">{s.label}</span>
                    <span className="text-[10px] opacity-75 font-mono mt-1 line-clamp-1">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Solo Beat Color Customizer (When Mode 9 is selected) */}
            {musicSubMode === 9 && (
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-purple-500/50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase text-purple-300 font-bold flex items-center gap-1.5">
                    <span>ðŸŽ¯</span>
                    <span>Solo Beat Sync Color</span>
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400">
                    rgb({soloColor.r}, {soloColor.g}, {soloColor.b})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={rgbToHex(soloColor.r, soloColor.g, soloColor.b)}
                    onChange={(e) => setSoloColor(hexToRgb(e.target.value))}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Cyan", rgb: { r: 0, g: 240, b: 255 } },
                      { name: "Violet", rgb: { r: 180, g: 0, b: 255 } },
                      { name: "Hot Pink", rgb: { r: 255, g: 0, b: 140 } },
                      { name: "Lime", rgb: { r: 50, g: 255, b: 20 } },
                      { name: "Gold", rgb: { r: 255, g: 190, b: 0 } },
                      { name: "Ice White", rgb: { r: 255, g: 255, b: 255 } },
                    ].map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setSoloColor(col.rgb)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 border border-zinc-700/60 cursor-pointer transition-all active:scale-95"
                      >
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] font-mono text-zinc-400">
                  This chosen color will pump, animate, and synchronize with your song's beat!
                </p>
              </div>
            )}

            {/* Independent Brightness & Sensitivity Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
              {/* Music Brightness Slider (INDEPENDENT CAP) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-mono text-purple-300 font-bold uppercase">
                      Music Max Brightness
                    </label>
                    <span className="text-[10px] font-mono text-purple-400/80 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
                      Independent Cap
                    </span>
                  </div>
                  <span className="font-mono text-xs text-purple-400 font-bold">{musicBri}%</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex items-center min-h-[48px]">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={musicBri}
                    onChange={(e) => setMusicBri(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] font-mono text-zinc-500">
                  Controls Music Sync brightness only. Normal RGB brightness ({led.bri}%) is preserved.
                </p>
              </div>

              {/* Microphone Sensitivity Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-zinc-400 font-bold uppercase">
                    Mic Sensitivity / Gain
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-bold">{musicSensitivity.toFixed(1)}x</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex items-center min-h-[48px]">
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={musicSensitivity}
                    onChange={(e) => setMusicSensitivity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] font-mono text-zinc-500">
                  Boost gain for quiet rooms or lower for loud speakers.
                </p>
              </div>
            </div>
          </div>

          {/* 16 Effect Modes Grid */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono uppercase text-zinc-400 font-bold">16 LED Effect Modes</label>
              <span className="text-[11px] font-mono text-zinc-500">Live Rendered</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2">
              {LED_MODES.map((modeItem) => (
                <button
                  key={modeItem.id}
                  type="button"
                  disabled={!connected}
                  onClick={() => updateLedDebounced({ mode: modeItem.id })}
                  className={`min-h-[48px] py-2 px-3 rounded-xl flex flex-col items-start justify-center text-left transition-all cursor-pointer ${
                    led.mode === modeItem.id && !uiAnim?.active
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/50 border border-cyan-400"
                      : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 hover:bg-zinc-750"
                  } disabled:opacity-40`}
                >
                  <span className="font-bold text-xs leading-none">{modeItem.label}</span>
                  <span className="text-[10px] opacity-75 font-mono mt-1 truncate w-full">{modeItem.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono uppercase text-zinc-400 font-bold">Curated Presets</label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "ðŸ’¡ Desk Work", p: { mode: 1, r: 255, g: 255, b: 255, bri: 85, spd: 5 } },
                { name: "ðŸŒ… Relaxing Glow", p: { mode: 2, r: 255, g: 130, b: 20, bri: 60, spd: 3 } },
                { name: "ðŸŒŒ Cyberpunk", p: { mode: 8, r: 0, g: 240, b: 255, bri: 80, spd: 7 } },
                { name: "ðŸ”¥ Campfire", p: { mode: 14, r: 255, g: 80, b: 10, bri: 75, spd: 5 } },
                { name: "ðŸŒˆ Aurora Wave", p: { mode: 15, r: 0, g: 255, b: 180, bri: 80, spd: 5 } },
                { name: "ðŸŽ‰ Party Rainbow", p: { mode: 3, r: 0, g: 255, b: 200, bri: 90, spd: 8 } },
                { name: "ðŸŒ™ Night Light", p: { mode: 1, r: 180, g: 15, b: 0, bri: 15, spd: 2 } },
                { name: "ðŸ”Œ Dark Off", p: { mode: 0, r: 0, g: 0, b: 0, bri: 0, spd: 5 } },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  disabled={!connected}
                  onClick={() => applyLedPreset(preset.p)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/60 transition-all cursor-pointer disabled:opacity-40 active:scale-95"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders and Color Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/80">
            {/* Color Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-zinc-400 font-bold uppercase">Color (RGB)</label>
              <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 min-h-[52px]">
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
                <label className="text-xs font-mono text-zinc-400 font-bold uppercase">Normal Brightness Cap</label>
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
                <label className="text-xs font-mono text-zinc-400 font-bold uppercase">Cycle Speed</label>
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
        </section>

        

        {/*  DEVICE TELEMETRY / INFO  */}
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
              ðŸ”„ Refresh
            </button>
          </div>
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-xs text-cyan-300 break-all">
            {infoString}
          </div>
        </section>

        

        {/*  LIVE BLE LOG CONSOLE  */}
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
                ðŸ“‹ Copy
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

        

      {/*  FLOATING CLIMATE, ACTIVE BUZZER & ESP32 HARDWARE WIDGET  */}
      <div className="fixed bottom-4 right-4 z-40 max-w-xs sm:max-w-sm pointer-events-none">
        <div className="pointer-events-auto bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">ðŸ“¡</span>
              <span className="font-bold text-white tracking-wide">Desk Sensors &amp; Audio</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800 px-2 py-0.5 rounded">
              ESP32-S3 Live
            </span>
          </div>

          {/* Climate DHT11 */}
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">ðŸŒ¡</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">DHT11 Climate (GPIO 9)</span>
                <span className="font-mono text-white font-bold text-xs">
                  {envData.valid ? `${envData.tempC.toFixed(1)}Â°C  ${envData.humidity.toFixed(0)}% RH` : connected ? "Sampling sensor..." : "Not connected"}
                </span>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                envData.valid ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-zinc-600"
              }`}
            />
          </div>

          {/* Active Buzzer B27 */}
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{masterBuzzer ? "ðŸ”Š" : "ðŸ”‡"}</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Buzzer B27 (GPIO 10)</span>
                <span className={`font-mono font-bold text-xs ${masterBuzzer ? "text-amber-300" : "text-zinc-500"}`}>
                  {masterBuzzer ? "Active (HIGH/LOW Pulses)" : "Muted"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMasterBuzzer}
              disabled={!connected}
              className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all active:scale-95 cursor-pointer disabled:opacity-40 ${
                masterBuzzer
                  ? "bg-amber-950/80 text-amber-300 border-amber-600 hover:bg-amber-900"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
              }`}
            >
              {masterBuzzer ? "Mute" : "Unmute"}
            </button>
          </div>

          {/* ESP32 Real-Time Clock */}
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">ðŸ•’</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Internal ESP32 Clock</span>
                <span className="font-mono text-cyan-300 font-bold text-xs">
                  {espClock.synced
                    ? `${String(espClock.hour).padStart(2, "0")}:${String(espClock.minute).padStart(2, "0")}:${String(espClock.second).padStart(2, "0")} (${DAYS_OF_WEEK[espClock.dayOfWeek]})`
                    : "Not Synced"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={syncRealTime}
              disabled={!connected}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-mono text-[10px] font-bold border border-zinc-700 transition-all active:scale-95 cursor-pointer disabled:opacity-40"
              title="Sync ESP32 internal clock with Browser local time"
            >
              Sync
            </button>
          </div>

          {/* GPIO Quick Reference Badge */}
          <div className="text-[10px] font-mono text-zinc-400 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/60 leading-relaxed">
            <div className="text-zinc-500 font-bold uppercase mb-0.5">ESP32-S3 Hardware Pinout:</div>
            <div> Relays 1-4: <span className="text-cyan-400 font-bold">GPIO 4, 5, 6, 7</span></div>
            <div> WS2812B: <span className="text-cyan-400 font-bold">GPIO 8</span> (8x Strip)</div>
            <div> DHT11 Climate: <span className="text-emerald-400 font-bold">GPIO 9</span> (3.3V)</div>
            <div> Active Buzzer (B27): <span className="text-amber-400 font-bold">GPIO 10</span> (DC)</div>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}

/*  Individual Relay Card Component  */
interface RelayCardProps {
  index: number;
  state: RelayState;
  config: RelayConfigItem;
  disabled: boolean;
  onToggle: () => void;
  onSetTimer: (minutes: number) => void;
  onSaveConfig: (
    wiring: number,
    onEn: boolean,
    onMd: number,
    onDu: number,
    offEn: boolean,
    offMd: number,
    offDu: number,
    name: string,
    beepOn: boolean,
    beepOff: boolean,
    beepEnd: boolean
  ) => void;
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
  const [wiring, setWiring] = useState(config.wiring ?? 0);

  // Separate ON & OFF RGB Settings
  const [onAnimEnabled, setOnAnimEnabled] = useState(config.onAnimEnabled ?? true);
  const [onAnimMode, setOnAnimMode] = useState(config.onAnimMode ?? 1);
  const [onAnimDuration, setOnAnimDuration] = useState(config.onAnimDuration ?? 2);

  const [offAnimEnabled, setOffAnimEnabled] = useState(config.offAnimEnabled ?? true);
  const [offAnimMode, setOffAnimMode] = useState(config.offAnimMode ?? 3);
  const [offAnimDuration, setOffAnimDuration] = useState(config.offAnimDuration ?? 2);

  // Active Buzzer (B27) Triggers
  const [beepOn, setBeepOn] = useState<boolean>(config.beepOn ?? true);
  const [beepOff, setBeepOff] = useState<boolean>(config.beepOff ?? true);
  const [beepTimerEnd, setBeepTimerEnd] = useState<boolean>(config.beepTimerEnd ?? true);

  // Custom Countdown Timer Inputs
  const [customHours, setCustomHours] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState<number>(30);

  useEffect(() => {
    setNameInput(config.name);
    setWiring(config.wiring ?? 0);
    setOnAnimEnabled(config.onAnimEnabled ?? true);
    setOnAnimMode(config.onAnimMode ?? 1);
    setOnAnimDuration(config.onAnimDuration ?? 2);
    setOffAnimEnabled(config.offAnimEnabled ?? true);
    setOffAnimMode(config.offAnimMode ?? 3);
    setOffAnimDuration(config.offAnimDuration ?? 2);
    setBeepOn(config.beepOn ?? true);
    setBeepOff(config.beepOff ?? true);
    setBeepTimerEnd(config.beepTimerEnd ?? true);
  }, [config]);

  const gpioPin = 4 + index;

  const handleStartCustomTimer = () => {
    const totalMin = Math.max(1, Math.min(1440, customHours * 60 + customMinutes));
    onSetTimer(totalMin);
  };

  const formatRemainingTime = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    return `${mins}m`;
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-base text-white">{config.name}</h3>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              CH{index + 1}  GPIO {gpioPin}
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                config.wiring === 1
                  ? "bg-purple-950/80 text-purple-300 border-purple-800"
                  : "bg-cyan-950/80 text-cyan-300 border-cyan-800"
              }`}
            >
              {config.wiring === 1 ? "NC Contact" : "NO Contact"}
            </span>
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            ON Anim: {config.onAnimEnabled ? `${RELAY_ANIM_OPTIONS.find((a) => a.id === config.onAnimMode)?.label} (${config.onAnimDuration}s)` : "Off"} {" "}
            OFF Anim: {config.offAnimEnabled ? `${RELAY_ANIM_OPTIONS.find((a) => a.id === config.offAnimMode)?.label} (${config.offAnimDuration}s)` : "Off"}
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

      {/* Countdown Timer (Quick Presets + Custom Hours/Minutes) */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-800/80">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono text-zinc-400 font-semibold">Countdown Timer:</span>
          {state.remainingMin > 0 ? (
            <span className="font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded">
              â³ {formatRemainingTime(state.remainingMin)} remaining
            </span>
          ) : (
            <span className="font-mono text-zinc-500">None active</span>
          )}
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              disabled={disabled}
              onClick={() => onSetTimer(mins)}
              className="min-h-[40px] py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-mono font-semibold text-zinc-300 border border-zinc-700/80 transition-all cursor-pointer disabled:opacity-40"
            >
              +{mins}m
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || state.remainingMin === 0}
            onClick={() => onSetTimer(0)}
            className="min-h-[40px] py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 active:scale-95 text-xs font-mono font-semibold text-rose-300 border border-zinc-700/80 transition-all cursor-pointer disabled:opacity-30"
          >
            Cancel
          </button>
        </div>

        {/* Custom Hours & Minutes Timer Input */}
        <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="24"
                disabled={disabled}
                value={customHours}
                onChange={(e) => setCustomHours(Math.max(0, Math.min(24, parseInt(e.target.value, 10) || 0)))}
                className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] font-mono text-zinc-400">h</span>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="59"
                disabled={disabled}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                className="w-12 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] font-mono text-zinc-400">m</span>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled || (customHours === 0 && customMinutes === 0)}
            onClick={handleStartCustomTimer}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-mono font-bold tracking-wide transition-all cursor-pointer disabled:opacity-40"
          >
            Set Timer
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
          <span>™ Configure NO/NC, Rename &amp; RGB Actions</span>
          <span>{showConfig ? "â–² Hide" : "â–¼ Configure"}</span>
        </button>

        {showConfig && (
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex flex-col gap-3 mt-1">
            {/* Rename */}
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

            {/* NO / NC Contact Wiring */}
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-400">
                  Relay Contact Wiring (NO / NC)
                </label>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                    wiring === 1
                      ? "bg-purple-950/80 text-purple-300 border-purple-800"
                      : "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                  }`}
                >
                  {wiring === 1 ? "NC (Normally Closed)" : "NO (Normally Open)"}
                </span>
              </div>
              <select
                value={wiring}
                onChange={(e) => setWiring(parseInt(e.target.value, 10))}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value={0}>Normally Open (NO - Default)  Unpowered when relay is resting</option>
                <option value={1}>Normally Closed (NC)  Powered when relay is resting</option>
              </select>
              <span className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                {wiring === 0
                  ? "Appliance wired to NO terminal. Turning ON energizes the relay coil (GPIO LOW) to connect power."
                  : "Appliance wired to NC terminal. Turning ON de-energizes the relay coil (GPIO HIGH) so power passes naturally."}
              </span>
            </div>

            {/* Turn ON RGB Action */}
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onAnimEnabled}
                    onChange={(e) => setOnAnimEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span>Action on Turn ON (Emerald Glow)</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {onAnimEnabled ? "Active" : "Disabled"}
                </span>
              </div>

              {onAnimEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Animation Function</span>
                    <select
                      value={onAnimMode}
                      onChange={(e) => setOnAnimMode(parseInt(e.target.value, 10))}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {RELAY_ANIM_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Duration</span>
                    <select
                      value={onAnimDuration}
                      onChange={(e) => setOnAnimDuration(parseInt(e.target.value, 10))}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value={1}>1 Second</option>
                      <option value={2}>2 Seconds</option>
                      <option value={3}>3 Seconds</option>
                      <option value={5}>5 Seconds</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Turn OFF RGB Action */}
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-rose-400 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={offAnimEnabled}
                    onChange={(e) => setOffAnimEnabled(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                  <span>Action on Turn OFF (Crimson Glow)</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {offAnimEnabled ? "Active" : "Disabled"}
                </span>
              </div>

              {offAnimEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Animation Function</span>
                    <select
                      value={offAnimMode}
                      onChange={(e) => setOffAnimMode(parseInt(e.target.value, 10))}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {RELAY_ANIM_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Duration</span>
                    <select
                      value={offAnimDuration}
                      onChange={(e) => setOffAnimDuration(parseInt(e.target.value, 10))}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value={1}>1 Second</option>
                      <option value={2}>2 Seconds</option>
                      <option value={3}>3 Seconds</option>
                      <option value={5}>5 Seconds</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Active Buzzer (B27) Beep Triggers */}
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <span>ðŸ”” Active Buzzer (B27) Beeps (GPIO 10)</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {beepOn || beepOff || beepTimerEnd ? "Active" : "Silent"}
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={beepOn}
                    onChange={(e) => setBeepOn(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Beep on Turn ON (1 crisp pulse)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={beepOff}
                    onChange={(e) => setBeepOff(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Beep on Turn OFF (2 short pulses)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={beepTimerEnd}
                    onChange={(e) => setBeepTimerEnd(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Beep on Countdown Timer End (3 alert pulses)</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onSaveConfig(
                  wiring,
                  onAnimEnabled,
                  onAnimMode,
                  onAnimDuration,
                  offAnimEnabled,
                  offAnimMode,
                  offAnimDuration,
                  nameInput,
                  beepOn,
                  beepOff,
                  beepTimerEnd
                );
                setShowConfig(false);
              }}
              className="min-h-[44px] rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-mono font-bold tracking-wide transition-all cursor-pointer disabled:opacity-40"
            >
              ðŸ’¾ Save Settings to ESP32 NVS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
