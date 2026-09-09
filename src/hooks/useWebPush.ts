import { useState, useEffect, useCallback } from "react";
import {
  checkPushSupport,
  subscribeDeviceToPush,
  unsubscribeDeviceFromPush,
  sendTestPushToMyDevice,
  triggerClinicalPushAlert,
  fetchPushDiagnostics,
  type PushSupportStatus,
  type PushUserProfile,
  type PushAlertPayload,
} from "../lib/webPushService";
import { toast } from "../lib/promptService";

export function useWebPush(user?: PushUserProfile) {
  const [status, setStatus] = useState<PushSupportStatus>({
    isSupported: false,
    permission: "default",
    isIOS: false,
    isStandalone: false,
    requiresHomeScreen: false,
    hasExistingSubscription: false,
  });
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [vapidSnippet, setVapidSnippet] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const current = await checkPushSupport();
      setStatus(current);

      // Fetch subscriber count
      try {
        const diag = await fetchPushDiagnostics();
        setSubscriberCount(diag.count);
        setVapidSnippet(diag.publicKeySnippet);
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn("Failed to check Web Push status:", err);
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    // Listen for notification clicked event dispatched by service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "HMIS_PUSH_NOTIFICATION_CLICKED") {
        console.log("Push notification clicked event received:", event.data);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [refreshStatus]);

  const subscribe = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribeDeviceToPush(user);
      toast.success(
        "Device registered! You will now receive real-time emergency, low-stock, and lab alerts natively on this screen.",
        "Push Notifications Active"
      );
      setSubscriberCount(res.subscriberCount);
      await refreshStatus();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to enable notifications.", "Subscription Error");
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    setIsSubscribing(true);
    try {
      await unsubscribeDeviceFromPush();
      toast.info("Push notifications disabled on this device.", "Notifications Disabled");
      await refreshStatus();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to unsubscribe.", "Error");
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const sendTest = async () => {
    setIsTesting(true);
    try {
      const res = await sendTestPushToMyDevice();
      toast.success(
        "Native test push sent! Watch for the notification banner on your phone/desktop.",
        "Test Dispatched"
      );
      return res;
    } catch (err: any) {
      toast.error(err.message || "Could not deliver test notification.", "Test Failed");
      throw err;
    } finally {
      setIsTesting(false);
    }
  };

  const sendAlert = async (payload: PushAlertPayload) => {
    try {
      const res = await triggerClinicalPushAlert(payload);
      toast.success(
        `Alert pushed to ${res.sent} active staff device(s)!`,
        "Clinical Push Broadcast"
      );
      return res;
    } catch (err: any) {
      toast.error(err.message || "Could not broadcast alert.", "Broadcast Failed");
      throw err;
    }
  };

  return {
    status,
    isSubscribing,
    isTesting,
    subscriberCount,
    vapidSnippet,
    isSubscribed: status.hasExistingSubscription,
    refreshStatus,
    subscribe,
    unsubscribe,
    sendTest,
    sendAlert,
  };
}
