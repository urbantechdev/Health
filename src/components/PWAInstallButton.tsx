import React from 'react';
import { Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

export const WindowsLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Windows logo"
  >
    <path d="M0 3.449L9.75 2.1v9.451H0zM10.949 1.949L24 0v11.4H10.949zM0 12.6h9.75v9.451L0 20.699zM10.949 12.6H24V24l-13.051-1.899z" />
  </svg>
);

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
          title={isIOS ? "Install HMIS on iPhone / iPad" : "Install HMIS Windows / Mobile App"}
          className={`p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative ${className}`}
        >
          <WindowsLogo className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {variant === 'header' && (
        <button
          id="btn-pwa-install-header"
          onClick={handleAction}
          title={isIOS ? "Install HMIS on iPhone Home Screen" : "Install HMIS Windows Desktop App (Standalone Workstation)"}
          className={`relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
        >
          <WindowsLogo className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {variant === 'compact' && (
        <button
          id="btn-pwa-install-compact"
          onClick={handleAction}
          className={`flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold transition cursor-pointer ${className}`}
          title="Install HMIS Windows / Desktop App"
        >
          <WindowsLogo className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          id="btn-pwa-install-full"
          onClick={handleAction}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer ${className}`}
        >
          <WindowsLogo className="w-4 h-4" />
          <span>{isIOS ? "Install on iPhone / iPad (iOS)" : hasNativePrompt ? "Install HMIS Windows / Desktop Application Now" : "Install HMIS Windows App on this Workstation"}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          id="btn-pwa-install-sidebar"
          onClick={handleAction}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-600/30 text-emerald-100 text-xs font-medium transition cursor-pointer ${className}`}
        >
          <WindowsLogo className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <div className="font-semibold text-white">Install HMIS App</div>
            <div className="text-[10px] text-emerald-300/80">{isIOS ? "Add to iPhone Home Screen" : "Windows & Desktop Standalone App"}</div>
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
