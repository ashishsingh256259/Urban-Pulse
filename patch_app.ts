import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '  // Sync Reports and Notifications\n  const syncOperationalDatasets = (email: string, role: string) => {\n    // Left empty deliberately if components still call it, as subscription is moved to useEffect\n  };\n\n  // Subscribe to real-time reports from Firestore\n  useEffect(() => {\n    if (!currentUser) return;\n    setLoadingReports(true);\n    const unsubscribe = subscribeToReports((fetchedReports) => {\n      setReports(fetchedReports);\n      setLoadingReports(false);\n    });\n    return () => unsubscribe();\n  }, [currentUser]);',
  '  // Subscribe to real-time reports from Firestore\n  useEffect(() => {\n    if (!currentUser) return;\n    setLoadingReports(true);\n    const unsubReports = subscribeToReports((fetchedReports) => {\n      setReports(fetchedReports);\n      setLoadingReports(false);\n    });\n    const unsubNotifs = subscribeToNotifications(currentUser.email, currentUser.role as any, (fetchedNotifs) => {\n      setNotifications(fetchedNotifs);\n    });\n    return () => {\n      unsubReports();\n      unsubNotifs();\n    };\n  }, [currentUser]);\n\n  const syncOperationalDatasets = (email: string, role: string) => {\n    // Left empty deliberately if components still call it, as subscription is moved to useEffect\n  };'
);

fs.writeFileSync('src/App.tsx', content);
