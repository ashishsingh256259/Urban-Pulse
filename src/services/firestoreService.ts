import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  FirestoreDataConverter, 
  DocumentData, 
  QueryDocumentSnapshot, 
  SnapshotOptions 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, stripUndefinedDeep } from "../lib/firebase";
import { 
  UserProfile, 
  Report, 
  RoadScan, 
  MunicipalAction, 
  Notification, 
  RewardTransaction 
} from "../types";
import { reportConverter, createReport, getReport, getCitizenReports, getMunicipalReports, updateReportStatus, deleteReport } from "./reportsService";

export { reportConverter, createReport, getReport, getCitizenReports, getMunicipalReports, updateReportStatus, deleteReport };

// ==========================================
// FIRESTORE TYPED CONVERTERS
// ==========================================

export const userConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(user: UserProfile): DocumentData {
    return stripUndefinedDeep({
      uid: user.uid,
      email: user.email || "",
      name: user.name || user.fullName || "Citizen",
      fullName: user.fullName || user.name || "Citizen",
      role: user.role || "citizen",
      points: user.points ?? 0,
      badges: user.badges || ["Civic Pioneer"],
      scansCount: user.scansCount ?? 0,
      reportsCount: user.reportsCount ?? 0,
      ...(user.teamId ? { teamId: user.teamId } : {}),
      ...(user.teamName ? { teamName: user.teamName } : {}),
      ...(user.teamLead ? { teamLead: user.teamLead } : {}),
      ...(user.availability ? { availability: user.availability } : {}),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString()
    });
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfile {
    const data = snapshot.data(options);
    return {
      uid: snapshot.id,
      email: data.email || "",
      name: data.name || data.fullName || "Citizen",
      fullName: data.fullName || data.name || "Citizen",
      role: data.role || "citizen",
      points: data.points ?? 0,
      badges: data.badges || ["Civic Pioneer"],
      scansCount: data.scansCount ?? 0,
      reportsCount: data.reportsCount ?? 0,
      teamId: data.teamId || undefined,
      teamName: data.teamName || undefined,
      teamLead: data.teamLead || undefined,
      availability: data.availability || undefined,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  }
};

// ==========================================
// USER SERVICES
// ==========================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid).withConverter(userConverter);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const cleanProfile = stripUndefinedDeep(profile);
    const userRef = doc(db, "users", profile.uid).withConverter(userConverter);
    await setDoc(userRef, cleanProfile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPoints(uid: string, deltaPoints: number): Promise<void> {
  const path = `users/${uid}`;
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return;
    const newPoints = Math.max(0, (profile.points || 0) + deltaPoints);
    await setDoc(doc(db, "users", uid), { points: newPoints, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// REPORT SERVICES
// ==========================================

export async function createReportInFirestore(report: Report): Promise<void> {
  const path = `reports/${report.id}`;
  try {
    const reportRef = doc(db, "reports", report.id).withConverter(reportConverter);
    await setDoc(reportRef, report);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getReportsFromFirestore(): Promise<Report[]> {
  const path = "reports";
  try {
    const q = query(collection(db, path).withConverter(reportConverter), orderBy("createdAt", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getReportsForUser(email: string): Promise<Report[]> {
  const path = "reports";
  try {
    const q = query(
      collection(db, path).withConverter(reportConverter),
      where("reporterEmail", "==", email),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateReportStatusInFirestore(
  reportId: string, 
  status: Report["status"], 
  assignedTo?: string | null
): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    const reportRef = doc(db, "reports", reportId);
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (assignedTo !== undefined) {
      updates.assignedTo = assignedTo;
    }
    await updateDoc(reportRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// ROAD SCAN SESSIONS
// ==========================================

export async function createRoadScanInFirestore(scan: RoadScan): Promise<void> {
  const path = `roadScans/${scan.id}`;
  try {
    await setDoc(doc(db, "roadScans", scan.id), scan);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// MUNICIPAL ACTIONS & AUDIT LOGS
// ==========================================

export async function logMunicipalActionInFirestore(action: MunicipalAction): Promise<void> {
  const path = `municipalActions/${action.id}`;
  try {
    await setDoc(doc(db, "municipalActions", action.id), action);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function createNotificationInFirestore(notification: Notification): Promise<void> {
  const path = `notifications/${notification.id}`;
  try {
    await setDoc(doc(db, "notifications", notification.id), notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getNotificationsForUser(recipientEmail: string, role: string): Promise<Notification[]> {
  const path = "notifications";
  try {
    const q = query(
      collection(db, path),
      where("recipientEmail", "in", [recipientEmail, "all"]),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// REWARDS & LEDGER
// ==========================================

export async function logRewardTransactionInFirestore(tx: RewardTransaction): Promise<void> {
  const path = `rewards/${tx.id}`;
  try {
    await setDoc(doc(db, "rewards", tx.id), tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
