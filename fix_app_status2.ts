import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '      if (true) {\n        if (selectedReport && selectedReport.id === payload.id) {\n          setSelectedReport({\n            ...selectedReport,\n            status: payload.status,\n            assignedTo: payload.assignedTo\n          });\n        }\n        if (currentUser) {\n          syncOperationalDatasets(currentUser.email, currentUser.role);\n        }\n      }',
  '        if (selectedReport && selectedReport.id === payload.id) {\n          setSelectedReport({\n            ...selectedReport,\n            status: payload.status,\n            assignedTo: payload.assignedTo\n          });\n        }\n        if (currentUser) {\n          syncOperationalDatasets(currentUser.email, currentUser.role);\n        }'
);

fs.writeFileSync('src/App.tsx', content);
