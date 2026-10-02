import { Report, SafeRouteOption } from "../types";
import { calculateHaversineDistanceMeters } from "./spatialClustering";

export interface LocationSuggestion {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  type: "landmark" | "report" | "geocoded";
}

export interface RoutePreferences {
  avoidHighRisk: boolean;
  avoidIncidents: boolean;
  avoidWaterlogging: boolean;
  preferSafer: boolean;
  preferFastest: boolean;
}

export const DEFAULT_PREFERENCES: RoutePreferences = {
  avoidHighRisk: true,
  avoidIncidents: true,
  avoidWaterlogging: true,
  preferSafer: true,
  preferFastest: false
};

// Canonical urban hubs, metro stations, education campuses, and corridors across NCR
export const CANONICAL_LANDMARKS: LocationSuggestion[] = [
  {
    id: "kp3_gn",
    label: "Knowledge Park III, Greater Noida",
    subtitle: "Educational Institutional Hub • Sharda, Amity & Galgotias Corridor",
    lat: 28.4608,
    lng: 77.4631,
    type: "landmark"
  },
  {
    id: "kp2_gn",
    label: "Knowledge Park II, Greater Noida",
    subtitle: "Institutional Area • Near NIET, IIMT & GL Bajaj",
    lat: 28.4695,
    lng: 77.4891,
    type: "landmark"
  },
  {
    id: "kp1_gn",
    label: "Knowledge Park I, Greater Noida",
    subtitle: "Knowledge Park Sector 1 • Near Pari Chowk Junction",
    lat: 28.4756,
    lng: 77.4988,
    type: "landmark"
  },
  {
    id: "pari_chowk",
    label: "Pari Chowk, Greater Noida",
    subtitle: "Major Metropolitan Transit Hub & Metro Interchange",
    lat: 28.4764,
    lng: 77.5037,
    type: "landmark"
  },
  {
    id: "niet_gn",
    label: "NIET Institute of Engineering, Greater Noida",
    subtitle: "Knowledge Park II • 19 Knowledge Park Phase II",
    lat: 28.4635,
    lng: 77.4885,
    type: "landmark"
  },
  {
    id: "sharda_univ",
    label: "Sharda University, Greater Noida",
    subtitle: "Plot No. 32-34, Knowledge Park III",
    lat: 28.4731,
    lng: 77.4828,
    type: "landmark"
  },
  {
    id: "galgotias_univ",
    label: "Galgotias Educational Campus, Greater Noida",
    subtitle: "Knowledge Park Phase 2 / Yamuna Expressway Hub",
    lat: 28.4665,
    lng: 77.4850,
    type: "landmark"
  },
  {
    id: "sec62_noida",
    label: "Sector 62, Noida",
    subtitle: "Institutional & IT Area • Electronic City Blue Line Metro",
    lat: 28.6279,
    lng: 77.3686,
    type: "landmark"
  },
  {
    id: "sec18_noida",
    label: "Sector 18 / Atta Market, Noida",
    subtitle: "Commercial District • DLF Mall of India & Metro",
    lat: 28.5708,
    lng: 77.3261,
    type: "landmark"
  },
  {
    id: "botanical_garden",
    label: "Botanical Garden Metro Interchange, Noida",
    subtitle: "Magenta & Blue Line Metro Junction",
    lat: 28.5642,
    lng: 77.3344,
    type: "landmark"
  },
  {
    id: "cp_delhi",
    label: "Connaught Place (CP), New Delhi",
    subtitle: "Central Business District • Rajiv Chowk Transit Hub",
    lat: 28.6315,
    lng: 77.2167,
    type: "landmark"
  },
  {
    id: "saket_metro",
    label: "Saket Metro Station, South Delhi",
    subtitle: "Yellow Line Metro • Mehrauli-Badarpur & Press Enclave Axis",
    lat: 28.5204,
    lng: 77.2014,
    type: "landmark"
  },
  {
    id: "lajpat_nagar",
    label: "Lajpat Nagar Flyover & Central Market, New Delhi",
    subtitle: "Ring Road Arterial & Metro Interchange",
    lat: 28.5685,
    lng: 77.2435,
    type: "landmark"
  },
  {
    id: "aiims_delhi",
    label: "AIIMS Hospital, New Delhi",
    subtitle: "Sri Aurobindo Marg • Ansari Nagar Medical Center",
    lat: 28.5672,
    lng: 77.2100,
    type: "landmark"
  },
  {
    id: "cyber_city_gurugram",
    label: "DLF Cyber City / Cyber Hub, Gurugram",
    subtitle: "NH-48 Business Corridor • Rapid Metro Phase II",
    lat: 28.4952,
    lng: 77.0891,
    type: "landmark"
  },
  {
    id: "sec45_gurugram",
    label: "Sector 45 Main Arterial, Gurugram",
    subtitle: "Greenwood City & Huda City Centre Transit Corridor",
    lat: 28.4595,
    lng: 77.0725,
    type: "landmark"
  },
  {
    id: "mg_road_gurugram",
    label: "MG Road Metro & Sikanderpur, Gurugram",
    subtitle: "Mall Mile Arterial • Sikanderpur Interchange",
    lat: 28.4817,
    lng: 77.0932,
    type: "landmark"
  },
  {
    id: "igi_airport",
    label: "Indira Gandhi International Airport (IGI T3), New Delhi",
    subtitle: "International Terminal 3 • Airport Express Axis",
    lat: 28.5562,
    lng: 77.1000,
    type: "landmark"
  }
];

