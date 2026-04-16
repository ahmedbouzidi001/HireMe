const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const lines = content.split('\n');

const badLines = lines.map((line, i) => ({line, num: i + 1})).filter(l => {
  // Check for text-white, text-slate-200, text-slate-300, text-slate-400
  // that are NOT preceded by dark: or hover: or focus:
  const match = l.line.match(/(?<!dark:|hover:|focus:)(text-white|text-slate-200|text-slate-300|text-slate-400)/);
  return match !== null;
});

console.log(`Found ${badLines.length} potentially bad lines`);
badLines.forEach(l => console.log(`${l.num}: ${l.line.trim()}`));
