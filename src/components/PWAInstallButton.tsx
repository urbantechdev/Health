import React from 'react';
import { Download, Check, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

export const PWAInstallButton: React.FC<{
  variant?: 'header' | 'compact' | 'full' | 'header-mobile' | 'sidebar';
  className?: string;
}> = ({ variant = 'header', className = '' }) => {
  const pwaState = usePWAInstall();
  const {
    isInstalled,
    isIOS,
    isIPhone,
    hasNativePrompt,
    install,
    openGuide,
    closeGuide,
    isGuideOpen
  } = pwaState;

  // If already running as an installed standalone PWA
  if (isInstalled) {
    if (variant === 'full' || variant === 'sidebar') {
      return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 ${className}`}>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>HMIS App Installed</span>
        </div>
      );
    }
    return null;
  }

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isIOS) {
      // On iOS, native prompt doesn't exist, open guide directly
      openGuide();
      return;
    }
    await install();
  };

  return (
    <>
      {variant === 'header-mobile' && (
        <button
          id="btn-pwa-install-mobile"
          onClick={handleAction}
          title={isIOS ? "Install HMIS on iPhone / iPad" : "Install HMIS to device"}
          className={`p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative ${className}`}
        >
          {isIOS ? (
            <Smartphone className="w-5 h-5 text-emerald-200" />
          ) : (
            <Download className="w-5 h-5 text-emerald-200" />
          )}
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {variant === 'header' && (
        <button
          id="btn-pwa-install-header"
          onClick={handleAction}
          title={isIOS ? "Install HMIS on iPhone Home Screen" : "Install HMIS Desktop/Mobile Application for offline access"}
          className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 active:scale-95 text-white text-xs font-semibold border border-emerald-400/40 shadow-xs transition duration-200 cursor-pointer ${className}`}
        >
          {isIOS ? (
            <Smartphone className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
          ) : (
            <Download className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
          )}
          <span>{isIPhone ? "Install on iPhone" : isIOS ? "Install on iPad" : "Install App"}</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          id="btn-pwa-install-compact"
          onClick={handleAction}
          className={`flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold transition cursor-pointer ${className}`}
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          id="btn-pwa-install-full"
          onClick={handleAction}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer ${className}`}
        >
          {isIOS ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          <span>{isIOS ? "Install on iPhone / iPad (iOS)" : hasNativePrompt ? "Install HMIS Application Now" : "Install App on this Device"}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          id="btn-pwa-install-sidebar"
          onClick={handleAction}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-600/30 text-emerald-100 text-xs font-medium transition cursor-pointer ${className}`}
        >
          {isIOS ? <Smartphone className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-emerald-400" />}
          <div className="text-left">
            <div className="font-semibold text-white">Install HMIS App</div>
            <div className="text-[10px] text-emerald-300/80">{isIOS ? "Add to iPhone Home Screen" : "Works offline on all browsers"}</div>
          </div>
        </button>
      )}

      {/* Global Interactive Installation Guide Modal */}
      <PWAInstallGuideModal
        isOpen={isGuideOpen}
        onClose={closeGuide}
        pwaState={pwaState}
      />
    </>
  );
};
