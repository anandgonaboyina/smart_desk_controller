# SmartDesk — Required Audio Files

All audio files go in `pwa/public/sounds/`. The service worker caches them
for offline use. If a file is missing, the PWA falls back to
`speechSynthesis` (browser TTS) or silence — never an error.

Format: short MP3 or OGG files, ≤100KB each. You can generate these
with any text-to-speech tool or download free sound effects.

## File List

| # | Filename | Text / Description | Duration | Event |
|---|----------|--------------------|----------|-------|
| 1 | `hello.mp3` | "Hey Anand, good to see you!" | ~2s | App opened (first connect) |
| 2 | `morning.mp3` | "Good morning, Anand!" or cheerful chime | ~2s | Time-of-day: 05:00-10:00 (once/day) |
| 3 | `relay-on.mp3` | Short click/switch sound | ~0.3s | Any relay turned ON |
| 4 | `relay-off.mp3` | Soft click sound | ~0.3s | Any relay turned OFF |
| 5 | `ble-connected.mp3` | "Connected" or soft ding | ~0.5s | BLE connection established |
| 6 | `ble-lost.mp3` | "Connection lost" or warning tone | ~1s | BLE disconnected unexpectedly |
| 7 | `schedule-fired.mp3` | Soft chime | ~0.5s | Schedule triggered a relay |
| 8 | `timer-ended.mp3` | "Timer's up!" or bell | ~1s | Countdown timer completed |
| 9 | `timer-resumed.mp3` | "Timer resumed" | ~1s | Timer restored after reboot |
| 10 | `away-on.mp3` | "Away mode activated" or door-close sound | ~1s | Away mode started |
| 11 | `away-off.mp3` | "Welcome back!" | ~1.5s | Away mode ended |
| 12 | `call-on.mp3` | "On a call" or soft notification | ~0.5s | Call mode activated |
| 13 | `call-off.mp3` | "Call ended" | ~0.5s | Call mode deactivated |
| 14 | `music-start.mp3` | Short upbeat tone | ~0.3s | Music sync started |
| 15 | `music-stop.mp3` | Fade-out tone | ~0.3s | Music sync stopped |
| 16 | `unlock-typed.mp3` | "Password typed" or key sound | ~0.5s | PC unlock completed |
| 17 | `unlock-blocked.mp3` | "Unlock blocked" or error buzz | ~0.5s | PC unlock attempt blocked |
| 18 | `unlock-cancelled.mp3` | "Cancelled" | ~0.5s | PC unlock countdown cancelled |
| 19 | `feature-on.mp3` | Soft enable sound | ~0.3s | Feature switch turned ON |
| 20 | `feature-off.mp3` | Soft disable sound | ~0.3s | Feature switch turned OFF |
| 21 | `error.mp3` | Short error/buzz tone | ~0.3s | Generic error |
| 22 | `led-change.mp3` | Soft ambient tone | ~0.3s | LED scene changed |
| 23 | `idle-yawn.mp3` | Cute yawn sound | ~1s | Idle for >5 minutes (low priority) |

## Notes

- **Quiet hours** (23:00–06:00): all sounds are suppressed except timer-ended
- **Per-sound cooldowns**: each sound has a minimum interval before replaying
  (prevents rapid relay toggling from spamming clicks)
- **Call mode**: ALL audio muted while on a call
- **Music sync**: ALL audio muted while music is streaming
- **Morning song**: `morning.mp3` plays at most once per day, between 05:00-10:00
- **Autoplay policy**: Chrome blocks autoplay until user interaction. The PWA
  shows a "Tap to start" overlay on first visit. After that, audio works.
- **speechSynthesis fallback**: if a file fails to load, the PWA uses the
  browser's built-in TTS with the "text" column above. This works offline
  on most systems.

