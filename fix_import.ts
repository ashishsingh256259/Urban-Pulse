import fs from 'fs';

let content = fs.readFileSync('src/components/CitizenEmergencySOS.tsx', 'utf8');

if (!content.includes('createNotification')) {
  content = 'import { createNotification } from "../services/notificationsService";\n' + content;
} else if (!content.includes('import { createNotification }')) {
  content = 'import { createNotification } from "../services/notificationsService";\n' + content;
}
fs.writeFileSync('src/components/CitizenEmergencySOS.tsx', content);
