import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { Report, UserRole } from "../types";
import { downloadReportPDF, downloadReportCSV } from "../utils/reportExport";

interface ReportExportButtonProps {
  report: Report | null;
  userRole?: UserRole;
  isAdmin?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}

export default function ReportExportButton({
  report,
  userRole,
  isAdmin = false,
  className = "",
  variant = "outline"
}: ReportExportButtonProps) {
  // Permission Guard: Enabled ONLY for Admin and Municipal roles
  const isAuthorized = isAdmin || userRole === "admin" || userRole === "municipal";

  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "csv" | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isAuthorized || !report) {
    return null; // Citizen and non-authorized roles will not see administrative export control
  }

  const handleDownloadPDF = async () => {
    setIsOpen(false);
    setIsExporting("pdf");
    try {
      await downloadReportPDF(report);
      setToast({
        type: "success",
        message: `Report PDF (#${report.id}) downloaded successfully.`
      });
    } catch (err) {
      console.error("Failed to generate report PDF:", err);
      setToast({
        type: "error",
        message: "Failed to generate PDF. Please try again."
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadCSV = () => {
    setIsOpen(false);
    setIsExporting("csv");
    try {
      downloadReportCSV(report);
      setToast({
        type: "success",
        message: `Report CSV (#${report.id}) downloaded successfully.`
      });
    } catch (err) {
      console.error("Failed to generate report CSV:", err);
      setToast({
        type: "error",
        message: "Failed to export CSV. Please try again."
      });
    } finally {
      setIsExporting(null);
    }
  };

  const buttonStyle = variant === "primary"
    ? "bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900"
    : variant === "secondary"
    ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-3xs"
    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-3xs";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      {/* Download Action Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting !== null}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-hidden disabled:opacity-60 ${buttonStyle}`}
        title="Download Report Dossier (PDF or CSV)"
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>{isExporting ? "Generating..." : "Download Report"}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200 py-1 z-[1300] animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Export Dossier #{(report.id || "").slice(0, 8)}
            </p>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <div className="flex flex-col">
                <span>Download PDF</span>
                <span className="text-[9.5px] font-normal text-slate-400">Formal Dossier & Audit Log</span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex flex-col">
                <span>Download CSV</span>
                <span className="text-[9.5px] font-normal text-slate-400">Structured Data Export</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Floating Success / Error Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[2000] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium animate-in slide-in-from-bottom-3 duration-200 max-w-sm ${
          toast.type === "success" 
            ? "bg-slate-900 text-white border-slate-800" 
            : "bg-red-900 text-white border-red-800"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
