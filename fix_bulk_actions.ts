import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldBulkUpdateLogic1 = `                                  Promise.all(
                                    selectedReportIds.map(id => {
                                      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "Resolved", updatedAt: new Date().toISOString() } : r));
                                      return fetch("/api/reports/update-status", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          id,
                                          status: "Resolved",
                                          comment: "Bulk Action: Resolving target batch on operations deck."
                                        })
                                      })
                                    })
                                  )`;

const newBulkUpdateLogic1 = `                                  Promise.all(
                                    selectedReportIds.map(id => {
                                      return dbUpdateReportStatus(id, "Resolved", "Bulk Action: Resolving target batch on operations deck.");
                                    })
                                  )`;

content = content.replace(oldBulkUpdateLogic1, newBulkUpdateLogic1);

const oldBulkUpdateLogic2 = `                                  Promise.all(
                                    selectedReportIds.map(id => {
                                      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "In Progress", assignedTo: "East Delhi Municipal Corp", updatedAt: new Date().toISOString() } : r));
                                      return fetch("/api/reports/update-status", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          id,
                                          status: "In Progress",
                                          assignedTo: "East Delhi Municipal Corp",
                                          comment: "Bulk Action: Slating target batch for In-Progress fieldwork."
                                        })
                                      })
                                    })
                                  )`;

const newBulkUpdateLogic2 = `                                  Promise.all(
                                    selectedReportIds.map(id => {
                                      return dbUpdateReportStatus(id, "In Progress", "Bulk Action: Slating target batch for In-Progress fieldwork.");
                                    })
                                  )`;

content = content.replace(oldBulkUpdateLogic2, newBulkUpdateLogic2);

fs.writeFileSync('src/App.tsx', content);
