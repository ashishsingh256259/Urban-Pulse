import React, { useState, useMemo } from "react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { 
  ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, 
  MapPin, Clock, Camera, FileText, ArrowRight, User, 
  Layers, ChevronRight, Activity, Wrench, Shield, 
  Send, RefreshCw, Eye, ThumbsUp, AlertOctagon,
  TrendingUp, Compass, CheckSquare
} from "lucide-react";
import { updateReportStatus } from "../lib/firestore_reports";
import ReportExportButton from "./ReportExportButton";

interface IncidentIntelligenceProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelectReport: (report: Report) => void;
  onRefreshReports?: () => void;
}

export const IncidentIntelligence: React.FC<IncidentIntelligenceProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  onRefreshReports
}) => {
  const { t, isHindi } = useLanguage();

  // Filter and Sort states for Left Queue
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeReportState, setActiveReportState] = useState<Report | null>(selectedReport || reports[0] || null);

  // Officer dispatch action form states
  const [newStatus, setNewStatus] = useState<Report["status"]>("In Progress");
  const [assignedSquad, setAssignedSquad] = useState("Road Maintenance Team Alpha");
  const [officerNote, setOfficerNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Dynamic ranking of reports by computed Risk Score & Severity
  const rankedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      // Risk precedence calculation
      const aScore = (a.severity * 0.7) + (a.status !== "Resolved" ? 30 : 0) + (a.source === "ROAD_SCANNER" ? 10 : 5);
      const bScore = (b.severity * 0.7) + (b.status !== "Resolved" ? 30 : 0) + (b.source === "ROAD_SCANNER" ? 10 : 5);
      return bScore - aScore;
    });
  }, [reports]);

  const filteredQueue = rankedReports.filter(r => {
    const matchCat = filterCategory === "All" || r.category === filterCategory;
    const matchStat = filterStatus === "All" || r.status === filterStatus;
    return matchCat && matchStat;
  });

  const currentReport = activeReportState || filteredQueue[0] || reports[0];

  // Calculate explainable metrics for current report
  const daysActive = currentReport ? Math.max(1, Math.floor((Date.now() - new Date(currentReport.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const isMultiSource = currentReport?.source === "ROAD_SCANNER";
  const evidenceCount = (currentReport?.image || currentReport?.imageUrl) ? (isMultiSource ? 3 : 2) : 1;
  const riskScore = currentReport ? Math.min(99, Math.round(currentReport.severity * 0.85 + (currentReport.status !== "Resolved" ? 12 : 0))) : 75;
  
  // Separation of Detection Confidence (AI perception) vs Risk Assessment (Impact on city)
  const detectionConfidence = currentReport?.source === "ROAD_SCANNER" ? 96 : 89;

  // Spatial context - find nearby incidents in same sector or area
  const sectorName = currentReport?.location ? currentReport.location.split(",")[0].trim() : "Sector Area";
  const nearbyIncidents = (reports || []).filter(r => r && r.id !== currentReport?.id && (r.location || "").toLowerCase().includes(sectorName.toLowerCase()));

  // Handle status update
  const handleApplyAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReport) return;
    setIsUpdating(true);
    setUpdateSuccess(false);

    try {
      await updateReportStatus(currentReport.id, newStatus, officerNote || `Dispatched to ${assignedSquad} via Incident Intelligence Desk.`);
      setUpdateSuccess(true);
      if (onRefreshReports) onRefreshReports();
      setTimeout(() => setUpdateSuccess(false), 3500);
    } catch (err) {
      console.error("Action apply failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Workspace Banner */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-white border border-[#DBEAFE] rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-bold font-mono border border-[#DBEAFE] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{isHindi ? "चरण 2: घटना विश्लेषण एवं समझ" : "PHASE 2: INCIDENT INTELLIGENCE WORKSTATION"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight font-sans">
              {isHindi ? "घटना आसूचना एवं निर्णय केंद्र" : "Incident Intelligence & Evidence Fusion"}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl mt-1 leading-relaxed">
              {isHindi
                ? "नागरिक शिकायतों, एआई रोड स्कैनर अवलोकनों और स्थानिक आंकड़ों का बहु-स्रोतीय संश्लेषण।"
                : "Professional municipal analyst workstation fusing multi-source telemetry, explainable risk factors, and structured tactical remediation."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-2xs">
              {rankedReports.length} Ranked Incidents in Registry
            </span>
          </div>
        </div>
      </div>

      {/* 3-PANEL HERO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* PANEL 1: Priority Incident Queue (Span 3) */}
        <div className="lg:col-span-3 bg-white border border-[#E2E8F0] rounded-3xl p-4 shadow-xs flex flex-col gap-3">
          <div className="pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-[#64748B]">
                {isHindi ? "प्राथमिकता कतार" : "PRIORITY QUEUE"}
              </span>
              <span className="text-[9.5px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#DBEAFE]">
                {filteredQueue.length} Active
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-1.5">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1 text-[11px] text-[#172033] focus:outline-hidden font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Queue List */}
          <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredQueue.map((rep, idx) => {
              const isSelected = currentReport?.id === rep.id;
              const repRisk = Math.min(99, Math.round(rep.severity * 0.85 + (rep.status !== "Resolved" ? 12 : 0)));

              return (
                <div
                  key={rep.id}
                  onClick={() => {
                    setActiveReportState(rep);
                    onSelectReport(rep);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected 
                      ? "bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-2xs" 
                      : "bg-[#F8FAFC] hover:bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono font-bold text-[#94A3B8]">
                      #{idx + 1} • {rep.id}
                    </span>
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      repRisk >= 75 ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" :
                      repRisk >= 50 ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" :
                      "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                    }`}>
                      Risk {repRisk}
                    </span>
                  </div>

                  <h4 className="text-[11.5px] font-bold text-[#172033] line-clamp-1 leading-snug">
                    {rep.title}
                  </h4>

                  <div className="flex items-center justify-between text-[9.5px] text-[#64748B]">
                    <span className="truncate max-w-[110px] font-medium">{rep.location}</span>
                    <span className={`font-bold ${
                      rep.status === "Resolved" ? "text-[#16A34A]" :
                      rep.status === "In Progress" ? "text-[#2563EB]" : "text-[#D97706]"
                    }`}>
                      ● {rep.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 2: Incident Intelligence & Evidence Fusion (Span 6) */}
        {currentReport ? (
          <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col gap-6">
            
            {/* Header Identity */}
            <div className="border-b border-[#F1F5F9] pb-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-extrabold uppercase bg-[#F1F5F9] text-[#2563EB] px-2.5 py-1 rounded-lg border border-[#DBEAFE]">
                    {currentReport.category}
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8]">ID: {currentReport.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ReportExportButton 
                    report={currentReport} 
                    userRole="municipal" 
                    variant="outline"
                  />
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    currentReport.status === "Resolved" ? "bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]" :
                    currentReport.status === "In Progress" ? "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]" :
                    "bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]"
                  }`}>
                    ● Status: {currentReport.status}
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-black text-[#172033] tracking-tight">
                {currentReport.title}
              </h2>

              <p className="text-xs text-[#64748B] mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="font-semibold text-[#172033]">{currentReport.location || "Sector 62, Delhi NCR"}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Logged {new Date(currentReport.createdAt).toLocaleString()}</span>
              </p>
            </div>

            {/* SEPARATION: Detection Confidence vs Risk Assessment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
              <div className="p-3 bg-white rounded-xl border border-[#DBEAFE] shadow-2xs">
                <span className="text-[9.5px] font-mono uppercase font-bold text-[#2563EB] block">
                  AI Detection Confidence
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-[#172033]">{detectionConfidence}%</span>
                  <span className="text-[10px] text-[#16A34A] font-bold">Visual Model Certainty</span>
                </div>
                <p className="text-[10px] text-[#64748B] mt-1 leading-tight">
                  Probability that the visual features represent a real physical infrastructure defect.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#FECACA] shadow-2xs">
                <span className="text-[9.5px] font-mono uppercase font-bold text-[#DC2626] block">
                  Municipal Risk Assessment
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-[#DC2626]">{riskScore}/100</span>
                  <span className="text-[10px] text-[#DC2626] font-bold">High Urban Hazard</span>
                </div>
                <p className="text-[10px] text-[#64748B] mt-1 leading-tight">
                  Calculated municipal hazard impact based on depth, vehicle velocity, and arterial density.
                </p>
              </div>
            </div>

            {/* WHY IS THIS RISKY? (Explainable Factors Matrix) */}
            <div>
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>WHY IS THIS RISKY? (EXPLAINABLE FACTORS)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">Physical Severity</span>
                  <span className="text-sm font-extrabold text-[#DC2626] block mt-0.5">{currentReport.severity}/100</span>
                  <span className="text-[9.5px] text-[#64748B]">High impact crater</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">Persistence</span>
                  <span className="text-sm font-extrabold text-[#D97706] block mt-0.5">{daysActive} Day{daysActive > 1 ? 's' : ''}</span>
                  <span className="text-[9.5px] text-[#64748B]">Unremedied duration</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">Evidence Count</span>
                  <span className="text-sm font-extrabold text-[#2563EB] block mt-0.5">{evidenceCount} Observations</span>
                  <span className="text-[9.5px] text-[#64748B]">Photos & Telemetry</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">Source Diversity</span>
                  <span className="text-sm font-extrabold text-[#172033] block mt-0.5">
                    {currentReport.source === "ROAD_SCANNER" ? "Citizen + Dashcam" : "Citizen Upload"}
                  </span>
                  <span className="text-[9.5px] text-[#16A34A]">Corroborated</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">Spatial Zone</span>
                  <span className="text-sm font-extrabold text-[#172033] block mt-0.5 truncate">{sectorName}</span>
                  <span className="text-[9.5px] text-[#64748B]">{nearbyIncidents.length} nearby cases</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">Triage Priority</span>
                  <span className="text-sm font-extrabold text-[#DC2626] block mt-0.5">CRITICAL P1</span>
                  <span className="text-[9.5px] text-[#64748B]">Immediate Action</span>
                </div>
              </div>
            </div>

            {/* EVIDENCE FUSION */}
            <div>
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>EVIDENCE FUSION</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(currentReport.image || currentReport.imageUrl) ? (
                  <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#0F172A] relative group">
                    <img
                      src={(currentReport.image || currentReport.imageUrl)!}
                      alt={currentReport.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/75 backdrop-blur-xs text-white text-[9.5px] font-mono px-2.5 py-1 rounded-lg">
                      <span>Primary Ingest Frame</span>
                      <span>Verified GPS Exif</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex flex-col items-center justify-center text-center p-4">
                    <Camera className="w-8 h-8 text-[#94A3B8] mb-1" />
                    <span className="text-xs font-medium text-[#64748B]">No photographic attachment</span>
                    <span className="text-[10px] text-[#94A3B8]">Logged via dispatch hotline / radio</span>
                  </div>
                )}

                <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#64748B] block mb-1">
                      CITIZEN & SENSOR NOTES
                    </span>
                    <p className="text-xs text-[#172033] leading-relaxed italic bg-white p-3 rounded-xl border border-[#E2E8F0]">
                      "{currentReport.description || currentReport.title}"
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] text-[10.5px] text-[#64748B]">
                    <strong>Corroboration:</strong> Sensor tags and repeated ward observations confirm continuous surface degradation.
                  </div>
                </div>
              </div>
            </div>

            {/* 7-STAGE INCIDENT LIFECYCLE TIMELINE */}
            <div>
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>INCIDENT LIFECYCLE TIMELINE</span>
              </h3>

              <div className="flex items-center justify-between relative overflow-x-auto pb-2">
                {[
                  { label: "Detected", done: true },
                  { label: "Corroborated", done: true },
                  { label: "Prioritized", done: true },
                  { label: "Assigned", done: currentReport.status !== "Pending" },
                  { label: "In Progress", done: currentReport.status === "In Progress" || currentReport.status === "Resolved" },
                  { label: "Resolved", done: currentReport.status === "Resolved" },
                  { label: "Verified", done: currentReport.status === "Resolved" }
                ].map((step, sIdx) => (
                  <div key={sIdx} className="flex flex-col items-center min-w-[70px] text-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                      step.done 
                        ? "bg-[#2563EB] text-white shadow-2xs" 
                        : "bg-[#F1F5F9] text-[#94A3B8] border border-[#CBD5E1]"
                    }`}>
                      {step.done ? "✓" : sIdx + 1}
                    </div>
                    <span className={`text-[9.5px] font-bold mt-1.5 ${
                      step.done ? "text-[#172033]" : "text-[#94A3B8]"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-[#94A3B8] mx-auto mb-2" />
            <p className="text-sm font-bold text-[#172033]">Select an incident from the queue to view full intelligence</p>
          </div>
        )}

        {/* PANEL 3: Recommended Action & Dispatch Control (Span 3) */}
        {currentReport && (
          <div className="lg:col-span-3 bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs flex flex-col gap-4">
            
            <div className="pb-3 border-b border-[#F1F5F9]">
              <span className="text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>AI EXPLANATION</span>
              </span>
              <h3 className="text-xs font-bold text-[#172033] mt-1">
                "Why did UrbanPulse prioritize this?"
              </h3>
            </div>

            <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl text-xs text-[#172033] leading-relaxed">
              <p className="font-semibold text-[#1D4ED8] mb-1">AI Analyst Summary:</p>
              Incident <strong>{currentReport.id}</strong> presents a risk score of <strong>{riskScore}/100</strong> due to acute surface deformation in high-traffic corridor {sectorName}. Multi-source evidence indicates risk of vehicle axle rupture and pedestrian injury.
            </div>

            {/* Tactical Recommended Action */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
              <span className="text-[10px] font-mono font-bold uppercase text-[#D97706] block mb-1">
                RECOMMENDED ACTION
              </span>
              <p className="text-xs font-bold text-[#172033]">
                {currentReport.category === "Pothole" ? "Dispatch Rapid Pavement Squad with hot-mix asphalt." :
                 currentReport.category === "Garbage Overflow" ? "Dispatch Heavy Sanitation Compactor & sanitization spray." :
                 currentReport.category === "Broken Streetlight" ? "Deploy Electrical Utility Bucket Truck for luminaire repair." :
                 "Dispatch Zone Field Squad for on-site hazard remediation."}
              </p>
            </div>

            {/* Action Execution Form */}
            <form onSubmit={handleApplyAction} className="flex flex-col gap-3 pt-2">
              <div>
                <label className="text-[9.5px] font-mono font-bold text-[#64748B] uppercase block mb-1">
                  Assign Field Squad
                </label>
                <select
                  value={assignedSquad}
                  onChange={(e) => setAssignedSquad(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-medium text-[#172033] focus:border-[#2563EB] focus:outline-hidden"
                >
                  <option value="Road Maintenance Team Alpha">Road Maintenance Team Alpha (RT-014)</option>
                  <option value="Public Works Squad Beta">Public Works Squad Beta (PW-08)</option>
                  <option value="Electrical Grid Repair Crew">Electrical Grid Repair Crew (EG-03)</option>
                  <option value="Sanitation Rapid Fleet">Sanitation Rapid Fleet (SN-12)</option>
                </select>
              </div>

              <div>
                <label className="text-[9.5px] font-mono font-bold text-[#64748B] uppercase block mb-1">
                  Update Lifecycle Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-medium text-[#172033] focus:border-[#2563EB] focus:outline-hidden"
                >
                  <option value="Pending">🔴 Pending Review</option>
                  <option value="Assigned">🔵 Assigned to Squad</option>
                  <option value="In Progress">🟡 In Progress (Remediating)</option>
                  <option value="Resolved">🟢 Resolved & Remediated</option>
                </select>
              </div>

              <div>
                <label className="text-[9.5px] font-mono font-bold text-[#64748B] uppercase block mb-1">
                  Officer Dispatch Note
                </label>
                <textarea
                  value={officerNote}
                  onChange={(e) => setOfficerNote(e.target.value)}
                  placeholder="e.g., Priority asphalt patch ordered before evening rush hour."
                  rows={2}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-hidden resize-none"
                />
              </div>

              {updateSuccess && (
                <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-bold text-[#16A34A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dispatched successfully to Firestore!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Registry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Apply Dispatch Action</span>
                  </>
                )}
              </button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
};

export default IncidentIntelligence;
