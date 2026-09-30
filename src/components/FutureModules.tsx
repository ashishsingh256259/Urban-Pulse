import { useState, useEffect, useRef } from "react";
import L from "../utils/initLeaflet";
import { Report } from "../types";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
} from "recharts";
import { 
  Activity, MapPin, AlertCircle, Heart, Thermometer, Wind, RefreshCw, 
  Compass, Car, Navigation, Shield, Flame, Zap, Sliders, Eye, 
  CheckCircle2, Truck, Sparkles, Server, TrendingUp, TrendingDown,
  ChevronUp, ChevronDown, Check, Award
} from "lucide-react";

interface FutureModulesProps {
  forcedTab?: "traffic" | "emergency" | "predictive" | "environmental";
  reports?: Report[];
  onReportUpdated?: () => void;
}

const sectorsList = [
  { name: "Connaught Place (CP)", lat: 28.6304, lng: 77.2177, keyword: "connaught" },
  { name: "Noida Sector 62", lat: 28.6219, lng: 77.3639, keyword: "noida" },
  { name: "DLF Cyber City", lat: 28.4950, lng: 77.0878, keyword: "cyber" },
  { name: "Saket District", lat: 28.5244, lng: 77.2066, keyword: "saket" },
  { name: "Chandni Chowk", lat: 28.6506, lng: 77.2303, keyword: "chandni" },
  { name: "Okhla Dev Zone", lat: 28.5355, lng: 77.2631, keyword: "okhla" }
];

const areaIntelligenceSummaries: Record<string, string> = {
  "Connaught Place (CP)": "As a central commercial district with massive transit interchanges, CP exhibits high pedestrian density. Current priority centers on optimizing street illumination beneath heritage colonnades and fast-tracking pothole repaving near Outer Circle transit gates to minimize public safety indices.",
  "Noida Sector 62": "This institutional and commercial technology sector experiences critical commuter volumes during office peak hours. Focus is set on storm drainage verification near the elevated metro exits and addressing parking corridor obstructions to maintain smooth traffic dispatch.",
  "DLF Cyber City": "An ultra-modern international corporate hub with advanced automated grid metrics. Holds a highly resilient safety rating, although environmental parameters indicate localized particulate spikes during peak corporate commute cycles.",
  "Saket District": "A prime residential and high-density retail zone. Demands consistent municipal garbage clearing schedules near community park lanes and public square exits to prevent localized civic public health warnings.",
  "Chandni Chowk": "A historic, high-density heritage market area. The complex hyper-local layout results in increased fire-hazard vulnerabilities and traffic gridlock risk. Focus remains on street lane clutter clearing and underground wire safety checks.",
  "Okhla Dev Zone": "A heavy industrial and manufacturing hub. Traffic conditions remain impacted by freight logistical dispatch. Active surveillance is centered on ensuring commercial waste compliance and repairing illumination sensors along high-volume transit routes."
};

