import React, { useState, useEffect, useMemo } from "react";
import { 
  Report, 
  Priority, 
  FieldTeamMeta,
  TeamAvailabilityStatus,
  ReportCategory 
} from "../types";
import { 
  DEFAULT_FIELD_TEAMS, 
  subscribeToFieldTeams,
  updateFieldTeamAvailability,
  calculateSlaStatus, 
  assignFieldTask, 
  reassignFieldTask, 
  approveFieldResolution, 
  rejectFieldResolution,
  getRecommendedTeamForCategory
} from "../services/fieldOperationsService";
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Search, 
  Filter, 
  Radio, 
  Send, 
  Eye, 
  Camera, 
  UserCheck, 
  RotateCcw, 
  Calendar, 
  MapPin, 
  Phone, 
  Layers, 
  Check, 
  X, 
  AlertOctagon,
  ChevronRight,
  ArrowRight,
  Info,
  Loader2,
  Users,
  Shield,
  Activity,
  CheckCircle,
  HelpCircle,
  ExternalLink
} from "lucide-react";

interface DispatchManagementProps {
  reports: Report[];
  currentUserName: string;
  currentUserEmail: string;
  onSelectReport: (report: Report) => void;
  onRefreshReports?: () => void;
}

type TabFilter = "ALL" | "UNASSIGNED" | "DISPATCHED" | "REVIEW" | "RESOLVED" | "TEAMS";

