const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const lines = content.split('\n');

const badLines = lines.map((line, i) => ({line, num: i + 1})).filter(l => {
  // Check for text-white that is not prefixed with dark: or hover:
  if (l.line.match(/(?<!dark:|hover:)text-white/)) return true;
  if (l.line.match(/(?<!dark:|hover:)text-slate-(200|300|400)/)) return true;
  return false;
});

console.log(`Found ${badLines.length} potentially bad lines`);
badLines.slice(0, 20).forEach(l => console.log(`${l.num}: ${l.line.trim()}`));
