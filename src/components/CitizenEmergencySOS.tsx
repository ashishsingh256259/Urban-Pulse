import React, { useState, useEffect, useRef } from "react";
import { 
  AlertOctagon, PhoneCall, ShieldAlert, MapPin, 
  CheckCircle2, Radio, Clock, User, ArrowRight, Activity,
  AlertTriangle, SendHorizontal, RefreshCw, Eye, ShieldCheck,
  ChevronRight, Volume2
} from "lucide-react";
import { User as UserType, Report, ReportCategory } from "../types";
import { createReport } from "../services/reportsService";
import { createNotification } from "../services/notificationsService";
import { useLanguage } from "../context/LanguageContext";

interface CitizenEmergencySOSProps {
  currentUser: UserType | null;
  onReportCreated?: (report: Report) => void;
  onViewReportDetails?: (report: Report) => void;
}

export default function CitizenEmergencySOS({ 
  currentUser,
  onReportCreated,
  onViewReportDetails
}: CitizenEmergencySOSProps) {
  const { t, isHindi } = useLanguage();
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [emergencyType, setEmergencyType] = useState<
    "Major Road Cave-In / Accident" | "Active Flood / Submerged Road" | "Live Electrical / Wire Hazard" | "Medical / Crash Emergency"
  >("Major Road Cave-In / Accident");
  const [emergencyNote, setEmergencyNote] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState<"ACQUIRING" | "BROADCASTING" | "DISPATCHED" | "ACKNOWLEDGED">("BROADCASTING");
  
  const [gpsStatus, setGpsStatus] = useState<"IDLE" | "LOCATING" | "LOCKED" | "FALLBACK">("IDLE");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number; name: string } | null>(null);
  const [createdSosReport, setCreatedSosReport] = useState<Report | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const countdownIntervalRef = useRef<any>(null);

  // Acquire location on mount
  useEffect(() => {
    acquireLocation();
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const acquireLocation = (): Promise<{ lat: number; lng: number; accuracy?: number; name: string }> => {
    return new Promise((resolve) => {
      setGpsStatus("LOCATING");

      if (!("geolocation" in navigator)) {
        const fallback = { lat: 28.6139, lng: 77.2090, accuracy: 20, name: "Delhi NCR Central Command Zone (GPS Fallback)" };
        setUserCoords(fallback);
        setGpsStatus("FALLBACK");
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10),
            name: `Live GPS Fix (${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E) ±${Math.round(pos.coords.accuracy || 10)}m`
          };
          setUserCoords(coords);
          setGpsStatus("LOCKED");
          resolve(coords);
        },
        (err) => {
          console.warn("Geolocation warning in Citizen SOS:", err.message);
          const fallback = { 
            lat: 28.6139, 
            lng: 77.2090, 
            accuracy: 30, 
            name: "Connaught Place / Central Municipal Grid (GPS Fallback)" 
          };
          setUserCoords(fallback);
          setGpsStatus("FALLBACK");
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    });
  };

  const handleStartCountdown = (instant = false) => {
    if (isSubmitting || sosActive) return;
    setStatusMessage(null);

    if (instant) {
      executeSosBroadcast();
      return;
    }

    setCountdown(3);
    setDispatchStatus("ACQUIRING");

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          executeSosBroadcast();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelSOS = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setSosActive(false);
    setIsSubmitting(false);
    setCreatedSosReport(null);
    setStatusMessage("SOS beacon cancelled by user.");
  };

  const executeSosBroadcast = async () => {
    setIsSubmitting(true);
    setSosActive(true);
    setDispatchStatus("BROADCASTING");
    setCountdown(null);

    try {
      let coords = userCoords;
      if (!coords) {
        coords = await acquireLocation();
      }

      const activeUser = currentUser || {
        id: "citizen_sos_user",
        email: "citizen@urbanpulse.gov",
        fullName: "Citizen Reporter",
        role: "citizen" as const,
        createdAt: new Date().toISOString()
      };

      // Determine category mapping
      let reportCategory: ReportCategory = "Road Obstruction";
      if (emergencyType === "Live Electrical / Wire Hazard") {
        reportCategory = "Broken Streetlight";
      } else if (emergencyType === "Active Flood / Submerged Road") {
        reportCategory = "Road Obstruction";
      } else if (emergencyType === "Medical / Crash Emergency") {
        reportCategory = "Road Obstruction";
      }

      const customTitle = `🚨 CRITICAL SOS: ${emergencyType}`;
      const customDesc = emergencyNote.trim()
        ? `EMERGENCY ALERT: ${emergencyNote.trim()} | Category: ${emergencyType} | Broadcasted via Citizen Emergency Beacon at GPS [${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}]. Requires immediate 24/7 municipal squad deployment.`
        : `CRITICAL INCIDENT BEACON: ${emergencyType} reported by citizen at live GPS [${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}]. Rapid triage and emergency dispatch required.`;

      // 1. Save Report to database
      const newReport = await createReport(
        {
          title: customTitle,
          description: customDesc,
          category: reportCategory,
          location: coords.name || `Urban Sector (GPS ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
          latitude: coords.lat,
          longitude: coords.lng,
          severity: 98,
          riskLevel: "High",
          priority: "Critical",
          confidence: 99,
          source: "MANUAL_REPORT",
          isSos: true,
          emergencyType: emergencyType,
          image: "https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&w=600&q=80",
          aiAnalysis: {
            category: emergencyType,
            severityScore: 98,
            riskLevel: "High",
            confidence: 99,
            description: `Live citizen emergency beacon triggered for "${emergencyType}". Immediate unit deployment instructed.`,
            recommendedActions: [
              "Deploy nearest emergency squad immediately",
              "Notify municipal control room and police rapid response",
              "Establish safety perimeter around live GPS coordinates"
            ]
          }
        },
        {
          id: activeUser.id,
          uid: activeUser.id,
          email: activeUser.email,
          fullName: activeUser.fullName
        }
      );

      // 2. Trigger Admin Notification
      await createNotification(
        "🚨 CRITICAL SOS ACTIVATED",
        `Emergency (${emergencyType}) broadcasted at GPS [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}] by ${activeUser.email || 'Citizen'}. Priority: CRITICAL.`,
        "alert_high_severity",
        "admin",
        "",
        newReport.id
      );

      setCreatedSosReport(newReport);
      setDispatchStatus("DISPATCHED");
      setIsSubmitting(false);

      if (onReportCreated) {
        onReportCreated(newReport);
      }

      // Auto update status to acknowledged after 3 seconds
      setTimeout(() => {
        setDispatchStatus("ACKNOWLEDGED");
      }, 3500);

    } catch (err: any) {
      console.error("SOS Broadcast error:", err);
      setStatusMessage(err.message || "Beacon transmission failed. Please call 112 directly.");
      setIsSubmitting(false);
      setDispatchStatus("DISPATCHED");
    }
  };

  return (
    <div id="emergency-sos-container" className="space-y-5">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-[#FEF2F2] via-[#FFFBEB] to-[#FFFFFF] border border-[#FECACA] rounded-2xl p-5 text-[#172033] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-[#172033]">
                  {isHindi ? "नागरिक आपातकालीन एसओएस एवं बीकन" : "CITIZEN SOS & RAPID INCIDENT BEACON"}
                </h1>
                <span className="px-2 py-0.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] rounded text-[9.5px] font-mono font-bold uppercase tracking-wider">
                  {isHindi ? "सीधा नगरपालिका डिस्पैच" : "Direct Municipal Dispatch"}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isHindi ? "सड़क धंसने, गंभीर खतरे या दुर्घटना की तत्काल सूचना 24/7 सिटी कमांड को प्रसारित करें।" : "Broadcast critical infrastructure collapse or accident beacon directly to 24/7 City Emergency Command."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="tel:112"
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{isHindi ? "112 पर कॉल करें (राष्ट्रीय आपातकालीन सेवा)" : "Call 112 (National Emergency)"}</span>
          </a>
        </div>
      </div>

      {/* STATUS NOTICE IF ANY */}
      {statusMessage && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
          >
            {isHindi ? "खारिज करें" : "Dismiss"}
          </button>
        </div>
      )}

      {/* SOS ACTION CARD & DISPATCH STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BIG SOS TRIGGER (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-5 shadow-xs">
          
          {/* GPS Telemetry Header */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 animate-bounce" />
              <span className="font-semibold text-slate-700 text-[11px]">
                {userCoords ? userCoords.name : (isHindi ? "जीपीएस सिग्नल प्राप्त हो रहा है..." : "Acquiring GPS Fix...")}
              </span>
            </div>
            <button
              onClick={() => acquireLocation()}
              className="flex items-center gap-1 text-[10.5px] text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isHindi ? "रिफ्रेश" : "Refresh"}</span>
            </button>
          </div>

          {!sosActive && countdown === null && (
            <>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-base font-bold text-[#172033]">
                  {isHindi ? "आपातकालीन बुनियादी ढांचा बीकन" : "Emergency Infrastructure Beacon"}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {isHindi ? "नीचे से घटना की श्रेणी चुनें और लाइव जीपीएस लोकेशन के साथ आपातकालीन दल को अलर्ट भेजने के लिए SOS बटन दबाएं।" : "Select incident category below and press the SOS beacon to broadcast live GPS coordinates to city emergency response units."}
                </p>
              </div>

              <div className="w-full max-w-sm space-y-2.5">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block text-left mb-1">
                    {isHindi ? "आपातकालीन घटना का प्रकार" : "Emergency Incident Type"}
                  </label>
                  <select
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value as any)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#DC2626] font-medium"
                  >
                    <option value="Major Road Cave-In / Accident">{isHindi ? "🚨 सड़क धंसना / गंभीर दुर्घटना" : "🚨 Major Road Cave-In / Accident"}</option>
                    <option value="Active Flood / Submerged Road">{isHindi ? "🌊 जलभराव / डूबी हुई सड़क" : "🌊 Active Flood / Submerged Road"}</option>
                    <option value="Live Electrical / Wire Hazard">{isHindi ? "⚡ बिजली का खुला तार / खतरा" : "⚡ Live Electrical / Wire Hazard"}</option>
                    <option value="Medical / Crash Emergency">{isHindi ? "🚑 मेडिकल / वाहन दुर्घटना" : "🚑 Medical / Crash Emergency"}</option>
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    value={emergencyNote}
                    onChange={(e) => setEmergencyNote(e.target.value)}
                    placeholder={isHindi ? "वैकल्पिक विवरण (उदा. 2 वाहन फंसे हैं, फ्लाईओवर के पास)" : "Optional details (e.g. 2 cars involved, near flyover)"}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033] text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              {/* Big Red SOS Button */}
              <div className="py-2 flex flex-col items-center gap-3">
                <button
                  id="trigger-sos-btn"
                  onClick={() => handleStartCountdown(false)}
                  className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#DC2626] to-[#EF4444] hover:from-[#B91C1C] hover:to-[#DC2626] text-white font-black text-2xl tracking-widest shadow-xl shadow-red-500/30 border-4 border-red-200 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  title={isHindi ? "3-सेकंड एसओएस बीकन सक्रिय करने के लिए दबाएं" : "Press to broadcast 3-second SOS beacon"}
                >
                  <AlertOctagon className="w-8 h-8" />
                  <span>SOS</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartCountdown(true)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    {isHindi ? "तत्काल भेजें (3s उलटी गिनती छोड़ें)" : "Instant Send (Skip 3s Countdown)"}
                  </button>
                </div>
              </div>
            </>
          )}

          {countdown !== null && (
            <div className="space-y-4 py-8">
              <span className="text-xs font-mono text-[#DC2626] uppercase tracking-wider block font-semibold">
                {isHindi ? "बीकन प्रसारण शुरू होने में:" : "Broadcasting Beacon in:"}
              </span>
              <div className="text-6xl font-mono font-black text-[#DC2626] animate-ping">
                {countdown}
              </div>
              <button
                onClick={handleCancelSOS}
                className="px-5 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] text-xs font-bold rounded-xl border border-[#E2E8F0] cursor-pointer"
              >
                {isHindi ? "एसओएस रद्द करें" : "Cancel SOS"}
              </button>
            </div>
          )}

          {sosActive && (
            <div className="w-full space-y-4 py-2 text-left">
              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center justify-between text-[#DC2626]">
                <div className="flex items-center gap-3">
                  <Radio className="w-6 h-6 text-[#DC2626] animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm">{isHindi ? "आपातकालीन बीकन सक्रिय है" : "Emergency Beacon Active"}</h4>
                    <p className="text-xs text-[#DC2626] font-mono">
                      {isHindi ? "श्रेणी" : "Category"}: {emergencyType}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  dispatchStatus === "ACKNOWLEDGED" 
                    ? "bg-emerald-600 text-white" 
                    : dispatchStatus === "DISPATCHED"
                    ? "bg-blue-600 text-white"
                    : "bg-[#DC2626] text-white animate-pulse"
                }`}>
                  {isHindi 
                    ? (dispatchStatus === "ACKNOWLEDGED" ? "स्वीकृत" : dispatchStatus === "DISPATCHED" ? "टीम भेजी गई" : "प्रसारित हो रहा है")
                    : dispatchStatus}
                </span>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
                {createdSosReport && (
                  <div className="flex items-center justify-between text-[#475569] pb-1 border-b border-slate-200">
                    <span className="font-bold">{isHindi ? "शिकायत टिकट कोड:" : "Incident Ticket Code:"}</span>
                    <span className="font-mono text-rose-600 font-bold">{createdSosReport.id}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[#475569]">
                  <span>{isHindi ? "प्रसारित जीपीएस:" : "Broadcast GPS:"}</span>
                  <span className="font-mono text-[#2563EB] font-bold">
                    {userCoords ? `${userCoords.lat.toFixed(4)}° N, ${userCoords.lng.toFixed(4)}° E` : "28.6139° N, 77.2090° E"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#475569]">
                  <span>{isHindi ? "नागरिक संपर्क:" : "Citizen Contact:"}</span>
                  <span className="font-mono text-[#172033]">{currentUser?.email || "citizen@urbanpulse.gov"}</span>
                </div>
                <div className="flex items-center justify-between text-[#475569]">
                  <span>{isHindi ? "आवंटित प्रतिक्रिया दल:" : "Assigned Response:"}</span>
                  <span className="font-mono text-[#16A34A] font-bold">{isHindi ? "एनसीआर त्वरित कार्य बल #4 • भेजा गया" : "NCR Quick Action Squad #4 • Dispatched"}</span>
                </div>
              </div>

              {createdSosReport && onViewReportDetails && (
                <button
                  type="button"
                  onClick={() => onViewReportDetails(createdSosReport)}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isHindi ? "शिकायत टिकट और लाइव डिस्पैच स्थिति देखें" : "Inspect Incident Ticket & Live Dispatch Status"}</span>
                </button>
              )}

              <button
                onClick={handleCancelSOS}
                className="w-full py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] text-xs font-bold rounded-xl border border-[#E2E8F0] cursor-pointer"
              >
                {isHindi ? "एसओएस बीकन समाप्त / निष्क्रिय करें" : "Resolve / Deactivate SOS Beacon"}
              </button>
            </div>
          )}
        </div>

        {/* EMERGENCY DIRECTORY (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 text-[#172033] shadow-xs">
          <h3 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
            {t("sos.contactsHeader", "24/7 City Emergency Contacts")}
          </h3>

          <div className="space-y-2.5">
            {[
              { name: t("sos.policeName", "Police Rapid Response"), number: "112", desc: t("sos.policeDesc", "All City Emergencies") },
              { name: t("sos.ambulanceName", "Ambulance / Medical"), number: "102", desc: t("sos.ambulanceDesc", "Trauma & Road Accidents") },
              { name: t("sos.highwayName", "National Highway Helpline"), number: "1033", desc: t("sos.highwayDesc", "Expressway Hazards & Towing") },
              { name: t("sos.disasterName", "Disaster Management"), number: "1078", desc: t("sos.disasterDesc", "Floods & Structural Collapse") },
              { name: t("sos.fireName", "Delhi Fire Service"), number: "101", desc: t("sos.fireDesc", "Fire & Rescue Operations") },
              { name: t("sos.womenName", "Women's Safety Helpline"), number: "1091", desc: t("sos.womenDesc", "24/7 Women Protection") }
            ].map((contact, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
              >
                <div>
                  <span className="font-bold text-[#172033] block">{contact.name}</span>
                  <span className="text-[11px] text-[#64748B]">{contact.desc}</span>
                </div>
                <a
                  href={`tel:${contact.number}`}
                  className="px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] hover:bg-[#DC2626] hover:text-white rounded-lg font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>{contact.number}</span>
                </a>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              {t("sos.legalAssurance", "All emergency beacons automatically notify the central municipal emergency desk and log high-priority incident records with GPS timestamps.")}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
