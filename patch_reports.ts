import fs from 'fs';
let content = fs.readFileSync('src/lib/firestore_reports.ts', 'utf8');

if (!content.includes('import { handleFirestoreError')) {
  content = 'import { handleFirestoreError, OperationType } from "./firestore_errors";\n' + content;
}

content = content.replace(
  '  return onSnapshot(q, (snapshot) => {\n    const reports: Report[] = [];\n    snapshot.forEach((doc) => {\n      reports.push({ id: doc.id, ...doc.data() } as Report);\n    });\n    callback(reports);\n  });',
  '  return onSnapshot(q, (snapshot) => {\n    const reports: Report[] = [];\n    snapshot.forEach((doc) => {\n      reports.push({ id: doc.id, ...doc.data() } as Report);\n    });\n    callback(reports);\n  }, (error) => {\n    handleFirestoreError(error, OperationType.LIST, "reports");\n  });'
);

fs.writeFileSync('src/lib/firestore_reports.ts', content);
