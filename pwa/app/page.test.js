/**
 * page.js — Isolated Minimal GPIO 4 Test App
 *
 * Purpose : Standalone, direct Web Bluetooth test screen for ESP32-S3 GPIO 4 LED.
 *           Zero layer indirection, zero mock pollution. Direct Web Bluetooth API.
 * Depends : React only.
 * Backup  : Full application shell is preserved in app/page.full.js.
 */

"use client";

import { useState, useEffect, useRef } from 'react';

const SERVICE_UUID = "d3a00000-1b0e-4e6a-9b3f-c0f2a8d7e5b1";
const CHAR_GPIO4_UUID = "d3a00003-1b0e-4e6a-9b3f-c0f2a8d7e5b1";

export default function Gpio4TestPage() {
  const [device, setDevice] = useState(null);
  const [server, setServer] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ledState, setLedState] = useState(false);
  const [logs, setLogs] = useState([]);
  const [bluetoothSupported, setBluetoothSupported] = useState(true);

  const logsEndRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, msg, type }]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !navigator.bluetooth) {
      setBluetoothSupported(false);
      addLog("Web Bluetooth is NOT supported in this browser. Please use Chrome, Edge, or Opera.", 'error');
    } else {
      addLog("System ready. ESP32-S3 minimal GPIO 4 test firmware is loaded.");
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Connect BLE
  const connectDevice = async () => {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth not supported. Use Google Chrome or Edge.");
      return;
    }

    try {
      setIsConnecting(true);
      addLog("Scanning for SmartDesk ESP32-S3...", 'info');

      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'SmartDesk' }],
        optionalServices: [SERVICE_UUID]
      });

      addLog(`Selected device: ${dev.name || 'Unnamed'} (${dev.id})`, 'success');

      dev.addEventListener('gattserverdisconnected', onDisconnected);

      addLog("Connecting to GATT Server...", 'info');
      const gattServer = await dev.gatt.connect();
      addLog("Connected to GATT Server! Fetching primary service...", 'success');

      const service = await gattServer.getPrimaryService(SERVICE_UUID);
      addLog("Service found! Fetching GPIO 4 characteristic...", 'info');

      const char = await service.getCharacteristic(CHAR_GPIO4_UUID);
      addLog("GPIO 4 characteristic ready!", 'success');

      // Subscribe to live notifications from ESP32
      try {
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
          const val = e.target.value.getUint8(0);
          const isHigh = val === 1;
          setLedState(isHigh);
          addLog(`[ESP32 NOTIFY] GPIO 4 hardware feedback: ${isHigh ? 'HIGH (ON)' : 'LOW (OFF)'} (raw: ${val})`, 'success');
        });
        addLog("Subscribed to live GPIO 4 feedback notifications.", 'info');
      } catch (subErr) {
        addLog(`Notice: Could not subscribe to notifications (${subErr.message}), will use direct reads/writes.`, 'warn');
      }

      // Initial Read
      try {
        const currentVal = await char.readValue();
        const initialHigh = currentVal.getUint8(0) === 1;
        setLedState(initialHigh);
        addLog(`Current initial GPIO 4 state on hardware: ${initialHigh ? 'HIGH (ON)' : 'LOW (OFF)'}`, 'info');
      } catch (readErr) {
        addLog(`Could not read initial state: ${readErr.message}`, 'warn');
      }

      setDevice(dev);
      setServer(gattServer);
      setCharacteristic(char);
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      setIsConnecting(false);
      addLog(`Connection failed: ${err.message}`, 'error');
    }
  };

  const onDisconnected = (e) => {
    setIsConnected(false);
    setCharacteristic(null);
    setServer(null);
    addLog(`Device disconnected (${e.target?.name || 'SmartDesk'}).`, 'warn');
  };

  const disconnectDevice = async () => {
    if (server && server.connected) {
      addLog("Disconnecting...", 'info');
      server.disconnect();
    }
    setIsConnected(false);
    setCharacteristic(null);
    setServer(null);
  };

  // Turn GPIO 4 ON (HIGH)
  const setPinState = async (turnOn) => {
    if (!characteristic) {
      addLog("Cannot send: Characteristic not available. Connect first.", 'error');
      return;
    }

    try {
      const payload = new Uint8Array([turnOn ? 1 : 0]);
      addLog(`Sending write to GPIO 4: ${turnOn ? '1 (HIGH / 3.3V)' : '0 (LOW / 0V)'}...`, 'info');
      await characteristic.writeValue(payload);
      setLedState(turnOn);
      addLog(`Write confirmed! GPIO 4 set to ${turnOn ? 'HIGH' : 'LOW'}.`, 'success');
    } catch (err) {
      addLog(`Write error: ${err.message}`, 'error');
    }
  };

  // Pulse 500ms
  const pulsePin = async () => {
    if (!characteristic) return;
    addLog("Starting 500ms pulse test...", 'info');
    await setPinState(true);
    setTimeout(async () => {
      await setPinState(false);
      addLog("Pulse complete.", 'info');
    }, 500);
  };

  // Query hardware state
  const readHardwareState = async () => {
    if (!characteristic) return;
    try {
      addLog("Reading live hardware state from ESP32...", 'info');
      const val = await characteristic.readValue();
      const isHigh = val.getUint8(0) === 1;
      setLedState(isHigh);
      addLog(`Hardware readback: GPIO 4 is ${isHigh ? 'HIGH (ON)' : 'LOW (OFF)'}`, 'success');
    } catch (err) {
      addLog(`Read error: ${err.message}`, 'error');
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0d14',
      color: '#f0f4f8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        
        {/* Header */}
        <header style={{
          marginBottom: '24px',
          borderBottom: '1px solid #1f293d',
          paddingBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8' }}>
              SmartDesk ESP32-S3 Hardware Verifier
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              Isolated Direct BLE & GPIO 4 Test
            </p>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isConnected ? '#22c55e' : '#ef4444'}`,
            color: isConnected ? '#4ade80' : '#f87171',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? '0 0 8px #22c55e' : 'none'
            }} />
            {isConnecting ? 'Connecting...' : (isConnected ? `Connected: ${device?.name}` : 'Disconnected')}
          </div>
        </header>

        {!bluetoothSupported && (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#fca5a5'
          }}>
            ⚠️ <strong>Web Bluetooth Not Supported:</strong> Open this page in Google Chrome or Microsoft Edge on Windows/Mac/Android.
          </div>
        )}

        {/* Action Controls */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#e2e8f0' }}>
            1. BLE Device Connection
          </h2>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!isConnected ? (
              <button
                onClick={connectDevice}
                disabled={isConnecting}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                  opacity: isConnecting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ⚡ {isConnecting ? 'Opening Chrome BLE Dialog...' : 'Connect to SmartDesk ESP32-S3'}
              </button>
            ) : (
              <button
                onClick={disconnectDevice}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            )}

            {isConnected && (
              <button
                onClick={readHardwareState}
                style={{
                  padding: '12px 18px',
                  backgroundColor: '#374151',
                  color: '#f3f4f6',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Query ESP32 State
              </button>
            )}
          </div>
        </div>

        {/* Hardware GPIO 4 Controls */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          opacity: isConnected ? 1 : 0.6,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#e2e8f0' }}>
              2. Hardware GPIO 4 Test Control
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 16px',
              borderRadius: '8px',
              backgroundColor: ledState ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `1px solid ${ledState ? '#22c55e' : '#475569'}`
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: ledState ? '#22c55e' : '#64748b',
                boxShadow: ledState ? '0 0 12px #22c55e' : 'none'
              }} />
              <span style={{ fontWeight: 700, color: ledState ? '#4ade80' : '#94a3b8' }}>
                GPIO 4: {ledState ? 'HIGH (LED ON)' : 'LOW (LED OFF)'}
              </span>
            </div>
          </div>

          <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: '0.9rem' }}>
            Connect an LED (or Multimeter) between <strong>GPIO 4</strong> and <strong>GND</strong> on the ESP32-S3.
            Click below to instantly trigger 3.3V or 0V.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPinState(true)}
              disabled={!isConnected}
              style={{
                flex: '1 1 180px',
                padding: '16px',
                backgroundColor: ledState ? '#16a34a' : '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: isConnected ? 'pointer' : 'not-allowed',
                boxShadow: ledState ? '0 0 16px rgba(34, 197, 94, 0.4)' : 'none'
              }}
            >
              💡 Turn LED ON (HIGH)
            </button>

            <button
              onClick={() => setPinState(false)}
              disabled={!isConnected}
              style={{
                flex: '1 1 180px',
                padding: '16px',
                backgroundColor: !ledState ? '#475569' : '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: isConnected ? 'pointer' : 'not-allowed'
              }}
            >
              🌑 Turn LED OFF (LOW)
            </button>

            <button
              onClick={pulsePin}
              disabled={!isConnected}
              style={{
                flex: '1 1 140px',
                padding: '16px',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: isConnected ? 'pointer' : 'not-allowed'
              }}
            >
              ⏱️ 500ms Pulse
            </button>
          </div>
        </div>

        {/* Live Diagnostics Log Box */}
        <div style={{
          backgroundColor: '#030712',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live BLE & Hardware Event Log
            </h3>
            <button
              onClick={clearLogs}
              style={{
                padding: '4px 10px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #374151',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Clear Logs
            </button>
          </div>

          <div style={{
            height: '240px',
            overflowY: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            padding: '12px',
            backgroundColor: '#000000',
            borderRadius: '6px',
            border: '1px solid #111827'
          }}>
            {logs.length === 0 ? (
              <span style={{ color: '#4b5563' }}>No events recorded yet. Connect to begin.</span>
            ) : (
              logs.map((log, idx) => {
                let color = '#d1d5db';
                if (log.type === 'error') color = '#f87171';
                if (log.type === 'success') color = '#4ade80';
                if (log.type === 'warn') color = '#fbbf24';
                return (
                  <div key={idx} style={{ color, marginBottom: '4px' }}>
                    <span style={{ color: '#6b7280', marginRight: '8px' }}>[{log.time}]</span>
                    {log.msg}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
