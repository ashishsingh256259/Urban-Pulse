import fs from 'fs';
let content = fs.readFileSync('src/components/ReportDetailsModal.tsx', 'utf8');

const oldImage = `<div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group shadow-sm flex items-center justify-center">
              <img
                src={getImageUrl(currentMainImage)}
                alt={report.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                referrerPolicy="no-referrer"
              />`;

const newImage = `<div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group shadow-sm flex items-center justify-center">
              <div className="relative max-w-full max-h-full inline-block flex items-center justify-center">
                <img
                  src={getImageUrl(currentMainImage)}
                  alt={report.title}
                  className="max-w-full max-h-full object-contain block transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                {report.boundingBox && selectedFrameIndex === 0 && (
                  <div 
                    className="absolute border-[3px] border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    style={{
                      left: \`\${report.boundingBox.x * 100}%\`,
                      top: \`\${report.boundingBox.y * 100}%\`,
                      width: \`\${report.boundingBox.width * 100}%\`,
                      height: \`\${report.boundingBox.height * 100}%\`,
                      pointerEvents: 'none'
                    }}
                  >
                    <div className="absolute -top-6 left-[-3px] bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap rounded-t-sm uppercase tracking-wider">
                      {report.category} ({Math.round(report.confidence || 0)}%)
                    </div>
                  </div>
                )}
              </div>`;

content = content.replace(oldImage, newImage);
fs.writeFileSync('src/components/ReportDetailsModal.tsx', content);
