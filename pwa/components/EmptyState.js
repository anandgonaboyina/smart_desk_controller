/**
 * EmptyState.js — Informational placeholder for empty lists and views.
 *
 * Purpose : Presents friendly icon, title, description, and optional action trigger.
 * Depends : React only.
 * Used by : Screens, dev-preview.
 */

"use client";

import React from 'react';

export default function EmptyState({
  icon = '📭',
  title = 'No Items Found',
  description = 'There are currently no items to display.',
  actionLabel = null,
  onAction = null,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border-subtle)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '320px', marginBottom: actionLabel ? '16px' : '0' }}>
        {description}
      </div>

      {actionLabel && (
        <button className="btn btn-primary" onClick={onAction} style={{ height: '40px', minHeight: '40px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
