/**
 * Toast.js — Floating toast notification stack.
 *
 * Purpose : Auto-dismissing status alert notifications for connections, actions, and errors.
 * Depends : React only.
 * Used by : Root app shell, dev-preview.
 */

"use client";

import React from 'react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const borderStyle = t.type === 'error'
          ? '1px solid var(--accent-danger)'
          : t.type === 'success'
          ? '1px solid var(--accent-success)'
          : '1px solid var(--border-subtle)';

        return (
          <div
            key={t.id}
            className="toast"
            style={{ border: borderStyle, cursor: 'pointer' }}
            onClick={() => onDismiss && onDismiss(t.id)}
            title="Click to dismiss"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t.type === 'error' ? '❌' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
              <span>{t.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

