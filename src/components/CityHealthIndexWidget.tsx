import React from "react";
import { ShieldCheck, ArrowUpRight, ArrowDownRight, Activity, Shield, Car, Heart, ShieldAlert } from "lucide-react";

export default function CityHealthIndexWidget() {
  const categories = [
    { name: "Infrastructure Health", score: 82, target: "+2.4%", color: "text-blue-600", bg: "bg-blue-50/50", icon: Activity, desc: "Pavement quality & streetlights status" },
    { name: "Safety Conditions", score: 74, target: "-1.8%", color: "text-emerald-600", bg: "bg-emerald-50/50", icon: Shield, desc: "Local risk scores & hazard density" },
    { name: "Traffic Conditions", score: 69, target: "+4.1%", color: "text-amber-600", bg: "bg-amber-50/50", icon: Car, desc: "Speed index & congestive blockages" },
    { name: "Environmental Health", score: 85, target: "+0.9%", color: "text-sky-600", bg: "bg-sky-50/50", icon: Heart, desc: "Air quality particles, AQI index" },
    { name: "Emergency Readiness", score: 81, target: "Optimal", color: "text-violet-600", bg: "bg-violet-50/50", icon: ShieldAlert, desc: "Dispatch response times & ambulance bypass" },
  ];

  return (
    <div id="city-health-index-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 text-left">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[10px] sm:text-xs font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
            SUPERVISORY SYSTEMS CORE
          </span>
          <h2 className="text-xl font-bold text-slate-850 mt-1 font-display tracking-tight">
            City Operational Health Index
          </h2>
          <p className="text-xs text-slate-550 mt-1 leading-normal max-w-xl font-sans">
            Composite metrics mathematically synthesized from real-time municipal telemetry across infrastructure, safety grids, traffic blockages, air parameters, and emergency dispatch logs.
          </p>
        </div>

        {/* Large Index Dial Card */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl shrink-0 w-full sm:w-auto">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-blue-100 bg-blue-50/25">
            <span className="font-mono text-xl font-black text-slate-900">78</span>
            <span className="text-[10px] font-bold text-slate-400 absolute bottom-1">/100</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delhi NCR Metric</span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> Stable
              </span>
            </div>
            <div className="text-lg font-extrabold text-slate-850 font-display mt-0.5">78/100 - Good</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Last consolidated check: Just Now</div>
          </div>
        </div>
      </div>

      {/* Breakdowns List */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div key={idx} className="bg-slate-50/50 border border-slate-200/60 hover:border-slate-300 rounded-xl p-4 transition-all hover:bg-white duration-150 relative group">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${cat.bg} ${cat.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                  {cat.target}
                </span>
              </div>
              <div className="text-2xl font-mono font-black text-slate-900">
                {cat.score}
                <span className="text-xs text-slate-400 font-bold block sm:inline">/100</span>
              </div>
              <h4 className="text-[12px] font-bold text-slate-800 mt-1.5 font-display">
                {cat.name.replace(" Conditions", "").replace(" Health", "").replace(" Readiness", "")}
              </h4>
              <p className="text-[10.5px] text-slate-500 leading-normal mt-1">
                {cat.desc}
              </p>
              
              {/* Micro bar indicator */}
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-3.5">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
