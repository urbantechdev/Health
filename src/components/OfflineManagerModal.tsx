import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  Database, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  X, 
  ShieldCheck, 
  Clock, 
  Smartphone, 
  Monitor,
  Info,
  BellRing,
  BellOff,
  Zap,
  Send
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { PWAInstallGuideModal } from "./PWAInstallGuideModal";
import { useWebPush } from "../hooks/useWebPush";
import { 
  PWASettings, 
  getLocalPwaSettings, 
  subscribePwaSettings, 
  forceSyncPwaSettingsFromCloud 
} from "../lib/pwaSettingsSyncService";
import { toast } from "../lib/promptService";

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onRefreshNetwork: () => Promise<void>;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  pendingSyncCount,
  onRefreshNetwork,
}) => {
  const pwaState = usePWAInstall();
  const { isInstalled, isIOS, install, openGuide, closeGuide, isGuideOpen } = pwaState;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [swRegistered, setSwRegistered] = useState(false);
  const [pwaSettings, setPwaSettings] = useState<PWASettings>(getLocalPwaSettings);
  const [isPwaSyncing, setIsPwaSyncing] = useState(false);
  const { isSubscribed, isSubscribing, isTesting, subscribe, unsubscribe, sendTest, status } = useWebPush();

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribePwaSettings((settings) => {
      setPwaSettings(settings);
    });
    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        setSwRegistered(registrations.length > 0);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onRefreshNetwork();
      setLastSyncTime(new Date().toLocaleTimeString());
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      openGuide();
    } else {
      await install();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between text-white ${isOnline ? "bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800" : "bg-gradient-to-r from-amber-700 via-amber-600 to-orange-700"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOnline ? "bg-emerald-600/50" : "bg-amber-600/50"} border border-white/20 shadow-inner`}>
              {isOnline ? <Wifi className="w-6 h-6 text-white" /> : <WifiOff className="w-6 h-6 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">Offline Capacity & Cloud Sync</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isOnline ? "bg-emerald-500/30 border border-emerald-300/40 text-emerald-100" : "bg-amber-400 text-amber-950 font-bold"}`}>
                  {isOnline ? "Online Live" : "Offline Storage Active"}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Hospital local persistence engine & standalone app installation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-gray-700 text-sm">
          
          {/* Status Alert Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isOnline 
              ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
            <div className={`p-2 rounded-lg shrink-0 ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {isOnline ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">
                {isOnline 
                  ? "Cloud Network Connected & Synchronized" 
                  : "Zero Internet Detected — Full Offline Continuity Enabled"}
              </h4>
              <p className="text-xs mt-1 leading-relaxed text-gray-600">
                {isOnline
                  ? "All departmental records, patient encounters, triage vitals, tickets, and pharmacy transactions are continuously synchronized with Cloud Firestore."
                  : "You can safely continue registering patients, recording doctor notes, dispensing prescriptions, and calling tickets. Every action is saved locally in IndexedDB and will automatically sync once internet returns."}
              </p>
            </div>
          </div>

          {/* 3 Core Offline Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pillar 1: Firestore Offline Cache */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>IndexedDB Cache</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Local database keeps hospital records instantly queryable across all browser tabs without internet.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Multi-Tab Cache Active</span>
              </div>
            </div>

            {/* Pillar 2: App Shell Cache (PWA) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold">
                <HardDrive className="w-4 h-4 text-teal-600" />
                <span>Service Worker</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Pre-caches UI bundles, layouts, fonts, and assets so the HMIS loads even with zero connection.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-teal-800 bg-teal-100/60 px-2 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{swRegistered ? "Cached & Ready" : "Pre-Caching Enabled"}</span>
              </div>
            </div>

            {/* Pillar 3: Pending Queue */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Sync Queue</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Pending document mutations queued in browser memory awaiting cloud acknowledgment.
              </p>
              <div className="flex items-center justify-between text-[11px] font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-800">
                <span>Queued writes:</span>
                <span className="font-bold font-mono text-xs">{pendingSyncCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Bar: Manual Sync & Install PWA */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-medium text-xs hover:bg-emerald-800 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Synchronizing Cloud..." : "Force Sync Cloud Network"}</span>
              </button>
              <span className="text-[11px] text-gray-500">
                Last checked: <span className="font-mono">{lastSyncTime}</span>
              </span>
            </div>

            {/* In-App PWA Install */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 active:scale-95 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Install HMIS App (Offline Standalone)</span>
              </button>
            )}

            {isInstalled && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                <Monitor className="w-3.5 h-3.5 text-emerald-600" />
                <span>Installed as Standalone App</span>
              </div>
            )}
          </div>

          {/* PWA Manifest & Cloud Synchronization Diagnostic */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  PWA Manifest & Cloud Settings Sync
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                Firestore: system_settings/pwa_config
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-300 p-0.5 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: pwaSettings.backgroundColor || "#0B1528" }}
                >
                  <img
                    src={pwaSettings.logoUrl}
                    alt="PWA App Icon"
                    className="w-full h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{pwaSettings.appName}</div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2">
                    <span>Short Name: <span className="font-mono font-bold text-emerald-800">{pwaSettings.shortName}</span></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Theme: 
                      <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: pwaSettings.themeColor }} />
                      <span className="font-mono">{pwaSettings.themeColor}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isPwaSyncing}
                onClick={async () => {
                  setIsPwaSyncing(true);
                  try {
                    await forceSyncPwaSettingsFromCloud();
                    toast.success("PWA settings and Web App Manifest successfully synced with Cloud Firestore!", "PWA Synced");
                  } catch {
                    toast.error("Failed to sync PWA settings from Cloud.", "Sync Error");
                  } finally {
                    setTimeout(() => setIsPwaSyncing(false), 500);
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPwaSyncing ? "animate-spin" : ""}`} />
                <span>{isPwaSyncing ? "Syncing..." : "Sync PWA Settings"}</span>
              </button>
            </div>
          </div>

          {/* Native Web Push Notifications Card */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                  Native Web Push Notifications (Zero OneSignal)
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                isSubscribed ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
              }`}>
                {isSubscribed ? "Registered • Active" : "Not Registered"}
              </span>
            </div>

            <p className="text-xs text-teal-950/80 leading-relaxed">
              Receive real-time emergency trauma calls, pharmacy drug stock warnings, and stat lab results directly to your phone screen even when HMIS is closed.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!isSubscribed ? (
                <button
                  type="button"
                  disabled={isSubscribing}
                  onClick={subscribe}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{isSubscribing ? "Registering..." : "Enable Push on this Device"}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={sendTest}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTesting ? "Firing..." : "Test Push Alert"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubscribing}
                    onClick={unsubscribe}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                    <span>Disable Push</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Practical Guidelines for Healthcare Staff */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4 text-slate-600" />
              <span>Hospital Staff Offline Protocol</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong>Do not clear browser cookies or site cache</strong> during an outage, as pending local writes are stored safely in local IndexedDB.
              </li>
              <li>
                <strong>Perform clinical workflows normally</strong>: Triage, Doctor Consultations, Laboratory Requests, Dispensing, and Admissions record locally without error dialogs.
              </li>
              <li>
                <strong>Voice announcements on Big Screen</strong> will continue speaking ticket numbers normally without needing cloud audio synthesis.
              </li>
              <li>
                <strong>Automatic reconciliation</strong>: The moment internet or Wi-Fi connectivity returns, the system automatically flushes the offline queue upstream to Cloud Firestore with zero manual import steps.
              </li>
            </ul>
          </div>

          {/* PWA Guided Installation Modal */}
          <PWAInstallGuideModal
            isOpen={isGuideOpen}
            onClose={closeGuide}
            pwaState={pwaState}
          />

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tassia Hill Hospital HMIS • Offline Resilience Engine v2.4</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-medium text-gray-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
