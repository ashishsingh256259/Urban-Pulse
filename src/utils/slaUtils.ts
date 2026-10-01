import { Report } from "../types";

export const SOS_EMERGENCY_IMAGE = "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&auto=format&fit=crop&q=80";

export function getDefaultSlaHours(report: Report | null | undefined): number {
  if (!report) return 24;
  const sev = report.severity ?? 50;
  const pri = report.priority || (sev >= 75 ? "Critical" : sev >= 50 ? "High" : sev >= 30 ? "Medium" : "Low");
  if (pri === "Critical" || sev >= 75) return 4;
  if (pri === "High" || (sev >= 50 && sev < 75)) return 24;
  if (pri === "Medium" || (sev >= 30 && sev < 50)) return 72; // 3 days
  return 168; // 7 days (Low)
}

export function calculateDueAt(assignedAtIso: string, slaHours: number): string {
  const assignedTime = new Date(assignedAtIso).getTime();
  const dueTime = assignedTime + slaHours * 60 * 60 * 1000;
  return new Date(dueTime).toISOString();
}

export type SlaStatus = "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "RESOLVED";

export function getSlaStatus(report: Report | null | undefined): {
  status: SlaStatus;
  label: string;
  badgeClass: string;
  remainingText: string;
  isOverdue: boolean;
  dueFormatted: string;
} {
  if (!report) {
    return {
      status: "ON_TRACK",
      label: "No SLA",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      remainingText: "Not assigned",
      isOverdue: false,
      dueFormatted: "N/A"
    };
  }

  const assignedAt = report.assignedAt || report.createdAt;
  const slaHours = report.slaDuration || report.assignment?.slaHours || getDefaultSlaHours(report);
  const dueAt = report.dueAt || report.assignment?.dueAt || (assignedAt ? calculateDueAt(assignedAt, slaHours) : null);

  const dueFormatted = dueAt ? new Date(dueAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "N/A";

  if (!dueAt || !assignedAt) {
    return {
      status: "ON_TRACK",
      label: "UNASSIGNED",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      remainingText: "Awaiting assignment",
      isOverdue: false,
      dueFormatted: "Pending"
    };
  }

  const isResolved = report.status === "Resolved" || report.fieldStatus === "CLOSED";
  const now = Date.now();
  const dueTime = new Date(dueAt).getTime();
  const assignedTime = new Date(assignedAt).getTime();
  const totalDuration = dueTime - assignedTime;
  const remaining = dueTime - now;

  if (isResolved) {
    const completedAt = report.resolution?.approvedAt || report.resolution?.submittedAt || report.updatedAt || report.createdAt;
    const completedTime = new Date(completedAt).getTime();
    const metSla = completedTime <= dueTime;
    return {
      status: "RESOLVED",
      label: metSla ? "✓ COMPLETED WITHIN TARGET" : "⚠ COMPLETED AFTER TARGET",
      badgeClass: metSla ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" : "bg-amber-100 text-amber-800 border-amber-300 font-bold",
      remainingText: metSla ? "Completed on time" : "Completed past deadline",
      isOverdue: !metSla,
      dueFormatted
    };
  }

  if (now > dueTime) {
    const overdueMs = now - dueTime;
    const hours = Math.floor(overdueMs / (1000 * 60 * 60));
    const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      status: "OVERDUE",
      label: "🔴 OVERDUE",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold animate-pulse",
      remainingText: `OVERDUE +${hours}h ${mins}m`,
      isOverdue: true,
      dueFormatted
    };
  }

  const percentRemaining = totalDuration > 0 ? (remaining / totalDuration) * 100 : 100;
  const hoursRemaining = Math.floor(remaining / (1000 * 60 * 60));
  const minsRemaining = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  let timeStr = "";
  if (hoursRemaining >= 24) {
    const days = Math.floor(hoursRemaining / 24);
    const hrs = hoursRemaining % 24;
    timeStr = `${days}d ${hrs}h left`;
  } else if (hoursRemaining > 0) {
    timeStr = `${hoursRemaining}h ${minsRemaining}m left`;
  } else {
    timeStr = `${minsRemaining}m remaining`;
  }

  if (percentRemaining <= 25) {
    return {
      status: "DUE_SOON",
      label: "🟠 DUE SOON",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
      remainingText: timeStr,
      isOverdue: false,
      dueFormatted
    };
  }

  return {
    status: "ON_TRACK",
    label: "🟢 ON TRACK",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
    remainingText: timeStr,
    isOverdue: false,
    dueFormatted
  };
}
