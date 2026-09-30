import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// Replace login fallback
content = content.replace(
  /\} else if \(signInErr\?\.code === "auth\/operation-not-allowed"[\s\S]*?throw signInErr;\n        \}/,
  '} else {\n          throw signInErr;\n        }'
);

// Replace signup fallback
content = content.replace(
  /\} catch \(err: any\) \{\n      if \(err\?\.code === "auth\/operation-not-allowed"[\s\S]*?\}\n      const formatted = formatAuthErrorMessage\(err\);/,
  '} catch (err: any) {\n      const formatted = formatAuthErrorMessage(err);'
);

// Replace Google Auth fallback
content = content.replace(
  /\} catch \(err: any\) \{\n      if \([\s\S]*?\} as any\);\n        setUserProfileState\(fallbackProfile\);\n        localStorage.setItem\("urbanpulse_active_profile", JSON.stringify\(fallbackProfile\)\);\n        return fallbackProfile;\n      \}\n      const formatted = formatAuthErrorMessage\(err\);/,
  '} catch (err: any) {\n      const formatted = formatAuthErrorMessage(err);'
);

// There's another fallback in onAuthStateChanged
content = content.replace(
  /\} catch \(err\) \{\n            \/\/ Graceful fallback session if Firestore reads fail[\s\S]*?\} as any\);\n          \}/,
  '} catch (err) {\n            console.error("Failed to load user profile:", err);\n          }'
);


fs.writeFileSync('src/context/AuthContext.tsx', content);
