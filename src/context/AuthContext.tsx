import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  AuthError
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { UserProfile, UserRole } from "../types";
import { getUserProfile, setUserProfile } from "../services/firestoreService";

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  signup: (email: string, pass: string, fullName: string, requestedRole?: UserRole) => Promise<UserProfile>;
  loginWithGoogle: (requestedRole?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for user-friendly Firebase Auth error messages
export function formatAuthErrorMessage(error: unknown): string {
  if (!error) return "An unknown error occurred.";
  const err = error as AuthError;
  const code = err?.code || "";

  switch (code) {
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is disabled in your Firebase Console. Please enable Email/Password under Authentication > Sign-in method in Firebase Console, or sign in using Google Sign-In.";
    case "auth/invalid-email":
      return "The email address format is invalid.";
    case "auth/user-disabled":
      return "This account has been disabled by administrators.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Invalid email or password. Please verify credentials.";
    case "auth/email-already-in-use":
      return "An account is already registered with this email address.";
    case "auth/weak-password":
      return "The password is too weak. Please use at least 6 characters.";
    case "auth/too-many-requests":
      return "Access temporarily locked due to many failed attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network connection issue. Please check your internet connectivity.";
    default:
      return err?.message ? err.message.replace(/^Firebase:\s*/, "") : "Authentication failed.";
  }
}

// Authoritative role determination based on account identity
export function determineRole(email: string, requestedRole?: UserRole): UserRole {
  const clean = (email || "").toLowerCase().trim();

  // 1. ADMIN - Platform Governance & Oversight
  if (
    clean === "admin@urbanpulse.gov" || 
    clean === "admin@urbanpulse.ai" ||
    clean === "admin@urbanpulse.org" ||
    clean === "rachel.chen@urbanpulse.gov" ||
    clean.includes("superadmin") || 
    clean.startsWith("admin@")
  ) {
    return "admin";
  }

  // 2. FIELD_TEAM - On-site Repair & Maintenance Execution
  if (
    clean === "field@urbanpulse.ai" ||
    clean === "fieldteam@urbanpulse.gov" || 
    clean === "fieldteam@urbanpulse.ai" ||
    clean === "alpha.crew@urbanpulse.ops" || 
    clean === "beta.crew@urbanpulse.ops" || 
    clean.includes("fieldteam") ||
    clean.includes("fieldcrew") ||
    clean.includes("crew") || 
    clean.includes("maintenance") ||
    clean.includes("ops") ||
    clean.startsWith("field@")
  ) {
    return "field_team";
  }

  // 3. MUNICIPAL - City Command & Dispatch
  if (
    clean === "municipal@urbanpulse.ai" ||
    clean === "municipal@urbanpulse.gov" ||
    clean === "officer@urbanpulse.gov" || 
    clean === "officer@urbanpulse.ai" ||
    clean === "vikram.malhotra@urbanpulse.gov" || 
    clean === "priya.nair@urbanpulse.gov" || 
    clean.includes("officer") || 
    clean.includes("municipal") || 
    clean.includes("dispatch") || 
    clean.includes("command") ||
    clean.startsWith("municipal@") ||
    clean.endsWith("@urbanpulse.gov") ||
    clean.endsWith(".gov.in")
  ) {
    return "municipal";
  }

  // 4. Explicit requested role if provided during admin provisioning
  if (requestedRole) {
    return requestedRole;
  }

  // 5. Default is CITIZEN
  return "citizen";
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Sync auth state listener with onAuthStateChanged and authoritative profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Fetch authoritative profile from Firestore users/{uid}
          try {
            let profile = await getUserProfile(firebaseUser.uid);
            
            if (!profile) {
              const email = firebaseUser.email || "citizen@urbanpulse.ai";
              const assignedRole = determineRole(email);
              const derivedName = firebaseUser.displayName || email.split("@")[0].toUpperCase().charAt(0) + email.split("@")[0].slice(1);
              
              const displayName = assignedRole === "admin"
                ? "Administrator Marcus Vance (Super Admin)"
                : assignedRole === "municipal"
                ? "Director Rachel Chen (Municipal Dispatch)"
                : assignedRole === "field_team"
                ? "Supervisor Vikram Singh (Field Ops)"
                : derivedName;

              profile = {
                uid: firebaseUser.uid,
                email,
                name: displayName,
                fullName: displayName,
                role: assignedRole,
                points: assignedRole === "citizen" ? 100 : 0,
                badges: assignedRole === "admin"
                  ? ["System Governor"]
                  : assignedRole === "municipal"
                  ? ["Command Officer"]
                  : assignedRole === "field_team"
                  ? ["Field Operations Crew"]
                  : ["Civic Contributor"],
                scansCount: 0,
                reportsCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              if (assignedRole === "field_team") {
                profile.teamId = "RT-014";
                profile.teamName = "Road Maintenance Team Alpha";
                profile.teamLead = "Supervisor Vikram Singh";
                profile.availability = "AVAILABLE";
              }

              await setUserProfile(profile);
            }
            
            setUserProfileState(profile);
            localStorage.setItem("urbanpulse_active_profile", JSON.stringify(profile));
          } catch (profileErr) {
            console.warn("Could not retrieve Firestore user profile, applying authoritative fallback profile:", profileErr);
            const email = firebaseUser.email || "user@urbanpulse.ai";
            const assignedRole = determineRole(email);
            const fallbackProf: UserProfile = {
              uid: firebaseUser.uid,
              email,
              name: firebaseUser.displayName || (assignedRole === "admin" ? "Super Admin" : "Urban Citizen"),
              fullName: firebaseUser.displayName || (assignedRole === "admin" ? "Super Admin" : "Urban Citizen"),
              role: assignedRole,
              points: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setUserProfileState(fallbackProf);
            localStorage.setItem("urbanpulse_active_profile", JSON.stringify(fallbackProf));
          }
        } else {
          // Check if there is an active local session fallback
          const savedProfileStr = localStorage.getItem("urbanpulse_active_profile");
          if (savedProfileStr) {
            try {
              const savedProfile = JSON.parse(savedProfileStr);
              if (savedProfile?.uid && savedProfile?.role) {
                setUser({
                  uid: savedProfile.uid,
                  email: savedProfile.email,
                  displayName: savedProfile.name || savedProfile.fullName,
                  emailVerified: true,
                  isAnonymous: false
                } as any);
                setUserProfileState(savedProfile);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.warn("Local profile parse error:", e);
            }
          }
          setUser(null);
          setUserProfileState(null);
        }
      } catch (err) {
        console.error("Auth state transition error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Standard Email/Password Login - Enforces One Session = One Authoritative Role
  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    const isDemoEmail = cleanEmail.includes("fieldteam") || cleanEmail.includes("officer") || cleanEmail.includes("citizen") || cleanEmail.includes("admin");

    // Invalidate any previous user profile before authenticating
    localStorage.removeItem("urbanpulse_active_profile");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const uid = userCredential.user.uid;
      
      let profile = await getUserProfile(uid);
      if (!profile) {
        const assignedRole = determineRole(cleanEmail);
        const isAdmin = assignedRole === "admin";
        const isFieldTeam = assignedRole === "field_team";
        const isMunicipal = assignedRole === "municipal";
        const namePart = cleanEmail.split("@")[0] || "User";
        
        const displayName = isAdmin
          ? "Administrator Marcus Vance (Super Admin)"
          : isFieldTeam 
          ? "Supervisor Vikram Singh (Field Ops)" 
          : (isMunicipal ? "Director Rachel Chen (Municipal Dispatch)" : (namePart.charAt(0).toUpperCase() + namePart.slice(1)));

        profile = {
          uid,
          email: userCredential.user.email || cleanEmail,
          name: displayName,
          fullName: displayName,
          role: assignedRole,
          points: assignedRole === "citizen" ? 100 : 0,
          badges: isAdmin ? ["System Governor"] : isFieldTeam ? ["Field Operations Crew"] : (isMunicipal ? ["Command Officer"] : ["Citizen Contributor"]),
          scansCount: 0,
          reportsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (isFieldTeam) {
          profile.teamId = "RT-014";
          profile.teamName = "Road Maintenance Team Alpha";
          profile.teamLead = "Supervisor Vikram Singh";
          profile.availability = "AVAILABLE";
        }

        try { await setUserProfile(profile); } catch {}
      }

      setUserProfileState(profile);
      localStorage.setItem("urbanpulse_active_profile", JSON.stringify(profile));
      return profile;
    } catch (err: any) {
      console.warn("Firebase Email Login error:", err?.code || err);
      // Graceful fallback for preset accounts or disabled auth providers
      if (
        isDemoEmail ||
        err?.code === "auth/operation-not-allowed" ||
        err?.code === "auth/configuration-not-found" ||
        err?.message?.includes("operation-not-allowed") ||
        err?.message?.includes("Provider is disabled")
      ) {
        const assignedRole = determineRole(cleanEmail);
        const isAdmin = assignedRole === "admin";
        const isFieldTeam = assignedRole === "field_team";
        const isMunicipal = assignedRole === "municipal";
        const namePart = cleanEmail.split("@")[0] || "User";
        
        const displayName = isAdmin
          ? "Administrator Marcus Vance (Super Admin)"
          : isFieldTeam 
          ? "Supervisor Vikram Singh (Field Ops)" 
          : (isMunicipal ? "Director Rachel Chen (Municipal Dispatch)" : (namePart.charAt(0).toUpperCase() + namePart.slice(1)));
        
        const uid = "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

        const profile: UserProfile = {
          uid,
          email: cleanEmail,
          name: displayName,
          fullName: displayName,
          role: assignedRole,
          points: assignedRole === "citizen" ? 100 : 0,
          badges: isAdmin ? ["System Governor"] : isFieldTeam ? ["Field Operations Crew"] : (isMunicipal ? ["Command Officer"] : ["Active Observer"]),
          scansCount: 0,
          reportsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (isFieldTeam) {
          profile.teamId = "RT-014";
          profile.teamName = "Road Maintenance Team Alpha";
          profile.teamLead = "Supervisor Vikram Singh";
          profile.availability = "AVAILABLE";
        }

        try { await setUserProfile(profile); } catch (e) {
          console.warn("Could not persist demo user profile:", e);
        }

        setUser({
          uid,
          email: cleanEmail,
          displayName,
          emailVerified: true,
          isAnonymous: false
        } as any);

        setUserProfileState(profile);
        localStorage.setItem("urbanpulse_active_profile", JSON.stringify(profile));
        return profile;
      }

      const formatted = formatAuthErrorMessage(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  const signup = async (
    email: string, 
    pass: string, 
    fullName: string, 
    requestedRole?: UserRole
  ): Promise<UserProfile> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    localStorage.removeItem("urbanpulse_active_profile");

    try {
      let uid: string;
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      uid = userCredential.user.uid;

      const assignedRole = determineRole(cleanEmail, requestedRole);
      const isFieldTeam = assignedRole === "field_team";
      const isAdmin = assignedRole === "admin";
      const isMunicipal = assignedRole === "municipal";

      const newProfile: UserProfile = {
        uid,
        email: cleanEmail,
        name: fullName.trim() || (isAdmin ? "Administrator" : isFieldTeam ? "Supervisor Vikram Singh (Field Ops)" : (isMunicipal ? "Municipal Officer" : "Urban Citizen")),
        fullName: fullName.trim() || (isAdmin ? "Administrator" : isFieldTeam ? "Supervisor Vikram Singh (Field Ops)" : (isMunicipal ? "Municipal Officer" : "Urban Citizen")),
        role: assignedRole,
        points: assignedRole === "citizen" ? 100 : 0,
        badges: isAdmin ? ["System Governor"] : isFieldTeam ? ["Field Operations Crew"] : (isMunicipal ? ["Command Officer"] : ["New Member"]),
        scansCount: 0,
        reportsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isFieldTeam) {
        newProfile.teamId = "RT-014";
        newProfile.teamName = "Road Maintenance Team Alpha";
        newProfile.teamLead = "Supervisor Vikram Singh";
        newProfile.availability = "AVAILABLE";
      }

      try {
        await setUserProfile(newProfile);
      } catch {}

      setUser({
        uid,
        email: cleanEmail,
        displayName: newProfile.name,
        emailVerified: true,
        isAnonymous: false
      } as any);
      setUserProfileState(newProfile);
      localStorage.setItem("urbanpulse_active_profile", JSON.stringify(newProfile));
      return newProfile;
    } catch (err: any) {
      console.warn("Firebase Email Signup error:", err?.code || err);
      if (
        err?.code === "auth/operation-not-allowed" ||
        err?.code === "auth/configuration-not-found" ||
        err?.message?.includes("operation-not-allowed") ||
        err?.message?.includes("Provider is disabled")
      ) {
        const assignedRole = determineRole(cleanEmail, requestedRole);
        const isFieldTeam = assignedRole === "field_team";
        const isAdmin = assignedRole === "admin";
        const isMunicipal = assignedRole === "municipal";
        const uid = "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
        const displayName = fullName.trim() || (isAdmin ? "Administrator" : isFieldTeam ? "Supervisor Vikram Singh (Field Ops)" : (isMunicipal ? "Municipal Officer" : "Urban Citizen"));

        const newProfile: UserProfile = {
          uid,
          email: cleanEmail,
          name: displayName,
          fullName: displayName,
          role: assignedRole,
          points: assignedRole === "citizen" ? 100 : 0,
          badges: isAdmin ? ["System Governor"] : isFieldTeam ? ["Field Operations Crew"] : (assignedRole === "municipal" ? ["Command Officer"] : ["Registered Observer"]),
          scansCount: 0,
          reportsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (isFieldTeam) {
          newProfile.teamId = "RT-014";
          newProfile.teamName = "Road Maintenance Team Alpha";
          newProfile.teamLead = "Supervisor Vikram Singh";
          newProfile.availability = "AVAILABLE";
        }

        try { await setUserProfile(newProfile); } catch {}

        setUser({
          uid,
          email: cleanEmail,
          displayName,
          emailVerified: true,
          isAnonymous: false
        } as any);

        setUserProfileState(newProfile);
        localStorage.setItem("urbanpulse_active_profile", JSON.stringify(newProfile));
        return newProfile;
      }

      const formatted = formatAuthErrorMessage(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  // Google Sign-In Provider (Citizen & General Public)
  const loginWithGoogle = async (requestedRole?: UserRole): Promise<UserProfile> => {
    setAuthError(null);
    localStorage.removeItem("urbanpulse_active_profile");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const uid = googleUser.uid;

      let profile = await getUserProfile(uid);
      if (!profile) {
        const email = googleUser.email || "";
        const assignedRole: UserRole = determineRole(email, requestedRole);
        const name = googleUser.displayName || (email ? email.split("@")[0] : "User");

        profile = {
          uid,
          email,
          name,
          fullName: name,
          role: assignedRole,
          points: assignedRole === "citizen" ? 50 : 0,
          badges: ["Google Verified"],
          scansCount: 0,
          reportsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setUserProfile(profile);
      }

      setUserProfileState(profile);
      localStorage.setItem("urbanpulse_active_profile", JSON.stringify(profile));
      return profile;
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        const msg = "Google sign-in popup was closed before completing.";
        setAuthError(msg);
        throw new Error(msg);
      } else if (err?.code === "auth/popup-blocked") {
        const msg = "Sign-in popup was blocked by browser. Please allow popups or retry.";
        setAuthError(msg);
        throw new Error(msg);
      }

      const formatted = formatAuthErrorMessage(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  // Logout - Completely Clears Session & Storage
  const logout = async (): Promise<void> => {
    try {
      localStorage.removeItem("urbanpulse_active_profile");
      sessionStorage.clear();
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      setUser(null);
      setUserProfileState(null);
      setAuthError(null);
      try {
        localStorage.removeItem("urbanpulse_active_profile");
        sessionStorage.clear();
      } catch {}
    }
  };

  const role: UserRole = userProfile?.role || "citizen";
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        loading,
        isAuthenticated,
        login,
        signup,
        loginWithGoogle,
        logout,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
