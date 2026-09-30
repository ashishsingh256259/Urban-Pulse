import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  MapPin, 
  Building2, 
  Sparkles,
  ArrowRight,
  BellRing
} from "lucide-react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";

export interface ResolutionTimelineInfo {
  timeframe: string;
  hours: number;
  targetDate: string;
  department: string;
  slaCode: string;
  urgencyLevel: "CRITICAL" | "HIGH" | "STANDARD";
}

export function getEstimatedResolutionTimeline(report: Partial<Report>): ResolutionTimelineInfo {
  const category = (report.category || report.issueType || "Pothole").toLowerCase();
  const severity = report.severity || (report.aiAnalysis?.severityScore ?? 50);
  const priority = (report.priority || report.riskLevel || "Medium").toLowerCase();

  const now = new Date();

  // 1. Critical Priority or Extreme Severity
  if (priority === "critical" || severity >= 80) {
    const target = new Date(now.getTime() + 18 * 60 * 60 * 1000);
    return {
      timeframe: "12 – 18 Hours",
      hours: 18,
      targetDate: formatTargetDate(target),
      department: "Rapid Response & Hazard Mitigation Unit",
      slaCode: "SLA-T1-EMERGENCY",
      urgencyLevel: "CRITICAL"
    };
  }

  // 2. Sanitation / Garbage Overflow
  if (category.includes("garbage") || category.includes("trash") || category.includes("sanitation") || category.includes("waste")) {
    const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      timeframe: "18 – 24 Hours",
      hours: 24,
      targetDate: formatTargetDate(target),
      department: "Municipal Sanitation & Waste Ward",
      slaCode: "SLA-T2-SANITATION",
      urgencyLevel: "HIGH"
    };
  }

  // 3. Electrical / Broken Streetlight
  if (category.includes("light") || category.includes("electrical") || category.includes("power")) {
    const target = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    return {
      timeframe: "24 – 36 Hours",
      hours: 36,
      targetDate: formatTargetDate(target),
      department: "City Electrical & Luminaire Division",
      slaCode: "SLA-T2-ELECTRICAL",
      urgencyLevel: "HIGH"
    };
  }

  // 4. Pothole / Road Obstruction / Asphalt Damage
  if (category.includes("pothole") || category.includes("road") || category.includes("obstruction") || category.includes("traffic")) {
    const target = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return {
      timeframe: "24 – 48 Hours",
      hours: 48,
      targetDate: formatTargetDate(target),
      department: "Public Works Department (Road Maintenance)",
      slaCode: "SLA-T3-CIVIC_WORKS",
      urgencyLevel: "STANDARD"
    };
  }

  // 5. General / Civic Default
  const target = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return {
    timeframe: "48 – 72 Hours",
    hours: 48,
    targetDate: formatTargetDate(target),
    department: "Municipal Civic Operations Grid",
    slaCode: "SLA-T3-GENERAL",
    urgencyLevel: "STANDARD"
  };
}

function formatTargetDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  };
  return date.toLocaleDateString("en-US", options);
}

interface CitizenSuccessToastProps {
  report: Report | null;
  onClose: () => void;
  onViewDetails?: (report: Report) => void;
  durationMs?: number;
}

