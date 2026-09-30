import fs from 'fs';

let content = fs.readFileSync('src/components/CitizenEmergencySOS.tsx', 'utf8');

if (!content.includes('import { createNotification }')) {
  content = content.replace(
    'import { useState } from "react";',
    'import { useState } from "react";\nimport { createNotification } from "../services/notificationsService";'
  );
}

const originalTrigger = `        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setSosActive(true);
          setDispatchStatus("BROADCASTING");
          setTimeout(() => setDispatchStatus("DISPATCHED"), 2500);
          return null;
        }`;

const newTrigger = `        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setSosActive(true);
          setDispatchStatus("BROADCASTING");
          
          // Trigger Municipal Notification for SOS
          createNotification(
            "🚨 CRITICAL SOS ACTIVATED",
            \`Emergency: \${emergencyType} reported by \${currentUser?.email || 'Citizen'}\`,
            "alert_high_severity",
            "admin",
            "",
            "SOS_ALERT"
          );

          setTimeout(() => setDispatchStatus("DISPATCHED"), 2500);
          return null;
        }`;

content = content.replace(originalTrigger, newTrigger);
fs.writeFileSync('src/components/CitizenEmergencySOS.tsx', content);
