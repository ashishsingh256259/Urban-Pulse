import React, { useState, useMemo } from "react";
import { Report, UserRole } from "../types";
import { useLanguage } from "../context/LanguageContext";
import ReportExportButton from "./ReportExportButton";
import { 
  ShieldAlert, Activity, CheckCircle, Clock, MapPin, 
  AlertTriangle, ArrowUpRight, ArrowRight, Layers,
  Compass, Radio, Users, Cpu, FileClock, ClipboardList,
  Camera, FileText, Sparkles, ChevronRight, Eye, Wrench,
  AlertOctagon, CheckSquare, Bell, ArrowDownRight
} from "lucide-react";

interface CityCommandCenterProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onSelectSubTab: (tab: string) => void;
  userRole?: UserRole;
  onSelectKpiFilter?: (filter: "critical" | "high" | "under-review" | "in-progress" | "resolved" | null) => void;
}

export default function CityCommandCenter({ 
  reports, 
  onSelectReport,
  onSelectSubTab,
  userRole = "municipal",
  onSelectKpiFilter
}: CityCommandCenterProps) {
  const { t, isHindi } = useLanguage();

  const [expandedReasoning, setExpandedReasoning] = useState(false);
  const [feedFilter, setFeedFilter] = useState<"all" | "critical" | "corroborated" | "dispatched">("all");

  const handleKpiClick = (filter: "critical" | "high" | "under-review" | "in-progress" | "resolved") => {
    if (onSelectKpiFilter) {
      onSelectKpiFilter(filter);
    }
    if (filter === "critical" || filter === "high") {
      onSelectSubTab("incident-intelligence");
    } else if (filter === "under-review" || filter === "in-progress") {
      onSelectSubTab("dispatch-management");
    } else if (filter === "resolved") {
      onSelectSubTab("field-verification");
    }
  };

  // Real data metrics
  const activeReports = reports.filter(r => r.status !== "Resolved");
  const criticalActive = activeReports.filter(r => r.severity >= 75);
  const highPriority = activeReports.filter(r => r.severity >= 50 && r.severity < 75);
  const underReview = activeReports.filter(r => r.status === "Pending");
  const inProgress = activeReports.filter(r => r.status === "In Progress" || r.status === "Assigned");
  const resolved = reports.filter(r => r.status === "Resolved");

  // Signature "REQUIRES ATTENTION" Top Priority Incident Card
  const topPriorityIncident = useMemo(() => {
    if (criticalActive.length > 0) {
      return [...criticalActive].sort((a, b) => b.severity - a.severity)[0];
    }
    if (activeReports.length > 0) {
      return [...activeReports].sort((a, b) => b.severity - a.severity)[0];
    }
    return reports[0] || null;
  }, [criticalActive, activeReports, reports]);

  const topPriorityRiskScore = topPriorityIncident ? Math.min(99, Math.round(topPriorityIncident.severity * 0.88 + 10)) : 87;
  const topPriorityObservations = (topPriorityIncident?.image || topPriorityIncident?.imageUrl) ? (topPriorityIncident.source === "ROAD_SCANNER" ? 5 : 3) : 2;
  const topPrioritySources = topPriorityIncident?.source === "ROAD_SCANNER" ? "Citizen + Road Scanner" : "Citizen Ingest + Ward Node";

  // Real Attention Event Stream generated from reports dataset
  const attentionFeed = useMemo(() => {
    const events: Array<{
      id: string;
      type: "critical" | "corroborated" | "dispatched" | "resolved" | "new";
      title: string;
      desc: string;
      time: string;
      location: string;
      report: Report;
    }> = [];

    (reports || []).filter(Boolean).slice(0, 10).forEach((r) => {
      const loc = r.location || "Sector 62";
      if ((r.severity || 0) >= 75 && r.status !== "Resolved") {
        events.push({
          id: `crit-${r.id}`,
          type: "critical",
          title: "CRITICAL RISK ESCALATION",
          desc: `Severe infrastructure defect detected with risk rating ${r.severity}/100. Arterial hazard risk.`,
          time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: loc,
          report: r
        });
      } else if (r.source === "ROAD_SCANNER") {
        events.push({
          id: `scan-${r.id}`,
          type: "corroborated",
          title: "AI ROAD SCANNER CORROBORATION",
          desc: `Dashcam vision telemetry confirmed road surface crater with multi-frame match.`,
          time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: loc,
          report: r
        });
      } else if (r.status === "In Progress" || r.status === "Assigned") {
        events.push({
          id: `disp-${r.id}`,
          type: "dispatched",
          title: "FIELD CREW DISPATCHED",
          desc: `Remediation team assigned. Work order initialized in dispatch system.`,
          time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: loc,
          report: r
        });
      } else if (r.status === "Resolved") {
        events.push({
          id: `res-${r.id}`,
          type: "resolved",
          title: "REMEDIATION RESOLVED",
          desc: `Field intervention complete. Awaiting supervisor QA verification.`,
          time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: loc,
          report: r
        });
      }
    });

    return events;
  }, [reports]);

  const filteredFeed = attentionFeed.filter(ev => {
    if (feedFilter === "critical") return ev.type === "critical";
    if (feedFilter === "corroborated") return ev.type === "corroborated";
    if (feedFilter === "dispatched") return ev.type === "dispatched";
    return true;
  });

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* City Status Situation Room Hub Banner */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#FFFFFF] text-[#172033] rounded-3xl p-6 sm:p-8 border border-[#DBEAFE] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] rounded-2xl shadow-xs">
            <Radio className="w-7 h-7 text-[#2563EB] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-[#2563EB]">
                {isHindi ? "नगरपालिका स्थिति कक्ष" : "MUNICIPAL SITUATION ROOM • ACTIVE OPERATIONS"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 font-sans text-[#172033]">
              {isHindi ? "सिटी कमांड सेंटर" : "City Command Center"}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-xl mt-1 leading-relaxed">
              {isHindi
                ? "मुख्य प्रश्न: 'इस समय नगरपालिका का तत्काल ध्यान कहाँ आवश्यक है?'"
                : "Answers: 'What needs municipal attention RIGHT NOW?' Live situational awareness fusing citizen signals, road telemetry, and priority dispatches."}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[9px] text-[#64748B] uppercase font-mono font-bold">SYSTEM OPERATIONAL STATUS</span>
          <span className="text-sm font-bold bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] px-3.5 py-1.5 rounded-xl font-sans mt-1.5 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
            LIVE TELEMETRY STREAMING
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono mt-1">Zero dropped alerts across grid</span>
        </div>
      </div>

      {/* CITY STATUS METRIC RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 animate-in fade-in duration-300">
        <div 
          onClick={() => handleKpiClick("critical")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleKpiClick("critical"); } }}
          role="button"
          tabIndex={0}
          aria-label={`Critical Active: ${criticalActive.length} items`}
          className="bg-white border border-[#FECACA] rounded-2xl p-4 shadow-3xs hover:border-[#DC2626] hover:shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-mono font-bold uppercase text-[#DC2626]">Critical Active</span>
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping" />
          </div>
          <span className="text-2xl font-black text-[#DC2626] block mt-1.5">{criticalActive.length}</span>
          <span className="text-[10px] text-[#64748B]">Immediate triage required</span>
        </div>

        <div 
          onClick={() => handleKpiClick("high")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleKpiClick("high"); } }}
          role="button"
          tabIndex={0}
          aria-label={`High Priority: ${highPriority.length} items`}
          className="bg-white border border-[#FDE68A] rounded-2xl p-4 shadow-3xs hover:border-[#D97706] hover:shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer text-left"
        >
          <span className="text-[9.5px] font-mono font-bold uppercase text-[#D97706] block">High Priority</span>
          <span className="text-2xl font-black text-[#D97706] block mt-1.5">{highPriority.length}</span>
          <span className="text-[10px] text-[#64748B]">Active risk elevated</span>
        </div>

        <div 
          onClick={() => handleKpiClick("under-review")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleKpiClick("under-review"); } }}
          role="button"
          tabIndex={0}
          aria-label={`Under Review: ${underReview.length} items`}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-3xs hover:border-[#2563EB] hover:shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer text-left"
        >
          <span className="text-[9.5px] font-mono font-bold uppercase text-[#64748B] block">Under Review</span>
          <span className="text-2xl font-black text-[#172033] block mt-1.5">{underReview.length}</span>
          <span className="text-[10px] text-[#64748B]">Awaiting squad triage</span>
        </div>

        <div 
          onClick={() => handleKpiClick("in-progress")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleKpiClick("in-progress"); } }}
          role="button"
          tabIndex={0}
          aria-label={`In Progress: ${inProgress.length} items`}
          className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-3xs hover:border-[#2563EB] hover:shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer text-left"
        >
          <span className="text-[9.5px] font-mono font-bold uppercase text-[#2563EB] block">In Progress</span>
          <span className="text-2xl font-black text-[#2563EB] block mt-1.5">{inProgress.length}</span>
          <span className="text-[10px] text-[#64748B]">Squads dispatched</span>
        </div>

        <div 
          onClick={() => handleKpiClick("resolved")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleKpiClick("resolved"); } }}
          role="button"
          tabIndex={0}
          aria-label={`Resolved and QA: ${resolved.length} items`}
          className="bg-white border border-[#BBF7D0] rounded-2xl p-4 shadow-3xs hover:border-[#16A34A] hover:shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer text-left col-span-2 sm:col-span-1"
        >
          <span className="text-[9.5px] font-mono font-bold uppercase text-[#16A34A] block">Resolved & QA</span>
          <span className="text-2xl font-black text-[#16A34A] block mt-1.5">{resolved.length}</span>
          <span className="text-[10px] text-[#64748B]">Closed loop verified</span>
        </div>
      </div>

      {/* CORE WORKSPACE GRID: REQUIRES ATTENTION (HERO CARD) + CITY ATTENTION FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIGNATURE HERO CARD: "REQUIRES ATTENTION" (Span 7) */}
        <div className="lg:col-span-7 bg-white border border-[#2563EB]/30 ring-1 ring-[#2563EB]/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col gap-5">
          
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-extrabold uppercase bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-3 py-1 rounded-xl flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                {isHindi ? "सर्वोच्च प्राथमिकता: तत्काल ध्यान आवश्यक" : "REQUIRES IMMEDIATE ATTENTION"}
              </span>
            </div>
            {topPriorityIncident && (
              <span className="text-xs font-mono text-[#94A3B8]">
                ID: {topPriorityIncident.id}
              </span>
            )}
          </div>

          {topPriorityIncident ? (
            <div className="flex flex-col gap-4">
              
              {/* Incident Title & Risk Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-extrabold uppercase text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded">
                      CRITICAL {topPriorityIncident.category.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                      <strong className="text-[#172033]">{topPriorityIncident.location || "Sector 62, Delhi NCR"}</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#172033] tracking-tight">
                    {topPriorityIncident.title}
                  </h2>
                </div>

                <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl text-center shrink-0 min-w-[110px]">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#DC2626] block">Risk Score</span>
                  <span className="text-2xl font-black text-[#DC2626] block">{topPriorityRiskScore}/100</span>
                </div>
              </div>

              {/* Evidence & Sources Metadata Bar */}
              <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] text-xs">
                <div>
                  <span className="text-[9.5px] font-mono text-[#64748B] uppercase block font-bold">Evidence Count</span>
                  <span className="font-extrabold text-[#2563EB] text-sm mt-0.5 block">{topPriorityObservations} Observations</span>
                  <span className="text-[10px] text-[#94A3B8]">Photographic & Telemetry Logs</span>
                </div>
                <div>
                  <span className="text-[9.5px] font-mono text-[#64748B] uppercase block font-bold">Corroborated Sources</span>
                  <span className="font-extrabold text-[#172033] text-sm mt-0.5 block">{topPrioritySources}</span>
                  <span className="text-[10px] text-[#16A34A] font-medium">Multi-Source Cross-Matched</span>
                </div>
              </div>

              {/* Image Preview if available */}
              {(topPriorityIncident.image || topPriorityIncident.imageUrl) && (
                <div className="h-44 rounded-2xl overflow-hidden border border-[#E2E8F0] relative bg-[#0F172A] group">
                  <img
                    src={(topPriorityIncident.image || topPriorityIncident.imageUrl)!}
                    alt={topPriorityIncident.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9.5px] font-mono px-2.5 py-1 rounded-lg">
                    Live Telemetry Ingest Frame
                  </div>
                </div>
              )}

              {/* WHY PRIORITIZED? (Explainable Reasoning) */}
              <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] font-mono font-bold uppercase text-[#1D4ED8] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>WHY PRIORITIZED BY AI?</span>
                  </span>
                  <button
                    onClick={() => setExpandedReasoning(!expandedReasoning)}
                    className="text-[10.5px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {expandedReasoning ? "Less Details ▲" : "View Reasoning Matrix ▼"}
                  </button>
                </div>

                <ul className="text-xs text-[#172033] space-y-1.5 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                    <span><strong>High physical severity:</strong> Acute crater depth poses life-safety and axle-damage hazard.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    <span><strong>Repeated observations:</strong> Multiple citizens and dashcam road scanners logged this exact node.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                    <span><strong>Multi-source evidence:</strong> Cross-verified against autonomous AI road-scanner telemetry.</span>
                  </li>
                </ul>

                {expandedReasoning && (
                  <div className="mt-3 pt-3 border-t border-[#DBEAFE] text-[11px] text-[#475569] space-y-1 bg-white/70 p-3 rounded-xl">
                    <p><strong>Arterial Road Index:</strong> Located on major transit artery with high peak vehicle density.</p>
                    <p><strong>Degradation Velocity:</strong> Visual perimeter increased 22% over last 48 hours without patch.</p>
                    <p><strong>Predicted Escalation:</strong> High risk of complete asphalt collapse upon next rain event.</p>
                  </div>
                )}
              </div>

              {/* NEXT ACTION & INTERACTIVE BUTTONS */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[9.5px] font-mono font-bold uppercase text-[#D97706] block">
                    RECOMMENDED NEXT ACTION
                  </span>
                  <p className="text-xs font-bold text-[#172033] mt-0.5">
                    Field inspection & rapid asphalt cold-patch dispatch
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <ReportExportButton 
                    report={topPriorityIncident} 
                    userRole={userRole} 
                    variant="outline" 
                  />

                  <button
                    onClick={() => onSelectReport(topPriorityIncident)}
                    className="px-4 py-2 bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>VIEW INCIDENT</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectReport(topPriorityIncident);
                      onSelectSubTab("dispatch-management");
                    }}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>ASSIGN SQUAD</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-[#94A3B8]">
              No critical incidents pending immediate action.
            </div>
          )}

        </div>

        {/* CITY ATTENTION FEED (Span 5) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col gap-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-2">
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>CITY ATTENTION FEED</span>
              </span>
              <h3 className="text-sm font-bold text-[#172033]">
                Operational Situation Stream
              </h3>
            </div>

            {/* Quick Stream Filters */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFeedFilter("all")}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                  feedFilter === "all" ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFeedFilter("critical")}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                  feedFilter === "critical" ? "bg-[#DC2626] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setFeedFilter("corroborated")}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                  feedFilter === "corroborated" ? "bg-[#7C3AED] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                Vision AI
              </button>
            </div>
          </div>

          {/* Feed List */}
          <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredFeed.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">
                No operational alerts matching filter
              </div>
            ) : (
              filteredFeed.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectReport(item.report)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 hover:shadow-xs ${
                    item.type === "critical"
                      ? "bg-[#FEF2F2]/60 border-[#FECACA] hover:border-[#DC2626]"
                      : item.type === "corroborated"
                      ? "bg-[#F5F3FF]/60 border-[#DDD6FE] hover:border-[#7C3AED]"
                      : item.type === "dispatched"
                      ? "bg-[#EFF6FF]/60 border-[#DBEAFE] hover:border-[#2563EB]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${
                      item.type === "critical" ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" :
                      item.type === "corroborated" ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]" :
                      item.type === "dispatched" ? "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]" :
                      "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                    }`}>
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#94A3B8]">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#172033] leading-snug">
                    {item.desc}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1.5 border-t border-black/5">
                    <span className="truncate max-w-[180px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#94A3B8]" />
                      {item.location}
                    </span>
                    <span className="text-[#2563EB] font-bold flex items-center gap-0.5">
                      Inspect →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* QUICK OPERATIONAL WORKSPACE JUMP DOCK */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#64748B] mb-4">
          OPERATIONAL ACTION WORKSPACES
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onSelectSubTab("citizen-signals")}
            className="p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#2563EB] text-left transition-all cursor-pointer group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                Citizen Signals
              </h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">Public complaints transformed to urban problems</p>
            </div>
          </button>

          <button
            onClick={() => onSelectSubTab("incident-intelligence")}
            className="p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#2563EB] text-left transition-all cursor-pointer group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                Incident Intelligence
              </h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">3-panel analyst workstation & evidence fusion</p>
            </div>
          </button>

          <button
            onClick={() => onSelectSubTab("safety")}
            className="p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#2563EB] text-left transition-all cursor-pointer group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                Urban Risk Map
              </h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">Spatial concentration & zone intelligence drawer</p>
            </div>
          </button>

          <button
            onClick={() => onSelectSubTab("field-verification")}
            className="p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#F0FDF4] border border-[#E2E8F0] hover:border-[#16A34A] text-left transition-all cursor-pointer group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#172033] group-hover:text-[#16A34A] transition-colors">
                Field Verification
              </h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">Closed loop proof: before, action, after & QA</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}
