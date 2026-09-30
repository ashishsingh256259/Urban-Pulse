import React, { useState } from "react";
import { Report, isEmergencySosReport } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { 
  Radio, MessageSquare, ArrowRight, Camera, MapPin, 
  Clock, AlertTriangle, ShieldCheck, CheckCircle2, 
  Sparkles, Filter, Search, User, Eye, ArrowUpRight
} from "lucide-react";

interface CitizenSignalsProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onNavigateToIntelligence?: (report: Report) => void;
}

export const CitizenSignals: React.FC<CitizenSignalsProps> = ({
  reports,
  onSelectReport,
  onNavigateToIntelligence
}) => {
  const { t, isHindi } = useLanguage();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<Report | null>(reports[0] || null);

  // Filter citizen reports (strictly public manual civic reports, excluding vehicle road scanner and emergency SOS beacons)
  const citizenReports = (reports || []).filter(r => r && (r.source === "MANUAL_REPORT" || (r as any).source === "CITIZEN" || !r.source) && r.source !== "ROAD_SCANNER" && !isEmergencySosReport(r));
  
  const filteredSignals = citizenReports.filter(r => {
    if (!r) return false;
    const matchesCat = categoryFilter === "All" || r.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesSearch = 
      (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  const activeSignal = selectedSignal || filteredSignals[0] || (reports && reports[0]) || null;

  const categories = Array.from(new Set(citizenReports.map(r => r?.category).filter(Boolean)));

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header Banner - Empathize Concept */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/40 to-white border border-blue-100 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold font-mono border border-blue-200 mb-2">
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>{isHindi ? "चरण 1: समानुभूति (EMPATHIZE)" : "PHASE 1: EMPATHIZE"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
              {isHindi ? "नागरिक सिग्नल → शहरी समस्या" : "Citizen Signals → Structured Urban Problems"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
              {isHindi
                ? "अर्बनपल्स नागरिकों की वास्तविक शिकायतों और तस्वीरों को एआई के माध्यम से संरचित, प्राथमिकता-योग्य शहरी समस्याओं में बदलता है।"
                : "Every municipal intervention starts with the citizen voice. Unstructured citizen complaints and camera uploads are transformed into classified, machine-actionable urban hazards."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs text-center min-w-[100px]">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">
                {isHindi ? "नागरिक सिग्नल" : "Citizen Signals"}
              </span>
              <span className="text-xl font-black text-blue-600 block mt-0.5">
                {citizenReports.length}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs text-center min-w-[100px]">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">
                {isHindi ? "सत्यापित साक्ष्य" : "Evidence Ratio"}
              </span>
              <span className="text-xl font-black text-emerald-600 block mt-0.5">
                {Math.round((citizenReports.filter(r => (r.image || r.imageUrl)).length / (citizenReports.length || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Transformation Stage */}
      {activeSignal && (
        <div className="bg-white border border-blue-200 ring-1 ring-blue-500/10 rounded-2xl p-5 shadow-sm text-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-blue-600 tracking-wider bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {isHindi ? "सिग्नल रूपांतरण अन्वेषक" : "Live Signal Transformation Inspector"}
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {activeSignal.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectReport(activeSignal)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isHindi ? "पूर्ण रिपोर्ट देखें" : "View Full Report"}</span>
              </button>
              {onNavigateToIntelligence && (
                <button
                  onClick={() => onNavigateToIntelligence(activeSignal)}
                  className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isHindi ? "इंटेलिजेंस में जांचें" : "Open in Intelligence"}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Side by Side Transformation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left: Raw Citizen Voice (EMPATHIZE) */}
            <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <User className="w-3 h-3 text-[#D97706]" />
                    {isHindi ? "नागरिक की आवाज़ (कच्चा इनपुट)" : "RAW CITIZEN SIGNAL"}
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    {new Date(activeSignal.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs mb-4">
                  <p className="text-xs sm:text-sm font-semibold text-[#172033] italic leading-relaxed">
                    "{activeSignal.description || activeSignal.title}"
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="font-medium truncate max-w-[180px]">{activeSignal.location || "Sector 62, Delhi NCR"}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      {activeSignal.reporterEmail ? activeSignal.reporterEmail.split("@")[0] : "Citizen Reporter"}
                    </span>
                  </div>
                </div>

                {/* Evidence Photo Preview */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#64748B] block mb-1.5">
                    {isHindi ? "संलग्न नागरिक साक्ष्य (Evidence)" : "UPLOADED CITIZEN EVIDENCE"}
                  </span>
                  {(activeSignal.image || activeSignal.imageUrl) ? (
                    <div className="h-40 rounded-xl overflow-hidden border border-[#E2E8F0] relative bg-[#0F172A] group">
                      <img 
                        src={(activeSignal.image || activeSignal.imageUrl)!} 
                        alt="Citizen Upload Evidence" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[9.5px] font-mono px-2 py-0.5 rounded">
                        GPS Verified Coordinate Ingest
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white flex flex-col items-center justify-center text-center p-3">
                      <Camera className="w-6 h-6 text-[#94A3B8] mb-1" />
                      <span className="text-[11px] font-medium text-[#64748B]">
                        {isHindi ? "कोई फ़ोटो संलग्न नहीं" : "No uploaded image file"}
                      </span>
                      <span className="text-[9.5px] text-[#94A3B8]">Text-only citizen report</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-[10.5px] text-[#64748B]">
                <strong>Empathy Insight:</strong> Direct citizen submission logged through web or mobile reporting portal.
              </div>
            </div>

            {/* Middle: AI Conversion Bridge */}
            <div className="lg:col-span-2 flex lg:flex-col items-center justify-center gap-2 py-2">
              <div className="h-px lg:h-12 w-12 lg:w-px bg-[#2563EB]/40" />
              <div className="w-10 h-10 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-[#2563EB] uppercase tracking-wider text-center">
                AI Vision & NLP
              </span>
              <div className="h-px lg:h-12 w-12 lg:w-px bg-[#2563EB]/40" />
            </div>

            {/* Right: Structured Urban Problem (DEFINE & PRIORITIZE) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#EFF6FF] to-[#F8FAFC] border border-[#BFDBFE] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#1D4ED8] bg-[#DBEAFE] border border-[#BFDBFE] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#2563EB]" />
                    {isHindi ? "संरचित शहरी समस्या" : "STRUCTURED URBAN PROBLEM"}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    activeSignal.severity >= 75 ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" :
                    activeSignal.severity >= 45 ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" :
                    "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                  }`}>
                    Risk: {activeSignal.severity}/100 ({activeSignal.riskLevel || 'Medium'})
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-[#DBEAFE] shadow-2xs mb-4">
                  <h3 className="text-sm font-bold text-[#172033]">
                    {activeSignal.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#F1F5F9] text-xs">
                    <div>
                      <span className="text-[9.5px] font-mono text-[#64748B] uppercase block">
                        Category Classification
                      </span>
                      <span className="font-bold text-[#2563EB]">{activeSignal.category}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-[#64748B] uppercase block">
                        Remediation Department
                      </span>
                      <span className="font-bold text-[#172033]">
                        {activeSignal.category === "Pothole" || activeSignal.category === "Road Obstruction" ? "Public Works (Roads)" :
                         activeSignal.category === "Garbage Overflow" ? "Sanitation & Waste" :
                         activeSignal.category === "Broken Streetlight" ? "Electrical Infrastructure" : "Municipal Rapid Team"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Machine Actionable Vectors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-xl border border-[#DBEAFE] text-xs">
                    <span className="text-[#64748B] font-medium">Lifecycle Dispatch State:</span>
                    <span className="font-mono font-bold text-[#172033] bg-[#F1F5F9] px-2 py-0.5 rounded">
                      {activeSignal.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-xl border border-[#DBEAFE] text-xs">
                    <span className="text-[#64748B] font-medium">Urban Impact Severity:</span>
                    <span className="font-mono font-bold text-[#DC2626]">
                      {activeSignal.severity >= 75 ? "CRITICAL SAFETY RISK" : activeSignal.severity >= 45 ? "MODERATE HAZARD" : "LOW CIVIC DEFECT"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#DBEAFE] flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#2563EB]">
                  ✓ Converted to Municipal Ticket
                </span>
                <button
                  onClick={() => onSelectReport(activeSignal)}
                  className="text-xs font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Manage Lifecycle →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Filter and Grid of Citizen Signals */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
          <div>
            <h2 className="text-base font-bold text-[#172033]">
              {isHindi ? "सभी नागरिक सिग्नल फीड" : "Citizen Signals Stream"} ({filteredSignals.length})
            </h2>
            <p className="text-xs text-[#64748B]">
              {isHindi ? "समीक्षा और कार्रवाई के लिए नागरिक इनपुट्स चुनें" : "Select any signal to inspect empathy conversion and initiate municipal response."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search.placeholder", "Filter signals...")}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-[#172033] focus:border-[#2563EB] focus:outline-hidden"
              />
            </div>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#172033] focus:border-[#2563EB] focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#172033] focus:border-[#2563EB] focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Signals Grid */}
        {filteredSignals.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl my-4">
            <Radio className="w-10 h-10 text-[#94A3B8] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#172033]">No citizen signals match filter</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Try resetting search query or category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
            {filteredSignals.map((signal) => {
              const isSelected = activeSignal?.id === signal.id;

              return (
                <div
                  key={signal.id}
                  onClick={() => setSelectedSignal(signal)}
                  className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                    isSelected 
                      ? "bg-[#EFF6FF]/60 border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs" 
                      : "bg-[#F8FAFC] hover:bg-white border-[#E2E8F0] hover:border-[#CBD5E1] shadow-3xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[9.5px] font-mono font-bold text-[#2563EB] bg-white border border-[#DBEAFE] px-2 py-0.5 rounded">
                        {signal.category}
                      </span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                        signal.status === "Resolved" ? "bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]" :
                        signal.status === "In Progress" ? "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]" :
                        "bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]"
                      }`}>
                        {signal.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#172033] line-clamp-1">
                      {signal.title}
                    </h4>
                    
                    <p className="text-[11px] text-[#64748B] mt-1.5 italic line-clamp-2 leading-relaxed bg-white p-2 rounded-lg border border-[#E2E8F0]">
                      "{signal.description || signal.title}"
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B]">
                    <span className="truncate max-w-[140px] font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#94A3B8]" />
                      {signal.location}
                    </span>
                    <span className="font-mono text-[#94A3B8]">
                      {new Date(signal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};

export default CitizenSignals;
