import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const clickOld = `  const handleNotificationClick = (notif: Notification) => {
    // Find matching report and open it
    const found = reports.find(r => r.id === notif.reportId);
    if (found) {
      setSelectedReport(found);
    }
  };`;

const clickNew = `  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      try {
        await markNotificationAsRead(notif.id);
      } catch (e) {
        console.error("Could not mark as read", e);
      }
    }
    // Find matching report and open it
    const found = reports.find(r => r.id === notif.reportId || r.id === notif.relatedReportId);
    if (found) {
      setSelectedReport(found);
    }
  };`;

content = content.replace(clickOld, clickNew);
fs.writeFileSync('src/App.tsx', content);
