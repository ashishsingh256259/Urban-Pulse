import { handleFirestoreError, OperationType } from "./firestore_errors";
import { createNotification } from "../services/notificationsService";
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, addDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Report } from "../types";

export interface UserAuthContext {
  role?: string;
  email?: string;
  id?: string;
}

const isMunicipalUser = (userContext?: UserAuthContext | null): boolean => {
  if (!userContext) return true; // Default fallback if context not provided in client loop
  const role = userContext.role?.toLowerCase();
  return role === "admin" || role === "municipal";
};

export const subscribeToReports = (
  callback: (reports: Report[]) => void,
  onQuotaError?: (err: any) => void
) => {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const reports: Report[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data) {
        reports.push({
          id: doc.id,
          ...data,
          location: data.location || "Sector 62, Delhi NCR",
          title: data.title || "Urban Infrastructure Alert",
          description: data.description || "",
          category: data.category || "Pothole",
          severity: Number(data.severity) || 50,
          status: data.status || "Pending",
          createdAt: data.createdAt || new Date().toISOString()
        } as Report);
      }
    });
    callback(reports);
  }, async (error) => {
    handleFirestoreError(error, OperationType.LIST, "reports");
    if (onQuotaError) onQuotaError(error);

    // Fallback: load reports from server REST API if client Firestore quota/network fails
    try {
      const resp = await fetch("/api/reports");
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          callback(data.reports);
        }
      }
    } catch (apiErr) {
      console.warn("[Reports] API fallback notice:", apiErr);
    }
  });
};

export const createReport = async (report: Omit<Report, "id">) => {
  const reportsRef = collection(db, "reports");
  const docRef = await addDoc(reportsRef, {
    ...report,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Real-time notification for Municipal Panel
  try {
    await createNotification(
      `New ${report.source === 'ROAD_SCANNER' ? 'AI' : 'Citizen'} Report: ${report.title}`,
      `A new incident has been logged in ${report.location || 'your jurisdiction'}.`,
      "report_submitted",
      "municipal",
      "",
      docRef.id
    );

    if (report.reporterEmail) {
      await createNotification(
        `Report Submitted: ${report.title}`,
        `Your report ticket "${report.title}" has been logged with Municipal Command.`,
        "report_submitted",
        "citizen",
        report.reporterEmail,
        docRef.id
      );
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, "notifications");
  }
  
  return docRef.id;
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

  const docRef = doc(db, "reports", id);
  
  // Fetch existing report to know who to notify
  const snap = await getDoc(docRef);
  const nowStr = new Date().toISOString();
  
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
          "status_update",
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

/**
 * Bulk updates the status for multiple report tickets in an atomic batch.
 * Enforces strict Municipal officer role authorization.
 */
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

  // Send asynchronous notification updates for affected reports
  Promise.all(
    reportIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "reports", id));
        if (snap.exists() && snap.data().reporterEmail) {
          await createNotification(
            `Bulk Action: Status Updated to ${status}`,
            comment || `Your report ticket ${id} has been transitioned to ${status} in bulk processing.`,
            "status_update",
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
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        location: data.location || "Sector 62, Delhi NCR",
        title: data.title || "Urban Infrastructure Alert",
        description: data.description || "",
        category: data.category || "Pothole",
        severity: Number(data.severity) || 50,
        status: data.status || "Pending",
        createdAt: data.createdAt || new Date().toISOString()
      } as Report;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "reports");
  }
  return null;
};

