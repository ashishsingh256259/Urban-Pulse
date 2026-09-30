import fs from 'fs';
let content = fs.readFileSync('src/lib/firestore_reports.ts', 'utf8');

content = content.replace(
  '    console.error("Failed to notify municipal:", e);',
  '    handleFirestoreError(e, OperationType.CREATE, "notifications");'
);

content = content.replace(
  '        console.error("Failed to notify citizen:", e);',
  '        handleFirestoreError(e, OperationType.CREATE, "notifications");'
);

fs.writeFileSync('src/lib/firestore_reports.ts', content);
