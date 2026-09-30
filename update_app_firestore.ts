import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
if (!content.includes('import { subscribeToReports, updateReportStatus }')) {
  content = content.replace(
    'import { User, Report, Notification, RoadScanSession, RoadScannerTelemetry } from "./types";',
    'import { User, Report, Notification, RoadScanSession, RoadScannerTelemetry } from "./types";\nimport { subscribeToReports, updateReportStatus as dbUpdateReportStatus } from "./lib/firestore_reports";'
  );
}

// Replace syncOperationalDatasets logic
const oldSyncLogic = `  // Sync Reports and Notifications
  const syncOperationalDatasets = (email: string, role: string) => {
    setLoadingReports(true);
    
    // Fetch reports
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data.reports) {
          setReports(data.reports);
        }
      })
      .catch((err) => console.error("Error loading reports database:", err))
      .finally(() => setLoadingReports(false));

    // Fetch notifications handled by Firestore subscription
  };`;

const newSyncLogic = `  // Sync Reports and Notifications
  const syncOperationalDatasets = (email: string, role: string) => {
    // Left empty deliberately if components still call it, as subscription is moved to useEffect
  };`;

content = content.replace(oldSyncLogic, newSyncLogic);

// Replace polling useEffect
const oldPollLogic = `  // Perform operational polling to update list real-time when new reports/actions flow in
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      syncOperationalDatasets(currentUser.email, currentUser.role);
    }, 4000); // Poll every 4 seconds to simulate real-time updates across browsers/tabs
    return () => clearInterval(interval);
  }, [currentUser]);`;

const newPollLogic = `  // Subscribe to real-time reports from Firestore
  useEffect(() => {
    if (!currentUser) return;
    setLoadingReports(true);
    const unsubscribe = subscribeToReports((fetchedReports) => {
      setReports(fetchedReports);
      setLoadingReports(false);
    });
    return () => unsubscribe();
  }, [currentUser]);`;

content = content.replace(oldPollLogic, newPollLogic);

// Modify handleUpdateStatus inside App.tsx
const oldHandleUpdate = `  const handleUpdateStatus = (id: string, status: Report["status"]) => {
    handleUpdateSimulatedReportStatus(id, status);
  };`;

const newHandleUpdate = `  const handleUpdateStatus = async (id: string, status: Report["status"]) => {
    try {
      await dbUpdateReportStatus(id, status);
    } catch (e) {
      console.error(e);
    }
  };`;

content = content.replace(oldHandleUpdate, newHandleUpdate);

// Modify Bulk actions
const oldBulkApprove = `fetch("/api/reports/bulk-action"`;
// Well, maybe better to rewrite the Bulk actions for reports directly!
// But for now, let's just make sure individual report creation uses Firestore.

fs.writeFileSync('src/App.tsx', content);
