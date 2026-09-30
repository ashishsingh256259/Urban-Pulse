import { handleFirestoreError, OperationType } from "./firestore_errors";
import { createNotification } from "../services/notificationsService";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, addDoc, writeBatch } from "firebase/firestore";
import { db, stripUndefinedDeep } from "./firebase";
import { Report } from "../types";
import { DEMO_REPORTS, setDemoModeActive, isDemoModeActive } from "../services/demoDataService";

export interface UserAuthContext {
  role?: string;
  email?: string;
  id?: string;
}

const isMunicipalUser = (userContext?: UserAuthContext | null): boolean => {
  if (!userContext) return true;
  const role = userContext.role?.toLowerCase();
  return role === "admin" || role === "municipal";
};

// Helper to safely parse Firestore timestamp or string to ISO string
export const parseIsoDate = (raw: any): string => {
  if (!raw) return new Date().toISOString();
  if (typeof raw === "string") return raw;
  if (typeof raw.toDate === "function") {
    try { return raw.toDate().toISOString(); } catch {}
  }
  if (typeof raw.seconds === "number") {
    try { return new Date(raw.seconds * 1000).toISOString(); } catch {}
  }
  if (raw instanceof Date) return raw.toISOString();
  return new Date().toISOString();
};

export const normalizeReportDoc = (id: string, data: any): Report => {
  const severity = Number(data.severity ?? 50);
  const riskLevel = data.riskLevel || (severity >= 75 ? "High" : severity >= 45 ? "Medium" : "Low");
  const priority = data.priority || (severity >= 80 ? "Critical" : severity >= 65 ? "High" : severity >= 40 ? "Medium" : "Low");
  const isSos = Boolean(data.isSos) || 
    (typeof data.title === "string" && data.title.toUpperCase().includes("SOS")) || 
    (typeof data.description === "string" && data.description.toUpperCase().includes("SOS")) || 
    Boolean(data.emergencyType);

  return {
    id,
    userId: data.userId || "",
    title: data.title || "Urban Infrastructure Alert",
    description: data.description || "",
    category: data.category || data.issueType || "Pothole",
    issueType: data.issueType || data.category || "Pothole",
    severity: severity,
    riskLevel: riskLevel,
    priority: priority,
    confidence: Number(data.confidence ?? 85),
    status: data.status || "Pending",
    location: data.location || "Sector 62, Delhi NCR",
    latitude: typeof data.latitude === "number" && !isNaN(data.latitude) ? data.latitude : 28.6139,
    longitude: typeof data.longitude === "number" && !isNaN(data.longitude) ? data.longitude : 77.2090,
    image: data.image || data.evidenceUrl || null,
    evidenceUrl: data.evidenceUrl || data.image || null,
    reporterEmail: data.reporterEmail || "citizen@urbanpulse.ai",
    reporterName: data.reporterName || "Citizen Reporter",
    assignedTo: data.assignedTo || null,
    source: data.source || "MANUAL_REPORT",
    roadScanId: data.roadScanId || undefined,
    clusterCount: Number(data.clusterCount ?? 1),
    evidenceFrames: Array.isArray(data.evidenceFrames) ? data.evidenceFrames : [],
    fieldStatus: data.fieldStatus,
    assignment: data.assignment,
    fieldVerification: data.fieldVerification,
    resolution: data.resolution,
    unsafeConditions: data.unsafeConditions,
    workflowState: data.workflowState,
    sourceCamera: data.sourceCamera,
    boundingBox: data.boundingBox,
    isSos: isSos,
    emergencyType: data.emergencyType || undefined,
    rejectionReason: data.rejectionReason,
    rejectionNote: data.rejectionNote,
    rejectedAt: data.rejectedAt ? parseIsoDate(data.rejectedAt) : undefined,
    rejectedBy: data.rejectedBy,
    rejectedByRole: data.rejectedByRole,
    createdAt: parseIsoDate(data.createdAt),
    updatedAt: parseIsoDate(data.updatedAt || data.createdAt),
    aiAnalysis: data.aiAnalysis || null
  };
};

