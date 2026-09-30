import fs from 'fs';

let content = fs.readFileSync('src/components/CitizenUpload.tsx', 'utf8');

if (!content.includes('import { createReport }')) {
  content = content.replace(
    'import { ShieldAlert, AlertTriangle, Image as ImageIcon, MapPin, CheckCircle2, ChevronRight, Check, X, Camera, RefreshCw } from "lucide-react";',
    'import { ShieldAlert, AlertTriangle, Image as ImageIcon, MapPin, CheckCircle2, ChevronRight, Check, X, Camera, RefreshCw } from "lucide-react";\nimport { createReport } from "../lib/firestore_reports";'
  );
}

// Modify the submission logic
const oldSubmit = `      // 2. Also notify the server synchronization endpoint
      fetch("/api/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reportPayload,
          reporterEmail: user?.email || userProfile?.email || currentUserEmail
        })
      }).catch(e => console.warn("Background sync failed:", e));

      onReportCreated({ ...reportPayload, reporterEmail: user?.email || userProfile?.email || currentUserEmail });`;

const newSubmit = `      // 2. Also save to Firestore
      try {
        const docId = await createReport({
          ...reportPayload,
          reporterEmail: user?.email || userProfile?.email || currentUserEmail
        });
        // We do not need to call onReportCreated because Firestore onSnapshot will update the list
        // However, we can still call it if needed for immediate local feedback, but it's better to rely on Firestore.
      } catch (e) {
        console.error("Firestore save failed:", e);
      }`;

content = content.replace(oldSubmit, newSubmit);

fs.writeFileSync('src/components/CitizenUpload.tsx', content);
