import fs from 'fs';
let content = fs.readFileSync('src/components/CitizenUpload.tsx', 'utf8');

const regex = /const targetLat = selectedCoords\?\.lat \?\? \(28\.50 \+ Math\.random\(\) \* 0\.15\);\s+const targetLng = selectedCoords\?\.lng \?\? \(77\.05 \+ Math\.random\(\) \* 0\.32\);/g;

content = content.replace(regex, `const targetLat = selectedCoords?.lat;
    const targetLng = selectedCoords?.lng;

    if (targetLat === undefined || targetLng === undefined) {
      setCurrentStep("REVIEW");
      setFormError("Geographic coordinates are required. Please allow location access or pick a location on the map.");
      return;
    }`);

fs.writeFileSync('src/components/CitizenUpload.tsx', content);
