import fs from 'fs';
let content = fs.readFileSync('src/components/FutureModules.tsx', 'utf8');

content = content.replace(
  '                    </AreaChart>\n                  </ResponsiveContainer>',
  '                    </AreaChart>\n                    )}\n                  </ResponsiveContainer>'
);

content = content.replace(
  '                    </BarChart>\n                  </ResponsiveContainer>',
  '                    </BarChart>\n                    )}\n                  </ResponsiveContainer>'
);

fs.writeFileSync('src/components/FutureModules.tsx', content);
