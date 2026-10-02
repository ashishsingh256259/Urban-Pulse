import React from "react";
import { 
  X, User, Mail, Phone, Calendar, MapPin, HeartHandshake, 
  Bell, ShieldCheck, Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { UserProfile } from "../types";
import { calculateProfileCompletion } from "../services/firestoreService";

interface AdminCitizenProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const AdminCitizenProfileModal: React.FC<AdminCitizenProfileModalProps> = ({
  user,
  onClose
}) => {
  if (!user) return null;

  const citizenId = user.citizenId || (user.uid ? `CIT-${user.uid.slice(0, 8).toUpperCase()}` : (user.id ? `CIT-${user.id.slice(0, 8).toUpperCase()}` : "CIT-84729103"));
  const completion = calculateProfileCompletion(user);
  const fullName = user.fullName || user.name || user.displayName || "Citizen Member";
  const phone = user.phone || user.phoneNumber || "Not provided";
  const email = user.email || "Not provided";
  const dob = user.dateOfBirth || "Not provided";
  const gender = user.gender || "Not provided";
  const address = user.address;
  const emergency = user.emergencyContact;
  const notif = user.notificationPreferences;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2000] overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-black tracking-tight font-display">
                CITIZEN PROFILE
              </h2>
              <span className="text-[10.5px] font-mono text-slate-400">
                Administrative Governance & Read-Only Audit Inspector
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto divide-y divide-slate-100">
          
          {/* Top Identity Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Photo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={fullName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-black text-slate-900">{fullName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  CITIZEN
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  user.active !== false 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}>
                  {user.status || (user.active !== false ? "ACTIVE" : "DEACTIVATED")}
                </span>
              </div>

              <div className="text-xs text-slate-600 font-mono space-y-0.5">
                <div>Citizen ID: <strong className="text-indigo-600">{citizenId}</strong></div>
                <div>Email: <span className="text-slate-800">{email}</span></div>
                <div>Phone: <span className="text-slate-800">{phone}</span></div>
              </div>

              <div className="pt-2 flex items-center justify-center sm:justify-start gap-3 text-[11px] font-mono text-slate-500">
                <span>Profile Completion: <strong className="text-blue-600">{completion.percentage}%</strong></span>
                <span>•</span>
                <span>Points: <strong className="text-emerald-600">{user.points || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* PERSONAL DETAILS */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-mono font-black uppercase text-slate-500 tracking-wider">
              PERSONAL DETAILS
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Date of Birth</span>
                <span className="font-semibold text-slate-800">{dob}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Gender</span>
                <span className="font-semibold text-slate-800">{gender}</span>
              </div>
            </div>
          </div>

          {/* ADDRESS */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-mono font-black uppercase text-slate-500 tracking-wider">
              ADDRESS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">House / Building</span>
                <span className="font-semibold text-slate-800">{address?.house || "—"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Locality / Street</span>
                <span className="font-semibold text-slate-800">{address?.street || "—"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">City & State</span>
                <span className="font-semibold text-slate-800">
                  {address?.city || address?.state ? `${address?.city || ""}, ${address?.state || ""}` : "—"}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">PIN Code & Landmark</span>
                <span className="font-semibold text-slate-800">
                  {address?.pinCode || "—"} {address?.landmark ? `(${address.landmark})` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* EMERGENCY CONTACT */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-mono font-black uppercase text-slate-500 tracking-wider">
              EMERGENCY CONTACT
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Contact Name</span>
                <span className="font-semibold text-slate-800">{emergency?.name || "None"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Relationship</span>
                <span className="font-semibold text-slate-800">{emergency?.relationship || "—"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Phone</span>
                <span className="font-semibold text-slate-800">{emergency?.phone || "—"}</span>
              </div>
            </div>
          </div>

          {/* ACCOUNT AUDIT */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-mono font-black uppercase text-slate-500 tracking-wider">
              ACCOUNT
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Created</span>
                <span className="font-semibold text-slate-800">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Last Updated</span>
                <span className="font-semibold text-slate-800">
                  {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Role</span>
                <span className="font-bold text-blue-700">CITIZEN</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Status</span>
                <span className="font-bold text-emerald-700">
                  {user.status || (user.active !== false ? "ACTIVE" : "DEACTIVATED")}
                </span>
              </div>
            </div>
          </div>

          {/* NOTIFICATION PREFERENCES */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-mono font-black uppercase text-slate-500 tracking-wider">
              NOTIFICATION PREFERENCES
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Report Updates:</span>
                <span className={`font-mono font-black text-xs ${
                  notif?.reportStatusUpdates !== false ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {notif?.reportStatusUpdates !== false ? "ON" : "OFF"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Emergency Alerts:</span>
                <span className={`font-mono font-black text-xs ${
                  notif?.emergencyAlerts !== false ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {notif?.emergencyAlerts !== false ? "ON" : "OFF"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Municipal Updates:</span>
                <span className={`font-mono font-black text-xs ${
                  notif?.municipalUpdates !== false ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {notif?.municipalUpdates !== false ? "ON" : "OFF"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 italic">
            Read-only administrative governance mode.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminCitizenProfileModal;
