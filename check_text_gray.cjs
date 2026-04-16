const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const lines = content.split('\n');

const badLines = lines.map((line, i) => ({line, num: i + 1})).filter(l => {
  if (l.line.includes('text-gray-') && !l.line.includes('dark:text-')) {
    return true;
  }
  return false;
});

console.log(`Found ${badLines.length} potentially bad lines`);
badLines.slice(0, 20).forEach(l => console.log(`${l.num}: ${l.line.trim()}`));
