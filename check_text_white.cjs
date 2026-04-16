const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\btext-white\b/) && !line.match(/\bdark:(hover:)?text-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
