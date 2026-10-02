import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where
} from "firebase/firestore";
import { db, firebaseConfig, handleFirestoreError, OperationType, stripUndefinedDeep } from "../lib/firebase";
import { User, UserRole, FieldTeamMeta, AuditLog } from "../types";
import { DEFAULT_FIELD_TEAMS } from "./fieldOperationsService";

// Pre-seeded fallback user accounts representing all 4 roles
export const SEED_USERS: User[] = [
  {
    id: "user_citizen_ananya",
    email: "ananya.citizen@urbanpulse.ai",
    fullName: "Ananya Sharma",
    role: "citizen",
    active: true,
    department: "Civilian Public",
    points: 420,
    badges: ["Civic Pioneer", "Verified Scout", "Top Reporter"],
    scansCount: 14,
    reportsCount: 8,
    createdAt: "2025-01-10T08:30:00Z"
  },
  {
    id: "user_citizen_rohit",
    email: "rohit.verma@urbanpulse.ai",
    fullName: "Rohit Verma",
    role: "citizen",
    active: true,
    department: "Civilian Public",
    points: 180,
    badges: ["Pothole Spotter"],
    scansCount: 6,
    reportsCount: 3,
    createdAt: "2025-01-15T11:00:00Z"
  },
  {
    id: "user_muni_vikram",
    email: "vikram.malhotra@urbanpulse.gov",
    fullName: "Commissioner Vikram Malhotra",
    role: "municipal",
    active: true,
    department: "Public Works & Urban Roads",
    createdAt: "2024-11-01T09:00:00Z"
  },
  {
    id: "user_muni_priya",
    email: "priya.nair@urbanpulse.gov",
    fullName: "Officer Priya Nair",
    role: "municipal",
    active: true,
    department: "Power & Streetlights Division",
    createdAt: "2024-12-05T10:15:00Z"
  },
  {
    id: "user_field_alpha",
    email: "alpha.crew@urbanpulse.ops",
    fullName: "Supervisor Vikram Singh",
    role: "field_team",
    active: true,
    teamId: "RT-014",
    teamName: "Road Maintenance Team Alpha (RT-014)",
    teamLead: "Supervisor Vikram Singh",
    department: "Civil Works & Surface Repair",
    availability: "AVAILABLE",
    createdAt: "2025-01-02T07:00:00Z"
  },
  {
    id: "user_field_beta",
    email: "beta.crew@urbanpulse.ops",
    fullName: "Chief Electrician Rajesh Rao",
    role: "field_team",
    active: true,
    teamId: "RT-022",
    teamName: "Power & Streetlight Squad Beta (RT-022)",
    teamLead: "Chief Electrician Rajesh Rao",
    department: "Electrical Utilities",
    availability: "AVAILABLE",
    createdAt: "2025-01-04T08:00:00Z"
  },
  {
    id: "user_admin_rachel",
    email: "rachel.chen@urbanpulse.gov",
    fullName: "Director Rachel Chen",
    role: "admin",
    active: true,
    department: "Municipal Digital Governance Board",
    createdAt: "2024-09-01T06:00:00Z"
  }
];

/**
 * Fetch all registered users across Citizen, Municipal, Field Team, and Admin roles
 */
