import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldSidebarLogic = `{(() => {
              const sidebarItems = currentUser.role === "admin"
                ? [
                    { id: "command-center", label: "AI City Command Center", desc: "Sovereign operations hub", icon: LayoutDashboard },
                    { id: "infrastructure", label: "Municipality Dashboard", desc: "Active Triage Desk", icon: Columns },
                    { id: "copilot", label: "Municipal Decision Copilot", desc: "Fleet triage & dispatch strategy", icon: Sparkles },
                    { id: "analytics", label: "Executive Analytics", desc: "City Health & Ward standings", icon: BarChart3 },
                    { id: "road-scanner", label: "Road Scanner Terminal", desc: "Dashcam stream & telemetry", icon: Camera },
                    { id: "digital-twin", label: "Smart City Digital Twin", desc: "5-Layer vector city hologram", icon: Layers },
                    { id: "safety", label: "Urban Heatmap Grid", desc: "GIS risk overlay maps", icon: MapPin },
                    { id: "traffic", label: "Smart Traffic Control", desc: "Dynamic lane controls & speeds", icon: Compass },
                    { id: "environmental", label: "Smog & Pollution Control", desc: "Live AQI & filtration grid", icon: Wind },
                    { id: "emergency", label: "Emergency Response Hub", desc: "Active paramedics & bypasses", icon: AlertOctagon },
                  ]
                : [
                    { id: "copilot", label: "Citizen Safety Copilot", desc: "AI neighborhood safety advisor", icon: Sparkles },
                    { id: "safe-route", label: "Safe Route Navigator", desc: "Hazard-free GPS routing", icon: Navigation },
                    { id: "road-scanner", label: "AI Road Scanner", desc: "Live dashcam vision scan", icon: Camera },
                    ...(activeScanSession && activeScanSession.candidates.length > 0 ? [{ id: "candidate-review", label: \`Candidate Review (\${activeScanSession.candidates.length})\`, desc: "Review & batch submit", icon: ShieldCheck }] : []),
                    { id: "infrastructure", label: "Manual Citizen Report", desc: "Log & track local issues", icon: Activity },
                    { id: "rewards", label: "Civic Rewards & Perks", desc: \`\${userCivicPoints} Civic Points available\`, icon: Award },
                    { id: "emergency-sos", label: "Emergency SOS Beacon", desc: "One-tap rapid response", icon: AlertTriangle },
                    { id: "digital-twin", label: "Smart City Digital Twin", desc: "5-Layer vector city hologram", icon: Layers },
                    { id: "safety", label: "Global Safety Grid", desc: "Local hotspot overlays", icon: MapPin },
                    { id: "traffic", label: "Smart Traffic Node", desc: "Road speeds & obstructions", icon: Compass },
                    { id: "environmental", label: "Environmental Health", desc: "Live AQI & smog metrics", icon: Wind },
                  ];

              return sidebarItems.map((item) => {
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
              });
            })()}`;

const newSidebarLogic = `{(() => {
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
        { id: "road-scanner", label: "Road Scanner Feed", desc: "Live dashcam telemetry", icon: Camera },
      ]
    }
  ];

  const activeGroups = currentUser.role === "admin" ? municipalGroups : citizenGroups;

  return (
    <div className="flex flex-col gap-5">
      {activeGroups.map((group, groupIdx) => (
        <div key={groupIdx}>
          <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 px-4">{group.title}</div>
          <div className="flex flex-col gap-1">
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
                  className={\`w-full px-4 py-2.5 rounded-xl flex items-center justify-between text-left transition-all duration-150 cursor-pointer group \${
                    isActive
                      ? "bg-blue-600/10 text-white border-l-3 border-blue-500 shadow-inner"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-l-3 border-transparent"
                  }\`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={\`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 \${
                      isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
                    }\`} />
                    <div>
                      <div className={\`text-[11.5px] font-bold tracking-wide \${isActive ? "text-white animate-pulse" : "text-slate-300"}\`}>
                        {item.label}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
})()}`;

if (content.includes('const sidebarItems = currentUser.role === "admin"')) {
  content = content.replace(oldSidebarLogic, newSidebarLogic);
  fs.writeFileSync('src/App.tsx', content);
} else {
  console.log("Could not find the old sidebar logic.");
}
