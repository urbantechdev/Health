import { useState, useEffect, useCallback } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChromeIOS: boolean;
  isFirefoxIOS: boolean;
  isEdgeIOS: boolean;
  isInAppBrowser: boolean;
  browserName: string;
  platformName: string;
  hasNativePrompt: boolean;
  install: () => Promise<boolean>;
  openGuide: () => void;
  closeGuide: () => void;
  isGuideOpen: boolean;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isChromeIOS, setIsChromeIOS] = useState(false);
  const [isFirefoxIOS, setIsFirefoxIOS] = useState(false);
  const [isEdgeIOS, setIsEdgeIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [browserName, setBrowserName] = useState("Browser");
  const [platformName, setPlatformName] = useState("Device");
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = (window.navigator.userAgent || "").toLowerCase();
    const platform = (window.navigator.platform || "").toLowerCase();

    // 1. Standalone / Installed mode detection across iOS, Android, and Desktop
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // 2. Comprehensive iOS detection (iPhone, iPad, iPod, and iPadOS 13+ desktop userAgent spoofing)
    const isIPhoneDevice = /iphone|ipod/.test(userAgent);
    const isIPadDevice =
      /ipad/.test(userAgent) ||
      (platform === "macintel" && navigator.maxTouchPoints > 1);
    const isIOSDevice = isIPhoneDevice || isIPadDevice;

    setIsIOS(isIOSDevice);
    setIsIPhone(isIPhoneDevice);
    setIsIPad(isIPadDevice);

    // 3. Android & Desktop OS detection
    const isAndroidDevice = /android/.test(userAgent);
    setIsAndroid(isAndroidDevice);

    if (isIOSDevice) {
      setPlatformName(isIPhoneDevice ? "iPhone (iOS)" : "iPad (iPadOS)");
    } else if (isAndroidDevice) {
      setPlatformName("Android");
    } else if (/macintosh|mac os x/.test(userAgent)) {
      setPlatformName("macOS");
    } else if (/windows/.test(userAgent)) {
      setPlatformName("Windows");
    } else if (/linux/.test(userAgent)) {
      setPlatformName("Linux");
    } else {
      setPlatformName("Device");
    }

    // 4. In-App Browser detection (WhatsApp, Instagram, Facebook, Telegram, WeChat, Slack, TikTok)
    const inApp =
      /fban|fbav|instagram|messenger|line|micromessenger|whatsapp|twitter|threads|telegram|tiktok|slack|wv|webview/.test(
        userAgent
      );
    setIsInAppBrowser(inApp);

    // 5. Browser detection
    const isCriOS = /crios/.test(userAgent);
    const isFxIOS = /fxios/.test(userAgent);
    const isEdgIOS = /edgios/.test(userAgent);
    const isSafariBrowser =
      /safari/.test(userAgent) &&
      !/chrome|crios|crmo|edg|edgios|opr|opera|fxios|firefox|samsungbrowser/.test(userAgent);

    setIsChromeIOS(isCriOS);
    setIsFirefoxIOS(isFxIOS);
    setIsEdgeIOS(isEdgIOS);
    setIsSafari(isSafariBrowser);

    if (inApp) {
      setBrowserName("In-App Browser");
    } else if (isCriOS || (/chrome/.test(userAgent) && !/edg|opr|samsungbrowser/.test(userAgent))) {
      setBrowserName("Google Chrome");
    } else if (isSafariBrowser) {
      setBrowserName("Safari");
    } else if (isEdgIOS || /edg/.test(userAgent)) {
      setBrowserName("Microsoft Edge");
    } else if (isFxIOS || /firefox/.test(userAgent)) {
      setBrowserName("Mozilla Firefox");
    } else if (/samsungbrowser/.test(userAgent)) {
      setBrowserName("Samsung Internet");
    } else if (/opera|opr/.test(userAgent)) {
      setBrowserName("Opera");
    } else {
      setBrowserName("Web Browser");
    }

    // 6. Handle beforeinstallprompt (Chromium, Edge, Samsung Internet, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsGuideOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const openGuide = useCallback(() => {
    setIsGuideOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    // If native prompt is available (Chromium / Android / Edge)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setIsGuideOpen(false);
          return true;
        }
        return false;
      } catch (err) {
        console.warn("[PWA] Error triggering native prompt, falling back to guide:", err);
        openGuide();
        return false;
      }
    }

    // Otherwise (iOS, Safari, Firefox, or prompt not ready), show the guided visual modal
    openGuide();
    return false;
  }, [deferredPrompt, openGuide]);

  return {
    isInstallable: !isInstalled,
    isInstalled,
    isIOS,
    isIPhone,
    isIPad,
    isAndroid,
    isSafari,
    isChromeIOS,
    isFirefoxIOS,
    isEdgeIOS,
    isInAppBrowser,
    browserName,
    platformName,
    hasNativePrompt: !!deferredPrompt,
    install,
    openGuide,
    closeGuide,
    isGuideOpen
  };
}
