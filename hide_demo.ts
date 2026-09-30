import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  '          {/* HIGH-FIDELITY DEMO PLAYGROUND BOARD */}',
  '          {import.meta.env.DEV && (\n            <>\n          {/* HIGH-FIDELITY DEMO PLAYGROUND BOARD */}'
);
content = content.replace(
  '          {/* SECTION HEADER */}',
  '            </>\n          )}\n          {/* SECTION HEADER */}'
);
fs.writeFileSync('src/App.tsx', content);
