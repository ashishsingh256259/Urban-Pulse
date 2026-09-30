import fs from 'fs';
let content = fs.readFileSync('src/components/CitizenUpload.tsx', 'utf8');

const regex = /\{import\.meta\.env\.DEV && \(\s*<>\s*\{\/\* Demo shortcuts row \*\/\}[\s\S]*?<\/>\s*\)\}/g;
content = content.replace(regex, '');

fs.writeFileSync('src/components/CitizenUpload.tsx', content);
