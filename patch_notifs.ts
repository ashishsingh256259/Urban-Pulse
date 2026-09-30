import fs from 'fs';
let content = fs.readFileSync('src/services/notificationsService.ts', 'utf8');

if (!content.includes('import { handleFirestoreError')) {
  content = 'import { handleFirestoreError, OperationType } from "../lib/firestore_errors";\n' + content;
}

content = content.replace(
  '  const unsubscribe = onSnapshot(q, (snapshot) => {\n    let notifList: Notification[] = snapshot.docs.map(d => {',
  '  const unsubscribe = onSnapshot(q, (snapshot) => {\n    let notifList: Notification[] = snapshot.docs.map(d => {'
);

content = content.replace(
  '  }, (error) => {\n    console.error("Error listening to notifications:", error);\n  });',
  '  }, (error) => {\n    handleFirestoreError(error, OperationType.LIST, "notifications");\n  });'
);

// We need to modify the query as well
content = content.replace(
  '  const q = query(\n    collection(db, "notifications"),\n    // If we order by createdAt, we need an index. Let\'s just pull and sort locally to avoid index errors in prototype.\n    // We can limit if we want, but since we\'ll filter locally for now to handle complex OR logic:\n    limit(200)\n  );',
  '  let q = query(collection(db, "notifications"), limit(200));\n  if (userRole !== "admin" && userRole !== "municipal") {\n    // non-admins must query their own emails to satisfy the security rule\n    q = query(collection(db, "notifications"), where("recipientEmail", "==", userEmail), limit(100));\n  }'
);

fs.writeFileSync('src/services/notificationsService.ts', content);
