const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\bborder-slate-200\b/) && !line.match(/\bdark:border-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
  if (line.match(/\bborder-slate-300\b/) && !line.match(/\bdark:border-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
