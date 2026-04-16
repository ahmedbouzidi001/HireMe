const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/dark:bg-white dark:bg-slate-900\/50/g, 'dark:bg-slate-900/50');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed typos.');
