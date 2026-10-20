/**
 * ConfirmDialog.js — Accessible confirmation modal.
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
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDanger ? '⚠️ ' : ''} {title}
        </h3>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ minHeight: '40px', padding: '0 16px' }}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            style={{ minHeight: '40px', padding: '0 20px', fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}