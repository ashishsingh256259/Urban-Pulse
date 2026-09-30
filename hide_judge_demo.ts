import fs from 'fs';
let content = fs.readFileSync('src/components/CityCommandCenter.tsx', 'utf8');

const regex = /\{import\.meta\.env\.DEV && \(\s*<JudgeDemoWorkflow[\s\S]*?\/>\s*\)\}/g;
content = content.replace(regex, '');

fs.writeFileSync('src/components/CityCommandCenter.tsx', content);
