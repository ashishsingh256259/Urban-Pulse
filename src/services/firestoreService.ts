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

export function calculateProfileCompletion(profile?: Partial<UserProfile> | null): {
  percentage: number;
  completed: string[];
  missing: string[];
} {
  if (!profile) {
    return {
      percentage: 0,
      completed: [],
      missing: ["Name", "Email", "Phone", "City", "Profile photo", "Emergency contact"]
    };
  }

  const completed: string[] = [];
  const missing: string[] = [];

  // Core fields weighting
  if (profile.fullName || profile.name || profile.displayName) {
    completed.push("Name");
  } else {
    missing.push("Name");
  }

  if (profile.email) {
    completed.push("Email");
  } else {
    missing.push("Email");
  }

  if (profile.phoneNumber || profile.phone) {
    completed.push("Phone");
  } else {
    missing.push("Phone");
  }

  if (profile.address?.city) {
    completed.push("City");
  } else {
    missing.push("City");
  }

  if (profile.photoURL) {
    completed.push("Profile photo");
  } else {
    missing.push("Profile photo");
  }

  if (profile.emergencyContact?.name && profile.emergencyContact?.phone) {
    completed.push("Emergency contact");
  } else {
    missing.push("Emergency contact");
  }

  // Weightings: Name(20), Email(20), Phone(20), City(20), Photo(10), Emergency Contact(10)
  let score = 0;
  if (completed.includes("Name")) score += 20;
  if (completed.includes("Email")) score += 20;
  if (completed.includes("Phone")) score += 20;
  if (completed.includes("City")) score += 20;
  if (completed.includes("Profile photo")) score += 10;
  if (completed.includes("Emergency contact")) score += 10;

  return {
    percentage: Math.min(100, Math.max(0, score)),
    completed,
    missing
  };
}

export const userConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(user: UserProfile): DocumentData {
    const citizenId = user.citizenId || (user.uid ? `CIT-${user.uid.slice(0, 8).toUpperCase()}` : undefined);
    const completion = calculateProfileCompletion(user);

    return stripUndefinedDeep({
      uid: user.uid,
      id: user.id || user.uid,
      email: user.email || "",
      name: user.name || user.fullName || "Citizen",
      fullName: user.fullName || user.name || "Citizen",
      displayName: user.displayName || user.fullName || user.name || "Citizen",
      role: user.role || "citizen",
      phone: user.phone || user.phoneNumber || undefined,
      phoneNumber: user.phoneNumber || user.phone || undefined,
      photoURL: user.photoURL !== undefined ? user.photoURL : null,
      citizenId,
      dateOfBirth: user.dateOfBirth || undefined,
      gender: user.gender || undefined,
      address: user.address ? {
        house: user.address.house || undefined,
        street: user.address.street || undefined,
        city: user.address.city || undefined,
        state: user.address.state || undefined,
        pinCode: user.address.pinCode || undefined,
        landmark: user.address.landmark || undefined,
      } : undefined,
      emergencyContact: user.emergencyContact ? {
        name: user.emergencyContact.name || undefined,
        relationship: user.emergencyContact.relationship || undefined,
        phone: user.emergencyContact.phone || undefined,
      } : undefined,
      notificationPreferences: user.notificationPreferences ? {
        reportStatusUpdates: user.notificationPreferences.reportStatusUpdates ?? true,
        municipalUpdates: user.notificationPreferences.municipalUpdates ?? true,
        emergencyAlerts: user.notificationPreferences.emergencyAlerts ?? true,
      } : {
        reportStatusUpdates: true,
        municipalUpdates: true,
        emergencyAlerts: true,
      },
      profileCompleted: completion.percentage,
      status: user.status || (user.active === false ? "DEACTIVATED" : "ACTIVE"),
      active: user.active !== false && user.status !== "DEACTIVATED",
      points: user.points ?? 0,
      badges: user.badges || ["Civic Pioneer"],
      scansCount: user.scansCount ?? 0,
      reportsCount: user.reportsCount ?? 0,
      department: user.department || undefined,
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
    const citizenId = data.citizenId || `CIT-${snapshot.id.slice(0, 8).toUpperCase()}`;

    const profile: UserProfile = {
      uid: snapshot.id,
      id: snapshot.id,
      email: data.email || "",
      name: data.name || data.fullName || "Citizen",
      fullName: data.fullName || data.name || "Citizen",
      displayName: data.displayName || data.fullName || data.name || "Citizen",
      role: data.role || "citizen",
      phone: data.phone || data.phoneNumber || undefined,
      phoneNumber: data.phoneNumber || data.phone || undefined,
      photoURL: data.photoURL || null,
      citizenId,
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.gender || undefined,
      address: data.address ? {
        house: data.address.house || "",
        street: data.address.street || "",
        city: data.address.city || "",
        state: data.address.state || "",
        pinCode: data.address.pinCode || "",
        landmark: data.address.landmark || "",
      } : undefined,
      emergencyContact: data.emergencyContact ? {
        name: data.emergencyContact.name || "",
        relationship: data.emergencyContact.relationship || "",
        phone: data.emergencyContact.phone || "",
      } : undefined,
      notificationPreferences: data.notificationPreferences ? {
        reportStatusUpdates: data.notificationPreferences.reportStatusUpdates ?? true,
        municipalUpdates: data.notificationPreferences.municipalUpdates ?? true,
        emergencyAlerts: data.notificationPreferences.emergencyAlerts ?? true,
      } : {
        reportStatusUpdates: true,
        municipalUpdates: true,
        emergencyAlerts: true,
      },
      profileCompleted: typeof data.profileCompleted === "number" ? data.profileCompleted : undefined,
      status: data.status || (data.active === false ? "DEACTIVATED" : "ACTIVE"),
      active: data.active !== false && data.status !== "DEACTIVATED",
      department: data.department || undefined,
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

    if (profile.profileCompleted === undefined) {
      profile.profileCompleted = calculateProfileCompletion(profile).percentage;
    }

    return profile;
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
