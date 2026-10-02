import { useState } from "react";
import { Shield, Bell, LogOut, User as UserIcon, RefreshCw, Layers, Check } from "lucide-react";
import { User, Notification } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";
import { UrbanPulseLogo } from "./UrbanPulseLogo";


function getRelativeTime(dateString: string, isHindi: boolean = false) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return isHindi ? "अभी" : "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return isHindi ? `${diffInMinutes} मिनट पहले` : `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return isHindi ? `${diffInHours} घंटे पहले` : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return isHindi ? "कल" : "Yesterday";
  
  return isHindi ? `${diffInDays} दिन पहले` : `${diffInDays} days ago`;
}

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  notifications: Notification[];
  onMarkNotificationsRead: () => Promise<void> | void;
  onTriggerNotificationClick: (notif: Notification) => void;
  appOnline: boolean;
}

export default function Header({
  currentUser,
  onLogout,
  notifications,
  onMarkNotificationsRead,
  onTriggerNotificationClick,
  appOnline
}: HeaderProps) {
  const { t, isHindi } = useLanguage();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [readAllError, setReadAllError] = useState<string | null>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header id="header-bar" className="sticky top-0 z-[1100] w-full bg-white/95 border-b border-gray-200 shadow-xs backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Branding & Logo */}
        <div className="flex items-center gap-3">
          <UrbanPulseLogo className="w-9 h-9 sm:w-10 sm:h-10" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg text-slate-800 tracking-tight">{t('app.title', 'URBANPULSE')}</span>
              <span className="font-display font-bold text-lg text-blue-600 tracking-tight">{t('app.subtitle', 'GUARDIAN AI')}</span>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 -mt-0.5">{t('app.tagline', 'City Operating System v4.2.0')}</p>
          </div>
        </div>

        {/* Dynamic Center System Status Bar */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
            <div className={`w-2 h-2 rounded-full ${appOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
            <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">
              {appOnline ? t('app.online', 'SYSTEMS ONLINE') : t('app.offline', 'DISCONNECTED')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('app.hqNode', 'HQ Command Node')}</span>
          </div>
        </div>

        {/* User profile actions & notifications */}
        <div className="flex items-center gap-2 sm:gap-2.5">

          {/* Language Toggle */}
          <LanguageToggle />

          {/* Notification dropdown trigger */}
          <div className="relative">
            <button
              id="notif-bell-btn"
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
              }}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={t('alerts.realtime', 'Alerts')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4.5 h-4.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications panel */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-100 overflow-hidden animate-in fade-in duration-100">
                <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-xs text-slate-800">{t('alerts.realtime', 'Alerts')}</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-700 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  
                  {/* Read All Button */}
                  <button
                    id="btn-header-read-all"
                    onClick={async () => {
                      if (unreadCount === 0 || isMarkingRead) return;
                      setIsMarkingRead(true);
                      setReadAllError(null);
                      try {
                        await onMarkNotificationsRead();
                      } catch (e) {
                        setReadAllError(t('alerts.readAllError', 'Unable to mark alerts as read. Please try again.'));
                        setTimeout(() => setReadAllError(null), 5000);
                      } finally {
                        setIsMarkingRead(false);
                      }
                    }}
                    disabled={unreadCount === 0 || isMarkingRead}
                    className={`text-xs font-bold px-2 py-0.5 rounded transition-all shrink-0 ${
                      unreadCount === 0
                        ? "text-slate-400 opacity-60 cursor-not-allowed bg-transparent"
                        : isMarkingRead
                        ? "text-blue-500 bg-blue-50 cursor-wait animate-pulse"
                        : "text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer active:scale-95"
                    }`}
                  >
                    {isMarkingRead ? t('alerts.markingRead', 'Marking as read...') : t('alerts.readAll', 'Read All')}
                  </button>
                </div>

                {readAllError && (
                  <div className="px-4 py-1.5 bg-red-50 text-red-700 text-[10px]">
                    {readAllError}
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">
                      {t('alerts.allCaughtUp', "You're all caught up.")}
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          onTriggerNotificationClick(notif);
                          setShowNotifDropdown(false);
                        }}
                        className={`p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                          !notif.read ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase ${
                            notif.type === "alert_high_severity" ? "text-red-600" : "text-blue-600"
                          }`}>
                            {notif.type === "alert_high_severity" ? t('alerts.criticalRisk', 'Critical Alert') : t('alerts.updated', 'Update')}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {getRelativeTime(notif.createdAt, isHindi)}
                          </span>
                        </div>
                        <h5 className="font-semibold text-xs text-slate-800 line-clamp-1">{notif.title}</h5>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-300">|</span>

          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* User badge */}
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.fullName}
                    className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-3">{currentUser.fullName}</div>
                  <div className="text-[9px] font-medium text-slate-500">
                    {currentUser.role === "admin" ? `🗺️ ${t('role.municipalDesc', 'Municipality Director')}` : `👷 ${t('role.citizenDesc', 'Citizen Responder')}`}
                  </div>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title={t('user.logout', 'Logout')}
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{t('user.notLoggedIn', 'Not Logged In')}</span>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
