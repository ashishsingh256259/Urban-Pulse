import fs from 'fs';
let content = fs.readFileSync('src/lib/firestore_errors.ts', 'utf8');
content = content.replace('throw new Error(JSON.stringify(errInfo));', '// throw new Error(JSON.stringify(errInfo));');
fs.writeFileSync('src/lib/firestore_errors.ts', content);
