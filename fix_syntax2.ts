import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
const oldText = `  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    markAllNotificationsAsRead(notifications).catch(e => console.error(e)); // {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email })
    })
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
      })
      .catch((err) => console.error("Failed to mark notifications read:", err));
  };`;

const newText = `  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    markAllNotificationsAsRead(notifications).catch(e => console.error(e));
  };`;
content = content.replace(oldText, newText);
fs.writeFileSync('src/App.tsx', content);