export async function getAdminUsers(): Promise<User[]> {
  if (!db) return SEED_USERS;

  try {
    const q = query(collection(db, "users"), limit(100));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Auto-bootstrap seed users into Firestore if empty
      for (const u of SEED_USERS) {
        await setDoc(doc(db, "users", u.id), stripUndefinedDeep({ ...u }));
      }
      return SEED_USERS;
    }

    const firestoreUsers = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        uid: d.id,
        email: data.email || "",
        fullName: data.fullName || data.name || data.displayName || "User",
        name: data.name || data.fullName || "User",
        displayName: data.displayName || data.fullName || data.name || "User",
        role: (data.role || "citizen") as UserRole,
        active: data.active !== false && data.status !== "DEACTIVATED",
        status: data.status || (data.active !== false ? "ACTIVE" : "DEACTIVATED"),
        phone: data.phone || data.phoneNumber || "",
        phoneNumber: data.phoneNumber || data.phone || "",
        photoURL: data.photoURL || null,
        citizenId: data.citizenId || `CIT-${d.id.slice(0, 8).toUpperCase()}`,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        emergencyContact: data.emergencyContact,
        notificationPreferences: data.notificationPreferences,
        profileCompleted: data.profileCompleted,
        department: data.department || "",
        teamId: data.teamId,
        teamName: data.teamName,
        teamLead: data.teamLead,
        availability: data.availability,
        points: data.points || 0,
        badges: data.badges || [],
        scansCount: data.scansCount || 0,
        reportsCount: data.reportsCount || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      } as User;
    });

    // Merge with any seed users that might not be in Firestore yet
    const existingEmails = new Set(firestoreUsers.map(u => u.email.toLowerCase()));
    const missingSeeds = SEED_USERS.filter(s => !existingEmails.has(s.email.toLowerCase()));

    return [...firestoreUsers, ...missingSeeds];
  } catch (err) {
    console.warn("Failed to query users from Firestore, using local registry:", err);
    return SEED_USERS;
  }
}

/**
 * Activate or Deactivate a User (Admin Only)
 */
