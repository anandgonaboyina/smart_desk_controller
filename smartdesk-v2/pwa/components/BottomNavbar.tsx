"use client";

import React from "react";

export type NavTab = "aod" | "remote" | "relays" | "leds" | "schedule" | "presence" | "settings";

export interface BottomNavbarProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  connected: boolean;
}

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: "remote", label: "Remote", icon: "🎮" },
  { id: "relays", label: "Relays", icon: "⚡" },
  { id: "leds", label: "RGB", icon: "🌈" },
  { id: "schedule", label: "Timer", icon: "📅" },
  { id: "presence", label: "Away", icon: "📡" },
  { id: "settings", label: "Setup", icon: "⚙️" },
];

export default function BottomNavbar({ activeTab, onChangeTab, connected }: BottomNavbarProps) {
  return (
    <nav className="fixed bottom-3 sm:bottom-4 inset-x-0 mx-auto w-max z-40 px-2 transition-all">
      <div className="flex items-center gap-1 sm:gap-3 px-2 py-2 rounded-2xl bg-zinc-950 border-2 border-zinc-700 shadow-[0_10px_40px_rgba(0,0,0,1)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-3 sm:px-5 sm:py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? "bg-cyan-500 text-black border-2 border-cyan-400"
                  : "bg-zinc-900 text-zinc-300 border-2 border-zinc-800 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span className="text-lg sm:text-xl">{tab.icon}</span>
              <span className="hidden sm:inline-block">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}