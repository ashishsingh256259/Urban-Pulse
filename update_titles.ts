import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const titlesOld = `{activeSubTab === "command-center" && "AI City Command & Control Center"}`;
const titlesNew = `{activeSubTab === "citizen-home" && "Citizen Safety Dashboard"}
                      {activeSubTab === "municipal-home" && "Municipal Command Overview"}
                      {activeSubTab === "command-center" && "AI City Command & Control Center"}`;

if (!content.includes('citizen-home" && "Citizen Safety')) {
  content = content.replace(titlesOld, titlesNew);
}

const descOld = `{activeSubTab === "command-center" && \`Sovereign intelligence workspace providing overarching metrics of active complaints, city operational safety ratings, and direct dispatcher planning tools across \${selectedCityName}.\`}`;
const descNew = `{activeSubTab === "citizen-home" && \`Welcome to your UrbanPulse safety and reporting dashboard for \${selectedCityName}.\`}
                  {activeSubTab === "municipal-home" && \`High-level command overview for \${selectedCityName} municipal operations.\`}
                  {activeSubTab === "command-center" && \`Sovereign intelligence workspace providing overarching metrics of active complaints, city operational safety ratings, and direct dispatcher planning tools across \${selectedCityName}.\`}`;

if (!content.includes('citizen-home" && `Welcome to your')) {
  content = content.replace(descOld, descNew);
}

fs.writeFileSync('src/App.tsx', content);
