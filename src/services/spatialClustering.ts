import { GPSCoordinate, RawRoadDetection, RoadScanCandidate, Report } from "../types";

/**
 * Calculates great-circle distance between two points on the Earth surface using Haversine Formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

/**
 * Maps raw detection categories to standard UrbanPulse Report categories
 */
export function mapRawCategoryToReportCategory(
  rawCat: RawRoadDetection["category"]
): Report["category"] {
  switch (rawCat) {
    case "Pothole":
    case "Severe Pothole":
    case "Road Crack / Fissure":
    case "Manhole Issue":
      return "Pothole";
    case "Road Obstruction":
    case "Waterlogging / Drainage":
    case "Faded Lane Marking":
      return "Road Obstruction";
    case "Garbage on Road":
      return "Garbage Overflow";
    default:
      return "Other";
  }
}

/**
 * Generates an estimated readable street location name from coordinates
 */
export function estimateLocationName(lat: number, lng: number): string {
  // Approximate Delhi NCR district boundaries for responsive location labeling
  if (lat >= 28.60 && lat <= 28.65 && lng >= 27.20 && lng <= 27.24) {
    return "Connaught Place / Central Axis, New Delhi";
  }
  if (lat >= 28.45 && lat <= 28.52 && lng >= 77.05 && lng <= 77.12) {
    return "DLF Cyber City / Golf Course Rd, Gurugram";
  }
  if (lat >= 28.58 && lat <= 28.65 && lng >= 77.30 && lng <= 77.38) {
    return "Sector 62 / Electronic City, Noida";
  }
  if (lat >= 28.50 && lat <= 28.56 && lng >= 77.18 && lng <= 77.24) {
    return "Saket District Centre / Mehrauli Badarpur Rd, South Delhi";
  }
  if (lat >= 28.64 && lat <= 28.70 && lng >= 77.20 && lng <= 77.26) {
    return "Chandni Chowk / GT Karnal Arterial, North Delhi";
  }
  return `Highway Corridor [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
}

/**
 * Clusters raw detections into unique candidate issues using a spatial proximity threshold of 5 meters.
 * Selects highest-confidence frame as primary evidence thumbnail, computes centroid GPS, and aggregates severity.
 */
export function clusterDetections(
  detections: RawRoadDetection[],
  sessionId: string,
  thresholdMeters: number = 5
): RoadScanCandidate[] {
  if (!detections || detections.length === 0) return [];

  const clusters: RawRoadDetection[][] = [];
  const visited = new Set<string>();

  for (let i = 0; i < detections.length; i++) {
    const d1 = detections[i];
    if (visited.has(d1.id)) continue;

    const currentCluster: RawRoadDetection[] = [d1];
    visited.add(d1.id);

    for (let j = i + 1; j < detections.length; j++) {
      const d2 = detections[j];
      if (visited.has(d2.id)) continue;

      const dist = calculateHaversineDistanceMeters(
        d1.gps.latitude,
        d1.gps.longitude,
        d2.gps.latitude,
        d2.gps.longitude
      );

      // Group if physically within 5 meters and belonging to compatible hazard categories
      const cat1 = mapRawCategoryToReportCategory(d1.category);
      const cat2 = mapRawCategoryToReportCategory(d2.category);

      if (dist <= thresholdMeters && cat1 === cat2) {
        currentCluster.push(d2);
        visited.add(d2.id);
      }
    }

    clusters.push(currentCluster);
  }

  // Convert raw detection clusters into distinct RoadScanCandidates
  return clusters.map((cluster, index) => {
    // Pick the frame with highest AI confidence as representative primary image
    const bestDetection = cluster.reduce((best, cur) =>
      cur.confidence > best.confidence ? cur : best
    );

    // Compute centroid coordinates
    const avgLat =
      cluster.reduce((sum, d) => sum + d.gps.latitude, 0) / cluster.length;
    const avgLng =
      cluster.reduce((sum, d) => sum + d.gps.longitude, 0) / cluster.length;

    // Aggregate maximum severity
    const maxSeverity = Math.max(...cluster.map((d) => d.severityScore));
    const avgConfidence = Math.round(
      cluster.reduce((sum, d) => sum + d.confidence, 0) / cluster.length
    );

    const reportCategory = mapRawCategoryToReportCategory(bestDetection.category);
    
    // Risk & Priority calculation
    const riskLevel: "Low" | "Medium" | "High" =
      maxSeverity >= 75 ? "High" : maxSeverity >= 45 ? "Medium" : "Low";

    const priority: "Low" | "Medium" | "High" | "Critical" =
      maxSeverity >= 85 ? "Critical" : maxSeverity >= 65 ? "High" : maxSeverity >= 40 ? "Medium" : "Low";

    const locationName = estimateLocationName(avgLat, avgLng);

    // Action recommendations based on category and severity
    const recommendedActions: string[] = [];
    if (reportCategory === "Pothole") {
      recommendedActions.push(
        maxSeverity > 70
          ? "Immediate emergency asphalt cold-mix patching within 6 hours"
          : "Standard road resurfacing queue (Priority Level B)"
      );
      recommendedActions.push("Deploy cautionary cones around lane fissure");
    } else if (reportCategory === "Road Obstruction") {
      recommendedActions.push("Dispatch rapid debris clearing squad");
      recommendedActions.push("Issue route slowdown advisory on safe navigation feed");
    } else {
      recommendedActions.push("Municipal maintenance squad inspection scheduled");
    }

    // Find best detection with physical dimension estimates
    const bestDimensionDetection = cluster.find(d => d.estimatedWidth && d.estimatedLength) || bestDetection;

    return {
      id: `CAND-${Date.now().toString().slice(-6)}-${index + 1}`,
      sessionId,
      clusterId: `CLUS-${index + 1}`,
      category: reportCategory,
      subCategory: bestDetection.category,
      hazardType: bestDetection.hazardType || bestDetection.category,
      sourceCamera: bestDetection.sourceCamera || "Vehicle Dashcam",
      severity: maxSeverity,
      riskLevel,
      priority,
      confidence: avgConfidence,
      location: locationName,
      latitude: parseFloat(avgLat.toFixed(6)),
      longitude: parseFloat(avgLng.toFixed(6)),
      primaryImage: bestDetection.imageUrl,
      evidenceFrames: cluster.map((d) => d.imageUrl).slice(0, 4),
      detectionsCount: cluster.length,
      observationsCount: cluster.length,
      boundingBox: bestDetection.boundingBox,
      estimatedWidth: bestDimensionDetection.estimatedWidth,
      estimatedLength: bestDimensionDetection.estimatedLength,
      estimatedArea: bestDimensionDetection.estimatedArea,
      sizeConfidence: bestDimensionDetection.sizeConfidence || "Unavailable",
      lastSeen: new Date(Math.max(...cluster.map(d => d.timestamp))).toISOString(),
      description: bestDetection.description || `AI Road Scanner detected ${bestDetection.category} across ${cluster.length} continuous dashcam video frames.`,
      recommendedActions,
      selected: true, // Default selected for one-click citizen review
      submissionState: "READY"
    };
  });
}

/**
 * 5-METER SPATIAL DEDUPLICATION ENGINE
 * Checks if a candidate coordinate is within 5 meters of any existing incident or report.
 * Returns the matching incident if distance <= 5.0m, or null if it is a genuinely new physical hazard.
 */
export function findNearbyExistingIncident<T extends { latitude: number; longitude: number; category?: string }>(
  lat: number,
  lng: number,
  existingList: T[],
  thresholdMeters: number = 5.0,
  categoryFilter?: string
): { item: T; distanceMeters: number } | null {
  if (!existingList || existingList.length === 0) return null;

  let closestMatch: { item: T; distanceMeters: number } | null = null;
  let minDistance = Infinity;

  for (const item of existingList) {
    if (categoryFilter && item.category && item.category !== categoryFilter) {
      continue;
    }

    const dist = calculateHaversineDistanceMeters(lat, lng, item.latitude, item.longitude);
    if (dist <= thresholdMeters && dist < minDistance) {
      minDistance = dist;
      closestMatch = { item, distanceMeters: dist };
    }
  }

  return closestMatch;
}
