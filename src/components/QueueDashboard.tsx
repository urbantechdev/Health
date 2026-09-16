import React, { useEffect, useState, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, updateDoc, doc, query, orderBy, deleteDoc, writeBatch } from "firebase/firestore";
import { QueueTicket } from "../types";
import { 
  Monitor, 
  Volume2, 
  VolumeX, 
  UserCheck, 
  RefreshCw, 
  Layers, 
  ExternalLink, 
  Play, 
  Trash2, 
  Trash, 
  Megaphone,
  Maximize,
  Minimize,
  Clock,
  Radio,
  RotateCcw,
  Check,
  Sparkles,
  Filter
} from "lucide-react";
import { toast } from "../lib/promptService";
import { voiceAnnouncer, ActiveAnnouncement } from "../lib/voiceAnnouncementService";
import BigMonitorPage from "./BigMonitorPage";

interface QueueDashboardProps {
  toggles: any;
  onLaunchBigMonitor?: () => void;
}

export default function QueueDashboard({ toggles, onLaunchBigMonitor }: QueueDashboardProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignageView, setIsSignageView] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      return search.includes("display=signage") || search.includes("signage=true");
    }
    return false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Auto Voice Reader settings (Default: Enabled so any logged ticket is read out)
  const [autoVoiceReaderEnabled, setAutoVoiceReaderEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("nextgen_hms_auto_queue_voice_reader");
    return saved !== null ? saved === "true" : true;
  });

  const [repeatCount, setRepeatCount] = useState<1 | 2>(() => {
    return (voiceAnnouncer.getConfig().repeatCount as 1 | 2) || 1;
  });

  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("nextgen_hms_audio_unlocked") === "true";
  });

  // Track known tickets to detect newly logged tickets
  const isInitialLoadRef = useRef(true);
  const knownTicketIdsRef = useRef<Set<string>>(new Set());
  const knownStatusesRef = useRef<Map<string, string>>(new Map());

  // Subscribe to Voice Announcer events
  useEffect(() => {
    const unsub = voiceAnnouncer.subscribe((active) => {
      setActiveAnnouncement(active);
    });
    return () => unsub();
  }, []);

  // Live digital clock for Big Monitor Display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Unlock Web Audio / Speech Synthesis for big monitors
  const unlockAudio = () => {
    try {
      voiceAnnouncer.resumeAudioContext();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      setAudioUnlocked(true);
      sessionStorage.setItem("nextgen_hms_audio_unlocked", "true");
    } catch (e) {
      console.warn("Could not unlock audio context:", e);
    }
  };

  useEffect(() => {
    const handleGesture = () => {
      unlockAudio();
    };
    window.addEventListener("click", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });
    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resolveRoomName = (ticket: QueueTicket) => {
    if (ticket.currentDepartment === "triage" || ticket.currentDepartment === "reception") return "Nurse Triage & Vitals Desk";
    if (ticket.consultationRoom && ticket.consultationRoom.trim()) {
      return ticket.consultationRoom.replace(/,\s*doctor$/i, "").replace(/\s+doctor$/i, "").trim();
    }
    if (ticket.currentDepartment === "laboratory") return "Lab Window A";
    if (ticket.currentDepartment === "radiology") return "X-Ray Room 1";
    if (ticket.currentDepartment === "pharmacy") return "Pharmacy Dispenser B";
    if (ticket.currentDepartment === "labour_room") return "Maternity Labour Room";
    if (ticket.currentDepartment === "gyna") return "Obstetrics & Gyna Clinic";
    return "Consultation Room 5";
  };

  const announceTicket = async (ticket: QueueTicket, customRoom?: string) => {
    unlockAudio();
    const room = customRoom || resolveRoomName(ticket);
    const deptRole = ticket.specialistTitle || ticket.assignedSpecialistName || (ticket.currentDepartment === "doctor" ? "Consultation" : ticket.currentDepartment);

    await voiceAnnouncer.announceTurnArrived({
      ticketNo: ticket.ticketNo,
      patientName: ticket.patientName,
      roomOrDesk: room,
      departmentOrRole: deptRole,
      repeatCount: repeatCount
    });
  };

  // Real-time listener for queue collection - Reads any ticket logged on queue
  useEffect(() => {
    const q = query(collection(db, "queue"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData: QueueTicket[] = [];
      snapshot.forEach((docSnap) => {
        ticketsData.push({ id: docSnap.id, ...docSnap.data() } as QueueTicket);
      });
      setTickets(ticketsData);
      setLoading(false);

      if (isInitialLoadRef.current) {
        // Record all existing tickets so we do not flood historical tickets on mount
        snapshot.forEach((docSnap) => {
          knownTicketIdsRef.current.add(docSnap.id);
          const data = docSnap.data() as QueueTicket;
          knownStatusesRef.current.set(docSnap.id, data.status);
        });
        isInitialLoadRef.current = false;
        return;
      }

      // Check document changes in real time
      snapshot.docChanges().forEach((change) => {
        const docId = change.doc.id;
        const ticketData = { id: docId, ...change.doc.data() } as QueueTicket;

        if (change.type === "added") {
          // A brand new ticket has been logged into the queue!
          if (!knownTicketIdsRef.current.has(docId)) {
            knownTicketIdsRef.current.add(docId);
            knownStatusesRef.current.set(docId, ticketData.status);

            // NO MATTER WHAT TICKET IT IS -> READ IT OUT ON THE BIG MONITOR!
            if (autoVoiceReaderEnabled) {
              const room = resolveRoomName(ticketData);
              voiceAnnouncer.announceTicketLogged({
                ticketNo: ticketData.ticketNo,
                patientName: ticketData.patientName,
                department: ticketData.currentDepartment,
                service: ticketData.service,
                status: ticketData.status,
                roomOrDesk: room
              });
            }
          }
        } else if (change.type === "modified") {
          const prevStatus = knownStatusesRef.current.get(docId);
          knownStatusesRef.current.set(docId, ticketData.status);

          // If ticket was just called / set to serving
          if (ticketData.status === "serving" && prevStatus !== "serving") {
            if (autoVoiceReaderEnabled) {
              const room = resolveRoomName(ticketData);
              voiceAnnouncer.announceTurnArrived({
                ticketNo: ticketData.ticketNo,
                patientName: ticketData.patientName,
                roomOrDesk: room,
                departmentOrRole: ticketData.specialistTitle || ticketData.service || ticketData.currentDepartment,
                repeatCount: repeatCount
              });
            }
          } else if (ticketData.status === "pending" && prevStatus && prevStatus !== "pending") {
            // Re-queued or transferred ticket logged back to pending queue
            if (autoVoiceReaderEnabled) {
              const room = resolveRoomName(ticketData);
              voiceAnnouncer.announceTicketLogged({
                ticketNo: ticketData.ticketNo,
                patientName: ticketData.patientName,
                department: ticketData.currentDepartment,
                service: ticketData.service,
                status: "pending",
                roomOrDesk: room
              });
            }
          }
        } else if (change.type === "removed") {
          knownTicketIdsRef.current.delete(docId);
          knownStatusesRef.current.delete(docId);
        }
      });
    });

    return () => unsubscribe();
  }, [autoVoiceReaderEnabled, repeatCount]);

  // Instant delete single unwanted queue ticket
  const handleDeleteQueueTicket = async (ticketId: string, ticketNo?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // 1. Optimistic removal (0ms delay)
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    showToast(`Queue Ticket ${ticketNo || ticketId} removed immediately.`);

    // 2. Background Firestore delete
    try {
      await deleteDoc(doc(db, "queue", ticketId));
    } catch (err) {
      console.error("Failed to delete queue ticket:", err);
    }
  };

  // Clear completed or skipped tickets
  const handleClearCompleted = async () => {
    const targets = tickets.filter(t => t.status === "completed" || t.status === "skipped");
    if (targets.length === 0) {
      toast.info("No completed or finished tickets in queue to clear.", "Queue Clear");
      return;
    }
    const count = targets.length;
    // Optimistic removal
    setTickets(prev => prev.filter(t => t.status === "pending" || t.status === "serving"));
    toast.success(`Cleared ${count} completed tickets from active queue.`, "Queue Updated");

    try {
      const batch = writeBatch(db);
      targets.forEach(t => batch.delete(doc(db, "queue", t.id)));
      await batch.commit();
    } catch (err) {
      console.error("Error clearing completed queue:", err);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: "serving" | "completed" | "skipped", currentDept: string) => {
    try {
      const ticketRef = doc(db, "queue", ticketId);
      await updateDoc(ticketRef, { status });
      
      const ticket = tickets.find(t => t.id === ticketId);
      if (status === "serving" && ticket) {
        const roomName = resolveRoomName(ticket);
        announceTicket(ticket, roomName);
      }
    } catch (err) {
      console.error("Failed to update ticket status:", err);
    }
  };

  const handleToggleAutoVoice = () => {
    const next = !autoVoiceReaderEnabled;
    setAutoVoiceReaderEnabled(next);
    localStorage.setItem("nextgen_hms_auto_queue_voice_reader", String(next));
    showToast(next ? "Auto Voice Reader ENABLED: Reading all logged tickets" : "Auto Voice Reader PAUSED");
  };

  const handleToggleRepeat = () => {
    const nextRepeat: 1 | 2 = repeatCount === 1 ? 2 : 1;
    setRepeatCount(nextRepeat);
    voiceAnnouncer.saveConfig({ repeatCount: nextRepeat });
    showToast(`Voice announcement repeat set to ${nextRepeat}x`);
  };

  const handleTestVoice = async () => {
    unlockAudio();
    showToast("Broadcasting test voice announcement...");
    await voiceAnnouncer.announceCustom(
      "Attention please. Digital ticketing display audio is active. All logged tickets will be announced automatically.",
      "TEST",
      "Main Display"
    );
  };

  const handleReadAllLoggedTickets = async () => {
    unlockAudio();
    const targets = tickets.filter(t => t.status === "serving" || t.status === "pending");
    if (targets.length === 0) {
      showToast("No active tickets logged in queue to read.");
      return;
    }
    showToast(`Reading ${targets.length} tickets currently logged on queue...`);
    for (const t of targets) {
      const room = resolveRoomName(t);
      await voiceAnnouncer.announceTicketLogged({
        ticketNo: t.ticketNo,
        patientName: t.patientName,
        department: t.currentDepartment,
        service: t.service,
        status: t.status,
        roomOrDesk: room
      });
    }
  };

  // Group tickets by department
  const pendingTickets = tickets.filter(t => t.status === "pending");
  const servingTickets = tickets.filter(t => t.status === "serving");
  const completedTickets = tickets.filter(t => t.status === "completed" || t.status === "skipped");

  // Filter based on active toggles
  const filterByToggle = (list: QueueTicket[]) => {
    return list.filter(t => {
      if (departmentFilter !== "all" && t.currentDepartment !== departmentFilter) return false;
      if (t.currentDepartment === "doctor" && toggles && !toggles.doctor) return false;
      if (t.currentDepartment === "laboratory" && toggles && !toggles.laboratory) return false;
      if (t.currentDepartment === "radiology" && toggles && !toggles.radiology) return false;
      if (t.currentDepartment === "pharmacy" && toggles && !toggles.pharmacy) return false;
      return true;
    });
  };

  const filteredPending = filterByToggle(pendingTickets);
  const filteredServing = filterByToggle(servingTickets);

  const getDeptDisplayInfo = (ticket: QueueTicket) => {
    const dept = (ticket.currentDepartment || "").toLowerCase();
    if (dept === "laboratory" || dept === "lab") {
      return {
        label: "Laboratory",
        room: ticket.consultationRoom || "Lab Window A",
        cardBg: "bg-blue-500/10 border-blue-400 text-blue-900",
        badge: "bg-blue-100 text-blue-800 border-blue-200"
      };
    }
    if (dept === "radiology" || dept === "x-ray") {
      return {
        label: "Radiology & Imaging",
        room: ticket.consultationRoom || "X-Ray Counter 1",
        cardBg: "bg-purple-500/10 border-purple-400 text-purple-900",
        badge: "bg-purple-100 text-purple-800 border-purple-200"
      };
    }
    if (dept === "pharmacy") {
      return {
        label: "Pharmacy Dispenser",
        room: ticket.consultationRoom || "Pharmacy Dispenser B",
        cardBg: "bg-amber-500/10 border-amber-400 text-amber-900",
        badge: "bg-amber-100 text-amber-800 border-amber-200"
      };
    }
    if (dept === "labour_room") {
      return {
        label: "Maternity Labour Room",
        room: ticket.consultationRoom || "Labour Ward 1",
        cardBg: "bg-rose-500/10 border-rose-400 text-rose-900",
        badge: "bg-rose-100 text-rose-800 border-rose-200"
      };
    }
    if (dept === "gyna") {
      return {
        label: "Obstetrics & Gynecology",
        room: ticket.consultationRoom || "Gyna Clinic 2",
        cardBg: "bg-pink-500/10 border-pink-400 text-pink-900",
        badge: "bg-pink-100 text-pink-800 border-pink-200"
      };
    }
    if (dept === "triage" || dept === "reception") {
      return {
        label: "Nurse Triage Desk",
        room: ticket.consultationRoom || "Triage Desk 1",
        cardBg: "bg-teal-500/10 border-teal-400 text-teal-900",
        badge: "bg-teal-100 text-teal-800 border-teal-200"
      };
    }
    if (dept === "billing") {
      return {
        label: "Billing & Cashier",
        room: ticket.consultationRoom || "Cashier Window 1",
        cardBg: "bg-emerald-500/10 border-emerald-400 text-emerald-900",
        badge: "bg-emerald-100 text-emerald-800 border-emerald-200"
      };
    }
    return {
      label: ticket.service || "Doctor Consultation",
      room: resolveRoomName(ticket),
      cardBg: "bg-emerald-500/10 border-emerald-400 text-emerald-900",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200"
    };
  };

  // ==========================================
  // FULLSCREEN SIGNAGE VIEW FOR BIG MONITORS
  // ==========================================
  if (isSignageView) {
    return <BigMonitorPage onReturnToApp={() => setIsSignageView(false)} />;
  }

  // ==========================================
  // NORMAL SYSTEM DASHBOARD VIEW
  // ==========================================
  return (
    <div id="queue-dashboard" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative">
      {/* Instant Notification Toast */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-40 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">HMIS Ticket Display & Queue Router</h2>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                Big Screen Ready
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Live Patient Queue Controller • Automatically reads any ticket logged on queue
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Voice Reader Toggle */}
          <button
            onClick={handleToggleAutoVoice}
            title="Toggle Automatic Voice Reading of newly logged queue tickets"
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              autoVoiceReaderEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
            }`}
          >
            {autoVoiceReaderEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Read Voice: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                <span>Auto-Read Voice: OFF</span>
              </>
            )}
          </button>

          {/* Test Voice */}
          <button
            onClick={handleTestVoice}
            title="Test Voice PA on this device"
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Test Voice</span>
          </button>

          {/* Read Entire Queue */}
          <button
            onClick={handleReadAllLoggedTickets}
            title="Read out all active tickets in queue sequentially"
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200"
          >
            <Megaphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Read All ({filteredServing.length + filteredPending.length})</span>
          </button>

          {/* Clear Completed */}
          {completedTickets.length > 0 && (
            <button
              onClick={handleClearCompleted}
              title="Clear all completed tickets from queue"
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Clear Completed ({completedTickets.length})</span>
            </button>
          )}

          {/* Launch Big Monitor Display */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-launch-signage"
              type="button"
              onClick={() => {
                if (onLaunchBigMonitor) {
                  onLaunchBigMonitor();
                } else {
                  setIsSignageView(true);
                }
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Launch Big Monitor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.open(`${window.location.origin}${window.location.pathname}?display=big-monitor`, "_blank");
              }}
              title="Open Big Monitor on Separate TV Screen or Window"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Voice Status Alert Bar */}
      <div className="mb-6 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>
            <strong>Voice Reading Active:</strong> Any ticket logged on the queue (doctor, lab, radiology, pharmacy, triage, gyna, etc.) is announced aloud automatically.
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-700 font-semibold">
          {repeatCount}x repeat • Loud PA Mode
        </span>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Refreshing queue entries...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Serving list */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Currently in Rooms ({filteredServing.length})</span>
            </h3>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {filteredServing.length === 0 ? (
                <div className="p-8 border border-dashed border-gray-100 rounded-xl text-center text-xs text-gray-400">
                  No tickets currently marked "Serving". Use Doctor/Lab/Pharma panels below to pull tickets.
                </div>
              ) : (
                filteredServing.map((t) => {
                  let deptLabel = "General Doctor";
                  let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (t.currentDepartment === "laboratory") {
                    deptLabel = "Laboratory";
                    badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                  } else if (t.currentDepartment === "radiology") {
                    deptLabel = "Radiology";
                    badgeColor = "bg-purple-50 text-purple-700 border-purple-100";
                  } else if (t.currentDepartment === "pharmacy") {
                    deptLabel = "Pharmacy Dispensing";
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                  } else if (t.currentDepartment === "labour_room") {
                    deptLabel = "Labour Room";
                    badgeColor = "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";
                  } else if (t.currentDepartment === "gyna") {
                    deptLabel = "Gynecology";
                    badgeColor = "bg-pink-50 text-pink-700 border-pink-100";
                  }

                  return (
                    <div
                      key={t.id}
                      className="p-4 border border-gray-150 rounded-xl flex items-center justify-between bg-white shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-mono text-gray-900">{t.ticketNo}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                            {deptLabel}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 mt-1">{t.patientName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">ID: {t.nationalId}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-reannounce-${t.id}`}
                          onClick={() => {
                            const roomName = resolveRoomName(t);
                            announceTicket(t, roomName);
                          }}
                          className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors border border-gray-200 cursor-pointer"
                          title="Re-announce Ticket Vocal Alert"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-complete-serv-${t.id}`}
                          onClick={() => handleUpdateStatus(t.id, "completed", t.currentDepartment)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Finish
                        </button>
                        <button
                          onClick={(e) => handleDeleteQueueTicket(t.id, t.ticketNo, e)}
                          title="Instant Delete Unwanted Queue Ticket"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Intake List */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Unassigned/Pending Tickets ({filteredPending.length})</span>
            </h3>

            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-3">Ticket</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Biometrics</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No pending tickets in queue list
                      </td>
                    </tr>
                  ) : (
                    filteredPending.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-bold font-mono text-emerald-700">{t.ticketNo}</td>
                        <td className="p-3">
                          <p className="font-semibold text-gray-800">{t.patientName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {t.nationalId}</p>
                        </td>
                        <td className="p-3 text-gray-600">
                          {t.currentDepartment === "doctor" ? "Doctor Consultation" : 
                           t.currentDepartment === "labour_room" ? "Labour Room" :
                           t.currentDepartment === "gyna" ? "Gynecology (Gyna)" :
                           t.currentDepartment}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] border font-semibold ${
                              t.biometricStatus === "verified"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}
                          >
                            {t.biometricStatus === "verified" ? "Matched" : "Unverified"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                unlockAudio();
                                const room = resolveRoomName(t);
                                voiceAnnouncer.announceTicketLogged({
                                  ticketNo: t.ticketNo,
                                  patientName: t.patientName,
                                  department: t.currentDepartment,
                                  service: t.service,
                                  status: "pending",
                                  roomOrDesk: room
                                });
                              }}
                              title="Read ticket out loud"
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-start-serve-${t.id}`}
                              onClick={() => handleUpdateStatus(t.id, "serving", t.currentDepartment)}
                              className="px-2.5 py-1.5 bg-gray-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              Call Now
                            </button>
                            <button
                              onClick={(e) => handleDeleteQueueTicket(t.id, t.ticketNo, e)}
                              title="Instant Delete Unwanted Queue Ticket"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
