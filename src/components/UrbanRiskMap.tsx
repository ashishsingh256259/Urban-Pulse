import React, { useState, useMemo } from "react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";
import SimpleMap from "./SimpleMap";
import { 
  MapPin, AlertTriangle, Layers, Filter, Sparkles, 
  ArrowRight, ShieldAlert, CheckCircle2, Eye, X, 
  ChevronRight, Building2, Flame, Wrench, Shield
} from "lucide-react";

interface UrbanRiskMapProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onNavigateToIntelligence?: (report: Report) => void;
  onNavigateToDispatch?: (report: Report) => void;
}

export const UrbanRiskMap: React.FC<UrbanRiskMapProps> = ({
  reports,
  onSelectReport,
  onNavigateToIntelligence,
  onNavigateToDispatch
}) => {
  const { t, isHindi } = useLanguage();

  const [riskFilter, setRiskFilter] = useState<"all" | "road" | "infrastructure" | "sanitation" | "critical">("all");
  const [selectedZone, setSelectedZone] = useState<string | null>("Sector 62");
  const [selectedReportState, setSelectedReportState] = useState<Report | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter reports according to selected risk filter
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (riskFilter === "road") return r.category === "Pothole" || r.category === "Road Obstruction";
      if (riskFilter === "infrastructure") return r.category === "Broken Streetlight" || r.category === "Other";
      if (riskFilter === "sanitation") return r.category === "Garbage Overflow";
      if (riskFilter === "critical") return r.severity >= 70;
      return true;
    });
  }, [reports, riskFilter]);

  // Group reports by Zone / Sector name for zone intelligence
  const zonesMap = useMemo(() => {
    const map = new Map<string, Report[]>();
    (reports || []).forEach(r => {
      if (!r) return;
      const zone = (r.location ? r.location.split(",")[0].trim() : "") || "Central Delhi";
      if (!map.has(zone)) {
        map.set(zone, []);
      }
      map.get(zone)!.push(r);
    });
    return map;
  }, [reports]);

  const activeZoneName = selectedZone || (reports && reports[0] && reports[0].location ? reports[0].location.split(",")[0].trim() : "Sector 62");
  const activeZoneReports = zonesMap.get(activeZoneName) || (reports || []).slice(0, 3);
  
  const zoneAvgSeverity = Math.round(
    activeZoneReports.reduce((sum, r) => sum + (r?.severity || 0), 0) / (activeZoneReports.length || 1)
  );
  const zoneRiskLevel = zoneAvgSeverity >= 70 ? "CRITICAL" : zoneAvgSeverity >= 50 ? "HIGH" : "MODERATE";
  const zoneEvidenceCount = activeZoneReports.filter(r => r && (r.image || r.imageUrl)).length + activeZoneReports.length;

  return (
    <div className="flex flex-col gap-6 text-left relative">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-white border border-[#DBEAFE] rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-bold font-mono border border-[#DBEAFE] mb-2">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{isHindi ? "स्थानिक विश्लेषण" : "SPATIAL RISK INTELLIGENCE"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight font-sans">
              {isHindi ? "शहरी जोखिम मानचित्र" : "Urban Risk Map"}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl mt-1 leading-relaxed">
              {isHindi
                ? "स्थानिक विश्लेषण: 'शहरी जोखिम कहाँ केंद्रित है?' - जोखिम क्षेत्र पर क्लिक कर इंटेलिजेंस ड्रावर खोलें।"
                : "Answers: 'Where is urban risk concentrated?' Click any risk zone cluster or marker to open the actionable Intelligence Drawer."}
            </p>
          </div>

          {/* Quick Zone Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {Array.from(zonesMap.keys()).slice(0, 3).map((z) => (
              <button
                key={z}
                onClick={() => {
                  setSelectedZone(z);
                  setIsDrawerOpen(true);
                  const firstInZone = zonesMap.get(z)?.[0];
                  if (firstInZone) setSelectedReportState(firstInZone);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedZone === z 
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-2xs" 
                    : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                📍 {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Layer Filters Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-[#64748B] mr-1">
            RISK LAYERS:
          </span>

          <button
            onClick={() => setRiskFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              riskFilter === "all" ? "bg-[#2563EB] text-white shadow-2xs" : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            All Risks ({reports.length})
          </button>

          <button
            onClick={() => setRiskFilter("road")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              riskFilter === "road" ? "bg-[#2563EB] text-white shadow-2xs" : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            🚧 Road Risk ({reports.filter(r => r.category === "Pothole" || r.category === "Road Obstruction").length})
          </button>

          <button
            onClick={() => setRiskFilter("infrastructure")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              riskFilter === "infrastructure" ? "bg-[#2563EB] text-white shadow-2xs" : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            💡 Infrastructure ({reports.filter(r => r.category === "Broken Streetlight" || r.category === "Other").length})
          </button>

          <button
            onClick={() => setRiskFilter("sanitation")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              riskFilter === "sanitation" ? "bg-[#2563EB] text-white shadow-2xs" : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            🚮 Waterlogging & Waste ({reports.filter(r => r.category === "Garbage Overflow").length})
          </button>

          <button
            onClick={() => setRiskFilter("critical")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              riskFilter === "critical" ? "bg-[#DC2626] text-white shadow-2xs" : "bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]"
            }`}
          >
            🔥 High Risk Only ({reports.filter(r => r.severity >= 70).length})
          </button>
        </div>

        <div className="text-xs font-mono text-[#64748B] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span>GIS Coordinates Live</span>
        </div>
      </div>

      {/* Main Map + Side Intelligence Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Leaflet Map */}
        <div className={`${isDrawerOpen && selectedReportState ? "lg:col-span-8" : "lg:col-span-12"} bg-white border border-[#E2E8F0] rounded-3xl p-4 shadow-xs transition-all duration-200`}>
          <div className="flex items-center justify-between mb-3 px-2">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">
                National Capital Region Spatial Matrix
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Interactive risk heat overlay • Click markers or ward zones to inspect cluster
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-lg border border-[#DBEAFE]">
              {filteredReports.length} Map Points Active
            </span>
          </div>

          <div className="h-[520px] rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-inner">
            <SimpleMap
              reports={filteredReports}
              selectedReport={selectedReportState}
              onSelectReport={(rep) => {
                if (!rep) return;
                setSelectedReportState(rep);
                const zone = (rep.location ? rep.location.split(",")[0].trim() : "") || "Sector 62";
                setSelectedZone(zone);
                setIsDrawerOpen(true);
                onSelectReport(rep);
              }}
            />
          </div>
        </div>

        {/* SIGNATURE INTERACTION: Zone Intelligence Drawer (Span 4) */}
        {isDrawerOpen && selectedReportState && (
          <div className="lg:col-span-4 bg-white border border-[#2563EB]/30 ring-1 ring-[#2563EB]/10 rounded-3xl p-5 shadow-sm flex flex-col gap-4 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9.5px] font-mono font-bold uppercase text-[#2563EB] block">
                    GIS INCIDENT INSPECTOR
                  </span>
                  <h3 className="text-sm font-black text-[#172033] leading-tight">
                    {activeZoneName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  zoneRiskLevel === "CRITICAL" ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" :
                  zoneRiskLevel === "HIGH" ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" :
                  "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                }`}>
                  {zoneRiskLevel} RISK
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDrawerOpen(false);
                    setSelectedReportState(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                  title="Close Inspector"
                  aria-label="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Key Metrics of this Zone */}
          <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] text-center">
            <div>
              <span className="text-[8.5px] font-mono text-[#64748B] uppercase block">Active Incidents</span>
              <span className="text-base font-black text-[#172033] mt-0.5 block">{activeZoneReports.length}</span>
            </div>
            <div>
              <span className="text-[8.5px] font-mono text-[#64748B] uppercase block">Total Evidence</span>
              <span className="text-base font-black text-[#2563EB] mt-0.5 block">{zoneEvidenceCount}</span>
            </div>
            <div>
              <span className="text-[8.5px] font-mono text-[#64748B] uppercase block">Avg Severity</span>
              <span className="text-base font-black text-[#DC2626] mt-0.5 block">{zoneAvgSeverity}/100</span>
            </div>
          </div>

          {/* WHY FLAGGED */}
          <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl">
            <span className="text-[10px] font-mono font-bold uppercase text-[#1D4ED8] block mb-1">
              WHY FLAGGED BY AI:
            </span>
            <ul className="text-xs text-[#172033] space-y-1 font-medium">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                <span>Repeated hazard observations in arterial corridor.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                <span>Multi-source verification (Citizen uploads + Road scanner).</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                <span>Recent high-severity escalation logged within 48h.</span>
              </li>
            </ul>
          </div>

          {/* RELATED INCIDENTS IN THIS ZONE */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#64748B] block mb-2">
              RELATED ZONE INCIDENTS ({activeZoneReports.length})
            </span>

            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {activeZoneReports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => {
                    setSelectedReportState(rep);
                    onSelectReport(rep);
                  }}
                  className="p-2.5 bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#2563EB] rounded-xl text-left cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[11.5px] font-bold text-[#172033] truncate">{rep.title}</h5>
                    <span className="text-[9.5px] text-[#64748B]">{rep.category} • Severity {rep.severity}</span>
                  </div>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    rep.status === "Resolved" ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" :
                    rep.status === "In Progress" ? "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]" :
                    "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                  }`}>
                    {rep.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RECOMMENDED ACTION & QUICK ACTION BUTTONS */}
          <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs">
              <span className="text-[9.5px] font-mono text-[#D97706] font-bold uppercase block mb-0.5">
                Recommended Action:
              </span>
              <p className="font-bold text-[#172033]">
                Deploy Zone Road Maintenance Squad to resurface arterial cluster in {activeZoneName}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {onNavigateToIntelligence && selectedReportState && (
                <button
                  onClick={() => onNavigateToIntelligence(selectedReportState)}
                  className="py-2 px-3 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze Case</span>
                </button>
              )}

              {onNavigateToDispatch && selectedReportState && (
                <button
                  onClick={() => onNavigateToDispatch(selectedReportState)}
                  className="py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Dispatch Squad</span>
                </button>
              )}
            </div>
          </div>

        </div>
        )}

      </div>

    </div>
  );
};

export default UrbanRiskMap;
