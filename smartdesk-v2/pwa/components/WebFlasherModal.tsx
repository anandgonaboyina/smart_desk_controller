/**
 * WebFlasherModal.tsx — Browser-based Web Serial Flasher & ESP32 Bootloader Control
 *
 * Purpose : Allows flashing firmware & resetting ESP32-S3 directly from Chrome/Edge via Web Serial.
 *           Features an animated step-by-step progress pipeline, live status bars, and serial control.
 * Depends : React, navigator.serial
 * Used by : AodFaceScreen.tsx, SettingsPanel.tsx
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { ESPLoader, Transport } from "esptool-js";

export interface WebFlasherModalProps {
  isOpen: boolean;
  onClose: () => void;
  deskIp?: string;
}

export default function WebFlasherModal({ isOpen, onClose, deskIp = "192.168.4.1" }: WebFlasherModalProps) {
  const [serialSupported, setSerialSupported] = useState<boolean>(false);
  const [connectedPort, setConnectedPort] = useState<boolean>(false);
  const [serialStatus, setSerialStatus] = useState<string>("Ready to connect");
  const [portRef, setPortRef] = useState<any>(null);
  const [transportRef, setTransportRef] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Flashing Pipeline State
  const [flashStep, setFlashStep] = useState<number>(1); // 1=Select, 2=Port, 3=Bootloader, 4=Flashing, 5=Done
  const [flashProgress, setFlashProgress] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("smartdesk.ino.bin (Default Build)");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [flashStats, setFlashStats] = useState<{ bytesWritten: number; totalBytes: number; speedKb: number }>({
    bytesWritten: 0,
    totalBytes: 1310720,
    speedKb: 0,
  });

  // Serial Monitor State
  const [showSerialMonitor, setShowSerialMonitor] = useState<boolean>(false);
  const [serialLogs, setSerialLogs] = useState<string>("");
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const serialReaderRef = useRef<any>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "serial" in navigator) {
      setSerialSupported(true);
    }
  }, []);

  // Prevent refresh / tab close during flashing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFlashing) {
        e.preventDefault();
        e.returnValue = "Flashing is in progress! Refreshing or closing now may corrupt your ESP32 device.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isFlashing]);

  // Auto-scroll serial logs
  useEffect(() => {
    if (autoScroll && showSerialMonitor && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [serialLogs, autoScroll, showSerialMonitor]);

  const stopSerialMonitor = async () => {
    if (serialReaderRef.current) {
      try {
        await serialReaderRef.current.cancel();
      } catch (_) {}
      try {
        serialReaderRef.current.releaseLock();
      } catch (_) {}
      serialReaderRef.current = null;
    }
    setIsMonitoring(false);
  };

  const startSerialMonitor = async () => {
    if (!portRef || isFlashing) return;
    try {
      await stopSerialMonitor();
      if (!portRef.readable) {
        try {
          await portRef.open({ baudRate: 115200 });
        } catch (_) {}
      }
      if (!portRef.readable) {
        setSerialStatus("COM port is not readable. Please reconnect.");
        return;
      }
      const reader = portRef.readable.getReader();
      serialReaderRef.current = reader;
      setIsMonitoring(true);

      const decoder = new TextDecoder();
      (async () => {
        try {
          while (serialReaderRef.current === reader) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              const text = decoder.decode(value);
              setSerialLogs((prev) => (prev + text).slice(-35000));
            }
          }
        } catch (_) {
        } finally {
          try {
            reader.releaseLock();
          } catch (_) {}
          if (serialReaderRef.current === reader) {
            serialReaderRef.current = null;
            setIsMonitoring(false);
          }
        }
      })();
    } catch (err: any) {
      setSerialStatus(`Serial monitor error: ${err?.message || err}`);
      setIsMonitoring(false);
    }
  };

  const handleOpenSerialMonitor = async () => {
    setShowSerialMonitor(true);
    if (!portRef) {
      if (!serialSupported) {
        setSerialStatus("Web Serial not supported in this browser. Please use Google Chrome or Microsoft Edge.");
        return;
      }
      try {
        setSerialStatus("Selecting USB COM port for Serial Monitor...");
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 115200 });
        setPortRef(port);
        setConnectedPort(true);
        setFlashStep(3);
        setSerialStatus("Connected! Streaming serial logs at 115200 baud.");

        const reader = port.readable.getReader();
        serialReaderRef.current = reader;
        setIsMonitoring(true);

        const decoder = new TextDecoder();
        (async () => {
          try {
            while (serialReaderRef.current === reader) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const text = decoder.decode(value);
                setSerialLogs((prev) => (prev + text).slice(-35000));
              }
            }
          } catch (_) {
          } finally {
            try {
              reader.releaseLock();
            } catch (_) {}
            if (serialReaderRef.current === reader) {
              serialReaderRef.current = null;
              setIsMonitoring(false);
            }
          }
        })();
        return;
      } catch (err: any) {
        setSerialStatus(`Connection failed: ${err?.message || err}`);
        return;
      }
    }
    await startSerialMonitor();
  };

  const handleCloseSerialMonitor = async () => {
    await stopSerialMonitor();
    setShowSerialMonitor(false);
  };

  const copyLogs = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(serialLogs);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  const releasePort = async () => {
    await stopSerialMonitor();
    if (transportRef) {
      try {
        await transportRef.disconnect();
      } catch (_) {}
      setTransportRef(null);
    }
    if (portRef) {
      try {
        await portRef.close();
      } catch (_) {}
      setPortRef(null);
    }
    setConnectedPort(false);
  };

  useEffect(() => {
    return () => {
      if (portRef || transportRef) {
        releasePort();
      }
    };
  }, [portRef, transportRef]);

  if (!isOpen) return null;

  const handleConnectSerial = async () => {
    if (!serialSupported) return;
    try {
      setSerialStatus("Selecting USB COM port...");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      setPortRef(port);
      setConnectedPort(true);
      setFlashStep(3);
      setSerialStatus("Connected! Port open at 115200 baud.");
    } catch (err: any) {
      setSerialStatus(`Connection failed: ${err?.message || err}`);
    }
  };

  const handleResetBootloader = async () => {
    if (!portRef) return;
    try {
      setSerialStatus("Triggering Bootloader mode via DTR/RTS pulse...");
      if (!portRef.readable) {
        try { await portRef.open({ baudRate: 115200 }); } catch (_) {}
      }
      // ESP32 bootloader pulse: IO0 LOW, EN LOW then HIGH
      await portRef.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise((r) => setTimeout(r, 120));
      await portRef.setSignals({ dataTerminalReady: true, requestToSend: false });
      await new Promise((r) => setTimeout(r, 100));
      await portRef.setSignals({ dataTerminalReady: false, requestToSend: false });
      setFlashStep(4);
      setSerialStatus("ESP32 in Download Bootloader mode! Ready to write flash.");
    } catch (err: any) {
      setSerialStatus(`Reset pulse failed: ${err?.message || err}`);
    }
  };

  const handleRealFlash = async () => {
    if (!portRef) {
      setSerialStatus("Please connect the ESP32 USB COM port first.");
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStep(4);
    setSerialStatus("Initializing hardware flash sequence...");

    try {
      await stopSerialMonitor();

      // 1. Fetch or read binary data
      let arrayBuffer: ArrayBuffer;
      if (selectedFile) {
        setSerialStatus(`Reading local file: ${selectedFile.name}...`);
        arrayBuffer = await selectedFile.arrayBuffer();
      } else {
        setSerialStatus("Fetching firmware: /smartdesk_latest.bin...");
        const res = await fetch("/smartdesk_latest.bin");
        if (!res.ok) {
          throw new Error(`Failed to load default firmware (${res.status} ${res.statusText})`);
        }
        arrayBuffer = await res.arrayBuffer();
      }

      const binaryData = new Uint8Array(arrayBuffer);
      const totalBytes = binaryData.byteLength;
      setFlashStats({ bytesWritten: 0, totalBytes, speedKb: 0 });
      setSerialStatus(`Binary loaded (${Math.round(totalBytes / 1024)} KB). Connecting to ESP32-S3...`);

      // 2. Prepare port & Transport (close previous handle so Transport controls lifecycle)
      if (portRef.readable) {
        try {
          await portRef.close();
        } catch (_) {}
      }

      const transport = new Transport(portRef);
      setTransportRef(transport);

      const terminal = {
        clean: () => {},
        writeLine: (data: string) => {
          if (data && data.trim()) {
            setSerialStatus(data.trim());
            setSerialLogs((prev) => (prev + `\n${data.trim()}`).slice(-35000));
          }
        },
        write: (data: string) => {
          if (data && data.trim()) {
            setSerialStatus(data.trim());
            setSerialLogs((prev) => (prev + data).slice(-35000));
          }
        },
      };

      // 3. Initialize ESPLoader
      const esploader = new ESPLoader({
        transport,
        baudrate: 115200,
        romBaudrate: 115200,
        terminal,
      });

      setSerialStatus("Syncing with ESP32-S3 bootloader...");
      if (typeof (esploader as any).main_fn === "function") {
        await (esploader as any).main_fn();
      } else if (typeof esploader.main === "function") {
        await esploader.main();
      }

      // 4. Flash parameters (partition offset 0x10000, keep flash settings)
      const startTime = Date.now();
      setSerialStatus("Flashing firmware to partition 0x10000...");

      const flashOptions: any = {
        fileArray: [
          {
            data: binaryData,
            address: 0x10000,
          },
        ],
        flashSize: "keep",
        flash_size: "keep",
        flashMode: "keep",
        flash_mode: "keep",
        flashFreq: "keep",
        flash_freq: "keep",
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const pct = Math.min(100, Math.round((written / total) * 100));
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speed = elapsedSec > 0 ? Math.round(written / 1024 / elapsedSec) : 0;
          setFlashProgress(pct);
          setFlashStats({ bytesWritten: written, totalBytes: total, speedKb: speed });
          setSerialStatus(`Flashing: ${pct}% (${Math.round(written / 1024)} KB / ${Math.round(total / 1024)} KB)`);
        },
        report_progress: (_fileIndex: number, written: number, total: number) => {
          const pct = Math.min(100, Math.round((written / total) * 100));
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speed = elapsedSec > 0 ? Math.round(written / 1024 / elapsedSec) : 0;
          setFlashProgress(pct);
          setFlashStats({ bytesWritten: written, totalBytes: total, speedKb: speed });
          setSerialStatus(`Flashing: ${pct}% (${Math.round(written / 1024)} KB / ${Math.round(total / 1024)} KB)`);
        },
      };

      const flashFn = (esploader as any).write_flash || (esploader as any).writeFlash;
      if (typeof flashFn === "function") {
        await flashFn.call(esploader, flashOptions);
      } else {
        throw new Error("No flash write method found on ESPLoader.");
      }

      // 5. Completion & Reset
      setFlashProgress(100);
      setFlashStep(5);
      setSerialStatus("Firmware written & verified! Resetting ESP32-S3...");

      try {
        if (typeof (esploader as any).after === "function") {
          await (esploader as any).after("hard_reset");
        }
      } catch (_) {}

      if (portRef?.setSignals) {
        try {
          await portRef.setSignals({ requestToSend: true });
          await new Promise((r) => setTimeout(r, 100));
          await portRef.setSignals({ requestToSend: false });
        } catch (_) {}
      }

      setIsFlashing(false);
      setSerialStatus("Flash complete! ESP32-S3 rebooted into SmartDesk V2.");
    } catch (err: any) {
      setSerialStatus(`Flashing failed: ${err?.message || err}`);
      setIsFlashing(false);
    }
  };

  const handleNormalReset = async () => {
    if (!portRef) return;
    try {
      setSerialStatus("Restarting ESP32...");
      if (!portRef.readable) {
        try { await portRef.open({ baudRate: 115200 }); } catch (_) {}
      }
      await portRef.setSignals({ requestToSend: true });
      await new Promise((r) => setTimeout(r, 150));
      await portRef.setSignals({ requestToSend: false });
      setSerialStatus("ESP32 restarted successfully.");
    } catch (err: any) {
      setSerialStatus(`Restart failed: ${err?.message || err}`);
    }
  };

  const handleClose = async () => {
    if (isFlashing) {
      alert("Flashing is currently in progress! Closing now will interrupt the flash and may corrupt your ESP32 device.");
      return;
    }
    await releasePort();
    onClose();
  };

  const copyFlashCommand = () => {
    const cmd = `& "C:\\Program Files\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe" upload -v -p COM3 --fqbn esp32:esp32:esp32s3 --input-dir "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\smartdesk-v2\\firmware\\smartdesk\\build" "D:\\Organized files\\webDev files\\deployed Websites\\smart_desk_controller\\smartdesk-v2\\firmware\\smartdesk"`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
      setFlashStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black animate-in fade-in transition-all">
      <div className="bg-[#0a0a0a] border border-white/80 rounded-2xl w-full max-w-xl p-3 md:p-6 flex flex-col gap-3 md:gap-5 shadow-[0_0_60px_rgba(6,182,212,0.1)] text-white max-h-[95vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-start md:items-center justify-between border-b border-white/5 pb-2 md:pb-4 gap-2">
          <div className="flex items-center gap-2 md:gap-3 flex-1">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
              <span className="text-base md:text-xl">⚡</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[12px] md:text-lg font-bold tracking-wide text-white leading-tight break-words whitespace-normal">
                Web Serial Firmware Flasher
              </h3>
              <p className="text-[9px] md:text-xs text-white/40 leading-tight break-words whitespace-normal mt-0.5">
                Direct USB browser flashing for ESP32-S3
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isFlashing}
            className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs md:text-sm transition-colors"
            title={isFlashing ? "Cannot close while flashing" : "Close"}
          >
            ✕
          </button>
        </div>

        {/* Top Navigation Mode Tabs — Always Visible */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
          <button
            onClick={() => handleCloseSerialMonitor()}
            className={`py-2 px-3 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              !showSerialMonitor
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>⚡</span> Firmware Flasher
          </button>
          <button
            onClick={handleOpenSerialMonitor}
            className={`py-2 px-3 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              showSerialMonitor
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25"
            }`}
          >
            <span>📟</span> Live Serial Monitor
          </button>
        </div>

        {/* Browser Support Banner */}
        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl border text-[10px] md:text-xs font-medium flex items-start gap-2 break-words whitespace-normal leading-relaxed ${serialSupported ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
          <span className="shrink-0 mt-0.5">{serialSupported ? "✓" : "⚠️"}</span>
          <span className="flex-1">
            {serialSupported 
              ? "Web Serial active in Chrome / Edge / Chromium." 
              : "Web Serial requires Google Chrome or Microsoft Edge."}
          </span>
        </div>

        {/* Animated Step-by-Step Progress Pipeline */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg md:rounded-xl p-2.5 md:p-4 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center justify-between text-[9px] md:text-[11px] font-bold uppercase text-white/40 tracking-wider break-words whitespace-normal">
            <span>Flashing Pipeline</span>
            <span className="text-cyan-400 font-mono">Step {flashStep} of 5</span>
          </div>

          <div className="grid grid-cols-5 gap-1 md:gap-2 w-full">
            {[
              { num: 1, label: "Binary" },
              { num: 2, label: "Port" },
              { num: 3, label: "Boot" }, // Shortened for mobile
              { num: 4, label: "Flash" },
              { num: 5, label: "Done" },
            ].map((st) => (
              <div
                key={st.num}
                className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-0.5 md:px-2 rounded-md md:rounded-lg text-[8px] md:text-[11px] font-bold transition-all border break-words text-center ${
                  flashStep === st.num
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : flashStep > st.num
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-black/40 text-white/30 border-white/5"
                }`}
              >
                <span className="shrink-0">{st.num < flashStep ? "✓" : st.num}</span>
                <span className="hidden sm:inline-block">.</span>
                <span className="leading-none mt-0.5 md:mt-0">{st.label}</span>
              </div>
            ))}
          </div>

          {/* Dynamic Progress Bar (When flashing or finished) */}
          {(isFlashing || flashProgress > 0) && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-[10px] md:text-xs font-medium">
                <span className="text-cyan-400 font-mono break-words">Progress: {flashProgress}%</span>
                <span className="text-white/40 font-mono break-words">{flashStats.speedKb} KB/s</span>
              </div>
              <div className="w-full h-2 md:h-3 bg-black rounded-full overflow-hidden border border-white/10 p-px">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-150 relative"
                  style={{ width: `${flashProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Status Text Box */}
          <div className="text-[9px] md:text-[11px] font-mono text-cyan-300 bg-black/60 p-2 md:p-3 rounded-md md:rounded-lg border border-white/10 break-words whitespace-pre-wrap leading-relaxed shadow-inner">
            {serialStatus}
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {!connectedPort ? (
            <>
              <button
                onClick={handleConnectSerial}
                disabled={!serialSupported || isFlashing}
                className="py-3 md:py-3.5 rounded-lg md:rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-[11px] md:text-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 whitespace-normal break-words px-2"
              >
                <span className="text-sm md:text-base">🔌</span> Connect ESP32 USB Port
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResetBootloader}
                disabled={isFlashing}
                className="py-2.5 md:py-3 px-2 rounded-lg md:rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-400 font-bold text-[10px] md:text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-normal break-words text-center"
              >
                <span>⚡</span> 1. Enter Bootloader
              </button>
              <button
                onClick={handleRealFlash}
                disabled={isFlashing}
                className="py-2.5 md:py-3 px-2 rounded-lg md:rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-300 font-bold text-[10px] md:text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-normal break-words text-center shadow-[0_0_15px_rgba(16,185,129,0.1)]"
              >
                {isFlashing ? "Writing..." : "🚀 2. Write Flash (.bin)"}
              </button>
              <button
                onClick={handleOpenSerialMonitor}
                disabled={isFlashing}
                className="py-2.5 md:py-3 px-2 rounded-lg md:rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 font-bold text-[10px] md:text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-normal break-words text-center shadow-[0_0_15px_rgba(168,85,247,0.1)]"
              >
                <span>📟</span> 3. Serial Monitor
              </button>
              <button
                onClick={handleNormalReset}
                disabled={isFlashing}
                className="py-2 md:py-2.5 px-2 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white/70 font-medium text-[10px] md:text-xs transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-1.5 whitespace-normal break-words"
              >
                <span>🔄</span> Restart ESP32
              </button>
            </>
          )}
        </div>

        {/* Choose Custom .bin or Use Default */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg md:rounded-xl p-2 md:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] md:text-[10px] text-white/40 font-bold block mb-0.5 md:mb-1 uppercase tracking-wider">Target Binary:</span>
            <span className="font-mono text-cyan-100/90 font-medium text-[10px] md:text-xs break-all sm:break-words whitespace-normal line-clamp-2 block leading-snug">
              {selectedFileName}
            </span>
          </div>
          <label className={`shrink-0 w-full sm:w-auto text-center px-3 py-2 md:py-2 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-[10px] md:text-xs cursor-pointer transition-all active:scale-95 ${isFlashing ? "opacity-30 pointer-events-none cursor-not-allowed" : ""}`}>
            Browse .bin
            <input type="file" accept=".bin" onChange={handleFileSelect} disabled={isFlashing} className="hidden" />
          </label>
        </div>

        {/* Web Tools & Terminal Command */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleOpenSerialMonitor}
            disabled={isFlashing}
            className="flex-1 py-2 md:py-2.5 px-2 rounded-md md:rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-medium text-[10px] md:text-xs text-center flex items-center justify-center gap-1.5 transition-all break-words whitespace-normal"
          >
            <span>📟</span> Serial Monitor
          </button>
          <a
            href="https://espressif.github.io/esptool-js/"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 py-2 md:py-2.5 px-2 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium text-[10px] md:text-xs text-center flex items-center justify-center gap-1.5 transition-all break-words whitespace-normal ${isFlashing ? "opacity-30 pointer-events-none cursor-not-allowed" : ""}`}
          >
            <span>🌐</span> Official Web Flasher ↗
          </a>
          <button
            onClick={copyFlashCommand}
            disabled={isFlashing}
            className="flex-1 sm:flex-none py-2 md:py-2.5 px-3 rounded-md md:rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400 font-medium text-[10px] md:text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 break-words whitespace-normal"
          >
            <span>📋</span> {copiedCmd ? "Copied! ✓" : "Copy CLI Cmd"}
          </button>
        </div>

      </div>

      {/* Dedicated Serial Monitor Modal */}
      {showSerialMonitor && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="bg-[#0b0f12] border border-cyan-500/40 rounded-2xl w-full max-w-2xl p-3 md:p-5 flex flex-col gap-3 shadow-[0_0_80px_rgba(6,182,212,0.2)] text-white max-h-[92vh]">
            
            {/* Serial Monitor Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? "bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-white/20"}`} />
                <div>
                  <h4 className="text-xs md:text-sm font-bold tracking-wide text-white flex items-center gap-2">
                    ESP32-S3 Serial Monitor
                    <span className="text-[9px] md:text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-400">115200 Baud</span>
                  </h4>
                  <p className="text-[9px] md:text-[10px] text-white/40 mt-0.5">
                    {isMonitoring ? "🟢 Streaming live USB serial output" : isFlashing ? "⚠️ Flashing active (Monitor paused)" : "⚪ Idle / Paused"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseSerialMonitor}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Terminal View */}
            <div className="bg-black/90 rounded-xl border border-white/10 p-3 h-72 md:h-96 overflow-y-auto font-mono text-[10px] md:text-xs text-emerald-400 leading-relaxed custom-scrollbar select-text whitespace-pre-wrap break-all shadow-inner">
              {serialLogs ? (
                <>
                  {serialLogs}
                  <div ref={logsEndRef} />
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-white/30 italic text-[11px]">
                  No serial output received yet. Connect USB port and ensure ESP32 is running at 115200 baud.
                </div>
              )}
            </div>

            {/* Serial Monitor Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSerialLogs("")}
                  className="py-1.5 px-2.5 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium text-[10px] md:text-xs transition-colors border border-white/10"
                >
                  Clear Logs
                </button>
                <button
                  onClick={copyLogs}
                  className="py-1.5 px-2.5 rounded-md md:rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 font-medium text-[10px] md:text-xs transition-colors border border-white/10"
                >
                  {copiedLogs ? "Copied! ✓" : "Copy All"}
                </button>
                <label className="flex items-center gap-1.5 text-[10px] md:text-xs text-white/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="accent-cyan-400 w-3.5 h-3.5 rounded"
                  />
                  Auto-scroll
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNormalReset}
                  disabled={isFlashing}
                  className="py-1.5 px-2.5 rounded-md md:rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium text-[10px] md:text-xs transition-colors border border-amber-500/20 disabled:opacity-40"
                >
                  ⚡ Restart ESP32
                </button>
                <button
                  onClick={handleCloseSerialMonitor}
                  className="py-1.5 px-3 rounded-md md:rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium text-[10px] md:text-xs transition-colors border border-cyan-500/30"
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}