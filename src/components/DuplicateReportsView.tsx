import React, { useState } from "react";
import { Report } from "../types";
import { getDuplicateGroups, DuplicateGroup } from "../utils/duplicateDetection";
import { Layers, Copy, MapPin, Clock, ArrowRight, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Eye, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { bulkUpdateReportStatus } from "../lib/firestore_reports";

interface DuplicateReportsViewProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onRefreshReports?: () => void;
}

export const DuplicateReportsView: React.FC<DuplicateReportsViewProps> = ({
  reports,
  onSelectReport,
  onRefreshReports
}) => {
  const { isHindi } = useLanguage();
  const duplicateGroups = getDuplicateGroups(reports);

  const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + g.totalCount, 0);
  const totalGroups = duplicateGroups.length;

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(duplicateGroups[0]?.groupId || null);
  const [confirmGroup, setConfirmGroup] = useState<DuplicateGroup | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRejectAllDuplicates = async (group: DuplicateGroup) => {
    setIsRejecting(true);
    setSuccessMessage(null);
    try {
      const dupIds = group.duplicates.map(d => d.id);
      await bulkUpdateReportStatus(
        dupIds,
        "REJECTED",
        `Duplicate report rejected and consolidated into primary incident #${group.primaryReport.id.slice(-6).toUpperCase()}`
      );
      setSuccessMessage(`✓ ${dupIds.length} duplicate report${dupIds.length > 1 ? 's' : ''} rejected. Primary report preserved.`);
      setConfirmGroup(null);
      if (onRefreshReports) onRefreshReports();
    } catch (err: any) {
      console.error("Failed to reject duplicate reports:", err);
      alert(err.message || "Failed to reject duplicate reports.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold font-mono border border-indigo-400/30 mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>SPATIAL DEDUPLICATION & CONSOLIDATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
              DUPLICATE REPORTS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Consolidates multiple manual citizen reports submitted within a 5-meter radius and 24-hour window. Preserves all reporter evidence and submissions while de-cluttering operational queues.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold block">
                Duplicate Reports
              </span>
              <span className="text-2xl font-black text-white block mt-0.5">
                {totalDuplicates}
              </span>
            </div>
            <div className="p-3.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold block">
                Duplicate Groups
              </span>
              <span className="text-2xl font-black text-indigo-400 block mt-0.5">
                {totalGroups}
              </span>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Duplicate Groups List */}
      {duplicateGroups.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl shadow-xs p-6">
          <Copy className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-slate-800">No Duplicate Report Clusters Detected</h3>
          <p className="text-xs text-slate-500 mt-1">Manual citizen reports submitted within 5 meters and 24 hours will be automatically grouped here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group) => {
            const isExpanded = expandedGroupId === group.groupId;
            const primary = group.primaryReport;
            const duplicates = group.duplicates;

            const firstReported = primary.createdAt ? new Date(primary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";
            const latestReported = duplicates.length > 0 && duplicates[duplicates.length - 1].createdAt
              ? new Date(duplicates[duplicates.length - 1].createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : firstReported;

            return (
              <div 
                key={group.groupId}
                className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all"
              >
                {/* Group Summary Header Card */}
                <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-black bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {group.groupId}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {group.totalCount} citizen report{group.totalCount > 1 ? 's' : ''} from within 5m
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900">
                      {primary.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{primary.location || "Knowledge Park III, Greater Noida"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs font-mono text-slate-500 hidden sm:block">
                      <div>First reported: <strong className="text-slate-800">{firstReported}</strong></div>
                      <div>Latest report: <strong className="text-slate-800">{latestReported}</strong></div>
                    </div>
                    <button
                      onClick={() => onSelectReport(primary)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Primary</span>
                    </button>
                    <button
                      onClick={() => setConfirmGroup(group)}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-3xs"
                      title="Reject all linked duplicate submissions while preserving primary"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>Reject All Duplicates</span>
                    </button>
                    <button
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.groupId)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{isExpanded ? "Hide Duplicates" : `View Duplicates (${group.totalCount})`}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Duplicate Submissions List */}
                {isExpanded && (
                  <div className="p-6 bg-slate-50/70 space-y-4 border-t border-slate-100 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider font-mono">
                        Primary Incident & Linked Duplicate Submissions
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        Radius Threshold: 5m • Time Window: 24h
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Primary Card */}
                      <div className="p-4 bg-white rounded-2xl border-2 border-indigo-500/40 shadow-xs flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                              PRIMARY REPORT
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              #{primary.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{primary.title}</h5>
                          <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2">"{primary.description}"</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{primary.createdAt ? new Date(primary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                          <span className="text-indigo-600 font-bold">Reference Anchor</span>
                        </div>
                      </div>

                      {/* Duplicate Cards */}
                      {duplicates.map((dup) => {
                        const dupTime = dup.createdAt ? new Date(dup.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                        const distance = dup.distanceMeters ?? 0;

                        return (
                          <div
                            key={dup.id}
                            onClick={() => onSelectReport(dup)}
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer flex flex-col justify-between gap-3 shadow-3xs"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9.5px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  #{dup.id.slice(-6).toUpperCase()}
                                </span>
                                <span className="text-[9.5px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  {distance}m from primary
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{dup.title}</h5>
                              <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2">"{dup.description}"</p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Submitted {dupTime}</span>
                              <span className="text-blue-600 font-bold hover:underline">Inspect →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2000]">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 text-left animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reject Duplicate Reports?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will reject {confirmGroup.totalCount} duplicate submissions linked to: <strong className="text-slate-800">{confirmGroup.primaryReport.title}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
              ℹ️ The Primary Report will NOT be affected. Duplicate documents will be preserved with REJECTED status for audit trails.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmGroup(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => handleRejectAllDuplicates(confirmGroup)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Reject All Duplicates</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DuplicateReportsView;
