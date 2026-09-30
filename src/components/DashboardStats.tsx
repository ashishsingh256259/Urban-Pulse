import { Report } from "../types";
import { AlertTriangle, CheckCircle, Clock, Database, ChevronUp, ChevronDown } from "lucide-react";

interface DashboardStatsProps {
  reports: Report[];
}

export default function DashboardStats({ reports }: DashboardStatsProps) {
  const total = reports.length;
  const pending = reports.filter(r => r.status === "Pending").length;
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const activeHighRisk = reports.filter(r => r.severity >= 75 && r.status !== "Resolved").length;

  // Trend percentages
  const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Total Reports Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start justify-between min-h-[110px]">
        <div>
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Reports</span>
          <div className="font-display font-bold text-3xl text-[#172033] mt-1">{total}</div>
        </div>
        <div className="p-3 bg-[#EFF6FF] text-[#2563EB] rounded-xl border border-[#DBEAFE]">
          <Database className="w-5 h-5" />
        </div>
      </div>

      {/* Pending Reports Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start justify-between min-h-[110px]">
        <div>
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Queue</span>
          <div className="font-display font-bold text-3xl text-[#172033] mt-1">{pending}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#F59E0B] mt-2 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Avg dispatch response: 18m</span>
          </div>
        </div>
        <div className="p-3 bg-[#FFFBEB] text-[#F59E0B] rounded-xl border border-[#FEF3C7]">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* High-Risk Issues Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start justify-between min-h-[110px]">
        <div>
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Critical Risks</span>
          <div className="font-display text-3xl text-[#DC2626] font-bold mt-1">{activeHighRisk}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#DC2626] mt-2 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>Assigned to Elite Response Squads</span>
          </div>
        </div>
        <div className="p-3 bg-[#FEF2F2] text-[#DC2626] rounded-xl border border-[#FECACA]">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Resolved Reports Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start justify-between min-h-[110px]">
        <div>
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Resolution Efficiency</span>
          <div className="font-display font-bold text-3xl text-[#172033] mt-1">{resolvedRate}%</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A] mt-2 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{resolved} issues corrected</span>
          </div>
        </div>
        <div className="p-3 bg-[#F0FDF4] text-[#16A34A] rounded-xl border border-[#DCFCE7]">
          <CheckCircle className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
}