export async function toggleUserStatus(userId: string, active: boolean, adminEmail: string): Promise<void> {
  if (db) {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { active, updatedAt: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  }

  await logAdminAuditAction({
    action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    actorRole: "admin",
    actorEmail: adminEmail,
    targetId: userId,
    targetType: "user",
    details: `User ${userId} status toggled to ${active ? "ACTIVE" : "INACTIVE"}.`
  });
}

/**
 * Update User Role and Department (Admin Only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  department: string,
  adminEmail: string
): Promise<void> {
  if (db) {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: newRole,
        department: department || "",
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  }

  await logAdminAuditAction({
    action: "USER_ROLE_CHANGED",
    actorRole: "admin",
    actorEmail: adminEmail,
    targetId: userId,
    targetType: "user",
    details: `User ${userId} role changed to ${newRole} (Dept: ${department || "N/A"}).`
  });
}

/**
 * Provision and Create a New User Account in Firebase Auth & Firestore (Admin Only)
 * Uses a secondary Firebase App instance so the current Admin session is not signed out.
 */
export async function createAdminUser(userData: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  department?: string;
  active: boolean;
  teamId?: string;
  teamName?: string;
  teamLead?: string;
  availability?: "AVAILABLE" | "BUSY" | "OFFLINE";
  adminEmail?: string;
}): Promise<User> {
  const emailClean = userData.email.trim().toLowerCase();
  const nameClean = userData.fullName.trim();
  const passClean = userData.password.trim();

  if (!emailClean || !nameClean || !passClean) {
    throw new Error("Full name, email address, and password are required.");
  }

  if (passClean.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // 1. Create user in Firebase Authentication using secondary app
  const secondaryAppName = `admin-provision-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let newUid = "";
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, emailClean, passClean);
    newUid = cred.user.uid;
  } catch (authErr: any) {
    const code = authErr?.code || "";
    if (code === "auth/email-already-in-use") {
      throw new Error("An account is already registered with this email address.");
    } else if (code === "auth/invalid-email") {
      throw new Error("The email address format is invalid.");
    } else if (code === "auth/weak-password") {
      throw new Error("The password is too weak. Please use at least 6 characters.");
    } else {
      throw new Error(authErr?.message?.replace(/^Firebase:\s*/, "") || "Failed to create user in Firebase Auth.");
    }
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch {
      // Ignored
    }
  }

  // 2. Build User Object
  const newUser: User = {
    id: newUid,
    email: emailClean,
    fullName: nameClean,
    role: userData.role,
    phone: userData.phone?.trim() || undefined,
    active: userData.active,
    department: userData.department || (userData.role === "citizen" ? "Civilian Public" : ""),
    teamId: userData.teamId || undefined,
    teamName: userData.teamName || undefined,
    teamLead: userData.teamLead || undefined,
    availability: userData.availability || (userData.role === "field_team" ? "AVAILABLE" : undefined),
    points: userData.role === "citizen" ? 100 : 0,
    badges: userData.role === "citizen" ? ["Civic Pioneer"] : [],
    scansCount: 0,
    reportsCount: 0,
    createdAt: new Date().toISOString()
  };

  // 3. Save User Document to Firestore
  if (db) {
    try {
      const userRef = doc(db, "users", newUid);
      await setDoc(userRef, stripUndefinedDeep({
        ...newUser,
        name: newUser.fullName,
        uid: newUid,
        updatedAt: new Date().toISOString()
      }));
    } catch (dbErr) {
      handleFirestoreError(dbErr, OperationType.CREATE, `users/${newUid}`);
    }
  }

  return newUser;
}

/**
 * Fetch All Field Teams from Firestore or default squads
 */
export async function getPlatformTeams(): Promise<FieldTeamMeta[]> {
  if (!db) {
    return DEFAULT_FIELD_TEAMS.map(t => ({
      ...t,
      active: true,
      department: getDepartmentForCategory(t.category),
      serviceZone: t.district,
      membersCount: 4
    }));
  }

  try {
    const q = query(collection(db, "fieldTeams"), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Populate initial teams
      const initialTeams = DEFAULT_FIELD_TEAMS.map(t => ({
        ...t,
        active: true,
        department: getDepartmentForCategory(t.category),
        serviceZone: t.district,
        membersCount: 4,
        createdAt: new Date().toISOString()
      }));

      for (const team of initialTeams) {
        await setDoc(doc(db, "fieldTeams", team.id), stripUndefinedDeep({ ...team }));
      }
      return initialTeams;
    }

    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || d.id,
        lead: data.lead || "Squad Lead",
        category: data.category || "General Repair",
        district: data.district || "Central Zone",
        department: data.department || getDepartmentForCategory(data.category),
        serviceZone: data.serviceZone || data.district || "Central Zone",
        phone: data.phone || "+91 98110 00000",
        availability: data.availability || "AVAILABLE",
        activeTaskCount: data.activeTaskCount || 0,
        membersCount: data.membersCount || 4,
        active: data.active !== false
      } as FieldTeamMeta;
    });
  } catch (err) {
    console.warn("Could not fetch field teams from Firestore, fallback to defaults:", err);
    return DEFAULT_FIELD_TEAMS.map(t => ({
      ...t,
      active: true,
      department: getDepartmentForCategory(t.category),
      serviceZone: t.district,
      membersCount: 4
    }));
  }
}

/**
 * Create a New Field Team (Admin Only)
 */
export async function createPlatformTeam(
  teamData: {
    name: string;
    lead: string;
    category: string;
    district: string;
    department: string;
    phone: string;
    membersCount: number;
  },
  adminEmail: string
): Promise<FieldTeamMeta> {
  const teamId = `RT-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  const newTeam: FieldTeamMeta = {
    id: teamId,
    name: `${teamData.name} (${teamId})`,
    lead: teamData.lead,
    category: teamData.category,
    district: teamData.district,
    department: teamData.department || getDepartmentForCategory(teamData.category),
    serviceZone: teamData.district,
    phone: teamData.phone || "+91 98110 55432",
    availability: "AVAILABLE",
    activeTaskCount: 0,
    membersCount: teamData.membersCount || 4,
    active: true,
    createdAt: now
  };

  if (db) {
    try {
      await setDoc(doc(db, "fieldTeams", teamId), stripUndefinedDeep({ ...newTeam }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `fieldTeams/${teamId}`);
    }
  }

  await logAdminAuditAction({
    action: "TEAM_CREATED",
    actorRole: "admin",
    actorEmail: adminEmail,
    targetId: teamId,
    targetType: "team",
    details: `Created new field team: ${newTeam.name} assigned to ${newTeam.district}.`
  });

  return newTeam;
}

/**
 * Update Field Team Configuration (Admin Only)
 */
export async function updatePlatformTeam(
  teamId: string,
  updates: Partial<FieldTeamMeta>,
  adminEmail: string
): Promise<void> {
  if (db) {
    try {
      const teamRef = doc(db, "fieldTeams", teamId);
      await setDoc(teamRef, stripUndefinedDeep({
        ...updates,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fieldTeams/${teamId}`);
    }
  }

  await logAdminAuditAction({
    action: "TEAM_UPDATED",
    actorRole: "admin",
    actorEmail: adminEmail,
    targetId: teamId,
    targetType: "team",
    details: `Updated field team ${teamId} configuration.`
  });
}

/**
 * Toggle Field Team Active Status (Admin Only)
 */
export async function toggleTeamStatus(teamId: string, active: boolean, adminEmail: string): Promise<void> {
  if (db) {
    try {
      const teamRef = doc(db, "fieldTeams", teamId);
      await setDoc(teamRef, { active, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fieldTeams/${teamId}`);
    }
  }

  await logAdminAuditAction({
    action: active ? "TEAM_ACTIVATED" : "TEAM_DEACTIVATED",
    actorRole: "admin",
    actorEmail: adminEmail,
    targetId: teamId,
    targetType: "team",
    details: `Field team ${teamId} status toggled to ${active ? "ACTIVE" : "INACTIVE"}.`
  });
}

/**
 * Platform Audit Logging
 */
export async function logAdminAuditAction(log: Omit<AuditLog, "id" | "timestamp">): Promise<void> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  const auditEntry: AuditLog = {
    id,
    ...log,
    timestamp
  };

  if (db) {
    try {
      await setDoc(doc(db, "auditLogs", id), stripUndefinedDeep({ ...auditEntry }));
    } catch (err) {
      console.warn("Could not record audit log to Firestore:", err);
    }
  }
}

/**
 * Get Comprehensive System Audit Trail
 */
export async function getSystemAuditLogs(): Promise<AuditLog[]> {
  const fallbackLogs: AuditLog[] = [
    {
      id: "log_init_01",
      action: "PLATFORM_INITIALIZED",
      actorRole: "system",
      actorEmail: "system@urbanpulse.ai",
      details: "UrbanPulse Guardian AI Core v2.4 initialized with strict role authorization.",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: "log_init_02",
      action: "SECURITY_RULES_ACTIVE",
      actorRole: "admin",
      actorEmail: "rachel.chen@urbanpulse.gov",
      details: "Firestore role-based access rules verified. Municipal & Field Team boundaries active.",
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "log_init_03",
      action: "AI_DIAGNOSTIC_READY",
      actorRole: "system",
      actorEmail: "gemini-flash@urbanpulse.ai",
      details: "Gemini Vision & Spatial Deduplication model online. Average inference: 680ms.",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ];

  if (!db) return fallbackLogs;

  try {
    const q = query(collection(db, "auditLogs"), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) return fallbackLogs;

    const logs = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        action: data.action || "SYSTEM_EVENT",
        actorRole: data.actorRole || "system",
        actorEmail: data.actorEmail || "system@urbanpulse.ai",
        targetId: data.targetId,
        targetType: data.targetType,
        details: data.details || "",
        timestamp: data.timestamp || new Date().toISOString()
      } as AuditLog;
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.warn("Error fetching audit logs, returning fallback:", err);
    return fallbackLogs;
  }
}

export function getDepartmentForCategory(category: string): string {
  switch (category) {
    case "Pothole":
    case "Road Maintenance":
    case "Civil Works":
      return "Roads & Highway Authority (PWD)";
    case "Broken Streetlight":
    case "Electrical Utilities":
      return "Municipal Power Grid & Lighting";
    case "Garbage Overflow":
    case "Sanitation & Drainage":
      return "Solid Waste & Sanitation Department";
    case "Road Obstruction":
    case "Rapid Obstruction Response":
      return "Traffic & Emergency Obstruction Fleet";
    default:
      return "Civic Infrastructure Maintenance";
  }
}
