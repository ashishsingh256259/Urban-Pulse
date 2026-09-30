import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldEffect = `
  // On mount and role change, reset to correct home
  useEffect(() => {
    if (currentUser?.role === "admin") {
      setActiveSubTab("municipal-home");
    } else {
      setActiveSubTab("citizen-home");
    }
  }, [currentUser?.role]);`;

const newEffect = `
  // On mount and role change, reset to correct home
  useEffect(() => {
    if (currentUser?.role === "admin") {
      setActiveSubTab("municipal-home");
      setActiveTerminal("admin");
    } else {
      setActiveSubTab("citizen-home");
      setActiveTerminal("citizen");
    }
  }, [currentUser?.role]);`;

content = content.replace(oldEffect, newEffect);

fs.writeFileSync('src/App.tsx', content);
