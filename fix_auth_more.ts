import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// For signup
content = content.replace(
  /try \{\n        const userCredential = await createUserWithEmailAndPassword\(auth, cleanEmail, pass\);\n        uid = userCredential\.user\.uid;\n      \} catch \(createErr: any\) \{[\s\S]*?\n      \}/,
  'const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);\n      const uid = userCredential.user.uid;'
);

content = content.replace(
  /\} catch \(err: any\) \{\n      if \(err\?\.code === "auth\/operation-not-allowed"[\s\S]*?return newProfile;\n      \}\n      const formatted = formatAuthErrorMessage\(err\);/,
  '} catch (err: any) {\n      const formatted = formatAuthErrorMessage(err);'
);

// For Google Auth
content = content.replace(
  /if \(\n        err\?\.code === "auth\/operation-not-allowed" \|\|[\s\S]*?return fallbackProfile;\n      \}/,
  ''
);

fs.writeFileSync('src/context/AuthContext.tsx', content);
