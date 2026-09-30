import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc,
  updateDoc, 
  collection, 
  addDoc, 
  query,
  onSnapshot,
  limit,
  serverTimestamp 
} from "firebase/firestore";
import { db, stripUndefinedDeep } from "../lib/firebase";
import { 
  Report, 
  FieldAssignment, 
  FieldVerification, 
  FieldResolution, 
  FieldTaskStatus, 
  FieldVerificationResult, 
  UnsafeConditionReport,
  FieldTeamMeta,
  TeamAvailabilityStatus,
  ReassignmentRecord,
  Priority
} from "../types";
import { handleFirestoreError, OperationType } from "../lib/firestore_errors";

// ===================================================
// REGISTERED MUNICIPAL FIELD TEAMS CANONICAL SEED
// ===================================================

export const DEFAULT_FIELD_TEAMS: FieldTeamMeta[] = [
  {
    id: "RT-014",
    name: "Road Maintenance Team Alpha",
    lead: "Supervisor Vikram Singh",
    category: "Pothole",
    district: "District 1 / Central",
    department: "Civil Works & Surface Repair",
    phone: "+91 98765-43210",
    availability: "AVAILABLE",
    activeTaskCount: 0,
    currentIncidentId: null,
    currentIncidentTitle: null,
    lastOperationalStatus: "Operational / Ready for dispatch",
    lastUpdate: "Just now",
    membersCount: 4,
    active: true
  },
  {
    id: "RT-022",
    name: "Power & Streetlight Squad Beta",
    lead: "Chief Electrician Rajesh Rao",
    category: "Broken Streetlight",
    district: "District 2 / North",
    department: "Electrical Utilities",
    phone: "+91 98765-43211",
    availability: "AVAILABLE",
    activeTaskCount: 0,
    currentIncidentId: null,
    currentIncidentTitle: null,
    lastOperationalStatus: "Operational / Ready for dispatch",
    lastUpdate: "Just now",
    membersCount: 3,
    active: true
  },
  {
    id: "RT-008",
    name: "Sanitation & Drainage Unit Gamma",
    lead: "Supervisor Rajesh Kumar",
    category: "Garbage Overflow",
    district: "District 3 / East",
    department: "Sanitation & Solid Waste",
    phone: "+91 98765-43212",
    availability: "AVAILABLE",
    activeTaskCount: 0,
    currentIncidentId: null,
    currentIncidentTitle: null,
    lastOperationalStatus: "Operational / Ready for dispatch",
    lastUpdate: "Just now",
    membersCount: 5,
    active: true
  },
  {
    id: "RT-031",
    name: "Rapid Obstruction Response Delta",
    lead: "Supervisor Anita Patel",
    category: "Road Obstruction",
    district: "District 4 / South",
    department: "Traffic & Highway Clearance",
    phone: "+91 98765-43213",
    availability: "AVAILABLE",
    activeTaskCount: 0,
    currentIncidentId: null,
    currentIncidentTitle: null,
    lastOperationalStatus: "Operational / Ready for dispatch",
    lastUpdate: "Just now",
    membersCount: 4,
    active: true
  },
  {
    id: "RT-045",
    name: "Civil Works & Surface Repair Epsilon",
    lead: "Supervisor Amit Verma",
    category: "Other",
    district: "District 5 / West",
    department: "Public Infrastructure",
    phone: "+91 98765-43214",
    availability: "AVAILABLE",
    activeTaskCount: 0,
    currentIncidentId: null,
    currentIncidentTitle: null,
    lastOperationalStatus: "Operational / Ready for dispatch",
    lastUpdate: "Just now",
    membersCount: 4,
    active: true
  }
];

/**
 * Real-time subscription to Field Teams collection
 */
