/**
 * layout.js — Root App Router layout for SmartDesk PWA.
 *
 * Purpose : Sets up HTML structure, metadata, viewport, service worker registration, and styles.
 * Depends : React, styles.
 * Used by : Next.js App Router.
 */

import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/themes.css';

export const metadata = {
  title: 'SmartDesk Controller',
  description: 'BLE-only smart desk controller and telemetry monitor',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import ServiceWorkerManager from '../components/ServiceWorkerManager.js';

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="icon" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <div className="app-viewport">
          {children}
          <ServiceWorkerManager />
        </div>
      </body>
    </html>
  );
}
