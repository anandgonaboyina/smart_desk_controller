// Ensure null-prototype header dictionaries safely support .hasOwnProperty()
// Force Vercel rebuild for assetlinks
if (typeof Object.create === "function") {
  const origCreate = Object.create;
  Object.create = function (proto: any, props?: any) {
    const obj = origCreate(proto, props);
    if (proto === null) {
      Object.defineProperty(obj, "hasOwnProperty", {
        value: function (p: string | symbol) {
          return Object.prototype.hasOwnProperty.call(this, p);
        },
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    return obj;
  };
}

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartDesk V2",
  description: "ESP32-S3 BLE Smart Desk Controller",
  manifest: "/manifest.json",
  icons: {
    icon: "/SmartDesk logo.png",
    shortcut: "/SmartDesk logo.png",
    apple: "/SmartDesk logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartDesk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents annoying pinch-to-zoom on mobile
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased bg-[#050505]">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/SmartDesk logo.png" />
        <link rel="apple-touch-icon" href="/SmartDesk logo.png" />
      </head>
      {/* 
        fixed inset-0 and overflow-hidden prevent native body scrolling.
        This forces all scrolling to happen exactly where we want it inside page.tsx! 
      */}
      <body className="fixed inset-0 overflow-hidden font-sans text-zinc-100 selection:bg-cyan-500 selection:text-black bg-[#050505]">
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('[SW] Registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}