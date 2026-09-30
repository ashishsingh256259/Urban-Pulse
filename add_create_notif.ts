import fs from 'fs';

let content = fs.readFileSync('src/services/notificationsService.ts', 'utf8');

const createNotif = `
export async function createNotification(
  title: string,
  message: string,
  type: string,
  recipientRole: "citizen" | "admin" | "municipal" | "all",
  recipientEmail: string = "",
  reportId: string = "SYSTEM"
): Promise<void> {
  if (!db) return;
  try {
    const notifId = \`notif_\${Date.now()}\`;
    const notifRef = doc(db, "notifications", notifId);
    await setDoc(notifRef, {
      id: notifId,
      title,
      message,
      type,
      recipientRole,
      recipientEmail,
      reportId,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
`;

content = `import { setDoc } from "firebase/firestore";\n` + content + createNotif;
fs.writeFileSync('src/services/notificationsService.ts', content);
