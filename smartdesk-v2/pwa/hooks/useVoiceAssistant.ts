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
  onStartMusic?: () => void;
  onStopMusic?: () => void;
}

export function useVoiceAssistant({
  relays,
  relayConfigs = [],
  onToggleRelay,
  onAllRelaysOff,
  onSendLed,
  onSetMatrixMode,
  onSetManualMood,
  onStartMusic,
  onStopMusic,
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

    // 4. Determine State Intent (ON vs OFF vs TOGGLE) with word boundaries (avoids matching "monitor", "coffee", etc.)
    const hasOff = /\b(off|stop|deactivate|disable|kill|shut)\b/i.test(q);
    const hasOn = /\b(on|start|activate|enable)\b/i.test(q);
    const isExplicit = hasOn || hasOff;
    const targetState = hasOff ? false : true;

    // 5. Check Numbered Relays (1 to 4)
    const relayNumMatch = q.match(/(?:relay|channel|ch|socket|outlet|switch|number|#)?\s*([1-4])\b/i);
    if (relayNumMatch && (q.includes("turn") || q.includes("switch") || q.includes("relay") || q.includes("ch") || isExplicit)) {
      const rIdx = parseInt(relayNumMatch[1], 10) - 1;
      if (rIdx >= 0 && rIdx < relays.length) {
        const currentLoad = relays[rIdx]?.load ?? false;
        const rName = relayConfigs[rIdx]?.name || `Relay ${rIdx + 1}`;

        if (isExplicit) {
          if (targetState === currentLoad) {
            showFeedback(`ℹ ${rName} is already turned ${currentLoad ? "ON" : "OFF"}`, "NEUTRAL");
            return;
          }
          onToggleRelay?.(rIdx, targetState);
          showFeedback(`✓ ${rName} Turned ${targetState ? "ON" : "OFF"}`, targetState ? "HAPPY" : "NEUTRAL");
        } else {
          // Implicit toggle
          const nextState = !currentLoad;
          onToggleRelay?.(rIdx, nextState);
          showFeedback(`✓ ${rName} Turned ${nextState ? "ON" : "OFF"}`, nextState ? "HAPPY" : "NEUTRAL");
        }
        return;
      }
    }

    // 6. Check Named Relays (Custom labels like "Monitor", "Lamp", "Fan", "Charger")
    for (let i = 0; i < relayConfigs.length; i++) {
      const cleanName = (relayConfigs[i]?.name || "").toLowerCase().trim();
      if (cleanName.length > 1 && q.includes(cleanName)) {
        const currentLoad = relays[i]?.load ?? false;
        const rName = relayConfigs[i].name || `Relay ${i + 1}`;

        if (isExplicit) {
          if (targetState === currentLoad) {
            showFeedback(`ℹ ${rName} is already turned ${currentLoad ? "ON" : "OFF"}`, "NEUTRAL");
            return;
          }
          onToggleRelay?.(i, targetState);
          showFeedback(`✓ ${rName} Turned ${targetState ? "ON" : "OFF"}`, targetState ? "HAPPY" : "NEUTRAL");
        } else {
          // Implicit toggle
          const nextState = !currentLoad;
          onToggleRelay?.(i, nextState);
          showFeedback(`✓ ${rName} Turned ${nextState ? "ON" : "OFF"}`, nextState ? "HAPPY" : "NEUTRAL");
        }
        return;
      }
    }

    // 7. Extract Target Scope (Matrix vs. RGB Strip vs. Ambiguous)
    const hasMatrix = /\b(matrix|screen|panel)\b/i.test(q);
    const hasStrip = /\b(strip|light|lights|rgb|ambient|led|leds|lamp)\b/i.test(q);
    const hasGenericDisplay = /\bdisplay\b/i.test(q);

    // 8. Music Reactive / Beat Sync Commands
    const isStopMusic = /\b(stop music|turn off music|end music|disable music)\b/i.test(q);
    if (isStopMusic) {
      onStopMusic?.();
      onSendLed?.(1, 0, 240, 255, 100, 5);
      onSetMatrixMode?.(17);
      showFeedback("✓ Music Reactive Sync Stopped", "NEUTRAL");
      return;
    }

    const isMusicSync = /\b(music sync|music reactive|audio sync|audio reactive|party mode|beat sync)\b/i.test(q);
    if (isMusicSync) {
      onStartMusic?.();
      if (hasMatrix && !hasStrip) {
        onSetMatrixMode?.(26);
        showFeedback("📊 Matrix Audio Equalizer Activated", "HAPPY");
      } else if (hasStrip && !hasMatrix) {
        onSendLed?.(16, 0, 240, 255, 100, 5);
        showFeedback("🎵 Strip Music Reactive Activated", "HAPPY");
      } else {
        onSendLed?.(16, 0, 240, 255, 100, 5);
        onSetMatrixMode?.(26);
        showFeedback("🎵 Music Reactive Sync (Strip + Matrix)", "HAPPY");
      }
      return;
    }

    // 9. Matrix Hardware Power On / Off
    if (hasMatrix && (hasOff || hasOn)) {
      if (hasOff) {
        onSetMatrixMode?.(0);
        showFeedback("✓ Matrix Display Turned OFF", "SLEEPY");
      } else {
        onSetMatrixMode?.(17);
        showFeedback("✓ Matrix Display Turned ON (Clock)", "HAPPY");
      }
      return;
    }

    // 10. Strip Hardware Power On / Off
    if (hasStrip && (hasOff || (hasOn && !/\b(mode|effect|color|scene)\b/i.test(q)))) {
      if (hasOff) {
        onSendLed?.(0, 0, 0, 0, 0, 5);
        showFeedback("✓ Ambient Strip Light Turned OFF", "SLEEPY");
      } else {
        onSendLed?.(1, 0, 240, 255, 100, 5);
        showFeedback("✓ Ambient Strip Light Turned ON", "HAPPY");
      }
      return;
    }

    // 11. Custom Marquee Text on Matrix (e.g., "say HELLO", "matrix marquee WELCOME", "text SMARTDESK")
    const sayMatch = q.match(/^(?:(?:matrix|screen)\s+)?(?:say|marquee|show text|text)\s+(.+)$/i);
    if (sayMatch && sayMatch[1]) {
      const customMsg = sayMatch[1].trim().toUpperCase();
      onSetMatrixMode?.(18, customMsg);
      showFeedback(`💬 Displaying "${customMsg}" on Matrix`, "HAPPY");
      return;
    }

    // 12. Inherently Unique Matrix Modes ("matrix display mode big clock or clock is fine")
    if (/\b(clock|digital clock|time)\b/i.test(q)) {
      onSetMatrixMode?.(17);
      showFeedback("🕒 Matrix Clock Activated", "HAPPY");
      return;
    }
    if (/\b(matrix rain|cyber rain|rain)\b/i.test(q)) {
      onSetMatrixMode?.(19);
      showFeedback("🌧️ Cyberpunk Matrix Rain Activated", "SURPRISED");
      return;
    }
    if (/\b(scroll right)\b/i.test(q)) {
      onSetMatrixMode?.(20);
      showFeedback("➡️ Matrix Scroll Right Activated", "HAPPY");
      return;
    }
    if (/\b(bounce|ping pong)\b/i.test(q)) {
      onSetMatrixMode?.(21);
      showFeedback("↔️ Matrix Bounce Text Activated", "HAPPY");
      return;
    }
    if (hasMatrix && /\b(scroll left|marquee|scroll)\b/i.test(q)) {
      onSetMatrixMode?.(18);
      showFeedback("⬅️ Matrix Scroll Left Activated", "HAPPY");
      return;
    }
    if (/\b(equalizer|audio spectrum|spectrum analyzer)\b/i.test(q)) {
      onStartMusic?.();
      onSetMatrixMode?.(26);
      showFeedback("📊 Matrix Audio Equalizer Activated", "HAPPY");
      return;
    }

    // 13. Dual-Target Modes (Disambiguation Required: Matrix vs. Strip)
    // Mode: Rainbow
    if (/\brainbow\b/i.test(q)) {
      if (hasMatrix) {
        onSetMatrixMode?.(22);
        showFeedback("🌈 Matrix Rainbow Text Activated", "HAPPY");
      } else if (hasStrip) {
        onSendLed?.(3, 0, 240, 255, 100, 5);
        showFeedback("🌈 Strip Rainbow Wave Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip rainbow' or 'matrix rainbow'", "NEUTRAL");
      }
      return;
    }

    // Mode: Breathing / Fade
    if (/\b(fade|breathing|breathe)\b/i.test(q)) {
      if (hasMatrix) {
        onSetMatrixMode?.(23);
        showFeedback("✨ Matrix Fade In-Out Activated", "HAPPY");
      } else if (hasStrip) {
        onSendLed?.(2, 0, 240, 255, 100, 5);
        showFeedback("🫁 Strip Breathing Light Activated", "SLEEPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip breathing' or 'matrix fade'", "NEUTRAL");
      }
      return;
    }

    // Mode: Fire / Fireplace
    if (/\b(fire|flame|fireplace)\b/i.test(q)) {
      if (hasMatrix) {
        onSetMatrixMode?.(24);
        showFeedback("🔥 Matrix Fireplace Activated", "HAPPY");
      } else if (hasStrip) {
        onSendLed?.(14, 255, 120, 0, 100, 5);
        showFeedback("🔥 Strip Fireplace Flame Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip fire' or 'matrix fireplace'", "NEUTRAL");
      }
      return;
    }

    // Mode: Starfield / Sparkle
    if (/\b(star|stars|starfield|sparkle|twinkle)\b/i.test(q)) {
      if (hasMatrix) {
        onSetMatrixMode?.(25);
        showFeedback("⭐ Matrix Starfield Activated", "HAPPY");
      } else if (hasStrip) {
        onSendLed?.(9, 255, 255, 255, 100, 5);
        showFeedback("✨ Strip Starlight Sparkle Activated", "LOVE");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip sparkle' or 'matrix starfield'", "NEUTRAL");
      }
      return;
    }

    // Mode: Color Cycle ("when one say display mode color cycle here what is didnt mentioned so discard")
    if (/\b(color cycle|cycle color)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(7, 0, 240, 255, 100, 5);
        showFeedback("🔄 Strip Color Cycle Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip color cycle' or 'matrix'", "NEUTRAL");
      }
      return;
    }

    // 14. Strip-Specific Animations (Require "strip" / "rgb" / "light" target scope)
    if (/\b(cyberpunk|synthwave)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(17, 0, 240, 255, 100, 5);
        showFeedback("🌆 Strip Cyberpunk Synthwave Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip cyberpunk'", "NEUTRAL");
      }
      return;
    }
    if (/\b(police|cop strobe)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(22, 255, 0, 0, 100, 7);
        showFeedback("🚨 Strip Police Strobe Activated", "ANGRY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip police'", "NEUTRAL");
      }
      return;
    }
    if (/\bplasma\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(18, 0, 240, 255, 100, 5);
        showFeedback("🔮 Strip Plasma Wave Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip plasma'", "NEUTRAL");
      }
      return;
    }
    if (/\b(lava|magma)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(21, 255, 80, 0, 100, 5);
        showFeedback("🌋 Strip Lava Lamp Activated", "LOVE");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip lava'", "NEUTRAL");
      }
      return;
    }
    if (/\b(hyperdrive|warp speed|warp jump)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(20, 180, 220, 255, 100, 6);
        showFeedback("🚀 Strip Hyperdrive Warp Jump", "SURPRISED");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip hyperdrive'", "NEUTRAL");
      }
      return;
    }
    if (/\b(meteor|shooting star)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(26, 255, 255, 255, 100, 6);
        showFeedback("☄️ Strip Meteor Shower Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip meteor'", "NEUTRAL");
      }
      return;
    }
    if (/\b(ocean|tide|sea wave)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(23, 0, 180, 255, 100, 5);
        showFeedback("🌊 Strip Ocean Deep Tide Activated", "SLEEPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip ocean'", "NEUTRAL");
      }
      return;
    }
    if (/\b(toxic|hazmat)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(24, 50, 255, 40, 100, 5);
        showFeedback("☢️ Strip Toxic Hazmat Glow Activated", "ANGRY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip toxic'", "NEUTRAL");
      }
      return;
    }
    if (/\b(heartbeat|ekg|pulse)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(25, 255, 0, 0, 100, 5);
        showFeedback("💓 Strip Heartbeat EKG Activated", "LOVE");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip heartbeat'", "NEUTRAL");
      }
      return;
    }
    if (/\b(scanner|cylon|knight rider)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(8, 255, 0, 0, 100, 6);
        showFeedback("👁️ Strip Scanner Eye Activated", "HAPPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip scanner'", "NEUTRAL");
      }
      return;
    }
    if (/\b(aurora|northern lights)\b/i.test(q)) {
      if (hasStrip) {
        onSendLed?.(15, 0, 220, 180, 100, 5);
        showFeedback("🌌 Strip Aurora Borealis Activated", "SLEEPY");
      } else {
        showFeedback("⚠️ Missing target: specify 'strip aurora'", "NEUTRAL");
      }
      return;
    }

    // 15. Ambiguous "display mode" fallback prompt
    if (hasGenericDisplay && !hasMatrix && !hasStrip) {
      showFeedback("⚠️ Please specify target: 'strip' or 'matrix' (e.g. 'strip color cycle' or 'matrix clock')", "NEUTRAL");
      return;
    }

    // 16. Mood Voice Commands
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
  }, [relays, relayConfigs, onAllRelaysOff, onToggleRelay, onSendLed, onSetMatrixMode, onSetManualMood, onStartMusic, onStopMusic, showFeedback]);

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

