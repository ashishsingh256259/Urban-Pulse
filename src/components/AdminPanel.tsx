import React, { useState, useEffect } from "react";
import { UrbanPulseLogo } from "./UrbanPulseLogo";
import {
  ShieldAlert,
  Users,
  Briefcase,
  Activity,
  FileText,
  Settings,
  UserCheck,
  UserX,
  UserPlus,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  BarChart2,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building,
  Shield,
  Loader2,
  ArrowUpRight,
  Camera,
  Radio
} from "lucide-react";
import { User, UserRole, FieldTeamMeta, Report, isEmergencySosReport } from "../types";
import {
  getAdminUsers,
  createAdminUser,
  toggleUserStatus,
  updateUserRole,
  getPlatformTeams,
  createPlatformTeam,
  updatePlatformTeam,
  toggleTeamStatus,
  getDepartmentForCategory
} from "../services/adminService";

export type AdminTab = "overview" | "reports" | "users" | "teams" | "settings";

interface AdminPanelProps {
  currentAdminEmail?: string;
  currentUserEmail?: string;
  currentUserName?: string;
  initialTab?: AdminTab;
  reports?: Report[];
  onTabChange?: (tab: AdminTab) => void;
  onUserUpdated?: () => void;
  onSelectReport?: (report: Report) => void;
  onNavigateSection?: (sectionId: string, filterOptions?: { source?: string; isSos?: boolean; category?: string; status?: string }) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  currentAdminEmail, 
  currentUserEmail, 
  currentUserName, 
  initialTab,
  reports = [],
  onTabChange,
  onUserUpdated,
  onSelectReport,
  onNavigateSection
}) => {
  const adminEmail = currentAdminEmail || currentUserEmail || "admin@urbanpulse.gov";
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || "overview");

  // Report Registry Filters State
  const [reportSourceFilter, setReportSourceFilter] = useState<"ALL" | "ROAD_SCANNER" | "CITIZEN" | "EMERGENCY_SOS">("ALL");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("ALL");
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>("ALL");
  const [reportSearchQuery, setReportSearchQuery] = useState<string>("");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (tab: AdminTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<FieldTeamMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [teamSearch, setTeamSearch] = useState("");

  // Dynamic calculations for Incident & Report Telemetry
  const totalReportsCount = reports.length;
  const scannerReportsCount = reports.filter(r => r.source === "ROAD_SCANNER" || (r as any).source === "AI_SCANNER").length;
  const citizenReportsCount = reports.filter(r => (r.source === "MANUAL_REPORT" || (r as any).source === "CITIZEN" || !r.source) && !isEmergencySosReport(r)).length;
  const sosReportsCount = reports.filter(r => isEmergencySosReport(r) || (r as any).source === "EMERGENCY_SOS").length;

  // Filtered reports for the Admin Report Registry view
  const filteredAdminReports = reports.filter(r => {
    if (!r) return false;
    
    // Exclude rejected reports from general registry unless explicitly filtering by REJECTED status
    if (r.status === "REJECTED" && reportStatusFilter !== "REJECTED") return false;
    
    // Source filter
    if (reportSourceFilter === "ROAD_SCANNER") {
      if (r.source !== "ROAD_SCANNER" && (r as any).source !== "AI_SCANNER") return false;
    } else if (reportSourceFilter === "CITIZEN") {
      if ((r.source === "ROAD_SCANNER" || (r as any).source === "AI_SCANNER") || isEmergencySosReport(r)) return false;
    } else if (reportSourceFilter === "EMERGENCY_SOS") {
      if (!isEmergencySosReport(r) && (r as any).source !== "EMERGENCY_SOS") return false;
    }

    // Status filter
    if (reportStatusFilter !== "ALL" && r.status !== reportStatusFilter) return false;

    // Category filter
    if (reportCategoryFilter !== "ALL" && r.category !== reportCategoryFilter) return false;

    // Search query
    if (reportSearchQuery.trim()) {
      const q = reportSearchQuery.toLowerCase();
      const matchTitle = (r.title || "").toLowerCase().includes(q);
      const matchDesc = (r.description || "").toLowerCase().includes(q);
      const matchId = (r.id || "").toLowerCase().includes(q);
      const matchLoc = (r.location || "").toLowerCase().includes(q);
      const matchRep = (r.reporterName || r.reporterEmail || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId && !matchLoc && !matchRep) return false;
    }

    return true;
  });

  // Modals state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRoleInput, setNewRoleInput] = useState<UserRole>("citizen");
  const [newDeptInput, setNewDeptInput] = useState("");

  // Add User Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("citizen");
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [newUserTeamId, setNewUserTeamId] = useState("");
  const [newUserActive, setNewUserActive] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // User Details Modal state
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLead, setNewTeamLead] = useState("");
  const [newTeamCategory, setNewTeamCategory] = useState("Pothole");
  const [newTeamDistrict, setNewTeamDistrict] = useState("Central Zone");
  const [newTeamDepartment, setNewTeamDepartment] = useState("Roads & Highway Authority (PWD)");
  const [newTeamPhone, setNewTeamPhone] = useState("+91 98110 ");
  const [newTeamMembers, setNewTeamMembers] = useState(4);

  const [editingTeam, setEditingTeam] = useState<FieldTeamMeta | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Load Admin Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, tList] = await Promise.all([
        getAdminUsers(),
        getPlatformTeams()
      ]);
      setUsers(uList);
      setTeams(tList);
      if (tList.length > 0 && !newUserTeamId) {
        setNewUserTeamId(tList[0].id);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Create User Action (Admin Only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);

    const name = newUserName.trim();
    const email = newUserEmail.trim();
    const pass = newUserPassword.trim();

    if (!name || !email || !pass) {
      setCreateUserError("Full Name, Email Address, and Password are required.");
      return;
    }

    if (pass.length < 6) {
      setCreateUserError("Password must be at least 6 characters long.");
      return;
    }

    setCreatingUser(true);
    try {
      let selectedTeamMeta: FieldTeamMeta | undefined;
      let finalDept = newUserDepartment.trim();

      if (newUserRole === "citizen") {
        finalDept = "Civilian Public";
      } else if (newUserRole === "field_team") {
        selectedTeamMeta = teams.find(t => t.id === newUserTeamId) || teams[0];
        finalDept = selectedTeamMeta?.department || "Civil Works & Surface Repair";
      } else if (newUserRole === "municipal") {
        if (!finalDept) finalDept = "Public Works & Urban Roads (PWD)";
      } else if (newUserRole === "admin") {
        if (!finalDept) finalDept = "Municipal Digital Governance Board";
      }

      const created = await createAdminUser({
        fullName: name,
        email: email,
        password: pass,
        phone: newUserPhone.trim() || undefined,
        role: newUserRole,
        department: finalDept,
        active: newUserActive,
        teamId: selectedTeamMeta?.id,
        teamName: selectedTeamMeta?.name,
        teamLead: selectedTeamMeta?.lead,
        availability: newUserRole === "field_team" ? "AVAILABLE" : undefined,
        adminEmail: adminEmail
      });

      // Update state immediately so new user appears in table
      setUsers(prev => [created, ...prev.filter(u => u.id !== created.id)]);

      // Close modal and reset form
      setShowAddUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserPhone("");
      setNewUserRole("citizen");
      setNewUserDepartment("");
      setNewUserActive(true);

      showNotification("User created successfully");
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      setCreateUserError(err.message || "Failed to create user account.");
    } finally {
      setCreatingUser(false);
    }
  };

  // User Actions
  const handleToggleUser = async (user: User) => {
    const nextStatus = !user.active;
    await toggleUserStatus(user.id, nextStatus, currentAdminEmail);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: nextStatus } : u));
    showNotification(`User ${user.fullName} has been ${nextStatus ? "activated" : "deactivated"}.`);
  };

  const handleSaveUserRole = async () => {
    if (!editingUser) return;
    await updateUserRole(editingUser.id, newRoleInput, newDeptInput, currentAdminEmail);
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: newRoleInput, department: newDeptInput } : u));
    setEditingUser(null);
    showNotification(`Updated role for ${editingUser.fullName} to ${newRoleInput.toUpperCase()}.`);
  };

  // Team Actions
  const handleToggleTeam = async (team: FieldTeamMeta) => {
    const nextStatus = !team.active;
    await toggleTeamStatus(team.id, nextStatus, currentAdminEmail);
    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, active: nextStatus } : t));
    showNotification(`Team ${team.name} has been ${nextStatus ? "activated" : "deactivated"}.`);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamLead.trim()) return;

    const created = await createPlatformTeam(
      {
        name: newTeamName.trim(),
        lead: newTeamLead.trim(),
        category: newTeamCategory,
        district: newTeamDistrict,
        department: newTeamDepartment,
        phone: newTeamPhone.trim(),
        membersCount: Number(newTeamMembers) || 4
      },
      currentAdminEmail
    );

    setTeams(prev => [created, ...prev]);
    setShowCreateTeamModal(false);
    setNewTeamName("");
    setNewTeamLead("");
    showNotification(`Created new Field Team squad: ${created.name}.`);
  };

  const handleSaveTeamEdit = async () => {
    if (!editingTeam) return;
    await updatePlatformTeam(editingTeam.id, editingTeam, currentAdminEmail);
    setTeams(prev => prev.map(t => t.id === editingTeam.id ? editingTeam : t));
    setEditingTeam(null);
    showNotification(`Updated configuration for ${editingTeam.name}.`);
  };

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.department && u.department.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    t.lead.toLowerCase().includes(teamSearch.toLowerCase()) ||
    t.district.toLowerCase().includes(teamSearch.toLowerCase()) ||
    t.category.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Admin Header Banner / Hero Registry Card */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F0F7FF] to-[#E6F0FA] text-[#0F172A] rounded-2xl p-6 sm:p-7 shadow-xs border border-[#BFDBFE] relative overflow-hidden">
        {/* Subtle Civic / Delhi Cityscape Illustration on Right */}
        <div className="absolute right-0 top-0 bottom-0 w-[420px] md:w-[500px] lg:w-[560px] pointer-events-none overflow-hidden select-none opacity-85">
          <svg
            viewBox="0 0 560 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-cover object-right"
            preserveAspectRatio="xMaxYMid slice"
          >
            <defs>
              <linearGradient id="fadeMaskGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
              </linearGradient>
              <mask id="fadeMask">
                <rect x="0" y="0" width="560" height="220" fill="url(#fadeMaskGrad)" />
              </mask>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#DBEAFE" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="monumentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.75" />
              </linearGradient>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
              </radialGradient>
            </defs>
            
            <g mask="url(#fadeMask)">
              <rect x="0" y="0" width="560" height="220" fill="url(#skyGrad)" />
              <circle cx="280" cy="110" r="140" fill="url(#sunGlow)" />
              
              {/* Background City Towers */}
              <rect x="420" y="55" width="28" height="165" fill="#BFDBFE" opacity="0.4" rx="2" />
              <rect x="455" y="40" width="36" height="180" fill="#93C5FD" opacity="0.45" rx="3" />
              <polygon points="473,15 465,40 481,40" fill="#93C5FD" opacity="0.45" />
              <rect x="498" y="70" width="40" height="150" fill="#BFDBFE" opacity="0.4" rx="2" />
              <rect x="545" y="45" width="30" height="175" fill="#93C5FD" opacity="0.35" rx="2" />
              
              {/* Midground Skyline */}
              <rect x="70" y="90" width="32" height="130" fill="#BFDBFE" opacity="0.35" rx="2" />
              <rect x="110" y="70" width="38" height="150" fill="#93C5FD" opacity="0.4" rx="2" />
              <rect x="155" y="95" width="44" height="125" fill="#BFDBFE" opacity="0.4" rx="2" />
              <polygon points="129,48 122,70 136,70" fill="#93C5FD" opacity="0.4" />

              {/* Tower Windows */}
              <line x1="465" y1="60" x2="485" y2="60" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />
              <line x1="465" y1="80" x2="485" y2="80" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />
              <line x1="465" y1="100" x2="485" y2="100" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />
              <line x1="465" y1="120" x2="485" y2="120" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />

              {/* Architectural India Gate Monument */}
              <rect x="200" y="200" width="160" height="8" fill="#93C5FD" opacity="0.8" rx="1" />
              <rect x="210" y="194" width="140" height="6" fill="#60A5FA" opacity="0.85" rx="1" />
              <rect x="218" y="190" width="124" height="4" fill="#3B82F6" opacity="0.75" />

              <rect x="224" y="90" width="32" height="100" fill="url(#monumentGrad)" />
              <rect x="304" y="90" width="32" height="100" fill="url(#monumentGrad)" />

              <rect x="232" y="110" width="16" height="45" fill="#60A5FA" opacity="0.6" rx="8" />
              <rect x="312" y="110" width="16" height="45" fill="#60A5FA" opacity="0.6" rx="8" />

              <path
                d="M256,190 L256,130 Q280,105 304,130 L304,190 Z"
                fill="#EEF5FF"
                opacity="0.95"
              />
              <path
                d="M256,190 L256,130 Q280,105 304,130 L304,190"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeOpacity="0.7"
                fill="none"
              />

              <rect x="216" y="80" width="128" height="10" fill="#3B82F6" opacity="0.85" rx="1" />
              <rect x="222" y="62" width="116" height="18" fill="url(#monumentGrad)" rx="1" />
              <rect x="228" y="52" width="104" height="10" fill="#2563EB" opacity="0.75" rx="1" />
              <rect x="236" y="44" width="88" height="8" fill="#1D4ED8" opacity="0.8" rx="1" />
              <path d="M258,44 Q280,36 302,44 Z" fill="#2563EB" opacity="0.85" />

              {/* Park Foliage & Trees */}
              <circle cx="190" cy="180" r="22" fill="#6EE7B7" opacity="0.6" />
              <circle cx="175" cy="185" r="18" fill="#34D399" opacity="0.5" />
              <circle cx="205" cy="188" r="16" fill="#10B981" opacity="0.5" />
              <rect x="188" y="195" width="4" height="15" fill="#065F46" opacity="0.6" rx="1" />

              <circle cx="360" cy="180" r="22" fill="#6EE7B7" opacity="0.6" />
              <circle cx="375" cy="185" r="18" fill="#34D399" opacity="0.5" />
              <circle cx="345" cy="188" r="16" fill="#10B981" opacity="0.5" />
              <rect x="358" y="195" width="4" height="15" fill="#065F46" opacity="0.6" rx="1" />

              <circle cx="140" cy="192" r="14" fill="#A7F3D0" opacity="0.45" />
              <circle cx="410" cy="192" r="15" fill="#A7F3D0" opacity="0.45" />

              <rect x="0" y="208" width="560" height="12" fill="#E2E8F0" opacity="0.5" />
              <line x1="0" y1="208" x2="560" y2="208" stroke="#CBD5E1" strokeWidth="1" strokeOpacity="0.6" />

              <path d="M380,60 Q385,55 390,60 Q395,55 400,60" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
              <path d="M410,75 Q414,71 418,75 Q422,71 426,75" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.35" fill="none" />
            </g>
          </svg>
        </div>

        {/* Hero Card Content */}
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <span className="text-[#2563EB] text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <UrbanPulseLogo className="w-5 h-5" />
                  <span>URBANPULSE PLATFORM GOVERNANCE</span>
                </span>
                <span className="bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide">
                  SUPER ADMIN CLEARANCE
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] font-display">
                Platform Administration & System Registry
              </h1>
              <p className="text-[#475569] text-xs sm:text-sm mt-1.5 leading-relaxed font-sans max-w-xl">
                Centralized authority for user roles, squad provisioning, security boundaries, and platform health telemetry.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] px-4 py-2 rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Syncing..." : "Sync Registry"}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Tab / Navigation Row directly under Hero */}
          <div className="flex items-center gap-2 overflow-x-auto pt-6 mt-6 border-t border-[#BFDBFE]/60 text-xs font-semibold scrollbar-none">
            <button
              onClick={() => handleTabSelect("overview")}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "overview"
                  ? "bg-[#2563EB] text-white shadow-xs font-bold"
                  : "text-[#334155] hover:text-[#0F172A] hover:bg-white/60 font-semibold"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Platform Overview</span>
            </button>
            <button
              onClick={() => handleTabSelect("reports")}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "reports"
                  ? "bg-[#2563EB] text-white shadow-xs font-bold"
                  : "text-[#334155] hover:text-[#0F172A] hover:bg-white/60 font-semibold"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Incident Registry ({reports.length})</span>
            </button>
            <button
              onClick={() => handleTabSelect("users")}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "users"
                  ? "bg-[#2563EB] text-white shadow-xs font-bold"
                  : "text-[#334155] hover:text-[#0F172A] hover:bg-white/60 font-semibold"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Management ({users.length || 21})</span>
            </button>
            <button
              onClick={() => handleTabSelect("teams")}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "teams"
                  ? "bg-[#2563EB] text-white shadow-xs font-bold"
                  : "text-[#334155] hover:text-[#0F172A] hover:bg-white/60 font-semibold"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Team Management ({teams.length || 5})</span>
            </button>
            <button
              onClick={() => handleTabSelect("settings")}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#2563EB] text-white shadow-xs font-bold"
                  : "text-[#334155] hover:text-[#0F172A] hover:bg-white/60 font-semibold"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Platform Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Incident Telemetry & Source Breakdown Banner (Clickable Navigation Entry Points) */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Platform Incident & Report Telemetry</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    Total Reports: {reports.length}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Synchronized operational telemetry across AI vision fleets, citizen portals, and SOS beacons. Click any card to navigate.
                </p>
              </div>
              <div className="text-xs font-mono font-semibold text-[#64748B]">
                Active Incidents: <strong className="text-[#0F172A]">{reports.filter(r => r.status !== "Resolved").length}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {/* Card 1: Total Reports */}
              <div 
                onClick={() => {
                  setReportSourceFilter("ALL");
                  handleTabSelect("reports");
                }}
                className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-white rounded-xl transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs select-none"
                title="Click to view all incidents in the Admin Incident Registry"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#64748B] group-hover:text-[#2563EB] uppercase block transition-colors">
                    Total Reports
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block font-display">
                  {totalReportsCount}
                </span>
                <span className="text-[10px] text-[#64748B] group-hover:text-[#2563EB] mt-1 block font-medium transition-colors flex items-center gap-1">
                  <span>View all reports</span>
                  <span className="font-bold">&rarr;</span>
                </span>
              </div>

              {/* Card 2: AI Road Scanner */}
              <div 
                onClick={() => {
                  if (onNavigateSection) {
                    onNavigateSection("road-scanner", { source: "ROAD_SCANNER" });
                  } else {
                    setReportSourceFilter("ROAD_SCANNER");
                    handleTabSelect("reports");
                  }
                }}
                className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] hover:border-[#2563EB] hover:bg-[#DBEAFE]/40 rounded-xl transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs select-none"
                title="Click to open AI Road Scanner workspace"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2563EB] uppercase block">AI Road Scanner</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#2563EB]/70 group-hover:text-[#2563EB] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <span className="text-2xl font-black text-[#1D4ED8] mt-1 block font-display">
                  {scannerReportsCount}
                </span>
                <span className="text-[10px] text-[#2563EB] mt-1 block font-medium flex items-center gap-1">
                  <span>Open AI Scanner</span>
                  <span className="font-bold">&rarr;</span>
                </span>
              </div>

              {/* Card 3: Citizen Ingest */}
              <div 
                onClick={() => {
                  if (onNavigateSection) {
                    onNavigateSection("citizen-signals", { source: "CITIZEN" });
                  } else {
                    setReportSourceFilter("CITIZEN");
                    handleTabSelect("reports");
                  }
                }}
                className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] hover:border-[#16A34A] hover:bg-[#DCFCE7]/50 rounded-xl transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs select-none"
                title="Click to open Citizen Signals triage"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#16A34A] uppercase block">Citizen Ingest</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]/70 group-hover:text-[#16A34A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <span className="text-2xl font-black text-[#15803D] mt-1 block font-display">
                  {citizenReportsCount}
                </span>
                <span className="text-[10px] text-[#16A34A] mt-1 block font-medium flex items-center gap-1">
                  <span>Open Citizen Signals</span>
                  <span className="font-bold">&rarr;</span>
                </span>
              </div>

              {/* Card 4: Emergency SOS */}
              <div 
                onClick={() => {
                  if (onNavigateSection) {
                    onNavigateSection("emergency-sos", { isSos: true });
                  } else {
                    setReportSourceFilter("EMERGENCY_SOS");
                    handleTabSelect("reports");
                  }
                }}
                className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] hover:border-[#DC2626] hover:bg-[#FEE2E2]/60 rounded-xl transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs select-none"
                title="Click to open Emergency SOS workspace"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#DC2626] uppercase block">Emergency SOS</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626]/70 group-hover:text-[#DC2626] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <span className="text-2xl font-black text-[#B91C1C] mt-1 block font-display">
                  {sosReportsCount}
                </span>
                <span className="text-[10px] text-[#DC2626] mt-1 block font-medium flex items-center gap-1">
                  <span>Open Emergency SOS</span>
                  <span className="font-bold">&rarr;</span>
                </span>
              </div>
            </div>
          </div>

          {/* High-Level Metric Tiles (Row of 3 Pastel-Tinted Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1: Registered Citizens -> Soft Blue */}
            <div className="bg-[#EEF5FF] border border-[#D6E6FE] p-5 rounded-2xl shadow-xs flex flex-col justify-between min-h-[140px] transition-all hover:border-[#BFDBFE]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold shadow-2xs">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#1E293B]">Registered Citizens</span>
                  </div>
                  <BarChart2 className="w-4 h-4 text-[#2563EB]" />
                </div>
                <p className="text-3xl font-black text-[#0F172A] mt-3 font-display">
                  {users.filter(u => u.role === "citizen").length || 13}
                </p>
              </div>
              <div className="text-[11px] text-[#64748B] mt-2 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span className="text-[#16A34A] font-bold">100% Active</span>
                <span>• Civic mobile & web</span>
              </div>
            </div>

            {/* Card 2: Municipal Officers -> Soft Lavender */}
            <div className="bg-[#F5F1FF] border border-[#E5DEFF] p-5 rounded-2xl shadow-xs flex flex-col justify-between min-h-[140px] transition-all hover:border-[#DDD6FE]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#7C3AED] flex items-center justify-center font-bold shadow-2xs">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#1E293B]">Municipal Officers</span>
                  </div>
                  <BarChart2 className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <p className="text-3xl font-black text-[#0F172A] mt-3 font-display">
                  {users.filter(u => u.role === "municipal").length || 3}
                </p>
              </div>
              <div className="text-[11px] text-[#64748B] mt-2 flex items-center gap-1.5 font-medium">
                <span>PWD, Power Grid & Sanitation</span>
              </div>
            </div>

            {/* Card 3: Operational Field Squads -> Soft Warm Cream/Orange */}
            <div className="bg-[#FFF8EC] border border-[#FEDCB0] p-5 rounded-2xl shadow-xs flex flex-col justify-between min-h-[140px] transition-all hover:border-[#FDE68A]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#D97706] flex items-center justify-center font-bold shadow-2xs">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#1E293B]">Operational Field Squads</span>
                  </div>
                  <BarChart2 className="w-4 h-4 text-[#D97706]" />
                </div>
                <p className="text-3xl font-black text-[#0F172A] mt-3 font-display">
                  {teams.filter(t => t.active !== false).length || 5}
                </p>
              </div>
              <div className="text-[11px] text-[#64748B] mt-2 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span className="text-[#16A34A] font-bold">{teams.filter(t => t.availability === "AVAILABLE").length || 5} Ready</span>
                <span>• Rapid response fleet</span>
              </div>
            </div>
          </div>

          {/* Governance Actions Section */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#2563EB]" />
                <span>Governance Actions</span>
              </h2>
              <div className="text-[11px] text-[#64748B] font-mono flex items-center gap-1.5">
                <span>Current Administrator:</span>
                <span className="font-semibold text-[#0F172A]">{adminEmail}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {/* Action 1 */}
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EEF5FF]/40 transition text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                      Manage User Access
                    </h4>
                    <p className="text-[11px] text-[#64748B]">Promote roles or deactivate accounts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Action 2 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("teams");
                  setShowCreateTeamModal(true);
                }}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] hover:border-[#059669] hover:bg-[#EFFAF5]/40 transition text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EFFAF5] text-[#059669] flex items-center justify-center font-bold text-xs shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-[#059669] transition-colors">
                      Register Field Squad
                    </h4>
                    <p className="text-[11px] text-[#64748B]">Add new dispatch crew to city fleet</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669] transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Action 3 */}
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] hover:border-[#7C3AED] hover:bg-[#F5F1FF]/40 transition text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F1FF] text-[#7C3AED] flex items-center justify-center font-bold text-xs shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors">
                      Platform Settings
                    </h4>
                    <p className="text-[11px] text-[#64748B]">Configure thresholds and integrations</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#7C3AED] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Live Platform Telemetry & Operational Readiness Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* User Access Clearances Overview (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
                      <Users className="w-4 h-4 text-[#2563EB]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">User Clearances & Roles</h3>
                      <p className="text-[11px] text-[#64748B]">Platform authentication and active identity tiers</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("users")}
                    className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase block">Citizens</span>
                    <span className="text-lg font-black text-[#0F172A] mt-0.5 block">{users.filter(u => u.role === "citizen").length || 13}</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center">
                    <span className="text-[10px] font-bold text-[#7C3AED] uppercase block">Municipal</span>
                    <span className="text-lg font-black text-[#7C3AED] mt-0.5 block">{users.filter(u => u.role === "municipal").length || 3}</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center">
                    <span className="text-[10px] font-bold text-[#D97706] uppercase block">Field Squads</span>
                    <span className="text-lg font-black text-[#D97706] mt-0.5 block">{users.filter(u => u.role === "field_team").length || 4}</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center">
                    <span className="text-[10px] font-bold text-[#2563EB] uppercase block">Admins</span>
                    <span className="text-lg font-black text-[#2563EB] mt-0.5 block">{users.filter(u => u.role === "admin").length || 1}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                <span>Active Account Status:</span>
                <span className="font-bold text-[#16A34A]">{users.filter(u => u.active !== false).length} / {users.length || 21} Enabled</span>
              </div>
            </div>

            {/* Operational Squad SLA & Readiness Status (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center font-bold">
                      <Briefcase className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Squad Fleet Readiness</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("teams")}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2.5">
                  {teams.slice(0, 3).map((t) => (
                    <div key={t.id} className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#0F172A]">{t.name}</div>
                        <div className="text-[10px] text-[#64748B]">{t.district} • {t.membersCount} crew members</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                        READY
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                <span>Dispatch SLA Target:</span>
                <span className="font-bold text-[#16A34A]">&lt; 45 Mins Ground Response</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: INCIDENT REGISTRY & REPORT MANAGEMENT */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F1F5F9] gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#2563EB]" />
                  <h2 className="text-base font-bold text-[#0F172A] font-sans">
                    Platform Incident Registry & Incident Management
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    {filteredAdminReports.length} of {reports.length} Incidents
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  Master registry spanning automated AI road vision, citizen reports, and emergency SOS beacons
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTabSelect("overview")}
                  className="px-3.5 py-1.5 text-xs font-bold text-[#64748B] hover:text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>&larr; Back to Overview</span>
                </button>
              </div>
            </div>

            {/* Source Pill Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
              <span className="text-xs font-bold text-[#64748B] mr-1">Source Filter:</span>
              <button
                onClick={() => setReportSourceFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportSourceFilter === "ALL"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]"
                }`}
              >
                <span>All Sources</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10">
                  {totalReportsCount}
                </span>
              </button>

              <button
                onClick={() => setReportSourceFilter("ROAD_SCANNER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportSourceFilter === "ROAD_SCANNER"
                    ? "bg-[#1D4ED8] text-white shadow-xs"
                    : "bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] border border-[#BFDBFE]"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>AI Road Scanner</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10">
                  {scannerReportsCount}
                </span>
              </button>

              <button
                onClick={() => setReportSourceFilter("CITIZEN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportSourceFilter === "CITIZEN"
                    ? "bg-[#15803D] text-white shadow-xs"
                    : "bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] border border-[#BBF7D0]"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Citizen Ingest</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10">
                  {citizenReportsCount}
                </span>
              </button>

              <button
                onClick={() => setReportSourceFilter("EMERGENCY_SOS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportSourceFilter === "EMERGENCY_SOS"
                    ? "bg-[#B91C1C] text-white shadow-xs"
                    : "bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] border border-[#FECACA]"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                <span>Emergency SOS</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10">
                  {sosReportsCount}
                </span>
              </button>
            </div>

            {/* Filters Row: Search + Status + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Search by ID, title, location, reporter..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
                />
              </div>

              <div>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-hidden focus:border-[#2563EB] text-[#334155] font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <select
                  value={reportCategoryFilter}
                  onChange={(e) => setReportCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-hidden focus:border-[#2563EB] text-[#334155] font-medium"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Garbage Overflow">Garbage Overflow</option>
                  <option value="Broken Streetlight">Broken Streetlight</option>
                  <option value="Road Obstruction">Road Obstruction</option>
                  <option value="Other">Other / Emergency</option>
                </select>
              </div>
            </div>

            {/* Reports Table */}
            <div className="mt-4 border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Report ID</th>
                      <th className="py-3 px-4">Incident Details</th>
                      <th className="py-3 px-4">Ingest Source</th>
                      <th className="py-3 px-4">Severity &amp; Risk</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredAdminReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#94A3B8]" />
                          <p className="text-xs font-semibold text-[#64748B]">No reports found matching criteria</p>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">Try adjusting search keyword or source filter</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAdminReports.map((rep) => {
                        const isSos = isEmergencySosReport(rep);
                        const isScanner = rep.source === "ROAD_SCANNER" || (rep as any).source === "AI_SCANNER";
                        return (
                          <tr 
                            key={rep.id}
                            onClick={() => onSelectReport?.(rep)}
                            className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-[#475569] whitespace-nowrap">
                              <span className="text-[#2563EB] group-hover:underline">
                                {rep.id}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-bold text-[#0F172A] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                                {rep.title}
                              </div>
                              <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                                {rep.description}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isSos ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                                  <ShieldAlert className="w-3 h-3 text-[#DC2626]" />
                                  <span>Emergency SOS</span>
                                </span>
                              ) : isScanner ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                                  <Camera className="w-3 h-3 text-[#2563EB]" />
                                  <span>AI Road Scanner</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                                  <Radio className="w-3 h-3 text-[#16A34A]" />
                                  <span>Citizen Report</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono font-bold">
                                <span className={`w-2 h-2 rounded-full ${
                                  rep.severity >= 80 ? "bg-[#DC2626] animate-pulse" :
                                  rep.severity >= 50 ? "bg-[#F59E0B]" :
                                  "bg-[#16A34A]"
                                }`} />
                                <span className="text-[#0F172A]">{rep.severity}%</span>
                                <span className="text-[10px] text-[#64748B] font-sans font-semibold">
                                  ({rep.riskLevel || "Med"})
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-[180px] truncate text-[#64748B]" title={rep.location}>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                                <span className="truncate">{rep.location || "Delhi NCR Corridor"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                                rep.status === "Resolved"
                                  ? "bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]"
                                  : rep.status === "In Progress"
                                  ? "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]"
                                  : rep.status === "Assigned"
                                  ? "bg-[#FAF5FF] text-[#7C3AED] border-[#F3E8FF]"
                                  : "bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]"
                              }`}>
                                {rep.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onSelectReport?.(rep)}
                                className="px-2.5 py-1 text-xs font-bold text-[#2563EB] hover:text-white bg-[#EFF6FF] hover:bg-[#2563EB] border border-[#BFDBFE] rounded-lg transition-all cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">User Access Control & Identity</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage credentials, assign department affiliations, and toggle account activation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setRoleFilter("ALL")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${roleFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setRoleFilter("citizen")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${roleFilter === "citizen" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Citizens
                </button>
                <button
                  onClick={() => setRoleFilter("municipal")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${roleFilter === "municipal" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Municipal
                </button>
                <button
                  onClick={() => setRoleFilter("field_team")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${roleFilter === "field_team" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Field Team
                </button>
                <button
                  onClick={() => setRoleFilter("admin")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${roleFilter === "admin" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Admin
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 w-44 sm:w-52"
                />
              </div>

              {/* Prominent + Add User Button */}
              <button
                onClick={() => {
                  setCreateUserError(null);
                  setShowAddUserModal(true);
                }}
                className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add User</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Affiliation</th>
                  <th className="py-3 px-4">Activity & Points</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/75 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.role === "admin"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : u.role === "municipal"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : u.role === "field_team"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {u.role.toUpperCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === "field_team" && u.teamName ? (
                          <div className="font-medium text-slate-800">{u.teamName}</div>
                        ) : (
                          <div className="text-slate-700">{u.department || "General Public"}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {u.role === "citizen" ? (
                          <span className="font-semibold text-emerald-600">{u.points || 0} Points</span>
                        ) : u.role === "field_team" ? (
                          <span className="font-mono text-slate-700">{u.availability || "AVAILABLE"}</span>
                        ) : (
                          <span className="text-slate-400">System Staff</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.active !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedUserDetails(u)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition cursor-pointer"
                          title="View user details"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setNewRoleInput(u.role);
                            setNewDeptInput(u.department || "");
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => handleToggleUser(u)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded transition cursor-pointer ${
                            u.active !== false
                              ? "text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                              : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {u.active !== false ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM MANAGEMENT */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Platform Field Squad Registry</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin defines and provisions teams. Municipal officers assign incidents to these teams.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search squads..."
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  className="pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 w-44 sm:w-56"
                />
              </div>

              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Team</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map(t => (
              <div
                key={t.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition relative flex flex-col justify-between ${
                  t.active !== false ? "border-slate-200" : "border-slate-300 opacity-60 bg-slate-50"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                        {t.id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">{t.name}</h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.availability === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : t.availability === "BUSY"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {t.availability}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Category:</span>
                      <span className="truncate">{t.category}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Department:</span>
                      <span className="truncate">{t.department || getDepartmentForCategory(t.category)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Service Zone:</span>
                      <span>{t.district || t.serviceZone}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Supervisor:</span>
                      <span>{t.lead}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Emergency Line:</span>
                      <span className="font-mono text-[11px]">{t.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {t.membersCount || 4} crew members
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTeam(t)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Configure</span>
                    </button>
                    <button
                      onClick={() => handleToggleTeam(t)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded transition ${
                        t.active !== false
                          ? "text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                          : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      {t.active !== false ? "Disable" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Global City Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune automated hazard deduplication radii, AI confidence threshold, and notifications.
            </p>
          </div>

          <div className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                AI Deduplication Proximity Threshold (meters)
              </label>
              <input
                type="number"
                defaultValue={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Submissions within 5 meters of an existing active incident are automatically grouped into a single cluster.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Emergency SOS Dispatch Escalation
              </label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800">
                <option value="AUTO_ALL">Broadcast to All Online Squads Immediately</option>
                <option value="MUNICIPAL_FIRST">Alert Municipal Command Center First</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => showNotification("Platform configuration successfully saved.")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                Save Global Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER ROLE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Edit User Role & Clearance: {editingUser.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Select the appropriate authority domain for <span className="font-mono text-slate-700">{editingUser.email}</span>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">System Role</label>
                <select
                  value={newRoleInput}
                  onChange={e => setNewRoleInput(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold"
                >
                  <option value="citizen">CITIZEN (Report & Track)</option>
                  <option value="municipal">MUNICIPAL (Command Center & Dispatch)</option>
                  <option value="field_team">FIELD TEAM (Ground Crew & Execution)</option>
                  <option value="admin">ADMIN (Platform Governance)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department / Division</label>
                <input
                  type="text"
                  placeholder="e.g. Roads & Highway Authority (PWD)"
                  value={newDeptInput}
                  onChange={e => setNewDeptInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserRole}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SQUAD */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Provision New Field Operations Squad</h3>
            <p className="text-xs text-slate-500">
              Register a new operational crew into the city fleet registry.
            </p>

            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Squad Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rapid Asphalt Recovery Unit"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Supervisor</label>
                  <input
                    type="text"
                    placeholder="Supervisor Name"
                    value={newTeamLead}
                    onChange={e => setNewTeamLead(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newTeamCategory}
                    onChange={e => {
                      setNewTeamCategory(e.target.value);
                      setNewTeamDepartment(getDepartmentForCategory(e.target.value));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  >
                    <option value="Pothole">Pothole & Surface Repair</option>
                    <option value="Broken Streetlight">Electrical & Streetlights</option>
                    <option value="Garbage Overflow">Sanitation & Drainage</option>
                    <option value="Road Obstruction">Road Obstruction Response</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. Central Zone"
                    value={newTeamDistrict}
                    onChange={e => setNewTeamDistrict(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={newTeamPhone}
                    onChange={e => setNewTeamPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Create Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TEAM */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Configure Squad: {editingTeam.name}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Squad Name</label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supervisor Lead</label>
                <input
                  type="text"
                  value={editingTeam.lead}
                  onChange={e => setEditingTeam({ ...editingTeam, lead: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Zone</label>
                <input
                  type="text"
                  value={editingTeam.district}
                  onChange={e => setEditingTeam({ ...editingTeam, district: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Availability</label>
                <select
                  value={editingTeam.availability}
                  onChange={e => setEditingTeam({ ...editingTeam, availability: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="BUSY">BUSY</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingTeam(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTeamEdit}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Save Squad Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">Add New User</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provision verified access with role-based security clearances.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{createUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Officer Vikram Malhotra"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. vikram.malhotra@urbanpulse.gov"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Password & Phone Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 pr-9 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+91 98110 00000"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Role Selection & Account Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={newUserRole}
                    onChange={e => {
                      const r = e.target.value as UserRole;
                      setNewUserRole(r);
                      if (r === "citizen") setNewUserDepartment("Civilian Public");
                      else if (r === "municipal") setNewUserDepartment("Public Works & Urban Roads (PWD)");
                      else if (r === "admin") setNewUserDepartment("Municipal Digital Governance Board");
                      else if (r === "field_team" && teams.length > 0) {
                        setNewUserTeamId(teams[0].id);
                        setNewUserDepartment(teams[0].department);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="citizen">CITIZEN</option>
                    <option value="municipal">MUNICIPAL</option>
                    <option value="field_team">FIELD TEAM</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={newUserActive ? "true" : "false"}
                    onChange={e => setNewUserActive(e.target.value === "true")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Role-Specific Affiliation Fields */}
              {newUserRole === "citizen" && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11.5px] text-blue-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Affiliation: <strong>Civilian Public</strong> (Civic points & real-time reporting enabled automatically).</span>
                </div>
              )}

              {newUserRole === "municipal" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Municipal Department / Directorate *</label>
                  <select
                    value={newUserDepartment}
                    onChange={e => setNewUserDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Public Works & Urban Roads (PWD)">Public Works & Urban Roads (PWD)</option>
                    <option value="Power Grid & Streetlights Division">Power Grid & Streetlights Division</option>
                    <option value="Solid Waste & Sanitation Department">Solid Waste & Sanitation Department</option>
                    <option value="Traffic & Emergency Obstruction Fleet">Traffic & Emergency Obstruction Fleet</option>
                    <option value="Water Supply & Urban Drainage Authority">Water Supply & Urban Drainage Authority</option>
                    <option value="Disaster Management & Emergency Directorate">Disaster Management & Emergency Directorate</option>
                  </select>
                </div>
              )}

              {newUserRole === "field_team" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Field Squad / Unit *</label>
                  {teams.length > 0 ? (
                    <select
                      value={newUserTeamId}
                      onChange={e => {
                        const tId = e.target.value;
                        setNewUserTeamId(tId);
                        const matched = teams.find(t => t.id === tId);
                        if (matched) setNewUserDepartment(matched.department);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.district}) - Lead: {t.lead}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Road Maintenance Team Alpha (RT-014)"
                      value={newUserDepartment}
                      onChange={e => setNewUserDepartment(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
                    />
                  )}
                </div>
              )}

              {newUserRole === "admin" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Administrative Board / Directorate *</label>
                  <select
                    value={newUserDepartment}
                    onChange={e => setNewUserDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Municipal Digital Governance Board">Municipal Digital Governance Board</option>
                    <option value="City IT & Cyber Infrastructure">City IT & Cyber Infrastructure</option>
                    <option value="Urban Administration Command">Urban Administration Command</option>
                    <option value="Executive Municipal Commission">Executive Municipal Commission</option>
                  </select>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={creatingUser}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {creatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating User...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER DETAILS */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
                  selectedUserDetails.role === "admin"
                    ? "bg-rose-100 text-rose-700"
                    : selectedUserDetails.role === "municipal"
                    ? "bg-purple-100 text-purple-700"
                    : selectedUserDetails.role === "field_team"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {selectedUserDetails.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedUserDetails.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedUserDetails.role === "admin"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : selectedUserDetails.role === "municipal"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : selectedUserDetails.role === "field_team"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {selectedUserDetails.role.toUpperCase().replace("_", " ")}
                    </span>
                    {selectedUserDetails.active !== false ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>Deactivated</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="font-mono font-medium text-slate-900">{selectedUserDetails.email}</span>
                </div>
                {selectedUserDetails.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-medium text-slate-900">{selectedUserDetails.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Department / Unit:</span>
                  <span className="font-medium text-slate-900 text-right max-w-[200px] truncate">
                    {selectedUserDetails.role === "field_team" && selectedUserDetails.teamName
                      ? selectedUserDetails.teamName
                      : selectedUserDetails.department || "Civilian Public"}
                  </span>
                </div>
                {selectedUserDetails.teamLead && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Squad Lead:</span>
                    <span className="font-medium text-slate-900">{selectedUserDetails.teamLead}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Created:</span>
                  <span className="font-mono text-slate-600">{new Date(selectedUserDetails.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {selectedUserDetails.role === "citizen" && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-blue-700 font-bold block">Points</span>
                    <span className="text-base font-black text-blue-900">{selectedUserDetails.points || 0}</span>
                  </div>
                  <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-purple-700 font-bold block">Scans</span>
                    <span className="text-base font-black text-purple-900">{selectedUserDetails.scansCount || 0}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block">Reports</span>
                    <span className="text-base font-black text-emerald-900">{selectedUserDetails.reportsCount || 0}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const target = selectedUserDetails;
                  setSelectedUserDetails(null);
                  setEditingUser(target);
                  setNewRoleInput(target.role);
                  setNewDeptInput(target.department || "");
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Edit Role
              </button>
              <button
                onClick={() => {
                  const target = selectedUserDetails;
                  handleToggleUser(target);
                  setSelectedUserDetails({ ...target, active: !target.active });
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  selectedUserDetails.active !== false
                    ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                {selectedUserDetails.active !== false ? "Deactivate Account" : "Activate Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
