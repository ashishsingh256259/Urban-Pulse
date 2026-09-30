import React, { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";
import { ShieldAlert, Loader2, AlertCircle } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles, 
  fallback 
}) => {
  const { role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[350px] w-full flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <span className="text-xs font-mono font-medium tracking-wide">Validating Security Tokens & Role Clearances...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1 font-sans">Authentication Clearance Required</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Please log in with verified citizen or municipal credentials to access this protected urban terminal.
          </p>
        </div>
      )
    );
  }

  // Check role authorization strictly against allowedRoles
  const isAuthorized = allowedRoles.includes(role);

  if (!isAuthorized) {
    return (
      fallback || (
        <div className="min-h-[320px] w-full flex flex-col items-center justify-center p-8 bg-red-50/60 border border-red-200 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-red-900 mb-1 font-sans">Unauthorized Access Tier</h3>
          <p className="text-xs text-red-700 max-w-md mb-3">
            Your current role (<span className="font-mono font-bold uppercase">{role}</span>) does not possess permission clearance for this municipal command view.
          </p>
          <div className="text-[11px] font-mono text-slate-500 bg-white/80 border border-red-100 px-3 py-1.5 rounded-lg">
            Required Role Tier: {allowedRoles.join(" | ").toUpperCase()}
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};
