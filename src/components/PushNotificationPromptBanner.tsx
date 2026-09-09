import React, { useState, useEffect } from "react";
import { BellRing, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { useWebPush } from "../hooks/useWebPush";

interface PushNotificationPromptBannerProps {
  currentUser?: {
    name?: string;
    role?: string;
    department?: string;
  };
}

export const PushNotificationPromptBanner: React.FC<PushNotificationPromptBannerProps> = ({
  currentUser,
}) => {
  const { status, isSubscribed, subscribe, isSubscribing } = useWebPush({
    name: currentUser?.name || "Medical Staff",
    role: currentUser?.role || "Staff",
    department: currentUser?.department || "General",
  });

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only show if supported, not already subscribed, not in iOS non-standalone state (to avoid prompting before home screen)
    if (typeof window === "undefined") return;

    const hasDismissed = sessionStorage.getItem("hmis_push_prompt_dismissed");
    if (!hasDismissed && status.isSupported && !isSubscribed && !status.requiresHomeScreen) {
      // Delay showing for 2.5 seconds after page load for pleasant UX
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status.isSupported, isSubscribed, status.requiresHomeScreen]);

  if (dismissed || isSubscribed || !status.isSupported || status.requiresHomeScreen) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem("hmis_push_prompt_dismissed", "true");
    setDismissed(true);
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <aside
      aria-label="Native Push Notifications"
      id="push-notification-banner"
      className="fixed bottom-20 right-4 z-40 max-w-md w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-emerald-200 dark:border-emerald-800/50 p-4 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
          <BellRing className="w-5 h-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Critical Hospital Updates</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Native Push
              </span>
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Allow phone notifications to receive real-time trauma triage alerts, drug stock shortages, and stat lab results even when HMIS is closed.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubscribing ? "Enabling..." : "Allow Notifications"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
