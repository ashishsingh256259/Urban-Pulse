import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /fetch\("\/api\/notifications\/read-all", \{\s*method: "POST",\s*headers: \{ "Content-Type": "application\/json" \},\s*body: JSON\.stringify\(\{ email: currentUser\.email \}\)\s*\}\)\s*\.then\(\(\) => \{\s*setNotifications\(\(prev\) =>\s*prev\.map\(\(n\) => \(\{ \.\.\.n, read: true \}\)\)\s*\);\s*\}\)\s*\.catch\(\(err\) => console\.error\("Failed to mark notifications read:", err\)\);/g;

content = content.replace(regex, 'markAllNotificationsAsRead(notifications).catch((err) => console.error("Failed to mark notifications read:", err));');

fs.writeFileSync('src/App.tsx', content);
