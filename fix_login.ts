import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const oldLogin = content.substring(content.indexOf('const login = async'), content.indexOf('const signup = async'));
const newLogin = `  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const uid = userCredential.user.uid;
      
      let profile = await getUserProfile(uid);
      if (!profile) {
        const isMunicipalEmail = cleanEmail.toLowerCase().includes("officer") || 
                                 cleanEmail.toLowerCase().includes("admin") || 
                                 cleanEmail.toLowerCase().includes("municipal") ||
                                 cleanEmail.toLowerCase().endsWith("@urbanpulse.gov");
        const defaultRole: UserRole = isMunicipalEmail ? "municipal" : "citizen";
        const name = cleanEmail.split("@")[0].charAt(0).toUpperCase() + cleanEmail.split("@")[0].slice(1);
        profile = {
          uid,
          email: userCredential.user.email || cleanEmail,
          name: defaultRole === "municipal" ? "Director Rachel Chen (Admin)" : name,
          fullName: defaultRole === "municipal" ? "Director Rachel Chen (Admin)" : name,
          role: defaultRole,
          points: 0,
          badges: defaultRole === "municipal" ? ["Command Officer"] : [],
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
      const formatted = formatAuthErrorMessage(err);
      setAuthError(formatted);
      throw new Error(formatted);
    }
  };

  `;

content = content.replace(oldLogin, newLogin);
fs.writeFileSync('src/context/AuthContext.tsx', content);