/**
 * Normalizes input query handling common spelling variations, abbreviations,
 * and typing mistakes (e.g. "knowledge prk 3" -> "Knowledge Park III").
 */
export function normalizeLocationQuery(query: string): string {
  if (!query) return "";
  let q = query.trim();

  // Common spelling mistakes & shorthand
  q = q.replace(/\bprk\b/gi, "park");
  q = q.replace(/\brd\b/gi, "road");
  q = q.replace(/\bstn\b/gi, "station");
  q = q.replace(/\bst\b/gi, "street");
  q = q.replace(/\bsec\b/gi, "sector");
  q = q.replace(/\bsect\b/gi, "sector");
  q = q.replace(/\bexpwy\b/gi, "expressway");
  q = q.replace(/\bexprswy\b/gi, "expressway");
  q = q.replace(/\bcoll\b/gi, "college");
  q = q.replace(/\buniv\b/gi, "university");
  q = q.replace(/\bhosp\b/gi, "hospital");

  // Knowledge Park variants
  q = q.replace(/\bkp\s*3\b/gi, "Knowledge Park III");
  q = q.replace(/\bkp\s*iii\b/gi, "Knowledge Park III");
  q = q.replace(/\bkp-?3\b/gi, "Knowledge Park III");
  q = q.replace(/\bknowledge\s*park\s*3\b/gi, "Knowledge Park III");

  q = q.replace(/\bkp\s*2\b/gi, "Knowledge Park II");
  q = q.replace(/\bkp\s*ii\b/gi, "Knowledge Park II");
  q = q.replace(/\bkp-?2\b/gi, "Knowledge Park II");
  q = q.replace(/\bknowledge\s*park\s*2\b/gi, "Knowledge Park II");

  q = q.replace(/\bkp\s*1\b/gi, "Knowledge Park I");
  q = q.replace(/\bkp\s*i\b/gi, "Knowledge Park I");
  q = q.replace(/\bkp-?1\b/gi, "Knowledge Park I");
  q = q.replace(/\bknowledge\s*park\s*1\b/gi, "Knowledge Park I");

  // Other common abbreviations
  q = q.replace(/\bcp\b/gi, "Connaught Place");
  q = q.replace(/\baiims\b/gi, "AIIMS New Delhi");
  q = q.replace(/\bigi\b/gi, "IGI Airport Delhi");
  q = q.replace(/\bdelhi airport\b/gi, "Indira Gandhi International Airport");

  return q;
}

/**
 * Searches location suggestions using a hybrid of canonical landmarks,
 * active report locations, and the existing Nominatim OpenStreetMap provider.
 */
