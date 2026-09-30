import fs from 'fs';
let content = fs.readFileSync('src/components/RoadScanner.tsx', 'utf8');
content = content.replace(
  'boundingBox: data.detection.boundingBox || { x: 0.35, y: 0.55, width: 0.3, height: 0.25 }',
  'boundingBox: data.detection.boundingBox'
);
fs.writeFileSync('src/components/RoadScanner.tsx', content);
