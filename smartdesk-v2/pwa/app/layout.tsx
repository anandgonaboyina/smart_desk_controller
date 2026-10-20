import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartDesk V2 Controller",
  description: "ESP32-S3 BLE Smart Desk Controller",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-950 text-zinc-100 antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
