# AGENTS.md — Coding Rules and Conventions for SmartDesk

This document is the authoritative reference for ALL contributors (human or AI)
working on this codebase. Follow these rules exactly.

---

## 1. General Code Quality

- **Function size**: ≤ ~40 lines, one job each, clear names.
- **No mixing**: A function must NOT mix hardware access with calculation.
- **Component size**: PWA components ≤ ~120 lines.
- **No heavy `String` use** in firmware (24/7 device). Use `char[]`, `snprintf`.
- **No blocking delays** in BLE callbacks or the main loop. Use FreeRTOS tasks/queues.
- **NVS writes only on state change**, never periodic.
- **Defensive**: Check every pointer, every array index, every BLE payload length.

---

## 2. Firmware File Organization

```
firmware/
├── include/          Global headers (pins.h, config.h, features.h, protocol.h)
├── lib/              Pure helper libraries (no hardware, no globals, no BLE)
│   ├── relay_logic/    relay_logic.h/.cpp
│   ├── led_math/       led_math.h/.cpp
│   ├── schedule_logic/ schedule_logic.h/.cpp
│   ├── packing/        packing.h/.cpp
│   └── password_obfuscation/ password_obfuscation.h/.cpp
└── src/              Implementation files (hardware + BLE layers)
```

### Header Comment (every file)
```cpp
/**
 * filename.h — Short purpose description.
 *
 * Purpose : What this file does.
 * Depends : What it includes / needs.
 * Used by : Which files call its functions.
 * Feature : Which FEATURE_* flag controls it (or "Always compiled").
 */
```

### Pure Helpers (firmware/lib/)
- **No hardware access**: No `digitalWrite`, no `analogRead`, no `Serial`.
- **No globals**: Input parameters in, result out.
- **No BLE**: No NimBLE, no characteristic access.
- **No Arduino.h** (except for `stdint.h`, `string.h`, `math.h` standard types).
- Each file includes **example input/output pairs** in comments.
- A bug in a calculation is fixable by editing ONE pure file.

### Hardware & BLE Layers (firmware/src/)
- Call pure helpers for all calculations.
- Keep their own code thin: setup, loop, callbacks, GPIO writes.
- Wrap every feature in `#if FEATURE_xxx` ... `#endif`.
- Check runtime feature switch with `isFeatureEnabled(FSWITCH_xxx)` before every action.

---

## 3. PWA File Organization

```
pwa/
├── lib/pure/         Calculations only (no browser APIs, no React)
├── lib/              Services (BLE, audio, storage — browser APIs, no React)
├── hooks/            React state + event bus wiring (no layout, no BLE calls)
├── components/       Small presentational pieces (props in, JSX out, no BLE)
├── screens/          Compose hooks + components
├── styles/           CSS split: base.css, layout.css, components.css, themes.css
└── app/              Routing/mode switch only
```

### Header Comment (every JS file)
```js
/**
 * filename.js — Short purpose description.
 *
 * Purpose : What this file does.
 * Depends : What it imports.
 * Used by : Which files import it.
 */
```

### Pure Files (pwa/lib/pure/)
- **No `window`, `document`, `navigator`** — zero browser APIs.
- **No React imports** — no hooks, no JSX.
- **No imports from other layers** (no `../ble.js`, no `../bus.js`).
- Example input/output pairs in comments.
- Mirror firmware pure helpers where applicable (relay-logic.js ↔ relay_logic.h).

### Services (pwa/lib/)
- Browser APIs allowed (`navigator.bluetooth`, `AudioContext`, `localStorage`).
- No React imports.
- Communicate via the event bus (`bus.js`), never directly to components.

### Hooks (pwa/hooks/)
- Bridge between services and React components.
- Subscribe to bus events, manage state with `useState`/`useEffect`.
- No layout or JSX — return data and callbacks only.

### Components (pwa/components/)
- **Never import `ble.js`** — only receive data through hooks/props.
- Props in, JSX out.
- Small, focused, reusable.

### Screens (pwa/screens/)
- Compose hooks and components.
- May import hooks and components, but not services directly.

---

