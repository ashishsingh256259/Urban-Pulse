import React, { useState } from "react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { 
  Radio, Wrench, Clock, CheckCircle2, ArrowRight, 
  MapPin, AlertTriangle, User, RefreshCw, Send, 
  ShieldCheck, Eye, Sparkles, Filter, ChevronRight
} from "lucide-react";
import { updateReportStatus } from "../lib/firestore_reports";

interface DispatchResponseBoardProps {
  reports: Report[];
  currentUserName: string;
  currentUserEmail: string;
  onSelectReport: (report: Report) => void;
  onRefreshReports?: () => void;
}

export const DispatchResponseBoard: React.FC<DispatchResponseBoardProps> = ({
  reports,
  currentUserName,
  currentUserEmail,
  onSelectReport,
  onRefreshReports
}) => {
  const { t, isHindi } = useLanguage();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredReports = reports.filter(r => {
    return categoryFilter === "All" || r.category === categoryFilter;
  });

  // 6 Workflow columns
  const columns = [
    {
      id: "needs-assignment",
      title: isHindi ? "आवंटन की आवश्यकता" : "NEEDS ASSIGNMENT",
      statusMatch: ["Pending"],
      color: "border-[#F59E0B] text-[#D97706] bg-[#FFFBEB]",
      dot: "bg-[#F59E0B]",
      nextStatus: "Assigned" as Report["status"],
      nextActionText: isHindi ? "टीम को सौंपें" : "Assign Squad"
    },
    {
      id: "assigned",
      title: isHindi ? "आवंटित" : "ASSIGNED",
      statusMatch: ["Assigned"],
      color: "border-[#3B82F6] text-[#2563EB] bg-[#EFF6FF]",
      dot: "bg-[#2563EB]",
      nextStatus: "In Progress" as Report["status"],
      nextActionText: isHindi ? "कार्य प्रारंभ करें" : "Start Remediation"
    },
    {
      id: "in-progress",
      title: isHindi ? "प्रगति पर" : "IN PROGRESS",
      statusMatch: ["In Progress"],
      color: "border-[#8B5CF6] text-[#7C3AED] bg-[#F5F3FF]",
      dot: "bg-[#7C3AED]",
      nextStatus: "Resolved" as Report["status"],
      nextActionText: isHindi ? "समाधान चिन्हित करें" : "Mark Remediation Complete"
    },
    {
      id: "awaiting-verification",
      title: isHindi ? "सत्यापन की प्रतीक्षा" : "AWAITING VERIFICATION",
      // Items that are resolved but flagged for QA inspection
      statusMatch: ["Resolved"],
      filterExtra: (r: Report) => r.severity >= 65,
      color: "border-[#06B6D4] text-[#0891B2] bg-[#ECFEFF]",
      dot: "bg-[#0891B2]",
      nextStatus: "Resolved" as Report["status"],
      nextActionText: isHindi ? "सत्यापन पूर्ण" : "Sign-off Verification"
    },
    {
      id: "resolved",
      title: isHindi ? "सत्यापित एवं बंद" : "RESOLVED & CLOSED",
      statusMatch: ["Resolved"],
      filterExtra: (r: Report) => r.severity < 65,
      color: "border-[#10B981] text-[#16A34A] bg-[#F0FDF4]",
      dot: "bg-[#16A34A]",
      nextStatus: "In Progress" as Report["status"],
      nextActionText: isHindi ? "पुनः खोलें" : "Reopen if Re-emerged"
    }
  ];

  const handleAdvanceStatus = async (report: Report, nextStatus: Report["status"]) => {
    setUpdatingId(report.id);
    try {
      await updateReportStatus(
        report.id, 
        nextStatus, 
        `Advanced status to ${nextStatus} via Municipal Dispatch Board by ${currentUserName || 'Dispatcher'}`
      );
      if (onRefreshReports) onRefreshReports();
    } catch (err) {
      console.error("Dispatch update failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header Banner - ACT */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-white border border-[#DBEAFE] rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-bold font-mono border border-[#DBEAFE] mb-2">
              <Wrench className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{isHindi ? "चरण 3: नगरपालिका कार्रवाई (ACT)" : "PHASE 3: MUNICIPAL ACTION (ACT)"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight font-sans">
              {isHindi ? "डिस्पैच एवं प्रतिक्रिया बोर्ड" : "Dispatch & Response Board"}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl mt-1 leading-relaxed">
              {isHindi
                ? "प्राथमिकता से फील्ड कार्रवाई तक का संपूर्ण वर्कफ़्लो: असाइन करें, फ़्लीट मॉनिटर करें और स्थिति अपडेट करें।"
                : "Operational Kanban lifecycle: Prioritized → Assigned → Dispatched → Field Action → Resolution → Verification."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#172033] focus:border-[#2563EB] focus:outline-hidden shadow-2xs"
            >
              <option value="All">All Categories ({reports.length})</option>
              <option value="Pothole">Potholes</option>
              <option value="Garbage Overflow">Garbage Overflow</option>
              <option value="Broken Streetlight">Broken Streetlights</option>
              <option value="Road Obstruction">Road Obstructions</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5-Stage Kanban Workflow Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
        {columns.map((col) => {
          const colReports = filteredReports.filter(r => {
            const matchesStatus = col.statusMatch.includes(r.status);
            if (!matchesStatus) return false;
            if (col.filterExtra) return col.filterExtra(r);
            return true;
          });

          return (
            <div
              key={col.id}
              className="bg-white border border-[#E2E8F0] rounded-3xl p-4 shadow-xs flex flex-col gap-3 min-h-[520px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <h3 className="text-xs font-mono font-black uppercase text-[#172033]">
                    {col.title}
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${col.color}`}>
                  {colReports.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                {colReports.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#F1F5F9] rounded-2xl text-[11px] text-[#94A3B8] my-auto">
                    No incidents in this phase
                  </div>
                ) : (
                  colReports.map((rep) => {
                    const isUpdating = updatingId === rep.id;

                    return (
                      <div
                        key={rep.id}
                        onClick={() => onSelectReport(rep)}
                        className="bg-[#F8FAFC] hover:bg-white border border-[#E2E8F0] hover:border-[#2563EB] p-3.5 rounded-2xl transition-all cursor-pointer shadow-3xs hover:shadow-xs flex flex-col justify-between gap-2.5 text-left group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-[#2563EB] bg-white border border-[#DBEAFE] px-1.5 py-0.5 rounded">
                              {rep.category}
                            </span>
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              rep.severity >= 75 ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" :
                              rep.severity >= 45 ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" :
                              "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                            }`}>
                              Risk {rep.severity}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-[#172033] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                            {rep.title}
                          </h4>

                          <p className="text-[10px] text-[#64748B] flex items-center gap-1 mt-1 truncate">
                            <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                            <span className="truncate">{rep.location || "Delhi NCR Corridor"}</span>
                          </p>
                        </div>

                        {/* Assigned Squad Badge if assigned */}
                        <div className="p-2 bg-white rounded-xl border border-[#E2E8F0] text-[9.5px]">
                          <span className="text-[#94A3B8] uppercase block text-[8px] font-mono">Assigned Squad:</span>
                          <span className="font-bold text-[#172033] truncate block">
                            {rep.assignedTo ? rep.assignedTo.split("@")[0] : "Road Maintenance Team Alpha"}
                          </span>
                        </div>

                        {/* Quick Advance Action */}
                        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                          <span className="text-[9.5px] font-mono text-[#94A3B8]">
                            {new Date(rep.createdAt).toLocaleDateString()}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(rep, col.nextStatus);
                            }}
                            disabled={isUpdating}
                            className="px-2.5 py-1 bg-[#EFF6FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-[#BFDBFE] rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <>
                                <span>{col.nextActionText}</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DispatchResponseBoard;
