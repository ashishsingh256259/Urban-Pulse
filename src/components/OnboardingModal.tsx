import React, { useState } from "react";
import { X, ShieldCheck, ChevronRight, ChevronLeft, Lightbulb, MapPin, Sparkles, Building2, Eye } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Sovereign Smart-City Intelligence",
      subtitle: "Enterprise Municipal Guard Framework",
      icon: ShieldCheck,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-650 leading-relaxed font-sans">
            Welcome to <strong>UrbanPulse Guardian AI</strong>, the central supervisory intelligence hub engineered for municipal corporations, smart city directors, and civilian response partners.
          </p>
          <div className="bg-slate-50 border border-slate-205/60 p-3 rounded-xl space-y-2">
            <h5 className="text-[11.5px] font-black uppercase text-slate-700 font-mono tracking-wider">CORE MISSION</h5>
            <p className="text-[11px] text-slate-600 leading-normal">
              To dynamically ingest civilian issue markers, generate instant neural severity classifications, and optimize field dispatch routing to protect urban infrastructure longevity in real-time.
            </p>
          </div>
          <p className="text-[10px] text-gray-400 italic font-medium">
            *Currently operational in multi-city test environments: New Delhi (NCR), Mumbai (MMR), and Bengaluru (BBMP).
          </p>
        </div>
      )
    },
    {
      title: "1. Decentralized Reporting",
      subtitle: "How Incident Intake Cascades",
      icon: MapPin,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-650 leading-relaxed font-sans">
            Citizen observers and municipal patrollers act as real-time sensing grids. Log occurrences representing potholes, power grid hazards, streetlights, or general blockages instantly.
          </p>
          <div className="grid grid-cols-2 gap-2.5 text-left text-[11px] font-sans">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-800 block text-xs">Geo-coordinate Lock</strong>
              Saves high-resolution GPS coordinates. centers on regional interactive heatmaps instantly.
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-800 block text-xs">Photo Evidence Lock</strong>
              Appends image buffers securely to the smart city ledger queue to prove hazard existence.
            </div>
          </div>
        </div>
      )
    },
    {
      title: "2. The AI Risk Engine Score",
      subtitle: "Mathematical Threat Grading",
      icon: Sparkles,
      color: "text-violet-600 bg-violet-50 border-violet-100",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-650 leading-relaxed font-sans">
            Every ticket goes through real-time server-side Gemini neural categorization, evaluating priority scores from 0 to 100 based on complex demographic risks:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 bg-red-650 rounded-full animate-pulseAndFlow shrink-0" />
              <span><strong>Critical Priority (≥75%):</strong> Severe hazard blocking major commercial arteries. Immediate dispatch.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
              <span><strong>Medium Priority (45% - 74%):</strong> Secondary blockages inside dense neighborhoods.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
              <span><strong>Low Priority (&lt;45%):</strong> Standard aesthetic repairs or low-density anomalies.</span>
            </div>
          </div>
          <p className="text-[10px] text-indigo-505 font-mono bg-indigo-50 border border-indigo-100 p-2 rounded text-indigo-900">
            <strong>AI Transparency Indicator:</strong> Every assessment includes AI confidence percentages, underlying prediction reasoning, and data sources for municipal audits.
          </p>
        </div>
      )
    },
    {
      title: "3. Municipal Mobilization",
      subtitle: "Closed-Loop SLA Resolution",
      icon: Building2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-650 leading-relaxed font-sans">
            Once reported, municipal directors monitor incoming incidents on the administrative command desk, assign trained dispatch crews, override priority attributes, and sign off on completion.
          </p>
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-1 text-xs">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5 font-mono text-[10.5px]">
              <span>✓ RIGOROUS AUDIT TRAILS</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-normal">
              Every transition (Reported → AI Diagnosed → Officer Assigned → Corrected) creates an unalterable activity timeline log for complete public accountability.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onClose}
              id="onboard-finish-cta"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wide"
            >
              Initialize Command Node & Explore App
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[1300] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Head branding */}
        <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-650 rounded flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white" />
            </div>
            <span className="text-[10.5px] font-mono font-black text-slate-800 tracking-wider">
              SYSTEM ONBOARDING BRIEFING
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Dynamic Card Display */}
        <div className="p-6 pb-4 flex-1">
          {(() => {
            const current = steps[activeStep];
            const Icon = current.icon;
            return (
              <div className="text-left space-y-4">
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-2xl border ${current.color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight font-display pr-5">
                      {current.title}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono tracking-wide font-extrabold uppercase">
                      {current.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 min-h-[220px]">
                  {current.content}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Segment progress indicators */}
        <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeStep === idx ? "w-6 bg-blue-600" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(prev => prev - 1)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-650 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(prev => prev + 1)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                Continue <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-xs font-bold uppercase cursor-pointer shadow-sm"
              >
                Acknowledge & Close
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
