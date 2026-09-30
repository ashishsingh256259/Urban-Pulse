import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/fetch\("\/api\/reports\/update-status", {\s+method: "POST",\s+headers: { "Content-Type": "application\/json" },\s+body: JSON.stringify\({[\s\S]*?id,[\s\S]*?status,[\s\S]*?officerName: "Delhi Dispatch Core",[\s\S]*?comment: [\s\S]*?}\),\s+}\)/g,
`dbUpdateReportStatus(id, status, "Judge Demo Automation: Status pushed to " + status + " dynamically by municipal evaluator.")`);

content = content.replace(/const response = await fetch\("\/api\/reports\/update-status", {\s+method: "POST",\s+headers: { "Content-Type": "application\/json" },\s+body: JSON.stringify\(payload\)\s+}\);/g,
`await dbUpdateReportStatus(payload.id, payload.status, payload.comment);
const response = { ok: true };`);

content = content.replace(/fetch\("\/api\/reports\/update-status", {\s+method: "POST",\s+headers: { "Content-Type": "application\/json" },\s+body: JSON.stringify\({\s+id,\s+status,\s+comment: "Bulk Action: Resolving target batch on operations deck."\s+}\)\s+}\)/g,
`dbUpdateReportStatus(id, status, "Bulk Action: Resolving target batch on operations deck.")`);

content = content.replace(/fetch\("\/api\/reports\/update-status", {\s+method: "POST",\s+headers: { "Content-Type": "application\/json" },\s+body: JSON.stringify\({\s+id,\s+status,\s+comment: "Bulk Action: Slating target batch for In-Progress fieldwork."\s+}\)\s+}\)/g,
`dbUpdateReportStatus(id, status, "Bulk Action: Slating target batch for In-Progress fieldwork.")`);

fs.writeFileSync('src/App.tsx', content);
