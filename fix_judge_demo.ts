import fs from 'fs';
let content = fs.readFileSync('src/components/CityCommandCenter.tsx', 'utf8');

content = content.replace(
  '<JudgeDemoWorkflow ',
  '{import.meta.env.DEV && (\n        <JudgeDemoWorkflow '
);

content = content.replace(
  'onSelectSubTab={onSelectSubTab}\n      />',
  'onSelectSubTab={onSelectSubTab}\n      />\n      )}'
);

fs.writeFileSync('src/components/CityCommandCenter.tsx', content);
