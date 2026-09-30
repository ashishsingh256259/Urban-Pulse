import React, { useState, useEffect, useRef } from "react";
import L from "../utils/initLeaflet";
import { 
  Navigation, ShieldCheck, AlertTriangle, MapPin, 
  Sparkles, Compass, Info, Route, Car, Bike, Footprints, Activity
} from "lucide-react";
import { Report, SafeRouteOption } from "../types";
import { calculateHaversineDistanceMeters } from "../services/spatialClustering";
import { useLanguage } from "../context/LanguageContext";

interface SafeRouteNavProps {
  reports: Report[];
}

function computeRouteRisk(routeCoordinates: [number, number][], reports: Report[]) {
  const PROXIMITY_METERS = 60;
  let totalRisk = 0;
  const hazardsOnRoute: any[] = [];

  reports.forEach(report => {
    if (!report.latitude || !report.longitude) return;
    if (report.status === "Resolved") return; 

    let statusWeight = 1.0; 
    if (report.status === "In Progress" || report.status === "Assigned") {
      statusWeight = 0.5;
    }

    let priorityWeight = 1.0;
    if (report.priority === "Critical") priorityWeight = 2.0;
    else if (report.priority === "High") priorityWeight = 1.5;
    else if (report.priority === "Low") priorityWeight = 0.5;

    let severityWeight = (report.severity || 50) / 100;

    let minDistance = Infinity;
    // Step size 1 for maximum accuracy
    for (let i = 0; i < routeCoordinates.length; i++) {
      const coord = routeCoordinates[i];
      const dist = calculateHaversineDistanceMeters(report.latitude, report.longitude, coord[0], coord[1]);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    if (minDistance <= PROXIMITY_METERS) {
      const risk = statusWeight * priorityWeight * severityWeight;
      totalRisk += risk;
      hazardsOnRoute.push({
        type: report.category,
        severity: report.severity,
        lat: report.latitude,
        lng: report.longitude,
        description: report.description || "Reported hazard",
        source: report.source || "MANUAL_REPORT",
        status: report.status,
        priority: report.priority || "Medium"
      });
    }
  });

  return { totalRisk, hazardsOnRoute };
}

export default function SafeRouteNav({ reports }: SafeRouteNavProps) {
  const { t, isHindi } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline[]>([]);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const hazardMarkersRef = useRef<L.Marker[]>([]);

  const [originStr, setOriginStr] = useState("");
  const [destinationStr, setDestinationStr] = useState("");
  
  const [originCoord, setOriginCoord] = useState<[number, number] | null>(null);
  const [destCoord, setDestCoord] = useState<[number, number] | null>(null);

  const [travelMode, setTravelMode] = useState<"driving" | "cycling" | "foot">("driving");
  const [calculating, setCalculating] = useState(false);
  
  const [computedRoutes, setComputedRoutes] = useState<SafeRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  
  const [statusMsg, setStatusMsg] = useState("IDLE");

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const clearMapRoutes = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    routeLayerRef.current.forEach(layer => {
      if (layer && typeof map.removeLayer === "function") {
        try {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        } catch (e) {}
      }
    });
    routeLayerRef.current = [];
  };

  const clearHazardMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    hazardMarkersRef.current.forEach(marker => {
      if (marker && typeof map.removeLayer === "function") {
        try {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        } catch (e) {}
      }
    });
    hazardMarkersRef.current = [];
  };

  const drawRoutesAndHazards = (routes: SafeRouteOption[], selectedId: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    clearMapRoutes();
    clearHazardMarkers();

    const unselected = routes.filter(r => r.id !== selectedId);
    const selected = routes.find(r => r.id === selectedId);

    const allDraw = [...unselected, selected].filter(Boolean) as SafeRouteOption[];

    allDraw.forEach(rt => {
      const isSelected = rt.id === selectedId;
      const polyline = L.polyline(rt.pathCoordinates, {
        color: isSelected ? (rt.id.includes("safe") ? "#10B981" : "#3B82F6") : "#94A3B8",
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.9 : 0.6,
        dashArray: isSelected ? undefined : "5, 10"
      }).addTo(map);
      routeLayerRef.current.push(polyline);
    });

    if (selected) {
      map.fitBounds(L.polyline(selected.pathCoordinates).getBounds(), { padding: [50, 50] });

      // Draw hazards for selected route
      selected.hazardsOnRoute.forEach((hz: any) => {
        const color = hz.severity >= 75 ? "#EF4444" : hz.severity >= 45 ? "#F59E0B" : "#3B82F6";
        const iconHtml = `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`;
        
        const marker = L.marker([hz.lat, hz.lng], {
          icon: L.divIcon({
            className: "custom-div-icon",
            html: iconHtml,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          })
        }).bindPopup(`
          <div style="font-family: monospace; font-size: 11px;">
            <strong>${hz.type}</strong><br/>
            Sev: ${hz.severity} | Pri: ${hz.priority}<br/>
            Status: ${hz.status}<br/>
            Source: ${hz.source}
          </div>
        `).addTo(map);
        hazardMarkersRef.current.push(marker);
      });
    }
  };

  useEffect(() => {
    if (computedRoutes.length > 0 && selectedRouteId) {
      drawRoutesAndHazards(computedRoutes, selectedRouteId);
    }
  }, [computedRoutes, selectedRouteId]);

  const updateMarkers = (orig: [number, number] | null, dest: [number, number] | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (originMarkerRef.current) {
      try {
        if (map.hasLayer(originMarkerRef.current)) {
          map.removeLayer(originMarkerRef.current);
        }
      } catch (e) {}
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      try {
        if (map.hasLayer(destMarkerRef.current)) {
          map.removeLayer(destMarkerRef.current);
        }
      } catch (e) {}
      destMarkerRef.current = null;
    }

    const createIcon = (color: string) => L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    if (orig) {
      originMarkerRef.current = L.marker(orig, { icon: createIcon("#10B981") }).addTo(map);
      originMarkerRef.current.bindPopup("Origin");
    }
    if (dest) {
      destMarkerRef.current = L.marker(dest, { icon: createIcon("#3B82F6") }).addTo(map);
      destMarkerRef.current.bindPopup("Destination");
    }

    if (orig && !dest) map.setView(orig, 14);
    if (dest && !orig) map.setView(dest, 14);
  };

  useEffect(() => {
    updateMarkers(originCoord, destCoord);
  }, [originCoord, destCoord]);

  const useCurrentLocation = () => {
    setStatusMsg("LOCATING");
    if (!navigator.geolocation) {
      setStatusMsg("ERROR: Geolocation not supported");
      alert("Location permission is required to calculate a route from your current location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginCoord([pos.coords.latitude, pos.coords.longitude]);
        setOriginStr("My Current Location");
        setStatusMsg("LOCATION_READY");
      },
      (err) => {
        setStatusMsg("ERROR: Location denied");
        alert("Location permission is required to calculate a route from your current location.");
      }
    );
  };

  const geocode = async (query: string): Promise<[number, number] | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "UrbanPulse/1.0" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const handleCalculateRoute = async () => {
    if (!originStr || !destinationStr) return;
    setCalculating(true);
    setStatusMsg("CALCULATING_ROUTE");

    let orig = originCoord;
    if (!orig || originStr !== "My Current Location") {
      orig = await geocode(originStr);
      if (orig) setOriginCoord(orig);
    }

    let dest = destCoord;
    dest = await geocode(destinationStr);
    if (dest) setDestCoord(dest);

    if (!orig || !dest) {
      setStatusMsg("ERROR: Invalid destination or origin");
      setCalculating(false);
      return;
    }

    try {
      const osrmMode = travelMode;
      const url = `https://router.project-osrm.org/route/v1/${osrmMode}/${orig[1]},${orig[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        setStatusMsg("NO_ROUTE");
        setComputedRoutes([]);
        setCalculating(false);
        return;
      }

      const analyzedRoutes = data.routes.map((r: any, idx: number) => {
        const coords: [number, number][] = r.geometry.coordinates.map((c: any) => [c[1], c[0]]);
        
        // Hazard awareness analysis based on actual reports
        const { totalRisk, hazardsOnRoute } = computeRouteRisk(coords, reports);
        
        // Convert risk to a 0-100 safety score (Deterministic)
        // 0 risk -> 100 score. Each risk point drops score by 15. Floor at 0.
        const safetyScore = Math.max(0, Math.round(100 - (totalRisk * 15)));
        
        const roadQual = safetyScore >= 80 ? "Optimal" : safetyScore >= 50 ? "Moderate" : "Caution Required";

        return {
          _rawRisk: totalRisk, // temporary field for sorting
          id: `alt_route_${idx}`,
          name: `Route Option ${idx + 1}`,
          distanceKm: parseFloat((r.distance / 1000).toFixed(1)),
          durationMinutes: Math.round(r.duration / 60),
          safetyScore,
          hazardCountAvoided: 0, 
          roadQuality: roadQual,
          pathCoordinates: coords,
          hazardsOnRoute
        };
      });

      // Find the best route based on safety score and duration balance
      analyzedRoutes.sort((a: any, b: any) => {
        // Higher safety is better, shorter duration is better.
        // Balance formula: (B's safety - A's safety) + (A's duration - B's duration) / 2
        const safetyDiff = b.safetyScore - a.safetyScore;
        const durDiff = (a.durationMinutes - b.durationMinutes) * 0.5; 
        return safetyDiff + durDiff;
      });

      // Best route gets special naming
      if (analyzedRoutes.length > 0) {
        analyzedRoutes[0].id = "safe_route_0";
        analyzedRoutes[0].name = "Recommended Route";
        
        // Compare with worst route to calculate avoided hazards
        const worstRoute = [...analyzedRoutes].sort((a: any, b: any) => b.hazardsOnRoute.length - a.hazardsOnRoute.length)[0];
        if (worstRoute && worstRoute.id !== analyzedRoutes[0].id) {
          analyzedRoutes[0].hazardCountAvoided = Math.max(0, worstRoute.hazardsOnRoute.length - analyzedRoutes[0].hazardsOnRoute.length);
        }
      }

      setComputedRoutes(analyzedRoutes);
      setSelectedRouteId(analyzedRoutes[0].id);
      setStatusMsg("ROUTE_READY");
    } catch (err) {
      setStatusMsg("ERROR: Routing API failure");
      console.error(err);
    }
    setCalculating(false);
  };

  const currentSelectedRoute = computedRoutes.find(r => r.id === selectedRouteId) || computedRoutes[0];
  
  // Calculate Live Hazard Index for current map area (rough estimation based on all reports)
  const activeReportsCount = reports.filter(r => r.status !== "Resolved" && r.latitude && r.longitude).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
      <div className="bg-gradient-to-r from-[#EFF6FF] to-[#FFFFFF] border border-[#DBEAFE] rounded-2xl p-5 md:p-6 text-[#172033] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-[#172033] uppercase">
                {t("saferoute.title", "SAFE ROUTE NAVIGATOR")}
              </h1>
              <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded text-[9.5px] font-mono font-bold uppercase tracking-wider">
                {t("saferoute.badge", "Hazard-Aware Routing Engine")}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t("saferoute.subtitle", "Dynamically evaluates road surface degradation, active potholes, and lighting outages to calculate safer commuter corridors.")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono bg-white px-3.5 py-2 rounded-xl border border-[#E2E8F0] shadow-2xs">
            <Activity className="w-4 h-4 text-[#16A34A]" />
            <span className="text-[#64748B]">{t("saferoute.status", "Status:")}</span>
            <span className="text-[#16A34A] font-bold">
              {statusMsg === "IDLE" ? (isHindi ? "सक्रिय" : "IDLE") : statusMsg === "ROUTE_READY" ? (isHindi ? "मार्ग तैयार" : "ROUTE_READY") : statusMsg}
            </span>
          </div>
          <span className="text-[9px] text-[#94A3B8] font-mono">
            {activeReportsCount > 0 
              ? `${activeReportsCount} ${t("saferoute.liveHazardsTracked", "Live Hazards Tracked Globally")}` 
              : t("saferoute.noHazards", "No active UrbanPulse hazards detected.")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">        
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3 text-[#172033] shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-2.5 rounded-xl border border-[#E2E8F0]">
                <MapPin className="w-4 h-4 text-[#16A34A] shrink-0" />
                <div className="w-full flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[9.5px] text-[#64748B] uppercase font-mono block">
                      {t("saferoute.origin", "Origin")}
                    </span>
                    <input
                      type="text"
                      value={originStr}
                      onChange={(e) => setOriginStr(e.target.value)}
                      placeholder={t("saferoute.originPlaceholder", "Origin Address / Landmark")}
                      className="bg-transparent text-xs text-[#172033] w-full focus:outline-hidden font-medium"
                    />
                  </div>
                  <button 
                    onClick={useCurrentLocation}
                    title={t("saferoute.useCurrentLoc", "Use My Current Location")}
                    className="p-1.5 bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] hover:text-[#172033] rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-2.5 rounded-xl border border-[#E2E8F0]">
                <Navigation className="w-4 h-4 text-[#2563EB] shrink-0" />
                <div className="w-full">
                  <span className="text-[9.5px] text-[#64748B] uppercase font-mono block">
                    {t("saferoute.destination", "Destination")}
                  </span>
                  <input
                    type="text"
                    value={destinationStr}
                    onChange={(e) => setDestinationStr(e.target.value)}
                    placeholder={t("saferoute.destinationPlaceholder", "Destination Address / Hub")}
                    className="bg-transparent text-xs text-[#172033] w-full focus:outline-hidden font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#64748B] font-mono uppercase">
                {t("saferoute.travelMode", "Travel Mode:")}
              </span>
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setTravelMode("driving")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    travelMode === "driving" ? "bg-[#2563EB] text-white shadow-2xs" : "text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>{t("saferoute.car", "Car")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode("cycling")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    travelMode === "cycling" ? "bg-[#2563EB] text-white shadow-2xs" : "text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>{t("saferoute.bike", "Bike")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode("foot")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    travelMode === "foot" ? "bg-[#2563EB] text-white shadow-2xs" : "text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>{t("saferoute.walk", "Walk")}</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleCalculateRoute}
              disabled={calculating || !originStr || !destinationStr}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {calculating ? (
                <span>{t("saferoute.calculating", "Calculating Route...")}</span>
              ) : (
                <>
                  <Route className="w-3.5 h-3.5" />
                  <span>{t("saferoute.findRoute", "Find Route")}</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2.5">
            {computedRoutes.map((rt) => {
              const isSelected = rt.id === selectedRouteId;
              const isRecommended = rt.id === "safe_route_0";
              return (
                <div
                  key={rt.id}
                  onClick={() => setSelectedRouteId(rt.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? (isRecommended ? "bg-[#F0FDF4] border-[#16A34A] shadow-xs ring-2 ring-[#16A34A]/20" : "bg-[#EFF6FF] border-[#2563EB] shadow-xs ring-2 ring-[#2563EB]/20")
                      : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 border rounded text-[9px] font-mono font-bold ${
                          isRecommended && isSelected ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]" 
                          : isSelected ? "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]" 
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
                        }`}>
                          {isRecommended ? t("saferoute.recommended", "RECOMMENDED") : t("saferoute.alternative", "ALTERNATIVE")}
                        </span>
                        <h4 className={`text-xs font-bold ${isSelected ? "text-[#172033]" : "text-[#475569]"}`}>
                          {isHindi && isRecommended ? "सुरक्षित मार्ग (कम जोखिम)" : isHindi ? "वैकल्पिक मार्ग" : rt.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                        <span className={`font-bold ${isSelected ? "text-[#172033]" : "text-[#475569]"}`}>
                          {rt.durationMinutes} {t("saferoute.min", "min")}
                        </span>
                        <span className="text-[#CBD5E1]">•</span>
                        <span className="text-slate-500">{rt.distanceKm} {t("saferoute.km", "km")}</span>
                        <span className="text-slate-400">•</span>
                        <span className={rt.safetyScore >= 80 ? "text-emerald-500 font-bold" : rt.safetyScore >= 50 ? "text-amber-500 font-bold" : "text-rose-500 font-bold"}>
                          {isHindi ? "स्कोर:" : "Score:"} {rt.safetyScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">          
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200">{t("saferoute.realtimeMap", "Real-time Map")}</span>
              </div>
              <span className="font-mono text-[10.5px] text-slate-400">
                {isHindi ? "अर्बनपल्स लाइव खतरा डेटा" : "OSRM + UrbanPulse Hazard Data"}
              </span>
            </div>
            
            <div 
              ref={mapContainerRef} 
              className="relative h-64 sm:h-80 w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden" 
              style={{ minHeight: "320px", zIndex: 0 }}
            />
          </div>

          {currentSelectedRoute && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t("saferoute.routeRecommendation", "Route Recommendation")}</span>
                </h3>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-slate-700 font-medium">
                  {currentSelectedRoute.id === "safe_route_0" 
                    ? currentSelectedRoute.hazardsOnRoute.length === 0 
                        ? (isHindi 
                            ? "उपलब्ध अर्बनपल्स डेटा के अनुसार इस रास्ते पर कोई सक्रिय गड्ढा या खतरा दर्ज नहीं है।" 
                            : "Low reported hazard exposure based on available UrbanPulse data.") 
                        : (isHindi 
                            ? `अर्बनपल्स डेटा के अनुसार यह सबसे सुरक्षित मार्ग है, जो कम समय में यात्रा सुनिश्चित करते हुए अन्य मार्गों की तुलना में ${currentSelectedRoute.hazardCountAvoided} अधिक खतरों से बचाता है।` 
                            : `Safer route based on available UrbanPulse data. Recommended because it provides the best balance of travel time and safety, avoiding ${currentSelectedRoute.hazardCountAvoided} more hazards than alternatives.`)
                    : (isHindi 
                        ? "वैकल्पिक मार्ग चुना गया। इस मार्ग पर सड़क के गड्ढे या यातायात की स्थिति भिन्न हो सकती है।" 
                        : "Alternative route selected. This route may have a different hazard profile or travel duration.")
                  }
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">
                      {t("saferoute.safetyScore", "Safety Score")}
                    </span>
                    <span className={`text-sm font-black ${currentSelectedRoute.safetyScore >= 80 ? 'text-emerald-600' : currentSelectedRoute.safetyScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {currentSelectedRoute.safetyScore}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">
                      {t("saferoute.activeHazards", "Active Hazards")}
                    </span>
                    <span className="text-sm font-black text-slate-800">{currentSelectedRoute.hazardsOnRoute.length}</span>
                  </div>
                  {currentSelectedRoute.hazardCountAvoided > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">
                        {t("saferoute.avoided", "Avoided")}
                      </span>
                      <span className="text-sm font-black text-emerald-600">
                        {currentSelectedRoute.hazardCountAvoided} {isHindi ? "खतरे" : "Known"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600 mt-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    <strong>{t("saferoute.disclaimerTitle", "Disclaimer:")}</strong> {t("saferoute.disclaimer", "Safety score is based on available UrbanPulse reports and may not reflect all real-world conditions. UrbanPulse does not guarantee road or travel safety.")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
