import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// We want to add an extra notification to the municipal dashboard when a report is created.
// In `/api/reports/create` we have:
// await setDoc(doc(firestoreDb, "notifications", notifId), newNotif);

const serverCreateSearch = `
    const newNotif: NotificationItem = {
      id: notifId,
      recipientEmail: reporterEmail || "citizen@urbanpulse.ai",
      recipientRole: "citizen",
      title: \`Report Registered: \${validCategory}\`,
      message: \`Your report '\${newReport.title}' has been logged (Severity: \${validSeverity}%). Municipal teams notified.\`,
      type: "report_submitted",
      reportId: reportId,
      read: false,
      createdAt: nowStr
    };
    inMemoryStore.notifications.set(notifId, newNotif);

    // Sync to Firestore
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "reports", reportId), newReport);
        await setDoc(doc(firestoreDb, "notifications", notifId), newNotif);
`;

const serverCreateReplace = `
    const newNotif: NotificationItem = {
      id: notifId,
      recipientEmail: reporterEmail || "citizen@urbanpulse.ai",
      recipientRole: "citizen",
      title: \`Report Registered: \${validCategory}\`,
      message: \`Your report '\${newReport.title}' has been logged (Severity: \${validSeverity}%). Municipal teams notified.\`,
      type: "report_submitted",
      reportId: reportId,
      read: false,
      createdAt: nowStr
    };
    inMemoryStore.notifications.set(notifId, newNotif);
    
    // Create notification for Municipal
    const muniNotifId = \`notif_muni_\${Date.now()}\`;
    const isHighSeverity = validSeverity >= 80;
    const isRoadScanner = newReport.source === "ROAD_SCANNER";
    
    const muniNotif: NotificationItem = {
      id: muniNotifId,
      recipientEmail: "", // target all municipal users
      recipientRole: "admin",
      title: isHighSeverity 
        ? \`CRITICAL ALERT: \${validCategory}\` 
        : isRoadScanner 
          ? \`New AI Road Scanner Report\`
          : \`New Citizen Report: \${validCategory}\`,
      message: isRoadScanner
        ? \`AI scanner detected \${validCategory} (\${validSeverity}% severity) at \${newReport.location}\`
        : \`A new report has been submitted by \${reporterEmail || 'a citizen'}. Severity: \${validSeverity}%\`,
      type: isHighSeverity ? "alert_high_severity" : "report_submitted",
      reportId: reportId,
      read: false,
      createdAt: nowStr
    };
    inMemoryStore.notifications.set(muniNotifId, muniNotif);

    // Sync to Firestore
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "reports", reportId), newReport);
        await setDoc(doc(firestoreDb, "notifications", notifId), newNotif);
        await setDoc(doc(firestoreDb, "notifications", muniNotifId), muniNotif);
`;

content = content.replace(serverCreateSearch, serverCreateReplace);

// Let's add SOS notification
const sosEndpointExists = content.includes('app.post("/api/sos"');

if (!sosEndpointExists) {
  // Let's check if there's an SOS endpoint or how SOS is handled
}

fs.writeFileSync('server.ts', content);
