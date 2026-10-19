/**
 * ConfirmDialog.js — Accessible confirmation modal.
 *
 * Purpose : Safety confirmation for photosensitivity rapid blink warnings and factory resets.
 * Depends : React only.
 * Used by : LedScreen.js, SystemScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function ConfirmDialog({
  isOpen = false,
  title = 'Please Confirm',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Proceed',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: '12px', fontSize: '1.15rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

