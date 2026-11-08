/**
 * useRemoteDeskWs.ts — Next.js Cloud WebSocket Hook for SmartDesk V2
 *
 * Purpose : Connects the PWA to the Render IoT relay backend from anywhere in the world.
 *           Handles multi-user authentication, device state telemetry, and Remote Mode toggle.
 * Depends : React (useState, useEffect, useCallback, useRef)
 * Used by : QuickRemotePanel.tsx, SettingsPanel.tsx, AodFaceScreen.tsx
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface RemoteRelayState {
  load: boolean;
  remainingMin: number;
}

export interface RemoteDeviceState {
  relays: RemoteRelayState[];
  led?: { mode: number; r: number; g: number; b: number; bri: number; spd: number };
  env?: { tempC: number; humidity: number; valid: boolean };
  presence?: { state: number; distanceM: number; remainingMin: number };
}

export interface UseRemoteDeskWsOptions {
  wsUrl?: string;
  userId?: string;
  deviceId?: string;
  onStateUpdate?: (state: RemoteDeviceState) => void;
  onToast?: (message: string, type?: "info" | "success" | "error" | "warn") => void;
}

export function useRemoteDeskWs({
  wsUrl = process.env.NEXT_PUBLIC_REMOTE_WS_URL || "ws://localhost:3001/ws",
  userId = "user_anand_primary",
  deviceId = "desk_anand_s3",
  onStateUpdate,
  onToast,
}: UseRemoteDeskWsOptions = {}) {
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [remoteModeEnabled, setRemoteModeEnabled] = useState<boolean>(false);
  const [deviceState, setDeviceState] = useState<RemoteDeviceState>({
    relays: [
      { load: false, remainingMin: 0 },
      { load: false, remainingMin: 0 },
      { load: false, remainingMin: 0 },
      { load: false, remainingMin: 0 },
    ],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsWsConnected(true);
        console.log(`[CLOUD WS] Connected to relay server at ${wsUrl}`);

        // Send Multi-User Authentication Handshake
        const authPayload = {
          type: "auth",
          role: "client",
          userId,
          deviceId,
          timestamp: Date.now(),
        };
        socket.send(JSON.stringify(authPayload));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "auth_res") {
            if (data.ok) {
              setIsDeviceOnline(Boolean(data.deviceOnline));
              setRemoteModeEnabled(Boolean(data.remoteModeEnabled));
              if (data.currentState) {
                setDeviceState(data.currentState);
                if (onStateUpdate) onStateUpdate(data.currentState);
              }
            } else {
              console.error("[CLOUD WS] Authentication failed:", data.error);
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
            setDeviceState((prev) => {
              const updated = { ...prev, ...data };
              if (onStateUpdate) onStateUpdate(updated);
              return updated;
            });
          }

          if (data.type === "error") {
            if (onToast) onToast(data.message || "Cloud error", "error");
          }
        } catch (e) {
          console.error("[CLOUD WS] Message parse error", e);
        }
      };

      socket.onclose = () => {
        setIsWsConnected(false);
        setIsDeviceOnline(false);
        wsRef.current = null;
        console.log("[CLOUD WS] Connection closed. Retrying in 5 seconds...");
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      socket.onerror = (err) => {
        console.warn("[CLOUD WS] Socket encountered error:", err);
      };
    } catch (err) {
      console.error("[CLOUD WS] Connection attempt error", err);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [wsUrl, userId, deviceId, onStateUpdate, onToast]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Toggle Remote Mode ("User Away" Mode)
  const toggleRemoteMode = useCallback(
    (enabled: boolean) => {
      setRemoteModeEnabled(enabled);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "set_remote_mode",
            deviceId,
            enabled,
          })
        );
      }
    },
    [deviceId]
  );

  // Send Remote Relay Control Command
  const sendRelayCommand = useCallback(
    (channel: number, state: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        if (onToast) onToast("Cannot send: Cloud relay disconnected", "error");
        return;
      }
      wsRef.current.send(
        JSON.stringify({
          type: "relay_set",
          deviceId,
          channel,
          state,
          timestamp: Date.now(),
        })
      );
    },
    [deviceId, onToast]
  );

  // Send Remote LED Command
  const sendLedCommand = useCallback(
    (mode: number, r: number, g: number, b: number, bri: number, spd: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "led_set",
          deviceId,
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
    [deviceId]
  );

  // Emergency All Relays Off Command
  const sendAllOff = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "all_off",
        deviceId,
        timestamp: Date.now(),
      })
    );
  }, [deviceId]);

  return {
    isWsConnected,
    isDeviceOnline,
    remoteModeEnabled,
    deviceState,
    toggleRemoteMode,
    sendRelayCommand,
    sendLedCommand,
    sendAllOff,
  };
}
