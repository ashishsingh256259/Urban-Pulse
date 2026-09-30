import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\s*quickDemoLogin\n/g, '\n');

fs.writeFileSync('src/App.tsx', content);
