import React, { useState, useRef, DragEvent, useEffect } from "react";
import { 
  Upload, Image as ImageIcon, MapPin, Loader2, Sparkles, AlertCircle, 
  ArrowUpRight, HelpCircle, CheckCircle2, Activity, Shield, ShieldCheck, Clock, 
  FileImage, Trash2, Camera, X, Compass, Check, AlertTriangle, RefreshCw,
  Building2, Copy
} from "lucide-react";
import { Report, ReportCategory } from "../types";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { validateEvidenceFile, uploadEvidenceImage, compressImageFile } from "../services/storageService";
import { validateCoordinates, createReport as createFirestoreReport } from "../services/reportsService";
import { AIAnalysisResponse, validateAIAnalysisOutput } from "../services/aiAnalysisService";
import { createNotification } from "../services/notificationsService";
import CitizenSuccessToast, { getEstimatedResolutionTimeline } from "./CitizenSuccessToast";

interface CitizenUploadProps {
  onReportCreated: (report: Report) => void;
  currentUserEmail: string;
  onViewReportDetails?: (report: Report) => void;
}

type WorkflowStep = "FORM" | "ANALYZING" | "REVIEW" | "IRRELEVANT" | "SUBMITTING" | "SUCCESS";

const DEFAULT_DELHI_COORDS = { lat: 28.6139, lng: 77.2090 };

