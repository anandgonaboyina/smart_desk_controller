/**
 * useSettings.js — React hook for client theme and operating role.
 *
 * Purpose : Synchronizes theme attribute on html element and manages Display vs Remote role.
 * Depends : React, store.js, ble.js.
 * Used by : Header.js, SystemScreen.js, layout.js.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import store from '../lib/store.js';
import ble from '../lib/ble.js';

export function useSettings() {
  const [theme, setThemeState] = useState('dark');
  const [clientRole, setClientRoleState] = useState('display');

  useEffect(() => {
    const savedTheme = store.getTheme();
    const savedRole = store.getClientRole();
    setThemeState(savedTheme);
    setClientRoleState(savedRole);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    store.setTheme(newTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  }, []);

  const setClientRole = useCallback((newRole) => {
    const normalized = newRole === 'remote' ? 'remote' : 'display';
    setClientRoleState(normalized);
    store.setClientRole(normalized);
    // Send updated role over BLE if connected
    if (ble.isConnected()) {
      ble.sendClientRole().catch(() => {});
    }
  }, []);

  return {
    theme,
    clientRole,
    setTheme,
    setClientRole,
    isDisplay: clientRole === 'display',
    isRemote: clientRole === 'remote',
  };
}

export default useSettings;
