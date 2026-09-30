import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

content = content.replace(
  /\} else if \(signInErr\?\.code === "auth\/operation-not-allowed" \|\| signInErr\?\.message\?\.includes\("operation-not-allowed"\)\) \{[\s\S]*?return fallbackProfile;\n        \}/,
  '} else {\n          throw signInErr;\n        }'
);

fs.writeFileSync('src/context/AuthContext.tsx', content);
