import React, { useState } from "react";
import { Report } from "../types";
import { computeExecutiveAnalytics } from "../utils/geoAnalytics";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { 
  Award, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  MapPin, ShieldCheck, ShieldAlert, Layers, BarChart3, Clock, 
  Activity, CheckCircle, Camera, FileText, Sparkles, AlertTriangle,
  Flame, Database
} from "lucide-react";

interface ExecutiveAnalyticsProps {
  reports: Report[];
}

export default function ExecutiveAnalytics({ reports }: ExecutiveAnalyticsProps) {
  const metrics = computeExecutiveAnalytics(reports);

  // Department mapping based on real category data
  const departmentData = [
    {
      name: "Public Works",
      assigned: reports.filter(r => (r.category === "Pothole" || r.category === "Road Obstruction") && r.status !== "Resolved").length,
      resolved: reports.filter(r => (r.category === "Pothole" || r.category === "Road Obstruction") && r.status === "Resolved").length,
      total: reports.filter(r => r.category === "Pothole" || r.category === "Road Obstruction").length
    },
    {
      name: "Sanitation",
      assigned: reports.filter(r => r.category === "Garbage Overflow" && r.status !== "Resolved").length,
      resolved: reports.filter(r => r.category === "Garbage Overflow" && r.status === "Resolved").length,
      total: reports.filter(r => r.category === "Garbage Overflow").length
    },
    {
      name: "Energy & Grid",
      assigned: reports.filter(r => r.category === "Broken Streetlight" && r.status !== "Resolved").length,
      resolved: reports.filter(r => r.category === "Broken Streetlight" && r.status === "Resolved").length,
      total: reports.filter(r => r.category === "Broken Streetlight").length
    },
    {
      name: "Civic Security",
      assigned: reports.filter(r => (r.category === "Vandals / Graffiti" || r.category === "Other") && r.status !== "Resolved").length,
      resolved: reports.filter(r => (r.category === "Vandals / Graffiti" || r.category === "Other") && r.status === "Resolved").length,
      total: reports.filter(r => r.category === "Vandals / Graffiti" || r.category === "Other").length
    }
  ];

  // Colors for category distribution
  const CATEGORY_COLORS = ["#2563eb", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#64748b"];

  return (
    <div className="flex flex-col gap-6 text-left" id="executive-analytics-panel">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              MUNICIPAL EXECUTIVE INTELLIGENCE
            </span>
            <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
              <Database className="w-2.5 h-2.5" /> Real Firestore Reports: {metrics.totalCount}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 font-display tracking-tight">
            City Operational Analytics & Risk Telemetry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-normal">
            Deterministic calculations derived directly from active and resolved citizen reports and AI Road Scanner detections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Composite City Risk Index</span>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className={`text-xl font-mono font-black ${
                metrics.cityRiskScore >= 70 ? "text-emerald-600" : metrics.cityRiskScore >= 50 ? "text-amber-600" : "text-red-600"
              }`}>
                {metrics.cityRiskScore}/100
              </span>
              <span className="text-[10px] font-bold text-slate-600">
                ({metrics.riskTrendLabel})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Reports & Source Split */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-400">
                Total Live Reports
              </span>
              <Database className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-mono font-black text-slate-900 mt-1">
              {metrics.totalCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] mt-3 pt-2.5 border-t border-slate-100">
            <span className="flex items-center gap-1 text-purple-700 font-bold">
              <Camera className="w-3 h-3" /> {metrics.scannerCount} AI Scanner ({metrics.scannerPercentage}%)
            </span>
            <span className="flex items-center gap-1 text-blue-700 font-bold">
              <FileText className="w-3 h-3" /> {metrics.manualCount} Citizen ({metrics.manualPercentage}%)
            </span>
          </div>
        </div>

        {/* Resolution Efficiency */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-400">
                Resolution Efficiency
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-mono font-black text-emerald-600 mt-1">
              {metrics.resolutionRate}%
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] mt-3 pt-2.5 border-t border-slate-100 text-slate-500">
            <span>Resolved: <strong className="text-emerald-700 font-mono">{metrics.resolvedCount}</strong></span>
            <span>Active: <strong className="text-amber-700 font-mono">{metrics.activeCount}</strong></span>
          </div>
        </div>

        {/* Active Critical Hazards */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-400">
                Critical Hazards (≥75%)
              </span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-mono font-black text-red-600 mt-1">
              {metrics.criticalCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] mt-3 pt-2.5 border-t border-slate-100 text-slate-500">
            <span>Moderate: <strong className="text-amber-700 font-mono">{metrics.mediumRiskCount}</strong></span>
            <span>Low Risk: <strong className="text-emerald-700 font-mono">{metrics.lowRiskCount}</strong></span>
          </div>
        </div>

        {/* AI Road Scanner Volume */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-400">
                AI Scanner Penetration
              </span>
              <Camera className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-mono font-black text-purple-700 mt-1">
              {metrics.scannerPercentage}%
            </div>
          </div>
          <div className="text-[10.5px] mt-3 pt-2.5 border-t border-slate-100 text-slate-500">
            <span>Automated computer vision road ingestion</span>
          </div>
        </div>

      </div>

      {/* Row: Ward Rankings & Real Time History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Ward Standings (Col-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              REAL WARD STANDINGS
            </span>
            <h3 className="text-base font-bold text-slate-850 mt-0.5 font-display">
              Administrative Ward Performance
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
              Ranked mathematically from live hazard counts and resolved tickets across sectors.
            </p>
          </div>

          {metrics.wardRankings.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-xl">
              No registered ward incidents currently on record.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Safest Districts */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Top Performing Sectors</span>
                </span>
                
                <div className="flex flex-col gap-2">
                  {metrics.safestWards.map((ward) => (
                    <div key={ward.name} className="flex justify-between items-center p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-mono text-[10px] font-black">
                          {ward.rank}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">{ward.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{ward.totalReports} total • {ward.resolvedCount} resolved</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-xs font-mono font-extrabold text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">
                          {ward.scoreLabel}
                        </span>
                        <span className="text-[9.5px] font-bold text-emerald-600 uppercase font-sans">
                          {ward.note}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highest Risk Districts */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2 font-sans">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>High Attention Sectors</span>
                </span>

                <div className="flex flex-col gap-2">
                  {metrics.highestRiskWards.map((ward) => (
                    <div key={ward.name} className="flex justify-between items-center p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-red-50 border border-red-200 text-red-800 flex items-center justify-center font-mono text-[10px] font-black">
                          !
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">{ward.name}</span>
                          <span className="text-[9px] text-red-600 font-mono font-semibold">{ward.activeHazards} active unresolved</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-xs font-mono font-extrabold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">
                          {ward.scoreLabel}
                        </span>
                        <span className={`text-[9.5px] font-bold uppercase font-sans ${ward.trend === "improving" ? "text-emerald-600" : "text-red-600 font-extrabold"}`}>
                          {ward.note}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Real Time Chronological Graph (Col-7) */}
        <div className="lg:col-span-7 bg-white p-6 border border-slate-200 rounded-2xl flex flex-col gap-4 shadow-sm">
          <div>
            <span className="text-[10px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              CHRONOLOGICAL INCIDENT TIMELINE
            </span>
            <h3 className="text-base font-bold text-slate-850 mt-0.5 font-display">
              Real Ingestion History & Resolution Progress
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Chronologically grouped by actual report submission timestamp dates.
            </p>
          </div>

          {metrics.timeTrends.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-xl">
              No historical incident timeline points found.
            </div>
          ) : (
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.timeTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    fillOpacity={1}
                    fill="url(#colorTotal)" 
                    name="Total Lodged Cases" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolvedCount" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    fillOpacity={1}
                    fill="url(#colorResolved)" 
                    name="Resolved Cases" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Row: Issue Distribution & Department Resolution Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Issue Distribution by Category (Col-6) */}
        <div className="lg:col-span-6 bg-white p-6 border border-slate-200 rounded-2xl flex flex-col gap-4 shadow-sm">
          <div>
            <span className="text-[10px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              ISSUE CATEGORIZATION MATRIX
            </span>
            <h3 className="text-sm font-bold text-slate-850 mt-0.5 font-display">
              Incident Breakdown Across Hazard Types
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Calculated from actual report category flags and AI confidence models.
            </p>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.issueDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Incident Count" radius={[4, 4, 0, 0]}>
                  {metrics.issueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contractor & Municipal Crew Resolution Rates (Col-6) */}
        <div className="lg:col-span-6 bg-white p-6 border border-slate-200 rounded-2xl flex flex-col gap-4 shadow-sm">
          <div>
            <span className="text-[10px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              MUNICIPAL DISPATCH TEAMS
            </span>
            <h3 className="text-sm font-bold text-slate-850 mt-0.5 font-display">
              Department Performance Resolution Rates
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Live operational comparison of assigned vs resolved work orders.
            </p>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9.5} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="assigned" fill="#f59e0b" name="Active / In Progress" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="#10b981" name="Successfully Resolved" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
