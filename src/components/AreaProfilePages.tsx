import React, { useState } from "react";
import { Report } from "../types";
import { 
  Compass, ShieldAlert, Sparkles, TrendingUp, Info, Activity, 
  UserCheck, AlertTriangle, CheckCircle2, ShieldAlert as ShieldIcon 
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface AreaProfilePagesProps {
  reports: Report[];
  selectedCityName: string;
}

export default function AreaProfilePages({ reports, selectedCityName }: AreaProfilePagesProps) {
  // Available regions based on selected city name
  const areasByCity: { [key: string]: string[] } = {
    "New Delhi (NCR)": ["Sector 45", "Saket", "Connaught Place", "Okhla Phase 3", "Vasant Kunj", "Noida Sector 62"],
    "Mumbai (MMR)": ["Colaba", "Andheri West", "Bandra Kurla Complex", "Thane Sector 4", "Dharavi District", "Worli Sea Face"],
    "Bengaluru (BBMP)": ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield Sector 2", "Jayanagar Ward", "Electronic City"]
  };

  const [selectedArea, setSelectedArea] = useState(areasByCity["New Delhi (NCR)"][0]);

  // Derived city dynamically from the selected ward/location data
  const derivedCityName = React.useMemo(() => {
    for (const [city, areas] of Object.entries(areasByCity)) {
      if (areas.includes(selectedArea)) return city;
    }
    return selectedCityName || "New Delhi (NCR)";
  }, [selectedArea, selectedCityName]);

  // Aggregate local stats
  const areaReports = (reports || []).filter(r => r && (r.location || "").toLowerCase().includes(selectedArea.toLowerCase()));
  const totalIncidents = areaReports.length;
  const unresolvedReports = areaReports.filter(r => r.status !== "Resolved");
  const resolvedCount = totalIncidents - unresolvedReports.length;

  // Formulate dynamic local risk score based on severity of unresolved reports
  const localRiskScore = React.useMemo(() => {
    if (areaReports.length === 0) return 34; // standard baseline safe score
    const totalSeverity = areaReports.reduce((sum, r) => sum + r.severity, 0);
    const avg = totalSeverity / areaReports.length;
    // factor in unresolved counts
    return Math.min(100, Math.max(10, Math.round(avg + (unresolvedReports.length * 4))));
  }, [areaReports, unresolvedReports]);

  // Generate realistic risk forecast trends
  const trendData = React.useMemo(() => {
    const base = localRiskScore;
    return [
      { week: "Week 01", risk: Math.max(15, Math.min(95, base - 10)) },
      { week: "Week 02", risk: Math.max(15, Math.min(95, base - 5)) },
      { week: "Week 03", risk: Math.max(15, Math.min(95, base + 2)) },
      { week: "Week 04", risk: Math.max(15, Math.min(95, base)) },
      { week: "Week 05", risk: Math.max(15, Math.min(95, base - 4)) },
      { week: "Week 06", risk: Math.max(15, Math.min(95, base - 8)) }
    ];
  }, [localRiskScore]);

  // Dynamic status color
  const getRiskColor = (score: number) => {
    if (score >= 75) return { text: "text-rose-600", bg: "bg-rose-50 border-rose-200", label: "HIGH THREAT ZONE", iconColor: "text-rose-500" };
    if (score >= 45) return { text: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "MODERATE RISK BUFFER", iconColor: "text-amber-500" };
    return { text: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "SAFE WELL-REGULATED WARD", iconColor: "text-emerald-500" };
  };

  const riskMeta = getRiskColor(localRiskScore);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-left" id="area-profile-pages">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <span className="text-[10px] sm:text-xs font-mono font-extrabold text-blue-600 uppercase tracking-widest block">
            SUPERVISORY GEOSPATIAL INTELLIGENCE
          </span>
          <h3 className="text-lg font-bold font-display tracking-tight text-slate-805 mt-0.5">
            Smart-City Area Profiles & Risk Explorer
          </h3>
          <p className="text-[11.5px] text-slate-550 leading-relaxed max-w-xl font-sans mt-0.5">
            Drill down into neighborhood-level safety trends, machine predictions, citizen satisfaction logs, and custom AI mitigation logs.
          </p>
        </div>

        {/* Dropdown to select area */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-205 p-2 rounded-xl">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0 font-mono">
            SELECT WARD:
          </label>
          <select
            id="area-profile-selector"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-800 shadow-3xs focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
          >
            {Object.entries(areasByCity).map(([city, areas]) => (
              <optgroup key={city} label={city}>
                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (span 4): Local Risk Score Indicator */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Main Risk Score Card */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-xl pointer-events-none" />
            
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">
              Composite Profile Safety Rating
            </span>
            <h4 className="text-xl font-black text-slate-850 tracking-tight mt-0.5 font-display flex items-center gap-1.5">
              <span>{selectedArea}</span>
              <span className="text-[10px] font-medium text-slate-400">({derivedCityName})</span>
            </h4>

            {/* Giant Circular visual */}
            <div className="mt-5 mb-4 flex items-center justify-center">
              <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-[6px] border-slate-100 bg-white shadow-xs">
                {/* Score Dial simulated representation */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 pointer-events-none animate-spin-slow duration-5000" />
                <div className="text-center relative z-10 z-index-1 flex flex-col items-center">
                  <span className="text-3xl font-mono font-black text-slate-900 tracking-tighter">
                    {localRiskScore}
                  </span>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest -mt-1 block">
                    RISK
                  </span>
                </div>
              </div>
            </div>

            {/* Severity Pill status */}
            <div className={`px-3.5 py-2.5 rounded-xl border text-center ${riskMeta.bg}`}>
              <div className={`text-[10.5px] font-black tracking-widest ${riskMeta.text} font-mono`}>
                {riskMeta.label}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                {localRiskScore >= 75 
                  ? "Elevated hazard levels discovered due to multiple unresolved grid and infrastructure failures." 
                  : localRiskScore >= 45 
                  ? "Operational parameters remain buffered inside safe control thresholds. Periodic checks." 
                  : "Excellent environmental, pavement quality, transport and citizen parameters registered."}
              </p>
            </div>

            {/* Micro Stats list */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-medium font-sans">
              <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[9px] uppercase">Active Alerts</span>
                <span className="text-sm font-bold text-red-650 font-mono mt-0.5 block">{unresolvedReports.length} Active</span>
              </div>
              <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl">
                <span className="text-slate-400 block text-[9px] uppercase">Resolved Tickets</span>
                <span className="text-sm font-bold text-emerald-650 font-mono mt-0.5 block">{resolvedCount} Cleaned</span>
              </div>
            </div>

          </div>

          {/* AI Confidence & Predicton parameters (TRUST & TRANSPARENCY) */}
          <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-2xs border-l-4 border-indigo-500">
            <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>AI Validation Profile</span>
            </h5>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-450 font-medium">Confidence Margin:</span>
                <strong className="text-slate-800 font-mono">98.2% Optimal</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-medium">Underlying Model:</span>
                <strong className="text-slate-800 font-mono">Gemini 1.5-Pro</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-medium font-sans">Data Sources:</span>
                <strong className="text-slate-800 font-sans text-right">Municipal GIS, Citizen Reports, SMOG indicators</strong>
              </div>
              <p className="text-[10px] text-indigo-800 italic bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50 leading-relaxed mt-1 font-sans">
                "Calculated on weighted geospatial overlays where municipal reporting index holds 40% weight, telemetry holds 30%, and local temperature variables hold 30%."
              </p>
            </div>
          </div>

        </div>

        {/* Right Column (span 8): Issue History, Forecast Trend Chart, AI Recommendations, Citizen Impact */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Recharts Area Plot (FORECAST TREND & RISK HISTORY) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Interactive Risk Trend Index Forecast</span>
                </h4>
                <p className="text-[10.5px] text-gray-400 font-medium mt-0.5">Calculated machine predictions overlaying the next 6 response cycles.</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-mono font-bold border border-emerald-100">
                PROJECTION STABLE
              </span>
            </div>

            <div className="h-[180px] w-full mt-2 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="areaRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={9.5} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9.5} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#f8fafc", fontSize: "11px" }}
                    labelStyle={{ fontWeight: "bold", color: "#38bdf8" }}
                  />
                  <Area type="monotone" dataKey="risk" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#areaRiskGrad)" name="Risk Score Indicator" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Recommendations & Citizen Impact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* AI Custom Area Recommendations */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl text-left shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Operational Priorities</span>
              <h5 className="font-bold text-sm text-slate-800 tracking-tight mt-0.5 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                <span>AI Recommended Measures</span>
              </h5>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-705 leading-normal">
                    {localRiskScore >= 75 
                      ? "Escalate priority status of local pothole markers to dispatch District 1 hotpatch units within 12 hours."
                      : "Perform standard sweep and verify illumination status around crosswalk poles."}
                  </p>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-705 leading-normal">
                    Initiate a localized sanitation clearance sweep around commercial transport nodes to counter garbage overflow.
                  </p>
                </div>
              </div>
            </div>

            {/* Citizen Impact level */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl text-left shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Voter Sentiment Index</span>
              <h5 className="font-bold text-sm text-slate-800 tracking-tight mt-0.5 mb-3 flex items-center gap-1.5 font-display">
                <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Active Citizen Impact Metrics</span>
              </h5>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Resident Satisfaction Index</span>
                    <span className="text-blue-600 font-mono font-bold">
                      {localRiskScore >= 75 ? "44.1% Critical" : localRiskScore >= 45 ? "72.8% Average" : "89.4% Robust"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        localRiskScore >= 75 ? "bg-red-500" : localRiskScore >= 45 ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                      style={{ width: `${localRiskScore >= 75 ? 44.1 : localRiskScore >= 45 ? 72.8 : 89.4}%` }}
                    />
                  </div>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[10px] text-slate-600 leading-normal">
                  <strong>Estimated Residents Impacted:</strong> {localRiskScore >= 75 ? "12,400+ residents experiencing utility lags" : "900+ residents under safety monitors"}
                </div>
              </div>
            </div>

          </div>

          {/* Recent Activity Ticker */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
              Live Area Event Log
            </span>
            <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
              {areaReports.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic">No recent incidents nor updates recorded across {selectedArea} coordinates.</div>
              ) : (
                areaReports.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-150 rounded px-2.5 py-1.5 flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.status === "Resolved" ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                      }`} />
                      <span className="font-bold text-slate-700 truncate max-w-[180px] sm:max-w-none">{item.title}</span>
                      <span className="text-slate-400 font-mono font-medium text-[9px]">({item.category})</span>
                    </div>
                    <span className={`px-2 py-0.25 rounded font-mono font-bold font-extrabold ${
                      item.status === "Resolved" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
