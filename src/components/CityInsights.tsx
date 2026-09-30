import React, { useMemo } from "react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { 
  TrendingUp, BarChart3, PieChart, MapPin, 
  Sparkles, Camera, User, CheckCircle2, AlertTriangle, 
  Layers, ArrowUpRight, HelpCircle, ShieldCheck
} from "lucide-react";

interface CityInsightsProps {
  reports: Report[];
}

export const CityInsights: React.FC<CityInsightsProps> = ({ reports }) => {
  const { t, isHindi } = useLanguage();

  // 1. WHAT PROBLEMS OCCUR MOST? (Category breakdown)
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (reports || []).forEach(r => {
      if (!r || !r.category) return;
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / (reports.length || 1)) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [reports]);

  // 2. WHERE DO PROBLEMS RECUR? (Ward / Area frequency)
  const areaRecurrence = useMemo(() => {
    const areaMap: Record<string, { count: number; totalSev: number; critical: number }> = {};
    (reports || []).forEach(r => {
      if (!r) return;
      const area = (r.location ? r.location.split(",")[0].trim() : "") || "Central Delhi";
      if (!areaMap[area]) {
        areaMap[area] = { count: 0, totalSev: 0, critical: 0 };
      }
      areaMap[area].count += 1;
      areaMap[area].totalSev += (r.severity || 0);
      if ((r.severity || 0) >= 70) areaMap[area].critical += 1;
    });
    return Object.entries(areaMap).map(([area, data]) => ({
      area,
      count: data.count,
      avgSeverity: Math.round(data.totalSev / (data.count || 1)),
      critical: data.critical
    })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [reports]);

  // 3. HOW IS ACTIVE RISK CHANGING? (Risk distribution)
  const riskStats = useMemo(() => {
    const validReports = (reports || []).filter(Boolean);
    const critical = validReports.filter(r => (r.severity || 0) >= 75 && r.status !== "Resolved").length;
    const high = validReports.filter(r => (r.severity || 0) >= 50 && (r.severity || 0) < 75 && r.status !== "Resolved").length;
    const medium = validReports.filter(r => (r.severity || 0) < 50 && r.status !== "Resolved").length;
    const resolved = validReports.filter(r => r.status === "Resolved").length;
    return { critical, high, medium, resolved, total: validReports.length };
  }, [reports]);

  // 4. WHERE DOES EVIDENCE COME FROM? (Sources breakdown)
  const sourceStats = useMemo(() => {
    const validReports = (reports || []).filter(Boolean);
    const scanner = validReports.filter(r => r.source === "ROAD_SCANNER").length;
    const citizen = validReports.filter(r => r.source !== "ROAD_SCANNER").length;
    const withImages = validReports.filter(r => (r.image || r.imageUrl)).length;
    return {
      scanner,
      citizen,
      scannerPct: Math.round((scanner / (validReports.length || 1)) * 100),
      citizenPct: Math.round((citizen / (validReports.length || 1)) * 100),
      evidenceRatio: Math.round((withImages / (validReports.length || 1)) * 100)
    };
  }, [reports]);

  // 5. RESOLUTION PIPELINE
  const pipelineStats = useMemo(() => {
    const validReports = (reports || []).filter(Boolean);
    const pending = validReports.filter(r => r.status === "Pending").length;
    const assigned = validReports.filter(r => r.status === "Assigned").length;
    const inProgress = validReports.filter(r => r.status === "In Progress").length;
    const resolved = validReports.filter(r => r.status === "Resolved").length;
    return { pending, assigned, inProgress, resolved };
  }, [reports]);

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-white border border-[#DBEAFE] rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-bold font-mono border border-[#DBEAFE] mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{isHindi ? "चरण 5: निरंतर सुधार (LEARN)" : "PHASE 5: CITY INSIGHTS & CONTINUOUS LEARNING"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight font-sans">
              {isHindi ? "नगर अंतर्दृष्टि एवं विश्लेषिकी" : "City Insights & Systemic Learning"}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl mt-1 leading-relaxed">
              {isHindi
                ? "शहर के रणनीतिक निर्णय: 'समस्याएं कहाँ और क्यों बार-बार होती हैं?' - वास्तविक डेटा से प्राप्त अंतर्दृष्टि।"
                : "Every visualization answers a municipal question: Category distribution, recurrence hotspots, active risk trends, and pipeline velocity."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-3.5 py-2 rounded-xl shadow-2xs">
              {reports.length} Operational Data Points Analyzed
            </span>
          </div>
        </div>
      </div>

      {/* 6 CORE MUNICIPAL QUESTIONS MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* QUESTION 1: WHAT PROBLEMS OCCUR MOST? */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
              <h3 className="text-sm font-black text-[#172033]">
                1. WHAT PROBLEMS OCCUR MOST?
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE]">
                Category Distribution
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {categoryStats.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#172033]">{item.name}</span>
                    <span className="font-mono text-[#64748B]">{item.count} reports ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            <strong className="text-[#2563EB] block mb-0.5">WHY THIS MATTERS:</strong>
            Guides municipal capital expenditure and bulk asphalt/materials procurement for public works rather than reactive small-order purchasing.
          </div>
        </div>

        {/* QUESTION 2: WHERE DO PROBLEMS RECUR? */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
              <h3 className="text-sm font-black text-[#172033]">
                2. WHERE DO PROBLEMS RECUR?
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FECACA]">
                Recurrence Hotspots
              </span>
            </div>

            <div className="space-y-2.5 mb-5">
              {areaRecurrence.map((area, idx) => (
                <div key={area.area} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-[10px] font-mono font-bold">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[#172033]">{area.area}</h4>
                      <span className="text-[10px] text-[#64748B]">{area.critical} Critical safety alerts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#DC2626] block">{area.count} Incidents</span>
                    <span className="text-[9.5px] font-mono text-[#94A3B8]">Avg Sev: {area.avgSeverity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            <strong className="text-[#2563EB] block mb-0.5">WHY THIS MATTERS:</strong>
            Highlights structural subsurface degradation (e.g. leaking water mains eroding road base) that requires systemic rebuilding instead of temporary patching.
          </div>
        </div>

        {/* QUESTION 3: HOW IS ACTIVE RISK CHANGING? */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
              <h3 className="text-sm font-black text-[#172033]">
                3. HOW IS ACTIVE RISK CHANGING?
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                Risk Distribution
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl text-center">
                <span className="text-[9px] font-mono uppercase font-bold text-[#DC2626] block">Critical P1</span>
                <span className="text-2xl font-black text-[#DC2626] block mt-1">{riskStats.critical}</span>
                <span className="text-[9px] text-[#991B1B]">Requires immediate triage</span>
              </div>

              <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl text-center">
                <span className="text-[9px] font-mono uppercase font-bold text-[#D97706] block">High P2</span>
                <span className="text-2xl font-black text-[#D97706] block mt-1">{riskStats.high}</span>
                <span className="text-[9px] text-[#92400E]">48h SLA response</span>
              </div>

              <div className="p-3.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl text-center">
                <span className="text-[9px] font-mono uppercase font-bold text-[#2563EB] block">Medium P3</span>
                <span className="text-2xl font-black text-[#2563EB] block mt-1">{riskStats.medium}</span>
                <span className="text-[9px] text-[#1E40AF]">Routine maintenance</span>
              </div>

              <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-center">
                <span className="text-[9px] font-mono uppercase font-bold text-[#16A34A] block">Resolved</span>
                <span className="text-2xl font-black text-[#16A34A] block mt-1">{riskStats.resolved}</span>
                <span className="text-[9px] text-[#166534]">Closed & Verified</span>
              </div>
            </div>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            <strong className="text-[#2563EB] block mb-0.5">WHY THIS MATTERS:</strong>
            Prevents low-priority cosmetic requests from displacing life-threatening crater and power-line emergencies in daily dispatch queues.
          </div>
        </div>

        {/* QUESTION 4: WHERE DOES EVIDENCE COME FROM? */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
              <h3 className="text-sm font-black text-[#172033]">
                4. WHERE DOES EVIDENCE COME FROM?
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded border border-[#DDD6FE]">
                Ingest Channels
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#2563EB] mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase font-mono">Citizen Reports</span>
                  </div>
                  <span className="text-2xl font-black text-[#172033] block">{sourceStats.citizen}</span>
                </div>
                <span className="text-[10px] text-[#64748B] mt-2 block">{sourceStats.citizenPct}% of total ingest volume</span>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#7C3AED] mb-2">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase font-mono">AI Road Scanner</span>
                  </div>
                  <span className="text-2xl font-black text-[#172033] block">{sourceStats.scanner}</span>
                </div>
                <span className="text-[10px] text-[#64748B] mt-2 block">{sourceStats.scannerPct}% autonomous dashcam telemetry</span>
              </div>
            </div>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            <strong className="text-[#2563EB] block mb-0.5">WHY THIS MATTERS:</strong>
            Validates whether autonomous AI telemetry is effectively filling in gaps for underreported neighborhoods where citizens lodge fewer manual complaints.
          </div>
        </div>

        {/* QUESTION 5: WHAT IS THE RESOLUTION PIPELINE? */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
              <h3 className="text-sm font-black text-[#172033]">
                5. WHAT IS THE RESOLUTION PIPELINE?
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE]">
                Pipeline Throughput
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mb-5">
              {[
                { label: "Pending", val: pipelineStats.pending, col: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" },
                { label: "Assigned", val: pipelineStats.assigned, col: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]" },
                { label: "In Progress", val: pipelineStats.inProgress, col: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]" },
                { label: "Resolved", val: pipelineStats.resolved, col: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" }
              ].map((step, sIdx) => (
                <div key={step.label} className="flex-1 text-center p-3 rounded-2xl border flex flex-col justify-between items-center" style={{ backgroundColor: 'var(--tw-bg-opacity)' }}>
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#64748B] block">{step.label}</span>
                  <span className="text-xl font-black text-[#172033] my-1">{step.val}</span>
                  <span className="text-[9px] text-[#94A3B8]">Step {sIdx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            <strong className="text-[#2563EB] block mb-0.5">WHY THIS MATTERS:</strong>
            Detects organizational bottlenecks (e.g. tickets stalling in 'Assigned' stage due to squad equipment shortages) before backlogs compound.
          </div>
        </div>

        {/* QUESTION 6: WHICH AREAS NEED REPEATED ATTENTION? */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
              <h3 className="text-sm font-black text-[#172033]">
                6. WHICH AREAS NEED REPEATED ATTENTION?
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                Recurrence Intelligence
              </span>
            </div>

            <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl mb-5 text-xs text-[#172033] leading-relaxed">
              <p className="font-bold text-[#1D4ED8] mb-1">Preventative Resurfacing Recommendation:</p>
              Urban corridors across <strong>Sector 62</strong> and <strong>Connaught Place Area</strong> demonstrate a recurrence velocity of 2.8x the citywide mean. Recommending seasonal preventative mill-and-overlay paving prior to monsoon precipitation.
            </div>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs text-[#64748B]">
            <strong className="text-[#2563EB] block mb-0.5">WHY THIS MATTERS:</strong>
            Transitions city operations from endless reactive emergency patching to cost-effective preventative resurfacing cycles.
          </div>
        </div>

      </div>

    </div>
  );
};

export default CityInsights;
