import React, { useState } from "react";
import { Report } from "../types";
import { computeDigitalTwinZones } from "../utils/geoAnalytics";
import { 
  Layers, MapPin, ShieldAlert, ShieldCheck, Cpu, 
  Settings, Activity, Eye, Compass, Wind, AlertOctagon,
  Camera, FileText, CheckCircle, AlertTriangle, Sparkles
} from "lucide-react";

interface SmartCityDigitalTwinProps {
  reports: Report[];
}

export default function SmartCityDigitalTwin({ reports }: SmartCityDigitalTwinProps) {
  const [activeLayer, setActiveLayer] = useState<"infrastructure" | "traffic" | "environmental" | "safety" | "risk">("risk");
  const [selectedPointId, setSelectedPointId] = useState<string>("sec45");

  // Compute live intelligence for each ward from real Firestore reports
  const dynamicWards = computeDigitalTwinZones(reports);

  // Find info about selected point
  const currentPointInfo = dynamicWards.find(w => w.id === selectedPointId) || dynamicWards[0];

  const layersInfo = {
    infrastructure: { title: "Infrastructure Grid Layer", desc: "Monitors real-time status of lighting arrays, sidewalk concrete, and asphalt conduits.", accentColor: "stroke-blue-500 fill-blue-500" },
    traffic: { title: "Traffic Vector Layer", desc: "Monitors lane saturation multipliers and dynamic averages of commuter transit velocities.", accentColor: "stroke-amber-500 fill-amber-500" },
    environmental: { title: "Environmental Health Layer", desc: "Overlays particulate sensors, sulfur levels, and real-time AQI indexes across Delhi NCR.", accentColor: "stroke-sky-500 fill-sky-500" },
    safety: { title: "Safety Diagnostics Layer", desc: "Examines active hazard zones, civilian complaints, and localized incident density.", accentColor: "stroke-indigo-500 fill-indigo-500" },
    risk: { title: "Sovereign Composite Risk Layer", desc: "Synthesizes mathematical hazard coefficients to isolate high-concern sectors instantly.", accentColor: "stroke-rose-500 fill-rose-500" }
  };

  const totalReportsCount = reports.length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left flex flex-col gap-6" id="digital-twin-workspace">
      
      {/* Title & Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              MUNICIPAL DIGITAL TWIN
            </span>
            <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Real Firestore Synchronized
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-850 mt-0.5 font-display">
            Interactive City Vector Hologram & Ward Diagnostics
          </h3>
          <p className="text-[11.5px] text-gray-500 leading-normal">
            Synthesizes live hazard records with municipal spatial telemetry across Delhi NCR sectors.
          </p>
        </div>

        {/* Console indicator */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Cpu className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
          <div className="text-right">
            <div className="text-[10px] font-mono font-bold text-slate-700 uppercase">Vector Twin Active</div>
            <div className="text-[9px] text-slate-400 font-mono">{totalReportsCount} Live Firestore Records</div>
          </div>
        </div>
      </div>

      {/* Main interactive grid row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Schematic Twin Graphic Frame (Col-8) */}
        <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl p-4.5 relative overflow-hidden flex flex-col items-center">
          
          {/* Layer HUD overlay details */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 px-4 rounded-xl shadow-3xs max-w-sm z-10 text-left">
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">ACTIVE SCHEMATIC DATASET</span>
            <span className="text-xs font-black text-slate-850 block mt-0.5">{layersInfo[activeLayer].title}</span>
            <span className="text-[10px] text-slate-550 block mt-0.5 leading-relaxed">{layersInfo[activeLayer].desc}</span>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2 px-3 rounded-lg text-slate-100 z-10 flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-200 font-extrabold select-none">
              Sector: {currentPointInfo.name} ({currentPointInfo.activeReports} Active Hazards)
            </span>
          </div>

          {/* SVG Canvas Board */}
          <div className="w-full max-w-lg aspect-square sm:aspect-video relative my-4 flex items-center justify-center">
            
            <svg 
              className="w-full h-full bg-white border border-slate-200 rounded-xl shadow-inner cursor-crosshair select-none" 
              viewBox="0 0 500 360"
            >
              <defs>
                <pattern id="dotGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="0.75" fill="#e2e8f0" />
                </pattern>
              </defs>

              {/* Decorative background grid patterns */}
              <rect width="100%" height="100%" fill="url(#dotGrid)" />
              
              {/* Abstract Road Connections Vector Lines */}
              <g stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 4" fill="none">
                <line x1="80" y1="260" x2="180" y2="120" />
                <line x1="180" y1="120" x2="340" y2="300" />
                <line x1="180" y1="120" x2="220" y2="240" />
                <line x1="180" y1="120" x2="420" y2="110" />
                <line x1="180" y1="120" x2="200" y2="60" />
                <line x1="220" y1="240" x2="300" y2="190" />
                <line x1="300" y1="190" x2="340" y2="300" />
                <line x1="300" y1="190" x2="420" y2="110" />
              </g>

              {/* Layer-Specific SVG Visualizers Overlay */}
              {activeLayer === "infrastructure" && (
                <g stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8">
                  <line x1="180" y1="120" x2="340" y2="300" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 5" />
                  <line x1="80" y1="260" x2="180" y2="120" />
                  <line x1="180" y1="120" x2="220" y2="240" />
                  <line x1="180" y1="120" x2="420" y2="110" />
                </g>
              )}

              {activeLayer === "traffic" && (
                <g fill="#f59e0b" opacity="0.9">
                  <circle cx="130" cy="190" r="4.5" className="animate-pulse" />
                  <circle cx="150" cy="162" r="3.5" />
                  <circle cx="260" cy="210" r="5" />
                  <circle cx="370" cy="150" r="3.5" />
                  <line x1="200" y1="60" x2="180" y2="120" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="6 3" />
                  <line x1="180" y1="120" x2="340" y2="300" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" />
                </g>
              )}

              {activeLayer === "environmental" && (
                <g opacity="0.45" fill="none">
                  <circle cx="200" cy="60" r="35" fill="#ea580c" />
                  <circle cx="340" cy="300" r="28" fill="#f97316" />
                  <circle cx="80" cy="260" r="14" fill="#10b981" />
                </g>
              )}

              {activeLayer === "safety" && (
                <g opacity="0.4">
                  <circle cx="340" cy="300" r="22" fill="#ef4444" />
                  <circle cx="200" cy="60" r="16" fill="#f59e0b" />
                  <circle cx="80" cy="260" r="30" fill="#10b981" />
                </g>
              )}

              {activeLayer === "risk" && (
                <g opacity="0.8">
                  <rect x="315" y="275" width="50" height="50" rx="10" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" fill="none" />
                  <rect x="175" y="5" width="50" height="70" rx="10" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
                </g>
              )}

              {/* Node landmarks pins with real-time risk scores */}
              {dynamicWards.map((w) => {
                const isSelected = selectedPointId === w.id;
                
                let nodeColor = "fill-slate-600";
                if (activeLayer === "risk") {
                  nodeColor = w.calculatedRiskScore >= 70 ? "fill-red-600" : w.calculatedRiskScore >= 45 ? "fill-amber-500" : "fill-emerald-500";
                } else if (activeLayer === "infrastructure") {
                  nodeColor = parseFloat(w.simulatedTelemetry.lightsActive) < 60 ? "fill-red-500" : "fill-blue-600";
                } else if (activeLayer === "traffic") {
                  nodeColor = parseInt(w.simulatedTelemetry.trafficSpeed) < 15 ? "fill-red-600" : parseInt(w.simulatedTelemetry.trafficSpeed) < 30 ? "fill-amber-500" : "fill-emerald-500";
                } else if (activeLayer === "environmental") {
                  nodeColor = w.simulatedTelemetry.aqi > 200 ? "fill-orange-600" : w.simulatedTelemetry.aqi > 100 ? "fill-amber-400" : "fill-emerald-500";
                } else if (activeLayer === "safety") {
                  nodeColor = w.criticalHazards > 0 ? "fill-rose-500" : w.activeReports > 0 ? "fill-amber-500" : "fill-blue-500";
                }

                return (
                  <g 
                    key={w.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedPointId(w.id)}
                  >
                    {/* Ring highlight if selected */}
                    {isSelected && (
                      <circle 
                        cx={w.cx} 
                        cy={w.cy} 
                        r="13" 
                        fill="none" 
                        stroke="#2563eb" 
                        strokeWidth="2.5" 
                        className="animate-ping" 
                      />
                    )}
                    
                    {/* Core node dot */}
                    <circle 
                      cx={w.cx} 
                      cy={w.cy} 
                      r={isSelected ? "8.5" : "7"} 
                      className={`${nodeColor} stroke-white stroke-2 shadow-sm transition-all duration-200 group-hover:scale-125`}
                    />

                    {/* Report count badge on dot */}
                    {w.activeReports > 0 && (
                      <text
                        x={w.cx}
                        y={w.cy + 3}
                        textAnchor="middle"
                        className="text-[7px] font-mono font-bold fill-white select-none pointer-events-none"
                      >
                        {w.activeReports}
                      </text>
                    )}

                    {/* Miniature label for map placement */}
                    <text 
                      x={w.cx} 
                      y={w.cy - 12} 
                      textAnchor="middle" 
                      className="text-[8.5px] font-mono font-bold text-slate-850 bg-white/70 select-none"
                    >
                      {w.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>
        </div>

        {/* Console control panel deck (Col-4) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm text-left">
          
          {/* Layer switcher menu */}
          <div>
            <span className="text-[9px] font-mono font-extrabold text-blue-600 uppercase tracking-wider block">
              OPERATIONAL CONTROLS
            </span>
            <h4 className="text-sm font-bold text-slate-850 mt-0.5 font-display">
              Sub-Sovereign Layer Directory
            </h4>
            <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">
              Toggle specific sensor diagnostics mapped over Delhi NCR digital twin nodes.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {(Object.keys(layersInfo) as Array<keyof typeof layersInfo>).map((layerKey) => {
              const info = layersInfo[layerKey];
              const isLayerActive = activeLayer === layerKey;
              
              let LayerIcon = Layers;
              if (layerKey === "infrastructure") LayerIcon = Activity;
              else if (layerKey === "traffic") LayerIcon = Compass;
              else if (layerKey === "environmental") LayerIcon = Wind;
              else if (layerKey === "safety") LayerIcon = Eye;
              else if (layerKey === "risk") LayerIcon = AlertOctagon;

              return (
                <button
                  key={layerKey}
                  onClick={() => setActiveLayer(layerKey)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all duration-150 cursor-pointer ${
                    isLayerActive 
                      ? "bg-blue-50 text-blue-900 border-blue-500 font-bold shadow-2xs" 
                      : "bg-slate-50/50 border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayerIcon className={`w-4 h-4 shrink-0 ${isLayerActive ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="text-xs tracking-medium font-sans">{info.title.replace(" Layer", "")}</span>
                  </div>
                  <span className={`text-[8.5px] font-mono uppercase bg-white border px-1.5 py-0.5 rounded ${
                    isLayerActive ? "border-blue-300 text-blue-600 font-extrabold" : "border-slate-200 text-slate-400"
                  }`}>
                    {isLayerActive ? "ACTIVE" : "SELECT"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Node Inspect HUD Card with Real Data vs Telemetry Separation */}
          <div className="border-t border-slate-100 pt-3 mt-1">
            <span className="text-[9.5px] font-mono font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
              SECTOR NODE REAL-TIME INTELLIGENCE
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-850 block truncate max-w-[150px]">
                    {currentPointInfo.name}
                  </span>
                  <span className="text-[8.5px] font-mono text-slate-400">Node ID: #{currentPointInfo.id.toUpperCase()}</span>
                </div>
                <span className={`text-[9.5px] font-mono font-extrabold px-2 py-0.5 rounded ${
                  currentPointInfo.calculatedRiskScore >= 70 
                    ? "bg-red-100 text-red-800" 
                    : currentPointInfo.calculatedRiskScore >= 45 
                      ? "bg-amber-100 text-amber-800" 
                      : "bg-emerald-100 text-emerald-800"
                }`}>
                  {currentPointInfo.status}
                </span>
              </div>

              {/* REAL FIRESTORE REPORT METRICS */}
              <div className="space-y-1">
                <span className="text-[8.5px] font-mono font-bold text-blue-600 uppercase tracking-wider block">
                  REAL FIRESTORE INCIDENT METRICS
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Active</span>
                    <span className={`text-sm font-mono font-extrabold ${currentPointInfo.activeReports > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {currentPointInfo.activeReports}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Critical</span>
                    <span className="text-sm font-mono font-extrabold text-amber-600">
                      {currentPointInfo.criticalHazards}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Resolved</span>
                    <span className="text-sm font-mono font-extrabold text-emerald-600">
                      {currentPointInfo.resolvedReports}
                    </span>
                  </div>
                </div>
              </div>

              {/* SIMULATED TELEMETRY METRICS */}
              <div className="space-y-1 pt-1.5 border-t border-slate-200/60">
                <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  MUNICIPAL TELEMETRY SENSORS
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-left">
                  <div className="bg-white border border-slate-200/60 p-2 rounded-lg">
                    <span className="text-[8px] text-slate-400 uppercase block font-semibold">Streetlights</span>
                    <span className="text-xs font-mono font-bold text-blue-700">{currentPointInfo.simulatedTelemetry.lightsActive} Active</span>
                  </div>
                  <div className="bg-white border border-slate-200/60 p-2 rounded-lg">
                    <span className="text-[8px] text-slate-400 uppercase block font-semibold">Sensor AQI</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{currentPointInfo.simulatedTelemetry.aqi} AQI</span>
                  </div>
                </div>
              </div>

              {currentPointInfo.totalReports === 0 && (
                <div className="text-[9.5px] text-slate-500 leading-normal italic text-center p-1 bg-white/70 rounded border border-dashed border-slate-200">
                  No active complaints lodged for this sector yet. Live telemetry running on baseline standards.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
