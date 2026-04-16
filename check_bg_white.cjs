const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\bbg-white\b/) && !line.match(/\bdark:(hover:)?bg-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
