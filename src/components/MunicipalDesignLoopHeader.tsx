import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { 
  Radio, Eye, AlertOctagon, Wrench, CheckCircle2, 
  TrendingUp, Sparkles, ArrowRight, ShieldAlert 
} from "lucide-react";

interface MunicipalDesignLoopHeaderProps {
  activeTab: string;
  onSelectTab?: (tab: string) => void;
}

export const MunicipalDesignLoopHeader: React.FC<MunicipalDesignLoopHeaderProps> = ({ 
  activeTab,
  onSelectTab 
}) => {
  const { t, isHindi } = useLanguage();

  const stages = [
    {
      id: "citizen-signals",
      name: isHindi ? "नागरिक सिग्नल" : "CITIZEN SIGNAL",
      sub: isHindi ? "सहानुभूति (Empathize)" : "Empathize",
      icon: Radio,
      activeTabs: ["citizen-signals"]
    },
    {
      id: "road-scanner",
      name: isHindi ? "एआई पहचान" : "AI DETECTION",
      sub: isHindi ? "डैशकैम विजन" : "Vision AI",
      icon: Eye,
      activeTabs: ["road-scanner"]
    },
    {
      id: "incident-intelligence",
      name: isHindi ? "घटना विश्लेषण" : "UNDERSTANDING",
      sub: isHindi ? "साक्ष्य संश्लेषण" : "Evidence Fusion",
      icon: Sparkles,
      activeTabs: ["incident-intelligence", "copilot", "municipal-copilot"]
    },
    {
      id: "command-center",
      name: isHindi ? "जोखिम प्राथमिकता" : "PRIORITIZATION",
      sub: isHindi ? "स्थिति कक्ष" : "Situation Room",
      icon: AlertOctagon,
      activeTabs: ["command-center", "municipal-home", "urban-risk-map", "safety"]
    },
    {
      id: "dispatch-management",
      name: isHindi ? "नगरपालिका कार्रवाई" : "MUNICIPAL ACTION",
      sub: isHindi ? "फ्लीट डिस्पैच" : "Dispatch & Act",
      icon: Wrench,
      activeTabs: ["dispatch-management", "dispatch-response"]
    },
    {
      id: "field-verification",
      name: isHindi ? "फील्ड सत्यापन" : "VERIFICATION",
      sub: isHindi ? "समाधान प्रमाण" : "Closed Loop Proof",
      icon: CheckCircle2,
      activeTabs: ["field-verification"]
    },
    {
      id: "analytics",
      name: isHindi ? "निरंतर सुधार" : "LEARN & IMPROVE",
      sub: isHindi ? "शहर अंतर्दृष्टि" : "City Insights",
      icon: TrendingUp,
      activeTabs: ["analytics", "city-insights"]
    }
  ];

  return (
    <div className="w-full bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-4 shadow-2xs mb-6 text-left">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#2563EB]">
                {isHindi ? "डिज़ाइन थिंकिंग ऑपरेटिंग मॉडल" : "DESIGN THINKING OPERATING MODEL"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            </div>
            <p className="text-xs font-bold text-[#172033] leading-tight mt-0.5">
              {isHindi
                ? "पहचान से प्राथमिकता और सत्यापित समाधान तक का संपूर्ण सफ़र"
                : "Detection → Prioritization → Action → Verified Outcomes"}
            </p>
          </div>
        </div>

        <div className="text-[11px] font-medium text-[#64748B] italic bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
          "{isHindi 
            ? "सिर्फ पहचान काफी नहीं है; असली मूल्य पहचान को प्राथमिक कार्रवाई और सत्यापित परिणामों में बदलने में है।" 
            : "Detection alone is not enough. The real value comes from converting detection into prioritized action and verified outcomes."}"
        </div>
      </div>

      {/* Responsive Lifecycle Track */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isCurrent = stage.activeTabs.includes(activeTab);

          return (
            <button
              key={stage.id}
              onClick={() => onSelectTab && onSelectTab(stage.id)}
              className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border cursor-pointer group ${
                isCurrent 
                  ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] shadow-2xs" 
                  : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isCurrent 
                  ? "bg-[#2563EB] text-white" 
                  : "bg-white text-[#64748B] border border-[#E2E8F0] group-hover:text-[#2563EB]"
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[10px] font-extrabold truncate ${
                  isCurrent ? "text-[#1D4ED8]" : "text-[#172033]"
                }`}>
                  {stage.name}
                </div>
                <div className="text-[8.5px] font-mono text-[#94A3B8] truncate leading-tight">
                  {stage.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MunicipalDesignLoopHeader;
