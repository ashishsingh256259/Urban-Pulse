import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'aiReply = `### Safe Route Intelligence\\n\\nUrbanPulse evaluates transit corridors using live hazard density:\\n\\n* **Optimal Corridor (NH48 Bypass):** Bypasses active potholes with a **96% safety score**.\\n* **Standard Route (MG Road):** 2.1km shorter but traverses 2 active surface fissures.\\n\\nOpen the **"Safe Route Navigator"** tab in the sidebar to simulate custom commute waypoints.`;',
  'aiReply = `### Safe Route Intelligence\\n\\nI do not have specific UrbanPulse report data for that route at the moment.\\n\\nOpen the **"Safe Route Navigator"** tab in the sidebar to check live custom commute waypoints.`;'
);

content = content.replace(
  'aiReply = `### Executive Municipal Briefing\\n\\nGreetings Officer ${userName || "Director"}.\\n\\n* **Active Hazard Backlog:** **${activeReports.length} tickets** (${criticalReports.length} Critical Priority)\\n* **Resolution Rate:** **${totalReports > 0 ? Math.round((resolvedReports.length / totalReports) * 100) : 0}%** across ${totalReports} lifetime incidents\\n* **High Priority Ward:** **Sector 45 Corridor** requires immediate cold-asphalt patch dispatch.\\n\\n*(Notice: Dispatch work orders must be confirmed via the Municipal Command Center desk).*`;',
  'aiReply = `### Executive Municipal Briefing\\n\\nGreetings Officer ${userName || "Director"}.\\n\\n* **Active Hazard Backlog:** **${activeReports.length} tickets** (${criticalReports.length} Critical Priority)\\n* **Resolution Rate:** **${totalReports > 0 ? Math.round((resolvedReports.length / totalReports) * 100) : 0}%** across ${totalReports} lifetime incidents\\n\\n*(Notice: Dispatch work orders must be confirmed via the Municipal Command Center desk).*`;'
);

fs.writeFileSync('server.ts', content);