export async function searchLocationSuggestions(
  query: string,
  reports: Report[] = []
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const normalized = normalizeLocationQuery(trimmed);
  const normalizedLower = normalized.toLowerCase();
  const rawLower = trimmed.toLowerCase();

  const results: LocationSuggestion[] = [];
  const seenKeys = new Set<string>();

  const addResult = (item: LocationSuggestion) => {
    const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
    if (!seenKeys.has(key) && !seenKeys.has(item.label.toLowerCase())) {
      seenKeys.add(key);
      seenKeys.add(item.label.toLowerCase());
      results.push(item);
    }
  };

  // 1. Check Canonical Landmarks (Instant 0ms match with spelling tolerance)
  for (const landmark of CANONICAL_LANDMARKS) {
    const labelLower = landmark.label.toLowerCase();
    const subLower = landmark.subtitle.toLowerCase();

    if (
      labelLower.includes(rawLower) ||
      labelLower.includes(normalizedLower) ||
      subLower.includes(rawLower) ||
      subLower.includes(normalizedLower)
    ) {
      addResult(landmark);
    }
  }

  // 2. Check Active Incident Reports in Database
  for (const report of reports) {
    if (!report || !report.location || !report.latitude || !report.longitude) continue;
    const locLower = (report.location || "").toLowerCase();
    const titleLower = (report.title || "").toLowerCase();

    if (
      locLower.includes(rawLower) ||
      locLower.includes(normalizedLower) ||
      titleLower.includes(rawLower) ||
      titleLower.includes(normalizedLower)
    ) {
      addResult({
        id: `rep_${report.id || Math.random()}`,
        label: report.location,
        subtitle: `Urban Report Area • ${report.category || "Incident"} (${(report.title || "Report").slice(0, 38)}...)`,
        lat: report.latitude,
        lng: report.longitude,
        type: "report"
      });
    }
  }

  // 3. Query the Existing Nominatim Geocoding Provider
  try {
    const searchQuery = normalizedLower.includes("india") || normalizedLower.includes("delhi") || normalizedLower.includes("noida") || normalizedLower.includes("gurugram")
      ? normalized
      : `${normalized}, Delhi NCR`;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&viewbox=76.8,28.2,77.7,28.9&bounded=0&limit=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": "UrbanPulse/1.0" }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (isNaN(lat) || isNaN(lng)) continue;

          // Format clean label and subtitle
          const parts = (item.display_name || "").split(",").map((s: string) => s.trim());
          const cleanLabel = parts.slice(0, 2).join(", ") || item.name || normalized;
          const cleanSub = parts.slice(2, 5).join(", ") || "Delhi NCR Region, India";

          addResult({
            id: `nom_${item.place_id || Math.random()}`,
            label: cleanLabel,
            subtitle: cleanSub,
            lat,
            lng,
            type: "geocoded"
          });
        }
      }
    }
  } catch (err) {
    console.warn("Nominatim autocomplete query notice:", err);
  }

  return results.slice(0, 6);
}

/**
 * Direct geocoding for manual coordinates resolution
 */
export async function geocodeLocation(
  query: string,
  reports: Report[] = []
): Promise<[number, number] | null> {
  const suggestions = await searchLocationSuggestions(query, reports);
  if (suggestions.length > 0) {
    return [suggestions[0].lat, suggestions[0].lng];
  }
  return null;
}

export interface RawOsrmRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][]; // [lon, lat]
  };
}

/**
 * Fetches real routes from the existing OSRM routing engine.
 * Applies travel mode routing and urban speed characteristics.
 */
