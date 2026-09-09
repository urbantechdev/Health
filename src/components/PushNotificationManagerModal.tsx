import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Send,
  Zap,
  Info,
  X,
  RefreshCw,
  ExternalLink,
  Laptop,
  Radio
} from "lucide-react";
import { useWebPush } from "../hooks/useWebPush";
import { fetchPushDiagnostics } from "../lib/webPushService";
import { toast } from "../lib/promptService";

interface PushNotificationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    name?: string;
    role?: string;
    department?: string;
    email?: string;
  };
}

export const PushNotificationManagerModal: React.FC<PushNotificationManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const {
    status,
    isSubscribing,
    isTesting,
    subscriberCount,
    vapidSnippet,
    isSubscribed,
    refreshStatus,
    subscribe,
    unsubscribe,
    sendTest,
    sendAlert,
  } = useWebPush({
    name: currentUser?.name || "Medical Staff",
    role: currentUser?.role || "Staff",
    department: currentUser?.department || "General",
    email: currentUser?.email || "",
  });

  const [activeTab, setActiveTab] = useState<"device" | "dispatch" | "subscribers">("device");
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Custom alert dispatch state
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [customUrl, setCustomUrl] = useState("/?tab=triage");
  const [targetRole, setTargetRole] = useState("All");
  const [targetDept, setTargetDept] = useState("All");
  const [isSendingCustom, setIsSendingCustom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      loadSubscribers();
    }
  }, [isOpen, refreshStatus]);

  const loadSubscribers = async () => {
    setIsLoadingDevices(true);
    try {
      const diag = await fetchPushDiagnostics();
      setDeviceList(diag.subscriptions || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingDevices(false);
    }
  };

  if (!isOpen) return null;

  const handleQuickAlert = async (type: "emergency" | "low_stock" | "lab_ready" | "admission") => {
    try {
      if (type === "emergency") {
        await sendAlert({
          title: "🚨 EMERGENCY: Resuscitation Alert",
          body: "Code Blue / Critical Trauma arrival in Resuscitation Bay 1. Emergency team assemble immediately.",
          url: "/?tab=triage",
          type: "emergency",
          targetDepartment: "Emergency",
          requireInteraction: true,
        });
      } else if (type === "low_stock") {
        await sendAlert({
          title: "⚠️ PHARMACY ALERT: Low Drug Stock",
          body: "Amoxicillin 500mg has reached critical reorder threshold (12 packs remaining). Requisition needed.",
          url: "/?tab=pharmacy",
          type: "low_stock",
          targetRole: "Pharmacist",
          requireInteraction: false,
        });
      } else if (type === "lab_ready") {
        await sendAlert({
          title: "🧪 STAT LAB: Critical Result Ready",
          body: "Full Haemogram & Troponin-T ready for Patient #P-1048. Pathologist review required.",
          url: "/?tab=laboratory",
          type: "lab_ready",
          targetRole: "Doctor",
          requireInteraction: true,
        });
      } else if (type === "admission") {
        await sendAlert({
          title: "🏥 ADMISSION NOTICE: Inpatient Arrival",
          body: "Patient assigned to Ward 2 (Bed B-04). Nursing handover and vitals recording pending.",
          url: "/?tab=journey",
          type: "patient_admission",
          targetRole: "Nurse",
          requireInteraction: false,
        });
      }
    } catch {
      // toast is handled in hook
    }
  };

  const handleSendCustomAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customBody.trim()) {
      toast.error("Please enter a title and message body for the push alert.", "Missing Fields");
      return;
    }

    setIsSendingCustom(true);
    try {
      await sendAlert({
        title: customTitle.trim(),
        body: customBody.trim(),
        url: customUrl.trim() || "/",
        type: "broadcast",
        targetRole,
        targetDepartment: targetDept,
        requireInteraction: true,
      });
      setCustomTitle("");
      setCustomBody("");
    } catch {
      // handled
    } finally {
      setIsSendingCustom(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="push-notification-modal"
        className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-linear-to-r from-emerald-900 to-teal-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <BellRing className="w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight">Native Web Push Notifications</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  VAPID • Zero OneSignal
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Direct browser & mobile push alerts without paid third-party dependencies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/70 px-6 pt-2">
          <button
            onClick={() => setActiveTab("device")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "device"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>This Device ({isSubscribed ? "Active" : "Off"})</span>
          </button>
          <button
            onClick={() => setActiveTab("dispatch")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "dispatch"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Clinical Dispatcher</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("subscribers");
              loadSubscribers();
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "subscribers"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Active Fleet ({subscriberCount})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === "device" && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  isSubscribed
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    : "bg-amber-50/80 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-lg ${isSubscribed ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                    {isSubscribed ? <CheckCircle2 className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {isSubscribed ? "Web Push is Active on This Device" : "Push Notifications are Currently Inactive"}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {isSubscribed
                        ? "Your phone or desktop is subscribed to receive real-time hospital alerts directly even when the browser is closed."
                        : "Enable push to receive critical emergency trauma calls, pharmacy stock reorders, and urgent lab results."}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 font-mono text-[10px]">
                      <span className="px-2 py-0.5 bg-white/80 rounded border border-gray-200">
                        Permission: <strong className="uppercase">{status.permission}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-white/80 rounded border border-gray-200">
                        Platform: <strong>{status.isIOS ? "Apple iOS" : "Android / Desktop"}</strong>
                      </span>
                      {vapidSnippet && (
                        <span className="px-2 py-0.5 bg-white/80 rounded border border-gray-200">
                          VAPID: <strong>{vapidSnippet}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Notice for Apple iOS users */}
              {status.isIOS && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-blue-800">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Apple iPhone / iPad Notice</span>
                  </div>
                  <p className="text-blue-800/90 leading-relaxed text-[11px]">
                    Apple supports Web Push on iOS 16.4+ once HMIS has been added to your Home Screen from Safari. If you are browsing inside standard Safari, tap the <strong>Share</strong> button and choose <strong>Add to Home Screen</strong> first.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {!isSubscribed ? (
                  <button
                    id="btn-subscribe-push"
                    onClick={subscribe}
                    disabled={isSubscribing}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>{isSubscribing ? "Registering Device..." : "Allow & Enable Web Push"}</span>
                  </button>
                ) : (
                  <button
                    id="btn-unsubscribe-push"
                    onClick={unsubscribe}
                    disabled={isSubscribing}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    <BellOff className="w-4 h-4" />
                    <span>{isSubscribing ? "Updating..." : "Disable On This Device"}</span>
                  </button>
                )}

                {/* Instant Test Push Button */}
                <button
                  id="btn-test-push"
                  onClick={sendTest}
                  disabled={isTesting || !isSubscribed}
                  title={!isSubscribed ? "Enable Web Push first to test" : "Trigger test notification"}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>{isTesting ? "Firing Push..." : "Send Instant Test Push"}</span>
                </button>
              </div>

              {/* Technical Architecture Info */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>How the Native Architecture Works (No Paid Add-ons)</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  This system operates purely on standard W3C Web Standards:
                </p>
                <ul className="text-[11px] text-gray-600 space-y-1 list-disc pl-4 leading-relaxed">
                  <li><strong>Service Worker:</strong> Background thread listening for push events even when HMIS is closed.</li>
                  <li><strong>VAPID Cryptographic Keys:</strong> Secure server authentication communicating directly with Google FCM, Apple Push Notification Service (APNs), and Mozilla endpoints.</li>
                  <li><strong>Notification API:</strong> Renders system banners, sounds, and tactile vibration pulses natively.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "dispatch" && (
            <div className="space-y-4">
              <div className="text-xs text-gray-600">
                Trigger real-time push alerts to connected staff devices across Android, iPhone, and desktop.
              </div>

              {/* Quick Triggers */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  1-Click Emergency & Clinical Presets
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleQuickAlert("emergency")}
                    className="p-3 text-left bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Code Blue / Emergency Bay
                      </span>
                      <span className="text-[10px] bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded">Triage</span>
                    </div>
                    <p className="text-[11px] text-red-600 leading-tight">
                      Alerts emergency doctors and nurses to acute trauma or resuscitation bay.
                    </p>
                  </button>

                  <button
                    onClick={() => handleQuickAlert("low_stock")}
                    className="p-3 text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Pharmacy Low Stock
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">Pharmacy</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-tight">
                      Pushes critical drug shortage warning to pharmacy staff devices.
                    </p>
                  </button>

                  <button
                    onClick={() => handleQuickAlert("lab_ready")}
                    className="p-3 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-purple-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stat Lab Result Ready
                      </span>
                      <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-1.5 py-0.5 rounded">Laboratory</span>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-tight">
                      Pushes notification to doctor that urgent blood chemistry results are ready.
                    </p>
                  </button>

                  <button
                    onClick={() => handleQuickAlert("admission")}
                    className="p-3 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Inpatient Ward Admission
                      </span>
                      <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-1.5 py-0.5 rounded">Inpatient</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-tight">
                      Notifies ward nursing station of new bed assignment and clinical handover.
                    </p>
                  </button>
                </div>
              </div>

              {/* Custom Broadcast Form */}
              <form onSubmit={handleSendCustomAlert} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Broadcast Custom Clinical Alert
                </span>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Alert Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Clinical Audit Meeting at 3:00 PM"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Message Content</label>
                  <textarea
                    rows={2}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Detailed notification message text displayed on phone screens..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Target Department</label>
                    <select
                      value={targetDept}
                      onChange={(e) => setTargetDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-emerald-600"
                    >
                      <option value="All">All Departments</option>
                      <option value="Emergency">Emergency / Triage</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Inpatient">Inpatient Ward</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Deep Link Route</label>
                    <select
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-emerald-600"
                    >
                      <option value="/?tab=triage">Triage Queue</option>
                      <option value="/?tab=pharmacy">Pharmacy POS</option>
                      <option value="/?tab=laboratory">Laboratory Portal</option>
                      <option value="/?tab=journey">Inpatient Journey</option>
                      <option value="/?tab=dashboard">Main Dashboard</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSendingCustom}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingCustom ? "Broadcasting..." : "Dispatch to Staff Devices"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "subscribers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">Connected Medical Staff Fleet</h4>
                  <p className="text-[11px] text-gray-500">
                    Devices registered with native VAPID push subscriptions ({deviceList.length} active)
                  </p>
                </div>
                <button
                  onClick={loadSubscribers}
                  disabled={isLoadingDevices}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? "animate-spin" : ""}`} />
                </button>
              </div>

              {deviceList.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
                  <Smartphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">No Subscriber Devices Registered Yet</p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                    Switch to the "This Device" tab and click <strong>Allow & Enable Web Push</strong> to register your first device.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {deviceList.map((dev, idx) => (
                    <div
                      key={dev.id || idx}
                      className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                          {dev.platform?.toLowerCase().includes("ios") ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>{dev.user?.name || "Staff Member"}</span>
                            <span className="px-1.5 py-0.2 bg-gray-100 rounded text-[10px] text-gray-600 font-normal">
                              {dev.user?.role || "Staff"}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 block">
                            {dev.platform} • {dev.user?.department || "General"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-gray-400">
                        <span>{new Date(dev.subscribedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Push Server: Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
