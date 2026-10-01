import { Report, isEmergencySosReport } from "../types";

export const DUPLICATE_RADIUS_METERS = 5;
export const DUPLICATE_TIME_WINDOW_HOURS = 24;

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function areCategoriesCompatible(cat1: string, cat2: string): boolean {
  if (!cat1 || !cat2) return false;
  const c1 = cat1.toLowerCase().trim();
  const c2 = cat2.toLowerCase().trim();
  if (c1 === c2) return true;
  if ((c1.includes("pothole") || c1.includes("road") || c1.includes("surface")) &&
      (c2.includes("pothole") || c2.includes("road") || c2.includes("surface"))) {
    return true;
  }
  if ((c1.includes("garbage") || c1.includes("waste") || c1.includes("trash")) &&
      (c2.includes("garbage") || c2.includes("waste") || c2.includes("trash"))) {
    return true;
  }
  if ((c1.includes("light") || c1.includes("electrical") || c1.includes("power")) &&
      (c2.includes("light") || c2.includes("electrical") || c2.includes("power"))) {
    return true;
  }
  return false;
}

export interface DuplicateGroup {
  groupId: string;
  primaryReport: Report;
  duplicates: Array<Report & { distanceMeters: number }>;
  totalCount: number;
}

export function processReportsForDuplicates(reports: Report[]): Report[] {
  if (!reports || reports.length === 0) return [];

  // Sort by createdAt ascending (earliest first so earliest valid report becomes primary)
  const sorted = [...reports].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  const primaries: Array<Report & { groupReports: Report[] }> = [];

  for (const report of sorted) {
    const isManualOrCitizen = report.source === "MANUAL_REPORT" || (report as any).source === "CITIZEN" || !report.source;
    const isScanner = report.source === "ROAD_SCANNER" || (report as any).source === "AI_SCANNER";
    const isSos = isEmergencySosReport(report);

    if (!isManualOrCitizen || isScanner || isSos) {
      report.isDuplicate = false;
      report.duplicateOfReportId = null;
      report.duplicateGroupId = null;
      report.duplicateDistanceMeters = 0;
      continue;
    }

    const repTime = report.createdAt ? new Date(report.createdAt).getTime() : Date.now();
    let matchedPrimary: (Report & { groupReports: Report[] }) | null = null;
    let shortestDist = 999999;

    for (const primary of primaries) {
      const primTime = primary.createdAt ? new Date(primary.createdAt).getTime() : repTime;
      const hoursDiff = Math.abs(repTime - primTime) / (1000 * 60 * 60);

      if (hoursDiff <= DUPLICATE_TIME_WINDOW_HOURS && areCategoriesCompatible(primary.category, report.category)) {
        const dist = calculateDistanceMeters(primary.latitude, primary.longitude, report.latitude, report.longitude);
        if (dist <= DUPLICATE_RADIUS_METERS) {
          if (dist < shortestDist) {
            shortestDist = dist;
            matchedPrimary = primary;
          }
        }
      }
    }

    if (matchedPrimary) {
      report.isDuplicate = true;
      report.duplicateOfReportId = matchedPrimary.id;
      report.duplicateGroupId = matchedPrimary.duplicateGroupId || `DUP-GROUP-${matchedPrimary.id}`;
      report.duplicateDistanceMeters = Math.round(shortestDist * 10) / 10;
      matchedPrimary.groupReports.push(report);
    } else {
      report.isDuplicate = false;
      report.duplicateOfReportId = null;
      report.duplicateGroupId = `DUP-GROUP-${report.id}`;
      report.duplicateDistanceMeters = 0;
      primaries.push({ ...report, groupReports: [] });
    }
  }

  return sorted;
}

export function getDuplicateGroups(reports: Report[]): DuplicateGroup[] {
  const processed = processReportsForDuplicates(reports);
  const primaryMap = new Map<string, { primary: Report; duplicates: Array<Report & { distanceMeters: number }> }>();

  for (const r of processed) {
    if (!r.isDuplicate) {
      const isManualOrCitizen = r.source === "MANUAL_REPORT" || (r as any).source === "CITIZEN" || !r.source;
      const isScanner = r.source === "ROAD_SCANNER" || (r as any).source === "AI_SCANNER";
      const isSos = isEmergencySosReport(r);

      if (isManualOrCitizen && !isScanner && !isSos) {
        const gId = r.duplicateGroupId || `DUP-GROUP-${r.id}`;
        if (!primaryMap.has(gId)) {
          primaryMap.set(gId, { primary: r, duplicates: [] });
        }
      }
    }
  }

  for (const r of processed) {
    if (r.isDuplicate && r.duplicateOfReportId) {
      for (const [gId, entry] of primaryMap.entries()) {
        if (entry.primary.id === r.duplicateOfReportId || entry.primary.duplicateGroupId === r.duplicateGroupId) {
          entry.duplicates.push({ ...r, distanceMeters: r.duplicateDistanceMeters || 0 });
          break;
        }
      }
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [gId, entry] of primaryMap.entries()) {
    if (entry.duplicates.length > 0) {
      groups.push({
        groupId: gId,
        primaryReport: entry.primary,
        duplicates: entry.duplicates,
        totalCount: entry.duplicates.length
      });
    }
  }

  return groups;
}