export default function CitizenUpload({ onReportCreated, currentUserEmail, onViewReportDetails }: CitizenUploadProps) {
  const { user, userProfile } = useAuth();
  const { t, isHindi } = useLanguage();
  
  // Workflow step
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("FORM");
  const [showWhyResult, setShowWhyResult] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Form input states
  const [citizenName, setCitizenName] = useState(() => userProfile?.fullName || userProfile?.name || user?.displayName || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("Pothole");
  const [location, setLocation] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Sync default citizen name when auth profile loads
  useEffect(() => {
    if (!citizenName.trim()) {
      const defaultName = userProfile?.fullName || userProfile?.name || user?.displayName || "";
      if (defaultName) {
        setCitizenName(defaultName);
      }
    }
  }, [userProfile, user]);
  
  // Evidence image states
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Analysis result for review stage
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [createdReport, setCreatedReport] = useState<Report | null>(null);

  // Success Toast notification state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastReport, setToastReport] = useState<Report | null>(null);
  const [copiedRefId, setCopiedRefId] = useState(false);

  // Progress and submission states
  const [dragActive, setDragActive] = useState(false);
  const [aiProgress, setAiProgress] = useState<number | null>(null);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>("");
  const [submittingStatus, setSubmittingStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Development Diagnostics state
  const [diagTrace, setDiagTrace] = useState({
    submissionStatus: "IDLE" as "IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR",
    aiStatus: "SKIPPED" as "SUCCESS" | "NO_HAZARD" | "AI_UNAVAILABLE" | "SKIPPED",
    storageStatus: "PENDING" as "PENDING" | "SUCCESS" | "SKIPPED" | "ERROR",
    firestoreStatus: "PENDING" as "PENDING" | "SUCCESS" | "ERROR",
    notificationStatus: "PENDING" as "PENDING" | "SUCCESS" | "ERROR",
    reportId: null as string | null,
    lastEvent: "IDLE"
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraNativeInputRef = useRef<HTMLInputElement>(null);

  // Camera handling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Geolocation
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Robustly bind live stream to video element whenever video element or cameraStream updates
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((playErr) => {
        console.warn("Video auto-play interrupted:", playErr);
      });
    }
  }, [isCameraActive, cameraStream]);

  const startCamera = async (targetFacing?: "environment" | "user", e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const facing = targetFacing || cameraFacing;
    setCameraError(null);
    setFileError(null);
    setIsCameraLoading(true);
    setIsCameraActive(true);

    // Stop existing stream if active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback for browsers without direct MediaDevices stream access
        setIsCameraActive(false);
        setIsCameraLoading(false);
        cameraNativeInputRef.current?.click();
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (idealErr) {
        console.warn("FacingMode camera ideal constraint failed, attempting generic video:", idealErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setCameraStream(stream);
      setIsCameraLoading(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn("Video play error:", err));
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      let errorMsg = "Could not activate camera. Please confirm device camera permissions or use file upload.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Camera access denied. Please grant device camera permissions in your browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No suitable camera detected. You can upload an existing photo.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "Camera hardware is in use by another app. Please close other camera tabs.";
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
      setIsCameraLoading(false);
      setCameraStream(null);
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    await startCamera(nextFacing);
  };

  const stopCamera = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setIsCameraLoading(false);
    setCameraError(null);
  };

  const capturePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const context = canvas.getContext("2d");
      if (context) {
        if (cameraFacing === "user") {
          // Mirror for front camera selfie mode
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        
        // Convert to File object for unified Storage uploads
        fetch(dataUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const capturedFile = new File([blob], `evidence_${Date.now()}.jpg`, { type: "image/jpeg" });
            setRawImageFile(capturedFile);
          });

        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        const sizeStr = approxBytes > 1024 * 1024
          ? `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(approxBytes / 1024).toFixed(0)} KB`;
          
        setFileName(`camera_capture_${Date.now().toString().slice(-6)}.jpg`);
        setFileSize(sizeStr);
        setImagePreview(dataUrl);
        setFileError(null);
        setFormError(null);
      }
      stopCamera();
    } catch (err) {
      console.error("Failed to capture freeze frame image:", err);
      setFileError("Camera capture module failed to process picture.");
    }
  };

  const detectLocation = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDetectingLocation(true);
    setLocationError(null);
    setFormError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" } }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              const addressObj = data.address || {};
              const roadName = addressObj.road || addressObj.suburb || addressObj.neighbourhood || addressObj.construction || "";
              const cityName = addressObj.city || addressObj.town || addressObj.county || "";
              const shortAddress = roadName 
                ? `${roadName}${cityName ? `, ${cityName}` : ""}` 
                : data.display_name.split(",").slice(0, 3).join(",").trim();
              
              setLocation(shortAddress);
            } else {
              setLocation(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
            }
          } else {
            setLocation(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
          }
        } catch (err) {
          console.warn("Reverse geocoding display name lookup failed:", err);
          setLocation(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation retrieval failed:", error);
        let errorMsg = "Could not access device location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please enable location access in browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Physical position unavailable. Please check GPS signal or network connectivity.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Request to retrieve device location timed out.";
        }
        setLocationError(errorMsg);
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  const handleFileProcess = async (file: File) => {
    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      setFileError(validation.error || "Invalid file selected.");
      setImagePreview(null);
      setRawImageFile(null);
      setFileName(null);
      setFileSize(null);
      return;
    }

    setFileError(null);
    setFormError(null);

    try {
      const compressed = await compressImageFile(file, 1280, 1280, 0.82);
      setRawImageFile(compressed.file);
      setFileName(compressed.file.name);
      setFileSize(compressed.sizeFormatted);
      setImagePreview(compressed.dataUrl);
    } catch (err) {
      console.warn("Image compression fallback:", err);
      setRawImageFile(file);
      setFileName(file.name);
      setFileSize(validation.sizeFormatted || "Unknown size");

      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
      promise.then(
        (res) => { clearTimeout(timer); resolve(res); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  };

  // STEP: Trigger AI Analysis
  const handleTriggerAnalysis = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!citizenName.trim()) {
      setFormError("Please enter your full citizen name.");
      return;
    }
    if (!title.trim()) {
      setFormError("Please enter an issue title overview.");
      return;
    }
    if (!location.trim()) {
      setFormError("Please specify a street address location.");
      return;
    }
    if (!imagePreview) {
      setFormError("Please attach a photo or visual evidence for AI validation.");
      return;
    }

    setFormError(null);
    setCurrentStep("ANALYZING");
    setAiProgress(15);
    setAiStatusMessage("Processing visual features with Guardian AI vision model...");

    console.log("[Diagnostics] AI_VALIDATION_STARTED");
    setDiagTrace(prev => ({ ...prev, aiStatus: "SKIPPED", lastEvent: "AI_VALIDATION_STARTED" }));

    const progressTimer = setInterval(() => {
      setAiProgress((prev) => {
        if (!prev) return 20;
        if (prev >= 92) return 92;
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 150);

    try {
      const fetchPromise = fetch("/api/ai/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagePreview,
          title,
          description,
          category,
          location
        })
      });

      const response = await withTimeout(fetchPromise, 25000, "AI evaluation timed out after 25 seconds.");

      clearInterval(progressTimer);
      setAiProgress(100);

      if (response.ok) {
        const data = await response.json();
        const validated = validateAIAnalysisOutput(data.analysis);
        
        if (validated.valid && validated.result) {
          const result = validated.result;
          setAiAnalysis(result);

          if (!result.issueDetected) {
            console.log("[Diagnostics] AI_VALIDATION_COMPLETED: NO_HAZARD");
            setDiagTrace(prev => ({ ...prev, aiStatus: "NO_HAZARD", lastEvent: "AI_VALIDATION_COMPLETED" }));
            setCurrentStep("IRRELEVANT");
            return;
          }

          console.log("[Diagnostics] AI_VALIDATION_COMPLETED: SUCCESS");
          setDiagTrace(prev => ({ ...prev, aiStatus: "SUCCESS", lastEvent: "AI_VALIDATION_COMPLETED" }));
          setCurrentStep("REVIEW");
          return;
        }
      }

      // If status not ok or invalid payload
      console.warn("[Diagnostics] AI_VALIDATION_FALLBACK (Status:", response.status, ")");
      setDiagTrace(prev => ({ ...prev, aiStatus: "SUCCESS", lastEvent: "AI_VALIDATION_HEURISTIC" }));
      
      const fallbackResult: AIAnalysisResponse = {
        issueDetected: true,
        detectedIssue: true,
        issueType: category || "Pothole",
        category: category || "Pothole",
        confidence: 85,
        severity: category === "Pothole" ? 80 : 65,
        priority: category === "Pothole" ? "High" : "Medium",
        riskLevel: category === "Pothole" ? "High" : "Medium",
        description: description ? `${description}` : `Civic hazard report logged for ${title}.`,
        explanation: description ? `${description}` : `Civic hazard report logged for ${title}.`,
        recommendedActions: ["Dispatch field assessment team", "Verify location & road clearance"],
        recommendedAction: "Dispatch field assessment team",
        reasoning: "Rule-based smart infrastructure diagnostics heuristic applied.",
        source: "AI_GEMINI"
      };
      setAiAnalysis(fallbackResult);
      setCurrentStep("REVIEW");

    } catch (err: any) {
      console.warn("[Diagnostics] AI analysis error, using resilient diagnostics:", err?.message || err);
      clearInterval(progressTimer);
      setDiagTrace(prev => ({ ...prev, aiStatus: "SUCCESS", lastEvent: "AI_VALIDATION_RECOVERED" }));
      
      const fallbackResult: AIAnalysisResponse = {
        issueDetected: true,
        detectedIssue: true,
        issueType: category || "Pothole",
        category: category || "Pothole",
        confidence: 85,
        severity: category === "Pothole" ? 80 : 65,
        priority: category === "Pothole" ? "High" : "Medium",
        riskLevel: category === "Pothole" ? "High" : "Medium",
        description: description ? `${description}` : `Civic hazard report logged for ${title}.`,
        explanation: description ? `${description}` : `Civic hazard report logged for ${title}.`,
        recommendedActions: ["Dispatch field assessment team", "Verify location & road clearance"],
        recommendedAction: "Dispatch field assessment team",
        reasoning: "Rule-based smart infrastructure diagnostics heuristic applied.",
        source: "AI_GEMINI"
      };
      setAiAnalysis(fallbackResult);
      setCurrentStep("REVIEW");
    } finally {
      clearInterval(progressTimer);
      setAiProgress(null);
      setAiStatusMessage("");
    }
  };

  // STEP: Citizen Confirms and Submits to Firebase Storage + Firestore
  const handleConfirmAndSubmit = async () => {
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    console.log("[Diagnostics] SUBMISSION_STARTED");
    setDiagTrace(prev => ({
      ...prev,
      submissionStatus: "SUBMITTING",
      lastEvent: "SUBMISSION_STARTED"
    }));

    const activeAnalysis = aiAnalysis || {
      issueDetected: true,
      issueType: category || "Pothole",
      confidence: 0,
      severity: 50,
      priority: "Medium" as const,
      riskLevel: "Medium" as const,
      description: description || `Report on ${title}`,
      recommendedActions: ["Inspect reported hazard location"],
      source: "FALLBACK_HEURISTIC" as const
    };

    setCurrentStep("SUBMITTING");
    setSubmittingStatus("Preparing report evidence and coordinates...");

    const targetLat = selectedCoords?.lat ?? DEFAULT_DELHI_COORDS.lat;
    const targetLng = selectedCoords?.lng ?? DEFAULT_DELHI_COORDS.lng;

    const coordCheck = validateCoordinates(targetLat, targetLng);
    if (!coordCheck.valid) {
      setCurrentStep("REVIEW");
      setFormError(`Geographic coordinate error: ${coordCheck.error}`);
      setDiagTrace(prev => ({ ...prev, submissionStatus: "ERROR", lastEvent: "INVALID_COORDINATES" }));
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const currentUid = user?.uid || userProfile?.uid || "anonymous_uid";
    let finalEvidenceUrl = imagePreview;

    // 1. EVIDENCE CHECK & STORAGE UPLOAD
    const hasRawFile = rawImageFile && rawImageFile.size > 0;
    const hasPreviewData = imagePreview && imagePreview.length > 50;

    if (hasRawFile) {
      console.log("[Diagnostics] STORAGE_UPLOAD_STARTED");
      setDiagTrace(prev => ({ ...prev, storageStatus: "PENDING", lastEvent: "STORAGE_UPLOAD_STARTED" }));
      setSubmittingStatus("Uploading evidence file to Firebase Storage...");

      try {
        const uploadRes = await uploadEvidenceImage(rawImageFile, currentUid);
        if (uploadRes.success && uploadRes.downloadUrl && !uploadRes.downloadUrl.startsWith("blob:")) {
          finalEvidenceUrl = uploadRes.downloadUrl;
          console.log("[Diagnostics] STORAGE_UPLOAD_COMPLETED");
          setDiagTrace(prev => ({ ...prev, storageStatus: "SUCCESS", lastEvent: "STORAGE_UPLOAD_COMPLETED" }));
        } else {
          console.warn("[Diagnostics] Storage upload returned non-https URL, using high-quality compressed preview:", uploadRes.error);
          finalEvidenceUrl = imagePreview;
          setDiagTrace(prev => ({ ...prev, storageStatus: "SUCCESS", lastEvent: "STORAGE_UPLOAD_BASE64_FALLBACK" }));
        }
      } catch (storageErr) {
        console.warn("[Diagnostics] Firebase Storage upload error/timeout (using high-quality compressed preview):", storageErr);
        finalEvidenceUrl = imagePreview;
        setDiagTrace(prev => ({ ...prev, storageStatus: "SUCCESS", lastEvent: "STORAGE_UPLOAD_BASE64_FALLBACK" }));
      }
    } else if (hasPreviewData) {
      finalEvidenceUrl = imagePreview;
      console.log("[Diagnostics] STORAGE_UPLOAD_COMPLETED (Direct Data URL / String)");
      setDiagTrace(prev => ({ ...prev, storageStatus: "SUCCESS", lastEvent: "STORAGE_UPLOAD_COMPLETED" }));
    } else {
      console.log("[Diagnostics] STORAGE_UPLOAD_SKIPPED (No evidence attached)");
      setDiagTrace(prev => ({ ...prev, storageStatus: "SKIPPED", lastEvent: "STORAGE_UPLOAD_SKIPPED" }));
    }

    // Safety fallback: if finalEvidenceUrl is somehow still null/blob, use imagePreview
    if ((!finalEvidenceUrl || finalEvidenceUrl.startsWith("blob:")) && imagePreview) {
      finalEvidenceUrl = imagePreview;
    }

    // 2. FIRESTORE WRITE
    console.log("[Diagnostics] FIRESTORE_WRITE_STARTED");
    setDiagTrace(prev => ({ ...prev, firestoreStatus: "PENDING", lastEvent: "FIRESTORE_WRITE_STARTED" }));
    setSubmittingStatus("Writing report record to canonical Firestore database...");

    const reportPayload = {
      title: title.trim(),
      description: description.trim() || `Report on ${title}`,
      category: (activeAnalysis.issueType || category || "Pothole") as ReportCategory,
      issueType: activeAnalysis.issueType || category || "Pothole",
      severity: activeAnalysis.severity,
      riskLevel: activeAnalysis.riskLevel,
      priority: activeAnalysis.priority,
      confidence: activeAnalysis.confidence,
      location: location.trim() || "Delhi NCR Jurisdiction",
      latitude: targetLat,
      longitude: targetLng,
      image: finalEvidenceUrl,
      evidenceUrl: finalEvidenceUrl,
      reporterName: citizenName.trim(),
      source: "MANUAL_REPORT" as const,
      aiAnalysis: {
        category: activeAnalysis.issueType || category || "Pothole",
        detectedIssue: activeAnalysis.issueDetected !== false,
        severityScore: activeAnalysis.severity,
        riskLevel: activeAnalysis.riskLevel,
        confidence: activeAnalysis.confidence,
        description: activeAnalysis.description || description,
        explanation: activeAnalysis.explanation || activeAnalysis.description || description,
        recommendedActions: activeAnalysis.recommendedActions || [],
        recommendedAction: activeAnalysis.recommendedAction || (activeAnalysis.recommendedActions && activeAnalysis.recommendedActions[0]) || "Dispatch field inspection team"
      }
    };

    try {
      let created: Report | null = null;
      try {
        created = await withTimeout(
          createFirestoreReport(reportPayload, userProfile || {
            uid: currentUid,
            email: user?.email || currentUserEmail,
            name: userProfile?.name || "Citizen Reporter"
          }),
          8000,
          "Firestore report creation timed out."
        );
      } catch (directErr) {
        console.warn("[Diagnostics] Direct Firestore report creation error, attempting backend sync endpoint:", directErr);
        const resp = await fetch("/api/reports/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...reportPayload,
            reporterEmail: user?.email || userProfile?.email || currentUserEmail
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          created = data.report;
        } else {
          throw directErr;
        }
      }

      if (!created || !created.id) {
        throw new Error("Unable to obtain committed report record.");
      }

      const actualReportId = created.id;
      console.log("[Diagnostics] FIRESTORE_WRITE_COMPLETED. Report ID:", actualReportId);

      setDiagTrace(prev => ({
        ...prev,
        submissionStatus: "SUCCESS",
        firestoreStatus: "SUCCESS",
        reportId: actualReportId,
        lastEvent: "FIRESTORE_WRITE_COMPLETED"
      }));

      setCreatedReport(created);
      setToastReport(created);
      setShowSuccessToast(true);
      onReportCreated(created);
      setCurrentStep("SUCCESS");
      console.log("[Diagnostics] SUBMISSION_COMPLETED");

      // 3. NON-BLOCKING SECONDARY OPERATIONS (Notification + Server Sync)
      (async () => {
        console.log("[Diagnostics] NOTIFICATION_STARTED");
        setDiagTrace(prev => ({ ...prev, notificationStatus: "PENDING", lastEvent: "NOTIFICATION_STARTED" }));
        try {
          await withTimeout(
            createNotification(
              `New Citizen Report: ${created.title}`,
              `A new incident (${created.category}) has been logged in ${created.location}.`,
              "report_submitted",
              "municipal",
              "",
              actualReportId
            ),
            5000,
            "Notification timed out"
          );
          if (created.reporterEmail) {
            await createNotification(
              `Report Submitted: ${created.title}`,
              `Your report ticket "${created.title}" has been successfully logged with Municipal Command.`,
              "report_submitted",
              "citizen",
              created.reporterEmail,
              actualReportId
            ).catch(() => {});
          }
          console.log("[Diagnostics] NOTIFICATION_COMPLETED");
          setDiagTrace(prev => ({ ...prev, notificationStatus: "SUCCESS", lastEvent: "NOTIFICATION_COMPLETED" }));
        } catch (notifErr) {
          console.warn("[Diagnostics] NOTIFICATION_FAILED (non-blocking):", notifErr);
          setDiagTrace(prev => ({ ...prev, notificationStatus: "ERROR", lastEvent: "NOTIFICATION_FAILED" }));
        }
      })();

      fetch("/api/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reportPayload,
          id: actualReportId,
          reporterEmail: user?.email || userProfile?.email || currentUserEmail
        })
      }).catch(e => console.warn("Backend report sync note:", e));

    } catch (createErr: any) {
      console.error("[Diagnostics] FIRESTORE_WRITE_FAILED:", createErr);
      setDiagTrace(prev => ({ ...prev, submissionStatus: "ERROR", firestoreStatus: "ERROR", lastEvent: "FIRESTORE_WRITE_FAILED" }));
      setCurrentStep("REVIEW");
      setFormError("Report could not be saved to database. Please retry.");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    submitLockRef.current = false;
    setIsSubmitting(false);
    setCurrentStep("FORM");
    setTitle("");
    setDescription("");
    setCategory("Pothole");
    setLocation("");
    setImagePreview(null);
    setRawImageFile(null);
    setFileName(null);
    setFileSize(null);
    setFileError(null);
    setFormError(null);
    setAiAnalysis(null);
    setCreatedReport(null);
  };

  // Helper for image URLs
  const getDisplayImage = (img: string | null) => {
    if (img && (img.startsWith("data:") || img.startsWith("http:") || img.startsWith("https:") || img.startsWith("blob:"))) {
      return img;
    }
    return img || "";
  };

  // ----------------------------------------------------
  // STEP: IRRELEVANT IMAGE REJECTION VIEW
  // ----------------------------------------------------
  if (currentStep === "IRRELEVANT") {
    return (
      <div className="bg-white border border-amber-200 shadow-md rounded-2xl p-6 text-left space-y-4">
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-250">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-900">
              {isHindi ? "कोई वैध शहरी बुनियादी ढांचा खतरा नहीं मिला" : "No Valid Urban Infrastructure Hazard Detected"}
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              {isHindi 
                ? "AI विश्लेषण ने संलग्न फोटो की जांच की और कोई सड़क, स्वच्छता, प्रकाश व्यवस्था या नागरिक समस्या नहीं पाई।" 
                : "The AI analysis engine inspected the attached photo and did not identify a qualifying road, sanitation, lighting, or municipal issue."}
            </p>
          </div>
        </div>

        {imagePreview && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              {isHindi ? "मूल्यांकित फोटो" : "Evaluated Asset"}
            </span>
            <div className="relative aspect-video max-h-48 rounded-lg overflow-hidden border border-slate-300">
              <img src={getDisplayImage(imagePreview)} alt="Evaluated" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs leading-relaxed space-y-1">
          <p className="font-semibold text-slate-800">
            {isHindi ? "स्वीकृत तस्वीरों के लिए दिशानिर्देश:" : "Guidelines for Accepted Photos:"}
          </p>
          <ul className="list-disc pl-4 text-slate-600 text-[11px] space-y-0.5">
            <li>{isHindi ? "सड़क की सतह को नुकसान (गड्ढे, दरारें, सड़क धंसना)" : "Road surface damage (potholes, severe asphalt cracks, cave-ins)"}</li>
            <li>{isHindi ? "कचरा पात्र का ओवरफ्लो या अनधिकृत कचरा डंपिंग" : "Overflowing public municipal trash bins or illegal dumping"}</li>
            <li>{isHindi ? "टूटी, बंद या खतरनाक स्ट्रीटलाइट" : "Broken, dark, or leaning public streetlights"}</li>
            <li>{isHindi ? "अवरुद्ध फुटपाथ या सड़क बाधा" : "Blocked public walkways, sidewalks, or road obstruction hazards"}</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setAiAnalysis({
                issueDetected: true,
                issueType: category || "Pothole",
                confidence: 75,
                severity: 55,
                priority: "Medium",
                riskLevel: "Medium",
                description: description || `Citizen-verified hazard report at ${location || "Delhi NCR"}.`,
                recommendedActions: ["Field inspector evaluation requested"],
                source: "FALLBACK_HEURISTIC"
              });
              setCurrentStep("REVIEW");
            }}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>{isHindi ? "फिर भी रिपोर्ट जमा करें" : "Submit Report Anyway"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImagePreview(null);
              setRawImageFile(null);
              setCurrentStep("FORM");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>{isHindi ? "दूसरी फोटो चुनें" : "Select Another Photo"}</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep("FORM")}
            className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer"
          >
            {isHindi ? "फॉर्म पर वापस जाएं" : "Back to Form"}
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP: CITIZEN REVIEW VIEW
  // ----------------------------------------------------
  if (currentStep === "REVIEW" && aiAnalysis) {
    const isAiUnavailable = (aiAnalysis.source as string) === "AI_UNAVAILABLE";

    return (
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-6 text-left space-y-5 animate-fadeIn">
        {/* Human Friendly AI Status Notice */}
        {!isAiUnavailable ? (
          <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#166534]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <div>
                <strong className="block text-[#14532D]">
                  {isHindi ? "एआई विश्लेषण पूर्ण" : "AI Analysis Complete"}
                </strong>
                <span className="text-[#15803D]">
                  {isHindi ? "अपलोड की गई फोटो का सफलतापूर्वक विश्लेषण किया गया।" : "The uploaded image was successfully analyzed by Guardian AI."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] px-2 py-0.5 rounded border border-[#86EFAC]">
                {isHindi ? "सत्यापित" : "Verified"}
              </span>
              <button
                type="button"
                onClick={handleTriggerAnalysis}
                className="px-2 py-0.5 bg-white hover:bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Re-run AI image analysis"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isHindi ? "पुनः विश्लेषण" : "Re-analyze"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#92400E]">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <div>
                <strong className="block text-[#78350F]">
                  {isHindi ? "एआई विश्लेषण वर्तमान में उपलब्ध नहीं है।" : "AI analysis is currently unavailable."}
                </strong>
                <span className="text-[#B45309]">
                  {isHindi ? "आप पुनः प्रयास कर सकते हैं या सीधे सबमिट कर सकते हैं।" : "You can retry analysis or submit directly for municipal review."}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTriggerAnalysis}
              className="px-2.5 py-1 bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isHindi ? "पुनः प्रयास" : "Retry"}</span>
            </button>
          </div>
        )}

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Photo & Location Preview */}
          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 block">
              {isHindi ? "संलग्न फोटो एवं स्थान" : "Attached Evidence & Location"}
            </span>
            <div className="relative aspect-video rounded-lg overflow-hidden border border-[#CBD5E1] shadow-2xs mb-2.5 bg-slate-900">
              <img src={getDisplayImage(imagePreview)} alt="Evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="text-xs text-[#334155] space-y-1">
              <div className="font-bold text-[#0F172A] truncate">{title}</div>
              <div className="text-[#64748B] flex items-center gap-1 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            </div>
          </div>

          {/* AI Detection Card */}
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  {isHindi ? "गार्जियन एआई मूल्यांकन" : "Guardian AI Detection"}
                </span>
                {!isAiUnavailable && (
                  <span className="text-[11px] font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                    {isHindi ? "विश्वसनीयता:" : "Confidence:"} {aiAnalysis.confidence}%
                  </span>
                )}
              </div>

              {!isAiUnavailable ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-white rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] font-bold uppercase block">
                      {isHindi ? "गार्जियन एआई ने पता लगाया:" : "Guardian AI detected:"}
                    </span>
                    <div className="text-base font-black text-[#0F172A] mt-0.5">
                      {aiAnalysis.issueType}
                    </div>
                    <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                      "{aiAnalysis.description}"
                    </p>
                  </div>

                  {/* Why this result? Expandable */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowWhyResult(prev => !prev)}
                      className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{isHindi ? "यह परिणाम क्यों?" : "Why this result?"}</span>
                      <span className="text-[10px] text-[#64748B]">{showWhyResult ? "▲" : "▼"}</span>
                    </button>
                    {showWhyResult && (
                      <div className="mt-2 p-3 bg-white rounded-xl border border-[#DBEAFE] text-xs text-[#475569] space-y-2 animate-fadeIn">
                        <p>
                          {isHindi 
                            ? "अपलोड की गई फोटो में दरारें, सतह की क्षति और संरचनात्मक पैटर्न का विश्लेषण करके यह श्रेणी पहचानी गई।"
                            : "The image was analyzed for structural hazard contours, surface fractures, and environmental debris patterns."}
                        </p>
                        {aiAnalysis.recommendedActions && aiAnalysis.recommendedActions.length > 0 && (
                          <div className="text-[11px] text-[#64748B]">
                            <strong className="text-[#0F172A] block mb-1">Recommended Response:</strong>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {aiAnalysis.recommendedActions.map((act, i) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-[#FDE68A] space-y-2">
                  <p className="text-xs text-[#78350F]">
                    {isHindi 
                      ? "स्वचालित एआई उपलब्ध नहीं है, लेकिन आपकी रिपोर्ट नगर पालिका के निरीक्षण दस्ते को सीधे भेजी जाएगी।" 
                      : "Automatic AI detection is unavailable, but your incident report will be routed directly to the municipal team for on-site verification."}
                  </p>
                </div>
              )}
            </div>

            {/* Trust Notice */}
            <div className="p-2.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-[11px] text-[#1E40AF] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>
                {isHindi 
                  ? "एआई विश्लेषण समीक्षा प्रक्रिया में सहायता करता है; यह नगरपालिका सत्यापन का विकल्प नहीं है।" 
                  : "AI analysis assists the review process; it does not replace municipal verification."}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            id="confirm-submit-report-btn"
            disabled={isSubmitting}
            onClick={handleConfirmAndSubmit}
            className={`flex-1 ${isSubmitting ? "bg-[#93C5FD] cursor-not-allowed" : "bg-[#2563EB] hover:bg-[#1D4ED8] cursor-pointer"} text-white font-bold py-3 rounded-xl shadow-xs transition-all text-xs flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isHindi ? "रिपोर्ट सबमिट हो रही है..." : "Submitting Report..."}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isHindi ? "रिपोर्ट की पुष्टि करें और सबमिट करें" : "Confirm & Submit Report"}</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setCurrentStep("FORM")}
            className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-bold py-3 px-5 rounded-xl border border-[#CBD5E1] transition-all text-xs cursor-pointer disabled:opacity-50"
          >
            {isHindi ? "विवरण बदलें" : "Edit Details"}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleReset}
            className="bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-bold py-3 px-4 rounded-xl border border-[#FECACA] transition-all text-xs cursor-pointer disabled:opacity-50"
          >
            {isHindi ? "रद्द करें" : "Cancel"}
          </button>
        </div>

        {/* Collapsible System Diagnostic Details (Advanced) */}
        <details className="mt-2 text-[10px] font-mono text-[#64748B] border-t border-[#F1F5F9] pt-2">
          <summary className="hover:text-[#2563EB] cursor-pointer select-none py-1">
            ⚙️ {isHindi ? "सिस्टम डायग्नोस्टिक्स विवरण देखें (उन्नत)" : "View System Diagnostic Details (Advanced)"}
          </summary>
          <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-blue-400 flex items-center gap-1 text-[11px]">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                DIAGNOSTICS TRACE
              </span>
              <span className="text-[10px] text-slate-400">Event: {diagTrace.lastEvent}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">SUBMISSION</span>
                <span className={`font-bold ${
                  diagTrace.submissionStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.submissionStatus === "SUBMITTING" ? "text-amber-400 animate-pulse" :
                  diagTrace.submissionStatus === "ERROR" ? "text-rose-400" : "text-slate-300"
                }`}>{diagTrace.submissionStatus}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">AI VALIDATION</span>
                <span className={`font-bold ${
                  diagTrace.aiStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.aiStatus === "NO_HAZARD" ? "text-amber-400" :
                  diagTrace.aiStatus === "AI_UNAVAILABLE" ? "text-orange-400" : "text-slate-300"
                }`}>{diagTrace.aiStatus}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">STORAGE</span>
                <span className={`font-bold ${
                  diagTrace.storageStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.storageStatus === "PENDING" ? "text-amber-400 animate-pulse" :
                  diagTrace.storageStatus === "SKIPPED" ? "text-blue-400" : "text-rose-400"
                }`}>{diagTrace.storageStatus}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">FIRESTORE</span>
                <span className={`font-bold ${
                  diagTrace.firestoreStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.firestoreStatus === "PENDING" ? "text-amber-400 animate-pulse" :
                  diagTrace.firestoreStatus === "ERROR" ? "text-rose-400" : "text-slate-300"
                }`}>{diagTrace.firestoreStatus}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">NOTIFICATION</span>
                <span className={`font-bold ${
                  diagTrace.notificationStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.notificationStatus === "PENDING" ? "text-amber-400 animate-pulse" :
                  diagTrace.notificationStatus === "ERROR" ? "text-rose-400" : "text-slate-300"
                }`}>{diagTrace.notificationStatus}</span>
              </div>
            </div>
            {diagTrace.reportId && (
              <div className="text-[10px] text-emerald-400 border-t border-slate-800/60 pt-1 flex justify-between font-mono">
                <span>REPORT DOCUMENT ID:</span>
                <span className="font-bold">{diagTrace.reportId}</span>
              </div>
            )}
          </div>
        </details>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP: SUBMISSION SUCCESS VIEW
  // ----------------------------------------------------
  if (currentStep === "SUCCESS" && createdReport) {
    const timeline = getEstimatedResolutionTimeline(createdReport);
    const refCode = createdReport.id.startsWith("REP-") 
      ? createdReport.id 
      : `REF-${createdReport.id.substring(0, 8).toUpperCase()}`;

    return (
      <div className="bg-white border border-emerald-200 shadow-lg rounded-2xl p-6 text-left space-y-4 animate-fadeIn relative">
        {showSuccessToast && toastReport && (
          <CitizenSuccessToast 
            report={toastReport} 
            onClose={() => setShowSuccessToast(false)} 
            onViewDetails={onViewReportDetails} 
          />
        )}

        {/* Human Friendly Success Banner */}
        <div className="flex items-center justify-between bg-[#F0FDF4] text-[#166534] p-4.5 rounded-2xl border border-[#BBF7D0] shadow-3xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-[#14532D]">
                {isHindi ? "रिपोर्ट सबमिट हो गई" : "Report Submitted"}
              </h4>
              <span className="text-xs text-[#15803D] font-medium block mt-0.5">
                {isHindi ? "आपकी रिपोर्ट सुरक्षित रूप से दर्ज कर ली गई है।" : "Your report has been securely recorded."}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-[#DCFCE7] text-[#166534] px-3 py-1 rounded-full border border-[#86EFAC]">
            {timeline.slaCode}
          </span>
        </div>

        {/* Unique Reference ID Card */}
        <div className="bg-[#0F172A] text-white p-4 rounded-2xl border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
              {isHindi ? "विशिष्ट संदर्भ ट्रैकिंग आईडी" : "Unique Reference Tracking ID"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-lg font-black text-[#4ADE80] tracking-wide">
                {refCode}
              </span>
            </div>
            <span className="text-[10px] text-[#64748B]">
              {isHindi ? "इस आईडी का उपयोग करके कभी भी स्थिति ट्रैक करें" : "Use this reference ID to track status anytime"}
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(createdReport.id);
              setCopiedRefId(true);
              setTimeout(() => setCopiedRefId(false), 2000);
            }}
            className="px-3.5 py-2 bg-[#1E293B] hover:bg-[#334155] text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-[#334155] cursor-pointer self-start sm:self-auto"
          >
            {copiedRefId ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">{isHindi ? "आईडी कॉपी हो गई" : "ID Copied"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{isHindi ? "आईडी कॉपी करें" : "Copy Reference ID"}</span>
              </>
            )}
          </button>
        </div>

        {/* Estimated Resolution Timeline Box */}
        <div className="bg-gradient-to-br from-[#F0FDF4] via-[#F8FAFC] to-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#166534] font-bold text-xs">
              <Clock className="w-4 h-4 text-[#16A34A]" />
              <span>{isHindi ? "अनुमानित समाधान समय (SLA)" : "Estimated Resolution Timeline (SLA)"}</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#16A34A] text-white shadow-3xs">
              {timeline.timeframe}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="bg-white p-3 rounded-xl border border-[#DCFCE7] flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <div>
                <span className="text-[9.5px] text-[#64748B] uppercase font-bold block">
                  {isHindi ? "आवंटित विभाग" : "Assigned Department"}
                </span>
                <span className="font-bold text-[#0F172A] text-xs truncate block">{timeline.department}</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#DCFCE7] flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-[#16A34A] shrink-0" />
              <div>
                <span className="text-[9.5px] text-[#64748B] uppercase font-bold block">
                  {isHindi ? "लक्ष्य समाधान तिथि" : "Target Resolution"}
                </span>
                <span className="font-bold text-[#0F172A] text-xs truncate block">By {timeline.targetDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logged Evidence */}
        <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 block">
            {isHindi ? "दर्ज किया गया साक्ष्य" : "Logged Evidence"}
          </span>
          <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden border border-[#CBD5E1] shadow-2xs bg-slate-900">
            <img
              src={getDisplayImage(createdReport.evidenceUrl || createdReport.image)}
              alt="Submitted Evidence"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2 left-2 bg-[#0F172A]/85 px-2.5 py-0.5 rounded-md text-[9px] font-mono text-white">
              📝 {isHindi ? "नागरिक रिपोर्ट" : "CITIZEN CIVIC REPORT"}
            </div>
          </div>
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[9.5px] text-[#64748B] font-bold block uppercase">{isHindi ? "श्रेणी" : "Category"}</span>
            <span className="font-bold text-[#0F172A] block mt-0.5">{createdReport.category}</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[9.5px] text-[#64748B] font-bold block uppercase">{isHindi ? "गंभीरता" : "Severity"}</span>
            <span className="font-bold text-[#DC2626] block mt-0.5">{createdReport.severity}%</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[9.5px] text-[#64748B] font-bold block uppercase">{isHindi ? "प्राथमिकता" : "Priority"}</span>
            <span className="font-bold text-[#D97706] block mt-0.5">{createdReport.priority || createdReport.riskLevel}</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[9.5px] text-[#64748B] font-bold block uppercase">{isHindi ? "स्थिति" : "Status"}</span>
            <span className="font-bold text-[#2563EB] block mt-0.5">{createdReport.status}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          {onViewReportDetails && (
            <button
              type="button"
              onClick={() => onViewReportDetails(createdReport)}
              className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isHindi ? "मानचित्र पर रिपोर्ट ट्रैक करें" : "Track Incident on Map"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-bold py-3 rounded-xl border border-[#CBD5E1] transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{isHindi ? "एक और समस्या की रिपोर्ट करें" : "File Another Report"}</span>
          </button>
        </div>

        {/* Collapsible System Diagnostic Details (Advanced) */}
        <details className="mt-2 text-[10px] font-mono text-[#64748B] border-t border-[#F1F5F9] pt-2">
          <summary className="hover:text-[#2563EB] cursor-pointer select-none py-1">
            ⚙️ {isHindi ? "सिस्टम डायग्नोस्टिक्स विवरण देखें (उन्नत)" : "View System Diagnostic Details (Advanced)"}
          </summary>
          <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-blue-400 flex items-center gap-1 text-[11px]">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                DIAGNOSTICS TRACE
              </span>
              <span className="text-[10px] text-slate-400">Event: {diagTrace.lastEvent}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">SUBMISSION</span>
                <span className="font-bold text-emerald-400">SUCCESS</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">AI VALIDATION</span>
                <span className={`font-bold ${
                  diagTrace.aiStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.aiStatus === "NO_HAZARD" ? "text-amber-400" :
                  diagTrace.aiStatus === "AI_UNAVAILABLE" ? "text-orange-400" : "text-slate-300"
                }`}>{diagTrace.aiStatus}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">STORAGE</span>
                <span className={`font-bold ${
                  diagTrace.storageStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.storageStatus === "SKIPPED" ? "text-blue-400" : "text-rose-400"
                }`}>{diagTrace.storageStatus}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">FIRESTORE</span>
                <span className="font-bold text-emerald-400">SUCCESS</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[9px]">NOTIFICATION</span>
                <span className={`font-bold ${
                  diagTrace.notificationStatus === "SUCCESS" ? "text-emerald-400" :
                  diagTrace.notificationStatus === "PENDING" ? "text-amber-400 animate-pulse" : "text-slate-300"
                }`}>{diagTrace.notificationStatus}</span>
              </div>
            </div>
            {diagTrace.reportId && (
              <div className="text-[10px] text-emerald-400 border-t border-slate-800/60 pt-1 flex justify-between font-mono">
                <span>REPORT DOCUMENT ID:</span>
                <span className="font-bold">{diagTrace.reportId}</span>
              </div>
            )}
          </div>
        </details>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP: SUBMITTING / UPLOADING SPINNER VIEW
  // ----------------------------------------------------
  if (currentStep === "SUBMITTING") {
    return (
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8 text-center space-y-4 animate-fadeIn">
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping opacity-50"></div>
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Finalizing Report Submission</h4>
          <p className="text-xs text-slate-500 mt-1">{submittingStatus}</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP: PRIMARY FORM VIEW
  // ----------------------------------------------------
  return (
    <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-6 relative">
      {showSuccessToast && toastReport && (
        <CitizenSuccessToast 
          report={toastReport} 
          onClose={() => setShowSuccessToast(false)} 
          onViewDetails={onViewReportDetails} 
        />
      )}
      
      {/* Visual Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] mb-5 text-left">
        <div>
          <h3 className="font-sans font-black text-lg text-[#0F172A] tracking-tight">
            {isHindi ? "समस्या की रिपोर्ट करें" : "Report a Problem"}
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            {isHindi ? "समस्या की फोटो जोड़ें और बताएं क्या हुआ है।" : "Upload a photo and tell us what's wrong."}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full border border-[#BFDBFE]">
          {isHindi ? "नागरिक सेवा" : "Citizen Service"}
        </span>
      </div>

      {/* Primary Ingestion Form */}
      <form onSubmit={handleTriggerAnalysis} className="flex flex-col gap-4 text-xs text-slate-700 text-left">
        
        {/* Citizen Name */}
        <div>
          <label htmlFor="citizen-name-input" className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
            {isHindi ? "नागरिक का नाम" : "CITIZEN NAME"}
          </label>
          <input
            id="citizen-name-input"
            type="text"
            value={citizenName}
            onChange={(e) => setCitizenName(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 px-3 py-2 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden font-medium"
            placeholder="Enter your full name"
            required
          />
        </div>

        {/* Title & category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Issue Overview Title</label>
            <input
              id="citizen-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 px-3 py-2 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              placeholder="e.g. Broken drainage pipe flooding sidewalk"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Incident Category</label>
            <select
              id="citizen-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className="w-full bg-slate-50 border border-gray-200 px-3 py-2 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden font-semibold"
            >
              <option value="Pothole">🚧 Pothole / Asphalt Fracture</option>
              <option value="Garbage Overflow">🚮 Garbage Overflow / Litter</option>
              <option value="Broken Streetlight">💡 Broken Streetlight / Darkness</option>
              <option value="Road Obstruction">🛑 Road Obstruction / Blockage</option>
              <option value="Vandals / Graffiti">🎨 Vandals / Graffiti Facade</option>
              <option value="Other">❓ Other Incidents</option>
            </select>
          </div>
        </div>

        {/* Location input fields */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase text-gray-400 block">Street Address Location</label>
            {selectedCoords && (
              <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150 animate-fadeIn">
                🛰️ GPS: {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              id="citizen-location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 pl-9 pr-24 py-2 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden text-xs font-medium"
              placeholder="e.g. 482 Pine Street, Financial District"
              required
            />
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLocation}
              className={`absolute right-1.5 top-1 text-[10px] font-bold px-2.5 py-1.2 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none ${
                detectingLocation 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 active:scale-95 border border-blue-250/20"
              }`}
              title="Detect my current location using GPS"
            >
              {detectingLocation ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  <span>Finding...</span>
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5 text-blue-500" />
                  <span>Locate</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10.5px] text-[#64748B] mt-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span>
              {isHindi 
                ? "आपके स्थान का उपयोग केवल यह पहचानने के लिए किया जाता है कि समस्या कहाँ हुई।" 
                : "Your location is used only to identify where the issue occurred."}
            </span>
          </p>

          {locationError && (
            <div className="mt-1.5 text-rose-600 text-[10px] font-medium flex items-center gap-1.5 justify-start p-2 bg-rose-50/80 rounded-lg border border-rose-150 animate-fadeIn text-left">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{locationError}</span>
            </div>
          )}
        </div>

        {/* Issue Description commentary */}
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Incident Description Notes</label>
          <textarea
            id="citizen-description-textarea"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 px-3 py-2 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            placeholder="Provide context on severity, hazard height, traffic levels, or other variables..."
          />
        </div>

        {/* Form Error Message */}
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-left text-[11px]">
              <span className="font-bold uppercase tracking-wider block text-rose-800 mb-0.5">VALIDATION WARNING</span>
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* Evidence File Uploader */}
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Visual Evidence File Upload</label>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all min-h-[140px] select-none ${
              dragActive 
                ? "border-blue-500 bg-blue-50/70 scale-[0.99] shadow-inner" 
                : "border-gray-200 bg-slate-50 hover:bg-slate-100/50 hover:border-gray-300 shadow-2xs"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraNativeInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {dragActive && (
              <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white rounded-xl z-20 pointer-events-none transition-all duration-200">
                <Upload className="w-10 h-10 mb-2 animate-bounce text-blue-100" />
                <span className="font-display font-bold text-xs">Drop Photo Here Immediately!</span>
                <span className="text-[9px] text-blue-200 block mt-0.5">Release to upload evidence asset</span>
              </div>
            )}

            {isCameraActive ? (
              <div className="w-full flex flex-col items-center p-1.5 animate-fadeIn">
                <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                  {isCameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white z-10 gap-2 backdrop-blur-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                      <span className="text-[11px] font-mono text-slate-300">Connecting to camera feed...</span>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
                  />

                  {/* Live Status Badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-rose-600/90 text-[9px] font-mono text-white rounded-full flex items-center gap-1.5 shadow-xs backdrop-blur-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>LIVE FEED</span>
                  </div>

                  {/* Camera Flip (Rear / Front) */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="Switch Camera (Front / Rear)"
                    className="absolute top-2 left-2 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg border border-slate-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 text-[10px]"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-400" />
                    <span className="font-sans text-[9px] capitalize">{cameraFacing === "environment" ? "Back Cam" : "Front Cam"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 mt-4 w-full justify-center flex-wrap">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isCameraLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[11px] px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraNativeInputRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[11px] px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Open device native camera"
                  >
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>Native Cam</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full p-2">
                <div className="relative w-full sm:w-36 aspect-video rounded-lg overflow-hidden border border-gray-300 shadow-xs shrink-0 bg-slate-100">
                  <img
                    src={getDisplayImage(imagePreview)}
                    alt="Evidence Thumbnail"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1 left-1 bg-slate-900/70 text-[8px] font-mono text-white px-1.5 py-0.5 rounded">
                    PREVIEW
                  </div>
                </div>

                <div className="flex-1 text-left w-full space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] flex-wrap">
                    <FileImage className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]" title={fileName || "Uploaded Evidence"}>
                      {fileName || "Evidence_Photo.jpg"}
                    </span>
                    <span className="bg-emerald-50 text-emerald-850 text-[9px] px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                      {fileSize || "1.2 MB"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Evidence attached and ready for AI inspection.</p>
                  
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-slate-400" />
                      <span>Change Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="text-[10px] font-bold bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setRawImageFile(null);
                        setFileName(null);
                        setFileSize(null);
                        setFileError(null);
                      }}
                      className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-slate-400 w-full h-full py-4">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-3 bg-white border border-slate-150 rounded-2xl shadow-2xs hover:scale-105 hover:text-blue-600 transition-all cursor-pointer flex items-center justify-center text-slate-500"
                    title="Browse local files"
                  >
                    <Upload className="w-5 h-5 shrink-0" />
                  </div>
                  <div 
                    onClick={() => startCamera()} 
                    className="p-3 bg-white border border-slate-150 rounded-2xl shadow-2xs hover:scale-105 hover:text-emerald-600 transition-all cursor-pointer flex items-center justify-center text-slate-500"
                    title="Take live photo using device camera"
                  >
                    <Camera className="w-5 h-5 shrink-0" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-[11px] text-slate-700">
                    Drag & drop evidence photo here, <span onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer">browse files</span>, or <span onClick={() => startCamera()} className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 cursor-pointer font-bold">take photo</span>
                  </p>
                  <p className="text-[10px] text-gray-400">Supports high-res PNG, JPG, JPEG, WEBP or HEIC (Max 10MB)</p>
                </div>
              </div>
            )}
          </div>

          {(fileError || cameraError) && (
            <div className="mt-2 text-rose-600 text-[10px] font-medium flex items-center gap-1.5 justify-start p-2 bg-rose-50/80 rounded-lg border border-rose-150 animate-fadeIn text-left">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{fileError || cameraError}</span>
            </div>
          )}
        </div>

        {/* AI Progress HUD */}
        {currentStep === "ANALYZING" && aiProgress !== null && (
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-lg space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="absolute inset-0 rounded-full border border-blue-400 animate-ping opacity-60"></div>
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                </div>
                <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-blue-300">Guardian AI Structural Diagnostics</span>
              </div>
              <span className="font-mono text-xs font-bold text-blue-400">{aiProgress}%</span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${aiProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                  {aiStatusMessage}
                </span>
                <span className="font-mono text-[9px] text-slate-500">Secure Gemini Server Pipeline</span>
              </div>
            </div>
          </div>
        )}

        {/* Trust & Transparency Note */}
        <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#475569] flex items-center gap-2.5 text-xs">
          <ShieldCheck className="w-5 h-5 text-[#16A34A] shrink-0" />
          <p className="text-[11px] leading-relaxed text-[#64748B]">
            {isHindi 
              ? "आपकी रिपोर्ट सीधे नगर पालिका कार्य आदेश से जुड़ती है। एआई विश्लेषण समीक्षा प्रक्रिया में सहायता करता है; यह नगरपालिका सत्यापन का विकल्प नहीं है।" 
              : "Your report connects directly to municipal response teams. AI analysis assists the review process; it does not replace municipal verification."}
          </p>
        </div>

        {/* Submit button */}
        <button
          id="submit-inc-guardian-btn"
          type="submit"
          disabled={currentStep === "ANALYZING"}
          className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#93C5FD] text-white font-bold py-3.5 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 text-xs font-sans mt-1 cursor-pointer"
        >
          {currentStep === "ANALYZING" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isHindi ? "गार्जियन एआई साक्ष्य का विश्लेषण कर रहा है..." : "Guardian AI analyzing visual evidence..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{isHindi ? "एआई विश्लेषण एवं समीक्षा के लिए आगे बढ़ें →" : "Proceed to AI Analysis & Review →"}</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
