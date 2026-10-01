import React, { useState, useMemo } from "react";
import { Report, isEmergencySosReport } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { 
  Radio, MessageSquare, ArrowRight, Camera, MapPin, 
  Clock, AlertTriangle, ShieldCheck, CheckCircle2, 
  Sparkles, Filter, Search, User, Eye, ArrowUpRight, Flame, AlertOctagon, RefreshCw
} from "lucide-react";

interface CitizenSignalsProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onNavigateToIntelligence?: (report: Report) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function getRelativeTime(createdAt: string | undefined): { label: string; isNew: boolean } {
  if (!createdAt) return { label: "Recently", isNew: false };
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 2) return { label: "Just now", isNew: true };
  if (diffMins < 15) return { label: `${diffMins} min ago`, isNew: true };
  if (diffMins < 60) return { label: `${diffMins} min ago`, isNew: false };
  if (diffHours < 24) return { label: `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`, isNew: false };
  if (diffDays === 1) return { label: "Yesterday", isNew: false };
  return { label: new Date(createdAt).toLocaleDateString(), isNew: false };
}

export const CitizenSignals: React.FC<CitizenSignalsProps> = ({
  reports,
  onSelectReport,
  onNavigateToIntelligence,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const { t, isHindi } = useLanguage();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<Report | null>(null);

  // 1. Primary sorting: createdAt DESCENDING (Newest first), with stable secondary sort by ID
  const sortedReports = useMemo(() => {
    return [...(reports || [])].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA; // Newest first
      }
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [reports]);

  // Include all valid incoming report sources (Citizen, SOS, AI Road Scanner)
  const filteredSignals = useMemo(() => {
    return sortedReports.filter(r => {
      if (!r) return false;
      const matchesCat = categoryFilter === "All" || r.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      const matchesSearch = 
        !searchQuery.trim() ||
        (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesStatus && matchesSearch;
    });
  }, [sortedReports, categoryFilter, statusFilter, searchQuery]);

  const activeSignal = selectedSignal || filteredSignals[0] || sortedReports[0] || null;

  const categories = useMemo(() => {
    return Array.from(new Set((reports || []).map(r => r?.category).filter(Boolean)));
  }, [reports]);

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header Banner - Live Incoming Feed */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-900/50 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold font-mono border border-blue-400/30 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE INCOMING FEED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
              CITIZEN SIGNALS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Real-time incoming report stream sorted by newest arrival. Monitor citizen uploads, emergency SOS beacons, and AI telemetry as they arrive.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-blue-300 uppercase font-bold block">
                Total Signals
              </span>
              <span className="text-2xl font-black text-white block mt-0.5">
                {reports.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-200 text-rose-800">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="font-bold text-sm">Unable to load citizen signals.</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && reports.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl shadow-xs">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading live incoming signals...</p>
        </div>
      ) : reports.length === 0 && !error ? (
        /* Empty State */
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl shadow-xs p-6">
          <Radio className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-slate-800">No Citizen Signals Yet</h3>
          <p className="text-xs text-slate-500 mt-1">New citizen reports will appear here automatically.</p>
        </div>
      ) : (
        <>
          {/* Selected Signal Inspector / Detailed View */}
          {activeSignal && (
            <div className="bg-white border-2 border-blue-500/30 ring-4 ring-blue-500/5 rounded-3xl p-6 shadow-md text-slate-900">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono font-black uppercase text-blue-700 tracking-wider bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    Selected Signal Inspector
                  </span>
                  <span className="text-xs font-mono text-slate-400">ID: #{activeSignal.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectReport(activeSignal)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Report</span>
                  </button>
                  {onNavigateToIntelligence && (
                    <button
                      onClick={() => onNavigateToIntelligence(activeSignal)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Open in Intelligence</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const rel = getRelativeTime(activeSignal.createdAt);
                      return rel.isNew ? (
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                          NEW • {rel.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                          {rel.label}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                      {activeSignal.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                      activeSignal.status === "Resolved" ? "bg-emerald-100 text-emerald-800" :
                      activeSignal.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {activeSignal.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900">
                    {activeSignal.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    "{activeSignal.description || activeSignal.title}"
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeSignal.location || "City Jurisdiction"}</span>
                    </span>
                    <span>•</span>
                    <span>Severity: <strong className="text-slate-800">{activeSignal.severity || 50}/100</strong></span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {activeSignal.createdAt ? new Date(activeSignal.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  {(activeSignal.image || activeSignal.imageUrl || activeSignal.evidenceUrl) ? (
                    <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900 relative">
                      <img 
                        src={(activeSignal.image || activeSignal.imageUrl || activeSignal.evidenceUrl)!} 
                        alt={activeSignal.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-lg">
                        Verified Evidence Asset
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                      <Camera className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">No Image Attached</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Text-only submission or telemetry beacon.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feed & Controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Incoming Stream ({filteredSignals.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Showing newest citizen and system reports first (createdAt descending).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, location, ID..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                {/* Category */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-hidden cursor-pointer"
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
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Signals Vertical Feed / Grid */}
            {filteredSignals.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl my-4">
                <Radio className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-slate-700">No Citizen Signals Match Filter</h3>
                <p className="text-xs text-slate-500 mt-0.5">Try resetting search query or category filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredSignals.map((signal, index) => {
                  const isSelected = activeSignal?.id === signal.id;
                  const { label: timeLabel, isNew } = getRelativeTime(signal.createdAt);
                  const isSos = isEmergencySosReport(signal);
                  const isScanner = signal.source === "ROAD_SCANNER" || (signal as any).source === "AI_SCANNER";

                  return (
                    <div
                      key={signal.id}
                      onClick={() => setSelectedSignal(signal)}
                      className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative ${
                        isSelected 
                          ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-sm" 
                          : index === 0 && searchQuery === "" && categoryFilter === "All" && statusFilter === "All"
                          ? "bg-white hover:bg-slate-50 border-blue-400 shadow-2xs"
                          : "bg-slate-50/80 hover:bg-white border-slate-200 shadow-3xs"
                      }`}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isNew && !signal.isDuplicate && (
                              <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                NEW
                              </span>
                            )}
                            {signal.isDuplicate && (
                              <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                DUPLICATE ({signal.duplicateDistanceMeters ?? 0}m)
                              </span>
                            )}
                            <span className="text-[9px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              {timeLabel}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                              isSos ? "bg-rose-100 text-rose-800 border-rose-300" :
                              isScanner ? "bg-purple-100 text-purple-800 border-purple-300" :
                              "bg-blue-100 text-blue-800 border-blue-300"
                            }`}>
                              {isSos ? "Emergency SOS" : isScanner ? "AI Scanner" : "Citizen"}
                            </span>
                          </div>

                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            signal.status === "Resolved" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                            signal.status === "In Progress" ? "bg-blue-100 text-blue-800 border-blue-300" :
                            "bg-amber-100 text-amber-800 border-amber-300"
                          }`}>
                            {signal.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {signal.title}
                        </h4>

                        <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2 leading-relaxed bg-white p-2 rounded-xl border border-slate-200/80">
                          "{signal.description || signal.title}"
                        </p>
                      </div>

                      {/* Footer Row */}
                      <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate max-w-[150px] font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{signal.location || "City Location"}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          Risk: {signal.severity || 50}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
};

export default CitizenSignals;
