import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldSimulate = `  const handleAddSimulatedReport = (newReport: Report) => {
    setReports((prev) => {
      if (prev.some((r) => r.id === newReport.id)) return prev;
      return [newReport, ...prev];
    });
    setSelectedReport(newReport);
    fetch("/api/reports/create-direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReport),
    })
      .then(() => {
        if (currentUser) {
          syncOperationalDatasets(currentUser.email, currentUser.role);
        }
      })
      .catch((err) => console.error("Could not sync simulated report to database:", err));
  };`;

const newSimulate = `  const handleAddSimulatedReport = async (newReport: Report) => {
    setSelectedReport(newReport);
    try {
      await createReport(newReport);
    } catch(err) {
      console.error("Could not sync simulated report to database:", err);
    }
  };`;

content = content.replace(oldSimulate, newSimulate);

if (!content.includes('import { createReport }')) {
  content = content.replace(
    'import { subscribeToReports, updateReportStatus as dbUpdateReportStatus, deleteReport } from "./lib/firestore_reports";',
    'import { subscribeToReports, updateReportStatus as dbUpdateReportStatus, deleteReport, createReport } from "./lib/firestore_reports";'
  );
}

fs.writeFileSync('src/App.tsx', content);
