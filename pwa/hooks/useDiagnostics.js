/**
 * useDiagnostics.js — React hook for device self-test execution and log level control.
 *
 * Purpose : Triggers firmware self-test suite, parses PASS/FAIL/SKIP lines,
 *           tracks running state, and manages log level/enabled controls.
 * Depends : React, bus.js, ble.js.
 * Used by : DiagnosticsPanel.js, dev-preview.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import bus from '../lib/bus.js';
import ble from '../lib/ble.js';

export function useDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [logLevel, setLogLevelState] = useState(3); // 3=INFO
  const [logEnabled, setLogEnabledState] = useState(true);

  useEffect(() => {
    const unsub = bus.on('ble:device_log', (line) => {
      if (!line) return;

      // Match self test line: "[PASS] Reset Reason             : OK"
      // or "[FAIL] Relay Electrical         : [HARDWARE] Pin GPIO4 read 0..."
      const match = line.match(/\[(PASS|FAIL|SKIP)\]\s+([^:]+):\s+(.*)$/);
      if (match) {
        const status = match[1];
        const testName = match[2].trim();
        const details = match[3].trim();

        // Extract fault attribution if present: "[HARDWARE] details"
        const faultMatch = details.match(/^\[([A-Z/]+)\]\s+(.*)$/);
        const faultType = faultMatch ? faultMatch[1] : null;
        const hint = faultMatch ? faultMatch[2] : details;

        setTestResults((prev) => {
          const filtered = prev.filter((t) => t.testName !== testName);
          return [...filtered, { testName, status, faultType, hint }];
        });
      }

      if (line.includes('Self-Test Finished')) {
        setIsRunning(false);
      }
    });

    return unsub;
  }, []);

  const runSelfTest = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);
    await ble.runSelfTest();
  }, []);

  const updateLogLevel = useCallback((lvl) => {
    setLogLevelState(lvl);
    ble.setLogLevel(lvl);
  }, []);

  const updateLogEnabled = useCallback((enabled) => {
    setLogEnabledState(enabled);
    ble.setLogEnabled(enabled);
  }, []);

  return {
    isRunning,
    testResults,
    logLevel,
    logEnabled,
    runSelfTest,
    updateLogLevel,
    updateLogEnabled,
  };
}

export default useDiagnostics;