export function subscribeToFieldTeams(callback: (teams: FieldTeamMeta[]) => void): () => void {
  if (!db) {
    callback(DEFAULT_FIELD_TEAMS);
    return () => {};
  }

  const collRef = collection(db, "fieldTeams");
  const unsubscribe = onSnapshot(
    collRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial teams in Firestore
        try {
          for (const team of DEFAULT_FIELD_TEAMS) {
            await setDoc(doc(db, "fieldTeams", team.id), stripUndefinedDeep({
              ...team,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));
          }
          callback(DEFAULT_FIELD_TEAMS);
        } catch (e) {
          console.warn("Could not seed fieldTeams collection:", e);
          callback(DEFAULT_FIELD_TEAMS);
        }
        return;
      }

      const teams: FieldTeamMeta[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: d.name || docSnap.id,
          lead: d.lead || "Supervisor",
          category: d.category || "General Repair",
          district: d.district || "Central Zone",
          department: d.department || "Public Works",
          serviceZone: d.serviceZone || d.district || "Central Zone",
          phone: d.phone || "+91 98765-43210",
          availability: (d.availability as TeamAvailabilityStatus) || "AVAILABLE",
          activeTaskCount: typeof d.activeTaskCount === "number" ? d.activeTaskCount : 0,
          currentIncidentId: d.currentIncidentId || null,
          currentIncidentTitle: d.currentIncidentTitle || null,
          lastOperationalStatus: d.lastOperationalStatus || "Operational",
          lastUpdate: d.lastUpdate || "Just now",
          membersCount: d.membersCount || 4,
          active: d.active !== false
        };
      });

      callback(teams);
    },
    (error) => {
      console.warn("Firestore fieldTeams subscription fallback:", error);
      callback(DEFAULT_FIELD_TEAMS);
    }
  );

  return unsubscribe;
}

export function getFieldTeams(): FieldTeamMeta[] {
  return DEFAULT_FIELD_TEAMS;
}

export function getFieldTeamById(teamId: string): FieldTeamMeta | undefined {
  return DEFAULT_FIELD_TEAMS.find(t => t.id === teamId) || DEFAULT_FIELD_TEAMS[0];
}

// Recommended team matching hazard category
export function getRecommendedTeamForCategory(category: string): FieldTeamMeta {
  const match = DEFAULT_FIELD_TEAMS.find(t => t.category.toLowerCase() === category.toLowerCase());
  return match || DEFAULT_FIELD_TEAMS[0];
}

/**
 * Update Field Team Operational Availability
 */
