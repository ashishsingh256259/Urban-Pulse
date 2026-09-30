import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const regex = /\s*\/\/ Demo Login Helper for zero friction judge\/evaluator switching[\s\S]*?const quickDemoLogin = async.*?\{[\s\S]*?\n  \};\n/g;
content = content.replace(regex, '');

const regex2 = /\bquickDemoLogin\b,?\s*/g;
content = content.replace(regex2, '');

fs.writeFileSync('src/context/AuthContext.tsx', content);
