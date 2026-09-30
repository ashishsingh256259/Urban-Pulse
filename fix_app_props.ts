import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\s*onAddSimulatedReport=\{handleAddSimulatedReport\}\n/g, '\n');
content = content.replace(/\s*onUpdateSimulatedReportStatus=\{handleUpdateSimulatedReportStatus\}\n/g, '\n');

fs.writeFileSync('src/App.tsx', content);
