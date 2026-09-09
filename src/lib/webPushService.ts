/**
 * Native Web Push Service (VAPID Standards-Compliant, Zero OneSignal)
 * Supports Chrome, Android, Edge, Firefox, and iOS 16.4+ (Standalone PWA)
 */

import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface PushSupportStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isIOS: boolean;
  isStandalone: boolean;
  requiresHomeScreen: boolean;
  hasExistingSubscription: boolean;
  reason?: string;
}

export interface PushUserProfile {
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
}

export interface PushAlertPayload {
  title: string;
  body: string;
  url?: string;
  type?: "emergency" | "low_stock" | "lab_ready" | "patient_admission" | "broadcast" | "test";
  targetRole?: string;
  targetDepartment?: string;
  targetUserId?: string;
  requireInteraction?: boolean;
}

/**
 * Converts a base64 string to a Uint8Array for PushManager subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detects whether the current device is running Apple iOS (iPhone/iPad).
 */
export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detects whether the app is currently running in Standalone (Installed PWA) mode.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Inspects browser capability for Native Web Push.
 */
export async function checkPushSupport(): Promise<PushSupportStatus> {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      permission: "default",
      isIOS: false,
      isStandalone: false,
      requiresHomeScreen: false,
      hasExistingSubscription: false,
      reason: "Window is not defined"
    };
  }

  const isIOS = isIOSDevice();
  const isStandalone = isStandalonePWA();
  const hasSW = "serviceWorker" in navigator;
  const hasPush = "PushManager" in window;
  const hasNotification = "Notification" in window;

  // On Apple iOS (iPhone/iPad), Web Push requires iOS 16.4+ AND the user MUST add the PWA to their Home Screen
  const requiresHomeScreen = isIOS && !isStandalone;

  if (!hasSW || !hasPush || !hasNotification) {
    let reason = "Your current browser does not support the native Web Push standard.";
    if (isIOS && !isStandalone) {
      reason = "On iPhone / iPad, Apple requires adding HMIS to your Home Screen first to activate Web Push.";
    }
    return {
      isSupported: false,
      permission: hasNotification ? Notification.permission : "default",
      isIOS,
      isStandalone,
      requiresHomeScreen,
      hasExistingSubscription: false,
      reason
    };
  }

  let hasExistingSubscription = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    hasExistingSubscription = !!sub;
  } catch {
    // ignore
  }

  return {
    isSupported: true,
    permission: Notification.permission,
    isIOS,
    isStandalone,
    requiresHomeScreen: false,
    hasExistingSubscription
  };
}

/**
 * Subscribes the current device to the native VAPID Web Push server.
 */
export async function subscribeDeviceToPush(user?: PushUserProfile): Promise<{
  subscription: PushSubscription;
  subscriberCount: number;
}> {
  const support = await checkPushSupport();
  
  if (support.requiresHomeScreen) {
    throw new Error(
      "Apple iOS Requirement: Please add HMIS to your iPhone Home Screen via Safari Share button first. Web Push unlocks once launched from the Home Screen."
    );
  }

  if (!support.isSupported) {
    throw new Error(support.reason || "Web Push is not supported in this browser.");
  }

  // 1. Request Notification Permission from user
  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    throw new Error(
      "Notification permission was denied. Please open your browser/phone settings, allow notifications for this site, and try again."
    );
  }
  if (permission !== "granted") {
    throw new Error("Notification permission was dismissed or not granted.");
  }

  // 2. Fetch server's VAPID Public Key
  const keyResponse = await fetch("/api/push/vapid-public-key");
  if (!keyResponse.ok) {
    throw new Error("Unable to retrieve VAPID public key from backend.");
  }
  const { publicKey } = await keyResponse.json();
  if (!publicKey) {
    throw new Error("Backend VAPID public key is empty.");
  }

  // 3. Register with PushManager via the active Service Worker
  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as any,
    });
  }

  // 4. Platform description
  const isIOS = isIOSDevice();
  const isAndroid = /Android/i.test(navigator.userAgent);
  const platform = isIOS ? "Apple iOS (iPhone/iPad)" : isAndroid ? "Android Phone" : "Desktop Browser";

  // 5. Transmit subscription to backend server
  const subJson = subscription.toJSON();
  const subscribeResponse = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subJson,
      user: {
        uid: user?.uid || "guest-staff",
        name: user?.name || "Medical Staff",
        email: user?.email || "",
        role: user?.role || "Staff",
        department: user?.department || "General",
      },
      platform,
      userAgent: navigator.userAgent,
    }),
  });

  if (!subscribeResponse.ok) {
    throw new Error("Backend failed to save push subscription.");
  }

  const result = await subscribeResponse.json();

  // 6. Also persist to Cloud Firestore for cross-cluster tracking
  try {
    const subHash = btoa(subscription.endpoint).slice(-32).replace(/[^a-zA-Z0-9]/g, "_");
    await setDoc(doc(db, "push_subscriptions", subHash), {
      endpoint: subscription.endpoint,
      keys: subJson.keys,
      platform,
      user: user || {},
      subscribedAt: new Date().toISOString(),
      active: true,
    }, { merge: true });
  } catch (dbErr) {
    console.warn("Firestore subscription cache warning (offline or permissions):", dbErr);
  }

  localStorage.setItem("hmis_push_subscribed", "true");
  return {
    subscription,
    subscriberCount: result.subscriberCount || 1,
  };
}

/**
 * Unsubscribes the current device.
 */
export async function unsubscribeDeviceFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      // Remove from firestore if possible
      try {
        const subHash = btoa(endpoint).slice(-32).replace(/[^a-zA-Z0-9]/g, "_");
        await deleteDoc(doc(db, "push_subscriptions", subHash));
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("hmis_push_subscribed");
    return true;
  } catch (err) {
    console.error("Failed to unsubscribe device:", err);
    return false;
  }
}

/**
 * Sends a native diagnostic test push directly to this device.
 */
export async function sendTestPushToMyDevice(platformName?: string): Promise<{ success: boolean; message: string }> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    throw new Error("Device is not yet subscribed. Please tap 'Enable Web Push' first.");
  }

  const subJson = subscription.toJSON();
  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subJson.keys,
      platform: platformName || (isIOSDevice() ? "Apple iOS" : "Android / Desktop"),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to trigger test push notification.");
  }

  return data;
}

/**
 * Sends a broadcast or clinical alert to medical staff devices.
 */
export async function triggerClinicalPushAlert(payload: PushAlertPayload): Promise<{
  sent: number;
  failed: number;
  totalSubscribers: number;
}> {
  const res = await fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to send clinical push notification.");
  }

  return data;
}

/**
 * Fetches current push subscriber diagnostics for Admin Panel.
 */
export async function fetchPushDiagnostics(): Promise<{
  count: number;
  subscriptions: any[];
  vapidConfigured: boolean;
  publicKeySnippet: string | null;
}> {
  const res = await fetch("/api/push/subscriptions");
  if (!res.ok) {
    throw new Error("Failed to fetch push diagnostics");
  }
  return await res.json();
}