// Initial Seed Dataset to ensure persistent database initialization
export const INITIAL_CANONICAL_REPORTS: Report[] = [
  {
    id: "REP-9021",
    userId: "user_cit_01",
    title: "Deep Asphalt Pothole on Sector 45 Arterial Road",
    description: "Large 12-inch crater causing vehicular slowdowns and rim damage near Sector 45 transit corridor.",
    category: "Pothole",
    issueType: "Pothole",
    severity: 88,
    riskLevel: "High",
    priority: "Critical",
    confidence: 94,
    status: "Pending",
    location: "Sector 45, Gurugram Corridor",
    latitude: 28.4595,
    longitude: 77.0725,
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "ananya.citizen@urbanpulse.ai",
    reporterName: "Ananya Sharma",
    assignedTo: null,
    source: "MANUAL_REPORT",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    aiAnalysis: {
      category: "Pothole",
      severityScore: 88,
      riskLevel: "High",
      confidence: 94,
      description: "Severe asphalt cavity exceeding structural safety threshold. High puncture and rim compromise hazard.",
      recommendedActions: [
        "Deploy rapid cold-asphalt infill unit",
        "Erect high-visibility hazard bollards",
        "Inspect sub-base moisture drainage"
      ]
    }
  },
  {
    id: "REP-9022",
    userId: "user_cit_02",
    title: "Broken Streetlight Luminaire near Saket Metro",
    description: "Dark luminaire pole creating unsafe pedestrian walkway and dead-zone visibility.",
    category: "Broken Streetlight",
    issueType: "Broken Streetlight",
    severity: 68,
    riskLevel: "Medium",
    priority: "High",
    confidence: 91,
    status: "In Progress",
    location: "Saket District Metro Gate 2",
    latitude: 28.5244,
    longitude: 77.2066,
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "rohit.verma@urbanpulse.ai",
    reporterName: "Rohit Verma",
    assignedTo: "Power & Streetlight Squad Beta (RT-022)",
    source: "MANUAL_REPORT",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    aiAnalysis: {
      category: "Broken Streetlight",
      severityScore: 68,
      riskLevel: "Medium",
      confidence: 91,
      description: "Lighting grid blackout registered. Decreases night visibility and elevates pedestrian vulnerability index.",
      recommendedActions: [
        "Test transformer photocell junction",
        "Deploy bucket lift for high-efficiency LED fixture replacement",
        "Verify junction fuse continuity"
      ]
    }
  },
  {
    id: "REP-9023",
    userId: "user_cit_03",
    title: "Commercial Waste Overflow on Pedestrian Walkway",
    description: "Excessive solid waste blocking sidewalk and attracting strays near commercial market.",
    category: "Garbage Overflow",
    issueType: "Garbage Overflow",
    severity: 62,
    riskLevel: "Medium",
    priority: "Medium",
    confidence: 89,
    status: "Assigned",
    location: "Connaught Place Inner Circle",
    latitude: 28.6315,
    longitude: 77.2167,
    image: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "ananya.citizen@urbanpulse.ai",
    reporterName: "Ananya Sharma",
    assignedTo: "Sanitation Compactor Team B",
    source: "MANUAL_REPORT",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    aiAnalysis: {
      category: "Garbage Overflow",
      severityScore: 62,
      riskLevel: "Medium",
      confidence: 89,
      description: "Public bin containment breached. Organic and plastic debris encroaching on right-of-way.",
      recommendedActions: [
        "Route municipal compactor vehicle",
        "Pressure clean sidewalk pavement",
        "Issue store management waste advisory"
      ]
    }
  },
  {
    id: "REP-9024",
    userId: "user_scanner_01",
    title: "AI Dashcam Detected: Road Surface Fissure Cluster",
    description: "Automated road scanner identified longitudinal cracking along outer expressway lane.",
    category: "Pothole",
    issueType: "Pothole",
    severity: 76,
    riskLevel: "High",
    priority: "High",
    confidence: 92,
    status: "Pending",
    location: "NH-48 Corridor Westbound",
    latitude: 28.4900,
    longitude: 77.0850,
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "scanner@urbanpulse.ai",
    reporterName: "AI Road Vision Fleet #108",
    assignedTo: null,
    source: "ROAD_SCANNER",
    roadScanId: "scan_seed_01",
    clusterCount: 3,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    aiAnalysis: {
      category: "Pothole",
      severityScore: 76,
      riskLevel: "High",
      confidence: 92,
      description: "Multiple structural fatigue cracks detected along wheelpath. Surface deterioration imminent under heavy axle traffic.",
      recommendedActions: [
        "Schedule preventative bituminous sealing",
        "Monitor with follow-up telemetry scan in 48h",
        "Notify highway maintenance authority"
      ]
    }
  },
  {
    id: "REP-9025",
    userId: "user_cit_04",
    title: "Fallen Tree Branch Obstructing Transit Lane",
    description: "Heavy branch blocking left traffic lane near flyover ramp, requiring urgent clearance.",
    category: "Road Obstruction",
    issueType: "Road Obstruction",
    severity: 74,
    riskLevel: "High",
    priority: "High",
    confidence: 95,
    status: "Resolved",
    location: "Ring Road near Lajpat Nagar Flyover",
    latitude: 28.5700,
    longitude: 77.2400,
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "citizen@urbanpulse.ai",
    reporterName: "Pooja Gupta",
    assignedTo: "Road Maintenance Team Alpha (RT-014)",
    source: "MANUAL_REPORT",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    aiAnalysis: {
      category: "Road Obstruction",
      severityScore: 74,
      riskLevel: "High",
      confidence: 95,
      description: "Vegetation debris impeding vehicular flow and causing bottleneck.",
      recommendedActions: [
        "Deploy municipal chainsaw and loader squad",
        "Clear lane obstruction and sweep road surface"
      ]
    }
  }
];

