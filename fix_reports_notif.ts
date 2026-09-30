import fs from 'fs';

let content = fs.readFileSync('src/lib/firestore_reports.ts', 'utf8');

if (!content.includes('import { createNotification }')) {
  content = 'import { createNotification } from "../services/notificationsService";\n' + content;
}

const oldCreate = `export const createReport = async (report: Omit<Report, "id">) => {
  const reportsRef = collection(db, "reports");
  const docRef = await addDoc(reportsRef, {
    ...report,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
};`;

const newCreate = `export const createReport = async (report: Omit<Report, "id">) => {
  const reportsRef = collection(db, "reports");
  const docRef = await addDoc(reportsRef, {
    ...report,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Real-time notification for Municipal Panel
  try {
    await createNotification(
      \`New \${report.source === 'ROAD_SCANNER' ? 'AI' : 'Citizen'} Report: \${report.title}\`,
      \`A new incident has been logged in \${report.location || 'your jurisdiction'}.\`,
      "report_submitted",
      "admin",
      "",
      docRef.id
    );
  } catch (e) {
    console.error("Failed to notify municipal:", e);
  }
  
  return docRef.id;
};`;
content = content.replace(oldCreate, newCreate);

const oldUpdate = `export const updateReportStatus = async (id: string, status: string, comment?: string) => {
  const docRef = doc(db, "reports", id);
  await updateDoc(docRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
  // You might want to add comments to a subcollection or array in the document.
};`;

const newUpdate = `import { getDoc } from "firebase/firestore";
export const updateReportStatus = async (id: string, status: string, comment?: string) => {
  const docRef = doc(db, "reports", id);
  
  // Fetch existing report to know who to notify
  const snap = await getDoc(docRef);
  
  await updateDoc(docRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
  
  if (snap.exists()) {
    const data = snap.data();
    if (data.reporterEmail) {
      // Real-time notification for Citizen Panel
      try {
        await createNotification(
          \`Report Status Updated to \${status}\`,
          \`Your report "\${data.title}" has been updated by the Municipal Command Center.\`,
          "status_update",
          "citizen",
          data.reporterEmail,
          id
        );
      } catch (e) {
        console.error("Failed to notify citizen:", e);
      }
    }
  }
};`;

content = content.replace(oldUpdate, newUpdate);
fs.writeFileSync('src/lib/firestore_reports.ts', content);