export async function fetchOsrmRoutes(
  orig: [number, number],
  dest: [number, number],
  mode: "car" | "bike" | "walk"
): Promise<RawOsrmRoute[]> {
  // Use existing OSRM service
  const profileMap: Record<"car" | "bike" | "walk", string> = {
    car: "driving",
    bike: "bike",
    walk: "foot"
  };
  const osrmMode = profileMap[mode] || "driving";
  const url = `https://router.project-osrm.org/route/v1/${osrmMode}/${orig[1]},${orig[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&alternatives=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Routing provider returned HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || "No routing corridor found between these points.");
  }

  // Adjust duration based on realistic travel mode transport dynamics:
  // Car: 35-45 km/h urban average with signals
  // Bike: 20-25 km/h commuter average
  // Walk: 4.8 km/h pedestrian pace
  return data.routes.map((r: any) => {
    let modeAdjustedDuration = r.duration;
    if (mode === "walk") {
      // 4.8 km/h = 1.33 m/s
      modeAdjustedDuration = Math.round(r.distance / 1.33);
    } else if (mode === "bike") {
      // 22 km/h = 6.11 m/s
      modeAdjustedDuration = Math.round(r.distance / 6.11);
    }

    return {
      distance: r.distance,
      duration: modeAdjustedDuration,
      geometry: r.geometry
    };
  });
}

/**
 * Hazard analysis on polyline.
 * Evaluates real active UrbanPulse hazards against corridor coordinates.
 */
export function analyzeRoutesWithHazards(
  rawRoutes: RawOsrmRoute[],
  reports: Report[],
  mode: "car" | "bike" | "walk",
  preferences: RoutePreferences = DEFAULT_PREFERENCES
): SafeRouteOption[] {
  const PROXIMITY_METERS = 65; // Within 65m of road centerline

  const activeReports = reports.filter(r => 
    r.latitude && 
    r.longitude && 
    r.status !== "Resolved" && 
    (r as any).fieldStatus !== "CLOSED"
  );

  const analyzed: SafeRouteOption[] = rawRoutes.map((route, idx): SafeRouteOption => {
    // Convert [lon, lat] to [lat, lon]
    const pathCoordinates: [number, number][] = route.geometry.coordinates.map(c => [c[1], c[0]]);
    const totalDistanceKm = parseFloat((route.distance / 1000).toFixed(1));
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));

    let totalRisk = 0;
    const hazardsOnRoute: SafeRouteOption["hazardsOnRoute"] = [];

    // Track cumulative distances along route for distance-ahead calculation
    const cumulativeDistances: number[] = [0];
    for (let i = 1; i < pathCoordinates.length; i++) {
      const segDist = calculateHaversineDistanceMeters(
        pathCoordinates[i - 1][0],
        pathCoordinates[i - 1][1],
        pathCoordinates[i][0],
        pathCoordinates[i][1]
      );
      cumulativeDistances.push(cumulativeDistances[i - 1] + segDist);
    }

    activeReports.forEach(report => {
      let minDistance = Infinity;
      let closestPointIndex = 0;

      for (let i = 0; i < pathCoordinates.length; i++) {
        const coord = pathCoordinates[i];
        const dist = calculateHaversineDistanceMeters(report.latitude, report.longitude, coord[0], coord[1]);
        if (dist < minDistance) {
          minDistance = dist;
          closestPointIndex = i;
        }
      }

      if (minDistance <= PROXIMITY_METERS) {
        // Status & Priority Weightings
        let statusWeight = 1.0;
        if (report.status === "In Progress" || report.status === "Assigned") {
          statusWeight = 0.6;
        }

        let priorityWeight = 1.0;
        if (report.priority === "Critical") priorityWeight = 2.0;
        else if (report.priority === "High") priorityWeight = 1.4;
        else if (report.priority === "Low") priorityWeight = 0.5;

        // Specific category penalties based on travel mode
        let categoryWeight = 1.0;
        const cat = (report.category || "").toLowerCase();
        if (mode === "bike" && (cat.includes("pothole") || cat.includes("water") || cat.includes("fissure"))) {
          categoryWeight = 1.6; // High risk for two-wheelers
        } else if (mode === "walk" && (cat.includes("light") || cat.includes("manhole") || cat.includes("obstruction"))) {
          categoryWeight = 1.8; // High danger for pedestrians
        } else if (cat.includes("water") && preferences.avoidWaterlogging) {
          categoryWeight = 1.5;
        }

        const severityWeight = (report.severity || 50) / 100;
        const riskScore = statusWeight * priorityWeight * categoryWeight * severityWeight;
        totalRisk += riskScore;

        const distanceAheadMeters = Math.round(cumulativeDistances[closestPointIndex]);

        hazardsOnRoute.push({
          id: report.id,
          type: report.category || "Hazard",
          severity: report.severity || 50,
          lat: report.latitude,
          lng: report.longitude,
          description: report.description || report.title || "Reported road hazard",
          distanceAlongRouteMeters: distanceAheadMeters,
          distanceFromRouteMeters: Math.round(minDistance),
          priority: report.priority || "Medium",
          status: report.status || "Pending"
        });
      }
    });

    // Sort hazards by order along route
    hazardsOnRoute.sort((a, b) => (a.distanceAlongRouteMeters || 0) - (b.distanceAlongRouteMeters || 0));

    // Transparent Safety Score calculation
    let safetyScore = 95;
    if (activeReports.length === 0) {
      safetyScore = 85; // Baseline when no reports are registered in the entire city
    } else {
      // Risk deduction based on hazards found on this specific corridor
      const riskDeduction = totalRisk * 12;
      safetyScore = Math.max(18, Math.min(98, Math.round(95 - riskDeduction)));
    }

    const hazardExposure = Math.max(10, Math.min(100, Math.round(100 - (hazardsOnRoute.length * 15))));
    const roadRisk = Math.max(15, Math.min(100, Math.round(100 - (totalRisk * 14))));
    const activeIncidents = Math.max(20, Math.min(100, Math.round(100 - (hazardsOnRoute.length * 12))));

    const roadQual: SafeRouteOption["roadQuality"] = 
      safetyScore >= 80 ? "Optimal" : safetyScore >= 55 ? "Moderate" : "Caution Required";

    const dataConfidence: "High" | "Medium" | "Unavailable" = activeReports.length > 0 ? "High" : "Unavailable";

    return {
      id: `route_alt_${idx}`,
      name: `Route Option ${idx + 1}`,
      distanceKm: totalDistanceKm,
      durationMinutes,
      safetyScore,
      hazardCountAvoided: 0,
      roadQuality: roadQual,
      pathCoordinates,
      hazardsOnRoute,
      safetyBreakdown: {
        hazardExposure,
        roadRisk,
        activeIncidents,
        dataConfidence
      },
      travelMode: mode
    };
  });

  // Rank routes according to safety and preferences
  analyzed.sort((a, b) => {
    if (preferences.preferFastest) {
      return a.durationMinutes - b.durationMinutes;
    }
    // Default: Prefer safer route with reasonable duration trade-off
    const safetyDiff = b.safetyScore - a.safetyScore;
    const timePenalty = (a.durationMinutes - b.durationMinutes) * 0.4;
    return safetyDiff - timePenalty;
  });

  // Assign distinct labels: RECOMMENDED, FASTEST, ALTERNATIVE
  if (analyzed.length > 0) {
    analyzed[0].id = "safe_route_recommended";
    analyzed[0].name = "Recommended Safe Route";
    analyzed[0].summaryLabel = "RECOMMENDED";

    // Calculate hazards avoided compared to worst route
    const worst = [...analyzed].sort((a, b) => b.hazardsOnRoute.length - a.hazardsOnRoute.length)[0];
    if (worst && worst.id !== analyzed[0].id) {
      analyzed[0].hazardCountAvoided = Math.max(0, worst.hazardsOnRoute.length - analyzed[0].hazardsOnRoute.length);
    }

    if (analyzed.length > 1) {
      // Find fastest
      const fastest = [...analyzed].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
      if (fastest.id === analyzed[0].id && analyzed.length >= 2) {
        analyzed[1].summaryLabel = "ALTERNATIVE";
        analyzed[1].name = "Alternative Corridor";
      } else {
        fastest.summaryLabel = "FASTEST";
        fastest.name = "Fastest Route";
        if (analyzed.length > 2) {
          analyzed[2].summaryLabel = "ALTERNATIVE";
          analyzed[2].name = "Alternative Route";
        }
      }
    }
  }

  return analyzed;
}
