import fs from 'fs';
let content = fs.readFileSync('src/services/spatialClustering.ts', 'utf8');

content = content.replace(
  'detectionsCount: cluster.length,',
  'detectionsCount: cluster.length,\n      boundingBox: bestDetection.boundingBox,'
);

fs.writeFileSync('src/services/spatialClustering.ts', content);
