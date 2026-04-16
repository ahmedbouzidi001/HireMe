const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const mappings = {
  'text-slate-900': 'dark:text-white',
  'text-slate-800': 'dark:text-slate-200',
  'text-slate-700': 'dark:text-slate-300',
  'text-slate-600': 'dark:text-slate-400',
  'text-slate-500': 'dark:text-slate-400',
  'text-slate-400': 'dark:text-slate-400',
  'text-slate-300': 'dark:text-slate-700',
  'text-slate-200': 'dark:text-slate-800',
  'text-slate-100': 'dark:text-slate-900',
  'text-black': 'dark:text-white',
  
  'bg-slate-50': 'dark:bg-slate-900',
  'bg-slate-100': 'dark:bg-slate-800',
  'bg-slate-200': 'dark:bg-slate-800',
  'bg-slate-300': 'dark:bg-slate-700',
  'bg-slate-800': 'dark:bg-slate-100',
  'bg-slate-900': 'dark:bg-slate-50',
  'bg-white': 'dark:bg-slate-900',
  
  'border-slate-100': 'dark:border-slate-800',
  'border-slate-200': 'dark:border-slate-700',
  'border-slate-300': 'dark:border-slate-700',
  'border-slate-800': 'dark:border-slate-200',
};

function processClasses(classes) {
  let classArray = classes.split(/\s+/);
  let newClasses = [];
  
  for (let cls of classArray) {
    newClasses.push(cls);
    if (mappings[cls]) {
      let prefix = cls.split('-')[0];
      if (cls === 'text-black') prefix = 'text';
      if (cls === 'bg-white') prefix = 'bg';
      
      let hasDark = classArray.some(c => c.startsWith('dark:' + prefix + '-'));
      if (!hasDark && !classArray.includes(mappings[cls])) {
        newClasses.push(mappings[cls]);
      }
    }
  }
  
  return [...new Set(newClasses)].join(' ');
}

content = content.replace(/className=(["'])(.*?)\1/g, (match, quote, classes) => {
  return `className=${quote}${processClasses(classes)}${quote}`;
});

content = content.replace(/className=\{`([^`]+)`\}/g, (match, classes) => {
  return `className={\`${processClasses(classes)}\`}`;
});

content = content.replace(/cn\(([\s\S]*?)\)/g, (match, inner) => {
  let newInner = inner.replace(/(["'])(.*?)\1/g, (m, q, classes) => {
    return `${q}${processClasses(classes)}${q}`;
  });
  return `cn(${newInner})`;
});

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed all colors.');
