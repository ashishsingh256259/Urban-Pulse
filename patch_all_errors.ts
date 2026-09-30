import fs from 'fs';
let content = fs.readFileSync('src/services/notificationsService.ts', 'utf8');

content = content.replace(
  '    console.error("Failed to mark notification as read:", error);',
  '    handleFirestoreError(error, OperationType.UPDATE, "notifications");'
);

content = content.replace(
  '    console.error("Failed to mark all notifications as read:", error);',
  '    handleFirestoreError(error, OperationType.UPDATE, "notifications");'
);

content = content.replace(
  '    console.error("Failed to create notification:", error);',
  '    handleFirestoreError(error, OperationType.CREATE, "notifications");'
);

fs.writeFileSync('src/services/notificationsService.ts', content);
