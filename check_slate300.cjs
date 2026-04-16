const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const matches300 = content.match(/\btext-slate-300\b/g) || [];
const darkMatches300 = content.match(/\bdark:text-slate-300\b/g) || [];
const matches400 = content.match(/\btext-slate-400\b/g) || [];
const darkMatches400 = content.match(/\bdark:text-slate-400\b/g) || [];
console.log('text-slate-300:', matches300.length, 'dark:', darkMatches300.length);
console.log('text-slate-400:', matches400.length, 'dark:', darkMatches400.length);
