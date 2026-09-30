import fs from 'fs';
let content = fs.readFileSync('src/components/RoadScanner.tsx', 'utf8');

const oldBlock = `            if (data.detected && data.detection) {
              const rawConfidence = Number(data.detection.confidence) || 0;
              const rawSeverity = Number(data.detection.severityScore) || 0;

              // Ensure confidence meets the minimum threshold (e.g. >= 60%)
              if (rawConfidence >= 60) {
                const categoryName = data.detection.category || "Other";
                const rawDescription = data.detection.description || "Visible road surface hazard identified by AI Road Scanner.";

                const detection: RawRoadDetection = {
                  id: \`DET-\${Date.now()}-\${frame.index}\`,
                  frameIndex: frame.index,
                  timestamp: frame.timestamp,
                  imageUrl: frame.dataUrl,
                  gps: frame.gps,
                  category: categoryName,
                  severityScore: rawSeverity,
                  confidence: rawConfidence,
                  description: rawDescription,
                  boundingBox: data.detection.boundingBox
                };

                localDetections.push(detection);
                setLiveDetections((prev) => [...prev, detection]);
                setRecentAlert({
                  category: detection.category,
                  severity: detection.severityScore,
                  confidence: detection.confidence,
                  time: new Date().toLocaleTimeString()
                });`;

const newBlock = `            if (data.detected && Array.isArray(data.detections) && data.detections.length > 0) {
              data.detections.forEach((det: any, detIdx: number) => {
                const rawConfidence = Number(det.confidence) || 0;
                const rawSeverity = Number(det.severityScore) || 0;

                // Ensure confidence meets the minimum threshold (e.g. >= 60%)
                if (rawConfidence >= 60) {
                  const categoryName = det.category || "Other";
                  const rawDescription = det.description || "Visible road surface hazard identified by AI Road Scanner.";

                  const detection: RawRoadDetection = {
                    id: \`DET-\${Date.now()}-\${frame.index}-\${detIdx}\`,
                    frameIndex: frame.index,
                    timestamp: frame.timestamp,
                    imageUrl: frame.dataUrl,
                    gps: frame.gps,
                    category: categoryName,
                    severityScore: rawSeverity,
                    confidence: rawConfidence,
                    description: rawDescription,
                    boundingBox: det.boundingBox
                  };

                  localDetections.push(detection);
                  setLiveDetections((prev) => [...prev, detection]);
                  
                  // Update recent alert just for the highest severity one or just the last one
                  setRecentAlert({
                    category: detection.category,
                    severity: detection.severityScore,
                    confidence: detection.confidence,
                    time: new Date().toLocaleTimeString()
                  });
                }
              });`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/RoadScanner.tsx', content);
