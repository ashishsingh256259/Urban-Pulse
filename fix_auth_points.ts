import fs from 'fs';
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

content = content.replace(/points: (assignedRole === "citizen" \? 450 : 0|defaultRole === "citizen" \? 450 : 0|assignedRole === "citizen" \? 100 : 0)/g, 'points: 0');
content = content.replace(/badges: (\["Civic Pioneer", "Verified Google Node"\]|\["New Observer"\])/g, 'badges: []');
content = content.replace(/badges: defaultRole === "municipal" \? \["Command Officer", "Municipal Admin"\] : \["Civic Pioneer"\]/g, 'badges: defaultRole === "municipal" ? ["Command Officer"] : []');
content = content.replace(/badges: assignedRole === "municipal" \? \["Command Officer", "Municipal Admin"\] : \["New Observer"\]/g, 'badges: assignedRole === "municipal" ? ["Command Officer"] : []');

fs.writeFileSync('src/context/AuthContext.tsx', content);
