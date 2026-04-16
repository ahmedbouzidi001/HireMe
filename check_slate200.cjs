const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const matches = content.match(/\btext-slate-200\b/g) || [];
const darkMatches = content.match(/\bdark:text-slate-200\b/g) || [];
console.log('text-slate-200:', matches.length);
console.log('dark:text-slate-200:', darkMatches.length);
