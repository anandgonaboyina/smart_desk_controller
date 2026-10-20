/**
 * ToastNotification.tsx — Minimal floating toast for instant feedback.
 *
 * Purpose : Non-blocking notification banner for commands and events.
 * Depends : React.
 * Used by : app/page.tsx.
 */

"use client";

import React, { useEffect } from "react";

export interface ToastProps {
  message: string | null;
  type?: "info" | "success" | "warn" | "error";
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({
  message,
  type = "info",
  onClose,
  duration = 3000,
}: ToastProps) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) return null;

  const bgStyles =
    type === "success"
      ? "bg-emerald-950/90 border-emerald-600/80 text-emerald-200"
      : type === "warn"
      ? "bg-amber-950/90 border-amber-600/80 text-amber-200"
      : type === "error"
      ? "bg-rose-950/90 border-rose-600/80 text-rose-200"
      : "bg-cyan-950/90 border-cyan-600/80 text-cyan-200";

  return (
    <div className="fixed top-4 inset-x-0 mx-auto w-fit z-50 px-4 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        className={`px-4 py-2 rounded-full border shadow-2xl backdrop-blur-md text-xs font-mono font-medium flex items-center gap-2 pointer-events-auto ${bgStyles}`}
      >
        <span>
          {type === "success" ? "✓" : type === "warn" ? "⚠️" : type === "error" ? "✕" : "ℹ️"}
        </span>
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-zinc-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

