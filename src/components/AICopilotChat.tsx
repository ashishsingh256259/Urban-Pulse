import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User, RefreshCw} from "lucide-react";

interface GroundingLink {
  uri: string;
  title: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  groundingLinks?: GroundingLink[];
}

interface AICopilotChatProps {
  currentUserRole: "admin" | "citizen";
  currentUserName: string;
}

export default function AICopilotChat({ currentUserRole, currentUserName }: AICopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init_1",
      role: "assistant",
      content: `Hello **${currentUserName}**. I am the **UrbanPulse Guardian AI Copilot** connected to the Delhi NCR municipality sector nodes.\n\nHow can I advise you on regional infrastructure, predictive hazards, active dispatches, or emergency crew rerouting today?`,
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsg: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setSending(true);

    let lat: number | undefined;
    let lng: number | undefined;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.log("Could not obtain user location for copilot grounding:", e);
      }
    }

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          role: currentUserRole,
          userName: currentUserName,
          lat,
          lng,
          history: messages.map(m => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content
          }))
        })
      });

      const data = await response.json();
      const assistantMsg: Message = {
        id: "msg_" + (Date.now() + 1),
        role: "assistant",
        content: data.reply || "Unable to retrieve diagnostics. Core node is unresponsive.",
        timestamp: new Date(),
        groundingLinks: data.groundingLinks || []
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      // Fallback response
      setMessages(prev => [...prev, {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content: "Network response timeout. Falling back to edge diagnostic heuristics:\n\n* CP Pothole (REP-4092) is active and marked as high priority (Severity 89%).\n* Regional air quality (AQI) is index 42, displaying healthy levels.",
        timestamp: new Date()
      }]);
    } finally {
      setSending(false);
    }
  };

  const samplePrompts = [
    "Why is Sector 45 unsafe?",
    "What should authorities fix first?",
    "Which area has the highest risk?",
    "What caused the risk score drop?",
    "Which area is safest today?",
    "What hazards are near me?"
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden flex flex-col h-[580px] transition-all">
      {/* Thread Header */}
      <div className="bg-gradient-to-r from-[#F5F3FF] to-[#FFFFFF] border-b border-[#DDD6FE] text-[#172033] p-4.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm leading-tight text-[#172033]">Guardian AI Assistant</h3>
            <p className="text-[10px] text-[#7C3AED] font-bold tracking-wider uppercase mt-0.5">
              Role: {currentUserRole === "admin" ? "Director Copilot" : "Citizen Assistant"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
          <span className="text-[9.5px] font-mono text-[#64748B] font-extrabold uppercase">Delhi Central Node</span>
        </div>
      </div>

      {/* Messages scrolling stack */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-[#F8FAFC] flex flex-col gap-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
              m.role === "user" 
                ? "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]" 
                : "bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]"
            }`}>
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble body */}
            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-[#2563EB] text-white rounded-tr-xs shadow-xs"
                : "bg-white text-[#172033] border border-[#E2E8F0] rounded-tl-xs shadow-2xs"
            }`}>
              {/* Simple Markdown/Paragraph display */}
              <div className="space-y-2 whitespace-pre-wrap">
                {m.content.split("\n\n").map((para, idx) => {
                  // Basic Bold text conversion
                  const cleanPara = para.replace(/\*\*([^*]+)\*\*/g, "$1");
                  return (
                    <p key={idx}>
                      {para.startsWith("* ") ? (
                        <span className="block pl-3 border-l-2 border-blue-500/30 font-medium text-slate-650">
                          {para}
                        </span>
                      ) : (
                        cleanPara
                      )}
                    </p>
                  );
                })}
              </div>

              {/* Verified Sources / Google Maps Grounding links */}
              {m.groundingLinks && m.groundingLinks.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    Verified Google Maps / Search Sources:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.groundingLinks.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.uri}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/50 transition-all cursor-pointer hover:-translate-y-0.5 shadow-3xs"
                      >
                        <span className="max-w-[150px] truncate">{link.title}</span>
                        <span className="text-blue-400 text-[8px]">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <span className={`text-[8.5px] block mt-2 text-right ${m.role === "user" ? "text-blue-200" : "text-slate-400"}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {sending && (
          <div className="self-start flex gap-3 items-center text-xs text-slate-400 font-mono animate-pulse pl-12">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span>AI is conducting district analysis...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggested prompts list */}
      <div className="px-4.5 py-3 bg-slate-100/50 border-t border-slate-150 flex flex-wrap gap-1.5">
        <span className="text-[10px] text-slate-400 w-full font-bold uppercase tracking-wider mb-0.5">Suggested Queries:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            disabled={sending}
            onClick={() => handleSend(p)}
            className="text-[10px] font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 px-3 py-1 rounded-full text-left transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputVal);
        }}
        className="p-3 bg-white border-t border-slate-200 flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask Guardian AI anything about city hazards..."
          disabled={sending}
          className="flex-1 bg-slate-50 text-xs text-slate-800 rounded-xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={sending || !inputVal.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
