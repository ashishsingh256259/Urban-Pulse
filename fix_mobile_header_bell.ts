import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `<span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-full font-bold border border-emerald-800 active-pulse">
                NCR ONLINE
              </span>`;

const replacement = `<span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-full font-bold border border-emerald-800 active-pulse">
                NCR ONLINE
              </span>
              <button
                onClick={() => setIsSidebarMobileOpen(true)}
                className="relative p-1.5 focus:outline-hidden hover:bg-slate-800 rounded-lg text-slate-300"
              >
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-slate-900"></span>
                )}
              </button>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/App.tsx', content);
