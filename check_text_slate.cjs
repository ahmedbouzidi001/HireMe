const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const texts = ['text-slate-500', 'text-slate-600', 'text-slate-700', 'text-slate-800', 'text-slate-900'];
texts.forEach(text => {
  const matches = content.match(new RegExp(`\\b${text}\\b`, 'g')) || [];
  const darkMatches = content.match(new RegExp(`\\bdark:${text}\\b`, 'g')) || [];
  console.log(`${text}:`, matches.length, 'dark:', darkMatches.length);
});
