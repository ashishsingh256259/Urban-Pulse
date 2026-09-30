import fs from 'fs';
let content = fs.readFileSync('src/components/FutureModules.tsx', 'utf8');

// Replace the AreaChart for traffic
content = content.replace(
  '<AreaChart data={trafficChartData} margin={{ top: 5, right: 3, left: -25, bottom: 0 }}>',
  '{allReports.length === 0 ? (\n                      <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No data available yet.</div>\n                    ) : (\n                      <AreaChart data={trafficChartData} margin={{ top: 5, right: 3, left: -25, bottom: 0 }}>'
);
content = content.replace(
  '                      </AreaChart>\n                    </ResponsiveContainer>',
  '                      </AreaChart>\n                    )}\n                    </ResponsiveContainer>'
);

// Replace the BarChart for environment
content = content.replace(
  '<BarChart data={atmosphericData} margin={{ top: 5, right: 3, left: -25, bottom: 0 }}>',
  '{allReports.length === 0 ? (\n                      <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No data available yet.</div>\n                    ) : (\n                      <BarChart data={atmosphericData} margin={{ top: 5, right: 3, left: -25, bottom: 0 }}>'
);
content = content.replace(
  '                      </BarChart>\n                    </ResponsiveContainer>',
  '                      </BarChart>\n                    )}\n                    </ResponsiveContainer>'
);

fs.writeFileSync('src/components/FutureModules.tsx', content);
