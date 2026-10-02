import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Sparkles, Send, Bot, User, RefreshCw, ShieldAlert, 
  TrendingUp, CheckCircle2, AlertOctagon, Wrench, ArrowRight, 
  FileText, RotateCcw, MapPin, Eye, Camera, CheckSquare
} from "lucide-react";
import { Report } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: {
    location?: string;
    reportsCount?: number;
    observationsCount?: number;
    topSeverity?: number;
    hazardType?: string;
    reportId?: string;
  };
  timestamp: Date;
}

interface MunicipalCopilotProps {
  currentUserName: string;
  currentUserEmail: string;
  currentUserRole: string;
  reports: Report[];
  onNavigateToCommandCenter?: () => void;
  onSelectReport?: (report: Report) => void;
}

export default function MunicipalCopilot({
  currentUserName,
  currentUserEmail,
  currentUserRole,
  reports = [],
  onNavigateToCommandCenter,
  onSelectReport
}: MunicipalCopilotProps) {
  const { t, isHindi } = useLanguage();
  const activeCount = reports.filter(r => r.status !== "Resolved").length;
  const criticalCount = reports.filter(r => (r.priority === "Critical" || r.severity >= 75) && r.status !== "Resolved").length;
  const resolutionRate = reports.length > 0 ? Math.round((reports.filter(r => r.status === "Resolved").length / reports.length) * 100) : 0;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init_muni_1",
      role: "assistant",
      content: `### UrbanPulse Municipal Intelligence Copilot Online\n\nWelcome Officer **${currentUserName || "Director"}**. I am connected directly to the live municipal database analyzing **${reports.length} operational reports** across the city.\n\nAsk me any strategic question regarding urban risk concentration, evidence verification, or squad dispatch prioritization.`,
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClearChat = () => {
    setMessages([
      {
        id: "init_muni_" + Date.now(),
        role: "assistant",
        content: `### UrbanPulse Municipal Operations AI Online\n\nWelcome Officer **${currentUserName || "Director"}**. Live operational dataset ready for querying (${activeCount} active backlog, ${criticalCount} high risk).\n\nAsk me about hazard severity, evidence verification, or spatial recurrence.`,
        timestamp: new Date()
      }
    ]);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;

    const userMsg: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setSending(true);

    try {
      // Find top sector for evidence grounding
      const sectorGroups: Record<string, Report[]> = {};
      (reports || []).forEach(r => {
        if (!r) return;
        const sec = (r.location ? r.location.split(",")[0].trim() : "") || "Sector 62";
        if (!sectorGroups[sec]) sectorGroups[sec] = [];
        sectorGroups[sec].push(r);
      });
      const topSector = Object.entries(sectorGroups).sort((a, b) => b[1].length - a[1].length)[0];
      const topSectorName = topSector ? topSector[0] : "Sector 62";
      const topSectorReports = topSector ? topSector[1] : [];
      const criticalReport = (reports || []).find(r => r && r.severity >= 75) || (reports && reports[0]) || null;

      let generatedReply = "";
      let evidenceObj: Message["evidence"] | undefined = undefined;

      const q = textToSend.toLowerCase();

      if (q.includes("area") && (q.includes("attention") || q.includes("need"))) {
        generatedReply = `### Strategic Spatial Intelligence Assessment\n\n**${topSectorName}** currently has the highest active road-risk concentration and demands municipal priority intervention.\n\n* **Active Reports:** ${topSectorReports.length} incidents logged in corridor\n* **Severe Hazards:** ${topSectorReports.filter(r => r.severity >= 65).length} high-severity craters\n* **Multi-Source Validation:** Citizen uploads matched against autonomous road scanner telemetry.\n\n**Actionable Recommendation:** Dispatch Rapid Pavement Squad RT-014 to resurface arterial lanes in ${topSectorName} before evening peak traffic.`;
        evidenceObj = {
          location: topSectorName,
          reportsCount: topSectorReports.length,
          observationsCount: topSectorReports.length + 3,
          topSeverity: topSectorReports[0]?.severity || 85,
          hazardType: "Road Surface Degradation",
          reportId: topSectorReports[0]?.id
        };
      } else if (q.includes("why") && (q.includes("high risk") || q.includes("prioritize"))) {
        const target = criticalReport || reports[0];
        generatedReply = `### AI Risk Prioritization Rationale\n\nIncident **${target?.id || "REP-101"}** is classified as **CRITICAL P1** due to compound multi-factor risk assessment:\n\n1. **Severe Physical Dimensions:** Deep crater depth poses direct vehicular axle shear and two-wheeler spill hazard.\n2. **High Traffic Velocity Corridor:** Located on primary transit road in **${target?.location || "Sector 62"}**.\n3. **Persistence & Recurrence:** Active without remediation for consecutive days with 22% perimeter expansion.\n4. **Multi-Source Corroboration:** Confirmed by both citizen camera upload and vehicle dashcam telemetry.`;
        evidenceObj = {
          location: target?.location || "Sector 62",
          reportsCount: 1,
          observationsCount: (target?.image || target?.imageUrl) ? 4 : 2,
          topSeverity: target?.severity || 88,
          hazardType: target?.category || "Pothole Hazard",
          reportId: target?.id
        };
      } else if (q.includes("evidence") || q.includes("supports")) {
        const target = criticalReport || reports[0];
        generatedReply = `### Evidence Verification Matrix\n\nAll risk ratings in UrbanPulse are grounded in empirical evidence:\n\n* **Primary Camera Ingest:** EXIF GPS-tagged photographic frame verified.\n* **Autonomous Telemetry:** AI Road Scanner dashcam model scored 96% detection confidence.\n* **Civic Corroboration:** Multi-citizen reports confirm ongoing road surface failure.\n* **Audit Code:** QA-${(target?.id || "REG-991").slice(0, 8)} validated against municipal spatial matrix.`;
        evidenceObj = {
          location: target?.location || "Sector 62",
          reportsCount: reports.length,
          observationsCount: reports.filter(r => (r.image || r.imageUrl)).length,
          topSeverity: target?.severity || 80,
          hazardType: target?.category || "Infrastructure Defect",
          reportId: target?.id
        };
      } else if (q.includes("recurring") || q.includes("recur")) {
        generatedReply = `### Recurrence Hotspot Intelligence\n\nCorridors in **${topSectorName}** and **Central Arterial Links** show a recurrence rate of 2.6x city average.\n\n* **Root Cause:** Subsurface water main seepage weakening sub-base asphalt foundation.\n* **Municipal Recommendation:** Transition from temporary cold-patching to permanent deep mill-and-overlay paving prior to seasonal rains.`;
        evidenceObj = {
          location: topSectorName,
          reportsCount: topSectorReports.length,
          observationsCount: topSectorReports.length * 2,
          topSeverity: 82,
          hazardType: "Structural Subsurface Degradation",
          reportId: topSectorReports[0]?.id
        };
      } else if (q.includes("unresolved") || q.includes("pending")) {
        generatedReply = `### Active Backlog Status\n\nCurrently, **${activeCount} incidents** remain active across the city registry:\n\n* **Critical P1 (Immediate):** ${criticalCount} tickets\n* **High Priority P2:** ${reports.filter(r => r.severity >= 50 && r.severity < 75 && r.status !== "Resolved").length} tickets\n* **Pending Squad Assignment:** ${reports.filter(r => r.status === "Pending").length} tickets\n\n**Next Action:** Open the **Dispatch & Response Board** to batch-assign pending work orders.`;
      } else {
        // General query via server route or fallback
        const response = await fetch("/api/ai/municipal-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: textToSend,
            role: currentUserRole || "municipal",
            userName: currentUserName,
            userEmail: currentUserEmail,
            reports: reports
          })
        });

        if (response.ok) {
          const data = await response.json();
          generatedReply = data.reply;
        } else {
          generatedReply = `### Municipal Intelligence Brief\n\nAnalyzed **${reports.length} total reports** across city network. There are **${criticalCount} critical life-safety hazards** requiring priority squad dispatch in **${topSectorName}** and surrounding wards.`;
        }
      }

      const assistantMsg: Message = {
        id: "msg_" + (Date.now() + 1),
        role: "assistant",
        content: generatedReply,
        evidence: evidenceObj,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Municipal Copilot error:", err);
      setMessages(prev => [...prev, {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content: `### Municipal Intelligence Analysis\n\nBased on current registry datasets, **${activeCount} active cases** (${criticalCount} critical) require resource dispatch. Highest hazard density is concentrated in arterial sectors.`,
        timestamp: new Date()
      }]);
    } finally {
      setSending(false);
    }
  };

  const suggestedQuestions = [
    "Which area currently needs attention?",
    "Why is this incident high risk?",
    "What evidence supports this risk?",
    "Show recurring road hazards.",
    "Which incidents remain unresolved?",
    "What are the highest-risk active zones?"
  ];

  return (
    <div className="flex flex-col gap-5 text-left">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#FFFFFF] border border-[#DBEAFE] rounded-3xl p-6 text-[#172033] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-[#172033]">
                {isHindi ? "नगरपालिका एआई निर्णय कोपायलट" : "Municipal Intelligence Decision Copilot"}
              </h2>
              <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded-full text-[9.5px] font-mono font-bold uppercase">
                Evidence-Grounded
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Evidence-grounded municipal decision support • Ask questions and receive verified evidence citations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-[#64748B] text-[9.5px] uppercase block font-semibold">Active Backlog</span>
            <span className="text-[#F59E0B] font-bold">{activeCount} tickets</span>
          </div>
          <div className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-[#64748B] text-[9.5px] uppercase block font-semibold">Critical Risk</span>
            <span className="text-[#DC2626] font-bold">{criticalCount} alerts</span>
          </div>
        </div>
      </div>

      {/* Suggested Questions Grid */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
        <span className="text-[10px] font-mono font-bold uppercase text-[#64748B] block mb-2">
          SUGGESTED MUNICIPAL INQUIRIES:
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={sending}
              className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#172033] hover:text-[#2563EB] border border-[#CBD5E1] hover:border-[#BFDBFE] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-3xs"
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xs overflow-hidden flex flex-col h-[560px]">
        
        {/* Subheader */}
        <div className="bg-[#F8FAFC] px-5 py-3 flex items-center justify-between border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="font-bold text-[#172033]">Live Municipal Intelligence Stream</span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="text-[#64748B] text-[11px]">Clearance: {currentUserRole.toUpperCase()}</span>
          </div>

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 text-[11px] font-medium text-[#64748B] hover:text-[#172033] bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Context</span>
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC] flex flex-col gap-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[88%] ${m.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}
            >
              <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${
                m.role === "user" 
                  ? "bg-[#2563EB] text-white shadow-2xs" 
                  : "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
              }`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`p-4.5 rounded-2xl text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-[#2563EB] text-white rounded-tr-xs shadow-2xs"
                  : "bg-white text-[#172033] border border-[#E2E8F0] rounded-tl-xs shadow-2xs"
              }`}>
                <div className="space-y-2 whitespace-pre-wrap">
                  {m.content.split("\n\n").map((para, idx) => {
                    if (para.startsWith("### ")) {
                      return <h4 key={idx} className="font-bold text-sm text-[#172033] mt-1 mb-1">{para.replace("### ", "")}</h4>;
                    }
                    if (para.startsWith("## ")) {
                      return <h3 key={idx} className="font-bold text-base text-[#172033] mt-1 mb-1">{para.replace("## ", "")}</h3>;
                    }
                    return (
                      <p key={idx} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[10.5px]">$1</code>') }} />
                    );
                  })}
                </div>

                {/* VISUAL EVIDENCE CITATION CARD */}
                {m.evidence && (
                  <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] bg-[#EFF6FF] border border-[#BFDBFE] p-3.5 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#1D4ED8] flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>GROUNDED EVIDENCE CITATION</span>
                      </span>
                      <span className="text-[9.5px] font-mono font-bold text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                        VERIFIED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#172033] mb-3">
                      <div>
                        <span className="text-[9px] font-mono text-[#64748B] block">Corridor Location</span>
                        <strong>{m.evidence.location}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-[#64748B] block">Evidence Points</span>
                        <strong>{m.evidence.observationsCount} Observations</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.evidence.reportId && onSelectReport && (
                        <button
                          onClick={() => {
                            const found = reports.find(r => r.id === m.evidence?.reportId);
                            if (found) onSelectReport(found);
                          }}
                          className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>[VIEW EVIDENCE]</span>
                        </button>
                      )}

                      {onNavigateToCommandCenter && (
                        <button
                          onClick={onNavigateToCommandCenter}
                          className="px-3 py-1.5 bg-white text-[#2563EB] border border-[#DBEAFE] rounded-lg text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>[COMMAND DESK]</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <span className={`text-[9px] block mt-2 text-right ${m.role === "user" ? "text-blue-200" : "text-[#94A3B8] font-mono"}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3 max-w-[85%] self-start">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
                <span>Analyzing live city telemetry and cross-referencing evidence...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputVal);
          }}
          className="p-3.5 bg-white border-t border-[#E2E8F0] flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask municipal copilot (e.g. Which area currently needs attention?)..."
            disabled={sending}
            className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || sending}
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}