export default function CitizenSuccessToast({
  report,
  onClose,
  onViewDetails,
  durationMs = 9000
}: CitizenSuccessToastProps) {
  const { t, isHindi } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(durationMs);
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  if (!report) return null;

  const timelineInfo = getEstimatedResolutionTimeline(report);
  const cleanRefId = report.id.startsWith("REP-") 
    ? report.id 
    : `REF-${report.id.substring(0, 8).toUpperCase()}`;

  // Translated department and timeframe
  const localizedTimeframe = isHindi 
    ? timelineInfo.timeframe.replace("Hours", "घंटे") 
    : timelineInfo.timeframe;

  const localizedDepartment = isHindi
    ? (timelineInfo.department.includes("Rapid Response")
        ? "त्वरित प्रतिक्रिया एवं आपदा शमन इकाई"
        : timelineInfo.department.includes("Sanitation")
        ? "नगर निगम स्वच्छता एवं अपशिष्ट वार्ड"
        : timelineInfo.department.includes("Electrical")
        ? "नगर विद्युत एवं प्रकाश व्यवस्था प्रभाग"
        : timelineInfo.department.includes("Public Works")
        ? "लोक निर्माण विभाग (सड़क रखरखाव)"
        : "नगर नागरिक संचालन ग्रिड")
    : timelineInfo.department;

  // Timer & Progress management with pause-on-hover
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalStep = 50;
    progressIntervalRef.current = setInterval(() => {
      remainingTimeRef.current -= intervalStep;
      const pct = Math.max(0, (remainingTimeRef.current / durationMs) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(progressIntervalRef.current);
        onClose();
      }
    }, intervalStep);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPaused, durationMs, onClose]);

  const handleCopyId = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(report.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div 
      id="citizen-submission-success-toast"
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-5 right-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[440px] max-w-lg bg-slate-900/98 backdrop-blur-xl border-2 border-emerald-500/70 shadow-2xl shadow-emerald-950/80 rounded-2xl overflow-hidden text-slate-100 animate-in slide-in-from-top-4 fade-in-0 duration-300 transition-all hover:border-emerald-400"
    >
      {/* Top Accent Gradient Bar with Animated Beacon */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 px-4 py-2 flex items-center justify-between text-white text-[11px] font-bold">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="uppercase tracking-wider font-extrabold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isHindi ? "रिपोर्ट सफलतापूर्वक दर्ज की गई" : "Report Successfully Logged"}
          </span>
        </div>
        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-950/60 rounded text-emerald-200 border border-emerald-400/40">
          {timelineInfo.slaCode}
        </span>
      </div>

      {/* Main Toast Content Body */}
      <div className="p-4 space-y-3">
        
        {/* Title & Close Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-white tracking-tight leading-snug line-clamp-1">
                {report.title || (isHindi ? "समस्या रिपोर्ट जमा की गई" : "Incident Report Submitted")}
              </h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[240px]">{report.location || (isHindi ? "दिल्ली एनसीआर ग्रिड" : "Delhi NCR Grid")}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            id="toast-dismiss-btn"
            onClick={onClose}
            aria-label={isHindi ? "सूचना बंद करें" : "Dismiss Notification"}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Unique Reference ID & Clipboard Copy Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {isHindi ? "संदर्भ संख्या:" : "Reference ID:"}
            </span>
            <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60 truncate">
              {cleanRefId}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            id="toast-copy-ref-id-btn"
            title={isHindi ? "ट्रैकिंग आईडी क्लिपबोर्ड में कॉपी करें" : "Copy reference tracking ID to clipboard"}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-slate-700 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">{isHindi ? "कॉपी हो गया!" : "Copied!"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>{isHindi ? "आईडी कॉपी करें" : "Copy ID"}</span>
              </>
            )}
          </button>
        </div>

        {/* Estimated Resolution Timeline SLA Banner */}
        <div className="p-2.5 bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-900/60 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>{isHindi ? "अनुमानित समाधान समय सीमा:" : "Estimated Resolution Timeline:"}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {localizedTimeframe}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10.5px] text-slate-300 pt-0.5">
            <div className="flex items-center gap-1 text-slate-400">
              <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate max-w-[220px]">{localizedDepartment}</span>
            </div>
            <div className="text-right text-[10px] font-mono text-emerald-400/90 font-semibold">
              {isHindi ? "अनुमानित तक:" : "Est. by"} {timelineInfo.targetDate}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-1 gap-2 text-xs">
          <span className="text-[10px] text-slate-500 italic">
            {isHindi 
              ? `${Math.ceil(remainingTimeRef.current / 1000)} सेकंड में स्वतः बंद` 
              : `Auto-closing in ${Math.ceil(remainingTimeRef.current / 1000)}s`}
          </span>

          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                type="button"
                id="toast-view-report-btn"
                onClick={() => {
                  onViewDetails(report);
                  onClose();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-950 active:scale-95"
              >
                <span>{isHindi ? "स्थिति ट्रैक करें" : "Track Status"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
            >
              {isHindi ? "हटाएं" : "Dismiss"}
            </button>
          </div>
        </div>

      </div>

      {/* Dynamic Auto-Dismiss Countdown Progress Line */}
      <div className="w-full bg-slate-950 h-1 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
