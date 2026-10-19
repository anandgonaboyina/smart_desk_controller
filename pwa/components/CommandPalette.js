/**
 * CommandPalette.js — Instant action launcher (Ctrl+K).
 *
 * Purpose : Keyboard-driven quick command palette for power users.
 * Depends : React only.
 * Used by : Root app shell, dev-preview.
 */

"use client";

import React, { useState, useEffect } from 'react';

const PALETTE_COMMANDS = [
  { id: 'all_off', label: 'All Loads OFF', icon: '⚡', category: 'Relays' },
  { id: 'safe_state', label: 'Safe State (Relays & LEDs Dark)', icon: '🛡️', category: 'Safety' },
  { id: 'away_toggle', label: 'Activate Away Mode', icon: '🚶', category: 'Desk' },
  { id: 'call_toggle', label: 'Toggle Call Mode (Busy Light)', icon: '📞', category: 'Lighting' },
  { id: 'selftest', label: 'Run Device Self-Test', icon: '🔍', category: 'Diagnostics' },
  { id: 'toggle_demo', label: 'Toggle Demo Simulator', icon: '🧪', category: 'System' },
  { id: 'toggle_theme', label: 'Cycle Color Theme', icon: '🎨', category: 'Display' },
];

export default function CommandPalette({ isOpen = false, onClose, onExecuteCommand }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose && onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose && onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = PALETTE_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '16px' }}>
        <input
          type="text"
          autoFocus
          placeholder="Type a command or search... (ESC to exit)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', height: '48px', fontSize: '1.05rem', marginBottom: '12px' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                onExecuteCommand && onExecuteCommand(cmd.id);
                onClose && onClose();
              }}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', width: '100%', height: '44px', padding: '0 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{cmd.icon}</span>
                <span>{cmd.label}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cmd.category}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

