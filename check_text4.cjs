const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const lines = content.split('\n');

const badLines = lines.map((line, i) => ({line, num: i + 1})).filter(l => {
  const words = l.line.split(/[\s"']/);
  for (const word of words) {
    if (word === 'text-white' || word === 'text-slate-200' || word === 'text-slate-300' || word === 'text-slate-400') {
      return true;
    }
  }
  return false;
});

console.log(`Found ${badLines.length} potentially bad lines`);
badLines.slice(0, 30).forEach(l => console.log(`${l.num}: ${l.line.trim()}`));
