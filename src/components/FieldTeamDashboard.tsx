import React, { useState, useEffect, useMemo, useRef } from "react";
import L from "../utils/initLeaflet";
import { 
  Report, 
  FieldTaskStatus, 
  FieldVerificationResult, 
  FieldTeamMeta,
  Priority
} from "../types";
import { 
  DEFAULT_FIELD_TEAMS, 
  calculateHaversineDistance, 
  calculateSlaStatus, 
  acceptFieldTask, 
  requestTaskReassignment, 
  startTravelToIncident, 
  markArrivedOnSite, 
  submitFieldVerification, 
  startRepairAction, 
  submitTaskResolution, 
  reportUnsafeCondition,
  analyzeFieldEvidenceWithAI
} from "../services/fieldOperationsService";
import { uploadFieldEvidence } from "../services/storageService";
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  Navigation, 
  Camera, 
  FileText, 
  Upload, 
  Send, 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  Layers, 
  Search, 
  Compass, 
  Phone, 
  UserCheck, 
  AlertOctagon, 
  Eye, 
  RefreshCw, 
  Info, 
  Sliders, 
  Wrench,
  Radio,
  ExternalLink,
  ChevronRight,
  CheckCircle
} from "lucide-react";

interface FieldTeamDashboardProps {
  reports: Report[];
  currentUserEmail: string;
  currentUserName: string;
  currentUserRole?: string;
  teamId?: string;
  teamName?: string;
  teamLead?: string;
  onRefreshReports: () => void;
}

type FieldTab = 
  | "overview" 
  | "tasks" 
  | "map" 
  | "verify" 
  | "work" 
  | "history" 
  | "safety" 
  | "copilot" 
  | "profile";

