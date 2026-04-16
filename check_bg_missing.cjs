const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\bbg-slate-800\b/) && !line.match(/\bdark:bg-slate-800\b/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
  if (line.match(/\bbg-slate-700\b/) && !line.match(/\bdark:bg-slate-700\b/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
