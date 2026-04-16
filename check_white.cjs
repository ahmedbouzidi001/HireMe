const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const matches = content.match(/\btext-white\b/g) || [];
const darkMatches = content.match(/\bdark:text-white\b/g) || [];
console.log('text-white:', matches.length);
console.log('dark:text-white:', darkMatches.length);
