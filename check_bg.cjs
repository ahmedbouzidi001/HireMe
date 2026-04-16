const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const bgs = ['bg-slate-950', 'bg-slate-900', 'bg-slate-800', 'bg-slate-700'];
bgs.forEach(bg => {
  const matches = content.match(new RegExp(`\\b${bg}\\b`, 'g')) || [];
  const darkMatches = content.match(new RegExp(`\\bdark:${bg}\\b`, 'g')) || [];
  console.log(`${bg}:`, matches.length, 'dark:', darkMatches.length);
});