export default function FieldTeamDashboard({
  reports,
  currentUserEmail,
  currentUserName,
  currentUserRole,
  teamId = "RT-014",
  teamName = "Road Maintenance Team Alpha",
  teamLead = "Supervisor Vikram Singh",
  onRefreshReports
}: FieldTeamDashboardProps) {
  const isMunicipalMonitor = currentUserRole === "municipal" || currentUserRole === "admin";
  // Current active team
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId);
  const activeTeam = useMemo(() => {
    return DEFAULT_FIELD_TEAMS.find(t => t.id === selectedTeamId) || DEFAULT_FIELD_TEAMS[0];
  }, [selectedTeamId]);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<FieldTab>("overview");

  // Crew state
  const [availability, setAvailability] = useState<"AVAILABLE" | "BUSY" | "OFFLINE">("AVAILABLE");
  
  // Real GPS or Default Delhi Central coordinate
  const [crewLocation, setCrewLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 28.6315, // Connaught Place / Barakhamba corridor
    longitude: 77.2167
  });
  const [gpsActive, setGpsActive] = useState<boolean>(false);

  // Filter & Search states for Tasks
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Modal / Selected Task state
  const [selectedTask, setSelectedTask] = useState<Report | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);

  // Reassignment Modal state
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignReason, setReassignReason] = useState("EQUIPMENT_UNAVAILABLE");
  const [reassignNotes, setReassignNotes] = useState("");
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  // Verification Form State
  const [verifyTaskId, setVerifyTaskId] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<FieldVerificationResult>("ISSUE_CONFIRMED");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifyEvidenceFiles, setVerifyEvidenceFiles] = useState<string[]>([]);
  const [isUploadingVerify, setIsUploadingVerify] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [verifyAiResult, setVerifyAiResult] = useState<{
    classification: "Confirmed hazard" | "Possible hazard" | "No visible hazard" | "Insufficient evidence";
    confidence: number;
    notes: string;
  } | null>(null);

  // Active Work & Resolution Form State
  const [workTaskId, setWorkTaskId] = useState<string>("");
  const [repairAction, setRepairAction] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [afterEvidenceFiles, setAfterEvidenceFiles] = useState<string[]>([]);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Unsafe Condition Form State
  const [unsafeCategory, setUnsafeCategory] = useState("TRAFFIC_RISK");
  const [unsafeNotes, setUnsafeNotes] = useState("");
  const [unsafeSubmitting, setUnsafeSubmitting] = useState(false);
  const [unsafeSuccess, setUnsafeSuccess] = useState(false);

  // Field Copilot State
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: "user" | "copilot"; text: string; actionTaskId?: string }>>([
    {
      sender: "copilot",
      text: `Hello ${teamLead}. I am your Field Operations Copilot. I have analyzed all tasks assigned to ${activeTeam.name}. Ask me where to navigate first, which task has the tightest SLA, or what evidence is required.`
    }
  ]);
  const [copilotInput, setCopilotInput] = useState("");

  // Acquire Live GPS on mount if supported
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCrewLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setGpsActive(true);
        },
        (err) => {
          console.warn("GPS permission not granted or unavailable, using active district telemetry:", err.message);
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Filter tasks assigned to this team
  const assignedReports = useMemo(() => {
    return reports.filter(r => {
      // Direct team assignment match OR unassigned if in fallback testing
      if (r.assignment?.teamId === activeTeam.id) return true;
      if (r.assignedTo && r.assignedTo.toLowerCase().includes(activeTeam.name.toLowerCase())) return true;
      if (r.assignedTo && r.assignedTo.toLowerCase().includes(activeTeam.id.toLowerCase())) return true;
      // Also match category if status is Assigned and no explicit team
      if (r.status === "Assigned" && r.category.toLowerCase() === activeTeam.category.toLowerCase()) return true;
      return false;
    });
  }, [reports, activeTeam]);

  // Filtered tasks based on search & filter
  const filteredTasks = useMemo(() => {
    return assignedReports.filter(t => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (t?.title || "").toLowerCase().includes(q);
        const matchesLoc = (t?.location || "").toLowerCase().includes(q);
        const matchesId = (t?.id || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc && !matchesId) return false;
      }
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE" && (t.status === "Resolved" || t.fieldStatus === "CLOSED")) return false;
        if (statusFilter === "RESOLVED" && t.status !== "Resolved" && t.fieldStatus !== "CLOSED") return false;
        if (statusFilter === "OVERDUE") {
          const sla = calculateSlaStatus(t.priority, t.assignment?.assignedAt || t.createdAt);
          if (!sla.isOverdue) return false;
        }
      }
      return true;
    });
  }, [assignedReports, searchQuery, statusFilter, priorityFilter]);

  // Metrics computation
  const stats = useMemo(() => {
    const total = assignedReports.length;
    const critical = assignedReports.filter(t => t.priority === "Critical" || t.severity >= 80).length;
    const high = assignedReports.filter(t => t.priority === "High").length;
    const medium = assignedReports.filter(t => t.priority === "Medium").length;
    const low = assignedReports.filter(t => t.priority === "Low").length;

    const assigned = assignedReports.filter(t => !t.fieldStatus || t.fieldStatus === "ASSIGNED").length;
    const inProgress = assignedReports.filter(t => ["ACCEPTED", "EN_ROUTE", "ON_SITE", "VERIFIED", "ACTION_STARTED"].includes(t.fieldStatus || "")).length;
    const reviewPending = assignedReports.filter(t => t.fieldStatus === "RESOLUTION_SUBMITTED" || t.fieldStatus === "MUNICIPAL_REVIEW").length;
    const reworkRequired = assignedReports.filter(t => t.fieldStatus === "RETURN_TO_TEAM").length;
    const resolved = assignedReports.filter(t => t.status === "Resolved" || t.fieldStatus === "RESOLVED" || t.fieldStatus === "CLOSED").length;
    
    const overdue = assignedReports.filter(t => {
      if (t.status === "Resolved" || t.fieldStatus === "CLOSED") return false;
      const sla = calculateSlaStatus(t.priority, t.assignment?.assignedAt || t.createdAt);
      return sla.isOverdue;
    }).length;

    return { total, critical, high, medium, low, assigned, inProgress, reviewPending, reworkRequired, resolved, overdue };
  }, [assignedReports]);

  // Leaflet Map reference for Map Tab
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize or update Map
  useEffect(() => {
    if (activeTab !== "map" || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [crewLocation.latitude, crewLocation.longitude],
        zoom: 13,
        zoomControl: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer && (layer as any)._isFieldMarker) {
        try {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        } catch (e) {}
      }
    });

    // Crew location pulse icon
    const crewIcon = L.divIcon({
      className: "crew-loc-icon",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute"></div>
          <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white">
            ★
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const crewMarker = L.marker([crewLocation.latitude, crewLocation.longitude], { icon: crewIcon }).addTo(map);
    (crewMarker as any)._isFieldMarker = true;
    crewMarker.bindPopup(`<b>${activeTeam.name}</b><br/>Lead: ${activeTeam.lead}<br/>GPS Active: ${gpsActive ? "Yes" : "Sector Grid"}`);

    // Add incident markers
    assignedReports.forEach((report) => {
      if (!report.latitude || !report.longitude) return;

      const isCritical = report.priority === "Critical" || report.severity >= 80;
      const isHigh = report.priority === "High";
      const markerColor = isCritical ? "#dc2626" : isHigh ? "#ea580c" : "#2563eb";

      const incidentIcon = L.divIcon({
        className: "incident-loc-icon",
        html: `
          <div class="px-2 py-1 rounded-lg text-white font-bold text-[10px] shadow-lg flex items-center gap-1 border border-white" style="background-color: ${markerColor}">
            <span>${report.category.slice(0, 4).toUpperCase()}</span>
            ${isCritical ? '<span class="w-2 h-2 rounded-full bg-yellow-300 animate-pulse"></span>' : ''}
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12]
      });

      const incMarker = L.marker([report.latitude, report.longitude], { icon: incidentIcon }).addTo(map);
      (incMarker as any)._isFieldMarker = true;

      incMarker.on("click", () => {
        setSelectedTask(report);
        // Draw route line from crew to incident
        if (routePolylineRef.current) {
          try {
            if (map.hasLayer(routePolylineRef.current)) {
              map.removeLayer(routePolylineRef.current);
            }
          } catch (e) {}
          routePolylineRef.current = null;
        }
        const latlngs = [
          [crewLocation.latitude, crewLocation.longitude],
          [report.latitude, report.longitude]
        ];
        const line = L.polyline(latlngs as any, {
          color: "#2563eb",
          weight: 4,
          dashArray: "6, 8",
          opacity: 0.8
        }).addTo(map);
        routePolylineRef.current = line;
      });
    });

    // Cleanup on unmount or tab switch
    return () => {
      if (activeTab !== "map" && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, crewLocation, assignedReports, activeTeam, gpsActive]);

  // Handle Action: Accept Task
  const handleAcceptTask = async (task: Report) => {
    try {
      await acceptFieldTask(task.id, activeTeam.id, activeTeam.name, activeTeam.lead);
      onRefreshReports();
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { ...prev, fieldStatus: "ACCEPTED", status: "In Progress" } : null);
      }
    } catch (err) {
      console.error("Accept task error:", err);
    }
  };

  // Handle Action: Start Travel
  const handleStartTravel = async (task: Report) => {
    try {
      await startTravelToIncident(task.id, activeTeam.id, activeTeam.lead);
      onRefreshReports();
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { ...prev, fieldStatus: "EN_ROUTE", status: "In Progress" } : null);
      }
    } catch (err) {
      console.error("Start travel error:", err);
    }
  };

  // Handle Action: Mark Arrived On Site
  const handleMarkArrived = async (task: Report) => {
    try {
      const result = await markArrivedOnSite(
        task.id, 
        activeTeam.id, 
        activeTeam.lead,
        { latitude: task.latitude, longitude: task.longitude },
        crewLocation
      );
      onRefreshReports();
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { 
          ...prev, 
          fieldStatus: "ON_SITE", 
          status: "In Progress",
          assignment: {
            ...(prev.assignment || { teamId: activeTeam.id, teamName: activeTeam.name, assignedAt: new Date().toISOString() }),
            arrivedAt: new Date().toISOString()
          }
        } : null);
      }
      // Pre-select for verification
      setVerifyTaskId(task.id);
      setActiveTab("verify");
    } catch (err) {
      console.error("Mark arrived error:", err);
    }
  };

  // Handle Action: Request Reassignment
  const handleRequestReassignment = async () => {
    if (!selectedTask) return;
    setReassignSubmitting(true);
    try {
      await requestTaskReassignment(
        selectedTask.id,
        activeTeam.id,
        activeTeam.name,
        reassignReason,
        reassignNotes,
        activeTeam.lead
      );
      onRefreshReports();
      setIsReassignModalOpen(false);
      setIsTaskDetailsOpen(false);
      setReassignNotes("");
    } catch (err) {
      console.error("Reassignment error:", err);
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Handle Action: Upload Verification Evidence
  const handleVerifyEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingVerify(true);
    try {
      const downloadUrl = await uploadFieldEvidence(
        verifyTaskId || "temp_task",
        activeTeam.id,
        file,
        "verification"
      );
      setVerifyEvidenceFiles(prev => [...prev, downloadUrl]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploadingVerify(false);
    }
  };

  // Handle Action: Run Gemini AI Field Verification
  const handleAiVerify = async () => {
    const currentTarget = reports.find(r => r.id === verifyTaskId);
    if (!currentTarget) return;

    setIsAiAnalyzing(true);
    try {
      // Pick uploaded photo or initial incident photo
      const imageToAnalyze = verifyEvidenceFiles[0] || currentTarget.image || "";
      const result = await analyzeFieldEvidenceWithAI(
        imageToAnalyze,
        currentTarget.category,
        currentTarget.location
      );
      setVerifyAiResult(result);
    } catch (err) {
      console.error("AI Verify error:", err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Handle Action: Submit Field Verification
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTarget = reports.find(r => r.id === verifyTaskId);
    if (!currentTarget) return;

    try {
      const dist = calculateHaversineDistance(
        currentTarget.latitude,
        currentTarget.longitude,
        crewLocation.latitude,
        crewLocation.longitude
      );

      await submitFieldVerification(currentTarget.id, activeTeam.id, {
        result: verifyResult,
        notes: verifyNotes,
        evidenceUrls: verifyEvidenceFiles,
        verifiedBy: activeTeam.lead,
        gpsVerified: dist.distanceMeters <= 300,
        gpsDistanceMeters: dist.distanceMeters,
        fieldAIAnalysis: verifyAiResult || undefined
      });

      onRefreshReports();
      setVerifyNotes("");
      setVerifyEvidenceFiles([]);
      setVerifyAiResult(null);
      // Auto-advance to active work tab only if VERIFIED; otherwise return to task queue
      if (verifyResult === "VERIFIED") {
        setWorkTaskId(currentTarget.id);
        setActiveTab("work");
      } else {
        setActiveTab("tasks");
      }
    } catch (err) {
      console.error("Submit verification error:", err);
    }
  };

  // Handle Action: Upload After Resolution Evidence
  const handleAfterEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingAfter(true);
    try {
      const downloadUrl = await uploadFieldEvidence(
        workTaskId || "temp_task",
        activeTeam.id,
        file,
        "after"
      );
      setAfterEvidenceFiles(prev => [...prev, downloadUrl]);
    } catch (err) {
      console.error("Upload after error:", err);
    } finally {
      setIsUploadingAfter(false);
    }
  };

  // Handle Action: Submit Resolution for Municipal Review
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTarget = reports.find(r => r.id === workTaskId);
    if (!currentTarget) return;

    if (!repairAction.trim()) {
      alert("Please specify the repair/resolution action taken.");
      return;
    }
    if (afterEvidenceFiles.length === 0) {
      alert("Mandatory requirement: Please upload at least one photo showing the completed repair.");
      return;
    }

    setIsSubmittingResolution(true);
    try {
      await submitTaskResolution(currentTarget.id, activeTeam.id, {
        action: repairAction,
        notes: resolutionNotes,
        beforeEvidence: currentTarget.fieldVerification?.evidenceUrls || (currentTarget.image ? [currentTarget.image] : []),
        afterEvidence: afterEvidenceFiles,
        submittedBy: activeTeam.lead
      });

      onRefreshReports();
      setRepairAction("");
      setResolutionNotes("");
      setAfterEvidenceFiles([]);
      setActiveTab("tasks");
    } catch (err) {
      console.error("Submit resolution error:", err);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  // Handle Action: Report Unsafe Condition
  const handleReportUnsafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setUnsafeSubmitting(true);
    try {
      await reportUnsafeCondition(selectedTask.id, activeTeam.id, activeTeam.name, {
        reportedBy: activeTeam.lead,
        conditionType: unsafeCategory,
        notes: unsafeNotes,
        latitude: crewLocation.latitude,
        longitude: crewLocation.longitude
      });

      setUnsafeSuccess(true);
      setUnsafeNotes("");
      setTimeout(() => setUnsafeSuccess(false), 4000);
      onRefreshReports();
    } catch (err) {
      console.error("Unsafe condition report error:", err);
    } finally {
      setUnsafeSubmitting(false);
    }
  };

  // Handle Copilot Query
  const handleCopilotSend = (promptText?: string) => {
    const textToSend = promptText || copilotInput;
    if (!textToSend.trim()) return;

    const userMsg = { sender: "user" as const, text: textToSend };
    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotInput("");

    // Grounded query processing over team's assigned tasks
    setTimeout(() => {
      const q = textToSend.toLowerCase();
      let reply = "";
      let actionTaskId: string | undefined = undefined;

      if (q.includes("first") || q.includes("priority") || q.includes("urgent")) {
        const criticalTask = assignedReports.find(t => (t.priority === "Critical" || t.severity >= 80) && t.status !== "Resolved");
        if (criticalTask) {
          actionTaskId = criticalTask.id;
          reply = `Your #1 priority is **${criticalTask.title}** (${criticalTask.category}) at ${criticalTask.location || 'assigned area'}. Severity score: ${criticalTask.severity}/100. It requires immediate action under Critical SLA.`;
        } else {
          const firstTask = assignedReports.find(t => t.status !== "Resolved");
          if (firstTask) {
            actionTaskId = firstTask.id;
            reply = `Your next active task is **${firstTask.title}** at ${firstTask.location || 'assigned area'}. Status: ${firstTask.fieldStatus || firstTask.status}.`;
          } else {
            reply = "Great job! You currently have no pending tasks in your queue.";
          }
        }
      } else if (q.includes("nearest") || q.includes("closest") || q.includes("where")) {
        let minDistance = Infinity;
        let nearestTask: Report | null = null;

        assignedReports.forEach(t => {
          if (t.status === "Resolved") return;
          const dist = calculateHaversineDistance(crewLocation.latitude, crewLocation.longitude, t.latitude, t.longitude);
          if (dist.distanceMeters < minDistance) {
            minDistance = dist.distanceMeters;
            nearestTask = t;
          }
        });

        if (nearestTask) {
          const formattedDist = minDistance < 1000 ? `${minDistance}m` : `${(minDistance / 1000).toFixed(1)}km`;
          actionTaskId = (nearestTask as Report).id;
          reply = `The nearest task is **${(nearestTask as Report).title}** located at ${(nearestTask as Report).location || 'corridor'}, approximately **${formattedDist}** from your current position.`;
        } else {
          reply = "No active tasks are available to calculate distance.";
        }
      } else if (q.includes("evidence") || q.includes("close") || q.includes("resolution")) {
        reply = `To successfully close an urban hazard task, municipal guidelines require:\n1. On-site GPS check within 300m.\n2. Field Verification classification (Confirmed / Not Found).\n3. Before & After high-resolution photographs.\n4. Detailed notes of repair material used.\nMunicipal dispatch reviews these before citizen notification.`;
      } else if (q.includes("overdue") || q.includes("sla")) {
        const overdueTasks = assignedReports.filter(t => {
          if (t.status === "Resolved") return false;
          const sla = calculateSlaStatus(t.priority, t.assignment?.assignedAt || t.createdAt);
          return sla.isOverdue;
        });

        if (overdueTasks.length > 0) {
          actionTaskId = overdueTasks[0].id;
          reply = `Attention: You have **${overdueTasks.length} task(s) overdue**. The oldest is **${overdueTasks[0].title}** at ${overdueTasks[0].location || 'corridor'}. Immediate dispatch is required.`;
        } else {
          reply = "All active tasks are currently within their SLA compliance windows!";
        }
      } else {
        reply = `You currently have ${assignedReports.length} total tasks assigned (${stats.inProgress} in progress, ${stats.resolved} resolved). Would you like me to identify the nearest task or check SLA deadlines?`;
      }

      setCopilotMessages(prev => [...prev, { sender: "copilot", text: reply, actionTaskId }]);
    }, 450);
  };

  return (
    <div className="w-full flex flex-col gap-6 text-slate-800">

      {/* TOP NOTIFICATION / REWORK ALERT BANNER */}
      {stats.reworkRequired > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-extrabold text-amber-900 text-sm">Rework Requested by Municipal Command Center</p>
              <p className="text-xs text-amber-700">
                {stats.reworkRequired} task(s) were returned by municipal officers for additional work or evidence. Please inspect and resubmit.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter("ACTIVE");
              setActiveTab("tasks");
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0 transition-colors"
          >
            Review Returned Tasks
          </button>
        </div>
      )}

      {/* MUNICIPAL OVERSIGHT & DISPATCH NOTICE */}
      {isMunicipalMonitor && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] px-5 py-3 rounded-2xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[#1E3A8A]">Municipal Dispatch & Fleet Oversight View</p>
              <p className="text-[11px] text-[#3B82F6]">Monitoring squad task queues, SLA milestones, and location telemetry. Operational execution is managed by on-site field squads.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#DBEAFE] text-[#1E40AF] px-2.5 py-1 rounded-lg shrink-0">
            DISPATCH MONITOR
          </span>
        </div>
      )}

      {/* FIELD TEAM IDENTITY & COMMAND STRIP */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#FFFFFF] text-[#172033] rounded-3xl p-6 shadow-xs border border-[#DBEAFE] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] shadow-xs shrink-0">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] font-extrabold">
                {activeTeam.id}
              </span>
              <span className="text-xs font-bold text-[#64748B]">
                {activeTeam.district}
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                availability === "AVAILABLE" 
                  ? "bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]" 
                  : availability === "BUSY" 
                  ? "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]" 
                  : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
              }`}>
                ● {availability}
              </span>
            </div>
            <h2 className="text-xl font-black text-[#172033] tracking-tight mt-1">{activeTeam.name}</h2>
            <p className="text-xs text-[#64748B] font-medium flex items-center gap-2 mt-0.5">
              <span>Lead: <strong className="text-[#172033]">{activeTeam.lead}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Radio className={`w-3 h-3 ${gpsActive ? "text-[#16A34A] animate-pulse" : "text-[#94A3B8]"}`} />
                {gpsActive ? "Live Vehicle GPS Active" : "District GPS Simulated"}
              </span>
            </p>
          </div>
        </div>

        {/* CONTROLS: AVAILABILITY & TEAM SWITCHER */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Availability Segmented Buttons */}
          <div className="bg-white p-1 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center gap-1">
            {(["AVAILABLE", "BUSY", "OFFLINE"] as const).map(st => (
              <button
                key={st}
                onClick={() => setAvailability(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  availability === st 
                    ? st === "AVAILABLE" 
                      ? "bg-[#16A34A] text-white shadow-xs" 
                      : st === "BUSY" 
                      ? "bg-[#F59E0B] text-white shadow-xs" 
                      : "bg-[#64748B] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                {st === "AVAILABLE" ? "Available" : st === "BUSY" ? "On Site" : "Off Duty"}
              </button>
            ))}
          </div>

          {/* Quick Squad Switcher for multi-unit testing */}
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-white border border-[#E2E8F0] text-[#172033] text-xs font-bold rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#2563EB] cursor-pointer shadow-xs"
          >
            {DEFAULT_FIELD_TEAMS.map(t => (
              <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* HORIZONTAL FIELD NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
        {[
          { id: "overview", label: "Dashboard", icon: Sliders },
          { id: "tasks", label: `My Tasks (${stats.total})`, icon: CheckCircle2, badge: stats.critical > 0 ? stats.critical : undefined },
          { id: "map", label: "GIS Navigation Map", icon: MapPin },
          { id: "verify", label: "Field Verification", icon: Camera },
          { id: "work", label: "Work & Resolution", icon: Wrench },
          { id: "copilot", label: "Field Copilot AI", icon: Sparkles },
          { id: "safety", label: "Safety & SOS", icon: AlertOctagon },
          { id: "profile", label: "Team Profile", icon: UserCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FieldTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =================================================== */}
      {/* 1. DASHBOARD / OVERVIEW VIEW */}
      {/* =================================================== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.assigned}</p>
              <span className="text-[10px] text-slate-500 font-medium">Awaiting crew action</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">In Progress</span>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats.inProgress}</p>
              <span className="text-[10px] text-blue-600 font-medium">Travel / on-site active</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Sign-off Pending</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats.reviewPending}</p>
              <span className="text-[10px] text-amber-600 font-medium">In municipal queue</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Critical</span>
              <p className="text-2xl font-black text-rose-700 mt-1">{stats.critical}</p>
              <span className="text-[10px] text-rose-600 font-medium">High risk hazards</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Overdue SLA</span>
              <p className={`text-2xl font-black mt-1 ${stats.overdue > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
                {stats.overdue}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Past SLA window</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Resolved</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.resolved}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Verified & closed</span>
            </div>
          </div>

          {/* Quick Action Cards & Urgent Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Urgent Tasks Queue */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">Priority Work Orders</h3>
                  <p className="text-xs text-slate-500">Ordered by risk severity and SLA urgency</p>
                </div>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {assignedReports.filter(t => t.status !== "Resolved").length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">Queue is Clear!</p>
                  <p className="text-xs text-slate-500 mt-0.5">No pending or critical work orders assigned to {activeTeam.name}.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {assignedReports
                    .filter(t => t.status !== "Resolved")
                    .slice(0, 4)
                    .map(task => {
                      const dist = calculateHaversineDistance(crewLocation.latitude, crewLocation.longitude, task.latitude, task.longitude);
                      const sla = calculateSlaStatus(task.priority, task.assignment?.assignedAt || task.createdAt);
                      const isCritical = task.priority === "Critical" || task.severity >= 80;

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskDetailsOpen(true);
                          }}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {(task.image || task.evidenceUrl || task.evidenceFrames?.[0]) ? (
                              <img 
                                src={task.image || task.evidenceUrl || task.evidenceFrames?.[0] || ""} 
                                alt={task.title} 
                                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Wrench className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                  isCritical ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                                }`}>
                                  {task.priority || "Medium"}
                                </span>
                                <span className="text-xs font-extrabold text-slate-800 truncate">
                                  {task.title}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{task.location || "Delhi NCR Corridor"}</span>
                                <span className="font-bold text-blue-600">({dist.formatted})</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 sm:self-center">
                            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${sla.statusColor}`}>
                              {sla.statusLabel}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {task.fieldStatus || "ASSIGNED"}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Quick Actions & Field Guide */}
            <div className="flex flex-col gap-4">
              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-6 rounded-3xl shadow-sm border border-blue-800 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">Fast Actions</span>
                  <h4 className="text-base font-extrabold text-white mt-1">Field Verification Routine</h4>
                  <p className="text-xs text-blue-200/80 mt-1 leading-relaxed">
                    Capture before and after photos on site to feed the AI verification model and instantly release citizen civic points upon municipal review.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (assignedReports.length > 0) {
                        setVerifyTaskId(assignedReports[0].id);
                      }
                      setActiveTab("verify");
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Field Verification</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("map")}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Open Navigation Map</span>
                  </button>
                </div>
              </div>

              {/* Safety Quick Check */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Encountered Hazard?</h5>
                    <p className="text-[11px] text-slate-500">Report unsafe site condition to dispatch</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("safety")}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Alert SOS
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* 2. MY TASKS LIST VIEW */}
      {/* =================================================== */}
      {activeTab === "tasks" && (
        <div className="flex flex-col gap-5">
          {/* Controls: Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search assigned tasks by title, location, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Incomplete)</option>
                <option value="OVERDUE">Overdue SLA</option>
                <option value="RESOLVED">Resolved / Closed</option>
              </select>

              <button
                onClick={onRefreshReports}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="Refresh Assigned Tasks"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Task Cards Grid */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-2xs">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700 text-sm">No matching tasks found</p>
              <p className="text-xs text-slate-400 mt-1">Try relaxing filters or check back when municipal dispatch assigns new orders.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map(task => {
                const dist = calculateHaversineDistance(crewLocation.latitude, crewLocation.longitude, task.latitude, task.longitude);
                const sla = calculateSlaStatus(task.priority, task.assignment?.assignedAt || task.createdAt);
                const isCritical = task.priority === "Critical" || task.severity >= 80;
                const isRework = task.fieldStatus === "RETURN_TO_TEAM";

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-sm ${
                      isRework 
                        ? "border-amber-400 bg-amber-50/20" 
                        : isCritical 
                        ? "border-rose-300" 
                        : "border-slate-200"
                    }`}
                  >
                    <div className="p-5 flex flex-col gap-3">
                      {/* Card Header with Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          isCritical ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {task.priority || "Medium"}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${sla.statusColor}`}>
                          {sla.statusLabel}
                        </span>
                      </div>

                      {/* Photo + Details Preview */}
                      <div className="flex items-start gap-3">
                        {(task.image || task.evidenceUrl || task.evidenceFrames?.[0]) ? (
                          <img
                            src={task.image || task.evidenceUrl || task.evidenceFrames?.[0] || ""}
                            alt={task.title}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Wrench className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-800 leading-snug line-clamp-1">{task.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.category}</p>
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{task.location || "Delhi NCR Corridor"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Distance & SLA Remaining Info */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-blue-500" />
                          <span>{dist.formatted} away</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Due: {sla.deadline}
                        </span>
                      </div>

                      {/* Rework Alert Tag */}
                      {isRework && task.resolution?.rejectionReason && (
                        <div className="p-2 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] text-amber-900 font-medium">
                          <strong>Rework:</strong> {task.resolution.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setIsTaskDetailsOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>

                      {/* Lifecycle Action Buttons */}
                      {isMunicipalMonitor ? (
                        <div className="flex items-center gap-1.5">
                          {(!task.fieldStatus || task.fieldStatus === "ASSIGNED") && (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setIsReassignModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors"
                            >
                              Reassign
                            </button>
                          )}
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            Squad Active
                          </span>
                        </div>
                      ) : (
                        <>
                          {(!task.fieldStatus || task.fieldStatus === "ASSIGNED") && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsReassignModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 rounded-lg cursor-pointer"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => handleAcceptTask(task)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                              >
                                Accept Task
                              </button>
                            </div>
                          )}

                          {task.fieldStatus === "ACCEPTED" && (
                            <button
                              onClick={() => handleStartTravel(task)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Start Travel</span>
                            </button>
                          )}

                          {task.fieldStatus === "EN_ROUTE" && (
                            <button
                              onClick={() => handleMarkArrived(task)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Arrived On Site</span>
                            </button>
                          )}

                          {task.fieldStatus === "ON_SITE" && (
                            <button
                              onClick={() => {
                                setVerifyTaskId(task.id);
                                setActiveTab("verify");
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Verify Hazard</span>
                            </button>
                          )}

                          {(task.fieldStatus === "VERIFIED" || task.fieldStatus === "ACTION_STARTED" || isRework) && (
                            <button
                              onClick={() => {
                                setWorkTaskId(task.id);
                                setActiveTab("work");
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>{isRework ? "Resubmit" : "Log Repair"}</span>
                            </button>
                          )}
                        </>
                      )}

                      {task.fieldStatus === "RESOLUTION_SUBMITTED" && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                          Review Pending
                        </span>
                      )}

                      {(task.status === "Resolved" || task.fieldStatus === "CLOSED") && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Resolved</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================== */}
      {/* 3. GIS NAVIGATION MAP VIEW */}
      {/* =================================================== */}
      {activeTab === "map" && (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Map Container */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden h-[540px] relative">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Map Overlay Card for Selected Incident */}
            {selectedTask && (
              <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:w-96 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl z-[1000] flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-600">{selectedTask.category}</span>
                    <h4 className="font-extrabold text-sm text-slate-800">{selectedTask.title}</h4>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Location: {selectedTask.location || "Delhi NCR Corridor"}</span>
                  <span className="font-bold text-blue-600">
                    {calculateHaversineDistance(crewLocation.latitude, crewLocation.longitude, selectedTask.latitude, selectedTask.longitude).formatted}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTask.latitude},${selectedTask.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>External GPS Navigation</span>
                  </a>
                  <button
                    onClick={() => setIsTaskDetailsOpen(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Route List */}
          <div className="w-full lg:w-80 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Assigned Geolocation Queue</h3>
              <p className="text-xs text-slate-500">Tap an incident to center map & preview route</p>
            </div>

            <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1">
              {assignedReports.map(task => {
                const dist = calculateHaversineDistance(crewLocation.latitude, crewLocation.longitude, task.latitude, task.longitude);
                const isSelected = selectedTask?.id === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-blue-50 border-blue-500 shadow-xs" 
                        : "bg-slate-50/70 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">#{task.id.slice(-6).toUpperCase()}</span>
                      <span className="text-xs font-extrabold text-blue-600">{dist.formatted}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{task.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{task.location || "Delhi NCR Corridor"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* 4. FIELD VERIFICATION VIEW */}
      {/* =================================================== */}
      {activeTab === "verify" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col gap-6 max-w-3xl mx-auto">
          <div>
            <h3 className="text-lg font-black text-slate-900">On-Site Field Verification</h3>
            <p className="text-xs text-slate-500 mt-1">
              Confirm hazard presence, capture on-site photographic evidence, and run AI verification prior to starting repair actions.
            </p>
          </div>

          <form onSubmit={handleSubmitVerification} className="flex flex-col gap-5">
            {/* Step 1: Task Selector */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Select Incident</label>
              <select
                value={verifyTaskId}
                onChange={(e) => {
                  setVerifyTaskId(e.target.value);
                  setVerifyAiResult(null);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="">-- Select Assigned Incident --</option>
                {assignedReports.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.id.slice(-6).toUpperCase()}] {t.title} - {t.location || "Delhi NCR"}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Verification Result Radio / Big Buttons */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-2">Inspection Outcome</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "ISSUE_CONFIRMED", title: "Issue Confirmed", desc: "Hazard matches report description & needs repair", color: "border-emerald-500 text-emerald-700 bg-emerald-50/40" },
                  { id: "ISSUE_NOT_FOUND", title: "Issue Not Found", desc: "No hazard present or already cleared", color: "border-slate-400 text-slate-700 bg-slate-50" },
                  { id: "PARTIALLY_VERIFIED", title: "Partially Verified", desc: "Surface condition differs from original report", color: "border-amber-500 text-amber-700 bg-amber-50/40" },
                  { id: "NEEDS_FURTHER_INSPECTION", title: "Needs Specialized Unit", desc: "Requires civil engineering / heavy machinery", color: "border-blue-500 text-blue-700 bg-blue-50/40" },
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setVerifyResult(opt.id as FieldVerificationResult)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      verifyResult === opt.id ? opt.color + " shadow-xs ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">{opt.title}</span>
                      {verifyResult === opt.id && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Evidence Capture / Photo Upload */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                On-Site Evidence Photograph
              </label>
              <div className="flex flex-col gap-3">
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                  <Camera className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Tap to Take Photo or Upload Image</span>
                  <span className="text-[10px] text-slate-400 font-mono">JPG, PNG up to 10MB • Saved to Firebase Storage</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleVerifyEvidenceUpload}
                    className="hidden"
                    disabled={isUploadingVerify}
                  />
                </label>

                {isUploadingVerify && (
                  <p className="text-xs font-bold text-blue-600 animate-pulse text-center">Uploading evidence to secure storage...</p>
                )}

                {/* Uploaded Previews */}
                {verifyEvidenceFiles.length > 0 && (
                  <div className="flex items-center gap-3 overflow-x-auto p-1">
                    {verifyEvidenceFiles.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setVerifyEvidenceFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 4: AI Assisted Field Verification */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-slate-800">AI-Assisted Field Verification</span>
                </div>
                <button
                  type="button"
                  onClick={handleAiVerify}
                  disabled={isAiAnalyzing || !verifyTaskId}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isAiAnalyzing ? "Evaluating Photo..." : "Analyze with Gemini"}</span>
                </button>
              </div>

              {verifyAiResult && (
                <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-700">Classification: {verifyAiResult.classification}</span>
                    <span className="font-mono text-slate-500">Confidence: {verifyAiResult.confidence}%</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">{verifyAiResult.notes}</p>
                </div>
              )}
            </div>

            {/* Step 5: Verification Notes */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Verification Notes</label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Describe exact site conditions, observed dimensions, traffic risk, or reasons why issue was confirmed/not found..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!verifyTaskId}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Verification & Proceed to Active Repair</span>
            </button>
          </form>
        </div>
      )}

      {/* =================================================== */}
      {/* 5. WORK & RESOLUTION VIEW */}
      {/* =================================================== */}
      {activeTab === "work" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col gap-6 max-w-3xl mx-auto">
          <div>
            <h3 className="text-lg font-black text-slate-900">Record Repair & Submit Resolution</h3>
            <p className="text-xs text-slate-500 mt-1">
              Document repair action taken, record materials deployed, and upload mandatory AFTER photographs for municipal review.
            </p>
          </div>

          <form onSubmit={handleSubmitResolution} className="flex flex-col gap-5">
            {/* Task Selector */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Select Incident</label>
              <select
                value={workTaskId}
                onChange={(e) => setWorkTaskId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="">-- Select Verified Incident --</option>
                {assignedReports.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.id.slice(-6).toUpperCase()}] {t.title} ({t.fieldStatus || "In Progress"})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Pre-filled Action Suggestions */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Action Taken</label>
              <input
                type="text"
                value={repairAction}
                onChange={(e) => setRepairAction(e.target.value)}
                placeholder="e.g. Cold asphalt compaction and hot sealant application"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500"
                required
              />
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {[
                  "Cold Asphalt Patching",
                  "Hot Mix Surface Repair",
                  "LED Luminaire Replacement",
                  "Debris & Refuse Clearance",
                  "Tree Limb / Barrier Removal",
                  "Drainage Grate Cleared"
                ].map(sug => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setRepairAction(sug)}
                    className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Mandatory After Photos */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                Mandatory Completion Evidence (After Photo)
              </label>
              <div className="flex flex-col gap-3">
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-emerald-50/20 flex flex-col items-center justify-center gap-2">
                  <Camera className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Upload Completed Repair Photo</span>
                  <span className="text-[10px] text-slate-400 font-mono">Mandatory proof for municipal sign-off</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAfterEvidenceUpload}
                    className="hidden"
                    disabled={isUploadingAfter}
                  />
                </label>

                {isUploadingAfter && (
                  <p className="text-xs font-bold text-emerald-600 animate-pulse text-center">Uploading repair completion photo...</p>
                )}

                {/* Previews */}
                {afterEvidenceFiles.length > 0 && (
                  <div className="flex items-center gap-3 overflow-x-auto p-1">
                    {afterEvidenceFiles.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0">
                        <img src={url} alt="After Evidence" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAfterEvidenceFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Repair Notes */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Work Details & Crew Log</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Log materials used, crew members on site, weather conditions, equipment deployed..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmittingResolution || !workTaskId || afterEvidenceFiles.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmittingResolution ? "Submitting for Municipal Review..." : "Submit Resolution for Municipal Sign-Off"}</span>
            </button>
          </form>
        </div>
      )}

      {/* =================================================== */}
      {/* 6. FIELD COPILOT AI VIEW */}
      {/* =================================================== */}
      {activeTab === "copilot" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4 max-w-3xl mx-auto h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Field Operations Copilot</h3>
                <p className="text-xs text-slate-400">Grounded in {activeTeam.name}'s assigned incidents</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● LIVE
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {copilotMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-xs font-medium"
                      : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {msg.actionTaskId && (
                  <button
                    onClick={() => {
                      const t = reports.find(r => r.id === msg.actionTaskId);
                      if (t) {
                        setSelectedTask(t);
                        setIsTaskDetailsOpen(true);
                      }
                    }}
                    className="mt-1.5 px-3 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Open Task #{msg.actionTaskId.slice(-6).toUpperCase()}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              "Which task should I handle first?",
              "Where is my nearest critical task?",
              "What tasks are overdue?",
              "What evidence is required to close?"
            ].map(q => (
              <button
                key={q}
                onClick={() => handleCopilotSend(q)}
                className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full shrink-0 cursor-pointer transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCopilotSend()}
              placeholder="Ask Copilot about your queue, routing, SLA, or required evidence..."
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
            <button
              onClick={() => handleCopilotSend()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* 7. SAFETY & SOS VIEW */}
      {/* =================================================== */}
      {activeTab === "safety" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Field Safety & Incident Alert</h3>
              <p className="text-xs text-slate-500">
                Immediately report unsafe physical conditions, traffic hazards, or structural risks to the Municipal Dispatch Desk.
              </p>
            </div>
          </div>

          {unsafeSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Safety alert broadcasted to Municipal Command Center! Dispatch has been notified.</span>
            </div>
          )}

          <form onSubmit={handleReportUnsafe} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Associated Incident</label>
              <select
                value={selectedTask?.id || ""}
                onChange={(e) => {
                  const t = reports.find(r => r.id === e.target.value);
                  setSelectedTask(t || null);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="">-- Select Incident Site --</option>
                {assignedReports.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.id.slice(-6).toUpperCase()}] {t.title} - {t.location || "Delhi NCR"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Hazard Condition Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "TRAFFIC_RISK", label: "High Speed Traffic / No Barrier" },
                  { id: "LIVE_WIRE", label: "Live Electrical Wire Exposed" },
                  { id: "STRUCTURAL_COLLAPSE", label: "Structural Collapse Hazard" },
                  { id: "TOXIC_SPILL", label: "Chemical / Sewage Spill" },
                  { id: "WEATHER_RISK", label: "Adverse Weather / Flash Flood" },
                  { id: "BYSTANDER_INTERFERENCE", label: "Hostile Crowds / Interference" }
                ].map(cond => (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setUnsafeCategory(cond.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      unsafeCategory === cond.id
                        ? "bg-rose-50 border-rose-500 text-rose-800 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Condition Details & Urgency</label>
              <textarea
                value={unsafeNotes}
                onChange={(e) => setUnsafeNotes(e.target.value)}
                placeholder="Explain the safety impediment preventing work or endangering crew..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={unsafeSubmitting || !selectedTask}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{unsafeSubmitting ? "Transmitting Alert..." : "Broadcast Safety Alert to Command Center"}</span>
            </button>
          </form>
        </div>
      )}

      {/* =================================================== */}
      {/* 8. TEAM PROFILE VIEW */}
      {/* =================================================== */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
              {activeTeam.id}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">{activeTeam.name}</h3>
              <p className="text-xs text-slate-500">Operating under Municipal Infrastructure Division</p>
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                Assigned Category: {activeTeam.category}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Field Lead</span>
              <span className="font-extrabold text-slate-800">{activeTeam.lead}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">District Base</span>
              <span className="font-extrabold text-slate-800">{activeTeam.district}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Direct Dispatch Phone</span>
              <span className="font-extrabold text-slate-800">{activeTeam.phone}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Shift Completed</span>
              <span className="font-extrabold text-emerald-600">{stats.resolved} Closed Orders</span>
            </div>
          </div>

          {/* Switch Squad for simulation */}
          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-extrabold text-slate-700 block mb-2">Switch Active Field Unit</label>
            <div className="flex flex-col gap-2">
              {DEFAULT_FIELD_TEAMS.map(team => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedTeamId === team.id ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs" : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold">{team.id} - {team.name}</span>
                    <p className="text-[11px] text-slate-500">{team.category} • {team.district}</p>
                  </div>
                  {selectedTeamId === team.id && <Check className="w-4 h-4 text-blue-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* TASK DETAILS MODAL / DRAWER */}
      {/* =================================================== */}
      {isTaskDetailsOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[1200]">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold">
                    #{selectedTask.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {selectedTask.category}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    Severity: {selectedTask.severity}/100
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedTask.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedTask.location || "Delhi NCR Corridor"}</span>
                </p>
              </div>
              <button
                onClick={() => setIsTaskDetailsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Preview */}
            {(selectedTask.image || selectedTask.evidenceUrl || selectedTask.evidenceFrames?.[0]) && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-64 bg-slate-100">
                <img 
                  src={selectedTask.image || selectedTask.evidenceUrl || selectedTask.evidenceFrames?.[0] || ""} 
                  alt={selectedTask.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Description & AI Reasoning */}
            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-extrabold text-slate-700 block mb-1">Citizen / Detection Description:</span>
                <p className="text-slate-600 leading-relaxed">{selectedTask.description || "No description provided."}</p>
              </div>

              {selectedTask.aiAnalysis && (
                <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-200">
                  <span className="font-extrabold text-blue-800 block mb-1">AI Risk Assessment:</span>
                  <p className="text-blue-700 leading-relaxed">{selectedTask.aiAnalysis.description}</p>
                </div>
              )}

              {/* Rework comments if returned */}
              {selectedTask.fieldStatus === "RETURN_TO_TEAM" && selectedTask.resolution?.rejectionReason && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300">
                  <span className="font-extrabold text-amber-900 block mb-1">Municipal Rejection Feedback:</span>
                  <p className="text-amber-800 font-bold">{selectedTask.resolution.rejectionReason}</p>
                  {selectedTask.resolution.rejectionNotes && (
                    <p className="text-amber-700 mt-1">{selectedTask.resolution.rejectionNotes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Workflow Timeline Status */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
                Operational Task Lifecycle
              </span>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className={selectedTask.assignment?.assignedAt ? "text-blue-600 font-black" : "text-slate-400"}>1. Assigned</span>
                <span>→</span>
                <span className={selectedTask.assignment?.acceptedAt ? "text-blue-600 font-black" : "text-slate-400"}>2. Accepted</span>
                <span>→</span>
                <span className={selectedTask.assignment?.arrivedAt ? "text-blue-600 font-black" : "text-slate-400"}>3. On Site</span>
                <span>→</span>
                <span className={selectedTask.fieldVerification ? "text-blue-600 font-black" : "text-slate-400"}>4. Verified</span>
                <span>→</span>
                <span className={selectedTask.resolution ? "text-emerald-600 font-black" : "text-slate-400"}>5. Resolved</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsTaskDetailsOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>

              {isMunicipalMonitor ? (
                (!selectedTask.fieldStatus || selectedTask.fieldStatus === "ASSIGNED") && (
                  <button
                    onClick={() => {
                      setIsTaskDetailsOpen(false);
                      setIsReassignModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reassign Task
                  </button>
                )
              ) : (
                <>
                  {(!selectedTask.fieldStatus || selectedTask.fieldStatus === "ASSIGNED") && (
                    <button
                      onClick={() => {
                        handleAcceptTask(selectedTask);
                        setIsTaskDetailsOpen(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Accept Assignment
                    </button>
                  )}

                  {selectedTask.fieldStatus === "ACCEPTED" && (
                    <button
                      onClick={() => {
                        handleStartTravel(selectedTask);
                        setIsTaskDetailsOpen(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Start Travel
                    </button>
                  )}

                  {selectedTask.fieldStatus === "EN_ROUTE" && (
                    <button
                      onClick={() => {
                        handleMarkArrived(selectedTask);
                        setIsTaskDetailsOpen(false);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Mark Arrived
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* REASSIGNMENT REQUEST MODAL */}
      {/* =================================================== */}
      {isReassignModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[1300]">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Request Task Reassignment</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Notify municipal dispatch why {activeTeam.name} is unable to service #{selectedTask.id.slice(-6).toUpperCase()}.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Reason</label>
                <select
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
                >
                  <option value="EQUIPMENT_UNAVAILABLE">Specialized Equipment Unavailable</option>
                  <option value="OUT_OF_SECTOR">Out of Team's Operational Sector</option>
                  <option value="CREW_CAPACITY_FULL">Maximum Active Shift Capacity Reached</option>
                  <option value="SAFETY_HAZARD">Severe Site Safety Risk / Unsafe to Enter</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Notes for Municipal Dispatch</label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="Provide context so dispatcher can route to appropriate squad..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestReassignment}
                disabled={reassignSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {reassignSubmitting ? "Transmitting..." : "Submit Reassignment"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