## 4. Protocol Consistency

These three files MUST match exactly:
1. `firmware/include/protocol.h` — byte offsets, sizes, UUIDs
2. `docs/protocol.md` — human-readable spec
3. `pwa/lib/pure/protocol-pack.js` — JavaScript pack/parse

If any of the three disagrees, it is a bug. When adding a new characteristic
or command ID, update all three in the same commit.

---

## 5. Feature Flag Rules

### Compile-Time (features.h)
- Setting any flag to `0` must still compile cleanly.
- Firmware must run safely with **no hardware connected** and all flags off.
- Wrap every code block for a feature in `#if FEATURE_xxx`.

### Runtime (feature_switches.h/.cpp)
- A runtime switch can only disable something that was compiled in.
- When OFF: BLE writes return `ERR_FEATURE_DISABLED`, tasks idle, LEDs go dark,
  UI shows "Disabled in Features", stored data is NOT deleted.
- When turned back ON: restore saved settings without data loss.

### Safety Exceptions (cannot be switched off)
- Relay control itself (on/off)
- Physical button "all relays off"
- "All load OFF" / "Safe state" BLE commands
- BLE pairing/PIN
- Min switch interval (MIN_RELAY_SWITCH_MS)

---

## 6. Relay Abstraction

- All UI, BLE, schedules, timers, and Away mode use **LOAD state** (is the appliance powered?).
- Never reference GPIO levels, coil states, or pin numbers outside the relay driver.
- Conversion: `coil = (NC) ? !load : load; level = (active-LOW) ? !coil : coil`
- All conversion lives in `lib/relay_logic/` (firmware) and `lib/pure/relay-logic.js` (PWA).

---

## 7. LED Priority

From highest to lowest:
1. **Call mode** busy color (LED_PRIO_CALL_MODE = 4)
2. **Notification blink** (LED_PRIO_NOTIFY_BLINK = 3)
3. **Music** reactive (LED_PRIO_MUSIC = 2)
4. **Manual** override (LED_PRIO_MANUAL = 1)
5. **Auto** time-of-day (LED_PRIO_AUTO = 0)

When a higher-priority mode ends, restore the previous mode exactly.

---

## 8. Photosensitivity

- Any blink/strobe faster than **3 flashes/second** (cycle < 334ms) is:
  - Rejected by firmware with `ERR_PHOTOSENSITIVITY`
  - Requires a confirm dialog in the PWA before sending
- Strobe effect is **OFF by default**.
- `blink_on_ms + blink_off_ms >= BLINK_MIN_CYCLE_MS (334)` is enforced in firmware.

---

## 9. BLE Callback Rules

- **Never block** in a BLE callback. Post to a FreeRTOS queue and return.
- A BLE write handler should: validate length, copy data, post to queue, return.
- The processing task reads from the queue and does the actual work.
- Always notify ALL connected clients on any state change.

---

## 10. Testing Protocol

When reporting a bug:
1. State the **symptom** (what happened vs what you expected).
2. Paste the **exact files** listed in `docs/debug-guide.md` for that symptom.
3. Include the **serial output** or **Chrome console** output specified.
4. State what you changed since the last working state.

When fixing a bug:
1. Reply with **only the changed files** (complete).
2. List which other files are **unaffected**.

---

## 11. Git Conventions

- One feature per commit.
- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Tag each working phase: `v0.1-headers`, `v0.2-pure-helpers`, etc.
- Never commit `out/`, `.pio/`, `node_modules/`, `.env*`.
- Passwords and secrets never appear in commits.

---

## 12. PWA-Specific Rules

- `"use client"` on every page and component (static export).
- Browser APIs (`navigator`, `window`, `document`) only inside `useEffect`.
- `basePath` in `next.config.js` is configurable for GitHub Pages.
- Service worker (`public/sw.js`) is hand-written, not generated.
- Only dependencies: `next`, `react`, `react-dom`. Zero others.
- CSS variables for theming. System font stacks only (no external fonts).
- Dark theme by default.
- 44px minimum touch targets on mobile.
- `prefers-reduced-motion` media query respected.