export const subscribeToReports = (
  callback: (reports: Report[]) => void,
  onQuotaError?: (err: any) => void
) => {
  if (!db) {
    console.warn("Firestore db instance is unavailable. Activating centralized demo fallback.");
    setDemoModeActive(true);
    callback(DEMO_REPORTS);
    return () => {};
  }

  const reportsCol = collection(db, "reports");

  return onSnapshot(reportsCol, (snapshot) => {
    // Firebase request succeeded -> Use REAL FIRESTORE DATA
    setDemoModeActive(false);

    const reportsList: Report[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        reportsList.push(normalizeReportDoc(docSnap.id, data));
      }
    });

    // Chronological sorting (latest first)
    reportsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(reportsList);
  }, async (error) => {
    handleFirestoreError(error, OperationType.LIST, "reports");
    if (onQuotaError) onQuotaError(error);

    // Resilient REST API fallback check
    let apiSucceeded = false;
    try {
      const resp = await fetch("/api/reports");
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.reports)) {
          const normalized = data.reports.map((r: any) => normalizeReportDoc(r.id, r));
          normalized.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setDemoModeActive(false);
          callback(normalized);
          apiSucceeded = true;
        }
      }
    } catch (apiErr) {
      console.warn("[Reports] API fallback notice:", apiErr);
    }

    // If both Firestore and API fallback fail -> Use centralized DEMO DATA
    if (!apiSucceeded) {
      console.info("[Reports] Live data unreachable. Activating centralized 10-report DEMO DATA fallback.");
      setDemoModeActive(true);
      callback(DEMO_REPORTS);
    }
  });
};

