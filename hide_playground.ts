import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{import\.meta\.env\.DEV && \(\s*<>\s*\{\/\* HIGH-FIDELITY DEMO PLAYGROUND BOARD \*\/\}[\s\S]*?<\/>\s*\)\}/g;
content = content.replace(regex, '');

fs.writeFileSync('src/App.tsx', content);
