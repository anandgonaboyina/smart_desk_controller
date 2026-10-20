/**
 * CaptionBar.js — Animated speech / caption display bubble.
 */

"use client";

import React from 'react';

export default function CaptionBar({ caption = 'Desk standing by' }) {
  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/70 backdrop-blur-md border border-white/10 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <span className="flex items-center gap-2 text-white text-sm md:text-base font-medium tracking-wide whitespace-nowrap">
        <span className="text-xl">💬</span> 
        {caption}
      </span>
    </div>
  );
}