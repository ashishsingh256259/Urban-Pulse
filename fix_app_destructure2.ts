import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\s*quickDemoLogin[ \t]*\n/g, '\n');
content = content.replace(/,\s*quickDemoLogin\s*\}/g, '}');
content = content.replace(/quickDemoLogin\s*,?\s*/g, '');

fs.writeFileSync('src/App.tsx', content);
