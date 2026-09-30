import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/fetch\("\/api\/reports\/create", \{\s+method: "POST",\s+headers: \{ "Content-Type": "application\/json" \},\s+body: JSON.stringify\(newRep\)\s+\}\)\.catch\(err => console\.log\("Fallback mock persistence sync"\)\);/g, 
  `createReport(newRep).catch(err => console.log("Fallback mock persistence sync", err));`);

fs.writeFileSync('src/App.tsx', content);
