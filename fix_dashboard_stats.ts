import fs from 'fs';
let content = fs.readFileSync('src/components/DashboardStats.tsx', 'utf8');

content = content.replace(
  '// Percentage formulas for nice mock trends',
  '// Trend percentages'
);

content = content.replace(
  '<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-2 font-medium">\n            <ChevronUp className="w-3.5 h-3.5" />\n            <span>+12.4% vs last week</span>\n          </div>',
  ''
);

content = content.replace(
  '<div className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-2 font-medium">\n            <ChevronUp className="w-3.5 h-3.5" />\n            <span>Backlogged (24h)</span>\n          </div>',
  ''
);

content = content.replace(
  '<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-2 font-medium">\n            <ChevronUp className="w-3.5 h-3.5" />\n            <span>Target: 85%</span>\n          </div>',
  ''
);

content = content.replace(
  '<div className="flex items-center gap-1.5 text-[11px] text-rose-600 mt-2 font-medium">\n            <ChevronDown className="w-3.5 h-3.5" />\n            <span>-2 from yesterday</span>\n          </div>',
  ''
);

fs.writeFileSync('src/components/DashboardStats.tsx', content);
