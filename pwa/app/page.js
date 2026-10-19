/**
 * page.js — Main App entrypoint.
 *
 * Purpose : Renders the preview showcase for Part 10 (will be replaced by full mode router in Part 11).
 * Depends : dev-preview/page.js.
 * Used by : Root route (/).
 */

"use client";

import DevPreviewPage from './dev-preview/page.js';

export default function HomePage() {
  return <DevPreviewPage />;
}

