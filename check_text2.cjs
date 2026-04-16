const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const textClasses = new Set();
const regex = /text-[a-z]+-[0-9]+/g;
let match;
while ((match = regex.exec(content)) !== null) {
  textClasses.add(match[0]);
}
console.log("Text classes found:");
console.log(Array.from(textClasses).join(', '));

const otherTextClasses = new Set();
const regex2 = /text-(white|black|transparent)/g;
while ((match = regex2.exec(content)) !== null) {
  otherTextClasses.add(match[0]);
}
console.log("Other text classes found:");
console.log(Array.from(otherTextClasses).join(', '));
