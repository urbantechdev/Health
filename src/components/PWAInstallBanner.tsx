import React, { useState, useEffect } from "react";
import { Smartphone, Download, X, Sparkles } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { PWAInstallGuideModal } from "./PWAInstallGuideModal";

const BANNER_DISMISS_KEY = "hmis_pwa_banner_dismissed_until";

export const PWAInstallBanner: React.FC = () => {
  const pwaState = usePWAInstall();
  const {
    isInstalled,
    isIOS,
    isIPhone,
    isAndroid,
    install,
    openGuide,
    closeGuide,
    isGuideOpen
  } = pwaState;

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Do not show if already running as standalone installed PWA
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    // Only show on mobile devices (iPhone, iPad, Android)
    const isMobile = isIOS || isAndroid || window.innerWidth < 768;
    if (!isMobile) {
      setIsVisible(false);
      return;
    }

    // Check if dismissed within the last 24 hours
    try {
      const dismissedUntil = localStorage.getItem(BANNER_DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsVisible(false);
        return;
      }
    } catch {
      // ignore storage error
    }

    // Delay 1.5s on mobile so the page renders smoothly first
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isInstalled, isIOS, isAndroid]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      // Dismiss for 24 hours
      const nextDismiss = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(BANNER_DISMISS_KEY, String(nextDismiss));
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      openGuide();
      return;
    }
    await install();
  };

  if (!isVisible || isInstalled) {
    return (
      <PWAInstallGuideModal
        isOpen={isGuideOpen}
        onClose={closeGuide}
        pwaState={pwaState}
      />
    );
  }

  return (
    <>
      <aside
        id="pwa-mobile-install-banner"
        aria-label="Install HMIS Mobile App"
        className="fixed bottom-0 left-0 right-0 z-40 p-2.5 sm:p-3 bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-teal-950/95 backdrop-blur-md border-t border-emerald-500/30 text-white shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* App Icon + Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shrink-0 shadow-xs border border-emerald-400/40 flex items-center justify-center">
              <img
                src="/apple-touch-icon.png"
                alt="HMIS Icon"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/pwa-192x192.png";
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  Install HMIS App
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-bold border border-emerald-400/30">
                  {isIPhone ? "iOS" : "PWA"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {isIPhone
                  ? "Tap to add to iPhone Home Screen (Offline ready)"
                  : "Install for 100% offline hospital access"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isIOS ? (
                <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>{isIPhone ? "Install on iPhone" : "Install"}</span>
            </button>

            <button
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <PWAInstallGuideModal
        isOpen={isGuideOpen}
        onClose={closeGuide}
        pwaState={pwaState}
      />
    </>
  );
};
