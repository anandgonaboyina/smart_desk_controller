/**
 * RenameModal.tsx — Accessible modal for renaming the SmartDesk BLE device.
 *
 * Purpose : Renames controller and updates NVS flash.
 * Depends : React.
 * Used by : SettingsPanel.tsx.
 */

"use client";

import React, { useState, useEffect } from "react";

export interface RenameModalProps {
  isOpen: boolean;
  currentName: string;
  onSave: (newName: string) => void;
  onClose: () => void;
}

export default function RenameModal({
  isOpen,
  currentName,
  onSave,
  onClose,
}: RenameModalProps) {
  const [name, setName] = useState<string>(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-white font-mono text-xs">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-sm font-bold text-cyan-300">Rename Controller</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2">
          <label className="text-[10px] uppercase text-zinc-400 font-bold block">
            Bluetooth Device Name (Max 20 chars):
          </label>
          <input
            type="text"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
          />
          <p className="text-[11px] text-zinc-500">
            Saved to ESP32 non-volatile flash. Updates live Bluetooth advertisement.
          </p>
        </div>

        <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (name.trim()) {
                onSave(name.trim());
                onClose();
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
}

