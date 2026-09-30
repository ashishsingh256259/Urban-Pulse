import React from "react";
import { AlertCircle, RefreshCw, MapPin, Cloudy, ShieldAlert, Cpu } from "lucide-react";

interface SovereignFallbackProps {
  title: string;
  description: string;
  onRetry?: () => void;
  iconType?: "reports" | "risks" | "forecast" | "map";
}

export default function SovereignErrorFallback({
  title,
  description,
  onRetry,
  iconType = "reports"
}: SovereignFallbackProps) {
  // Select icon helper
  const getIcon = () => {
    switch (iconType) {
      case "risks":
        return <ShieldAlert className="w-10 h-10 text-amber-500 animate-pulse bg-amber-50 p-2 rounded-xl border border-amber-250 shrink-0" />;
      case "forecast":
        return <Cloudy className="w-10 h-10 text-slate-500 bg-slate-100 p-2 rounded-xl border border-slate-200 shrink-0" />;
      case "map":
        return <MapPin className="w-10 h-10 text-blue-500 animate-bounce bg-blue-50 p-2 rounded-xl border border-blue-200 shrink-0" />;
      default:
        return <AlertCircle className="w-10 h-10 text-rose-500 bg-rose-50 p-2 rounded-xl border border-rose-200 shrink-0" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center max-w-sm mx-auto shadow-2xs font-sans">
      <div className="mb-4">
        {getIcon()}
      </div>

      <div className="space-y-1.5">
        <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase font-display">
          {title}
        </h4>
        <p className="text-[11.5px] text-slate-500 leading-normal max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          id="retry-fallback-btn"
          className="mt-5 px-4 py-1.5 border border-slate-205 text-[11px] font-bold text-slate-755 hover:bg-slate-50 rounded-lg shadow-3xs flex items-center gap-1.5 transition cursor-pointer font-mono"
        >
          <RefreshCw className="w-3 h-3 text-slate-500 shrink-0" />
          <span>RETRY OPERATION</span>
        </button>
      )}

      {/* Decorative diagnostic footer for enterprise trust */}
      <div className="mt-5.5 pt-3.5 border-t border-slate-100 w-full flex items-center justify-center gap-1.5">
        <Cpu className="w-3 h-3 text-slate-400" />
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
          SYSTEM STATUS: FAULT-TOLERANT ACTIVE
        </span>
      </div>
    </div>
  );
}
