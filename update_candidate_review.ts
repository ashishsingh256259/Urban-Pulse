import fs from 'fs';

let content = fs.readFileSync('src/components/RoadAiCandidateReview.tsx', 'utf8');

if (!content.includes('import { createReport }')) {
  content = content.replace(
    'import { Check, X, ShieldAlert, AlertTriangle, ArrowRight, Activity, MapPin, Zap, RefreshCw, Send, CheckCircle2 } from "lucide-react";',
    'import { Check, X, ShieldAlert, AlertTriangle, ArrowRight, Activity, MapPin, Zap, RefreshCw, Send, CheckCircle2 } from "lucide-react";\nimport { createReport } from "../lib/firestore_reports";'
  );
}

const oldSubmit = `          // Also notify backend sync API in the background (non-blocking)
          fetch("/api/reports/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...reportPayload,
              id: createdReport.id,
            })
          }).catch(e => console.warn("Background AI Report sync failed:", e));`;

const newSubmit = `          // Also save to Firestore
          try {
            await createReport({
              ...reportPayload
            });
          } catch(e) {
            console.error("Firestore AI Report save failed:", e);
          }`;

content = content.replace(oldSubmit, newSubmit);

fs.writeFileSync('src/components/RoadAiCandidateReview.tsx', content);
