import fs from 'fs';
let content = fs.readFileSync('src/components/RoadAiCandidateReview.tsx', 'utf8');

const oldImage = `<div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={currentCandidate.evidenceFrames[activeEvidenceFrameIndex] || currentCandidate.primaryImage}
                    alt="Road damage evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-white/10">
                    GPS: {currentCandidate.latitude.toFixed(5)}, {currentCandidate.longitude.toFixed(5)}
                  </div>
                </div>`;

const newImage = `<div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <div className="relative max-w-full max-h-full inline-block">
                    <img
                      src={currentCandidate.evidenceFrames[activeEvidenceFrameIndex] || currentCandidate.primaryImage}
                      alt="Road damage evidence"
                      className="max-w-full max-h-full object-contain block"
                    />
                    {currentCandidate.boundingBox && activeEvidenceFrameIndex === 0 && (
                      <div 
                        className="absolute border-[3px] border-red-500 bg-red-500/30"
                        style={{
                          left: \`\${currentCandidate.boundingBox.x * 100}%\`,
                          top: \`\${currentCandidate.boundingBox.y * 100}%\`,
                          width: \`\${currentCandidate.boundingBox.width * 100}%\`,
                          height: \`\${currentCandidate.boundingBox.height * 100}%\`
                        }}
                      />
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-white/10">
                    GPS: {currentCandidate.latitude.toFixed(5)}, {currentCandidate.longitude.toFixed(5)}
                  </div>
                </div>`;

content = content.replace(oldImage, newImage);
fs.writeFileSync('src/components/RoadAiCandidateReview.tsx', content);
