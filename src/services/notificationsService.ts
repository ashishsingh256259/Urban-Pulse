import { handleFirestoreError, OperationType } from "../lib/firestore_errors";
import { setDoc } from "firebase/firestore";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Notification } from "../types";

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
    let notifList: Notification[] = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        recipientEmail: data.recipientEmail || "",
        recipientRole: data.recipientRole || "all",
        title: data.title || "Notification",
        message: data.message || "",
        type: data.type || "system",
        reportId: data.reportId || data.relatedReportId || data.incidentId || "SYSTEM",
        relatedReportId: data.relatedReportId || data.reportId || undefined,
        incidentId: data.incidentId || data.reportId || undefined,
        read: Boolean(data.read ?? data.read_status),
        createdAt: data.createdAt || new Date().toISOString()
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

    // Sort by createdAt descending
    notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (notifList.length > 0) {
      try {
        localStorage.setItem(`urbanpulse_cached_notifs_${userRole}_${normalizedEmail}`, JSON.stringify(notifList));
      } catch (e) {}
    }

    callback(notifList);
  }, (error) => {
    try {
      const cached = localStorage.getItem(`urbanpulse_cached_notifs_${userRole}_${normalizedEmail}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
          return;
        }
      }
    } catch (e) {}

    handleFirestoreError(error, OperationType.LIST, "notifications");
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
  recipientRole: "citizen" | "admin" | "municipal" | "all",
  recipientEmail: string = "",
  reportId: string = "SYSTEM"
): Promise<void> {
  if (!db) return;
  try {
    const notifId = `notif_${Date.now()}`;
    const notifRef = doc(db, "notifications", notifId);
    await setDoc(notifRef, {
      id: notifId,
      title,
      message,
      type,
      recipientRole,
      recipientEmail,
      reportId,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "notifications");
  }
}
