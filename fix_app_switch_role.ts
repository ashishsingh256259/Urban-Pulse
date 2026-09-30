import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\s*\/\/ Switch Quick Roles with zero friction using Firebase Auth demo credentials[\s\S]*?const handleSwitchRole = async.*?\{[\s\S]*?\n  \};\n/g;
content = content.replace(regex, '');

fs.writeFileSync('src/App.tsx', content);
