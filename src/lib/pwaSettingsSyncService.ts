import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface PWASettings {
  appName: string;
  shortName: string;
  logoUrl: string;
  faviconUrl?: string;
  themeColor: string;
  backgroundColor: string;
  displayMode: string;
  cacheStrategy: string;
  autoSyncIntervalSec: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PWA_SETTINGS: PWASettings = {
  appName: "The Tassia Hill Hospital HMIS",
  shortName: "HMIS",
  logoUrl: "",
  faviconUrl: "",
  themeColor: "#047857",
  backgroundColor: "#0B1528",
  displayMode: "standalone",
  cacheStrategy: "Cache First with Network Fallback",
  autoSyncIntervalSec: 30
};

const STORAGE_KEY = "hmis_pwa_settings";

export function getLocalPwaSettings(): PWASettings {
  if (typeof window === "undefined") return { ...DEFAULT_PWA_SETTINGS };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PWA_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn("[pwaSettingsSync] getLocalPwaSettings error:", err);
  }
  return { ...DEFAULT_PWA_SETTINGS };
}

export function saveLocalPwaSettings(settings: PWASettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("[pwaSettingsSync] saveLocalPwaSettings error:", err);
  }
}

export async function savePwaSettingsToCloud(
  patch: Partial<PWASettings>,
  updatedBy = "System Admin"
): Promise<void> {
  const current = getLocalPwaSettings();
  const updated: PWASettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy
  };

  saveLocalPwaSettings(updated);

  try {
    const docRef = doc(db, "system_settings", "pwa_config");
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn("[pwaSettingsSync] Failed to save PWA settings to Firestore:", err);
  }
}

export async function forceSyncPwaSettingsFromCloud(): Promise<PWASettings> {
  try {
    const docRef = doc(db, "system_settings", "pwa_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<PWASettings>;
      const merged: PWASettings = {
        ...DEFAULT_PWA_SETTINGS,
        ...data
      };
      saveLocalPwaSettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn("[pwaSettingsSync] forceSyncPwaSettingsFromCloud error:", err);
  }
  return getLocalPwaSettings();
}

export function subscribePwaSettings(
  callback: (settings: PWASettings) => void
): () => void {
  // Emit local immediately
  callback(getLocalPwaSettings());

  try {
    const docRef = doc(db, "system_settings", "pwa_config");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data() as Partial<PWASettings>;
          const merged: PWASettings = {
            ...DEFAULT_PWA_SETTINGS,
            ...cloudData
          };
          saveLocalPwaSettings(merged);
          callback(merged);
        }
      },
      (err) => {
        console.warn("[pwaSettingsSync] Realtime sync error:", err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}
