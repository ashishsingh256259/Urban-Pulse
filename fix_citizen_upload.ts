import fs from 'fs';
let content = fs.readFileSync('src/components/CitizenUpload.tsx', 'utf8');
content = content.replace(/\s*\/\/ Demo Samples[\s\S]*?const handleApplyDemo =.*?\{[\s\S]*?\n  \};\n/g, '');
fs.writeFileSync('src/components/CitizenUpload.tsx', content);
