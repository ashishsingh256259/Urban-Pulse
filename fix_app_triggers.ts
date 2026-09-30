import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/\s*\/\/ High-fidelity active demo simulation alert triggers[\s\S]*?const handleTriggerDemoAlert = async.*?\{[\s\S]*?\n  \};\n/g, '');
fs.writeFileSync('src/App.tsx', content);
