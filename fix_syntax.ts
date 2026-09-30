import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/markAllNotificationsAsRead\(notifications\)\.catch\(e => console\.error\(e\)\); \/\/ \{\s+method: "POST",\s+headers: \{ "Content-Type": "application\/json" \},\s+body: JSON\.stringify\(\{ email: currentUser\.email \}\)\s+\}\)\s+\.then\(\(\) => \{\s+setNotifications\(\(prev\) =>\s+prev\.map\(\(n\) => \(\{ \.\.\.n, read: true \}\)\)\s+\);\s+\}\)\s+\.catch\(\(err\) => console\.error\("Failed to mark notifications read:", err\)\);/g, 'markAllNotificationsAsRead(notifications).catch(e => console.error(e));');
fs.writeFileSync('src/App.tsx', content);
