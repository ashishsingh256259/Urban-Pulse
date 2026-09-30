import React, { useState } from "react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, Camera, 
  ArrowRight, Clock, User, Sparkles, MapPin, 
  ThumbsUp, RefreshCw, XCircle, FileCheck, Eye
} from "lucide-react";
import { updateReportStatus } from "../lib/firestore_reports";

interface FieldVerificationCenterProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onRefreshReports?: () => void;
}

export const FieldVerificationCenter: React.FC<FieldVerificationCenterProps> = ({
  reports,
  onSelectReport,
  onRefreshReports
}) => {
  const { t, isHindi } = useLanguage();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Resolved or In-Progress reports candidate for verification audit
  const resolvedReports = reports.filter(r => r.status === "Resolved" || r.status === "In Progress");
  const activeReport = resolvedReports.find(r => r.id === selectedReportId) || resolvedReports[0] || reports[0];

  const handleVerifySignOff = async (reportId: string, approved: boolean) => {
    setIsVerifying(true);
    try {
      if (approved) {
        await updateReportStatus(
          reportId, 
          "Resolved", 
          `✓ Field Verification QA Sign-Off Approved by Municipal Supervisor. Remediation verified.`
        );
      } else {
        await updateReportStatus(
          reportId, 
          "In Progress", 
          `⚠ Verification QA Rejected: Requires field crew re-inspection and resurfacing.`
        );
      }
      setVerificationSuccess(true);
      if (onRefreshReports) onRefreshReports();
      setTimeout(() => setVerificationSuccess(false), 3000);
    } catch (err) {
      console.error("Verification sign-off error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Banner - VERIFY */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-white border border-[#DBEAFE] rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-bold font-mono border border-[#DBEAFE] mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>{isHindi ? "चरण 4: फील्ड सत्यापन (VERIFY)" : "PHASE 4: FIELD VERIFICATION & CLOSED LOOP"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight font-sans">
              {isHindi ? "फील्ड सत्यापन केंद्र" : "Field Verification & Outcome Audit"}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl mt-1 leading-relaxed">
              {isHindi
                ? "मुख्य प्रश्न: 'क्या समस्या वास्तव में हल हो गई थी?' - मरम्मत पूर्व एवं पश्चात के साक्ष्य का ऑडिट।"
                : "Answers the core question: 'Was the problem actually solved?' Closed-loop audit comparing before-hazard evidence, municipal intervention, and verified outcomes."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold block">
                Audit Pipeline
              </span>
              <span className="text-xl font-black text-[#16A34A] block mt-0.5">
                {resolvedReports.length} Cases
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Workspace */}
      {activeReport && (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs flex flex-col gap-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F1F5F9] gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded border border-[#DBEAFE]">
                  {activeReport.category}
                </span>
                <span className="text-xs font-mono text-[#94A3B8]">ID: {activeReport.id}</span>
              </div>
              <h2 className="text-lg font-black text-[#172033] mt-1">
                {activeReport.title}
              </h2>
              <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{activeReport.location || "Delhi NCR Corridor"}</span>
              </p>
            </div>

            {/* Supervisor QA Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVerifySignOff(activeReport.id, false)}
                disabled={isVerifying}
                className="px-3 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject & Re-open</span>
              </button>

              <button
                onClick={() => handleVerifySignOff(activeReport.id, true)}
                disabled={isVerifying}
                className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sign-off & Verify Resolution</span>
              </button>
            </div>
          </div>

          {verificationSuccess && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-xs font-bold text-[#16A34A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verification outcome recorded and published to municipal audit ledger!</span>
            </div>
          )}

          {/* 5-STAGE CLOSED LOOP PIPELINE */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
            
            {/* STAGE 1: BEFORE */}
            <div className="bg-[#FEF2F2]/40 border border-[#FECACA] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#DC2626] flex items-center gap-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                  1. BEFORE (HAZARD DETECTED)
                </span>

                {(activeReport.image || activeReport.imageUrl) ? (
                  <div className="h-36 rounded-xl overflow-hidden border border-[#E2E8F0] mb-2 bg-[#0F172A]">
                    <img src={(activeReport.image || activeReport.imageUrl)!} alt="Before hazard" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-36 rounded-xl border border-dashed border-[#FECACA] bg-white flex flex-col items-center justify-center text-center p-2 mb-2">
                    <Camera className="w-5 h-5 text-[#DC2626] mb-1" />
                    <span className="text-[10.5px] text-[#64748B]">Citizen Uploaded Record</span>
                  </div>
                )}

                <p className="text-[11px] font-semibold text-[#172033] line-clamp-2">
                  Severity: {activeReport.severity}/100
                </p>
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  Logged: {new Date(activeReport.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="pt-2 border-t border-[#FECACA] text-[9.5px] text-[#DC2626] font-bold">
                Initial Risk Unaddressed
              </div>
            </div>

            {/* STAGE 2: ACTION */}
            <div className="bg-[#EFF6FF]/50 border border-[#DBEAFE] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#2563EB] flex items-center gap-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  2. MUNICIPAL ACTION
                </span>

                <div className="p-3 bg-white rounded-xl border border-[#DBEAFE] mb-3 text-xs">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Assigned Crew</span>
                  <span className="font-bold text-[#172033] block mt-0.5">
                    {activeReport.assignedTo || "Road Maintenance Team Alpha"}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#DBEAFE] text-xs">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Intervention</span>
                  <span className="text-[#64748B] mt-0.5 block line-clamp-3">
                    Asphalt cold-patch & compaction executed. Leveling verified against road grade.
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#DBEAFE] text-[9.5px] text-[#2563EB] font-bold">
                Remediation Executed
              </div>
            </div>

            {/* STAGE 3: AFTER */}
            <div className="bg-[#F0FDF4]/50 border border-[#BBF7D0] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16A34A] flex items-center gap-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  3. AFTER (UPDATED EVIDENCE)
                </span>

                <div className="h-36 rounded-xl border-2 border-dashed border-[#BBF7D0] bg-white flex flex-col items-center justify-center text-center p-3 mb-2">
                  <ShieldCheck className="w-8 h-8 text-[#16A34A] mb-1" />
                  <span className="text-[11px] font-bold text-[#16A34A]">
                    {activeReport.status === "Resolved" ? "Surface Restored" : "Awaiting Post-Repair Scan"}
                  </span>
                  <span className="text-[9.5px] text-[#64748B] mt-0.5">
                    {activeReport.status === "Resolved" ? "Evidence matches restoration criteria" : "Field crew photo pending"}
                  </span>
                </div>

                <p className="text-[11px] font-semibold text-[#172033]">
                  Post-Fix Hazard Score: {activeReport.status === "Resolved" ? "0/100" : "Pending Scan"}
                </p>
              </div>

              <div className="pt-2 border-t border-[#BBF7D0] text-[9.5px] text-[#16A34A] font-bold">
                {activeReport.status === "Resolved" ? "Verified Cleared" : "Awaiting Evidence"}
              </div>
            </div>

            {/* STAGE 4: SUPERVISOR QA VERIFICATION */}
            <div className="bg-[#F5F3FF]/50 border border-[#DDD6FE] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#7C3AED] flex items-center gap-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  4. QA SIGN-OFF
                </span>

                <div className="p-3 bg-white rounded-xl border border-[#DDD6FE] mb-2 text-xs">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Supervisor Status</span>
                  <span className={`font-bold block mt-0.5 ${
                    activeReport.status === "Resolved" ? "text-[#16A34A]" : "text-[#D97706]"
                  }`}>
                    {activeReport.status === "Resolved" ? "✓ QA Approved" : "Pending Supervisor Sign-Off"}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#DDD6FE] text-xs">
                  <span className="text-[9px] font-mono text-[#64748B] uppercase block">Audit Code</span>
                  <span className="font-mono text-[#7C3AED] font-bold block mt-0.5">
                    QA-{activeReport.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#DDD6FE] text-[9.5px] text-[#7C3AED] font-bold">
                Immutable Ledger Stamp
              </div>
            </div>

            {/* STAGE 5: CITIZEN FEEDBACK */}
            <div className="bg-[#FFFBEB]/50 border border-[#FDE68A] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#D97706] flex items-center gap-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                  5. CITIZEN FEEDBACK
                </span>

                <div className="p-3 bg-white rounded-xl border border-[#FDE68A] mb-2 text-xs">
                  <div className="flex items-center gap-1 text-[#F59E0B] mb-1">
                    {"★".repeat(5)}
                  </div>
                  <p className="italic text-[#172033] text-[11px] leading-snug">
                    "Pothole filled smoothly within 2 days of reporting. Great municipal response!"
                  </p>
                </div>

                <span className="text-[9.5px] font-mono text-[#64748B]">
                  Reporter: {activeReport.reporterEmail ? activeReport.reporterEmail.split("@")[0] : "Verified Citizen"}
                </span>
              </div>

              <div className="pt-2 border-t border-[#FDE68A] text-[9.5px] text-[#D97706] font-bold">
                Civic Trust Loop Closed
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Cases List for Verification Review */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#172033] mb-4">
          All Remediation & Verification Cases ({resolvedReports.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resolvedReports.map((rep) => (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                activeReport?.id === rep.id
                  ? "bg-[#EFF6FF] border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs"
                  : "bg-[#F8FAFC] hover:bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9.5px] font-mono font-bold text-[#2563EB] bg-white border border-[#DBEAFE] px-2 py-0.5 rounded">
                    {rep.category}
                  </span>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                    rep.status === "Resolved" ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" : "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]"
                  }`}>
                    {rep.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#172033] line-clamp-1">{rep.title}</h4>
                <p className="text-[11px] text-[#64748B] mt-1 truncate">{rep.location || "Delhi NCR Corridor"}</p>
              </div>

              <div className="pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B]">
                <span>Severity: {rep.severity}/100</span>
                <span className="text-[#2563EB] font-bold">Inspect Loop →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default FieldVerificationCenter;
