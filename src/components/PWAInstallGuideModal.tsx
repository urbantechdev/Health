import React, { useState } from "react";
import {
  Share2,
  PlusSquare,
  Smartphone,
  Laptop,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  WifiOff,
  X,
  Sparkles,
  Download,
  AlertTriangle
} from "lucide-react";
import { PWAInstallState } from "../hooks/usePWAInstall";
import { toast } from "../lib/promptService";

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  pwaState: PWAInstallState;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  pwaState
}) => {
  const {
    isIOS,
    isIPhone,
    isIPad,
    isAndroid,
    isSafari,
    isChromeIOS,
    isInAppBrowser,
    browserName,
    platformName,
    hasNativePrompt,
    install
  } = pwaState;

  // Active tab defaults to detected platform
  const defaultTab = isIOS ? "ios" : isAndroid ? "android" : "desktop";
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "desktop" | "inapp">(
    isInAppBrowser ? "inapp" : defaultTab
  );
  const [copied, setCopied] = useState(false);
  const [isAttemptingInstall, setIsAttemptingInstall] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://hmis-hospital.app";

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = currentUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Hospital App link copied to clipboard!", "Link Copied");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Please copy the URL directly from your browser bar.");
    }
  };

  const handleDirectInstall = async () => {
    setIsAttemptingInstall(true);
    try {
      const success = await install();
      if (success) {
        toast.success("HMIS Application installed successfully!", "Installed");
        onClose();
      }
    } finally {
      setIsAttemptingInstall(false);
    }
  };

  return (
    <div
      id="pwa-install-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="pwa-install-modal-card"
        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Hospital Brand Badge */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 py-4 relative">
          <button
            onClick={onClose}
            aria-label="Close Install Guide"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-emerald-300/30">
              <img
                src="/apple-touch-icon.png"
                alt="HMIS Icon"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/pwa-192x192.png";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Install HMIS Hospital App
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 line-clamp-1">
                Zero-install app store requirement • Works seamlessly on iPhone & all browsers
              </p>
            </div>
          </div>

          {/* Auto-Detection Indicator Banner */}
          <div className="mt-3 py-1.5 px-3 rounded-lg bg-black/20 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-100 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>
                Detected: <strong>{platformName}</strong> • {browserName}
              </span>
            </div>
            {isIOS && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white font-semibold">
                Apple WebKit
              </span>
            )}
            {hasNativePrompt && (
              <span className="text-[10px] bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
                1-Click Ready
              </span>
            )}
          </div>
        </div>

        {/* In-App Browser Warning Alert */}
        {isInAppBrowser && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold">In-App Browser Detected:</strong> You are currently viewing HMIS inside an app (e.g. WhatsApp, Instagram, or Facebook). In-app browsers block adding apps to the home screen.
              <div className="mt-1 flex items-center gap-2 font-medium text-amber-950">
                <span>Please tap the <strong>•••</strong> menu and choose <strong>"Open in Safari"</strong> or <strong>"Open in Chrome"</strong>.</span>
              </div>
            </div>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 pt-2 flex gap-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ios"
                ? "bg-white text-emerald-800 border-emerald-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-700" />
            <span>Apple iPhone & iPad</span>
            {isIOS && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
          </button>

          <button
            onClick={() => setActiveTab("android")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "android"
                ? "bg-white text-emerald-800 border-emerald-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Android (Chrome)</span>
            {isAndroid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
          </button>

          <button
            onClick={() => setActiveTab("desktop")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "desktop"
                ? "bg-white text-emerald-800 border-emerald-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-blue-600" />
            <span>Mac / Windows PC</span>
            {!isIOS && !isAndroid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
          </button>

          {isInAppBrowser && (
            <button
              onClick={() => setActiveTab("inapp")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "inapp"
                  ? "bg-white text-amber-800 border-amber-600 shadow-xs"
                  : "text-amber-700 hover:text-amber-900 border-transparent hover:bg-amber-100/60"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>In-App Fix</span>
            </button>
          )}
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: APPLE IPHONE & IPAD */}
          {activeTab === "ios" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>iOS Safari / Chrome:</strong> Apple does not allow apps to pop up automatic install windows. Follow these 3 easy steps to add HMIS to your iPhone Home Screen:
                  </span>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                    <span>Tap the Safari <strong>Share</strong> button</span>
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-blue-600">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    On <strong>iPhone</strong>, look for the square icon with an upward arrow at the <strong>bottom center</strong> of your Safari screen.
                    <br />
                    On <strong>iPad</strong>, it is located at the <strong>top right</strong> toolbar.
                    {isChromeIOS && (
                      <span className="block mt-1 text-blue-700 font-medium">
                        *In Chrome on iPhone, tap the Share icon next to the address bar or the 3-dots menu.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 border border-slate-300 text-slate-700">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Swipe down on the iOS share menu sheet until you see the row labeled <strong>Add to Home Screen</strong> with a plus (+) icon.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  3
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                    <span>Tap <strong>"Add"</strong> in the top right</span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md">
                      Add
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Confirm the name <strong>HMIS</strong> and tap <strong>Add</strong>. The official Hospital app icon will now appear on your iPhone screen just like an App Store app!
                  </p>
                </div>
              </div>

              {/* iPhone Safari Visual Callout */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-950 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-blue-900">Need to open in Safari first?</div>
                  <p className="text-[11px] text-blue-800">
                    If you are using Chrome or Firefox on iOS and don't see "Add to Home Screen", copy the link below and open it directly in <strong>Apple Safari</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID */}
          {activeTab === "android" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {hasNativePrompt ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-sm text-emerald-950">
                    1-Click Direct Install Ready for Android!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Your Android browser supports direct instant installation without opening menus.
                  </p>
                  <button
                    onClick={handleDirectInstall}
                    disabled={isAttemptingInstall}
                    className="mt-2 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAttemptingInstall ? "Opening Android Prompt..." : "Install HMIS App Now"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="flex-1 text-xs">
                      <strong className="text-slate-900 text-sm block mb-1">
                        Tap the 3 vertical dots (•••) menu
                      </strong>
                      <p className="text-slate-600">
                        In Google Chrome or Samsung Internet, tap the menu icon at the top right of your browser toolbar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="flex-1 text-xs">
                      <strong className="text-slate-900 text-sm block mb-1">
                        Tap "Install app" or "Add to Home screen"
                      </strong>
                      <p className="text-slate-600">
                        Select <strong>Install app</strong> from the dropdown. Tap <strong>Install</strong> when the Android dialog asks for confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DESKTOP */}
          {activeTab === "desktop" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {hasNativePrompt ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
                  <Download className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-sm text-emerald-950">
                    Ready to Install on your Desktop / Laptop
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Run HMIS as a dedicated desktop workstation window with full offline access.
                  </p>
                  <button
                    onClick={handleDirectInstall}
                    disabled={isAttemptingInstall}
                    className="mt-2 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAttemptingInstall ? "Installing..." : "Install Desktop App"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <strong className="text-slate-900 font-bold text-sm block mb-1">
                      Google Chrome & Microsoft Edge:
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      Look at the <strong>right side of your browser URL address bar</strong> for the install icon (<Download className="w-3 h-3 inline text-slate-700" /> or screen icon). Click it and select <strong>Install</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <strong className="text-slate-900 font-bold text-sm block mb-1">
                      Apple Safari on Mac (macOS Sonoma+):
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      Click <strong>File</strong> in the top Mac menu bar, then click <strong>Add to Dock...</strong>. HMIS will run in its own window directly from your Dock.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IN-APP BROWSER WORKAROUND */}
          {activeTab === "inapp" && (
            <div className="space-y-3 animate-in fade-in duration-150 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
                <strong className="font-bold block text-sm mb-1">
                  Why can't I install directly from WhatsApp or Instagram?
                </strong>
                <p className="leading-relaxed">
                  Third-party apps wrap web links inside a restricted web view that disables PWA installation and offline storage.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <strong className="font-bold text-slate-900 block">How to open in real Safari or Chrome:</strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Tap the <strong>•••</strong> (three dots) or <strong>Share</strong> button in the corner of this screen.</li>
                  <li>Select <strong>Open in Safari</strong> (on iPhone) or <strong>Open in Chrome / Browser</strong> (on Android).</li>
                  <li>Once opened, tap Install or Add to Home Screen!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Quick Copy Hospital App Link */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">Hospital App Web Address</span>
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs block">
                {currentUrl}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-xs font-semibold text-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Key Benefits Grid */}
          <div className="pt-2 border-t border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Benefits of Installing HMIS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">100% Offline</div>
                  <div className="text-[10px] text-slate-500">Works when network drops</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">Instant Launch</div>
                  <div className="text-[10px] text-slate-500">Zero loading delay</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-1.5 col-span-2 sm:col-span-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">No App Store</div>
                  <div className="text-[10px] text-slate-500">Auto-updates always</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tassia Hill Hospital Information Management System
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
