const fs = require('fs');
const translations = fs.readFileSync('src/translations.ts', 'utf8');
const keys = fs.readFileSync('keys.txt', 'utf8').split('\n').filter(Boolean).map(k => k.match(/t\('([^']+)'\)/)[1]);
const missing = new Set();
for (const key of keys) {
  if (key === '.' || key === ' ' || key === '\n' || key === ',' || key === '|' || key === 'div' || key === 'T') continue;
  const parts = key.split('.');
  if (parts.length > 2) {
    if (!translations.includes(parts[parts.length - 1] + ':')) {
      missing.add(key);
    }
  } else if (parts.length === 2) {
    if (!translations.includes(parts[1] + ':')) {
      missing.add(key);
    }
  }
}
console.log(Array.from(missing).join('\n'));
