const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const textWhiteLines = lines.map((line, i) => ({line, num: i + 1})).filter(l => l.line.includes('text-white') && !l.line.includes('dark:text-white'));
console.log(`Found ${textWhiteLines.length} lines with text-white without dark: prefix`);
textWhiteLines.slice(0, 10).forEach(l => console.log(`${l.num}: ${l.line.trim()}`));

const textGrayLines = lines.map((line, i) => ({line, num: i + 1})).filter(l => (l.line.includes('text-slate-200') || l.line.includes('text-slate-300') || l.line.includes('text-slate-400')) && !l.line.includes('dark:text-slate-'));
console.log(`Found ${textGrayLines.length} lines with light slate text without dark: prefix`);
textGrayLines.slice(0, 10).forEach(l => console.log(`${l.num}: ${l.line.trim()}`));
