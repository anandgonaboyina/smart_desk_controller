# SmartDesk — Audio System & Sound Assets Specification

The SmartDesk audio system operates with a **dual-tier fallback architecture**:
1. **Tier 1 (Zero-Asset Web Audio Synthesizer):** Pure mathematical synthesis implemented in [`pwa/lib/audio.js`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/pwa/lib/audio.js). Requires **zero sound files** on disk. Produces crisp mechanical relay clicks, chime chords, alert buzzers, and door knocks using oscillators and gain envelopes.
2. **Tier 2 (Custom Audio Assets):** Optional MP3/OGG sound files placed in [`pwa/public/sounds/`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/pwa/public/sounds/). If present, these take precedence and are cached offline by [`public/sw.js`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/pwa/public/sw.js).
3. **Tier 3 (Browser TTS Fallback):** For vocal alerts (`speechSynthesis`), vocalizing messages without requiring recorded voice files.

---

## 1. Web Audio Synthesizer Envelopes (`audio.js`)

When no custom audio files are loaded, [`audio.js`](file:///d:/Organized%20files/webDev%20files/deployed%20Websites/smart_desk_controller/pwa/lib/audio.js) generates these distinct tones mathematically:

| Sound Identifier | Synthesizer Architecture | Frequency / Pitch | Duration | Acoustic Character |
|:---|:---|:---|:---:|:---|
| `relay_click` | Dual-oscillator (triangle + white-noise burst) | 1200 Hz down to 180 Hz exponential | 25 ms | Crisp mechanical armature slap |
| `timer_done` | Major triad harmonic chord (sine oscillators) | C6 (1046 Hz), E6 (1318 Hz), G6 (1568 Hz) | 650 ms | Cheerful bell chime |
| `away_enter` | Frequency modulated descending chirp | 880 Hz down to 220 Hz | 300 ms | Door lock latch sound |
| `call_start` | Dual-tone sine pulse | 440 Hz (A4) & 880 Hz (A5) | 180 ms | Subtle conference alert |
| `unlock_success` | Fast ascending arpeggio | 523 Hz -> 659 Hz -> 784 Hz -> 1046 Hz | 240 ms | Security success confirmation |
| `error_buzz` | Low sawtooth wave with fast cutoff | 110 Hz (A2) | 200 ms | Rejection / error warning |

---

## 2. Optional Audio Asset Manifest (`pwa/public/sounds/`)

If custom audio recordings or sound effect files are preferred, drop MP3 or OGG files into `pwa/public/sounds/` with these exact names:

| # | Filename | Spoken Text / Description | Duration | Triggering Event |
|---|:---|:---|:---:|:---|
| 1 | `hello.mp3` | "Hey Anand, good to see you!" | ~2.0s | App opened & first BLE connect |
| 2 | `morning.mp3` | "Good morning, Anand!" or bright chime | ~2.0s | First connect between 05:00-10:00 |
| 3 | `relay-on.mp3` | Mechanical snap / click | ~0.3s | Any relay switched to Load ON |
| 4 | `relay-off.mp3` | Soft release click | ~0.3s | Any relay switched to Load OFF |
| 5 | `ble-connected.mp3` | Soft high ping chime | ~0.5s | BLE peripheral connection established |
| 6 | `ble-lost.mp3` | Descending warning tone | ~1.0s | BLE connection lost unexpectedly |
| 7 | `schedule-fired.mp3` | Soft two-tone chime | ~0.5s | Scheduled automation fired |
| 8 | `timer-ended.mp3` | "Timer is up!" bell | ~1.0s | Countdown timer reached 00:00 |
| 9 | `timer-resumed.mp3` | "Timer resumed" notification | ~1.0s | Active timer restored across reboot |
| 10 | `away-on.mp3` | Heavy deadbolt lock sound | ~1.0s | Away mode activated (after countdown) |
| 11 | `away-off.mp3` | "Welcome back!" greeting chime | ~1.5s | Away mode deactivated / cancelled |
| 12 | `call-on.mp3` | Gentle attention ping | ~0.5s | Call mode switched ON |
| 13 | `call-off.mp3` | Soft confirmation tone | ~0.5s | Call mode switched OFF |
| 14 | `music-start.mp3` | Upbeat chord | ~0.3s | Music reactive mode started |
| 15 | `music-stop.mp3` | Fade-out chord | ~0.3s | Music reactive mode stopped |
| 16 | `unlock-typed.mp3` | Mechanical key clack | ~0.5s | PC unlock keystrokes transmitted |
| 17 | `unlock-blocked.mp3` | Warning buzzer | ~0.5s | PC unlock blocked by guard/cooldown |
| 18 | `unlock-cancelled.mp3` | Low cancel blip | ~0.5s | PC unlock countdown aborted |
| 19 | `feature-on.mp3` | Rising two-tone chirp | ~0.3s | Runtime feature switch enabled |
| 20 | `feature-off.mp3` | Falling two-tone chirp | ~0.3s | Runtime feature switch disabled |
| 21 | `error.mp3` | Error buzz tone | ~0.3s | Generic validation / command error |
| 22 | `led-change.mp3` | Soft ambient swish | ~0.3s | LED color preset or scene changed |
| 23 | `idle-yawn.mp3` | Friendly avatar yawn | ~1.0s | Idle for > 5 minutes |

---

## 3. Audio Execution Rules & Constraints

1. **Quiet Hours Enforcement:**
   - Default: `23:00` to `06:00` (configurable in SettingsScreen).
   - During quiet hours, all non-critical chimes and clicks are suppressed. Only critical safety alerts and explicit timer alarms sound.
2. **Call Mode Suppression:**
   - While Call Mode is active (`active === true`), **all PWA audio is silenced** to prevent speaker bleeds into active microphone calls.
3. **Music Reactive Suppression:**
   - While Music Sync is streaming, audio effects are silenced to prevent acoustic interference with music beat detection.
4. **Debounce & Cooldown Protection:**
   - Rapid clicking of relay switches is debounced with a minimum 120ms interval per sound ID to prevent audio distortion or buzzing.
5. **Autoplay Policy Handling:**
   - Modern browsers block AudioContext creation before user interaction. The PWA audio engine initializes on first user touch/click, resuming seamlessly without errors.
