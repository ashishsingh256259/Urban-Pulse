import React from 'react';
import { 
  Camera, Navigation, AlertTriangle, 
  MapPin, PenLine, Shield
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Report } from '../types';

interface CitizenHomeProps {
  onNavigate: (tab: string) => void;
  reportsCount: number;
  userName: string;
  reports?: Report[];
  onSelectReport?: (report: Report) => void;
}

export default function CitizenHome({ 
  onNavigate, 
  reportsCount, 
  userName,
  reports = [],
  onSelectReport 
}: CitizenHomeProps) {
  const { t, isHindi } = useLanguage();

  // Pick 3 recent public reports to display as evidence of active civic resolutions
  const recentCommunityReports = (reports || [])
    .filter(r => Boolean(r && r.title && r.status))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-4 text-left animate-in fade-in duration-200">
      
      {/* 1. UPGRADED CITIZEN HERO BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-3.5 sm:p-4.5 text-white relative overflow-hidden border border-blue-900/60 shadow-md">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 items-center relative z-10">
          
          {/* LEFT COLUMN: Headline, Subtext, Process Label, Visual Flow */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Badge & Compact Pipeline Bar */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[9.5px] sm:text-[10.5px] font-bold font-mono border border-blue-400/30">
                  <Shield className="w-2.5 h-2.5 text-blue-400" />
                  <span>CIVIC SAFETY & REPAIR PLATFORM</span>
                </div>
                <div className="inline-block px-2 py-0.5 bg-slate-800/90 text-blue-300 rounded-full text-[9px] sm:text-[10px] font-mono font-bold border border-slate-700">
                  DETECT → ANALYZE → PRIORITIZE → ACT → VERIFY
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-white font-sans leading-tight">
                {isHindi ? "सड़क समस्या से त्वरित समाधान तक" : "From Road Problem to Rapid Resolution"}
              </h1>

              {/* Subtext */}
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-1 leading-snug max-w-xl">
                {isHindi 
                  ? "एआई शहरी सड़क समस्याओं का पता लगाता है, उनकी गंभीरता को समझता है, जोखिम को प्राथमिकता देता है, और नागरिकों को सीधे नगर पालिका टीमों से जोड़ता है।" 
                  : "AI detects urban road issues, understands their severity, prioritizes risk, and connects citizens directly with municipal response teams."}
              </p>
            </div>

            {/* Visual Flow (6-step pipeline) */}
            <div className="mt-2.5 pt-2 border-t border-slate-700/60">
              <div className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {isHindi ? "समाधान चक्र" : "Rapid Resolution Pipeline"}
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-slate-200 shadow-xs">
                  <span className="text-[11px]">📷</span>
                  <span className="font-semibold">{isHindi ? "नागरिक रिपोर्ट" : "Citizen Report"}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">→</span>
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-blue-300 shadow-xs">
                  <span className="text-[11px]">🤖</span>
                  <span className="font-semibold">{isHindi ? "एआई पहचान" : "AI Detection"}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">→</span>
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-amber-300 shadow-xs">
                  <span className="text-[11px]">⚠️</span>
                  <span className="font-semibold">{isHindi ? "जोखिम आकलन" : "Risk Assessment"}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">→</span>
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-purple-300 shadow-xs">
                  <span className="text-[11px]">🏛️</span>
                  <span className="font-semibold">{isHindi ? "नगर पालिका" : "Municipal Action"}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">→</span>
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 flex items-center gap-1 text-cyan-300 shadow-xs">
                  <span className="text-[11px]">👷</span>
                  <span className="font-semibold">{isHindi ? "फील्ड रिस्पॉन्स" : "Field Response"}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">→</span>
                <div className="bg-slate-800/90 border border-emerald-500/40 rounded-lg px-2 py-1 flex items-center gap-1 text-emerald-300 font-bold shadow-xs">
                  <span className="text-[11px]">✅</span>
                  <span>{isHindi ? "सत्यापित समाधान" : "Verified Resolution"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Compact AI Incident Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-800/95 border border-blue-500/40 rounded-xl p-2.5 sm:p-3 shadow-md relative backdrop-blur-xs">
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700/80">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider text-red-400 uppercase">
                    AI ALERT
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
                  TELEMETRY PREVIEW
                </span>
              </div>

              <h4 className="text-[11px] font-black text-white tracking-tight mb-1.5 flex items-center justify-between">
                <span>High-Risk Road Issue Detected</span>
                <span className="text-[9.5px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  87/100
                </span>
              </h4>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-900/70 p-2 rounded-lg border border-slate-700/60 mb-1.5">
                <div>
                  <span className="text-[8.5px] font-mono text-slate-400 block uppercase">{isHindi ? "समस्या:" : "Issue:"}</span>
                  <span className="font-bold text-white">Pothole</span>
                </div>
                <div>
                  <span className="text-[8.5px] font-mono text-slate-400 block uppercase">{isHindi ? "स्थान:" : "Location:"}</span>
                  <span className="font-bold text-white">Sector 62</span>
                </div>
                <div>
                  <span className="text-[8.5px] font-mono text-slate-400 block uppercase">{isHindi ? "जोखिम स्कोर:" : "Risk Score:"}</span>
                  <span className="font-bold text-red-400 font-mono">87/100</span>
                </div>
                <div>
                  <span className="text-[8.5px] font-mono text-slate-400 block uppercase">{isHindi ? "कार्रवाई:" : "Action:"}</span>
                  <span className="font-bold text-blue-300">Field Inspection Required</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Direct Municipal Dispatch Connected
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. PRIMARY USER ACTIONS (The 4 Prioritized Citizen Services) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {t("citizen.quickActions", "Quick Actions")}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isHindi ? "तुरंत शुरू करने के लिए कोई भी सेवा चुनें" : "Select an action to get started immediately"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* ACTION 1: REPORT ISSUE (PRIMARY HERO ACTION) */}
          <div 
            onClick={() => onNavigate('infrastructure')}
            className="bg-white border-2 border-blue-600 rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
              {isHindi ? "मुख्य सेवा" : "PRIMARY"}
            </div>

            <div>
              <div className="w-9 h-9 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <PenLine className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-0.5 group-hover:text-blue-600 transition-colors">
                {t("citizen.reportIssue", "Report Issue")}
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                {t("citizen.reportIssueSub", "Report potholes, garbage, lighting and other urban issues.")}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button 
                type="button"
                className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-2xs group-hover:translate-x-0.5 cursor-pointer"
              >
                <span>{t("citizen.reportIssueBtn", "Start a Report →")}</span>
              </button>
              <span className="text-[10px] text-slate-400 block text-center mt-1">
                {isHindi ? "लगभग 30 सेकंड का समय लगता है" : "Takes ~30 seconds · Photo & GPS"}
              </span>
            </div>
          </div>

          {/* ACTION 2: AI ROAD SCANNER */}
          <div 
            onClick={() => onNavigate('road-scanner')}
            className="bg-white border border-slate-200 hover:border-purple-500 rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-9 h-9 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Camera className="w-4.5 h-4.5 text-purple-600" />
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-0.5 group-hover:text-purple-600 transition-colors">
                {t("citizen.aiRoadScanner", "AI Road Scanner")}
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                {t("citizen.aiRoadScannerSub", "Scan road surfaces using your camera to identify craters and hazards.")}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button 
                type="button"
                className="w-full py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{isHindi ? "स्कैनर खोलें →" : "Launch Scanner →"}</span>
              </button>
              <span className="text-[10px] text-purple-600 block text-center mt-1 font-medium">
                {isHindi ? "मोबाइल कैमरा आधारित स्वचालित पहचान" : "Dashcam / mobile camera AI"}
              </span>
            </div>
          </div>

          {/* ACTION 3: SAFE ROUTE */}
          <div 
            onClick={() => onNavigate('safe-route')}
            className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Navigation className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-0.5 group-hover:text-emerald-600 transition-colors">
                {t("citizen.safeRoute", "Safe Route")}
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                {t("citizen.safeRouteSub", "Find travel routes with lower reported road hazard exposure.")}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button 
                type="button"
                className="w-full py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{isHindi ? "सुरक्षित मार्ग खोजें →" : "Find Safe Route →"}</span>
              </button>
              <span className="text-[10px] text-emerald-600 block text-center mt-1 font-medium">
                {isHindi ? "गड्ढों व खतरों से सुरक्षित नेविगेशन" : "Hazard-free path planning"}
              </span>
            </div>
          </div>

          {/* ACTION 4: EMERGENCY SOS */}
          <div 
            onClick={() => onNavigate('emergency-sos')}
            className="bg-white border border-red-200 hover:border-red-600 rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-9 h-9 bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-0.5 group-hover:text-red-600 transition-colors">
                {t("citizen.emergencySos", "Emergency SOS")}
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                {t("citizen.emergencySosSub", "Send an urgent emergency report with your location.")}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button 
                type="button"
                className="w-full py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{t("citizen.emergencySosBtn", "Request Help →")}</span>
              </button>
              <span className="text-[10px] text-red-600 block text-center mt-1 font-medium">
                {isHindi ? "सड़क धंसने या तत्काल खतरे हेतु" : "For critical collapsed infrastructure"}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. RECENT COMMUNITY RESOLUTIONS ("CITY PROGRESS") */}
      {recentCommunityReports.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-100 gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  {isHindi ? "शहर में हाल की समस्याएं एवं प्रगति" : "Recent Community Reports & Repair Progress"}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isHindi 
                  ? "देखें कि नागरिक रिपोर्टों पर नगर पालिका किस तरह काम कर रही है" 
                  : "See how municipal teams are acting on issues reported across Delhi NCR"}
              </p>
            </div>
            <button
              onClick={() => onNavigate('safe-route')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>{isHindi ? "पूरा शहर देखें →" : "Explore City Map →"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentCommunityReports.map((item) => {
              const isResolved = item.status === "Resolved";
              const isInProgress = item.status === "In Progress" || item.status === "Assigned";

              return (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (onSelectReport) onSelectReport(item);
                    onNavigate('my-reports');
                  }}
                  className="p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 rounded-xl transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9.5px] font-mono font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.category}
                      </span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                        isResolved ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        isInProgress ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isResolved ? (isHindi ? "समाधान सत्यापित" : "Verified Resolved") :
                         isInProgress ? (isHindi ? "मरम्मत प्रगति पर" : "Crew Dispatched") :
                         (isHindi ? "समीक्षा में" : "Under Review")}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.location || (isHindi ? "दिल्ली एनसीआर कॉरिडोर" : "Delhi NCR Corridor")}</span>
                    </p>
                  </div>

                  <div className="pt-2 mt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className="text-blue-600 font-bold group-hover:underline">{isHindi ? "विवरण देखें →" : "Details →"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
