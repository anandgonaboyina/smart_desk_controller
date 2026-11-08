// Ensure null-prototype header dictionaries safely support .hasOwnProperty()
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
  themeColor: "#09090b", // Matches zinc-950
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased bg-black sm:bg-zinc-950">
      <head>
        <link rel="icon" type="image/png" href="/SmartDesk logo.png" />
        <link rel="apple-touch-icon" href="/SmartDesk logo.png" />
      </head>
      <body className="min-h-[100dvh] flex flex-col font-sans text-zinc-100 selection:bg-cyan-500 selection:text-black overflow-x-hidden">
        {children}
        <script
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