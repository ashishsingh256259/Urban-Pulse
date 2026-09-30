import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
content = content.replace(
  'import { User, Report, Notification, RoadScanCandidate, RoadScanSession } from "./types";',
  'import { User, Report, Notification, RoadScanCandidate, RoadScanSession } from "./types";\nimport { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "./services/notificationsService";'
);

// We need to manage the subscription. Let's add a useEffect for notifications in App.
// First, find the place where we manage state.
content = content.replace(
  'const [notifications, setNotifications] = useState<Notification[]>([]);',
  'const [notifications, setNotifications] = useState<Notification[]>([]);'
);

// We will comment out the fetch for notifications in syncOperationalDatasets:
content = content.replace(
  /\/\/ Fetch notifications\s+fetch\(\`\/api\/notifications\?role=\$\{role\}&email=\$\{email\}\`\)[\s\S]*?\.catch\(\(err\) => console\.error\("Error loading notification logs:", err\)\);/g,
  '// Fetch notifications handled by Firestore subscription'
);

// We will add the useEffect for subscribing to notifications.
// Near `useEffect(() => { if (userProfile?.points !== undefined) { setUserCivicPoints(userProfile.points); } }, [userProfile]);`
const useEffectToReplace = `  // Sync userCivicPoints when profile changes
  useEffect(() => {
    if (userProfile?.points !== undefined) {
      setUserCivicPoints(userProfile.points);
    }
  }, [userProfile]);`;

const replacementUseEffect = `  // Sync userCivicPoints when profile changes
  useEffect(() => {
    if (userProfile?.points !== undefined) {
      setUserCivicPoints(userProfile.points);
    }
  }, [userProfile]);

  // Real-time notifications subscription
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToNotifications(currentUser.email, currentUser.role, (newNotifs) => {
        setNotifications(newNotifs);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);`;

content = content.replace(useEffectToReplace, replacementUseEffect);

// Replace handleMarkNotificationsRead
const handleMarkReadReplace = `  // Mark notifications read
  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email })
    })
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      })
      .catch((err) => console.error("Failed to mark notifications read:", err));
  };`;

const handleMarkReadNew = `  // Mark notifications read
  const handleMarkNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsAsRead(notifications);
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };`;

content = content.replace(handleMarkReadReplace, handleMarkReadNew);

// Replace handleNotificationClick mark as read logic:
// It seems `handleNotificationClick` doesn't explicitly mark as read, but we should do it.
// Let's check `handleNotificationClick`.
fs.writeFileSync('src/App.tsx', content);
