import { Report } from "../types";
import { DuplicateGroup } from "./duplicateDetection";

/**
 * Escapes a cell value according to RFC 4180 CSV specifications.
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export interface RejectedAuditItem extends Omit<Partial<Report>, "status"> {
  id: string;
  title: string;
  status: string;
  category?: any;
  distanceMeters?: number;
  primaryReportId?: string;
  primaryReportTitle?: string;
  primaryReportStatus?: string;
  primaryReportLocation?: string;
  groupReferenceId?: string;
}

/**
 * Generates and downloads a compliance-grade CSV audit report of rejected incidents.
 */
export function exportRejectedIncidentsCSV(
  rejectedItems: RejectedAuditItem[],
  customFilename?: string
): { success: boolean; count: number; filename: string } {
  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = customFilename || `UrbanPulse_Audit_Rejected_Incidents_${timestampStr}.csv`;

  const headers = [
    "Audit Record ID",
    "Duplicate Incident ID",
    "Incident Title",
    "Issue Category",
    "Specific Issue Type",
    "Current Status",
    "Audit Classification",
    "Rejection Reason",
    "Rejection Audit Trail Notes",
    "Rejection Timestamp (ISO)",
    "Rejection Timestamp (Local)",
    "Reviewing Officer / Authority",
    "Reviewer Clearance Role",
    "Linked Primary Incident ID",
    "Linked Primary Incident Title",
    "Linked Primary Incident Status",
    "Duplicate Group Reference",
    "Proximity to Primary Incident (Meters)",
    "Spatial Deduplication Threshold Enforced",
    "Temporal Deduplication Window Enforced",
    "Incident Location Address",
    "GPS Latitude",
    "GPS Longitude",
    "Original Submission Date & Time (ISO)",
    "Original Submission Date & Time (Local)",
    "Citizen Reporter Name",
    "Citizen Contact Email",
    "Citizen Description & Notes",
    "Hazard Severity Score (0-100)",
    "Priority Rating",
    "Citizen Photo / Evidence Asset URL"
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(",")];

  for (let index = 0; index < rejectedItems.length; index++) {
    const item = rejectedItems[index];
    const auditRecordId = `AUDIT-REJ-${item.id.replace(/[^a-zA-Z0-9_-]/g, "")}-${String(index + 1).padStart(3, "0")}`;
    const rejectedAtIso = item.rejectedAt || item.updatedAt || new Date().toISOString();
    const rejectedAtLocal = rejectedAtIso ? new Date(rejectedAtIso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
    const createdAtLocal = item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";

    const row = [
      auditRecordId,
      item.id,
      item.title || "Untitled Incident",
      item.category || "General",
      item.issueType || item.category || "General Issue",
      item.status || "REJECTED",
      "Duplicate Submission - Consolidated for Operational Queuing",
      item.rejectionReason || "Duplicate report consolidated into primary incident",
      item.rejectionNote || `Consolidated into primary incident #${item.primaryReportId || item.duplicateOfReportId || "N/A"} to de-clutter municipal queue while preserving citizen evidence for audit.`,
      rejectedAtIso,
      rejectedAtLocal,
      item.rejectedBy || "Municipal Administrator",
      item.rejectedByRole || "admin",
      item.primaryReportId || item.duplicateOfReportId || "N/A",
      item.primaryReportTitle || "Primary Incident Record",
      item.primaryReportStatus || "Active Incident",
      item.groupReferenceId || item.duplicateGroupId || "N/A",
      item.distanceMeters ?? item.duplicateDistanceMeters ?? 0,
      "5 meters radius",
      "24 hours window",
      item.location || item.primaryReportLocation || "City Jurisdiction",
      item.latitude ?? "N/A",
      item.longitude ?? "N/A",
      item.createdAt || "N/A",
      createdAtLocal,
      item.reporterName || "Citizen Reporter",
      item.reporterEmail || "Not Disclosed",
      item.description || "No description provided",
      item.severity ?? "N/A",
      item.priority || "Medium",
      item.image || item.imageUrl || item.evidenceUrl || "None"
    ];

    rows.push(row.map(escapeCsvCell).join(","));
  }

  // UTF-8 BOM prefix ensures correct rendering in Excel, Sheets, and Numbers
  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    count: rejectedItems.length,
    filename
  };
}

/**
 * Helper to extract all rejected duplicate incidents across all duplicate groups.
 */
export function extractAllRejectedDuplicates(
  groups: DuplicateGroup[],
  allReports?: Report[]
): RejectedAuditItem[] {
  const rejectedMap = new Map<string, RejectedAuditItem>();

  // Check each group's duplicates
  for (const group of groups) {
    for (const dup of group.duplicates) {
      if (dup.status === "REJECTED") {
        rejectedMap.set(dup.id, {
          ...dup,
          distanceMeters: dup.distanceMeters,
          primaryReportId: group.primaryReport.id,
          primaryReportTitle: group.primaryReport.title,
          primaryReportStatus: group.primaryReport.status,
          primaryReportLocation: group.primaryReport.location,
          groupReferenceId: group.groupId
        });
      }
    }
  }

  // Also check if any reports in the system are marked isDuplicate && status === "REJECTED"
  if (allReports) {
    for (const r of allReports) {
      if (r.isDuplicate && r.status === "REJECTED" && !rejectedMap.has(r.id)) {
        // Find corresponding primary
        const primary = allReports.find(p => p.id === r.duplicateOfReportId);
        rejectedMap.set(r.id, {
          ...r,
          distanceMeters: r.duplicateDistanceMeters || 0,
          primaryReportId: primary?.id || r.duplicateOfReportId || "N/A",
          primaryReportTitle: primary?.title || "Primary Incident Record",
          primaryReportStatus: primary?.status || "Active Incident",
          primaryReportLocation: primary?.location || r.location,
          groupReferenceId: r.duplicateGroupId || `DUP-GROUP-${r.duplicateOfReportId || r.id}`
        });
      }
    }
  }

  return Array.from(rejectedMap.values());
}
