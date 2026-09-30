import fs from 'fs';

let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const timeHelper = `
function getRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return \`\${diffInMinutes} min ago\`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return \`\${diffInHours} hour\${diffInHours > 1 ? 's' : ''} ago\`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  
  return \`\${diffInDays} days ago\`;
}
`;

if (!content.includes('getRelativeTime')) {
  content = content.replace('interface HeaderProps {', timeHelper + '\ninterface HeaderProps {');
}

const oldTime = `{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
const newTime = `{getRelativeTime(notif.createdAt)}`;

content = content.replace(oldTime, newTime);
fs.writeFileSync('src/components/Header.tsx', content);
