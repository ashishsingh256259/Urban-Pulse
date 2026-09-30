import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const handleMarkNotificationsRead = \(\) => \{[\s\S]*?\};\s+\/\/ Triggering notification clicks/m;

content = content.replace(regex, `const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    markAllNotificationsAsRead(notifications).catch(e => console.error(e));
  };
  
  // Triggering notification clicks`);

fs.writeFileSync('src/App.tsx', content);
