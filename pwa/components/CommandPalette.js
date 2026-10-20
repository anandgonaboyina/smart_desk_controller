/**
 * CommandPalette.js — Instant action launcher (Ctrl+K).
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-400 text-xl pl-2">🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search... (ESC to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-16 px-4 text-lg bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth custom-scrollbar">
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-1">
              {filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    onExecuteCommand && onExecuteCommand(cmd.id);
                    onClose && onClose();
                  }}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 shadow-sm text-lg transition-colors">
                      {cmd.icon}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cmd.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                    {cmd.category}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <span className="text-4xl mb-3">👻</span>
              <p>No matching commands found.</p>
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
          <span>Navigate with <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[10px]">↓</kbd></span>
          <span>Close with <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[10px]">ESC</kbd></span>
        </div>
      </div>
    </div>
  );
}