import { doc, getDoc, setDoc, onSnapshot, collection, addDoc } from "firebase/firestore";
import { db, cleanFirestoreData } from "./firebase";
import { toast } from "./promptService";

export interface PWASettings {
  appName: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  displayMode: "standalone" | "fullscreen" | "minimal-ui";
  logoUrl: string;
  faviconUrl: string;
  offlineModeEnabled: boolean;
  cacheStrategy: "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate";
  autoSyncIntervalSec: number;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_PWA_SETTINGS: PWASettings = {
  appName: "The Tassia Hill Hospital HMIS",
  shortName: "HMIS",
  description: "The Tassia Hill Hospital Multi-Tenant Hospital Management Information System (HMIS) with offline resilience, installable PWA support, paperless billing, smart pharmacy POS, and SHA integration.",
  themeColor: "#047857",
  backgroundColor: "#0B1528",
  displayMode: "standalone",
  logoUrl: "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg",
  faviconUrl: "",
  offlineModeEnabled: true,
  cacheStrategy: "CacheFirst",
  autoSyncIntervalSec: 60,
  updatedAt: new Date().toISOString(),
  updatedBy: "System Default"
};

const PWA_CONFIG_DOC_ID = "pwa_config";
const STORAGE_KEY = "hospital_pwa_synced_settings";

let currentBlobUrl: string | null = null;

/**
 * Load current PWA settings from localStorage fallback or default
 */
export function getLocalPwaSettings(): PWASettings {
  if (typeof window === "undefined") return DEFAULT_PWA_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PWA_SETTINGS, ...parsed };
    }
    // Also check legacy platform keys
    const customName = localStorage.getItem("platform_custom_brand_name");
    const logoUrl = localStorage.getItem("platform_logo_url");
    const faviconUrl = localStorage.getItem("platform_favicon_url");
    const themeColor = localStorage.getItem("platform_theme_color");

    return {
      ...DEFAULT_PWA_SETTINGS,
      appName: customName || DEFAULT_PWA_SETTINGS.appName,
      shortName: customName ? customName.slice(0, 12).trim() : DEFAULT_PWA_SETTINGS.shortName,
      logoUrl: logoUrl || DEFAULT_PWA_SETTINGS.logoUrl,
      faviconUrl: faviconUrl || DEFAULT_PWA_SETTINGS.faviconUrl,
      themeColor: themeColor === "emerald" ? "#047857" : themeColor || DEFAULT_PWA_SETTINGS.themeColor,
    };
  } catch (err) {
    console.warn("Failed to parse local PWA settings:", err);
    return DEFAULT_PWA_SETTINGS;
  }
}

/**
 * Apply PWA settings to the runtime DOM:
 * 1. Generates and injects a dynamic Web App Manifest Blob link
 * 2. Synchronizes <meta name="theme-color">
 * 3. Synchronizes <meta name="apple-mobile-web-app-title">
 * 4. Synchronizes <link rel="apple-touch-icon">
 * 5. Synchronizes <link rel="icon">
 */
export function applyPwaSettingsToDOM(settings: PWASettings) {
  if (typeof document === "undefined") return;

  try {
    const activeLogo = settings.logoUrl || DEFAULT_PWA_SETTINGS.logoUrl;
    const activeFavicon = settings.faviconUrl || activeLogo;

    // 1. Dynamic Web App Manifest Blob
    const dynamicManifest = {
      id: "/",
      start_url: "/",
      scope: "/",
      name: settings.appName || DEFAULT_PWA_SETTINGS.appName,
      short_name: settings.shortName || DEFAULT_PWA_SETTINGS.shortName,
      description: settings.description || DEFAULT_PWA_SETTINGS.description,
      display: settings.displayMode || "standalone",
      theme_color: settings.themeColor || DEFAULT_PWA_SETTINGS.themeColor,
      background_color: settings.backgroundColor || DEFAULT_PWA_SETTINGS.backgroundColor,
      icons: [
        {
          src: activeLogo,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: activeLogo,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: activeLogo,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: activeLogo,
          sizes: "180x180",
          type: "image/png",
          purpose: "any"
        }
      ]
    };

    // Clean up previous blob URL to prevent memory leaks
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    const blob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: "application/manifest+json"
    });
    currentBlobUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = currentBlobUrl;

    // 2. Meta Theme Color
    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = settings.themeColor || "#047857";

    // 3. Apple Mobile Web App Title
    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    if (!appleTitleMeta) {
      appleTitleMeta = document.createElement("meta");
      appleTitleMeta.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitleMeta);
    }
    appleTitleMeta.content = settings.shortName || "HMIS";

    // 4. Apple Touch Icon
    let touchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (!touchIcon) {
      touchIcon = document.createElement("link");
      touchIcon.rel = "apple-touch-icon";
      document.head.appendChild(touchIcon);
    }
    touchIcon.href = activeLogo;

    // 5. Favicon
    let favLink = document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null;
    if (!favLink) {
      favLink = document.createElement("link");
      favLink.rel = "icon";
      document.head.appendChild(favLink);
    }
    favLink.href = activeFavicon;

    // 6. Title
    if (settings.appName) {
      document.title = settings.appName;
    }
  } catch (domErr) {
    console.warn("Notice updating DOM with PWA settings:", domErr);
  }
}

