/**
 * ServiceWorkerManager.js — Client component for service worker registration & update prompts.
 *
 * Purpose : Registers /sw.js, detects background updates, and displays update toast.
 * Depends : React only.
 * Used by : layout.js.
 */

"use client";

import { useEffect, useState } from 'react';

export default function ServiceWorkerManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check if update is waiting
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="sw-update-banner" style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--color-primary, #3b82f6)',
      color: '#ffffff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      maxWidth: '90vw'
    }}>
      <span>A new version of SmartDesk is available!</span>
      <button
        onClick={handleUpdate}
        style={{
          background: '#ffffff',
          color: 'var(--color-primary, #3b82f6)',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Reload Now
      </button>
    </div>
  );
}

