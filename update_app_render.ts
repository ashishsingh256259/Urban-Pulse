import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const insertHome = `
            {activeSubTab === "citizen-home" && (
              <CitizenHome 
                onNavigate={setActiveSubTab}
                reportsCount={reports.filter(r => r.reporterEmail === currentUser.email).length}
                userName={currentUser.fullName}
              />
            )}
            {activeSubTab === "municipal-home" && (
              <MunicipalHome
                onNavigate={setActiveSubTab}
                activeCriticalCount={reports.filter(r => r.severity >= 80 && (r.status === "Pending" || r.status === "Assigned")).length}
                pendingCount={reports.filter(r => r.status === "Pending").length}
                cityName={selectedCityName}
              />
            )}
`;

if (!content.includes('activeSubTab === "citizen-home"')) {
  content = content.replace(
    '{activeSubTab === "road-scanner" && (',
    insertHome + '\n            {activeSubTab === "road-scanner" && ('
  );
}

fs.writeFileSync('src/App.tsx', content);
