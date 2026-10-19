/**
 * CaptionBar.js — Animated speech / caption display bubble.
 *
 * Purpose : Renders dynamic status captions triggered by desk events and rules.
 * Depends : React only.
 * Used by : DisplayScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function CaptionBar({ caption = 'Desk standing by' }) {
  return (
    <div className="display-caption-box">
      <span>💬 {caption}</span>
    </div>
  );
}

