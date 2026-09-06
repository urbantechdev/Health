import React, { useState } from 'react';
import { 
  Download, 
  Monitor, 
  Check, 
  Smartphone, 
  ExternalLink, 
  Wifi, 
  HardDrive, 
  ShieldCheck, 
  X,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export interface PWAInstallButtonProps {
  variant?: 'header' | 'header-mobile' | 'portal' | 'compact' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'header',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed standalone PWA
  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>HMIS App Installed (Standalone Mode)</span>
        </div>
      );
    }
    if (variant === 'portal') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Standalone App</span>
        </div>
      );
    }
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const installed = await install();
        if (!installed) {
          setShowInstallGuide(true);
        }
      } catch {
        setShowInstallGuide(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleOpenTopLevel = () => {
    window.open(window.location.href, '_blank');
  };

  // Render modal guide for non-ambient or iframe environments
  const renderGuideModal = () => {
    if (!showInstallGuide) return null;

    return (
      <div 
        className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        onClick={() => setShowInstallGuide(false)}
      >
        <div 
          className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-100 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => setShowInstallGuide(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Install HMIS Desktop / Mobile App
              </h3>
              <p className="text-xs text-slate-400">
                Full offline access & standalone desktop workstation experience
              </p>
            </div>
          </div>

          {/* Offline Capabilities Highlight */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <div className="flex items-start gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-white block font-medium">Local IndexedDB</strong>
                <span className="text-slate-400 text-[11px]">Patients & triage saved offline</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wifi className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-white block font-medium">Auto Re-sync</strong>
                <span className="text-slate-400 text-[11px]">Syncs once connection returns</span>
              </div>
            </div>
          </div>

          {/* Quick Step Instructions */}
          <div className="space-y-3 mb-6 text-xs text-slate-300">
            {isIOS ? (
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Smartphone className="w-4 h-4 text-yellow-400" />
                  <span>iOS Safari (iPhone / iPad)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
                  <li>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top right corner. The HMIS icon will appear on your home screen.</li>
                </ol>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Monitor className="w-4 h-4 text-emerald-400" />
                    <span>Chrome / Edge / Android</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Recommended
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  For the most reliable installation, open HMIS in a dedicated window or browser tab, then click the <strong>Install</strong> icon in the address bar (or browser menu ⋮ &gt; <em>Install HMIS</em>).
                </p>
                <button
                  type="button"
                  onClick={handleOpenTopLevel}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Dedicated Window to Install</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 1. Header Desktop Variant
  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleAction}
          disabled={isInstalling}
          title="Install HMIS to Desktop or Tablet for offline access"
          className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold border border-white/20 shadow-xs transition duration-200 cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-emerald-300 shrink-0 animate-bounce" />
          <span className="hidden sm:inline">Install App</span>
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // 2. Header Mobile Variant
  if (variant === 'header-mobile') {
    return (
      <>
        <button
          onClick={handleAction}
          disabled={isInstalling}
          title="Install HMIS App"
          className={`p-1.5 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer ${className}`}
        >
          <Download className="w-5 h-5 text-emerald-300 animate-bounce" />
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // 3. Portal / Login Variant
  if (variant === 'portal') {
    return (
      <>
        <button
          id="btn-portal-install-pwa"
          type="button"
          onClick={handleAction}
          disabled={isInstalling}
          className={`px-3.5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-600 hover:to-teal-600 text-white font-bold border border-emerald-400/40 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-emerald-500/20 active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4 shrink-0 text-yellow-300 animate-pulse" />
          <span className="whitespace-nowrap">Install App</span>
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // 4. Compact Variant
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleAction}
          className={`flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-semibold transition cursor-pointer ${className}`}
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
        {renderGuideModal()}
      </>
    );
  }

  // 5. Full Banner Variant
  return (
    <>
      <button
        onClick={handleAction}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-md transition active:scale-95 cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 shrink-0 text-yellow-300" />
        <span>Install HMIS for Offline Access</span>
      </button>
      {renderGuideModal()}
    </>
  );
};
