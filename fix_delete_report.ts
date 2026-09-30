import fs from 'fs';

let content = fs.readFileSync('src/lib/firestore_reports.ts', 'utf8');

if (!content.includes('export const deleteReport')) {
  content += `\n
import { deleteDoc } from "firebase/firestore";

export const deleteReport = async (id: string) => {
  const docRef = doc(db, "reports", id);
  await deleteDoc(docRef);
};\n`;
  fs.writeFileSync('src/lib/firestore_reports.ts', content);
}
