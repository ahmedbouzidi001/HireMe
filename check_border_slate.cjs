const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const borders = ['border-slate-200', 'border-slate-300', 'border-slate-700', 'border-slate-800'];
borders.forEach(border => {
  const matches = content.match(new RegExp(`\\b${border}\\b`, 'g')) || [];
  const darkMatches = content.match(new RegExp(`\\bdark:${border}\\b`, 'g')) || [];
  console.log(`${border}:`, matches.length, 'dark:', darkMatches.length);
});
