import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/"citizen@urbanpulse\.gov"/g, 'currentUser.email');

fs.writeFileSync('src/App.tsx', content);