/**
 * Save PWA settings to Cloud Firestore and sync across all clients
 */
export async function savePwaSettingsToCloud(
  partialSettings: Partial<PWASettings>,
  userEmail: string = "Hospital Administrator"
): Promise<PWASettings> {
  const current = getLocalPwaSettings();
  const updated: PWASettings = {
    ...current,
    ...partialSettings,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail
  };

  // 1. Save locally for instant offline availability
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (updated.appName) localStorage.setItem("platform_custom_brand_name", updated.appName);
    if (updated.logoUrl) localStorage.setItem("platform_logo_url", updated.logoUrl);
    if (updated.faviconUrl) localStorage.setItem("platform_favicon_url", updated.faviconUrl);
    if (updated.themeColor) localStorage.setItem("platform_theme_color", updated.themeColor);
  }

  // 2. Apply to runtime DOM immediately
  applyPwaSettingsToDOM(updated);

  // 3. Write to Firestore Cloud database
  try {
    const docRef = doc(db, "system_settings", PWA_CONFIG_DOC_ID);
    const cleaned = cleanFirestoreData({
      ...updated,
      id: PWA_CONFIG_DOC_ID
    });
    await setDoc(docRef, cleaned, { merge: true });

    // Also record security audit log
    try {
      await addDoc(collection(db, "settings_audit_logs"), cleanFirestoreData({
        timestamp: new Date().toISOString(),
        actor: userEmail,
        changeType: "SYSTEM_SECURITY_CONFIG",
        fieldName: "pwa_settings",
        oldValue: current.appName || "HMIS",
        newValue: updated.appName,
        reason: `PWA manifest, branding identity, and mobile install settings synchronized to cloud by ${userEmail}.`
      }));
    } catch {
      // Non-blocking audit log
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pwa_settings_synced", { detail: updated }));
      window.dispatchEvent(new Event("platform_branding_changed"));
    }

    return updated;
  } catch (firestoreErr) {
    console.error("Failed to sync PWA settings to Firestore:", firestoreErr);
    toast.error("PWA settings saved locally, but cloud sync encountered a network error. Will retry when connected.", "Cloud Sync Warning");
    return updated;
  }
}

/**
 * Real-time subscription to PWA Settings in Firestore
 */
export function subscribePwaSettings(
  onUpdate: (settings: PWASettings) => void
): () => void {
  try {
    const docRef = doc(db, "system_settings", PWA_CONFIG_DOC_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as Partial<PWASettings>;
        const merged: PWASettings = {
          ...DEFAULT_PWA_SETTINGS,
          ...cloudData,
          updatedAt: cloudData.updatedAt || new Date().toISOString()
        };

        // Cache locally
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          if (merged.appName) localStorage.setItem("platform_custom_brand_name", merged.appName);
          if (merged.logoUrl) localStorage.setItem("platform_logo_url", merged.logoUrl);
          if (merged.faviconUrl) localStorage.setItem("platform_favicon_url", merged.faviconUrl);
          if (merged.themeColor) localStorage.setItem("platform_theme_color", merged.themeColor);
        }

        applyPwaSettingsToDOM(merged);
        onUpdate(merged);
      } else {
        // Document doesn't exist yet: bootstrap it with current local/default settings
        const initial = getLocalPwaSettings();
        applyPwaSettingsToDOM(initial);
        onUpdate(initial);
        // Save initial to cloud
        setDoc(docRef, cleanFirestoreData({ ...initial, id: PWA_CONFIG_DOC_ID }), { merge: true })
          .catch((err) => console.warn("Initial PWA bootstrap notice:", err));
      }
    }, (error) => {
      console.warn("PWA cloud sync snapshot error, using local cache:", error);
      const local = getLocalPwaSettings();
      applyPwaSettingsToDOM(local);
      onUpdate(local);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("Could not subscribe to PWA settings, using local fallback:", err);
    const local = getLocalPwaSettings();
    applyPwaSettingsToDOM(local);
    onUpdate(local);
    return () => {};
  }
}

/**
 * Explicit one-time force fetch & sync from cloud
 */
export async function forceSyncPwaSettingsFromCloud(): Promise<PWASettings> {
  try {
    const docRef = doc(db, "system_settings", PWA_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<PWASettings>;
      const merged: PWASettings = {
        ...DEFAULT_PWA_SETTINGS,
        ...data
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      applyPwaSettingsToDOM(merged);
      return merged;
    }
  } catch (e) {
    console.warn("Force sync PWA settings error:", e);
  }
  const fallback = getLocalPwaSettings();
  applyPwaSettingsToDOM(fallback);
  return fallback;
}

/**
 * Initialize PWA sync immediately on startup:
 * applies local cache, sets up real-time listener, and syncs DOM manifest
 */
export function initPwaSettingsSync(): () => void {
  const local = getLocalPwaSettings();
  applyPwaSettingsToDOM(local);
  return subscribePwaSettings((settings) => {
    applyPwaSettingsToDOM(settings);
  });
}
