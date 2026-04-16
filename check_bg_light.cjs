const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const bgs = ['bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-300'];
bgs.forEach(bg => {
  const matches = content.match(new RegExp(`\\b${bg}\\b`, 'g')) || [];
  const darkMatches = content.match(new RegExp(`\\bdark:${bg}\\b`, 'g')) || [];
  console.log(`${bg}:`, matches.length, 'dark:', darkMatches.length);
});