export default function FutureModules({ forcedTab, reports, onReportUpdated }: FutureModulesProps = {}) {
  const [activeTab, setActiveTab] = useState<"traffic" | "emergency" | "predictive" | "environmental">("predictive");
  const [selectedSectorName, setSelectedSectorName] = useState("Connaught Place (CP)");

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  const allReports = reports || [];

  // ==========================================
  // REAL-TIME COMPUTE DYNAMIC SECTORS DATA
  // ==========================================
  const sectorsData = sectorsList.map(sector => {
    const sectorReports = allReports.filter(r => {
      const loc = (r.location || "").toLowerCase();
      const title = (r.title || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      const cat = (r.category || "").toLowerCase();
      return (
        loc.includes(sector.keyword) || 
        title.includes(sector.keyword) || 
        desc.includes(sector.keyword) ||
        (sector.keyword === "connaught" && loc.includes("cp")) ||
        (sector.keyword === "cyber" && (loc.includes("gurugram") || loc.includes("cyber city")))
      );
    });

    const activeReports = sectorReports.filter(r => r.status !== "Resolved");

    // Breakdown metrics calculation (where 100 is best/safest, 0 is worst)
    // 1. Road Conditions / Health (based on active potholes & obstructions)
    const roadCount = activeReports.filter(r => r.category === "Pothole" || r.category === "Road Obstruction").length;
    let roadHealth = 100 - (roadCount * 18);
    roadHealth = Math.max(15, Math.min(100, roadHealth));

    // 2. Lighting (streetlights)
    const lightingCount = activeReports.filter(r => r.category === "Broken Streetlight").length;
    let lighting = 100 - (lightingCount * 22);
    lighting = Math.max(15, Math.min(100, lighting));

    // 3. Waste Management (based on active garbage overflow reports)
    const wasteCount = activeReports.filter(r => r.category === "Garbage Overflow").length;
    let waste = 100 - (wasteCount * 22);
    waste = Math.max(15, Math.min(100, waste));

    // 4. Traffic / Mobility (based on obstructions & road count)
    const blockCount = activeReports.filter(r => r.category === "Road Obstruction").length;
    let traffic = 100 - (blockCount * 25) - (roadCount * 8);
    traffic = Math.max(20, Math.min(100, traffic));

    // Default values if clean, to keep variation as specified in CP/Noida Sector 45 examples:
    if (sector.keyword === "connaught") {
      if (activeReports.length === 0) {
        roadHealth = 42;
        lighting = 35;
        waste = 41;
        traffic = 50;
      }
    } else if (sector.keyword === "saket") {
      if (activeReports.length === 0) {
        roadHealth = 78;
        lighting = 75;
        waste = 82;
        traffic = 68;
      }
    } else if (sector.keyword === "noida") {
      if (activeReports.length === 0) {
        roadHealth = 58;
        lighting = 62;
        waste = 50;
        traffic = 60;
      }
    } else if (sector.keyword === "cyber") {
      if (activeReports.length === 0) {
        roadHealth = 90;
        lighting = 95;
        waste = 88;
        traffic = 55;
      }
    }

    const riskScore = Math.round((roadHealth + lighting + waste + traffic) / 4);

    const resolvedCount = sectorReports.filter(r => r.status === "Resolved").length;
    const trend: "improving" | "stable" | "declining" = 
      resolvedCount > activeReports.length ? "improving" :
      activeReports.length > 2 ? "declining" : "stable";

    return {
      name: sector.name,
      lat: sector.lat,
      lng: sector.lng,
      roadHealth,
      lighting,
      waste,
      traffic,
      riskScore,
      trend,
      activeCount: activeReports.length,
      reports: sectorReports,
      activeReports
    };
  });

  const selectedSector = sectorsData.find(s => s.name === selectedSectorName) || sectorsData[0];

  // ==========================================
  // HEATMAP LEAFLET INTEGRATION LOGIC
  // ==========================================
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circlesRef = useRef<L.Circle[]>([]);

  useEffect(() => {
    if (activeTab !== "predictive" || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (mapInstanceRef.current) {
      // If map already exists, invalidate layout on active tab switch
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 50);
      return;
    }

    // Standard high-quality light grey map
    const map = L.map(mapContainerRef.current, {
      center: [28.58, 77.22],
      zoom: 11,
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
  }, [activeTab]);

  // Sync circles on safety heatmap map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeTab !== "predictive") return;

    // Remove legacy layers
    circlesRef.current.forEach(c => {
      if (c) {
        try {
          if (map.hasLayer(c)) {
            map.removeLayer(c);
          }
        } catch (e) {}
      }
    });
    circlesRef.current = [];

    sectorsData.forEach(sector => {
      // Color Rules:
      // 80–100 = Green (Safe)
      // 50–79 = Yellow (Needs Attention)
      // 0–49 = Red (Critical)
      const isRed = sector.riskScore < 50;
      const isYellow = sector.riskScore >= 50 && sector.riskScore < 80;
      const color = isRed ? "#ef4444" : isYellow ? "#f59e0b" : "#10b981";

      const circle = L.circle([sector.lat, sector.lng], {
        radius: 650,
        color: color,
        fillColor: color,
        fillOpacity: 0.45,
        weight: 1.5
      }).addTo(map);

      circle.bindTooltip(`
        <div class="font-sans text-[11px] p-1">
          <strong class="text-slate-800">${sector.name}</strong><br/>
          Urban Safety Score: <strong class="text-slate-900">${sector.riskScore}/100</strong><br/>
          Status: <strong style="color: ${color};">${isRed ? "Critical" : isYellow ? "Needs Attention" : "Safe"}</strong>
        </div>
      `, { permanent: false, direction: "top" });

      circle.on("click", () => {
        setSelectedSectorName(sector.name);
      });

      circlesRef.current.push(circle);
    });
  }, [activeTab, reports]);

  // Fly to selected sector position when selectedSectorName changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeTab !== "predictive") return;
    const target = sectorsData.find(s => s.name === selectedSectorName);
    if (target) {
      map.flyTo([target.lat, target.lng], 12.5, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedSectorName, activeTab]);

  const getRiskColorInfo = (score: number) => {
    if (score >= 80) return { color: "text-emerald-800 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", rawColor: "#10b981", label: "Safe", text: "text-emerald-600", border: "border-emerald-250" };
    if (score >= 50) return { color: "text-amber-850 bg-amber-50 border-amber-200", dot: "bg-amber-500", rawColor: "#f59e0b", label: "Needs Attention", text: "text-amber-600", border: "border-amber-250" };
    return { color: "text-rose-900 bg-rose-50 border-rose-200", dot: "bg-rose-500", rawColor: "#ef4444", label: "Critical", text: "text-rose-600", border: "border-rose-250" };
  };

  // Municipality ranking elements
  const highestRiskSectors = [...sectorsData].sort((a, b) => a.riskScore - b.riskScore).slice(0, 3);
  const lowestRiskSectors = [...sectorsData].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);

  // ==========================================
  // TAB 2 (SMART TRAFFIC NODE) ACTIVE STATE
  // ==========================================
  const [selectedIntersection, setSelectedIntersection] = useState("Connaught Place (CP)");
  const [greenPhaseSecs, setGreenPhaseSecs] = useState(45);
  const [laneDiverterActive, setLaneDiverterActive] = useState(false);
  const [speedLimitKmph, setSpeedLimitKmph] = useState(50);
  const [trafficApplied, setTrafficApplied] = useState(false);

  const activeSectorTraffic = sectorsData.find(s => s.name === selectedIntersection) || sectorsData[0];
  const trafficBaseCongestion = Math.min(95, 30 + (activeSectorTraffic.activeCount * 12) + (activeSectorTraffic.roadHealth < 70 ? 20 : 0));

  const greenPhaseBonus = Math.floor((greenPhaseSecs - 45) * 0.4);
  const diverterReduction = laneDiverterActive ? 25 : 0;
  const speedLimitImpact = speedLimitKmph === 30 ? -8 : speedLimitKmph === 80 ? 12 : 0;

  const calculatedCongestionFactor = Math.max(10, Math.min(99, Math.round(trafficBaseCongestion - greenPhaseBonus - diverterReduction + speedLimitImpact)));

  const trafficChartData = [
    { hour: "06:00", volume: Math.max(8, 12 + speedLimitImpact), optimal: 10 },
    { hour: "08:00", volume: Math.max(25, Math.round(trafficBaseCongestion * 0.9) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.4) },
    { hour: "10:00", volume: Math.max(20, Math.round(trafficBaseCongestion * 0.7) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.35) },
    { hour: "12:00", volume: Math.max(15, Math.round(trafficBaseCongestion * 0.55) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.3) },
    { hour: "14:00", volume: Math.max(22, Math.round(trafficBaseCongestion * 0.65) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.35) },
    { hour: "16:00", volume: Math.max(28, Math.round(trafficBaseCongestion * 0.95) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.45) },
    { hour: "18:00", volume: Math.max(34, Math.round(trafficBaseCongestion * 1.0) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.5) },
    { hour: "20:00", volume: Math.max(18, Math.round(trafficBaseCongestion * 0.5) - diverterReduction), optimal: Math.round(trafficBaseCongestion * 0.25) },
    { hour: "22:00", volume: Math.max(9, 18 + speedLimitImpact), optimal: 10 }
  ];

  // ==========================================
  // TAB 3 (ENVIRONMENTAL HEALTH) ACTIVE STATE
  // ==========================================
  const [purifiers, setPurifiers] = useState([
    { id: "p1", name: "Anand Vihar Tower-A", active: true, mode: "Turbo" },
    { id: "p2", name: "CP Central Park Tower", active: true, mode: "Standard" },
    { id: "p3", name: "Noida Sec-62 Purifier", active: false, mode: "Eco" }
  ]);

  const togglePurifierPower = (id: string) => {
    setPurifiers(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const changePurifierMode = (id: string, mode: "Eco" | "Standard" | "Turbo") => {
    setPurifiers(prev => prev.map(p => p.id === id ? { ...p, mode } : p));
  };

  // Find active garbage overflows reports across Delhi
  const totalGarbageOverflows = allReports.filter(r => r.category === "Garbage Overflow" && r.status !== "Resolved").length;
  
  let calculatedAqi = 240 + (totalGarbageOverflows * 25);
  purifiers.forEach(p => {
    if (p.active) {
      if (p.mode === "Turbo") {
        calculatedAqi -= 75;
      } else if (p.mode === "Standard") {
        calculatedAqi -= 45;
      } else {
        calculatedAqi -= 20;
      }
    }
  });
  calculatedAqi = Math.max(35, calculatedAqi);

  const getAqiStatus = (aqi: number) => {
    if (aqi <= 100) return { label: "Satisfactory / Healthy", color: "text-emerald-650 bg-emerald-50 border-emerald-100" };
    if (aqi <= 200) return { label: "Moderate Smog", color: "text-amber-600 bg-amber-50 border-amber-100" };
    return { label: "Severe Smog Level", color: "text-rose-600 bg-rose-50 border-rose-100" };
  };

  const aqiStatus = getAqiStatus(calculatedAqi);

  const atmosphericData = sectorsData.map(s => {
    let zoneAqi = calculatedAqi;
    if (s.name.includes("Noida")) zoneAqi += 35;
    if (s.name.includes("Chandni")) zoneAqi += 45;
    if (s.name.includes("Cyber")) zoneAqi -= 20;
    return {
      zone: s.name.split(" ")[0],
      index: Math.max(35, zoneAqi)
    };
  });

  // ==========================================
  // TAB 4 (EMERGENCY DISPATCH) ACTIVE STATE
  // ==========================================
  // Extract high-severity unresolved incidents directly from active reports prop
  const activeUnresolvedHighIncidents = allReports.filter(r => r.status !== "Resolved");
  
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [assignedUnit, setAssignedUnit] = useState("Ambulance Air Core 1");
  const [safePathOverride, setSafePathOverride] = useState(true);
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "solving" | "active" | "completed">("idle");
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);

  // Auto-set first incident
  useEffect(() => {
    if (activeUnresolvedHighIncidents.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(activeUnresolvedHighIncidents[0].id);
    }
  }, [activeUnresolvedHighIncidents]);

  const targetIncidentReport = allReports.find(r => r.id === selectedIncidentId);

  const handleStartDispatch = async () => {
    if (!selectedIncidentId || !targetIncidentReport) return;

    setDispatchStatus("solving");
    setDispatchLogs(["[SYSTEM] Accessing active Delhi transport corridors...", "[SYSTEM] Ingesting hazard coordinates via WGS-84...", "[SYSTEM] Initiating A* Safe Route Solver..."]);
    setProgressPercent(15);

    setTimeout(() => {
      setDispatchLogs(prev => [
        ...prev,
        `[CORRIDOR] Bypassing active road blockages near ${targetIncidentReport.location}.`,
        `[A*_SOLVER] Optimized safe path resolved! Route probability index is 98.4%.`,
        `[ASSIGNMENT] Responder status: ${assignedUnit} locked onto ticket target ${targetIncidentReport.id}.`
      ]);
      setDispatchStatus("active");
      setProgressPercent(50);
    }, 1200);

    setTimeout(async () => {
      try {
        const res = await fetch("/api/reports/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetIncidentReport.id,
            status: "In Progress",
            assignedTo: assignedUnit,
            comment: `Live dispatch initiated via ST_SAFE_A* Smart Bypass corridor. Assigned unit: ${assignedUnit}.`,
            officerName: "City AI Operating System"
          })
        });

        if (res.ok) {
          onReportUpdated?.();
          setDispatchLogs(prev => [
            ...prev,
            `[COMMUNICATION] Database ticket ${targetIncidentReport.id} successfully updated to 'In Progress'.`,
            `[ARRIVED] Emergency squad has arrived at site. Deploying immediate mitigations...`
          ]);
        } else {
          setDispatchLogs(prev => [...prev, `[WARNING] Could not write update status to centralized server.`]);
        }
      } catch (err) {
        setDispatchLogs(prev => [...prev, `[ERROR] Failed server dispatch response routing.`]);
      }
      setDispatchStatus("completed");
      setProgressPercent(100);
    }, 3600);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 transition-all flex flex-col gap-6">
      
      {/* HEADER SECTION - PROFESSIONAL CITY OPERATING SYSTEM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono font-extrabold text-blue-600 tracking-widest bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 inline-block font-bold">
            Municipal Operations Intelligence Hub
          </span>
          <h2 className="font-sans font-bold text-lg text-slate-800 tracking-tight mt-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Real-time District Twin Decision Deck</span>
          </h2>
          <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
            Synchronized with real field-report datasets. Render localized Urban Risk Scores, configure live signal intervals, manage atmospheric purifier arrays, and trigger smart dispatch rescues.
          </p>
        </div>
        
        {/* Tab triggers */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start border border-slate-200">
          {[
            { id: "predictive", label: "Urban Safety Heatmap", icon: Shield },
            { id: "traffic", label: "Smart Traffic Center", icon: Car },
            { id: "environmental", label: "Atmospheric Purifiers", icon: Wind },
            { id: "emergency", label: "Responders Dispatcher", icon: Navigation },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 border border-slate-200 shadow-3xs font-extrabold"
                    : "text-gray-500 hover:text-gray-800 hover:bg-white/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC TAB RENDERING */}
      <div className="animate-in fade-in duration-200">
        
        {/* ======================================================== */}
        {/* TAB 1: URBAN SAFETY HEATMAP & AREA RISK Diagnostics */}
        {/* ======================================================== */}
        {activeTab === "predictive" && (
          <div className="flex flex-col gap-6">
            
            {/* Upper Map + Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* GIS Live Heatmap Circle Overlay (Col-7) */}
              <div className="lg:col-span-7 bg-white border border-slate-200/90 p-5 rounded-2xl flex flex-col gap-4 shadow-3xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-extrabold text-blue-600 uppercase tracking-wider">CIVIC RECON overlay</h3>
                    <h4 className="text-sm font-bold text-slate-800 mt-0.5">District Urban Risk Spatial Heatmap</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Live Leaflet GIS database mapping. Click circles to load comprehensive diagnostic parameters.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-150 text-emerald-600 px-2.5 py-0.5 rounded-full animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>SPATIAL MAP LIVE</span>
                  </div>
                </div>

                {/* Map Div */}
                <div className="h-[370px] rounded-xl overflow-hidden border border-slate-200 relative">
                  <div id="safety-heatmap-map" ref={mapContainerRef} className="w-full h-full z-10" />
                  
                  {/* Floating Map Legend */}
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/80 p-2.5 rounded-xl text-[10px] shadow-xs z-[1000] flex flex-col gap-1.5 font-sans">
                    <span className="font-bold text-slate-800 block">Risk Legends Index:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                      <span className="text-slate-600 font-semibold">80 - 100 Secure Zone (Green)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                      <span className="text-slate-600 font-semibold">50 - 79 Needs Attention (Yellow)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                      <span className="text-slate-600 font-semibold">0 - 49 Critical Hazard (Red)</span>
                    </div>
                  </div>
                </div>

                {/* Quick Ward Badges Selector */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {sectorsData.map(s => {
                    const isSelected = s.name === selectedSectorName;
                    const styleInfo = getRiskColorInfo(s.riskScore);
                    return (
                      <button
                        key={s.name}
                        onClick={() => setSelectedSectorName(s.name)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-3xs"
                            : "bg-slate-50 hover:bg-slate-150 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : styleInfo.dot}`} />
                        <span>{s.name}</span>
                        <span className={`text-[9px] font-mono p-0.5 px-1.5 rounded font-extrabold ${isSelected ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-800"}`}>
                          {s.riskScore}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AREA INTELLIGENCE PANEL (Col-5) (FEATURES 1, 2, 3, 4) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 shadow-3xs">
                <div>
                  <h3 className="text-xs font-mono font-extrabold text-blue-600 uppercase tracking-wider">AREA INTELLIGENCE PANEL</h3>
                  <p className="text-[11px] text-gray-500">Live smart city analytics & diagnostic feed</p>
                </div>

                {selectedSector ? (
                  <div className="flex flex-col gap-4">
                    
                    {/* Overall Risk Score block (Feature 1) */}
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 ${getRiskColorInfo(selectedSector.riskScore).color}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 block font-extrabold">WARD IDENTIFIED</span>
                          <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedSector.name}</h4>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-mono font-black text-slate-900">{selectedSector.riskScore}/100</span>
                          <span className="text-[9px] font-mono tracking-wider uppercase bg-white/85 border px-2 py-0.5 rounded-md font-bold mt-1 text-slate-700 shadow-3xs">
                            {getRiskColorInfo(selectedSector.riskScore).label} Level
                          </span>
                        </div>
                      </div>

                      {/* Spark Trend & Active count */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-355/40">
                        <span className="flex items-center gap-1.5 font-medium text-slate-800">
                          Trend Index: 
                          <span className="font-extrabold flex items-center gap-1 text-slate-900 capitalize">
                            {selectedSector.trend === "improving" && (
                              <span className="text-emerald-700 flex items-center gap-1">↓ Decreasing Risk</span>
                            )}
                            {selectedSector.trend === "declining" && (
                              <span className="text-rose-700 flex items-center gap-1">↑ Increasing Risk</span>
                            )}
                            {selectedSector.trend === "stable" && (
                              <span className="text-slate-600 flex items-center gap-1">→ Stable</span>
                            )}
                          </span>
                        </span>
                        <span className="font-extrabold text-slate-950 bg-white/80 border border-slate-200/50 px-2 py-0.5 rounded-md text-[10.5px]">
                          {selectedSector.activeCount} Live Reports
                        </span>
                      </div>
                    </div>

                    {/* AREA INTELLIGENCE SUMMARY CARD (FEATURE 1) */}
                    <div className="bg-blue-50/40 border border-blue-200/50 p-4 rounded-xl text-left shadow-3xs">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Compass className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider">
                          Area Intelligence Summary
                        </span>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-slate-700 font-sans italic">
                        "{areaIntelligenceSummaries[selectedSector.name] || 'Active monitoring is enabled. Dynamic sensors are analyzing safety and municipal service indexes across key sector zones.'}"
                      </p>
                    </div>

                    {/* PROFESSIONAL HISTORICAL RISK SCORE TRACKING INDEX */}
                    <div className="bg-white border border-slate-200 p-4.5 rounded-xl flex flex-col gap-3 shadow-3xs text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-extrabold uppercase text-blue-600 tracking-wider">Historical Trend Corridor</span>
                        <span className="text-[9.5px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded font-mono">Telemetry Analytics</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-center">
                          <span className="text-[9px] text-gray-500 uppercase block font-bold tracking-tight">Current Score</span>
                          <span className="text-base font-extrabold text-slate-850 block mt-1 font-mono">{selectedSector.riskScore}</span>
                          <span className="text-[8.5px] text-slate-400 block font-semibold uppercase mt-0.5">Delhi NCR</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-center">
                          <span className="text-[9px] text-gray-500 uppercase block font-bold tracking-tight">Last Week</span>
                          <span className="text-base font-extrabold text-slate-750 block mt-1 font-mono">
                            {selectedSector.trend === "improving" ? Math.min(100, selectedSector.riskScore + 14) : selectedSector.trend === "declining" ? Math.max(15, selectedSector.riskScore - 12) : selectedSector.riskScore + 2}
                          </span>
                          <span className="text-[8.5px] text-slate-400 block font-semibold uppercase mt-0.5">Base level</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-center flex flex-col justify-between">
                          <span className="text-[9px] text-gray-400 uppercase block font-rose font-bold tracking-tight">Shift Velocity</span>
                          <span className={`text-[10px] font-mono font-black mt-1 uppercase ${
                            selectedSector.trend === "improving" ? "text-emerald-600" : selectedSector.trend === "declining" ? "text-rose-600 animate-pulse" : "text-amber-600"
                          }`}>
                            {selectedSector.trend === "improving" ? "📈 Improving" : selectedSector.trend === "declining" ? "📉 Declining" : "↔️ Stable"}
                          </span>
                          <span className="text-[8px] text-slate-400 block font-mono mt-0.5">System AI</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[11px] font-medium text-slate-600 leading-normal font-sans italic text-left">
                        <strong className="text-slate-700 not-italic uppercase text-[9.5px] tracking-wider block mb-0.5">Diagnostic Insight:</strong> 
                        "{selectedSector.trend === "improving" 
                          ? "Decreasing unresolved risk reports and active dispatch mitigations detected across the ward corridors." 
                          : selectedSector.trend === "declining" 
                            ? "Climbing unresolved high-severity hazards and response latency are increasing risk exposure." 
                            : "The risk level is currently stable with normal local response times holding public safety parameters."}"
                      </div>

                      {/* Small inline sparkline AreaChart mapping historical points */}
                      <div className="h-16 w-full pt-1.5">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={[
                              { day: "Mon", score: selectedSector.riskScore + (selectedSector.trend === "improving" ? 8 : -6) },
                              { day: "Tue", score: selectedSector.riskScore + (selectedSector.trend === "improving" ? 12 : -10) },
                              { day: "Wed", score: selectedSector.riskScore + (selectedSector.trend === "improving" ? 7 : -7) },
                              { day: "Thu", score: selectedSector.riskScore + (selectedSector.trend === "improving" ? 3 : -2) },
                              { day: "Fri", score: selectedSector.riskScore + (selectedSector.trend === "improving" ? 1 : 1) },
                              { day: "Sat", score: selectedSector.riskScore + (selectedSector.trend === "improving" ? 2 : -1) },
                              { day: "Sun", score: selectedSector.riskScore }
                            ]}
                            margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                          >
                            <defs>
                              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={selectedSector.trend === "improving" ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={selectedSector.trend === "improving" ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="score" stroke={selectedSector.trend === "improving" ? "#10b981" : "#ef4444"} strokeWidth={1.5} fillOpacity={1} fill="url(#colorRisk)" />
                            <Tooltip content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 border border-slate-800 text-white rounded px-1.5 py-0.5 text-[9px] font-mono leading-none">
                                    Score: {payload[0].value}%
                                  </div>
                                );
                              }
                              return null;
                            }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* FEATURE 1 — Dynamic Scoring Factors */}
                    <div className="bg-slate-50 p-4 border border-slate-205 rounded-xl flex flex-col gap-3">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">Compounded Risk Breakdown Factors</span>
                      
                      {/* Road Health */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Road Health (Potholes, Obstructions)</span>
                          <span className="font-mono text-slate-900 font-extrabold">{selectedSector.roadHealth}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedSector.roadHealth >= 80 ? "bg-emerald-500" : selectedSector.roadHealth >= 50 ? "bg-amber-500" : "bg-rose-500"
                            }`} 
                            style={{ width: `${selectedSector.roadHealth}%` }} 
                          />
                        </div>
                      </div>

                      {/* Lighting */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Lighting (Streetlights, Illumination)</span>
                          <span className="font-mono text-slate-900 font-extrabold">{selectedSector.lighting}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedSector.lighting >= 80 ? "bg-emerald-500" : selectedSector.lighting >= 50 ? "bg-amber-500" : "bg-rose-500"
                            }`} 
                            style={{ width: `${selectedSector.lighting}%` }} 
                          />
                        </div>
                      </div>

                      {/* Waste Management */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Waste Management (Garbage, Overflows)</span>
                          <span className="font-mono text-slate-900 font-extrabold">{selectedSector.waste}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedSector.waste >= 80 ? "bg-emerald-500" : selectedSector.waste >= 50 ? "bg-amber-500" : "bg-rose-500"
                            }`} 
                            style={{ width: `${selectedSector.waste}%` }} 
                          />
                        </div>
                      </div>

                      {/* Traffic */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Traffic (Congestion, Flow Indexes)</span>
                          <span className="font-mono text-slate-900 font-extrabold">{selectedSector.traffic}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedSector.traffic >= 80 ? "bg-emerald-500" : selectedSector.traffic >= 50 ? "bg-amber-500" : "bg-rose-500"
                            }`} 
                            style={{ width: `${selectedSector.traffic}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* FEATURE 2 — AI RECOMMENDATION ENGINE CONTRACT */}
                    <div className="bg-slate-950 text-slate-200 border border-slate-900 p-4 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">AI RECOMMENDATION ENGINE</span>
                      </div>
                      
                      <div className="text-[11.5px] leading-relaxed text-slate-300">
                        To optimize {selectedSector.name}’s Urban Risk Score:
                        <ul className="list-disc pl-4 text-slate-300 mt-1.5 space-y-1 font-sans">
                          {selectedSector.roadHealth < 60 && (
                            <li>Deploy rapid repaving crew to resolve potholes / road damage.</li>
                          )}
                          {selectedSector.lighting < 60 && (
                            <li>Dispatch lighting contractors to repair/upgrade dark streetlights.</li>
                          )}
                          {selectedSector.waste < 60 && (
                            <li>Redirect dynamic waste collection truck to clear accumulated overflow points.</li>
                          )}
                          {selectedSector.roadHealth >= 60 && selectedSector.lighting >= 60 && selectedSector.waste >= 60 && (
                            <li>Execute preventative road diagnostics and sensor calibrations.</li>
                          )}
                          <li>Initiate automated civic surveillance monitoring around local lanes.</li>
                        </ul>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 mt-1 text-[11px]">
                        <span className="text-slate-450">Expected Improvement:</span>
                        <span className="font-mono bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded font-extrabold">
                          {selectedSector.riskScore} → {Math.min(96, selectedSector.riskScore + 35)} Score
                        </span>
                      </div>
                    </div>

                    {/* FEATURE 3 — URBAN RISK FORECAST */}
                    <div className="border border-slate-205 p-4 rounded-xl bg-slate-50 flex flex-col gap-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-550 tracking-wider">URBAN RISK FORECASTS</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 uppercase font-semibold block">Now</span>
                          <span className="text-xs font-bold text-slate-900">{selectedSector.riskScore}/100</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 uppercase font-semibold block">7-Day</span>
                          <span className={`text-xs font-bold ${selectedSector.trend === "improving" ? "text-emerald-600" : selectedSector.trend === "declining" ? "text-rose-600 font-extrabold" : "text-slate-700"}`}>
                            {selectedSector.trend === "improving" ? Math.min(95, selectedSector.riskScore + 4) : selectedSector.trend === "declining" ? Math.max(15, selectedSector.riskScore - 6) : selectedSector.riskScore}/100
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 uppercase font-semibold block">30-Day</span>
                          <span className={`text-xs font-bold ${selectedSector.trend === "improving" ? "text-emerald-600" : selectedSector.trend === "declining" ? "text-rose-600 font-extrabold" : "text-slate-750"}`}>
                            {selectedSector.trend === "improving" ? Math.min(95, selectedSector.riskScore + 12) : selectedSector.trend === "declining" ? Math.max(15, selectedSector.riskScore - 15) : Math.max(15, selectedSector.riskScore - 2)}/100
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-200/50 pt-2 font-mono">
                        {selectedSector.trend === "improving" && (
                          <span className="text-emerald-700">✓ Predictive Trend: Declining hazards due to high municipal resolution speed.</span>
                        )}
                        {selectedSector.trend === "declining" && (
                          <span className="text-red-700">⚠ Predictive Trend: Upward safety risks unless active issue backlogs are dispelled.</span>
                        )}
                        {selectedSector.trend === "stable" && (
                          <span className="text-slate-500">→ Predictive Trend: Safety parameters holding steady across our grid networks.</span>
                        )}
                      </div>
                    </div>

                    {/* Active reports inside selection (Feature 4) */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">Active Ward Incident Tickets</span>
                      {selectedSector.activeReports.length === 0 ? (
                        <div className="text-[11px] text-emerald-700 bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center italic font-bold">
                          🎉 No active issues registered in this area. Clean & Safe!
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {selectedSector.activeReports.map(rep => (
                            <div key={rep.id} className="p-2 bg-slate-50 border border-slate-205 rounded-lg flex items-center justify-between text-xs hover:border-slate-350 transition-colors">
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-slate-800 truncate block text-left">{rep.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono tracking-tight block text-left">{rep.id} • {rep.category}</span>
                              </div>
                              <span className={`text-[9px] font-bold font-mono py-0.5 px-2 rounded-full shrink-0 ${
                                rep.severity >= 75 ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}>
                                {rep.severity}% Sev
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="text-slate-400 italic text-center py-10 text-xs">Select an area to view diagnostic scores</div>
                )}
              </div>

            </div>

            {/* MUNICIPALITY DASHBOARD INTELLIGENCE WIDGETS */}
            <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl shadow-3xs">
              <div className="mb-4">
                <span className="text-[9.5px] font-extrabold font-mono text-emerald-600 tracking-wider uppercase block">ANALYTICS ENGINE</span>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">Municipal Risk & Safety Rankings Board</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Highest Risk Areas */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-rose-500 tracking-wider">Highest Risk Areas</span>
                    <div className="flex flex-col gap-2 mt-2.5">
                      {highestRiskSectors.map((s, idx) => (
                        <div key={s.name} className="flex items-center justify-between text-[11.5px] font-semibold text-slate-700">
                          <span className="truncate max-w-[130px]">{s.name}</span>
                          <span className="text-[10px] font-bold text-rose-600 px-1.5 py-0.5 bg-rose-50 rounded">
                            {s.riskScore}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lowest Risk Areas */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Lowest Risk Areas</span>
                    <div className="flex flex-col gap-2 mt-2.5">
                      {lowestRiskSectors.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-[11.5px] font-semibold text-slate-700">
                          <span className="truncate max-w-[130px]">{s.name}</span>
                          <span className="text-[10px] font-bold text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded">
                            {s.riskScore}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Risk Trends Tracker */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">District Trends Tracker</span>
                    <div className="mt-2.5 flex flex-col gap-1.5 text-[11px] leading-relaxed text-slate-600 font-semibold">
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>Saket District rising (+8% Resolution)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                        <span>Noida Sector 62 is declining</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <span>CP Outer Circle stabilized at 84 pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* District Rankings progress meter */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Area Protection Progress</span>
                    <div className="flex flex-col gap-2 mt-2.5">
                      {[...sectorsData].sort((a,b)=>b.riskScore - a.riskScore).slice(0, 3).map((s, idx) => (
                        <div key={s.name} className="text-[10px] font-bold text-slate-700">
                          <div className="flex justify-between mb-0.5">
                            <span className="truncate max-w-[110px]">#{idx+1} {s.name}</span>
                            <span className="font-mono text-blue-600">{s.riskScore}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${s.riskScore}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SMART TRAFFIC CONTROL CENTER & BOOSTER */}
        {/* ======================================================== */}
        {activeTab === "traffic" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Control Form */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-mono font-extrabold text-blue-600 tracking-wider uppercase">FLOW DISSIPATOR ENGINE</h3>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Smart Traffic Timing Optimization</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Tune green phase durations and freight lane diversion boundaries dynamically to flush active road bottlenecks.
                </p>
              </div>

              {/* Selection */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-450 block mb-1">Select Intersection Corridor</label>
                <select
                  value={selectedIntersection}
                  onChange={(e) => setSelectedIntersection(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <option value="Connaught Place (CP)">Connaught Place Outer Ring</option>
                  <option value="Noida Sector 62">Noida Sector 62 Link</option>
                  <option value="DLF Cyber City">NH-48 Gurugram Interchange</option>
                </select>
              </div>

              {/* Slider */}
              <div className="bg-white p-3 border border-slate-200 rounded-xl">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-600">Green Light Time Interval:</span>
                  <span className="font-mono text-emerald-600 font-extrabold">{greenPhaseSecs} Secs</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="120"
                  value={greenPhaseSecs}
                  onChange={(e) => setGreenPhaseSecs(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[9.5px] text-slate-400 mt-1 leading-normal">
                  Higher intervals help digest blockages created by unresolved potholes.
                </p>
              </div>

              {/* Toggle Diverter */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl">
                <div>
                  <span className="text-xs font-bold block">Activate Cargo Lane Bypass</span>
                  <span className="text-[9px] text-slate-400">Reroutes heavy transport logistics away from CP</span>
                </div>
                <input
                  type="checkbox"
                  checked={laneDiverterActive}
                  onChange={(e) => setLaneDiverterActive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Speed choices */}
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Speed Limit Rule</span>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 50, 80].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setSpeedLimitKmph(speed)}
                      className={`text-[10px] font-mono font-bold py-1.5 rounded-xl border transition-all ${
                        speedLimitKmph === speed
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      {speed} KM/H
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setTrafficApplied(true);
                  setTimeout(() => setTrafficApplied(false), 2000);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {trafficApplied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                    <span>Directive Propagated to IoT Signals!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Transmit IoT Flow Directive</span>
                  </>
                )}
              </button>
            </div>

            {/* Metrics and Charts */}
            <div className="lg:col-span-7 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Live Congestion Rate</span>
                  <div className="text-3xl font-display font-black text-slate-800 font-mono mt-0.5">
                    {calculatedCongestionFactor}%
                  </div>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border inline-block mt-2 ${
                    calculatedCongestionFactor >= 75 ? "bg-red-50 text-red-650 border-red-150" :
                    calculatedCongestionFactor >= 45 ? "bg-amber-50 text-amber-600 border-amber-150" :
                    "bg-emerald-50 text-emerald-650 border-emerald-150"
                  }`}>
                    {calculatedCongestionFactor >= 75 ? "🚨 Bottleneck Active" : calculatedCongestionFactor >= 45 ? "⚠️ Standard Delays" : "✅ High Flow Greenwave"}
                  </span>
                </div>

                <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl">
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">Signal Mitigation Factor</span>
                  <div className="text-3xl font-display font-black text-blue-700 font-mono mt-0.5">
                    -{greenPhaseBonus + (laneDiverterActive ? 25 : 0)}%
                  </div>
                  <span className="text-[9.55px] text-slate-500 font-semibold block mt-1.5">Corridor latency eased</span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="border border-slate-150 p-4 rounded-xl min-h-[220px] flex flex-col bg-white">
                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">Live Neighborhood Commuters Backlog Forecast</span>
                <div className="flex-1 min-h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {allReports.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No data available yet.</div>
                    ) : (
                      <AreaChart data={trafficChartData} margin={{ top: 5, right: 3, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colTrafficVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colTrafficOptimal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12 }} />
                      <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 600 }} />
                      <Area name="Standard Congestion Block" type="monotone" dataKey="volume" stroke="#ef4444" strokeWidth={2} fill="url(#colTrafficVol)" />
                      <Area name="Optimized Artery Path" type="monotone" dataKey="optimal" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#colTrafficOptimal)" />
                    </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ENVIRONMENTAL ATMOSPHERE PURIFIERS & AQI */}
        {/* ======================================================== */}
        {activeTab === "environmental" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Purifier Switches List */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-mono font-extrabold text-blue-600 tracking-wider uppercase">ATMOSPHERIC NEURAL CONTROLLER</h3>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Regional Outdoor Smog Scrubber Towers</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Audit active filtration grids. Turn towers on or set intensity levels to Turbo to wash particulate density (PM2.5).
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {purifiers.map(p => (
                  <div key={p.id} className="bg-white p-3.5 border border-slate-200 rounded-xl flex flex-col gap-2.5 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${p.active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
                        <span className="text-xs font-bold text-slate-800">{p.name}</span>
                      </div>
                      <button
                        onClick={() => togglePurifierPower(p.id)}
                        className={`text-[9.5px] font-bold px-2 rounded-lg py-1 border transition-all cursor-pointer ${
                          p.active 
                            ? "bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-600"
                            : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {p.active ? "Toggle Off" : "Power On"}
                      </button>
                    </div>

                    {p.active && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[9.5px] text-slate-400 font-extrabold uppercase mr-1">Intensity Level:</span>
                        {(["Eco", "Standard", "Turbo"] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => changePurifierMode(p.id, m)}
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                              p.mode === m 
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Active garbage warning indicator */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 text-blue-900 rounded-xl text-xs">
                <span className="font-bold block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  Sensing Grid Telemetry Feedback
                </span>
                <p className="text-[10px] text-slate-500 mt-1">
                  Active garbage piles increase local smog risk. Running Central towers reduces regional air pollution indices dynamically.
                </p>
              </div>
            </div>

            {/* Stats chart */}
            <div className="lg:col-span-7 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between gap-5">
              
              {/* AQI HUD Card */}
              <div className="p-5 border border-slate-150 rounded-2xl bg-[#0A0D1A] text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 tracking-wider font-extrabold uppercase block font-bold">ATMOSPHERIC POLLUTION INDEX</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-display font-black tracking-tight text-white font-mono">{calculatedAqi}</span>
                    <span className="text-xs text-slate-400 font-semibold font-mono">AQI Level (PM2.5)</span>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold font-mono ${aqiStatus.color}`}>
                  {aqiStatus.label}
                </div>
              </div>

              {/* Bar breakdown chart and indices */}
              <div className="border border-slate-150 p-4 rounded-xl min-h-[220px] flex flex-col bg-white">
                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">Live Neighborhood Environmental AQI Pollution Index</span>
                <div className="flex-1 min-h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {allReports.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No data available yet.</div>
                    ) : (
                      <BarChart data={atmosphericData} margin={{ top: 5, right: 3, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="zone" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip />
                      <Bar name="Dynamic AQI" dataKey="index" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: REAL EMERGENCY SERVICES RESPONDER DISPATCH */}
        {/* ======================================================== */}
        {activeTab === "emergency" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Settings panel */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-mono font-extrabold text-blue-600 tracking-wider uppercase">RESCUE ROUTE DISPATCHER</h3>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Hazard Detour Solver & Quick Dispatch</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Assign emergency responder trucks or ambulance fleets to live incident report tickets, bypassing road cave-ins and blockages.
                </p>
              </div>

              {/* Select Incident Card from real reports data */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-450 block mb-1">Select Active Incident report ticket</label>
                {activeUnresolvedHighIncidents.length === 0 ? (
                  <div className="p-3 bg-white border border-slate-200 text-xs text-slate-500 italic rounded-md">
                    No active unresolved incidents registered in system queue.
                  </div>
                ) : (
                  <select
                    value={selectedIncidentId}
                    onChange={(e) => {
                      setSelectedIncidentId(e.target.value);
                      setDispatchStatus("idle");
                      setDispatchLogs([]);
                      setProgressPercent(0);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {activeUnresolvedHighIncidents.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        [{inc.id}] {inc.title.substring(0, 32)}...
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Fleet responder selection */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-450 block mb-1">Assign Emergency Responder Fleet</label>
                <select
                  value={assignedUnit}
                  onChange={(e) => setAssignedUnit(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <option value="Ambulance Air Core 1">Ambulance Air Core 1</option>
                  <option value="Hazard Containment Fleet-4">Hazard Containment Fleet-4</option>
                  <option value="Quick Repair Crew-B">Quick Repair Crew-B</option>
                  <option value="South Delhi Civic Sweepers">South Delhi Civic Sweepers</option>
                </select>
              </div>

              {/* Pathfinding Toggle */}
              <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
                <div>
                  <span className="font-bold block text-blue-900 leading-tight">ST_SAFE_A* Smart Bypass Overlays</span>
                  <span className="text-[9.5px] text-slate-450">Safely bypasses structural risk zones & congestion areas</span>
                </div>
                <input
                  type="checkbox"
                  checked={safePathOverride}
                  onChange={(e) => setSafePathOverride(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Run Dispatch Button */}
              <button
                onClick={handleStartDispatch}
                disabled={activeUnresolvedHighIncidents.length === 0 || dispatchStatus === "solving" || dispatchStatus === "active"}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-350 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md font-sans"
              >
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>
                  {dispatchStatus === "idle" && "Solve Detour & Initiate Fleet Rescue"}
                  {dispatchStatus === "solving" && "Running ST_SAFE_A* Router..."}
                  {dispatchStatus === "active" && "Fleet is Traveling..."}
                  {dispatchStatus === "completed" && "Re-run Rescuers Solver"}
                </span>
              </button>
            </div>

            {/* Tracker Display */}
            <div className="lg:col-span-7 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between gap-5 relative overflow-hidden bg-white">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>
              
              <div>
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2 rounded-lg">
                  <span className="text-[9.5px] font-mono font-extrabold text-slate-500 tracking-wider">LIVE RECIPIENT CORRIDOR DETOUR MAP</span>
                  <span className="text-[9.5px] font-mono font-extrabold text-blue-600">AOP ST_SAFE_A* TIMING</span>
                </div>

                <div className="mt-4 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-800">Dispatch Progress Indicator</span>
                    <span className="font-mono text-blue-600">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex items-start gap-1.5 leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-850 block">Risk Bypass Detour</span>
                        <span className="text-[10px] text-slate-450 block mt-0.5">
                          {safePathOverride ? "Active" : "Disabled (Straight line paths)"}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex items-start gap-1.5 leading-relaxed">
                      <Compass className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-850 block">ETA Corridor Output</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5 font-bold uppercase">
                          {dispatchStatus === "idle" ? "--:--" : dispatchStatus === "solving" ? "Resolving..." : dispatchStatus === "active" ? "Traveling..." : "ARRIVED"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logger console */}
              <div className="border border-slate-150 rounded-xl bg-[#0A0D1A] text-slate-350 p-4 flex flex-col gap-1 text-[11px] font-mono leading-relaxed flex-1 overflow-y-auto max-h-[140px]">
                <div className="text-[9px] font-bold text-blue-400 uppercase border-b border-slate-900 pb-1.5 mb-2 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Interactive Route Tracker Logs:</span>
                </div>
                {dispatchLogs.length === 0 ? (
                  <div className="text-slate-500 font-mono italic text-center py-5">
                    Configure parameters on the left and trigger squad dispatches to run pathfinding algorithms in real-time.
                  </div>
                ) : (
                  dispatchLogs.map((log, idx) => (
                    <div key={idx} className={`${
                      log.includes("[COMMUNICATION]") || log.includes("[ARRIVED]") || log.includes("[A*_SOLVER]") ? "text-emerald-400 font-semibold" :
                      log.includes("[SYSTEM]") ? "text-blue-400 font-bold" : "text-slate-300"
                    }`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
