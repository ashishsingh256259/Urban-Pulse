import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'await dbUpdateReportStatus(payload.id, payload.status, payload.comment);\nconst response = { ok: true };\n      const data = { status: "success" };\n      if (data.status === "success") {',
  'await dbUpdateReportStatus(payload.id, payload.status, payload.comment);\n      if (true) {'
);

fs.writeFileSync('src/App.tsx', content);
