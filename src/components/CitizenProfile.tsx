import React, { useState, useEffect, useRef } from "react";
import { 
  User, Mail, Phone, Calendar, MapPin, HeartHandshake, Bell, 
  ShieldCheck, Camera, Trash2, Edit3, Save, X, CheckCircle2, 
  AlertTriangle, Loader2, Sparkles, Navigation, Check, Info, AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { UserProfile, CitizenAddress, EmergencyContact, NotificationPreferences } from "../types";
import { uploadCitizenAvatar } from "../services/storageService";
import { calculateProfileCompletion } from "../services/firestoreService";

interface CitizenProfileProps {
  onBackToOverview?: () => void;
}

export const CitizenProfile: React.FC<CitizenProfileProps> = ({ onBackToOverview }) => {
  const { userProfile, user, updateUserProfile } = useAuth();
  const { t, isHindi } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form State
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // Address State
  const [address, setAddress] = useState<CitizenAddress>({
    house: "",
    street: "",
    city: "",
    state: "",
    pinCode: "",
    landmark: ""
  });

  // Emergency Contact State
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: "",
    relationship: "",
    phone: ""
  });

  // Notification Preferences State
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    reportStatusUpdates: true,
    municipalUpdates: true,
    emergencyAlerts: true
  });

  // Synchronize state from userProfile
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || userProfile.name || userProfile.displayName || "");
      setPhoneNumber(userProfile.phoneNumber || userProfile.phone || "");
      setDateOfBirth(userProfile.dateOfBirth || "");
      setGender(userProfile.gender || "");
      setPhotoURL(userProfile.photoURL || null);

      if (userProfile.address) {
        setAddress({
          house: userProfile.address.house || "",
          street: userProfile.address.street || "",
          city: userProfile.address.city || "",
          state: userProfile.address.state || "",
          pinCode: userProfile.address.pinCode || "",
          landmark: userProfile.address.landmark || ""
        });
      }

      if (userProfile.emergencyContact) {
        setEmergencyContact({
          name: userProfile.emergencyContact.name || "",
          relationship: userProfile.emergencyContact.relationship || "",
          phone: userProfile.emergencyContact.phone || ""
        });
      }

      if (userProfile.notificationPreferences) {
        setNotificationPreferences({
          reportStatusUpdates: userProfile.notificationPreferences.reportStatusUpdates ?? true,
          municipalUpdates: userProfile.notificationPreferences.municipalUpdates ?? true,
          emergencyAlerts: userProfile.notificationPreferences.emergencyAlerts ?? true
        });
      }
    }
  }, [userProfile]);

  // Derived Citizen ID & Completion
  const citizenId = userProfile?.citizenId || (userProfile?.uid ? `CIT-${userProfile.uid.slice(0, 8).toUpperCase()}` : "CIT-84729103");
  const completionStats = calculateProfileCompletion({
    fullName,
    email: userProfile?.email || user?.email || "",
    phoneNumber,
    photoURL,
    address,
    emergencyContact
  });

  // Dismiss Toast auto-timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size before uploading
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setToastMessage({ type: "error", text: "Invalid format. Only JPEG, PNG, or WebP images are supported." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage({ type: "error", text: "Profile photo must be smaller than 5 MB." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const uid = userProfile?.uid || user?.uid;
    if (!uid) {
      setToastMessage({ type: "error", text: "Unable to upload: no authenticated user found." });
      return;
    }

    setUploadingPhoto(true);
    try {
      const res = await uploadCitizenAvatar(uid, file);
      if (res.success && res.photoURL) {
        setPhotoURL(res.photoURL);
        // Persist photoURL directly to profile
        await updateUserProfile({ photoURL: res.photoURL });
        setToastMessage({ type: "success", text: "Photo uploaded successfully." });
      } else {
        setToastMessage({ type: "error", text: res.error || "Unable to upload profile photo. Please try again." });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: "Unable to upload profile photo. Please try again." });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    setUploadingPhoto(true);
    try {
      setPhotoURL(null);
      await updateUserProfile({ photoURL: null });
      setToastMessage({ type: "success", text: "Profile photo removed." });
    } catch {
      setToastMessage({ type: "error", text: "Failed to remove photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 📍 Use Current Location for Address Assistant
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToastMessage({ type: "error", text: "Geolocation is not supported by your browser." });
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          // Query Nominatim reverse geocoder
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
          const res = await fetch(url, { headers: { "User-Agent": "UrbanPulse/1.0" } });
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            setAddress(prev => ({
              ...prev,
              street: addr.road || addr.suburb || addr.neighbourhood || prev.street,
              city: addr.city || addr.town || addr.county || addr.state_district || "Greater Noida",
              state: addr.state || "Uttar Pradesh",
              pinCode: addr.postcode || prev.pinCode
            }));
            setToastMessage({ 
              type: "success", 
              text: "Current location populated in form. Please verify and save changes." 
            });
          } else {
            setToastMessage({ type: "error", text: "Unable to retrieve address for coordinates." });
          }
        } catch {
          setToastMessage({ type: "error", text: "Location lookup service unavailable." });
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        setLocatingGps(false);
        setToastMessage({ type: "error", text: "Location permission denied. Please enter address manually." });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required.";
    }

    if (phoneNumber.trim() && !/^[0-9+\-\s()]{7,15}$/.test(phoneNumber.trim())) {
      errors.phoneNumber = "Please enter a valid mobile number (7-15 digits).";
    }

    if (emergencyContact.phone?.trim() && !/^[0-9+\-\s()]{7,15}$/.test(emergencyContact.phone.trim())) {
      errors.emergencyPhone = "Please enter a valid emergency contact phone number.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Changes
  const handleSave = async () => {
    if (!validateForm()) {
      setToastMessage({ type: "error", text: "Please correct the highlighted fields." });
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        fullName: fullName.trim(),
        name: fullName.trim(),
        displayName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        phone: phoneNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        photoURL,
        citizenId,
        address: {
          house: address.house?.trim() || "",
          street: address.street?.trim() || "",
          city: address.city?.trim() || "",
          state: address.state?.trim() || "",
          pinCode: address.pinCode?.trim() || "",
          landmark: address.landmark?.trim() || ""
        },
        emergencyContact: {
          name: emergencyContact.name?.trim() || "",
          relationship: emergencyContact.relationship?.trim() || "",
          phone: emergencyContact.phone?.trim() || ""
        },
        notificationPreferences,
        profileCompleted: completionStats.percentage,
        updatedAt: new Date().toISOString()
      };

      await updateUserProfile(updates);
      setIsEditing(false);
      setToastMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      console.error("Save profile error:", err);
      setToastMessage({ type: "error", text: "Unable to save profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // Cancel Changes
  const handleCancel = () => {
    // Revert form state back to userProfile
    if (userProfile) {
      setFullName(userProfile.fullName || userProfile.name || userProfile.displayName || "");
      setPhoneNumber(userProfile.phoneNumber || userProfile.phone || "");
      setDateOfBirth(userProfile.dateOfBirth || "");
      setGender(userProfile.gender || "");
      setPhotoURL(userProfile.photoURL || null);
      if (userProfile.address) setAddress({ ...userProfile.address });
      if (userProfile.emergencyContact) setEmergencyContact({ ...userProfile.emergencyContact });
      if (userProfile.notificationPreferences) setNotificationPreferences({ ...userProfile.notificationPreferences });
    }
    setValidationErrors({});
    setIsEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left pb-12 animate-in fade-in duration-300">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg text-xs font-bold transition-all ${
          toastMessage.type === "success" 
            ? "bg-emerald-500 text-white shadow-emerald-500/20" 
            : "bg-rose-500 text-white shadow-rose-500/20"
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              MY CITIZEN PROFILE
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal information and contact details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBackToOverview && (
            <button
              onClick={onBackToOverview}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer"
            >
              ← Overview
            </button>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Profile Header Card + Profile Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Profile Identity Card (8 cols) */}
        <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
          {/* Profile Photo Avatar & Actions */}
          <div className="relative group shrink-0 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border-2 border-indigo-400/40 overflow-hidden shadow-xl flex items-center justify-center relative">
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt={fullName || "Citizen Avatar"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-indigo-300">
                  <User className="w-12 h-12" />
                  <span className="text-[10px] font-mono font-bold mt-1 text-slate-300">NO PHOTO</span>
                </div>
              )}

              {/* Uploading Spinner Overlay */}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-60"
                title={photoURL ? "Replace photo" : "Upload photo"}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-3 h-3 text-indigo-300 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3 h-3 text-indigo-300" />
                    <span>{photoURL ? "Replace" : "Upload"}</span>
                  </>
                )}
              </button>

              {photoURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="p-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 rounded-lg text-[11px] transition border border-rose-500/30 cursor-pointer"
                  title="Remove photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Citizen Details Header Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 bg-blue-500 text-white rounded-md text-[10px] font-mono font-black uppercase tracking-wider shadow-xs">
                CITIZEN
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-mono font-bold uppercase">
                ACTIVE
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white font-display">
              {fullName || "Citizen Member"}
            </h2>

            <div className="space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-slate-400">Citizen ID:</span>
                <span className="font-bold text-indigo-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {citizenId}
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-200">{userProfile?.email || user?.email || "citizen@urbanpulse.org"}</span>
              </div>
              {phoneNumber && (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-slate-400">Mobile:</span>
                  <span className="text-slate-200">{phoneNumber}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-center sm:justify-start gap-4 text-[11px] text-slate-400">
              <span>Civic Points: <strong className="text-white">{userProfile?.points ?? 100}</strong></span>
              <span>•</span>
              <span>Reports Filed: <strong className="text-white">{userProfile?.reportsCount ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Profile Completion Indicator (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-wider">
                PROFILE COMPLETION
              </span>
              <span className="text-lg font-black text-blue-600 font-mono">
                {completionStats.percentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${completionStats.percentage}%` }}
              />
            </div>
          </div>

          {/* Breakdown checklist */}
          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-700">
              Completed:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {completionStats.completed.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{item}</span>
                </span>
              ))}
            </div>

            {completionStats.missing.length > 0 && (
              <>
                <div className="text-[11px] font-bold text-slate-500 mt-2">
                  Missing:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {completionStats.missing.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      <span>•</span>
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-[10px] text-slate-400 italic">
            Optional fields like emergency contacts are not mandatory to participate in civic reporting.
          </p>
        </div>

      </div>

      {/* Main Profile Sections Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. PERSONAL INFORMATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                PERSONAL INFORMATION
              </h3>
            </div>
            {!isEditing && (
              <span className="text-[10px] font-mono text-slate-400">Read-Only</span>
            )}
          </div>

          <div className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  {validationErrors.fullName && (
                    <span className="text-[10.5px] text-rose-600 mt-1 block font-medium">
                      {validationErrors.fullName}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {fullName || "Not provided"}
                </div>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mobile Number
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  {validationErrors.phoneNumber && (
                    <span className="text-[10.5px] text-rose-600 mt-1 block font-medium">
                      {validationErrors.phoneNumber}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {phoneNumber || "Not provided"}
                </div>
              )}
            </div>

            {/* Email Address (tied to authentication) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Email Address
                </label>
                <span className="text-[9.5px] font-mono text-slate-400">Authenticated Account</span>
              </div>
              <input
                type="email"
                value={userProfile?.email || user?.email || "citizen@urbanpulse.org"}
                disabled
                className="w-full text-xs font-semibold text-slate-500 bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Email is tied to your login identity for verification and audit trails.
              </span>
            </div>

            {/* Date of Birth & Gender (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Date of Birth <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {dateOfBirth || "Not provided"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Gender <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                {isEditing ? (
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {gender || "Not provided"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. ADDRESS INFORMATION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                ADDRESS INFORMATION
              </h3>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locatingGps}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Fill address fields using current GPS location"
              >
                <Navigation className={`w-3 h-3 text-emerald-600 ${locatingGps ? 'animate-spin' : ''}`} />
                <span>{locatingGps ? "Locating..." : "📍 Use Current Location"}</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  House / Flat / Building
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={address.house || ""}
                    onChange={e => setAddress(p => ({ ...p, house: e.target.value }))}
                    placeholder="e.g. Flat 402, Block B"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {address.house || "—"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Street / Locality
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={address.street || ""}
                    onChange={e => setAddress(p => ({ ...p, street: e.target.value }))}
                    placeholder="e.g. Knowledge Park III"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {address.street || "—"}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={address.city || ""}
                    onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. Greater Noida"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {address.city || "—"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">State</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={address.state || ""}
                    onChange={e => setAddress(p => ({ ...p, state: e.target.value }))}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {address.state || "—"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">PIN Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={address.pinCode || ""}
                    onChange={e => setAddress(p => ({ ...p, pinCode: e.target.value }))}
                    placeholder="e.g. 201310"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {address.pinCode || "—"}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Landmark <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={address.landmark || ""}
                  onChange={e => setAddress(p => ({ ...p, landmark: e.target.value }))}
                  placeholder="e.g. Near Pari Chowk Junction"
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                />
              ) : (
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {address.landmark || "—"}
                </div>
              )}
            </div>

            <p className="text-[10.5px] text-slate-400 italic pt-1">
              Your location is never silently stored. You must explicitly click Save Changes to persist address updates.
            </p>
          </div>
        </div>

        {/* 3. EMERGENCY CONTACT (OPTIONAL) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                EMERGENCY CONTACT <span className="text-[10px] text-slate-400 font-normal">(OPTIONAL)</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">SOS Notifications</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Emergency Contact Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={emergencyContact.name || ""}
                  onChange={e => setEmergencyContact(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rahul Singh"
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                />
              ) : (
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {emergencyContact.name || "None specified"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Relationship
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={emergencyContact.relationship || ""}
                    onChange={e => setEmergencyContact(p => ({ ...p, relationship: e.target.value }))}
                    placeholder="e.g. Brother / Parent / Spouse"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                  />
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {emergencyContact.relationship || "—"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Emergency Phone Number
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="tel"
                      value={emergencyContact.phone || ""}
                      onChange={e => setEmergencyContact(p => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. 98XXXXXXXX"
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-hidden focus:border-blue-500 transition"
                    />
                    {validationErrors.emergencyPhone && (
                      <span className="text-[10px] text-rose-600 mt-1 block">
                        {validationErrors.emergencyPhone}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {emergencyContact.phone || "—"}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 italic">
              Used strictly in urgent civil emergencies or verified SOS beacons initiated by your account.
            </p>
          </div>
        </div>

        {/* 4. COMMUNICATION PREFERENCES */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                COMMUNICATION PREFERENCES
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">UrbanPulse Alerts</span>
          </div>

          <div className="space-y-3">
            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
              isEditing ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
            } ${notificationPreferences.reportStatusUpdates ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}>
              <input
                type="checkbox"
                checked={notificationPreferences.reportStatusUpdates}
                disabled={!isEditing}
                onChange={e => setNotificationPreferences(p => ({ ...p, reportStatusUpdates: e.target.checked }))}
                className="mt-1 rounded accent-indigo-600"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Report status updates</span>
                <span className="text-[11px] text-slate-500">
                  Receive notifications when municipal squads verify, assign, or resolve issues filed by you.
                </span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
              isEditing ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
            } ${notificationPreferences.municipalUpdates ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}>
              <input
                type="checkbox"
                checked={notificationPreferences.municipalUpdates}
                disabled={!isEditing}
                onChange={e => setNotificationPreferences(p => ({ ...p, municipalUpdates: e.target.checked }))}
                className="mt-1 rounded accent-indigo-600"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Municipal response updates</span>
                <span className="text-[11px] text-slate-500">
                  Receive bulletins regarding civic repairs, infrastructure maintenance schedules, and ward reports.
                </span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
              isEditing ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
            } ${notificationPreferences.emergencyAlerts ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}>
              <input
                type="checkbox"
                checked={notificationPreferences.emergencyAlerts}
                disabled={!isEditing}
                onChange={e => setNotificationPreferences(p => ({ ...p, emergencyAlerts: e.target.checked }))}
                className="mt-1 rounded accent-indigo-600"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Emergency alerts</span>
                <span className="text-[11px] text-slate-500">
                  High-priority spatial alerts regarding severe weather, waterlogging, or critical structural hazards.
                </span>
              </div>
            </label>
          </div>
        </div>

      </div>

      {/* 5. CITIZEN ACCOUNT INFORMATION (READ-ONLY) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md text-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight font-mono">
              CITIZEN ACCOUNT INFORMATION
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">Authoritative System Ledger</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-mono">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Citizen ID</span>
            <strong className="text-indigo-400 font-bold text-sm">{citizenId}</strong>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Account Email</span>
            <strong className="text-slate-200 truncate block">{userProfile?.email || user?.email || "citizen@urbanpulse.org"}</strong>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Account Created</span>
            <strong className="text-slate-200">
              {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "Active Member"}
            </strong>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Account Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>ACTIVE</span>
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">System Role</span>
            <strong className="text-blue-400 font-bold">CITIZEN</strong>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CitizenProfile;
