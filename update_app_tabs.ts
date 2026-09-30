import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
if (!content.includes('import CitizenHome')) {
  content = content.replace(
    'import CitizenCopilot from "./components/CitizenCopilot";',
    'import CitizenCopilot from "./components/CitizenCopilot";\nimport CitizenHome from "./components/CitizenHome";\nimport MunicipalHome from "./components/MunicipalHome";'
  );
}

// Update the type of activeSubTab
const oldActiveSubTabType = `  const [activeSubTab, setActiveSubTab] = useState<
    "command-center" | "infrastructure" | "road-scanner" | "candidate-review" | "safe-route" | "rewards" | "emergency-sos" | "copilot" | "analytics" | "digital-twin" | "safety" | "traffic" | "environmental" | "emergency"
  >("road-scanner");`;

const newActiveSubTabType = `  const [activeSubTab, setActiveSubTab] = useState<
    "citizen-home" | "municipal-home" | "command-center" | "infrastructure" | "road-scanner" | "candidate-review" | "safe-route" | "rewards" | "emergency-sos" | "copilot" | "analytics" | "digital-twin" | "safety" | "traffic" | "environmental" | "emergency"
  >("citizen-home");

  // On mount and role change, reset to correct home
  useEffect(() => {
    if (currentUser?.role === "admin") {
      setActiveSubTab("municipal-home");
    } else {
      setActiveSubTab("citizen-home");
    }
  }, [currentUser?.role]);`;

content = content.replace(oldActiveSubTabType, newActiveSubTabType);

// Now the sidebar logic
// Find the sidebarItems rendering block
const sidebarLogicOldStart = `const sidebarItems =`;
const sidebarLogicOldEnd = `              return sidebarItems.map((item) => {`;
// We will replace this entire section with the group mapping.

const sidebarGroupsReplace = `
const renderSidebar = () => {
  const citizenGroups = [
    {
      title: "HOME",
      items: [
        { id: "citizen-home", label: "Overview", desc: "Your safety dashboard", icon: LayoutDashboard }
      ]
    },
    {
      title: "SAFETY",
      items: [
        { id: "infrastructure", label: "Report Issue", desc: "Log urban hazards", icon: Activity },
        { id: "road-scanner", label: "AI Road Scanner", desc: "Dashcam hazard detection", icon: Camera },
        ...(activeScanSession && activeScanSession.candidates.length > 0 ? [{ id: "candidate-review", label: \`Review Scans (\${activeScanSession.candidates.length})\`, desc: "Review & submit", icon: ShieldCheck }] : []),
        { id: "safe-route", label: "Safe Route", desc: "Hazard-free navigation", icon: Navigation },
        { id: "emergency-sos", label: "Emergency SOS", desc: "Critical infrastructure beacon", icon: AlertTriangle },
      ]
    },
    {
      title: "MY ACTIVITY",
      items: [
        { id: "rewards", label: "Rewards", desc: \`\${userCivicPoints} Civic Points\`, icon: Award },
      ]
    },
    {
      title: "AI",
      items: [
        { id: "copilot", label: "Citizen Copilot", desc: "AI Safety Advisor", icon: Sparkles },
      ]
    }
  ];

  const municipalGroups = [
    {
      title: "OVERVIEW",
      items: [
        { id: "municipal-home", label: "Overview", desc: "City Command Dashboard", icon: LayoutDashboard },
        { id: "command-center", label: "Command Center", desc: "AI Command & Control", icon: ShieldAlert },
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        { id: "infrastructure", label: "Reports", desc: "Active Triage Desk", icon: Columns },
      ]
    },
    {
      title: "CITY INTELLIGENCE",
      items: [
        { id: "safety", label: "Map & Heatmap", desc: "GIS risk overlay maps", icon: MapPin },
        { id: "analytics", label: "Analytics", desc: "City Health & Ward standings", icon: BarChart3 },
        { id: "digital-twin", label: "Digital Twin", desc: "5-Layer vector city hologram", icon: Layers },
      ]
    },
    {
      title: "AI",
      items: [
        { id: "copilot", label: "Municipal Copilot", desc: "Fleet triage strategy", icon: Sparkles },
        // { id: "road-scanner", label: "Road Scanner Feed", desc: "Live dashcam telemetry", icon: Camera },
      ]
    }
  ];

  const activeGroups = currentUser.role === "admin" ? municipalGroups : citizenGroups;

  return (
    <div className="flex flex-col gap-6">
      {activeGroups.map((group, groupIdx) => (
        <div key={groupIdx}>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-4.5">{group.title}</div>
          <div className="flex flex-col">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSubTab(item.id as any);
                    setIsSidebarMobileOpen(false);
                  }}
                  className={\`w-full px-4.5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-150 cursor-pointer group \${
                    isActive
                      ? "bg-blue-600/10 text-white border-l-3 border-blue-500 shadow-inner"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-l-3 border-transparent"
                  }\`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={\`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105 \${
                      isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
                    }\`} />
                    <div>
                      <div className={\`text-[12px] font-semibold tracking-wide \${isActive ? "text-white animate-pulse" : "text-slate-300"}\`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5 max-w-[170px] truncate">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={\`w-3.5 h-3.5 transition-all text-slate-600 shrink-0 \${
                    isActive ? "opacity-100 translate-x-0.5 text-blue-400" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                  }\`} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
`;

// Replacing sidebar render block
const sidebarContentMatch = /\{\(\) => \{[\s\S]*?const sidebarItems =[\s\S]*?return sidebarItems\.map\(\(item\) => \{[\s\S]*?\}\);\s*\}\)\(\)\}/m;

content = content.replace(sidebarContentMatch, "{renderSidebar()}");

fs.writeFileSync('src/App.tsx', content);
