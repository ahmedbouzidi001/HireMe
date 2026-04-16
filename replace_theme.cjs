const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace text colors
content = content.replace(/\btext-white\b/g, 'text-slate-900 dark:text-white');
content = content.replace(/\btext-slate-200\b/g, 'text-slate-800 dark:text-slate-200');
content = content.replace(/\btext-slate-300\b/g, 'text-slate-700 dark:text-slate-300');
content = content.replace(/\btext-slate-400\b/g, 'text-slate-600 dark:text-slate-400');

// Replace background colors
content = content.replace(/\bbg-slate-950\b/g, 'bg-slate-50 dark:bg-slate-950');
content = content.replace(/\bbg-slate-900\/50\b/g, 'bg-white/80 dark:bg-slate-900/50');
content = content.replace(/\bbg-slate-900\b/g, 'bg-white dark:bg-slate-900');
content = content.replace(/\bbg-slate-800\/50\b/g, 'bg-slate-100/80 dark:bg-slate-800/50');
content = content.replace(/\bbg-slate-800\b/g, 'bg-slate-100 dark:bg-slate-800');

// Replace border colors
content = content.replace(/\bborder-white\/5\b/g, 'border-slate-200 dark:border-white/5');
content = content.replace(/\bborder-white\/10\b/g, 'border-slate-200 dark:border-white/10');
content = content.replace(/\bborder-white\/20\b/g, 'border-slate-300 dark:border-white/20');
content = content.replace(/\bborder-slate-800\b/g, 'border-slate-200 dark:border-slate-800');
content = content.replace(/\bborder-slate-700\b/g, 'border-slate-300 dark:border-slate-700');

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements done.');
