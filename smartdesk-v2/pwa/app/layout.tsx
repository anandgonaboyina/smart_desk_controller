import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartDesk V2",
  description: "ESP32-S3 BLE Smart Desk Controller",
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
      <body className="min-h-[100dvh] flex flex-col font-sans text-zinc-100 selection:bg-cyan-500 selection:text-black overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}