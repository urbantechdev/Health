import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, cleanFirestoreData } from "./firebase";

export interface PWASettings {
  appName: string;
  shortName: string;
  facilityName?: string;
  themeColor: string;
  backgroundColor: string;
  iconUrl: string;
  logoUrl?: string;
  documentLogoUrl?: string;
  faviconUrl?: string;
  startUrl: string;
  display?: "standalone" | "minimal-ui" | "browser" | "fullscreen";
  displayMode?: string;
  cacheStrategy?: string;
  autoSyncIntervalSec?: number;
  offlineSyncEnabled: boolean;
  cachedOfflineDate?: string;
  lastSyncedAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PWA_SETTINGS: PWASettings = {
  appName: "NextGen Hospital HMS & Clinical Portal",
  shortName: "HMIS",
  facilityName: "The Tassia Hill Hospital",
  themeColor: "#059669",
  backgroundColor: "#020617",
  iconUrl: "/icon.png",
  logoUrl: "",
  faviconUrl: "",
  startUrl: "/",
  display: "standalone",
  displayMode: "standalone",
  cacheStrategy: "Cache First with Network Fallback",
  autoSyncIntervalSec: 30,
  offlineSyncEnabled: true,
  cachedOfflineDate: new Date().toISOString()
};

const STORAGE_KEY = "nextgen_hms_pwa_settings";

export function getLocalPwaSettings(): PWASettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PWA_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("Error reading local PWA settings:", err);
  }
  return DEFAULT_PWA_SETTINGS;
}

export function saveLocalPwaSettings(settings: Partial<PWASettings>): PWASettings {
  const current = getLocalPwaSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (updated.documentLogoUrl !== undefined) {
      localStorage.setItem("platform_document_logo_url", updated.documentLogoUrl || "");
    }
    if (updated.logoUrl !== undefined) {
      localStorage.setItem("platform_logo_url", updated.logoUrl || "");
    }
    if (updated.faviconUrl !== undefined) {
      localStorage.setItem("platform_favicon_url", updated.faviconUrl || "");
    }
    if (updated.facilityName !== undefined && updated.facilityName.trim() !== "" && updated.facilityName.trim().toUpperCase() !== "HMIS") {
      localStorage.setItem("hospital_facility_name", updated.facilityName.trim());
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("platform_branding_changed"));
      window.dispatchEvent(new Event("platform_document_logo_changed"));
    }
  } catch (err) {
    console.warn("Error saving local PWA settings:", err);
  }
  return updated;
}

export function subscribePwaSettings(callback: (settings: PWASettings) => void): () => void {
  callback(getLocalPwaSettings());
  if (!db) return () => {};

  return onSnapshot(
    doc(db, "systemSettings", "pwaConfig"),
    (snap) => {
      if (snap.exists()) {
        const cloudData = snap.data() as PWASettings;
        const merged = saveLocalPwaSettings(cloudData);
        callback(merged);
      }
    },
    (err) => {
      console.warn("subscribePwaSettings cloud listener warning:", err);
    }
  );
}

export async function forceSyncPwaSettingsFromCloud(): Promise<PWASettings> {
  if (!db) return getLocalPwaSettings();
  try {
    const snap = await getDoc(doc(db, "systemSettings", "pwaConfig"));
    if (snap.exists()) {
      const cloudData = snap.data() as PWASettings;
      return saveLocalPwaSettings(cloudData);
    }
  } catch (err) {
    console.warn("forceSyncPwaSettingsFromCloud error:", err);
  }
  return getLocalPwaSettings();
}

export async function savePwaSettingsToCloud(settings: Partial<PWASettings>, updatedBy?: string): Promise<PWASettings> {
  const updated = saveLocalPwaSettings(settings);
  if (db) {
    try {
      await setDoc(doc(db, "systemSettings", "pwaConfig"), cleanFirestoreData({
        ...updated,
        lastUpdatedBy: updatedBy || "Admin",
        lastUpdatedAt: new Date().toISOString()
      }), { merge: true });
    } catch (err) {
      console.warn("savePwaSettingsToCloud firestore write error:", err);
    }
  }
  return updated;
}

