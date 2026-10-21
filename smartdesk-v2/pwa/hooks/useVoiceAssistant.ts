/**
 * useVoiceAssistant.ts — Shared Web Speech Voice Command Processor
 *
 * Purpose : Voice recognition with spoken number normalization ("one" -> 1, "two" -> 2),
 *           appliance matching, lighting controls, matrix display commands, and mood feedback.
 * Depends : React, types/smartdesk.ts.
 * Used by : AodFaceScreen.tsx, QuickRemotePanel.tsx.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { RelayState, RelayConfigItem, BuddyMood } from "../types/smartdesk";

export interface UseVoiceAssistantProps {
  relays: RelayState[];
  relayConfigs?: RelayConfigItem[];
  onToggleRelay?: (idx: number, val?: boolean) => void;
  onAllRelaysOff?: () => void;
  onSendLed?: (mode: number, r: number, g: number, b: number, bri: number, spd: number) => void;
  onSetMatrixMode?: (mode: number, text?: string) => void;
  onSetManualMood?: (mood: BuddyMood) => void;
}

export function useVoiceAssistant({
  relays,
  relayConfigs = [],
  onToggleRelay,
  onAllRelaysOff,
  onSendLed,
  onSetMatrixMode,
  onSetManualMood,
}: UseVoiceAssistantProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [voiceReply, setVoiceReply] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const replyFadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((reply: string, mood?: BuddyMood) => {
    setVoiceReply(reply);
    if (mood && onSetManualMood) onSetManualMood(mood);
    if (replyFadeTimerRef.current) clearTimeout(replyFadeTimerRef.current);
    replyFadeTimerRef.current = setTimeout(() => {
      setVoiceReply(null);
      setVoiceTranscript("");
    }, 3500);
  }, [onSetManualMood]);

  const processVoiceCommand = useCallback((rawText: string) => {
    if (!rawText.trim()) return;

    // 1. Spoken Word to Number Normalization
    let q = rawText.toLowerCase().trim();
    q = q
      .replace(/\bfirst\b/g, "1")
      .replace(/\bsecond\b/g, "2")
      .replace(/\bthird\b/g, "3")
      .replace(/\bfourth\b/g, "4")
      .replace(/\bone\b/g, "1")
      .replace(/\btwo\b/g, "2")
      .replace(/\bthree\b/g, "3")
      .replace(/\bfour\b/g, "4")
      .replace(/\bto\b/g, "2")
      .replace(/\bfor\b/g, "4");

    setVoiceTranscript(q);

    // 2. All Off Commands
    if (
      q.includes("all off") ||
      q.includes("turn off all") ||
      q.includes("shut down") ||
      q.includes("power off all") ||
      q.includes("good night") ||
      q.includes("switch off all")
    ) {
      onAllRelaysOff?.();
      showFeedback("✓ All Appliances Turned OFF", "SLEEPY");
      return;
    }

    // 3. All On Commands
    if (
      q.includes("all on") ||
      q.includes("turn on all") ||
      q.includes("power all") ||
      q.includes("switch on all")
    ) {
      for (let i = 0; i < relays.length; i++) onToggleRelay?.(i, true);
      showFeedback("✓ All Appliances Turned ON", "HAPPY");
      return;
    }

    // 4. Determine State Intent (ON vs OFF vs TOGGLE)
    const hasOff = q.includes("off") || q.includes("stop") || q.includes("deactivate") || q.includes("kill") || q.includes("close");
    const hasOn = q.includes("on") || q.includes("start") || q.includes("activate") || q.includes("open");
    const isExplicit = hasOn || hasOff;
    const targetState = hasOff ? false : true;

    // 5. Check Numbered Relays (1 to 4)
    const relayNumMatch = q.match(/(?:relay|channel|ch|socket|outlet|switch|number|#)?\s*([1-4])\b/i);
    if (relayNumMatch && (q.includes("turn") || q.includes("switch") || q.includes("relay") || q.includes("ch") || isExplicit)) {
      const rIdx = parseInt(relayNumMatch[1], 10) - 1;
      if (rIdx >= 0 && rIdx < relays.length) {
        const finalState = isExplicit ? targetState : !relays[rIdx]?.load;
        const rName = relayConfigs[rIdx]?.name || `Relay ${rIdx + 1}`;
        onToggleRelay?.(rIdx, finalState);
        showFeedback(`✓ ${rName} ${finalState ? "Turned ON" : "Turned OFF"}`, finalState ? "HAPPY" : "NEUTRAL");
        return;
      }
    }

    // 6. Check Named Relays (Custom labels like "Monitor", "Lamp", "Fan", "Charger")
    for (let i = 0; i < relayConfigs.length; i++) {
      const cleanName = (relayConfigs[i]?.name || "").toLowerCase().trim();
      if (cleanName.length > 1 && q.includes(cleanName)) {
        const finalState = isExplicit ? targetState : !relays[i]?.load;
        onToggleRelay?.(i, finalState);
        showFeedback(`✓ ${relayConfigs[i].name} ${finalState ? "Turned ON" : "Turned OFF"}`, finalState ? "HAPPY" : "NEUTRAL");
        return;
      }
    }

    // 7. General Ambient Lighting (RGB)
    if (q.includes("light") || q.includes("lamp") || q.includes("rgb") || q.includes("led")) {
      if (hasOff) {
        onSendLed?.(0, 0, 0, 0, 0, 5);
        showFeedback("✓ Ambient Light Turned OFF", "SLEEPY");
      } else {
        onSendLed?.(1, 0, 240, 255, 100, 5);
        showFeedback("✓ Ambient Light Turned ON", "LOVE");
      }
      return;
    }

    // 8. Custom Marquee Text / Say / Display Commands
    const sayMatch = q.match(/^(?:say|display|marquee|show text|text)\s+(.+)$/i);
    if (sayMatch && sayMatch[1]) {
      const customMsg = sayMatch[1].trim().toUpperCase();
      onSetMatrixMode?.(18, customMsg);
      showFeedback(`💬 Displaying "${customMsg}" on Matrix`, "HAPPY");
      return;
    }

    // 9. Matrix Display Modes
    if (q.includes("clock") || q.includes("time") || q.includes("digital clock")) {
      onSetMatrixMode?.(17);
      showFeedback("🕒 Matrix Clock Activated", "HAPPY");
      return;
    }
    if (q.includes("rain") || q.includes("matrix rain") || q.includes("falling rain")) {
      onSetMatrixMode?.(19);
      showFeedback("🌧️ Cyberpunk Matrix Rain Activated", "SURPRISED");
      return;
    }
    if (q.includes("bounce")) {
      onSetMatrixMode?.(21);
      showFeedback("↔️ Matrix Bounce Text Activated", "HAPPY");
      return;
    }
    if (q.includes("fire") || q.includes("flame")) {
      onSetMatrixMode?.(24);
      showFeedback("🔥 Matrix Fireplace Activated", "HAPPY");
      return;
    }
    if (q.includes("star") || q.includes("twinkle")) {
      onSetMatrixMode?.(25);
      showFeedback("⭐ Matrix Starfield Activated", "HAPPY");
      return;
    }
    if (q.includes("spectrum") || q.includes("equalizer") || q.includes("audio bar")) {
      onSetMatrixMode?.(26);
      showFeedback("📊 Matrix Audio Equalizer Activated", "HAPPY");
      return;
    }
    if (q.includes("scroll") || q.includes("marquee") || q.includes("text")) {
      onSetMatrixMode?.(18);
      showFeedback("💬 Scrolling Text Activated", "HAPPY");
      return;
    }

    // 10. Strip FX Modes
    if (q.includes("rainbow")) {
      onSendLed?.(3, 0, 255, 0, 100, 5);
      showFeedback("🌈 Rainbow Mode Activated", "HAPPY");
      return;
    }
    if (q.includes("music") || q.includes("party") || q.includes("beat")) {
      onSendLed?.(16, 0, 240, 255, 100, 5);
      showFeedback("🎵 Music Reactive Mode Activated", "HAPPY");
      return;
    }

    // 11. Mood Voice Commands
    const MOODS: { id: BuddyMood; name: string; icon: string }[] = [
      { id: "HAPPY", name: "happy", icon: "😄" },
      { id: "SLEEPY", name: "sleepy", icon: "😴" },
      { id: "LOVE", name: "love", icon: "😍" },
      { id: "SURPRISED", name: "surprised", icon: "😮" },
      { id: "NEUTRAL", name: "neutral", icon: "😐" },
      { id: "SAD", name: "sad", icon: "🥺" },
      { id: "ANGRY", name: "angry", icon: "😠" },
    ];
    for (const m of MOODS) {
      if (q.includes(m.name)) {
        if (onSetManualMood) onSetManualMood(m.id);
        showFeedback(`${m.icon} Mood set to ${m.name.toUpperCase()}!`, m.id);
        return;
      }
    }

    showFeedback(`❓ Heard: "${rawText}" (Unrecognized command)`);
  }, [relays, relayConfigs, onAllRelaysOff, onToggleRelay, onSendLed, onSetMatrixMode, onSetManualMood, showFeedback]);

  const startSpeechRecognition = useCallback((continuousMode: boolean = false) => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceReply("Speech recognition not supported in this browser");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = continuousMode;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setIsContinuous(continuousMode);
        setVoiceReply(continuousMode ? "🔴 Continuous listening active..." : "🎙️ Listening...");
      };

      rec.onresult = (evt: any) => {
        const lastIdx = evt.results.length - 1;
        const transcript = evt.results[lastIdx][0].transcript;
        processVoiceCommand(transcript);
      };

      rec.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          setVoiceReply(`Mic Error: ${e.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        if (!continuousMode) {
          setIsListening(false);
          setIsContinuous(false);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setVoiceReply(`Mic: ${err?.message || "Could not open"}`);
      setIsListening(false);
    }
  }, [processVoiceCommand]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsContinuous(false);
    setVoiceReply("Mic Closed");
    setTimeout(() => setVoiceReply(null), 1500);
  }, []);

  const handleMicMouseDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      if (isListening && isContinuous) stopSpeechRecognition();
      else startSpeechRecognition(true);
    }, 550);
  }, [isListening, isContinuous, stopSpeechRecognition, startSpeechRecognition]);

  const handleMicMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      if (isListening) stopSpeechRecognition();
      else startSpeechRecognition(false);
    }
  }, [isListening, stopSpeechRecognition, startSpeechRecognition]);

  return {
    isListening,
    isContinuous,
    voiceTranscript,
    voiceReply,
    startSpeechRecognition,
    stopSpeechRecognition,
    handleMicMouseDown,
    handleMicMouseUp,
  };
}

