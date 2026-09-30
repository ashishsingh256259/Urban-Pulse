import React from "react";
import { Report } from "../types";
import { computeExecutiveAnalytics } from "../utils/geoAnalytics";
import { Sparkles, Database } from "lucide-react";

interface AIInsightsPanelProps {
  reports: Report[];
  onSelectSector?: (sectorName: string) => void;
}

export default function AIInsightsPanel({ reports }: AIInsightsPanelProps) {
  const metrics = computeExecutiveAnalytics(reports);

  const activeReports = (reports || []).filter(r => r && r.status !== "Resolved");
  const highRiskIssues = activeReports.filter(r => (r.severity || 0) >= 75);

  const mostRiskReport = highRiskIssues.length > 0 
    ? [...highRiskIssues].sort((a, b) => b.severity - a.severity)[0] 
    : activeReports.length > 0 
      ? [...activeReports].sort((a, b) => b.severity - a.severity)[0]
      : (reports && reports[0]) || null;

  const primarySectorName = mostRiskReport && mostRiskReport.location ? mostRiskReport.location.split(",")[0].trim() : "Delhi NCR Sector";

  return (
    <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5 flex flex-col gap-4 text-left" id="ai-insights-panel">
      
      {/* Header section */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-850 tracking-tight">AI Urban Intelligence & Operations Radar</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time heuristics synthesized from live Firestore incident records.</p>
          </div>
        </div>
        <span className="text-[9.5px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Database className="w-2.5 h-2.5" />
          {metrics.totalCount} Live Reports Analyzed
        </span>
      </div>

      {/* DAILY AI BRIEFING WIDGET */}
      {mostRiskReport ? (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-4.5 rounded-xl border-l-4 border-blue-500 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DAILY AI OPERATIONS BRIEFING (Active Turn)</span>
            </div>
            <h4 className="text-[13px] font-extrabold text-white mt-1">
              Incident Focus Vector: <span className="text-amber-400 font-bold">{primarySectorName}</span>
            </h4>
            <p className="text-[11px] text-slate-300 mt-1 font-sans leading-relaxed">
              <strong>Primary Alert:</strong> {mostRiskReport.title} ({mostRiskReport.category} • Severity: <strong className="text-red-400 font-mono">{mostRiskReport.severity}%</strong>).
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5 font-sans leading-relaxed">
              <strong>AI Recommended Dispatch:</strong> {
                mostRiskReport.aiAnalysis?.recommendedActions?.[0] ||
                (mostRiskReport.category === "Garbage Overflow" 
                  ? "Dispatch dynamic waste management crews & compactors to restore site safety." 
                  : mostRiskReport.category === "Broken Streetlight" 
                    ? "Issue urgent service ticket for electrical grid contractors." 
                    : "Mobilize designated asphalt and utility division responders.")
              }
            </p>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/60 shrink-0 text-center flex flex-col items-center justify-center min-w-[130px]">
            <span className="text-[8px] text-slate-400 uppercase font-semibold block">Composite Risk</span>
            <span className={`text-base font-extrabold font-mono mt-0.5 ${metrics.cityRiskScore >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
              {metrics.cityRiskScore}/100 Score
            </span>
            <span className="text-[8px] text-slate-400 uppercase font-semibold mt-0.5 block">{metrics.riskTrendLabel}</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-xl text-center text-slate-400 font-mono text-xs">
          No active reports lodged in database. As citizen and automated AI Road Scanner reports populate the database, AI Urban Insights will highlight spatial risk vectors.
        </div>
      )}

    </div>
  );
}
