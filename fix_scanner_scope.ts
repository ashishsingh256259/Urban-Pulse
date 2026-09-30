import fs from 'fs';
let content = fs.readFileSync('src/components/RoadScanner.tsx', 'utf8');

const oldBlock = `            const data = await res.json();
            if (data.detected && Array.isArray(data.detections) && data.detections.length > 0) {
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
              });

                const candidateId = \`CAND-\${Date.now().toString().slice(-6)}-\${frame.index}\`;
                const reportCategory: ReportCategory = categoryName.includes("Pothole") ? "Pothole" 
                  : categoryName.includes("Garbage") ? "Garbage Overflow"
                  : categoryName.includes("Streetlight") ? "Broken Streetlight"
                  : categoryName.includes("Obstruction") ? "Road Obstruction"
                  : "Other";

                const priority: Priority = rawSeverity >= 85 ? "Critical" : rawSeverity >= 70 ? "High" : rawSeverity >= 45 ? "Medium" : "Low";
                const riskLevel: RiskLevel = rawSeverity >= 75 ? "High" : rawSeverity >= 45 ? "Medium" : "Low";

                const candidate: RoadScanCandidate = {
                  id: candidateId,
                  sessionId: sessionId,
                  clusterId: \`CLUS-\${frame.index}\`,
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
            }
          } catch (err) {`;

const newBlock = `            const data = await res.json();
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

                  // Generate immediate candidate for fallback
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
          } catch (err) {`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/RoadScanner.tsx', content);
