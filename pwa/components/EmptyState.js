/**
 * EmptyState.js — Informational placeholder for empty lists and views.
 */

"use client";

import React from 'react';

export default function EmptyState({
  icon = '📭',
  title = 'No Items Found',
  description = 'There are currently no items to display.',
  actionLabel = null,
  onAction = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="text-5xl mb-4 drop-shadow-sm">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && (
        <button 
          onClick={onAction} 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}