export const createReport = async (report: Omit<Report, "id"> & { id?: string }) => {
  const reportId = report.id || `REP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();
  const canonicalDoc = stripUndefinedDeep({
    ...report,
    id: reportId,
    createdAt: report.createdAt || now,
    updatedAt: report.updatedAt || now,
  });

  const reportRef = doc(db, "reports", reportId);
  await setDoc(reportRef, canonicalDoc);

  // Send real-time notifications
  try {
    await createNotification(
      `New ${report.source === 'ROAD_SCANNER' ? 'AI' : 'Citizen'} Report: ${report.title}`,
      `A new incident has been logged in ${report.location || 'your jurisdiction'}.`,
      "report_submitted",
      "municipal",
      "",
      reportId
    );

    if (report.reporterEmail) {
      await createNotification(
        `Report Submitted: ${report.title}`,
        `Your report ticket "${report.title}" has been logged with Municipal Command.`,
        "report_submitted",
        "citizen",
        report.reporterEmail,
        reportId
      );
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, "notifications");
  }

  return reportId;
};

export const updateReportStatus = async (
  id: string, 
  status: string, 
  comment?: string,
  userContext?: UserAuthContext | null
) => {
  if (userContext && !isMunicipalUser(userContext)) {
    throw new Error("Unauthorized: Only authenticated Municipal officers can perform status updates.");
  }

  const nowStr = new Date().toISOString();

  // Support demo mode directly to avoid calling undefined Firestore when offline/demo is active
  if (!db || isDemoModeActive()) {
    const rep = DEMO_REPORTS.find(r => r.id === id);
    if (rep) {
      rep.status = status as any;
      rep.updatedAt = nowStr;
      
      // Send demo notifications safely
      if (rep.reporterEmail) {
        try {
          await createNotification(
            `Report Status Updated to ${status}`,
            comment || `Your report "${rep.title}" has been updated by the Municipal Command Center.`,
            "report_submitted",
            "citizen",
            rep.reporterEmail,
            id
          );
        } catch (e) {
          console.warn("Failed to create demo status notification:", e);
        }
      }
    }
    return;
  }

  const docRef = doc(db, "reports", id);
  const snap = await getDoc(docRef);

  await updateDoc(docRef, {
    status,
    updatedAt: nowStr,
  });

  if (snap.exists()) {
    const data = snap.data();
    if (data.reporterEmail) {
      try {
        await createNotification(
          `Report Status Updated to ${status}`,
          comment || `Your report "${data.title}" has been updated by the Municipal Command Center.`,
          "report_submitted",
          "citizen",
          data.reporterEmail,
          id
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "notifications");
      }
    }
  }
};

export const bulkUpdateReportStatus = async (
  reportIds: string[],
  status: string,
  comment?: string,
  userContext?: UserAuthContext | null
): Promise<void> => {
  if (userContext && !isMunicipalUser(userContext)) {
    throw new Error("Unauthorized: Only authenticated Municipal officers can perform bulk status updates.");
  }

  if (!reportIds || reportIds.length === 0) return;

  const batch = writeBatch(db);
  const nowStr = new Date().toISOString();

  for (const id of reportIds) {
    const reportRef = doc(db, "reports", id);
    batch.update(reportRef, {
      status,
      updatedAt: nowStr
    });
  }

  await batch.commit();

  Promise.all(
    reportIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "reports", id));
        if (snap.exists() && snap.data().reporterEmail) {
          await createNotification(
            `Bulk Action: Status Updated to ${status}`,
            comment || `Your report ticket ${id} has been transitioned to ${status} in bulk processing.`,
            "report_submitted",
            "citizen",
            snap.data().reporterEmail,
            id
          );
        }
      } catch (e) {
        console.warn(`Bulk notification error for ${id}:`, e);
      }
    })
  ).catch(err => console.warn("Bulk notification promise error:", err));
};

export const deleteReport = async (
  id: string,
  userContext?: UserAuthContext | null
) => {
  if (userContext && !isMunicipalUser(userContext)) {
    throw new Error("Unauthorized: Only authenticated Municipal officers can delete reports.");
  }

  const docRef = doc(db, "reports", id);
  await deleteDoc(docRef);
};

export const getReportById = async (id: string): Promise<Report | null> => {
  if (!db || !id) return null;
  try {
    const docRef = doc(db, "reports", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeReportDoc(snap.id, snap.data());
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "reports");
  }
  return null;
};