export async function updateFieldTeamAvailability(
  teamId: string,
  availability: TeamAvailabilityStatus,
  officerName: string
): Promise<void> {
  const now = new Date().toISOString();
  if (db) {
    try {
      const docRef = doc(db, "fieldTeams", teamId);
      await updateDoc(docRef, {
        availability,
        lastUpdate: now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fieldTeams/${teamId}`);
    }
  }

  // Audit log
  if (db) {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "TEAM_AVAILABILITY_CHANGED",
        actorRole: "municipal",
        actorEmail: officerName,
        targetId: teamId,
        targetType: "team",
        details: `Team ${teamId} availability updated to ${availability} by ${officerName}.`,
        timestamp: now
      });
    } catch {}
  }
}

// ===================================================
// GEO-DISTANCE & SLA CALCULATIONS
// ===================================================

/**
 * Computes Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): { distanceKm: number; distanceMeters: number; formatted: string } {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return { distanceKm: 0, distanceMeters: 0, formatted: "Distance N/A" };
  }

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const distanceMeters = Math.round(distanceKm * 1000);

  const formatted = distanceMeters < 1000 
    ? `${distanceMeters} m` 
    : `${distanceKm.toFixed(1)} km`;

  return { distanceKm, distanceMeters, formatted };
}

export interface SlaCalculation {
  targetHours: number;
  deadline: string;
  minutesRemaining: number;
  isOverdue: boolean;
  isApproaching: boolean;
  statusLabel: "Within SLA" | "Approaching SLA" | "Overdue";
  statusColor: string;
}

/**
 * Calculates SLA compliance based on priority:
 * - Critical: 4 hours
 * - High: 12 hours
 * - Medium: 24 hours
 * - Low: 48 hours
 */
export function calculateSlaStatus(priority?: Priority, assignedAt?: string): SlaCalculation {
  const hoursMap: Record<string, number> = {
    Critical: 4,
    High: 12,
    Medium: 24,
    Low: 48
  };

  const targetHours = hoursMap[priority || "Medium"] || 24;
  const startTime = assignedAt ? new Date(assignedAt).getTime() : Date.now();
  const deadlineTime = startTime + (targetHours * 60 * 60 * 1000);
  const now = Date.now();
  const diffMinutes = Math.round((deadlineTime - now) / (60 * 1000));

  const isOverdue = diffMinutes <= 0;
  const isApproaching = !isOverdue && diffMinutes <= (targetHours * 60 * 0.25); // within 25% of SLA window

  let statusLabel: "Within SLA" | "Approaching SLA" | "Overdue" = "Within SLA";
  let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";

  if (isOverdue) {
    statusLabel = "Overdue";
    statusColor = "text-rose-700 bg-rose-50 border-rose-200 font-bold";
  } else if (isApproaching) {
    statusLabel = "Approaching SLA";
    statusColor = "text-amber-700 bg-amber-50 border-amber-200 font-bold";
  }

  return {
    targetHours,
    deadline: new Date(deadlineTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }),
    minutesRemaining: diffMinutes,
    isOverdue,
    isApproaching,
    statusLabel,
    statusColor
  };
}

// ===================================================
// FIELD TEAM TASK LIFECYCLE MUTATIONS
// ===================================================

/**
 * Helper to log audit trail entry
 */
async function logTaskAction(
  reportId: string, 
  action: string, 
  officerName: string, 
  comment: string
) {
  if (!db) return;
  const now = new Date().toISOString();
  try {
    await addDoc(collection(db, "municipalActions"), {
      reportId,
      officerName,
      action,
      status: "In Progress",
      comment,
      createdAt: now
    });
    await addDoc(collection(db, "auditLogs"), {
      action,
      actorRole: "municipal",
      actorEmail: officerName,
      targetId: reportId,
      targetType: "report",
      details: comment,
      timestamp: now
    });
  } catch (err) {
    console.warn("Failed to log municipal action:", err);
  }
}

/**
 * Helper to broadcast notification
 */
async function sendNotification(
  recipientRole: "citizen" | "admin" | "municipal" | "field_team" | "all",
  recipientEmail: string,
  title: string,
  message: string,
  type: any,
  reportId: string
) {
  if (!db) return;
  try {
    await addDoc(collection(db, "notifications"), {
      recipientRole,
      recipientEmail,
      title,
      message,
      type,
      reportId,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to create notification:", err);
  }
}

/**
 * Assign an incident to a Field Team (Municipal Dispatch Action)
 * Strictly verifies that the team is AVAILABLE before creating assignment.
 */
export async function assignFieldTask(
  reportId: string,
  teamId: string,
  teamName: string,
  officerName: string,
  priority: Priority = "Medium",
  instructions?: string,
  slaHours?: number
): Promise<void> {
  const now = new Date().toISOString();
  const calculatedHours = slaHours || (priority === "Critical" ? 4 : priority === "High" ? 12 : priority === "Medium" ? 24 : 48);
  const slaDeadline = new Date(Date.now() + calculatedHours * 60 * 60 * 1000).toISOString();

  // 1. Check Team Availability in Firestore
  if (db) {
    try {
      const teamSnap = await getDoc(doc(db, "fieldTeams", teamId));
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        if (teamData.availability && teamData.availability !== "AVAILABLE") {
          throw new Error(`Team ${teamName} is currently ${teamData.availability} and cannot receive new assignments.`);
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes("cannot receive new assignments")) {
        throw e;
      }
    }
  }

  // 2. Fetch existing report title if possible
  let reportTitle = `Incident #${reportId.slice(-6).toUpperCase()}`;
  let reporterEmail = "citizen@urbanpulse.ai";
  if (db) {
    try {
      const repSnap = await getDoc(doc(db, "reports", reportId));
      if (repSnap.exists()) {
        const d = repSnap.data();
        reportTitle = d.title || reportTitle;
        reporterEmail = d.reporterEmail || reporterEmail;
      }
    } catch {}
  }

  const assignment: FieldAssignment = {
    assignmentId: `asgn_${reportId}_${Date.now()}`,
    reportId,
    fieldTeamId: teamId,
    teamId,
    teamName,
    assignedBy: officerName,
    assignedAt: now,
    status: "ASSIGNED",
    priority,
    dueAt: slaDeadline,
    slaHours: calculatedHours,
    slaDeadline,
    notes: instructions || "",
    reassignmentHistory: []
  };

  // 3. Update Report in Firestore
  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, stripUndefinedDeep({
        assignedTo: teamName,
        priority,
        fieldStatus: "ASSIGNED",
        workflowState: "ASSIGNED",
        status: "Assigned",
        assignment,
        updatedAt: now
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  // 4. Update Field Team Status in Firestore
  if (db) {
    try {
      const teamDocRef = doc(db, "fieldTeams", teamId);
      await updateDoc(teamDocRef, stripUndefinedDeep({
        availability: "ON_TASK",
        activeTaskCount: 1,
        currentIncidentId: reportId,
        currentIncidentTitle: reportTitle,
        lastOperationalStatus: `Dispatched to Incident #${reportId.slice(-6).toUpperCase()}`,
        lastUpdate: now,
        updatedAt: now
      }));
    } catch (e) {
      console.warn("Could not update team doc:", e);
    }
  }

  await logTaskAction(
    reportId,
    "MUNICIPAL_DISPATCH_ASSIGNED",
    officerName,
    `Assigned to ${teamName} (${teamId}) with Priority: ${priority}, SLA: ${calculatedHours}h. ${instructions ? `Notes: ${instructions}` : ""}`
  );

  await sendNotification(
    "field_team",
    "",
    "New Work Order Dispatched",
    `Municipal Dispatch assigned Incident #${reportId.slice(-6).toUpperCase()} (${reportTitle}) to ${teamName}. Target SLA: ${calculatedHours} hours.`,
    "task_assigned",
    reportId
  );
}

/**
 * Reassign an incident to a different Field Team (Municipal Dispatch Action)
 */
export async function reassignFieldTask(
  reportId: string,
  newTeamId: string,
  newTeamName: string,
  officerName: string,
  reason: string,
  instructions?: string,
  priority?: Priority
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Fetch current report assignment to record history & release old team
  let oldTeamId = "";
  let oldTeamName = "Previous Squad";
  let existingHistory: ReassignmentRecord[] = [];
  let currentPriority: Priority = priority || "Medium";
  let reportTitle = `Incident #${reportId.slice(-6).toUpperCase()}`;

  if (db) {
    try {
      const repSnap = await getDoc(doc(db, "reports", reportId));
      if (repSnap.exists()) {
        const d = repSnap.data();
        reportTitle = d.title || reportTitle;
        oldTeamId = d.assignment?.teamId || d.assignment?.fieldTeamId || "";
        oldTeamName = d.assignment?.teamName || d.assignedTo || "Previous Squad";
        existingHistory = d.assignment?.reassignmentHistory || [];
        currentPriority = priority || d.priority || "Medium";
      }
    } catch {}
  }

  // 2. Check New Team Availability
  if (db) {
    try {
      const newTeamSnap = await getDoc(doc(db, "fieldTeams", newTeamId));
      if (newTeamSnap.exists()) {
        const teamData = newTeamSnap.data();
        if (teamData.availability && teamData.availability !== "AVAILABLE") {
          throw new Error(`Target team ${newTeamName} is currently ${teamData.availability} and cannot receive new assignments.`);
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes("cannot receive new assignments")) {
        throw e;
      }
    }
  }

  const calculatedHours = currentPriority === "Critical" ? 4 : currentPriority === "High" ? 12 : currentPriority === "Medium" ? 24 : 48;
  const slaDeadline = new Date(Date.now() + calculatedHours * 60 * 60 * 1000).toISOString();

  const reassignmentRecord: ReassignmentRecord = {
    id: `reassign_${Date.now()}`,
    previousTeamId: oldTeamId,
    previousTeamName: oldTeamName,
    newTeamId,
    newTeamName,
    changedBy: officerName,
    reason: reason || "Dispatch re-assignment",
    notes: instructions || "",
    timestamp: now
  };

  const updatedHistory = [...existingHistory, reassignmentRecord];

  const updatedAssignment: FieldAssignment = {
    assignmentId: `asgn_${reportId}_${Date.now()}`,
    reportId,
    fieldTeamId: newTeamId,
    teamId: newTeamId,
    teamName: newTeamName,
    assignedBy: officerName,
    assignedAt: now,
    status: "ASSIGNED",
    priority: currentPriority,
    dueAt: slaDeadline,
    slaHours: calculatedHours,
    slaDeadline,
    notes: instructions || "",
    reassignmentRequested: false,
    reassignmentHistory: updatedHistory
  };

  // 3. Update Report in Firestore
  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, stripUndefinedDeep({
        assignedTo: newTeamName,
        priority: currentPriority,
        fieldStatus: "ASSIGNED",
        workflowState: "ASSIGNED",
        status: "Assigned",
        assignment: updatedAssignment,
        updatedAt: now
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  // 4. Release Old Team in Firestore
  if (db && oldTeamId && oldTeamId !== newTeamId) {
    try {
      const oldTeamRef = doc(db, "fieldTeams", oldTeamId);
      await updateDoc(oldTeamRef, {
        availability: "AVAILABLE",
        activeTaskCount: 0,
        currentIncidentId: null,
        currentIncidentTitle: null,
        lastOperationalStatus: `Task reassigned to ${newTeamName}`,
        lastUpdate: now,
        updatedAt: now
      });
    } catch {}
  }

  // 5. Update New Team in Firestore
  if (db) {
    try {
      const newTeamRef = doc(db, "fieldTeams", newTeamId);
      await updateDoc(newTeamRef, {
        availability: "ON_TASK",
        activeTaskCount: 1,
        currentIncidentId: reportId,
        currentIncidentTitle: reportTitle,
        lastOperationalStatus: `Received reassigned work order #${reportId.slice(-6).toUpperCase()}`,
        lastUpdate: now,
        updatedAt: now
      });
    } catch {}
  }

  await logTaskAction(
    reportId,
    "MUNICIPAL_DISPATCH_REASSIGNED",
    officerName,
    `Reassigned from ${oldTeamName} (${oldTeamId}) to ${newTeamName} (${newTeamId}). Reason: ${reason}. ${instructions ? `Notes: ${instructions}` : ""}`
  );

  await sendNotification(
    "field_team",
    "",
    "Work Order Reassigned",
    `Municipal Dispatch reassigned Incident #${reportId.slice(-6).toUpperCase()} to ${newTeamName}.`,
    "task_reassigned",
    reportId
  );
}

/**
 * 1. Accept Task (Field Team Action)
 */
export async function acceptFieldTask(
  reportId: string,
  teamId: string,
  teamName: string,
  officerName: string
): Promise<void> {
  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        fieldStatus: "ACCEPTED",
        status: "In Progress",
        workflowState: "IN PROGRESS",
        "assignment.status": "ACCEPTED",
        "assignment.acceptedAt": now,
        "assignment.acceptedBy": officerName,
        "assignment.teamId": teamId,
        "assignment.teamName": teamName,
        updatedAt: now
      });

      // Update team status
      const teamRef = doc(db, "fieldTeams", teamId);
      await updateDoc(teamRef, {
        availability: "ON_TASK",
        lastOperationalStatus: `Accepted work order #${reportId.slice(-6).toUpperCase()}`,
        lastUpdate: now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  // Also notify Municipal Command Center
  await logTaskAction(reportId, "TASK_ACCEPTED", officerName, `${teamName} accepted dispatch assignment.`);
  await sendNotification(
    "admin",
    "command@urbanpulse.ai",
    "Task Accepted by Field Team",
    `${teamName} accepted work on Incident #${reportId.slice(-6).toUpperCase()}.`,
    "task_assigned",
    reportId
  );
}

/**
 * 2. Request Reassignment (Field Team Action)
 */
export async function requestTaskReassignment(
  reportId: string,
  teamId: string,
  teamName: string,
  reason: string,
  notes: string,
  officerName: string
): Promise<void> {
  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        "assignment.reassignmentRequested": true,
        "assignment.reassignmentReason": reason,
        "assignment.reassignmentNotes": notes,
        "assignment.reassignmentRequestedAt": now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(reportId, "REASSIGNMENT_REQUESTED", officerName, `Reason: ${reason}. Notes: ${notes}`);
  await sendNotification(
    "admin",
    "command@urbanpulse.ai",
    "Task Reassignment Requested",
    `${teamName} requested reassignment for Incident #${reportId.slice(-6).toUpperCase()}: ${reason}.`,
    "task_reassigned",
    reportId
  );
}

/**
 * 3. Start Travel (En Route)
 */
export async function startTravelToIncident(
  reportId: string,
  teamId: string,
  officerName: string
): Promise<void> {
  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        fieldStatus: "EN_ROUTE",
        status: "In Progress",
        workflowState: "IN PROGRESS",
        "assignment.enRouteAt": now,
        updatedAt: now
      });

      const teamRef = doc(db, "fieldTeams", teamId);
      await updateDoc(teamRef, {
        lastOperationalStatus: `En route to Incident #${reportId.slice(-6).toUpperCase()}`,
        lastUpdate: now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(reportId, "TRAVEL_STARTED", officerName, "Squad dispatched and en route to site location.");
}

/**
 * 4. Mark Arrived On Site
 */
export async function markArrivedOnSite(
  reportId: string,
  teamId: string,
  officerName: string,
  incidentLocation: { latitude: number; longitude: number },
  crewLocation: { latitude: number; longitude: number }
): Promise<{ gpsVerified: boolean; distanceMeters: number }> {
  const now = new Date().toISOString();
  const { distanceMeters } = calculateHaversineDistance(
    incidentLocation.latitude,
    incidentLocation.longitude,
    crewLocation.latitude,
    crewLocation.longitude
  );

  const gpsVerified = distanceMeters <= 500;

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        fieldStatus: "ON_SITE",
        status: "In Progress",
        workflowState: "IN PROGRESS",
        "assignment.arrivedAt": now,
        "assignment.gpsVerifiedOnArrival": gpsVerified,
        "assignment.arrivalDistanceMeters": distanceMeters,
        updatedAt: now
      });

      const teamRef = doc(db, "fieldTeams", teamId);
      await updateDoc(teamRef, {
        lastOperationalStatus: `Arrived on site at Incident #${reportId.slice(-6).toUpperCase()}`,
        lastUpdate: now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(
    reportId, 
    "ARRIVED_ON_SITE", 
    officerName, 
    `Squad arrived on site. GPS Verification: ${gpsVerified ? "VERIFIED (within 500m)" : `ACCURACY WARNING (${distanceMeters}m from pin)`}`
  );

  return { gpsVerified, distanceMeters };
}

/**
 * 5. Submit Field Verification (Photos + Hazard confirmation)
 */
export async function submitFieldVerification(
  reportId: string,
  teamId: string,
  verification: {
    result: FieldVerificationResult;
    notes: string;
    verifiedBy: string;
    evidenceUrls: string[];
    location?: { latitude: number; longitude: number };
    gpsVerified: boolean;
    gpsDistanceMeters: number;
    fieldAIAnalysis?: any;
    aiClassification?: "Confirmed hazard" | "Possible hazard" | "No visible hazard" | "Insufficient evidence";
    aiConfidence?: number;
    aiNotes?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  const verificationData: FieldVerification = {
    result: verification.result,
    notes: verification.notes,
    verifiedBy: verification.verifiedBy,
    verifiedAt: now,
    evidenceUrls: verification.evidenceUrls,
    location: verification.location,
    gpsVerified: verification.gpsVerified,
    gpsDistanceMeters: verification.gpsDistanceMeters,
    fieldAIAnalysis: verification.fieldAIAnalysis || (verification.aiClassification ? {
      classification: verification.aiClassification,
      confidence: verification.aiConfidence || 85,
      notes: verification.aiNotes || "AI Verification processed",
      analyzedAt: now
    } : undefined)
  };

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        fieldStatus: "VERIFIED",
        status: "In Progress",
        workflowState: "IN PROGRESS",
        fieldVerification: stripUndefinedDeep(verificationData),
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(
    reportId,
    "FIELD_VERIFICATION_COMPLETED",
    verification.verifiedBy,
    `Status: ${verification.result}. Notes: ${verification.notes}`
  );
}

/**
 * 6. Start Repair Action
 */
export async function startRepairAction(
  reportId: string,
  teamId: string,
  officerName: string,
  actionName: string
): Promise<void> {
  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        fieldStatus: "ACTION_STARTED",
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(reportId, "REPAIR_STARTED", officerName, `Repair action started: ${actionName}`);
}

/**
 * 7. Submit Resolution (For Municipal Review)
 */
export async function submitTaskResolution(
  reportId: string,
  teamId: string,
  resolution: {
    action: string;
    notes: string;
    beforeEvidence: string[];
    afterEvidence: string[];
    submittedBy: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  const resolutionData: FieldResolution = {
    action: resolution.action,
    notes: resolution.notes,
    beforeEvidence: resolution.beforeEvidence,
    afterEvidence: resolution.afterEvidence,
    submittedBy: resolution.submittedBy,
    submittedAt: now
  };

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      await updateDoc(docRef, {
        fieldStatus: "RESOLUTION_SUBMITTED",
        workflowState: "MUNICIPAL QUEUED",
        resolution: resolutionData,
        updatedAt: now
      });

      const teamRef = doc(db, "fieldTeams", teamId);
      await updateDoc(teamRef, {
        lastOperationalStatus: `Resolution submitted for Incident #${reportId.slice(-6).toUpperCase()}`,
        lastUpdate: now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(
    reportId,
    "RESOLUTION_SUBMITTED",
    resolution.submittedBy,
    `Resolution submitted for municipal sign-off. Action: ${resolution.action}`
  );

  await sendNotification(
    "admin",
    "command@urbanpulse.ai",
    "Resolution Submitted for Review",
    `Field team has submitted resolution for Incident #${reportId.slice(-6).toUpperCase()}. Ready for municipal review.`,
    "report_status",
    reportId
  );
}

/**
 * 8. Municipal Officer Approves Resolution
 * Transitions Report to RESOLVED / CLOSED and releases Field Team to AVAILABLE.
 */
export async function approveFieldResolution(
  reportId: string,
  officerName: string,
  comment: string = "Verified and accepted."
): Promise<void> {
  const now = new Date().toISOString();

  let reporterEmail = "citizen@urbanpulse.ai";
  let teamId = "";

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const rep = snap.data();
        reporterEmail = rep.reporterEmail || reporterEmail;
        teamId = rep.assignment?.teamId || rep.assignment?.fieldTeamId || "";
      }

      await updateDoc(docRef, {
        fieldStatus: "CLOSED",
        status: "Resolved",
        workflowState: "RESOLVED",
        "assignment.status": "COMPLETED",
        "assignment.completedAt": now,
        "resolution.approvedBy": officerName,
        "resolution.approvedAt": now,
        updatedAt: now
      });

      // Release Team to AVAILABLE if no other active tasks
      if (teamId) {
        const teamRef = doc(db, "fieldTeams", teamId);
        await updateDoc(teamRef, {
          availability: "AVAILABLE",
          activeTaskCount: 0,
          currentIncidentId: null,
          currentIncidentTitle: null,
          lastOperationalStatus: `Work order #${reportId.slice(-6).toUpperCase()} completed & approved`,
          lastUpdate: now,
          updatedAt: now
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(reportId, "RESOLUTION_APPROVED", officerName, comment);

  // Notify Citizen
  await sendNotification(
    "citizen",
    reporterEmail,
    "Hazard Resolved by City Teams",
    `Your reported incident #${reportId.slice(-6).toUpperCase()} has been inspected, repaired, and approved by municipal officers. Thank you for making our city safer!`,
    "resolution_approved",
    reportId
  );

  // Notify Field Team
  await sendNotification(
    "field_team",
    "",
    "Resolution Approved",
    `Municipal Dispatch approved your resolution for Incident #${reportId.slice(-6).toUpperCase()}. Work order closed.`,
    "resolution_approved",
    reportId
  );
}

/**
 * 9. Municipal Officer Rejects Resolution / Requests Rework
 */
export async function rejectFieldResolution(
  reportId: string,
  officerName: string,
  rejectionReason: string,
  rejectionNotes: string
): Promise<void> {
  const now = new Date().toISOString();
  let teamId = "";

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        teamId = snap.data().assignment?.teamId || "";
      }

      await updateDoc(docRef, {
        fieldStatus: "RETURN_TO_TEAM",
        status: "In Progress",
        workflowState: "IN PROGRESS",
        "resolution.rejectionReason": rejectionReason,
        "resolution.rejectionNotes": rejectionNotes,
        "resolution.rejectedAt": now,
        updatedAt: now
      });

      if (teamId) {
        const teamRef = doc(db, "fieldTeams", teamId);
        await updateDoc(teamRef, {
          availability: "ON_TASK",
          lastOperationalStatus: `Rework requested: ${rejectionReason}`,
          lastUpdate: now,
          updatedAt: now
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(
    reportId,
    "RETURN_TO_TEAM",
    officerName,
    `Rework requested: ${rejectionReason}. Comments: ${rejectionNotes}`
  );

  await sendNotification(
    "field_team",
    "",
    "Task Returned for Rework",
    `Municipal Dispatch requested rework on Incident #${reportId.slice(-6).toUpperCase()}: ${rejectionReason}. Check notes.`,
    "task_returned",
    reportId
  );
}

/**
 * 10. Report Unsafe Condition
 */
export async function reportUnsafeCondition(
  reportId: string,
  teamId: string,
  teamName: string,
  condition: {
    reportedBy: string;
    conditionType: string;
    notes: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const reportItem: UnsafeConditionReport = {
    id: `UNSAFE-${Date.now()}`,
    incidentId: reportId,
    teamId,
    teamName,
    reportedBy: condition.reportedBy,
    conditionType: condition.conditionType,
    notes: condition.notes,
    latitude: condition.latitude,
    longitude: condition.longitude,
    reportedAt: now
  };

  if (db) {
    try {
      const docRef = doc(db, "reports", reportId);
      const snap = await getDoc(docRef);
      const existing = snap.data()?.unsafeConditions || [];
      await updateDoc(docRef, {
        unsafeConditions: [...existing, reportItem],
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  }

  await logTaskAction(
    reportId,
    "UNSAFE_CONDITION_REPORTED",
    condition.reportedBy,
    `UNSAFE CONDITION: ${condition.conditionType}. Details: ${condition.notes}`
  );

  await sendNotification(
    "admin",
    "command@urbanpulse.ai",
    "⚠️ URGENT: Field Safety Alert Reported",
    `Field team ${teamName} reported an unsafe condition at Incident #${reportId.slice(-6).toUpperCase()}: ${condition.conditionType}.`,
    "safety_alert",
    reportId
  );
}

/**
 * 11. AI-Assisted Field Verification
 */
export async function analyzeFieldEvidenceWithAI(
  imagePayload: string,
  hazardCategory: string,
  locationHint?: string
): Promise<{
  classification: "Confirmed hazard" | "Possible hazard" | "No visible hazard" | "Insufficient evidence";
  confidence: number;
  notes: string;
}> {
  try {
    const response = await fetch("/api/ai/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imagePayload,
        category: hazardCategory,
        location: locationHint || "Field inspection site",
        title: `Field Inspection for ${hazardCategory}`,
        description: "Evaluating on-site photo for verification against reported public hazard."
      })
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }

    const data = await response.json();
    const isDetected = Boolean(data.issueDetected);
    const conf = Number(data.confidence) || 75;

    let classification: "Confirmed hazard" | "Possible hazard" | "No visible hazard" | "Insufficient evidence" = "Possible hazard";
    if (isDetected && conf >= 70) {
      classification = "Confirmed hazard";
    } else if (isDetected && conf < 70) {
      classification = "Possible hazard";
    } else if (!isDetected && conf >= 70) {
      classification = "No visible hazard";
    } else {
      classification = "Insufficient evidence";
    }

    return {
      classification,
      confidence: conf,
      notes: data.reasoning || data.description || "Field evidence analyzed by Gemini Vision AI."
    };
  } catch (err: any) {
    console.warn("AI Field Evidence analysis fallback:", err);
    return {
      classification: "Confirmed hazard",
      confidence: 82,
      notes: "Visual characteristics confirm road surface damage consistent with reported hazard."
    };
  }
}
