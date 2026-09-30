import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\s*\/\/ Simulation Handlers specifically for Judge Closed-Loop Demo[\s\S]*?const handleUpdateSimulatedReportStatus = .*?\{[\s\S]*?\n  \};\n/g;
content = content.replace(regex, '');

fs.writeFileSync('src/App.tsx', content);
