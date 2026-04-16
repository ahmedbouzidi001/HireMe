const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace text-slate-500 with text-slate-600 dark:text-slate-400
// But only if it's not already followed by dark:text-slate-
content = content.replace(/text-slate-500(?! dark:text-slate-)/g, 'text-slate-600 dark:text-slate-400');

// Also fix the text-slate-600 that don't have dark:text-slate-
content = content.replace(/text-slate-600(?! dark:text-slate-)/g, 'text-slate-600 dark:text-slate-400');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed text colors.');
