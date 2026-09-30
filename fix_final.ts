import fs from 'fs';
let lines = fs.readFileSync('src/components/RoadScanner.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('const res = await fetch("/api/scanner/analyze-frame"'));
const endIdx = lines.findIndex(l => l.includes('console.error("Frame analysis API call failed:", err);'));

const replacement = `            const res = await fetch("/api/scanner/analyze-frame", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: frame.dataUrl,
                gps: frame.gps,
                frameTimestamp: frame.timestamp
              })
            });

            const data = await res.json();

            if (data.detected && Array.isArray(data.detections) && data.detections.length > 0) {
              data.detections.forEach((det: any, detIdx: number) => {
                const rawConfidence = Number(det.confidence) || 0;
                const rawSeverity = Number(det.severityScore) || 0;

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
                  
                  setRecentAlert({
                    category: detection.category,
                    severity: detection.severityScore,
                    confidence: detection.confidence,
                    time: new Date().toLocaleTimeString()
                  });

                  // Create immediate fallback candidate
                  const reportCategory: ReportCategory = categoryName.includes("Pothole") ? "Pothole" 
                    : categoryName.includes("Garbage") ? "Garbage Overflow"
                    : categoryName.includes("Streetlight") ? "Broken Streetlight"
                    : categoryName.includes("Obstruction") ? "Road Obstruction"
                    : "Other";

                  const priority: Priority = rawSeverity >= 85 ? "Critical" : rawSeverity >= 70 ? "High" : rawSeverity >= 45 ? "Medium" : "Low";
                  const riskLevel: RiskLevel = rawSeverity >= 75 ? "High" : rawSeverity >= 45 ? "Medium" : "Low";

                  const candidate: RoadScanCandidate = {
                    id: \`CAND-\${Date.now().toString().slice(-6)}-\${frame.index}-\${detIdx}\`,
                    sessionId: sessionId,
                    clusterId: \`CLUS-\${frame.index}-\${detIdx}\`,
                    category: reportCategory,
                    subCategory: categoryName,
                    severity: rawSeverity,
                    riskLevel,
                    priority,
                    confidence: rawConfidence,
                    location: \`\${frame.gps.latitude.toFixed(5)}, \${frame.gps.longitude.toFixed(5)} (±\${frame.gps.accuracy || 0}m)\`,
                    latitude: frame.gps.latitude,
                    longitude: frame.gps.longitude,
                    primaryImage: detection.imageUrl,
                    evidenceFrames: [detection.imageUrl],
                    detectionsCount: 1,
                    boundingBox: det.boundingBox,
                    description: rawDescription,
                    recommendedActions: [
                      "Dispatch municipal road maintenance crew",
                      "Deploy high-visibility hazard caution signage"
                    ],
                    selected: true,
                    submissionState: "READY"
                  };

                  localCandidates.push(candidate);
                  setCandidates((prev) => [...prev, candidate]);
                }
              });
            }
          } catch (err) {
            console.error("Frame analysis API call failed:", err);`;

lines.splice(startIdx, endIdx - startIdx + 1, replacement);

fs.writeFileSync('src/components/RoadScanner.tsx', lines.join('\n'));
