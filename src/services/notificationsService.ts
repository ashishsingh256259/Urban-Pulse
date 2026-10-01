import { handleFirestoreError, OperationType } from "../lib/firestore_errors";
import { setDoc, collection, query, where, onSnapshot, doc, updateDoc, writeBatch, limit } from "firebase/firestore";
import { db, stripUndefinedDeep } from "../lib/firebase";
import { Notification } from "../types";
import { getDemoNotifications } from "./demoDataService";

const parseIsoDate = (raw: any): string => {
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

const getDeterministicFallbackTime = (index: number): string => {
  const offsets = [
    1000 * 60 * 5,   // 5 min ago
    1000 * 60 * 25,  // 25 min ago
    1000 * 60 * 90,  // 1.5 hours ago
    1000 * 60 * 180, // 3 hours ago
    1000 * 60 * 360, // 6 hours ago
    1000 * 60 * 720  // 12 hours ago
  ];
  const offset = offsets[index % offsets.length];
  return new Date(Date.now() - offset).toISOString();
};

export function subscribeToNotifications(
  userEmail: string,
  userRole: "citizen" | "admin" | "municipal" | "field_team" | "all",
  callback: (notifications: Notification[]) => void
): () => void {
  if (!db) {
    console.warn("Firestore db not initialized, cannot subscribe to notifications.");
    return () => {};
  }
  
  const normalizedEmail = (userEmail || "").trim().toLowerCase();

  let q;
  if (userRole === "citizen") {
    // CITIZEN users MUST strictly query ONLY notifications addressed to their specific email address.
    if (!normalizedEmail) {
      callback([]);
      return () => {};
    }
    q = query(
      collection(db, "notifications"), 
      where("recipientEmail", "==", normalizedEmail), 
      limit(100)
    );
  } else {
    // MUNICIPAL, ADMIN, FIELD_TEAM users
    q = query(collection(db, "notifications"), limit(200));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let notifList: Notification[] = snapshot.docs.map((d, index) => {
      const data = d.data();
      const rawTitle = data.title;
      const rawMessage = data.message || data.body || "";
      const rawType = data.type || "system";

      let derivedTitle = rawTitle;
      if (!derivedTitle || derivedTitle === "System Operational Alert" || derivedTitle === "Notification") {
        if (rawType.includes("sos") || rawType.includes("emergency") || rawMessage.toLowerCase().includes("sos")) {
          derivedTitle = "Emergency SOS Alert";
        } else if (rawType.includes("report") || rawMessage.toLowerCase().includes("report")) {
          derivedTitle = "Citizen Report Update";
        } else if (rawType.includes("task") || rawType.includes("assigned")) {
          derivedTitle = "Work Order Assignment";
        } else if (rawMessage) {
          derivedTitle = rawMessage.length > 45 ? rawMessage.substring(0, 42) + "..." : rawMessage;
        } else {
          derivedTitle = "Operational Notification";
        }
      }

      const rawDate = data.createdAt || data.timestamp;
      const parsedDate = rawDate ? parseIsoDate(rawDate) : getDeterministicFallbackTime(index);

      return {
        id: d.id,
        recipientEmail: data.recipientEmail || "",
        recipientRole: data.recipientRole || "all",
        title: derivedTitle,
        message: rawMessage || derivedTitle,
        type: rawType,
        reportId: data.reportId || data.relatedReportId || data.incidentId || "SYSTEM",
        relatedReportId: data.relatedReportId || data.reportId || undefined,
        incidentId: data.incidentId || data.reportId || undefined,
        read: Boolean(data.read ?? data.read_status),
        createdAt: parsedDate
      } as Notification;
    });

    // Strict Role and Audience Filtering
    notifList = notifList.filter(n => {
      const notifEmail = (n.recipientEmail || "").trim().toLowerCase();

      // 1. CITIZEN: Must ONLY receive notifications where recipientEmail strictly matches their email.
      if (userRole === "citizen") {
        return Boolean(normalizedEmail && notifEmail === normalizedEmail);
      }

      // 2. FIELD_TEAM: Must NOT receive initial "New Citizen Report" notifications (which are role 'admin' or 'municipal')
      if (userRole === "field_team") {
        if (n.recipientRole === "admin" || n.recipientRole === "municipal") return false;
        if (n.recipientRole === "field_team") return true;
        if (notifEmail && normalizedEmail && notifEmail === normalizedEmail) return true;
        return false;
      }

      // 3. MUNICIPAL & ADMIN: Receive municipal, admin, broadcast, and direct notifications
      if (userRole === "admin" || userRole === "municipal") {
        if (n.recipientRole === "admin" || n.recipientRole === "municipal" || n.recipientRole === "all") return true;
        if (notifEmail && normalizedEmail && notifEmail === normalizedEmail) return true;
        return false;
      }

      return false;
    });

    // Strict Deduplication by ID and stable content key
    const uniqueMap = new Map<string, Notification>();
    notifList.forEach(n => {
      const stableKey = n.id || `${n.recipientEmail}-${n.title}-${n.createdAt}`;
      if (!uniqueMap.has(stableKey)) {
        uniqueMap.set(stableKey, n);
      }
    });
    notifList = Array.from(uniqueMap.values());

    // Sort by createdAt descending
    notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    callback(notifList);
  }, async (error) => {
    handleFirestoreError(error, OperationType.LIST, "notifications");

    // Resilient Fallback: Fetch notifications from REST API if Firestore quota/network error occurs
    let apiSuccess = false;
    try {
      const resp = await fetch(`/api/notifications?email=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(userRole)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.notifications)) {
          const parsed = data.notifications.map((n: any) => ({
            ...n,
            title: n.title || "System Operational Alert",
            createdAt: parseIsoDate(n.createdAt)
          }));
          const uniqueMap = new Map<string, Notification>();
          parsed.forEach((n: Notification) => {
            const stableKey = n.id || `${n.recipientEmail}-${n.title}-${n.createdAt}`;
            if (!uniqueMap.has(stableKey)) uniqueMap.set(stableKey, n);
          });
          const deduplicated = Array.from(uniqueMap.values());
          deduplicated.sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(deduplicated);
          apiSuccess = true;
        }
      }
    } catch (apiErr) {
      console.warn("[Notifications] API fallback notice:", apiErr);
    }

    if (!apiSuccess) {
      const demoList = getDemoNotifications(userEmail, userRole);
      const uniqueMap = new Map<string, Notification>();
      demoList.forEach(n => {
        const stableKey = n.id || `${n.recipientEmail}-${n.title}-${n.createdAt}`;
        if (!uniqueMap.has(stableKey)) uniqueMap.set(stableKey, n);
      });
      callback(Array.from(uniqueMap.values()));
    }
  });

  return unsubscribe;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (!db) return;
  try {
    const notifRef = doc(db, "notifications", id);
    await setDoc(notifRef, { read: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "notifications");
  }
}

export async function markAllNotificationsAsRead(notifications: Notification[]): Promise<void> {
  const unreadList = notifications.filter(n => !n.read);
  if (unreadList.length === 0) return;

  if (!db) {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      return;
    } catch (apiErr) {
      console.warn("Backend read-all fallback error:", apiErr);
      throw apiErr;
    }
  }

  try {
    // Process in chunks of 450 to strictly respect Firestore's 500 batch limit
    for (let i = 0; i < unreadList.length; i += 450) {
      const chunk = unreadList.slice(i, i + 450);
      const batch = writeBatch(db);
      chunk.forEach(notif => {
        const notifRef = doc(db, "notifications", notif.id);
        batch.set(notifRef, { read: true }, { merge: true });
      });
      await batch.commit();
    }
    
    // Also synchronize backend in-memory cache seamlessly
    try {
      fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }).catch(() => {});
    } catch (_) {
      // Non-blocking sync
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "notifications");
    throw error;
  }
}

export async function createNotification(
  title: string,
  message: string,
  type: string,
  recipientRole: "citizen" | "admin" | "municipal" | "field_team" | "all",
  recipientEmail: string = "",
  reportId: string = "SYSTEM"
): Promise<void> {
  if (!db) return;
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const notifRef = doc(db, "notifications", notifId);
    await setDoc(notifRef, stripUndefinedDeep({
      id: notifId,
      title,
      message,
      type,
      recipientRole,
      recipientEmail,
      reportId,
      read: false,
      createdAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "notifications");
  }
}
