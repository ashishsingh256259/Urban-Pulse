import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<span className={`font-bold uppercase ${notif.type === "alert_high_severity" ? "text-red-400" : "text-blue-400"}`}>',
  '<span className={`font-bold uppercase flex items-center gap-1 ${notif.type === "alert_high_severity" ? "text-red-400" : "text-blue-400"}`}>\n                          {notif.type === "alert_high_severity" ? <AlertTriangle className="w-2.5 h-2.5" /> : <Bell className="w-2.5 h-2.5" />}'
);

fs.writeFileSync('src/App.tsx', content);
