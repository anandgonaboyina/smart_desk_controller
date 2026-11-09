/**
 * useRemoteDeskWs.ts — Next.js Cloud WebSocket Hook for SmartDesk V2
 *
 * Purpose : Connects the PWA to the Render IoT relay backend from anywhere in the world.
 *           Handles multi-user authentication with configurable username/password,
 *           robust bidirectional state telemetry, and Remote Mode toggle.
 * Depends : React (useState, useEffect, useCallback, useRef)
 * Used by : QuickRemotePanel.tsx, SettingsPanel.tsx, CloudHandshakeModal.tsx, page.tsx
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScheduleRule } from "../types/smartdesk";

export interface RemoteRelayState {
  load: boolean;
  remainingMin: number;
}

export interface RemoteRelayConfig {
  name: string;
  wiring: number;
}

export interface RemoteDeviceState {
  relays: RemoteRelayState[];
  configs?: RemoteRelayConfig[];
  led: { mode: number; r: number; g: number; b: number; bri: number; spd: number; remainingMin?: number };
  env: { tempC: number; humidity: number; valid: boolean };
  presence?: {
    enabled?: boolean;
    state: number;
    distanceM?: number;
    remainingMin: number;
    awayDelayMin?: number;
    masterDevice?: string;
    awayRelayMask?: number;
    awayRgbOff?: boolean;
    arrivalRelayMask?: number;
    arrivalRgbOn?: boolean;
    arrivalRgbMode?: number;
  };
  schedules?: ScheduleRule[];
  deviceName?: string;
  stripLength?: number;
  matrix?: { mode: number; speed?: number; bri?: number; r?: number; g?: number; b?: number; text?: string };
}

export interface UseRemoteDeskWsOptions {
  wsUrl?: string;
  userId?: string;
  password?: string;
  deviceId?: string;
  deviceKey?: string;
  onStateUpdate?: (state: RemoteDeviceState) => void;
  onToast?: (message: string, type?: "info" | "success" | "error" | "warn") => void;
}

const resolveDefaultWsUrl = () => {
  if (process.env.NEXT_PUBLIC_REMOTE_WS_URL) return process.env.NEXT_PUBLIC_REMOTE_WS_URL;
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${host}:3001/ws`;
    }
  }
  return "ws://localhost:3001/ws";
};

export function useRemoteDeskWs({
  wsUrl,
  userId = "user_anand_primary",
  password = "",
  deviceId = "desk_anand",
  deviceKey = "SmartDesk_Cloud_Secret_2026",
  onStateUpdate,
  onToast,
}: UseRemoteDeskWsOptions = {}) {
  const effectiveWsUrl = wsUrl || resolveDefaultWsUrl();

  // Load cached credentials from localStorage if available
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_cloud_user") || userId;
    }
    return userId;
  });

  const [currentPassword, setCurrentPassword] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartdesk_cloud_pass") || password;
    }
    return password;
  });

  const [currentDeviceId, setCurrentDeviceId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartdesk_cloud_device_id");
      if (saved && saved.trim()) {
        // Automatically migrate legacy 'desk_anand_s3' to active 'desk_anand'
        return saved.trim();
      }
    }
    return deviceId || "desk_anand";
  });

  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [remoteModeEnabled, setRemoteModeEnabled] = useState<boolean>(false);
  const [deviceState, setDeviceState] = useState<RemoteDeviceState>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("smartdesk_cached_remote_state");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.relays) && parsed.relays.length === 4) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return {
      relays: [
        { load: false, remainingMin: 0 },
        { load: false, remainingMin: 0 },
        { load: false, remainingMin: 0 },
        { load: false, remainingMin: 0 },
      ],
      configs: [
        { name: "Relay 1", wiring: 0 },
        { name: "Relay 2", wiring: 0 },
        { name: "Relay 3", wiring: 0 },
        { name: "Relay 4", wiring: 0 },
      ],
      led: { mode: 1, r: 0, g: 180, b: 255, bri: 50, spd: 5 },
      env: { tempC: 0, humidity: 0, valid: false },
    };
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronous ref to prevent stale credentials closure across async socket reconnects:
  const credsRef = useRef<{ user: string; pass: string; devId: string; name: string }>({
    user: currentUserId,
    pass: currentPassword,
    devId: currentDeviceId,
    name: typeof window !== "undefined" ? localStorage.getItem("smartdesk_last_device_name") || "" : "",
  });

  const forceReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }
    setIsWsConnected(false);
    setIsDeviceOnline(false);
    setTimeout(() => {
      connect();
    }, 50);
  }, []);

  const updateCredentials = useCallback((newUser?: string, newPass?: string, newDevId?: string, newDevName?: string) => {
    const nextUser = newUser !== undefined ? newUser : credsRef.current.user;
    const nextPass = newPass !== undefined ? newPass : credsRef.current.pass;
    const nextDevId = newDevId !== undefined ? newDevId : credsRef.current.devId;
    const nextName = newDevName !== undefined ? newDevName : credsRef.current.name;

    if (typeof window !== "undefined") {
      if (newUser !== undefined) localStorage.setItem("smartdesk_cloud_user", newUser);
      if (newPass !== undefined) localStorage.setItem("smartdesk_cloud_pass", newPass);
      if (newDevId !== undefined) localStorage.setItem("smartdesk_cloud_device_id", newDevId);
      if (newDevName !== undefined) localStorage.setItem("smartdesk_last_device_name", newDevName);
    }
    credsRef.current = { user: nextUser, pass: nextPass, devId: nextDevId, name: nextName };
    if (newUser !== undefined) setCurrentUserId(nextUser);
    if (newPass !== undefined) setCurrentPassword(nextPass);
    if (newDevId !== undefined) setCurrentDeviceId(nextDevId);

    // Force immediate live socket reconnect with new IDs (avoids page refresh):
    forceReconnect();
  }, [forceReconnect]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const socket = new WebSocket(effectiveWsUrl);
      wsRef.current = socket;

      // Watchdog: If stuck in CONNECTING for > 7s (Render wake-up or network stall), auto-reset
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.warn("[CLOUD WS] Connection attempt timed out in CONNECTING. Forcing instant retry...");
          try {
            socket.onclose = null;
            socket.onerror = null;
            socket.close();
          } catch (_) {}
          wsRef.current = null;
          setIsWsConnected(false);
          setIsDeviceOnline(false);
          forceReconnect();
        }
      }, 7000);

      socket.onopen = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setIsWsConnected(true);
        console.log(`[CLOUD WS] Connected to relay server at ${effectiveWsUrl}`);

        // Send Multi-User Authentication Handshake with Device Username & Password
        const authPayload: Record<string, any> = {
          type: "auth",
          role: "client",
          userId: credsRef.current.user,
          password: credsRef.current.pass,
          deviceId: credsRef.current.devId,
          deviceKey,
          timestamp: Date.now(),
        };
        // Only include deviceName if it matches deviceId to ensure deployed servers don't reject auth on display nickname
        if (credsRef.current.name && credsRef.current.name.trim() === credsRef.current.devId.trim()) {
          authPayload.deviceName = credsRef.current.name.trim();
        }
        socket.send(JSON.stringify(authPayload));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "auth_res") {
            if (data.ok) {
              setIsDeviceOnline(Boolean(data.deviceOnline));
              setRemoteModeEnabled(Boolean(data.remoteModeEnabled));
              const stateObj = data.currentState || data.cachedState || data.state;
              if (stateObj) {
                const rawRelays = stateObj.relays || data.relays;
                if (Array.isArray(rawRelays) && rawRelays.length > 0) {
                  const relays = rawRelays.map((r: any) => ({
                    load: Boolean(r.load),
                    remainingMin: typeof r.remainingMin === "number" ? r.remainingMin : 0,
                  }));
                  const updated: RemoteDeviceState = {
                    relays,
                    configs: stateObj.configs || data.configs,
                    led: stateObj.led || data.led || { mode: 1, r: 0, g: 180, b: 255, bri: 50, spd: 5 },
                    env: stateObj.env || data.env || { tempC: 0, humidity: 0, valid: false },
                    presence: stateObj.presence,
                    deviceName: stateObj.deviceName || data.deviceName,
                    stripLength: stateObj.stripLen || data.stripLen || stateObj.stripLength || data.stripLength,
                    matrix: stateObj.matrix || data.matrix,
                  };
                  if (typeof window !== "undefined") {
                    try {
                      localStorage.setItem("smartdesk_cached_remote_state", JSON.stringify(updated));
                    } catch (_) {}
                  }
                  setDeviceState(updated);
                  if (onStateUpdate) onStateUpdate(updated);
                }
              }

              // Request live hardware state broadcast from the board
              socket.send(
                JSON.stringify({
                  type: "request_state",
                  deviceId: credsRef.current.devId,
                  timestamp: Date.now(),
                })
              );

              // Automatically synchronize device hardware clock with browser's local time upon connection
              const now = new Date();
              socket.send(
                JSON.stringify({
                  type: "time_sync",
                  deviceId: credsRef.current.devId,
                  h: now.getHours(),
                  m: now.getMinutes(),
                  s: now.getSeconds(),
                  dow: now.getDay(),
                  timestamp: Date.now(),
                })
              );
            } else {
              console.error("[CLOUD WS] Authentication failed:", data.error);
              if (onToast) onToast(`Cloud Auth Failed: ${data.error || "Unauthorized"}`, "error");
            }
          }

          if (data.type === "device_status") {
            setIsDeviceOnline(Boolean(data.isOnline));
            if (onToast) {
              onToast(data.isOnline ? "SmartDesk connected to Cloud" : "SmartDesk went Offline", data.isOnline ? "success" : "warn");
            }
          }

          if (data.type === "remote_mode_changed") {
            setRemoteModeEnabled(Boolean(data.enabled));
          }

          if (data.type === "state_update") {
            setIsDeviceOnline(true);
            setDeviceState((prev) => {
              const rawRelays = data.relays || data.state?.relays;
              const relays = Array.isArray(rawRelays) && rawRelays.length > 0
                ? rawRelays.map((r: any) => ({
                    load: Boolean(r.load),
                    remainingMin: typeof r.remainingMin === "number" ? r.remainingMin : 0,
                  }))
                : prev.relays;
              const configs = data.configs || data.state?.configs || prev.configs;
              const led = data.led || data.state?.led || prev.led;
              const env = data.env || data.state?.env || prev.env;
              const presence = data.presence || data.state?.presence || prev.presence;
              const deviceName = data.deviceName || data.state?.deviceName || prev.deviceName;
              const stripLength = data.stripLen || data.state?.stripLen || data.stripLength || data.state?.stripLength || prev.stripLength;
              const matrix = data.matrix || data.state?.matrix || prev.matrix;
              const schedules = data.schedules || data.state?.schedules || prev.schedules;
              if (schedules && typeof window !== "undefined") {
                try {
                  localStorage.setItem("smartdesk_schedules", JSON.stringify(schedules));
                } catch (_) {}
              }
              const updated: RemoteDeviceState = { relays, configs, led, env, presence, deviceName, stripLength, matrix, schedules };
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("smartdesk_cached_remote_state", JSON.stringify(updated));
                } catch (_) {}
              }
              if (onStateUpdate) onStateUpdate(updated);
              return updated;
            });
          }

          if (data.type === "cmd_ack") {
            console.log(`[CLOUD WS ACK] Action "${data.action}" confirmed on ${data.deviceId}`);
          }

          if (data.type === "error") {
            if (onToast) onToast(data.message || "Cloud error", "error");
          }
        } catch (e) {
          console.error("[CLOUD WS] Message parse error", e);
        }
      };

      socket.onclose = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setIsWsConnected(false);
        setIsDeviceOnline(false);
        wsRef.current = null;
        console.log("[CLOUD WS] Connection closed. Retrying in 2 seconds...");
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.warn("[CLOUD WS] Socket encountered error:", err);
      };
    } catch (err) {
      console.error("[CLOUD WS] Connection attempt error", err);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    }
  }, [effectiveWsUrl, deviceKey, onStateUpdate, onToast]);

  useEffect(() => {
    connect();
    return () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Request State from Hardware ESP32
  const requestState = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "request_state",
          deviceId: currentDeviceId,
          timestamp: Date.now(),
        })
      );
    }
  }, [currentDeviceId]);

  // Toggle Remote Mode ("User Away" Mode)
  const toggleRemoteMode = useCallback(
    (enabled: boolean) => {
      setRemoteModeEnabled(enabled);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "set_remote_mode",
            deviceId: currentDeviceId,
            enabled,
          })
        );
      }
    },
    [currentDeviceId]
  );

  // Send Remote Relay Control Command (Includes both channel & idx, and state & load for universal ESP32 compatibility)
  const sendRelayCommand = useCallback(
    (channel: number, state: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot send: Cloud relay disconnected", "error");
        return;
      }

      // Optimistic UI state update so button flips immediately in PWA
      setDeviceState((prev) => {
        const nextRelays = prev.relays.map((r, i) =>
          i === channel ? { ...r, load: state, remainingMin: 0 } : r
        );
        const updated: RemoteDeviceState = { ...prev, relays: nextRelays };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });

      wsRef.current.send(
        JSON.stringify({
          type: "relay_set",
          deviceId: currentDeviceId,
          channel,
          idx: channel,
          state,
          load: state,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate, onToast]
  );

  // Send Remote Relay Countdown Timer Command
  const sendRelayTimerCommand = useCallback(
    (channel: number, minutes: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot set timer: Cloud WebSocket offline", "warn");
        return;
      }

      // Optimistically update countdown minutes in UI
      setDeviceState((prev) => {
        const nextRelays = prev.relays.map((r, i) =>
          i === channel ? { ...r, remainingMin: minutes, load: minutes > 0 ? true : r.load } : r
        );
        const updated: RemoteDeviceState = { ...prev, relays: nextRelays };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });

      wsRef.current.send(
        JSON.stringify({
          type: "relay_timer",
          deviceId: currentDeviceId,
          channel,
          idx: channel,
          minutes,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate, onToast]
  );

  // Send Remote Relay Configuration (Name & NO/NC Wiring)
  const sendRelayConfigCommand = useCallback(
    (channel: number, name: string, wiring: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Optimistically update config in UI
      setDeviceState((prev) => {
        const nextConfigs = (prev.configs || []).map((c, i) =>
          i === channel ? { name, wiring } : c
        );
        const updated: RemoteDeviceState = { ...prev, configs: nextConfigs };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });

      wsRef.current.send(
        JSON.stringify({
          type: "relay_config",
          deviceId: currentDeviceId,
          channel,
          idx: channel,
          name,
          wiring,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Send Remote LED Command
  const sendLedCommand = useCallback(
    (mode: number, r: number, g: number, b: number, bri: number, spd: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Optimistically update LED state in UI
      setDeviceState((prev) => {
        const updated: RemoteDeviceState = { ...prev, led: { mode, r, g, b, bri, spd } };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });

      wsRef.current.send(
        JSON.stringify({
          type: "led_set",
          deviceId: currentDeviceId,
          mode,
          r,
          g,
          b,
          bri,
          spd,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Send Live Music Sync Frame
  const sendMusicFrame = useCallback(
    (sub: number, beat: number, r: number, g: number, b: number, bri: number, bands?: number[]) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const payload: Record<string, unknown> = {
        type: "music_frame",
        deviceId: currentDeviceId,
        sub,
        beat,
        r,
        g,
        b,
        bri,
        timestamp: Date.now(),
      };
      if (bands && bands.length >= 8) {
        for (let i = 0; i < 8; i++) {
          payload[`b${i}`] = bands[i];
        }
      }
      wsRef.current.send(JSON.stringify(payload));
    },
    [currentDeviceId]
  );

  // Rename Controller over Cloud
  const sendRenameCommand = useCallback(
    (name: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const cleanName = name.trim().slice(0, 24);
      setDeviceState((prev) => {
        const updated: RemoteDeviceState = { ...prev, deviceName: cleanName };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });
      wsRef.current.send(
        JSON.stringify({
          type: "device_rename",
          deviceId: currentDeviceId,
          name: cleanName,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Set Strip Length over Cloud
  const sendStripLengthCommand = useCallback(
    (length: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const clamped = Math.max(1, Math.min(800, length));
      setDeviceState((prev) => {
        const updated: RemoteDeviceState = { ...prev, stripLength: clamped };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });
      wsRef.current.send(
        JSON.stringify({
          type: "strip_length",
          deviceId: currentDeviceId,
          length: clamped,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Set 2D Matrix Display over Cloud
  const sendMatrixCommand = useCallback(
    (
      mode: number,
      text?: string,
      speed?: number,
      bri?: number,
      r?: number,
      g?: number,
      b?: number
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const cleanText = (text || "SMARTDESK V2").slice(0, 60);
      setDeviceState((prev) => {
        const updated: RemoteDeviceState = {
          ...prev,
          matrix: { mode, text: cleanText, speed: speed ?? 5, bri: bri ?? 180, r: r ?? 0, g: g ?? 240, b: b ?? 255 },
        };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });
      wsRef.current.send(
        JSON.stringify({
          type: "matrix_set",
          deviceId: currentDeviceId,
          mode,
          text: cleanText,
          speed: speed ?? 5,
          bri: bri ?? 180,
          r: r ?? 0,
          g: g ?? 240,
          b: b ?? 255,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Send Temperature Calibration Offset Command
  const sendTempOffsetCommand = useCallback(
    (offset: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "temp_offset",
          deviceId: currentDeviceId,
          offset,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId]
  );

  // Send Remote Presence Configuration (Enabled, Away Delay, Relays, Master Device)
  const sendPresenceConfigCommand = useCallback(
    (config: {
      enabled?: boolean;
      awayDelayMin?: number;
      awayRelayMask?: number;
      awayRgbOff?: boolean;
      arrivalRelayMask?: number;
      arrivalRgbOn?: boolean;
      arrivalRgbMode?: number;
      masterDevice?: string;
    }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot update presence: Cloud WebSocket offline", "warn");
        return;
      }
      setDeviceState((prev) => {
        const nextPres = {
          enabled: config.enabled ?? prev.presence?.enabled ?? false,
          state: prev.presence?.state ?? 0,
          remainingMin: config.awayDelayMin ?? prev.presence?.remainingMin ?? 5,
          awayDelayMin: config.awayDelayMin ?? prev.presence?.awayDelayMin ?? 5,
          masterDevice: config.masterDevice ?? prev.presence?.masterDevice ?? "",
          awayRelayMask: config.awayRelayMask ?? prev.presence?.awayRelayMask ?? 0x0f,
          awayRgbOff: config.awayRgbOff ?? prev.presence?.awayRgbOff ?? true,
        };
        const updated: RemoteDeviceState = { ...prev, presence: nextPres };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });

      wsRef.current.send(
        JSON.stringify({
          type: "presence_set",
          deviceId: currentDeviceId,
          ...config,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate, onToast]
  );

  // Send Set Master Presence Device Command
  const sendMasterDeviceCommand = useCallback(
    (name: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      setDeviceState((prev) => {
        const nextPres = {
          enabled: prev.presence?.enabled ?? true,
          state: prev.presence?.state ?? 0,
          remainingMin: prev.presence?.remainingMin ?? 5,
          awayDelayMin: prev.presence?.awayDelayMin ?? 5,
          masterDevice: name,
        };
        const updated: RemoteDeviceState = { ...prev, presence: nextPres };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });
      wsRef.current.send(
        JSON.stringify({
          type: "set_master_device",
          deviceId: currentDeviceId,
          name,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Emergency All Relays Off Command
  const sendAllOff = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Optimistically turn all off in UI
    setDeviceState((prev) => {
      const nextRelays = prev.relays.map((r) => ({ ...r, load: false, remainingMin: 0 }));
      const updated: RemoteDeviceState = { ...prev, relays: nextRelays };
      if (onStateUpdate) onStateUpdate(updated);
      return updated;
    });

    wsRef.current.send(
      JSON.stringify({
        type: "all_off",
        deviceId: currentDeviceId,
        timestamp: Date.now(),
      })
    );
  }, [currentDeviceId, onStateUpdate]);

  // Send RGB Sleep Timer Command
  const sendRgbTimerCommand = useCallback(
    (minutes: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      setDeviceState((prev) => {
        const nextLed = { ...prev.led, remainingMin: minutes > 0 ? minutes : 0 };
        const updated: RemoteDeviceState = { ...prev, led: nextLed };
        if (onStateUpdate) onStateUpdate(updated);
        return updated;
      });
      wsRef.current.send(
        JSON.stringify({
          type: "rgb_timer",
          deviceId: currentDeviceId,
          minutes,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId, onStateUpdate]
  );

  // Send Matrix Hardware Configuration (rows, cols, wiring, pin, enabled)
  const sendMatrixHardwareConfigCommand = useCallback(
    (cfg: { rows: number; cols: number; wiringType: number; pin: number; enabled: boolean }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "matrix_config",
          deviceId: currentDeviceId,
          ...cfg,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId]
  );

  // Send Master Buzzer Toggle Command
  const sendBuzzerCommand = useCallback(
    (enabled: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "buzzer_set",
          deviceId: currentDeviceId,
          enabled,
          timestamp: Date.now(),
        })
      );
    },
    [currentDeviceId]
  );

  // Send Test Buzzer Beep Command
  const sendBuzzerBeepCommand = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "buzzer_beep",
        deviceId: currentDeviceId,
        timestamp: Date.now(),
      })
    );
  }, [currentDeviceId]);

  // Send Save / Update Schedule Rule Command over Cloud WS
  const sendScheduleSave = useCallback(
    (rule: ScheduleRule) => {
      const relayMask = rule.relayMask !== undefined
        ? rule.relayMask
        : (rule.targetType === 4 ? 0x0F : rule.targetType < 4 ? (1 << rule.targetType) : 0);
      const ledTarget = rule.ledTarget !== undefined
        ? rule.ledTarget
        : (rule.targetType === 5);

      const normalizedRule: ScheduleRule = { ...rule, relayMask, ledTarget };

      // Optimistically update deviceState.schedules
      setDeviceState((prev) => {
        const curSchedules = prev.schedules || [];
        const next = curSchedules.some((s) => s.id === rule.id)
          ? curSchedules.map((s) => (s.id === rule.id ? normalizedRule : s))
          : [...curSchedules, normalizedRule];
        return { ...prev, schedules: next };
      });

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot save schedule: Cloud WebSocket offline", "warn");
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "schedule_set",
          deviceId: currentDeviceId,
          id: rule.id,
          enabled: rule.enabled,
          daysMask: rule.daysMask,
          startHour: rule.startHour,
          startMin: rule.startMin,
          stopType: rule.stopType,
          durationMin: rule.durationMin,
          stopHour: rule.stopHour,
          stopMin: rule.stopMin,
          targetType: rule.targetType ?? 6,
          targetAction: rule.targetAction,
          relayMask,
          ledTarget,
          rgbR: rule.rgbR ?? 0,
          rgbG: rule.rgbG ?? 180,
          rgbB: rule.rgbB ?? 255,
          rgbBri: rule.rgbBri ?? 50,
          name: rule.name,
          timestamp: Date.now(),
        })
      );
      if (onToast) onToast(`Schedule rule #${rule.id + 1} synced over Cloud!`, "success");
    },
    [currentDeviceId, onToast]
  );

  // Send Delete / Disable Schedule Rule Command over Cloud WS
  const sendScheduleDelete = useCallback(
    (ruleId: number) => {
      setDeviceState((prev) => {
        const curSchedules = prev.schedules || [];
        const next = curSchedules.filter((s) => s.id !== ruleId);
        return { ...prev, schedules: next };
      });

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot delete: Cloud WebSocket offline", "warn");
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "schedule_delete",
          deviceId: currentDeviceId,
          id: ruleId,
          timestamp: Date.now(),
        })
      );
      if (onToast) onToast(`Disabled rule #${ruleId + 1} over Cloud`, "info");
    },
    [currentDeviceId, onToast]
  );

  // Send Test Schedule Rule Command over Cloud WS
  const sendScheduleTest = useCallback(
    (ruleId: number, isStart: boolean = true) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot test: Cloud WebSocket offline", "warn");
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "schedule_test",
          deviceId: currentDeviceId,
          id: ruleId,
          isStart,
          timestamp: Date.now(),
        })
      );
      if (onToast) onToast(`Tested schedule #${ruleId + 1} (${isStart ? "Start" : "Stop"})`, "info");
    },
    [currentDeviceId, onToast]
  );

  // Send Time Sync Command over Cloud WS
  const sendTimeSync = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const now = new Date();
    wsRef.current.send(
      JSON.stringify({
        type: "time_sync",
        deviceId: currentDeviceId,
        h: now.getHours(),
        m: now.getMinutes(),
        s: now.getSeconds(),
        dow: now.getDay(),
        timestamp: Date.now(),
      })
    );
    if (onToast) onToast("Synchronized hardware clock with browser time", "info");
  }, [currentDeviceId, onToast]);

  return {
    wsUrl: effectiveWsUrl,
    userId: currentUserId,
    password: currentPassword,
    deviceId: currentDeviceId,
    updateCredentials,
    reconnect: forceReconnect,
    requestState,
    isWsConnected,
    isDeviceOnline,
    remoteModeEnabled,
    deviceState,
    toggleRemoteMode,
    sendRelayCommand,
    sendRelayTimerCommand,
    sendRelayConfigCommand,
    sendLedCommand,
    sendMusicFrame,
    sendRenameCommand,
    sendStripLengthCommand,
    sendMatrixCommand,
    sendMatrixHardwareConfigCommand,
    sendTempOffsetCommand,
    sendPresenceConfigCommand,
    sendMasterDeviceCommand,
    sendRgbTimerCommand,
    sendBuzzerCommand,
    sendBuzzerBeepCommand,
    sendScheduleSave,
    sendScheduleDelete,
    sendScheduleTest,
    sendTimeSync,
    sendAllOff,
  };
}
