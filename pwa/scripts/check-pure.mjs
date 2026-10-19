/**
 * check-pure.mjs — Linter script verifying pure layer isolation.
 *
 * Rules:
 *   - Zero browser APIs (window, document, navigator, localStorage, AudioContext)
 *   - Zero React imports or hooks
 *   - Zero imports from outer services (ble.js, bus.js)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pureDir = path.resolve(__dirname, '../lib/pure');

const FORBIDDEN_RULES = [
  { regex: /\bwindow\b/, desc: 'Browser window global' },
  { regex: /\bdocument\b/, desc: 'Browser document global' },
  { regex: /\bnavigator\b/, desc: 'Browser navigator global' },
  { regex: /\blocalStorage\b/, desc: 'Browser localStorage global' },
  { regex: /\bAudioContext\b/, desc: 'Web Audio API global' },
  { regex: /from\s+['"]react['"]/, desc: 'React import' },
  { regex: /\buseState\b/, desc: 'React hook' },
  { regex: /\buseEffect\b/, desc: 'React hook' },
  { regex: /['"]\.\.\/ble\.js['"]/, desc: 'Outer service import' },
  { regex: /['"]\.\.\/bus\.js['"]/, desc: 'Outer service import' },
];

console.log('[check:pure] Scanning pwa/lib/pure/ directory...');

if (!fs.existsSync(pureDir)) {
  console.error(`[check:pure] ERROR: Directory ${pureDir} does not exist!`);
  process.exit(1);
}

const files = fs.readdirSync(pureDir).filter((f) => f.endsWith('.js'));
let hasError = false;

for (const file of files) {
  const filePath = path.join(pureDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Strip block comments /* ... */
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');

  const lines = content.split('\n');

  lines.forEach((line, lineIdx) => {
    // Strip single-line comments // ...
    const codePart = line.replace(/\/\/.*$/, '').trim();
    if (!codePart) return;

    for (const { regex, desc } of FORBIDDEN_RULES) {
      if (regex.test(codePart)) {
        console.error(`[check:pure] VIOLATION in ${file}:${lineIdx + 1} -> Matched ${regex} (${desc}): "${codePart}"`);
        hasError = true;
      }
    }
  });
}

if (hasError) {
  console.error('[check:pure] FAILED: Pure layer isolation rules violated.');
  process.exit(1);
} else {
  console.log(`[check:pure] SUCCESS: All ${files.length} pure helper files verified cleanly. Zero browser APIs, zero React dependencies.`);
  process.exit(0);
}

