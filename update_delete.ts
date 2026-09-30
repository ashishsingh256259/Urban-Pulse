import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('deleteReport')) {
  content = content.replace(
    'import { subscribeToReports, updateReportStatus as dbUpdateReportStatus }',
    'import { subscribeToReports, updateReportStatus as dbUpdateReportStatus, deleteReport }'
  );
}

const oldDelete = `    try {
      const res = await fetch("/api/reports/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
        if (selectedReport?.id === id) setSelectedReport(null);
      }
    } catch (e) {
      console.error(e);
    }`;

const newDelete = `    try {
      await deleteReport(id);
      if (selectedReport?.id === id) setSelectedReport(null);
    } catch (e) {
      console.error(e);
    }`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync('src/App.tsx', content);
