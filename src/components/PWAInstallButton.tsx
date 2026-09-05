import React, { useState } from 'react';
import { Download, Monitor, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'compact' | 'full' }> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA, show a subtle active badge or hide
  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>HMIS App Installed</span>
        </div>
      );
    }
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isInstallable && !isIOS) {
    return null;
  }

  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          title="Install HMIS to Desktop or Tablet for offline access"
          className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-medium border border-white/20 shadow-xs transition duration-200 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
        </button>

        {showIOSGuide && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div 
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 font-bold text-gray-900 text-base mb-2">
                <Monitor className="w-5 h-5 text-emerald-600" />
                <span>Install on iPad / iPhone</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the Safari navigation bar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. The HMIS icon will appear on your screen for fast offline access.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-emerald-700 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
    >
      <Download className="w-4 h-4" />
      <span>Install App</span>
    </button>
  );
};
