const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\bbg-slate-50\b/) && !line.match(/\bdark:(hover:)?bg-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
  if (line.match(/\bbg-slate-100\b/) && !line.match(/\bdark:(hover:)?bg-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
  if (line.match(/\bbg-slate-200\b/) && !line.match(/\bdark:(hover:)?bg-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
  if (line.match(/\bbg-slate-300\b/) && !line.match(/\bdark:(hover:)?bg-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
