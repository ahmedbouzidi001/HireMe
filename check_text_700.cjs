const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\btext-slate-700\b/) && !line.match(/\bdark:text-slate-300\b/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
