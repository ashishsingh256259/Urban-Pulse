import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '                        activeTerminal === "admin" ? "Municipal Commander Terminal" : "Dual Terminal Simulation Deck"',
  '                        activeTerminal === "admin" ? "Municipal Commander Terminal" : ""'
);

content = content.replace(
  'activeTerminal === "citizen" ? `This cockpit simulates the front-end user experience of public volunteers. Take photos, input hazard parameters, and witness instant AI categorization mapped in ${selectedCityName}.` :',
  'activeTerminal === "citizen" ? `Take photos, input hazard parameters, and witness instant AI categorization mapped in ${selectedCityName}.` :'
);

content = content.replace(
  'activeTerminal === "admin" ? `This command portal simulates administrative oversight. Filter municipal reports down to wards, examine high confidence diagnostic scores, and assign utility dispatch fleets inside ${selectedCityName}.` :',
  'activeTerminal === "admin" ? `Filter municipal reports down to wards, examine high confidence diagnostic scores, and assign utility dispatch fleets inside ${selectedCityName}.` :'
);

content = content.replace(
  '"Demonstrating absolute real-time operational sync! Submit any neighborhood issue on the left, and watch the incident dispatch registry update on the right."',
  '""'
);

fs.writeFileSync('src/App.tsx', content);
