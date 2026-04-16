const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/\btext-(slate|gray)-(500|600|700|800|900)\b/) && !line.match(/\bdark:(hover:)?text-/)) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