export const DispatchManagement: React.FC<DispatchManagementProps> = ({
  reports,
  currentUserName,
  currentUserEmail,
  onSelectReport,
  onRefreshReports
}) => {
  // Real-time Field Teams State
  const [fieldTeams, setFieldTeams] = useState<FieldTeamMeta[]>(DEFAULT_FIELD_TEAMS);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(true);

  // Subscribe to real-time fieldTeams in Firestore
  useEffect(() => {
    const unsubscribe = subscribeToFieldTeams((teams) => {
      setFieldTeams(teams);
      setLoadingTeams(false);
    });
    return () => unsubscribe();
  }, []);

  // Filters & Search
  const [tabFilter, setTabFilter] = useState<TabFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  // Modal States
  const [assignModalReport, setAssignModalReport] = useState<Report | null>(null);
  const [reviewModalReport, setReviewModalReport] = useState<Report | null>(null);
  const [teamStatusModalTeam, setTeamStatusModalTeam] = useState<FieldTeamMeta | null>(null);
  
  // Assign/Reassign Form State
  const [selectedSquadId, setSelectedSquadId] = useState<string>("");
  const [assignPriority, setAssignPriority] = useState<Priority>("Medium");
  const [customSlaHours, setCustomSlaHours] = useState<number>(24);
  const [dispatchInstructions, setDispatchInstructions] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Review Form State
  const [approvalComment, setApprovalComment] = useState<string>("Resolution inspected, evidence verified, and approved.");
  const [rejectionReason, setRejectionReason] = useState<string>("Insufficient repair quality");
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Merge Live Reports into Team Workload & Active Tasks
  const computedTeams = useMemo(() => {
    return fieldTeams.map(team => {
      // Find all active incidents assigned to this team
      const activeIncidents = reports.filter(r => {
        if (r.status === "Resolved" || r.status === "REJECTED" || r.fieldStatus === "CLOSED") return false;
        const assignedTeamId = r.assignment?.teamId || r.assignment?.fieldTeamId;
        if (assignedTeamId === team.id) return true;
        if (r.assignedTo && (r.assignedTo.includes(team.id) || r.assignedTo.toLowerCase() === team.name.toLowerCase())) return true;
        return false;
      });

      const activeCount = activeIncidents.length;
      const currentReport = activeIncidents[0] || null;

      // Compute status based on tasks and base availability
      let computedStatus: TeamAvailabilityStatus = team.availability || "AVAILABLE";
      if (team.availability === "OFFLINE" || team.availability === "EMERGENCY" || team.availability === "UNAVAILABLE") {
        computedStatus = team.availability;
      } else if (activeCount > 0) {
        computedStatus = "ON_TASK";
      } else {
        computedStatus = "AVAILABLE";
      }

      return {
        ...team,
        availability: computedStatus,
        activeTaskCount: activeCount,
        currentIncidentId: currentReport?.id || null,
        currentIncidentTitle: currentReport ? `${currentReport.title} (#${currentReport.id.slice(-6).toUpperCase()})` : null,
        lastOperationalStatus: currentReport 
          ? `Active on Incident #${currentReport.id.slice(-6).toUpperCase()} (${currentReport.fieldStatus || currentReport.status})`
          : team.lastOperationalStatus || "Operational / Ready for dispatch"
      };
    });
  }, [fieldTeams, reports]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const unassigned = reports.filter(r => !r.assignedTo && r.status !== "Resolved").length;
    const dispatched = reports.filter(r => r.assignedTo && r.fieldStatus !== "RESOLUTION_SUBMITTED" && r.status !== "Resolved").length;
    const pendingReview = reports.filter(r => r.fieldStatus === "RESOLUTION_SUBMITTED" || r.workflowState === "MUNICIPAL QUEUED").length;
    const resolved = reports.filter(r => r.status === "Resolved" || r.fieldStatus === "CLOSED").length;
    
    // SLA breaches
    const overdueCount = reports.filter(r => {
      if (r.status === "Resolved" || r.fieldStatus === "CLOSED") return false;
      const sla = calculateSlaStatus(r.priority, r.assignment?.assignedAt || r.createdAt);
      return sla.isOverdue;
    }).length;

    const reworkCount = reports.filter(r => r.fieldStatus === "RETURN_TO_TEAM").length;
    const reassignmentRequests = reports.filter(r => r.assignment?.reassignmentRequested).length;

    const availableTeamsCount = computedTeams.filter(t => t.availability === "AVAILABLE").length;
    const onTaskTeamsCount = computedTeams.filter(t => t.availability === "ON_TASK").length;

    return { 
      total, 
      unassigned, 
      dispatched, 
      pendingReview, 
      resolved, 
      overdueCount, 
      reworkCount, 
      reassignmentRequests,
      availableTeamsCount,
      onTaskTeamsCount
    };
  }, [reports, computedTeams]);

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter(rep => {
      if (rep.status === "REJECTED") return false;
      // Tab filter
      if (tabFilter === "UNASSIGNED" && (rep.assignedTo || rep.status === "Resolved")) return false;
      if (tabFilter === "DISPATCHED" && (!rep.assignedTo || rep.fieldStatus === "RESOLUTION_SUBMITTED" || rep.status === "Resolved")) return false;
      if (tabFilter === "REVIEW" && rep.fieldStatus !== "RESOLUTION_SUBMITTED" && rep.workflowState !== "MUNICIPAL QUEUED") return false;
      if (tabFilter === "RESOLVED" && rep.status !== "Resolved" && rep.fieldStatus !== "CLOSED") return false;

      // Category filter
      if (selectedCategory !== "ALL" && rep.category !== selectedCategory) return false;

      // Priority filter
      if (selectedPriority !== "ALL" && (rep.priority || "Medium") !== selectedPriority) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rep.title?.toLowerCase().includes(q);
        const matchesId = rep.id?.toLowerCase().includes(q);
        const matchesLocation = rep.location?.toLowerCase().includes(q);
        const matchesSquad = rep.assignedTo?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesLocation && !matchesSquad) return false;
      }

      return true;
    });
  }, [reports, tabFilter, selectedCategory, selectedPriority, searchQuery]);

  // Open Assign Modal
  const handleOpenAssignModal = (rep: Report) => {
    setActionError(null);
    setAssignModalReport(rep);
    
    // Find best matching AVAILABLE team first
    const recommended = getRecommendedTeamForCategory(rep.category);
    const availableMatch = computedTeams.find(t => t.id === recommended.id && t.availability === "AVAILABLE");
    const firstAvailable = availableMatch || computedTeams.find(t => t.availability === "AVAILABLE");

    setSelectedSquadId(firstAvailable?.id || "");
    const currentPriority = rep.priority || "Medium";
    setAssignPriority(currentPriority);
    setCustomSlaHours(currentPriority === "Critical" ? 4 : currentPriority === "High" ? 24 : currentPriority === "Medium" ? 72 : 168);
    setDispatchInstructions("");
    setReassignReason(rep.assignment?.reassignmentReason || "Operational re-routing to specialized squad");
  };

  // Open Review Modal
  const handleOpenReviewModal = (rep: Report) => {
    setActionError(null);
    setReviewModalReport(rep);
    setApprovalComment("Field evidence verified on site. Work order approved and closed.");
    setRejectionReason("Incomplete patch or insufficient asphalt compaction");
    setRejectionNotes("");
    setIsRejecting(false);
  };

  // Submit Assignment / Reassignment
  const handleConfirmAssignment = async () => {
    if (!assignModalReport || !selectedSquadId) return;
    setActionError(null);
    setIsSubmitting(true);

    const targetTeam = computedTeams.find(t => t.id === selectedSquadId);
    if (!targetTeam) {
      setActionError("Selected field team not found.");
      setIsSubmitting(false);
      return;
    }

    if (targetTeam.availability !== "AVAILABLE") {
      setActionError(`Cannot assign: ${targetTeam.name} is currently ${targetTeam.availability}. Only AVAILABLE teams can be dispatched.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const isReassign = Boolean(assignModalReport.assignedTo);

      if (isReassign) {
        await reassignFieldTask(
          assignModalReport.id,
          targetTeam.id,
          targetTeam.name,
          currentUserName || "Municipal Dispatcher",
          reassignReason || "Dispatch re-assignment",
          dispatchInstructions,
          assignPriority
        );
        setActionSuccess(`Work order #${assignModalReport.id.slice(-6).toUpperCase()} successfully reassigned to ${targetTeam.name}.`);
      } else {
        await assignFieldTask(
          assignModalReport.id,
          targetTeam.id,
          targetTeam.name,
          currentUserName || "Municipal Dispatcher",
          assignPriority,
          dispatchInstructions,
          customSlaHours
        );
        setActionSuccess(`Work order #${assignModalReport.id.slice(-6).toUpperCase()} successfully assigned to ${targetTeam.name}. Status: ASSIGNED.`);
      }

      setAssignModalReport(null);
      if (onRefreshReports) onRefreshReports();
    } catch (err: any) {
      console.error("Failed to assign field task:", err);
      setActionError(err.message || "Failed to persist field assignment to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Resolution
  const handleApproveResolution = async () => {
    if (!reviewModalReport) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await approveFieldResolution(
        reviewModalReport.id,
        currentUserName || "Municipal Officer",
        approvalComment
      );
      setActionSuccess(`Resolution for Incident #${reviewModalReport.id.slice(-6).toUpperCase()} approved. Work order closed and squad released to AVAILABLE.`);
      setReviewModalReport(null);
      if (onRefreshReports) onRefreshReports();
    } catch (err: any) {
      console.error("Failed to approve resolution:", err);
      setActionError(err.message || "Failed to approve resolution in database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject Resolution / Return to Crew
  const handleRejectResolution = async () => {
    if (!reviewModalReport) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await rejectFieldResolution(
        reviewModalReport.id,
        currentUserName || "Municipal Officer",
        rejectionReason,
        rejectionNotes || "Please address remaining deficiencies and submit updated photos."
      );
      setActionSuccess(`Incident #${reviewModalReport.id.slice(-6).toUpperCase()} returned to field team for rework.`);
      setReviewModalReport(null);
      if (onRefreshReports) onRefreshReports();
    } catch (err: any) {
      console.error("Failed to reject resolution:", err);
      setActionError(err.message || "Failed to submit rework request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Team Availability Status
  const handleUpdateTeamStatus = async (teamId: string, newStatus: TeamAvailabilityStatus) => {
    setActionError(null);
    try {
      await updateFieldTeamAvailability(teamId, newStatus, currentUserName || "Municipal Officer");
      setActionSuccess(`Team ${teamId} availability updated to ${newStatus}.`);
      setTeamStatusModalTeam(null);
    } catch (err: any) {
      console.error("Failed to update team availability:", err);
      setActionError(err.message || "Failed to update team status.");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033]">
      
      {/* 1. MUNICIPAL DISPATCH HEADER STRIP */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#FFFFFF] rounded-3xl p-6 border border-[#DBEAFE] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Radio className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] font-extrabold uppercase tracking-wider">
                MUNICIPAL DISPATCH MANAGEMENT
              </span>
              <span className="text-xs text-[#64748B] font-medium">
                Real-Time Fleet Coordination & SLA Governance
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#172033] font-sans mt-1">
              Field Team Dispatch & Availability Control
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl">
              Assign and reassign available field teams to pending hazards, track live response SLAs, monitor active squad workloads, and inspect completed field evidence.
            </p>
          </div>
        </div>

        {/* Live Officer Badge */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-[#E2E8F0] shadow-2xs self-start lg:self-auto">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-[10px] font-mono text-[#64748B] uppercase font-bold">Dispatching Officer</div>
            <div className="text-xs font-extrabold text-[#172033] truncate">{currentUserName || "Director Rachel Chen"}</div>
          </div>
        </div>
      </div>

      {/* SUCCESS / ERROR TOAST BANNERS */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-bold shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-900 text-xs font-bold shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. REASSIGNMENT & REWORK ATTENTION BANNER */}
      {(stats.reassignmentRequests > 0 || stats.reworkCount > 0) && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-amber-950 text-xs sm:text-sm">
                Attention: {stats.reassignmentRequests} Reassignment Request(s) • {stats.reworkCount} In Rework
              </p>
              <p className="text-[11px] text-amber-800">
                Field teams have requested reassignment or require immediate municipal dispatch intervention.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setTabFilter("ALL");
              setSearchQuery("");
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Review Issues
          </button>
        </div>
      )}

      {/* 3. METRIC COUNTERS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        <div 
          onClick={() => setTabFilter("ALL")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            tabFilter === "ALL" 
              ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs" 
              : "bg-white border-[#E2E8F0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Reports</span>
            <Layers className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-black text-[#172033] font-mono">{stats.total}</div>
          <div className="text-[10.5px] text-[#64748B] mt-0.5">All incidents</div>
        </div>

        <div 
          onClick={() => setTabFilter("UNASSIGNED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            tabFilter === "UNASSIGNED" 
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs" 
              : "bg-white border-[#E2E8F0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Unassigned</span>
            <AlertOctagon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 font-mono">{stats.unassigned}</div>
          <div className="text-[10.5px] text-amber-700 mt-0.5">Awaiting dispatch</div>
        </div>

        <div 
          onClick={() => setTabFilter("DISPATCHED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            tabFilter === "DISPATCHED" 
              ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs" 
              : "bg-white border-[#E2E8F0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">In Field</span>
            <Wrench className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-950 font-mono">{stats.dispatched}</div>
          <div className="text-[10.5px] text-indigo-700 mt-0.5">Active field repairs</div>
        </div>

        <div 
          onClick={() => setTabFilter("REVIEW")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            tabFilter === "REVIEW" 
              ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs" 
              : "bg-white border-[#E2E8F0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Pending Sign-off</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">{stats.pendingReview}</div>
          <div className="text-[10.5px] text-purple-700 mt-0.5">Evidence submitted</div>
        </div>

        <div 
          onClick={() => setTabFilter("TEAMS")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            tabFilter === "TEAMS" 
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs" 
              : "bg-white border-[#E2E8F0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Available Teams</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {stats.availableTeamsCount} / {computedTeams.length}
          </div>
          <div className="text-[10.5px] text-emerald-700 mt-0.5">{stats.onTaskTeamsCount} currently on task</div>
        </div>

        <div 
          onClick={() => setTabFilter("RESOLVED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            tabFilter === "RESOLVED" 
              ? "bg-slate-100 border-slate-300 ring-2 ring-slate-500/20 shadow-xs" 
              : "bg-white border-[#E2E8F0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Closed</span>
            <CheckCircle2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{stats.resolved}</div>
          <div className="text-[10.5px] text-slate-600 mt-0.5">Completed orders</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. REAL FIELD TEAM AVAILABILITY SECTION                                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#172033] uppercase tracking-wide flex items-center gap-2">
                <span>Field Team Availability & Operational State</span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {stats.availableTeamsCount} Ready for Dispatch
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Live operational status and active workload derived directly from Firestore team records and active task assignments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTabFilter("TEAMS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tabFilter === "TEAMS" 
                  ? "bg-[#2563EB] text-white" 
                  : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
              }`}
            >
              {tabFilter === "TEAMS" ? "Viewing Teams Table" : "View Full Team Roster"}
            </button>
          </div>
        </div>

        {/* Real-time Team Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {computedTeams.map((team) => {
            const isAvailable = team.availability === "AVAILABLE";
            const isOnTask = team.availability === "ON_TASK";
            const isOffline = team.availability === "OFFLINE";
            const isEmergency = team.availability === "EMERGENCY";
            const isUnavailable = team.availability === "UNAVAILABLE";

            const statusBg = isAvailable
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : isOnTask
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : isOffline
              ? "bg-slate-200 text-slate-700 border-slate-300"
              : isEmergency
              ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
              : "bg-orange-100 text-orange-800 border-orange-200";

            return (
              <div 
                key={team.id}
                className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 ${
                  isAvailable 
                    ? "bg-[#F8FAFC] border-[#E2E8F0] hover:border-blue-300 hover:shadow-xs" 
                    : isOnTask
                    ? "bg-amber-50/40 border-amber-200"
                    : "bg-slate-50 border-slate-200 opacity-90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-mono text-xs font-black text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      {team.id}
                    </span>
                    <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md uppercase border ${statusBg}`}>
                      {team.availability}
                    </span>
                  </div>

                  <h3 className="text-xs font-black text-[#172033] line-clamp-1">{team.name}</h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5 font-medium">{team.lead}</p>
                  
                  <div className="mt-2 text-[10.5px] text-[#475569] flex flex-col gap-1">
                    <span className="flex items-center gap-1 truncate text-[#64748B]">
                      <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                      <span className="truncate">{team.district}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#64748B]">
                      <Phone className="w-3 h-3 text-[#94A3B8] shrink-0" />
                      <span>{team.phone}</span>
                    </span>
                  </div>
                </div>

                {/* Active Assignment / Workload Box */}
                <div className="pt-2.5 border-t border-[#E2E8F0]/80 flex flex-col gap-1.5 text-[10.5px]">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[#64748B]">Active Load:</span>
                    <strong className={team.activeTaskCount > 0 ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>
                      {team.activeTaskCount} task(s)
                    </strong>
                  </div>

                  <div className="text-[10px] text-[#475569] bg-white p-2 rounded-xl border border-[#E2E8F0] line-clamp-2">
                    {team.currentIncidentTitle ? (
                      <span className="font-semibold text-amber-900">
                        {team.currentIncidentTitle}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] font-mono">No active task assigned</span>
                    )}
                  </div>

                  <button
                    onClick={() => setTeamStatusModalTeam(team)}
                    className="mt-1 w-full py-1 text-[10px] font-bold text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                  >
                    Adjust Availability
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. FILTER & SEARCH CONTROL STRIP */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        
        {/* Segmented Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(["ALL", "UNASSIGNED", "DISPATCHED", "REVIEW", "RESOLVED", "TEAMS"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setTabFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tabFilter === tab
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]"
              }`}
            >
              {tab === "ALL" && `All Incidents (${stats.total})`}
              {tab === "UNASSIGNED" && `Unassigned (${stats.unassigned})`}
              {tab === "DISPATCHED" && `In Field (${stats.dispatched})`}
              {tab === "REVIEW" && `Pending Sign-off (${stats.pendingReview})`}
              {tab === "RESOLVED" && `Closed (${stats.resolved})`}
              {tab === "TEAMS" && `Squad Roster (${computedTeams.length})`}
            </button>
          ))}
        </div>

        {/* Search & Category Selectors */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <input
              type="text"
              placeholder="Search ID, title, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#172033] placeholder:text-[#94A3B8] focus:outline-hidden focus:border-[#2563EB]"
            />
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs text-[#172033] font-semibold focus:outline-hidden focus:border-[#2563EB] cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Pothole">Pothole</option>
            <option value="Broken Streetlight">Streetlight</option>
            <option value="Garbage Overflow">Garbage</option>
            <option value="Road Obstruction">Obstruction</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs text-[#172033] font-semibold focus:outline-hidden focus:border-[#2563EB] cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical (P1)</option>
            <option value="High">High (P2)</option>
            <option value="Medium">Medium (P3)</option>
            <option value="Low">Low (P4)</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. DISPATCH WORK ORDER QUEUE / TEAMS TABLE VIEW                          */}
      {/* ========================================================================= */}
      {tabFilter === "TEAMS" ? (
        /* SQUAD ROSTER TABLE VIEW */
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Registered Field Teams Roster & Status ({computedTeams.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-mono uppercase text-[10px] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Team ID & Name</th>
                  <th className="py-3 px-4">Supervisor Lead</th>
                  <th className="py-3 px-4">Specialty & Zone</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Active Task / Incident</th>
                  <th className="py-3 px-4">Last Update</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {computedTeams.map((team) => {
                  const isAvailable = team.availability === "AVAILABLE";
                  const isOnTask = team.availability === "ON_TASK";
                  const isOffline = team.availability === "OFFLINE";
                  const isEmergency = team.availability === "EMERGENCY";

                  return (
                    <tr key={team.id} className="hover:bg-[#F8FAFD] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-[#172033]">{team.name}</div>
                        <div className="text-[10px] font-mono text-[#2563EB]">{team.id}</div>
                      </td>
                      <td className="py-3 px-4 text-[#334155] font-medium">{team.lead}</td>
                      <td className="py-3 px-4">
                        <div className="text-[#172033] font-semibold">{team.category}</div>
                        <div className="text-[10.5px] text-[#64748B]">{team.district}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase ${
                          isAvailable ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          isOnTask ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          isOffline ? "bg-slate-200 text-slate-700" :
                          isEmergency ? "bg-rose-100 text-rose-800" : "bg-orange-100 text-orange-800"
                        }`}>
                          {team.availability}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {team.currentIncidentTitle ? (
                          <span className="text-amber-900 font-bold">{team.currentIncidentTitle}</span>
                        ) : (
                          <span className="text-[#94A3B8]">No active task</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] text-[11px]">
                        {team.lastOperationalStatus}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setTeamStatusModalTeam(team)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold rounded-lg transition-colors border border-blue-200 text-[11px] cursor-pointer"
                        >
                          Modify Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* INCIDENTS QUEUE LIST VIEW */
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Incident Dispatch & SLA Ledger ({filteredReports.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#64748B]">
              Showing matching work orders
            </span>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#172033]">No Incidents in Current Filter</h4>
              <p className="text-xs text-[#64748B] max-w-sm mt-1">
                All work orders for this view have been processed or no matching reports match your query.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {filteredReports.map((rep) => {
                const priority = rep.priority || "Medium";
                const sla = calculateSlaStatus(priority, rep.assignment?.assignedAt || rep.createdAt);
                const isAssigned = Boolean(rep.assignedTo);
                const isPendingSignOff = rep.fieldStatus === "RESOLUTION_SUBMITTED" || rep.workflowState === "MUNICIPAL QUEUED";
                const isRework = rep.fieldStatus === "RETURN_TO_TEAM";
                const hasReassignRequest = Boolean(rep.assignment?.reassignmentRequested);

                return (
                  <div 
                    key={rep.id} 
                    className={`p-4 sm:p-5 transition-all hover:bg-[#F8FAFD] flex flex-col gap-3.5 ${
                      isPendingSignOff ? "bg-purple-50/30" : isRework ? "bg-amber-50/30" : ""
                    }`}
                  >
                    {/* Top Line: ID, Priority, SLA Pill, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-[#172033] bg-[#E2E8F0]/70 px-2.5 py-0.5 rounded-md">
                          #{rep.id.slice(-6).toUpperCase()}
                        </span>
                        
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                          priority === "Critical"
                            ? "bg-rose-100 text-rose-800"
                            : priority === "High"
                            ? "bg-amber-100 text-amber-800"
                            : priority === "Medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {priority} Priority
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EEF2F6] text-[#475569]">
                          {rep.category}
                        </span>

                        {/* Workflow State Pill */}
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md uppercase ${
                          rep.status === "Resolved" || rep.fieldStatus === "CLOSED"
                            ? "bg-emerald-100 text-emerald-800"
                            : isPendingSignOff
                            ? "bg-purple-100 text-purple-800 border border-purple-200 animate-pulse"
                            : isRework
                            ? "bg-amber-100 text-amber-800"
                            : isAssigned
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {rep.fieldStatus || rep.status}
                        </span>
                      </div>

                      {/* SLA Countdown Badge */}
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-mono font-bold border ${sla.statusColor}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {sla.isOverdue 
                            ? `OVERDUE (Target: ${sla.deadline})` 
                            : `SLA: ${sla.statusLabel} • Target: ${sla.deadline}`}
                        </span>
                      </div>
                    </div>

                    {/* Middle Line: Photo thumbnail, Title, Location & Description */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Incident Photo Thumbnail */}
                        {(rep.image || rep.evidenceUrl || rep.evidenceFrames?.[0]) ? (
                          <div 
                            onClick={(e) => { e.stopPropagation(); onSelectReport(rep); }}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 cursor-pointer shadow-3xs group/img relative"
                            title="Click to view full incident photo"
                          >
                            <img
                              src={rep.image || rep.evidenceUrl || rep.evidenceFrames?.[0] || ""}
                              alt={rep.title}
                              className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-dashed border-slate-200 bg-slate-50 shrink-0 flex flex-col items-center justify-center text-slate-400">
                            <Camera className="w-5 h-5 opacity-40" />
                            <span className="text-[8px] font-mono mt-0.5">No Photo</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-extrabold text-[#172033] line-clamp-1">{rep.title}</h4>
                          <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5">{rep.description}</p>
                          
                          <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                              <span>{rep.location || "Delhi NCR Corridor"}</span>
                            </span>
                            <span>•</span>
                            <span>Reporter: <strong className="text-[#334155]">{rep.reporterEmail || "Citizen"}</strong></span>
                            <span>•</span>
                            <span>Reported: {new Date(rep.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Squad Info Pill */}
                      <div className="bg-[#F1F5F9] p-3 rounded-2xl border border-[#E2E8F0] shrink-0 text-left min-w-[200px]">
                        <div className="text-[10px] font-mono font-bold uppercase text-[#64748B]">Assigned Field Squad</div>
                        <div className="text-xs font-black text-[#172033] mt-0.5 truncate">
                          {rep.assignedTo || "None (Unassigned)"}
                        </div>
                        {rep.assignment?.assignedAt ? (
                          <div className="text-[10px] text-[#2563EB] font-mono mt-0.5">
                            Dispatched: {new Date(rep.assignment.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                            Awaiting Dispatch
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reassignment Request Notice */}
                    {hasReassignRequest && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold">Field Team Requested Reassignment:</p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            <strong>Reason:</strong> {rep.assignment?.reassignmentReason || "N/A"} • <em>{rep.assignment?.reassignmentNotes}</em>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons Row */}
                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectReport(rep)}
                          className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#334155] text-xs font-bold rounded-xl border border-[#CBD5E1] transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>Inspect Details</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1. If Pending Review -> Municipal Sign-Off Button */}
                        {isPendingSignOff && (
                          <button
                            onClick={() => handleOpenReviewModal(rep)}
                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 animate-bounce-subtle"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Review Evidence & Sign-Off</span>
                          </button>
                        )}

                        {/* 2. If Unassigned -> Assign Button */}
                        {!isAssigned && rep.status !== "Resolved" && (
                          <button
                            onClick={() => handleOpenAssignModal(rep)}
                            className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Assign Field Team</span>
                          </button>
                        )}

                        {/* 3. If Already Assigned -> Reassign Button */}
                        {isAssigned && rep.status !== "Resolved" && !isPendingSignOff && (
                          <button
                            onClick={() => handleOpenAssignModal(rep)}
                            className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] text-[#2563EB] border border-[#BFDBFE] text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reassign Team</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN / REASSIGN FIELD SQUAD                                    */}
      {/* ========================================================================= */}
      {assignModalReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2000] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-[#E2E8F0] shadow-2xl flex flex-col gap-5 text-left my-8 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#172033] font-sans">
                    {assignModalReport.assignedTo ? "Reassign Field Team" : "Assign Tasks to Field Teams"}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Incident #{assignModalReport.id.slice(-6).toUpperCase()} • {assignModalReport.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalReport(null)}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal if any */}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Target Squad Selector with Availability Checks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block">
                  Select Available Field Team *
                </label>
                <span className="text-[10.5px] font-mono text-[#64748B]">
                  Only AVAILABLE teams can be dispatched
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {computedTeams.map((team) => {
                  const isMatch = team.category.toLowerCase() === assignModalReport.category.toLowerCase();
                  const isSelected = selectedSquadId === team.id;
                  const isAvailable = team.availability === "AVAILABLE";

                  return (
                    <div
                      key={team.id}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedSquadId(team.id);
                          setActionError(null);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-blue-50 border-[#2563EB] ring-2 ring-blue-500/20 shadow-2xs cursor-pointer"
                          : isAvailable
                          ? "bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-300 cursor-pointer"
                          : "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-black text-[#172033]">{team.name}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}>
                          {team.availability}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#64748B]">
                        <div>Lead: <strong>{team.lead}</strong> • {team.district}</div>
                      </div>

                      <div className="text-[10px] font-mono pt-1 border-t border-[#E2E8F0] flex items-center justify-between">
                        <span className="text-[#64748B]">
                          {isMatch ? "⭐ Recommended Specialty" : team.category}
                        </span>
                        <span className={team.activeTaskCount > 0 ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>
                          {team.activeTaskCount} active
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority & SLA Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block mb-1.5">
                  Priority Clearance
                </label>
                <select
                  value={assignPriority}
                  onChange={(e) => {
                    const p = e.target.value as Priority;
                    setAssignPriority(p);
                    setCustomSlaHours(p === "Critical" ? 4 : p === "High" ? 24 : p === "Medium" ? 72 : 168);
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-bold text-[#172033] focus:outline-hidden focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="Critical">Critical (P1) - 4 Hour SLA</option>
                  <option value="High">High (P2) - 24 Hour SLA</option>
                  <option value="Medium">Medium (P3) - 3 Days SLA</option>
                  <option value="Low">Low (P4) - 7 Days SLA</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block mb-1.5">
                  SLA Target Window (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={customSlaHours}
                  onChange={(e) => setCustomSlaHours(Number(e.target.value) || 24)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-bold text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Reassign Reason (if reassigning) */}
            {assignModalReport.assignedTo && (
              <div>
                <label className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block mb-1.5">
                  Reassignment Justification *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Previous squad overloaded; specialized heavy machinery needed"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>
            )}

            {/* Dispatch Instructions */}
            <div>
              <label className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block mb-1.5">
                Dispatch Instructions / Work Order Notes
              </label>
              <textarea
                rows={3}
                placeholder="Specify special equipment, detour requirements, safety advisories..."
                value={dispatchInstructions}
                onChange={(e) => setDispatchInstructions(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs text-[#172033] focus:outline-hidden focus:border-[#2563EB] resize-none"
              />
            </div>

            {/* ASSIGNMENT CONFIRMATION SUMMARY CARD */}
            {selectedSquadId && (
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] font-mono font-black uppercase text-blue-700 block">
                  ASSIGNMENT SUMMARY & TARGET COMPLETION
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-800">
                  <div>
                    <span className="text-[9.5px] text-slate-500 block uppercase font-medium">Assign To</span>
                    <strong className="text-slate-900 truncate block font-bold">{computedTeams.find(t => t.id === selectedSquadId)?.name || "Selected Team"}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-500 block uppercase font-medium">Priority</span>
                    <strong className="text-slate-900 block font-bold">{assignPriority}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-500 block uppercase font-medium">Target Completion</span>
                    <strong className="text-blue-700 block font-extrabold">{customSlaHours >= 24 ? `${Math.round(customSlaHours / 24)} Days` : `${customSlaHours} Hours`}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-500 block uppercase font-medium">Due At</span>
                    <strong className="text-slate-900 block font-mono font-bold">
                      {new Date(Date.now() + customSlaHours * 60 * 60 * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setAssignModalReport(null)}
                className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !selectedSquadId}
                onClick={handleConfirmAssignment}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Assignment...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVIEW EVIDENCE & SIGN-OFF / REWORK                              */}
      {/* ========================================================================= */}
      {reviewModalReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2000] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-[#E2E8F0] shadow-2xl flex flex-col gap-5 text-left my-8 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#172033] font-sans">
                    Municipal Sign-Off & Resolution Review
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Incident #{reviewModalReport.id.slice(-6).toUpperCase()} • Submitted by {reviewModalReport.resolution?.submittedBy || reviewModalReport.assignedTo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalReport(null)}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Evidence Comparison: Before vs After */}
            <div>
              <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block mb-2">
                Field Evidence Comparison (Before vs After)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#64748B]">
                    <span>BEFORE REPAIR</span>
                    <span className="text-amber-700">Initial Hazard</span>
                  </div>
                  <div className="h-40 rounded-xl bg-slate-200 overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                    {reviewModalReport.resolution?.beforeEvidence?.[0] || reviewModalReport.image || reviewModalReport.evidenceUrl || reviewModalReport.evidenceFrames?.[0] ? (
                      <img
                        src={reviewModalReport.resolution?.beforeEvidence?.[0] || reviewModalReport.image || reviewModalReport.evidenceUrl || reviewModalReport.evidenceFrames?.[0] || ""}
                        alt="Before Repair"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xs text-[#94A3B8] font-mono">No initial photo</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#64748B]">
                    <span>AFTER RESOLUTION</span>
                    <span className="text-emerald-700">Field Squad Evidence</span>
                  </div>
                  <div className="h-40 rounded-xl bg-slate-200 overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                    {reviewModalReport.resolution?.afterEvidence?.[0] ? (
                      <img
                        src={reviewModalReport.resolution.afterEvidence[0]}
                        alt="After Repair"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#94A3B8] font-mono">No resolution photo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Field Resolution Summary */}
            <div className="bg-[#F1F5F9] p-4 rounded-2xl border border-[#E2E8F0] flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#64748B]">
                <span>Action Taken: <strong className="text-[#172033]">{reviewModalReport.resolution?.action || "Repair completed"}</strong></span>
                <span>Submitted: {reviewModalReport.resolution?.submittedAt ? new Date(reviewModalReport.resolution.submittedAt).toLocaleTimeString() : "Recent"}</span>
              </div>
              <p className="text-xs text-[#334155]">
                <strong>Crew Notes:</strong> {reviewModalReport.resolution?.notes || "Patch applied, debris cleared, asphalt compacted."}
              </p>
            </div>

            {/* Decision Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  !isRejecting 
                    ? "bg-emerald-600 text-white shadow-xs font-black" 
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Close Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isRejecting 
                    ? "bg-rose-600 text-white shadow-xs font-black" 
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Request Rework / Reject</span>
              </button>
            </div>

            {/* Form based on decision */}
            {!isRejecting ? (
              <div>
                <label className="text-xs font-extrabold text-[#334155] uppercase tracking-wider block mb-1.5">
                  Approval Officer Comments (Sent to Citizen & Field Team)
                </label>
                <input
                  type="text"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-hidden focus:border-emerald-500 font-semibold"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-extrabold text-rose-900 uppercase tracking-wider block mb-1.5">
                    Rework Reason *
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold text-rose-900 focus:outline-hidden focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Insufficient repair quality">Insufficient repair quality</option>
                    <option value="Debris not cleared from surrounding road">Debris not cleared from surrounding road</option>
                    <option value="After-photo unclear / Missing verification">After-photo unclear / Missing verification</option>
                    <option value="Incorrect location or adjacent defect unaddressed">Incorrect location or adjacent defect unaddressed</option>
                    <option value="Other structural deficiency">Other structural deficiency</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-rose-900 uppercase tracking-wider block mb-1.5">
                    Rework Instructions for Squad
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specific corrections required before approval..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-rose-200 rounded-xl p-3 text-xs text-rose-900 focus:outline-hidden focus:border-rose-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setReviewModalReport(null)}
                className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              
              {!isRejecting ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApproveResolution}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSubmitting ? "Approving..." : "Approve & Mark Resolved"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRejectResolution}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>{isSubmitting ? "Submitting..." : "Return to Field Squad for Rework"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADJUST TEAM AVAILABILITY MODAL                                   */}
      {/* ========================================================================= */}
      {teamStatusModalTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2000] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E2E8F0] shadow-2xl flex flex-col gap-4 text-left my-8 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-black text-[#172033] font-sans">
                  Modify Squad Operational Availability
                </h3>
                <p className="text-xs text-[#64748B]">
                  {teamStatusModalTeam.name} ({teamStatusModalTeam.id})
                </p>
              </div>
              <button
                onClick={() => setTeamStatusModalTeam(null)}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Select the new operational readiness status for this unit. Unavailable or Offline squads will be blocked from receiving new dispatch assignments.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {(["AVAILABLE", "ON_TASK", "OFFLINE", "EMERGENCY", "UNAVAILABLE"] as TeamAvailabilityStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleUpdateTeamStatus(teamStatusModalTeam.id, st)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    teamStatusModalTeam.availability === st 
                      ? "bg-blue-50 border-blue-500 font-bold text-blue-900 shadow-2xs" 
                      : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#334155]"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold">{st}</div>
                    <div className="text-[10px] text-[#64748B]">
                      {st === "AVAILABLE" && "Ready for immediate work order assignment"}
                      {st === "ON_TASK" && "Currently executing an assigned work order"}
                      {st === "OFFLINE" && "Squad off duty / shift ended"}
                      {st === "EMERGENCY" && "Engaged in critical civic emergency / SOS"}
                      {st === "UNAVAILABLE" && "Vehicle maintenance or equipment downtime"}
                    </div>
                  </div>
                  {teamStatusModalTeam.availability === st && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTeamStatusModalTeam(null)}
                className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
