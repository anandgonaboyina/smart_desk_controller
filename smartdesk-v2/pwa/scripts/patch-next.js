/**
 * scripts/patch-next.js
 * 
 * Comprehensive patch for Next.js 16.4.2 bug where `hasOwnProperty`
 * is called directly on null-prototype header dictionaries in dev and prod runtimes.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../node_modules/next/dist');
if (!fs.existsSync(distDir)) {
  console.log('[patch-next] next/dist not found, skipping.');
  process.exit(0);
}

let patchedFiles = 0;

function scanAndPatch(dir) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanAndPatch(fullPath);
    } else if (item.endsWith('.js')) {
      let code = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // 1. Minified / unminified revalidateOnlyGenerated: X.hasOwnProperty(Y)
      const regex = /revalidateOnlyGenerated:\s*([a-zA-Z0-9_$]+)\.hasOwnProperty\(([^)]+)\)/g;
      if (regex.test(code)) {
        code = code.replace(regex, 'revalidateOnlyGenerated:Object.prototype.hasOwnProperty.call($1||{}, $2)');
        changed = true;
      }

      // 2. Direct rawHeaders.hasOwnProperty
      if (code.includes('rawHeaders.hasOwnProperty(')) {
        code = code.replaceAll('rawHeaders.hasOwnProperty(', 'Object.prototype.hasOwnProperty.call(rawHeaders || {}, ');
        changed = true;
      }

      // 3. Direct headers.hasOwnProperty
      if (code.includes('headers.hasOwnProperty(')) {
        code = code.replaceAll('headers.hasOwnProperty(', 'Object.prototype.hasOwnProperty.call(headers || {}, ');
        changed = true;
      }

      // 4. is-plain-object prototype.hasOwnProperty('isPrototypeOf')
      if (code.includes("prototype.hasOwnProperty('isPrototypeOf')")) {
        code = code.replaceAll("prototype.hasOwnProperty('isPrototypeOf')", "Object.prototype.hasOwnProperty.call(prototype || {}, 'isPrototypeOf')");
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, code, 'utf8');
        patchedFiles++;
      }
    }
  }
}

scanAndPatch(distDir);
console.log(`[patch-next] Successfully patched ${patchedFiles} Next.js files for null-prototype safety.`);
