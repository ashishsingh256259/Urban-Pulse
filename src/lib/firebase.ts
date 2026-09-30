import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import config from "../../firebase-applet-config.json";

// Safe public client configuration with environment fallback
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId || "",
  firestoreDatabaseId: config.firestoreDatabaseId || "(default)"
};

// Canonical Single Firebase App initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Canonical Auth, Firestore, and Storage Singletons
export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const db = getFirestore(app, dbId);
export const storage = getStorage(app);

// Operation types for standard Firebase Error Handling
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized error handler adhering strictly to the Firebase Integration Skill.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errString = error instanceof Error ? error.message : String(error);
  const isQuotaError = errString.includes('Quota limit exceeded') || 
                       errString.includes('Quota exceeded') || 
                       errString.includes('resource-exhausted') || 
                       errString.includes('quota limits are reset');

  const currentAuthUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: errString,
    authInfo: {
      userId: currentAuthUser?.uid || null,
      email: currentAuthUser?.email || null,
      emailVerified: currentAuthUser?.emailVerified || null,
      isAnonymous: currentAuthUser?.isAnonymous || null,
      tenantId: currentAuthUser?.tenantId || null,
      providerInfo: currentAuthUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isQuotaError) {
    console.warn("Firestore Notice (Quota Exceeded): ", JSON.stringify(errInfo));
  } else {
    console.error("Firestore Error: ", JSON.stringify(errInfo));
  }
}

/**
 * Test connectivity to Firestore server
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes("offline") || error.message.includes("unavailable"))) {
      return false;
    }
    // Any other response (like permission denied or not found) confirms server contact
    return true;
  }
}

// Initial connection verification deferred to allow network stack startup
if (typeof window !== "undefined") {
  setTimeout(() => {
    testFirestoreConnection().catch(() => {});
  }, 1000);
}

/**
 * Recursively strips any keys whose value is undefined, ensuring Firestore
 * setDoc, updateDoc, and converter calls never fail with "Unsupported field value: undefined".
 */
export function stripUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedDeep).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefinedDeep(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}
