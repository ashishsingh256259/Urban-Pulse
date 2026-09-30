import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/const res = await fetch\("\/api\/reports\/delete", {\s+method: "POST",\s+headers: { "Content-Type": "application\/json" },\s+body: JSON.stringify\({ id }\)\s+}\);/g,
`await deleteReport(id);
const res = { ok: true };`);
fs.writeFileSync('src/App.tsx', content);
