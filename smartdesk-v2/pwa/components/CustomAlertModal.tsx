/**
 * CustomAlertModal.tsx — Accessible glassmorphic modal replacement for window.alert and confirm.
 *
 * Purpose : Renders dark glassy modal for notifications, errors, and confirmations.
 * Depends : React.
 * Used by : app/page.tsx.
 */

"use client";

import React, { useEffect } from "react";

export interface ModalAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirm?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function CustomAlertModal({
  isOpen,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  isConfirm = false,
  onConfirm,
  onCancel,
}: ModalAlertProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isConfirm && onCancel) onCancel();
        else onConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isConfirm, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-5 text-white flex flex-col gap-4">
        <div>
          <h3 id="modal-title" className="text-base font-bold font-mono text-cyan-300">
            {title}
          </h3>
          <p className="text-xs text-zinc-300 mt-2 whitespace-pre-line leading-relaxed font-sans">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          {isConfirm && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-all cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-mono font-bold text-white transition-all shadow-md shadow-cyan-950/50 cursor-pointer active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

