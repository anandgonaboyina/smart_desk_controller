"use client";
import { useEffect, useState } from "react";

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect if the user is already inside the installed PWA or APK
    const isRunningStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      ("standalone" in window.navigator && (window.navigator as any).standalone === true);
    
    setIsStandalone(isRunningStandalone);

    // 2. Catch the PWA install prompt (Chrome/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Listen for successful install to hide the buttons immediately
    const handleAppInstalled = () => setIsStandalone(true);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // If already installed (PWA or APK), render nothing.
  if (isStandalone) return null;

  return (
    // Sleek glassmorphism container wrapper
    <div className="flex flex-wrap justify-center mx-auto items-center gap-3 bg-zinc-900/60 backdrop-blur-md border border-white/10 p-2 rounded-2xl w-fit shadow-2xl">
      
      {/* PWA Button - Only shows if supported */}
      {
        <button 
          onClick={() => { promptEvent.prompt(); setPromptEvent(null); }} 
          className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded-xl font-bold text-sm tracking-tight transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          📱 Install PWA
        </button>
      }

      {/* APK Button - Always shows in browser */}
      <a 
        href="/smartdesk-v2.apk" 
        download
        className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 px-4 py-1.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 active:scale-95"
      >
        <img 
          src="/icon-512x512.png?v=2" 
          alt="App Icon" 
          className="w-5 h-5 rounded-md drop-shadow-md" 
        /> Android APK
      </a>
      
    </div>
  );
}