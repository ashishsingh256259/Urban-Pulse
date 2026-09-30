import fs from 'fs';
let content = fs.readFileSync('src/components/CityCommandCenter.tsx', 'utf8');

content = content.replace('import JudgeDemoWorkflow from "./JudgeDemoWorkflow";\n', '');
content = content.replace(/\s*onAddSimulatedReport: \(newReport: Report\) => void;\n/g, '');
content = content.replace(/\s*onUpdateSimulatedReportStatus: \(id: string, status: Report\["status"\]\) => void;\n/g, '');
content = content.replace(/\s*onAddSimulatedReport,\n/g, '');
content = content.replace(/\s*onUpdateSimulatedReportStatus,\n/g, '');

fs.writeFileSync('src/components/CityCommandCenter.tsx', content);
