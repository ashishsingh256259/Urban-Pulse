import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

content = content.replace(/\s*: \(role: "citizen" \| "municipal"\) => Promise<UserProfile>;/g, '');

fs.writeFileSync('src/context/AuthContext.tsx', content);
