import fs from 'fs';
let content = fs.readFileSync('src/components/RoadScanner.tsx', 'utf8');

content = content.replace(
  '    // Total distance estimated from GPS points\n    const totalDistance = Math.round(gpsTrack.length * 15.2);',
  `    // Calculate real distance from GPS points using geographic haversine
    let totalDistance = 0;
    for (let i = 1; i < gpsTrack.length; i++) {
      totalDistance += calculateHaversineDistanceMeters(
        gpsTrack[i - 1].latitude,
        gpsTrack[i - 1].longitude,
        gpsTrack[i].latitude,
        gpsTrack[i].longitude
      );
    }
    totalDistance = Math.round(totalDistance);`
);

// We need to import calculateHaversineDistanceMeters from spatialClustering if it's not already there.
// It imports `clusterDetections` so we can just add calculateHaversineDistanceMeters.
content = content.replace(
  /import \{ clusterDetections \} from "\.\.\/services\/spatialClustering";/,
  'import { clusterDetections, calculateHaversineDistanceMeters } from "../services/spatialClustering";'
);

fs.writeFileSync('src/components/RoadScanner.tsx', content);
