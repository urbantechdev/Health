import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { voiceAnnouncer, ActiveAnnouncement } from "../lib/voiceAnnouncementService";
import { getHospitalFacilityName } from "./DocumentLogo";
import {
  Monitor,
  Volume2,
  VolumeX,
  Megaphone,
  Maximize,
  Minimize,
  ExternalLink,
  Clock,
  Layers,
  Check,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Stethoscope,
  FlaskRound,
  ShoppingCart,
  CreditCard,
  Radio,
  HeartPulse,
  Activity,
  ShieldAlert,
  Building2
} from "lucide-react";

export interface UnifiedBigMonitorTicket {
  id: string;
  source: "queue" | "system_tickets";
  ticketNo: string;
  patientName: string;
  departmentKey: "doctor" | "laboratory" | "pharmacy" | "billing" | "triage" | "radiology" | "emergency" | "admissions" | "general";
  departmentLabel: string;
  service: string;
  roomOrDesk: string;
  status: "serving" | "pending" | "waiting" | "completed";
  priority?: string;
  timestamp: string;
  specialistTitle?: string;
}

interface BigMonitorPageProps {
  onReturnToApp?: () => void;
  standalone?: boolean;
}

export default function BigMonitorPage({ onReturnToApp, standalone = false }: BigMonitorPageProps) {
  const [tickets, setTickets] = useState<UnifiedBigMonitorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [autoVoiceReaderEnabled, setAutoVoiceReaderEnabled] = useState(true);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References to prevent announcement flooding on initial load
  const isInitialLoadRef = useRef(true);
  const knownTicketKeysRef = useRef<Set<string>>(new Set());
  const knownStatusesRef = useRef<Map<string, string>>(new Map());

  // 1. Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fullscreen Change Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // 3. Subscribe to Voice Announcer events
  useEffect(() => {
    const unsub = voiceAnnouncer.subscribe((ann) => {
      setActiveAnnouncement(ann);
    });
    return () => unsub();
  }, []);

  // 4. Audio Unlocker for TV browsers and autoplay policies
  const unlockAudio = () => {
    try {
      voiceAnnouncer.resumeAudioContext();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      setAudioUnlocked(true);
      try {
        sessionStorage.setItem("hmis_big_monitor_audio_unlocked", "true");
      } catch {
        // ignore
      }
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
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to map department string to category & human-readable room
  const normalizeDepartment = (dept?: string, room?: string, service?: string): {
    key: UnifiedBigMonitorTicket["departmentKey"];
    label: string;
    resolvedRoom: string;
  } => {
    const cleanDept = (dept || "").toLowerCase().trim();
    const cleanRoom = (room || "").replace(/,\s*doctor$/i, "").replace(/\s+doctor$/i, "").trim();

    if (cleanDept.includes("lab") || cleanDept.includes("diagnost")) {
      return {
        key: "laboratory",
        label: "Clinical Laboratory",
        resolvedRoom: cleanRoom || "Laboratory Window A"
      };
    }
    if (cleanDept.includes("pharm") || cleanDept.includes("dispens")) {
      return {
        key: "pharmacy",
        label: "Main Pharmacy",
        resolvedRoom: cleanRoom || "Pharmacy Dispenser B"
      };
    }
    if (cleanDept.includes("bill") || cleanDept.includes("cash")) {
      return {
        key: "billing",
        label: "Cashier & Billing",
        resolvedRoom: cleanRoom || "Central Billing Desk"
      };
    }
    if (cleanDept.includes("triage") || cleanDept.includes("vitals") || cleanDept.includes("reception")) {
      return {
        key: "triage",
        label: "Nurse Triage & Vitals",
        resolvedRoom: cleanRoom || "Nurse Triage Station"
      };
    }
    if (cleanDept.includes("rad") || cleanDept.includes("xray") || cleanDept.includes("x-ray") || cleanDept.includes("ultrasound")) {
      return {
        key: "radiology",
        label: "Radiology & Imaging",
        resolvedRoom: cleanRoom || "X-Ray Room 1"
      };
    }
    if (cleanDept.includes("emerg") || cleanDept.includes("casu") || cleanDept.includes("resusc")) {
      return {
        key: "emergency",
        label: "Emergency & Casualty",
        resolvedRoom: cleanRoom || "Resuscitation Unit"
      };
    }
    if (cleanDept.includes("admiss") || cleanDept.includes("ward")) {
      return {
        key: "admissions",
        label: "Admissions & Inpatient",
        resolvedRoom: cleanRoom || "Admissions Office"
      };
    }

    // Default to Doctor / Consultation
    return {
      key: "doctor",
      label: service ? `Doctor - ${service}` : "Doctor Consultation",
      resolvedRoom: cleanRoom || "Consultation Room 1"
    };
  };

  // 5. Cross-Department Real-Time Firestore Sync (Listens to both `queue` AND `system_tickets`)
  useEffect(() => {
    let queueMap = new Map<string, UnifiedBigMonitorTicket>();
    let systemTicketsMap = new Map<string, UnifiedBigMonitorTicket>();

    const mergeAndProcessTickets = () => {
      // Merge maps by ticket number
      const combined = new Map<string, UnifiedBigMonitorTicket>();

      systemTicketsMap.forEach((ticket, key) => {
        combined.set(key, ticket);
      });

      queueMap.forEach((ticket, key) => {
        // Queue status takes precedence for active serving/room assignment
        combined.set(key, ticket);
      });

      const list = Array.from(combined.values()).sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });

      setTickets(list);
      setLoading(false);
    };

    // Listen to `queue` collection
    const qQueue = query(collection(db, "queue"), orderBy("timestamp", "asc"));
    const unsubQueue = onSnapshot(
      qQueue,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const ticketNo = (data.ticketNo || change.doc.id).trim().toUpperCase();
          const uniqueKey = `queue_${ticketNo}`;
          const rawStatus = (data.status || "pending").toLowerCase();
          const normalizedStatus = rawStatus === "serving" ? "serving" : rawStatus === "completed" ? "completed" : "pending";

          const norm = normalizeDepartment(data.currentDepartment || data.department, data.consultationRoom, data.service);

          const unified: UnifiedBigMonitorTicket = {
            id: change.doc.id,
            source: "queue",
            ticketNo: data.ticketNo || change.doc.id,
            patientName: data.patientName || "Patient",
            departmentKey: norm.key,
            departmentLabel: norm.label,
            service: data.service || "Clinical Service",
            roomOrDesk: norm.resolvedRoom,
            status: normalizedStatus,
            priority: data.priority,
            timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            specialistTitle: data.specialistTitle || data.assignedSpecialistName
          };

          if (change.type === "removed") {
            queueMap.delete(ticketNo);
            knownTicketKeysRef.current.delete(uniqueKey);
            knownStatusesRef.current.delete(uniqueKey);
          } else {
            queueMap.set(ticketNo, unified);

            if (!isInitialLoadRef.current && autoVoiceReaderEnabled) {
              const prevStatus = knownStatusesRef.current.get(uniqueKey);

              if (change.type === "added" && !knownTicketKeysRef.current.has(uniqueKey)) {
                // Brand new ticket raised in this department!
                knownTicketKeysRef.current.add(uniqueKey);
                knownStatusesRef.current.set(uniqueKey, normalizedStatus);

                unlockAudio();
                voiceAnnouncer.announceTicketLogged({
                  ticketNo: unified.ticketNo,
                  patientName: unified.patientName,
                  department: unified.departmentLabel,
                  service: unified.service,
                  status: unified.status,
                  roomOrDesk: unified.roomOrDesk
                });
                showToast(`New ticket raised: ${unified.ticketNo} (${unified.departmentLabel})`);
              } else if (change.type === "modified") {
                knownStatusesRef.current.set(uniqueKey, normalizedStatus);

                // Called to serving / room
                if (normalizedStatus === "serving" && prevStatus !== "serving") {
                  unlockAudio();
                  voiceAnnouncer.announceTurnArrived({
                    ticketNo: unified.ticketNo,
                    patientName: unified.patientName,
                    roomOrDesk: unified.roomOrDesk,
                    departmentOrRole: unified.departmentLabel,
                    repeatCount: repeatCount
                  });
                  showToast(`Now Serving: ${unified.ticketNo} ➔ ${unified.roomOrDesk}`);
                }
              }
            } else {
              knownTicketKeysRef.current.add(uniqueKey);
              knownStatusesRef.current.set(uniqueKey, normalizedStatus);
            }
          }
        });

        mergeAndProcessTickets();
      },
      (err) => console.warn("[BigMonitor] queue listener notice:", err)
    );

    // Listen to `system_tickets` collection
    const qSystemTickets = query(collection(db, "system_tickets"), orderBy("createdTime", "asc"));
    const unsubSystemTickets = onSnapshot(
      qSystemTickets,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const ticketNo = (data.ticketNumber || change.doc.id).trim().toUpperCase();
          const uniqueKey = `system_${ticketNo}`;
          const rawStatus = (data.status || "open").toLowerCase();
          const normalizedStatus =
            rawStatus === "serving" || rawStatus === "in_progress"
              ? data.consultationRoom
                ? "serving"
                : "pending"
              : rawStatus === "completed"
              ? "completed"
              : "pending";

          const norm = normalizeDepartment(data.department, data.consultationRoom, data.visitReason);

          const unified: UnifiedBigMonitorTicket = {
            id: change.doc.id,
            source: "system_tickets",
            ticketNo: data.ticketNumber || change.doc.id,
            patientName: data.patientName || "Patient",
            departmentKey: norm.key,
            departmentLabel: norm.label,
            service: data.visitReason || "Clinical Encounter",
            roomOrDesk: norm.resolvedRoom,
            status: normalizedStatus,
            priority: data.priority,
            timestamp: data.createdTime || new Date().toISOString(),
            specialistTitle: data.specialistTitle || data.assignedSpecialistName
          };

          if (change.type === "removed") {
            systemTicketsMap.delete(ticketNo);
            knownTicketKeysRef.current.delete(uniqueKey);
            knownStatusesRef.current.delete(uniqueKey);
          } else {
            systemTicketsMap.set(ticketNo, unified);

            if (!isInitialLoadRef.current && autoVoiceReaderEnabled) {
              const prevStatus = knownStatusesRef.current.get(uniqueKey);

              if (change.type === "added" && !knownTicketKeysRef.current.has(uniqueKey)) {
                // Brand new ticket registered
                knownTicketKeysRef.current.add(uniqueKey);
                knownStatusesRef.current.set(uniqueKey, normalizedStatus);

                unlockAudio();
                voiceAnnouncer.announceTicketLogged({
                  ticketNo: unified.ticketNo,
                  patientName: unified.patientName,
                  department: unified.departmentLabel,
                  service: unified.service,
                  status: unified.status,
                  roomOrDesk: unified.roomOrDesk
                });
                showToast(`New ticket raised: ${unified.ticketNo} (${unified.departmentLabel})`);
              } else if (change.type === "modified") {
                knownStatusesRef.current.set(uniqueKey, normalizedStatus);

                if (normalizedStatus === "serving" && prevStatus !== "serving") {
                  unlockAudio();
                  voiceAnnouncer.announceTurnArrived({
                    ticketNo: unified.ticketNo,
                    patientName: unified.patientName,
                    roomOrDesk: unified.roomOrDesk,
                    departmentOrRole: unified.departmentLabel,
                    repeatCount: repeatCount
                  });
                  showToast(`Now Serving: ${unified.ticketNo} ➔ ${unified.roomOrDesk}`);
                }
              }
            } else {
              knownTicketKeysRef.current.add(uniqueKey);
              knownStatusesRef.current.set(uniqueKey, normalizedStatus);
            }
          }
        });

        mergeAndProcessTickets();
      },
      (err) => console.warn("[BigMonitor] system_tickets listener notice:", err)
    );

    // After brief setup time, mark initial load as complete so subsequent events trigger audio
    const initialTimer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 1200);

    return () => {
      clearTimeout(initialTimer);
      unsubQueue();
      unsubSystemTickets();
    };
  }, [autoVoiceReaderEnabled, repeatCount]);

  // Filtered lists
  const activeServingTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchStatus = t.status === "serving";
      const matchDept = departmentFilter === "all" || t.departmentKey === departmentFilter;
      return matchStatus && matchDept;
    });
  }, [tickets, departmentFilter]);

  const activeWaitingTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchStatus = t.status === "pending" || t.status === "waiting";
      const matchDept = departmentFilter === "all" || t.departmentKey === departmentFilter;
      return matchStatus && matchDept;
    });
  }, [tickets, departmentFilter]);

  // Department counts
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      doctor: 0,
      laboratory: 0,
      pharmacy: 0,
      billing: 0,
      triage: 0,
      radiology: 0,
      emergency: 0
    };
    tickets.forEach((t) => {
      if (t.status !== "completed") {
        counts.all++;
        if (counts[t.departmentKey] !== undefined) {
          counts[t.departmentKey]++;
        }
      }
    });
    return counts;
  }, [tickets]);

  // Actions
  const handleAnnounceSingleTicket = async (ticket: UnifiedBigMonitorTicket) => {
    unlockAudio();
    showToast(`Announcing Ticket ${ticket.ticketNo} to ${ticket.roomOrDesk}...`);
    if (ticket.status === "serving") {
      await voiceAnnouncer.announceTurnArrived({
        ticketNo: ticket.ticketNo,
        patientName: ticket.patientName,
        roomOrDesk: ticket.roomOrDesk,
        departmentOrRole: ticket.departmentLabel,
        repeatCount: repeatCount
      });
    } else {
      await voiceAnnouncer.announceTicketLogged({
        ticketNo: ticket.ticketNo,
        patientName: ticket.patientName,
        department: ticket.departmentLabel,
        service: ticket.service,
        status: ticket.status,
        roomOrDesk: ticket.roomOrDesk
      });
    }
  };

  const handleTestPAVoice = async () => {
    unlockAudio();
    showToast("Broadcasting PA Audio Test...");
    await voiceAnnouncer.announceCustom(
      "This is a test of the hospital public address system. The calm fluent announcer is fully operational.",
      "Audio Calibration"
    );
  };

  const handleReadAllActiveQueue = async () => {
    unlockAudio();
    const targets = [...activeServingTickets, ...activeWaitingTickets];
    if (targets.length === 0) {
      showToast("No active tickets to read.");
      return;
    }

    showToast(`Reading aloud all ${targets.length} active queue tickets...`);
    for (const t of targets) {
      await voiceAnnouncer.announceTurnArrived({
        ticketNo: t.ticketNo,
        patientName: t.patientName,
        roomOrDesk: t.roomOrDesk,
        departmentOrRole: t.departmentLabel,
        repeatCount: 1
      });
    }
  };

  // Color theme helpers per department (High-contrast for white background)
  const getDepartmentStyling = (deptKey: string) => {
    switch (deptKey) {
      case "laboratory":
        return {
          badge: "bg-purple-50 text-purple-700 border-purple-200",
          cardBorder: "border-purple-300",
          cardBg: "bg-purple-50/30",
          icon: FlaskRound,
          accent: "text-purple-700"
        };
      case "pharmacy":
        return {
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          cardBorder: "border-amber-300",
          cardBg: "bg-amber-50/30",
          icon: ShoppingCart,
          accent: "text-amber-700"
        };
      case "billing":
        return {
          badge: "bg-sky-50 text-sky-700 border-sky-200",
          cardBorder: "border-sky-300",
          cardBg: "bg-sky-50/30",
          icon: CreditCard,
          accent: "text-sky-700"
        };
      case "triage":
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          cardBorder: "border-blue-300",
          cardBg: "bg-blue-50/30",
          icon: HeartPulse,
          accent: "text-blue-700"
        };
      case "radiology":
        return {
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
          cardBorder: "border-indigo-300",
          cardBg: "bg-indigo-50/30",
          icon: Activity,
          accent: "text-indigo-700"
        };
      case "emergency":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          cardBorder: "border-rose-300",
          cardBg: "bg-rose-50/30",
          icon: ShieldAlert,
          accent: "text-rose-700"
        };
      default:
        // Doctor / Consultation
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          cardBorder: "border-emerald-300",
          cardBg: "bg-emerald-50/30",
          icon: Stethoscope,
          accent: "text-emerald-700"
        };
    }
  };

  const departmentsList = [
    { key: "all", label: "All Departments" },
    { key: "doctor", label: "Doctor / Consultation" },
    { key: "laboratory", label: "Clinical Laboratory" },
    { key: "pharmacy", label: "Pharmacy Dispensing" },
    { key: "billing", label: "Cashier & Billing" },
    { key: "triage", label: "Nurse Triage" },
    { key: "radiology", label: "Radiology & X-Ray" },
    { key: "emergency", label: "Emergency & Casualty" }
  ];

  return (
    <div
      id="big-monitor-fullscreen-page"
      onClick={unlockAudio}
      className="fixed inset-0 bg-white text-slate-900 z-50 flex flex-col p-4 sm:p-6 lg:p-8 font-sans overflow-y-auto select-none"
    >
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Audio Unlock Banner */}
      {!audioUnlocked && (
        <div className="mb-4 px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold rounded-2xl shadow-md flex items-center justify-between text-xs sm:text-sm animate-pulse cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 shrink-0" />
            <span>
              🔊 <strong>CLICK TO ENABLE PUBLIC ADDRESS AUDIO:</strong> Browser audio is currently on standby. Click anywhere on this screen so all tickets raised across Doctor, Lab, Pharmacy, and Billing will announce aloud automatically.
            </span>
          </div>
          <span className="px-3.5 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 ml-3 shadow-xs">
            Activate Audio
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-4 mb-5 gap-4">
        {/* Hospital Branding & Display Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md shadow-emerald-600/20">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 font-mono">
                {getHospitalFacilityName().toUpperCase()}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
              <span>Public Address System & Multi-Department Queue Monitor</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-emerald-700 font-semibold">Calm Fluent English</span>
            </p>
          </div>
        </div>

        {/* Huge & Bold Digital Clock for Waiting Lounge */}
        <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
          <Clock className="w-8 h-8 text-emerald-600 shrink-0" />
          <div className="text-right">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-slate-950 leading-none">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 uppercase tracking-widest font-bold mt-1">
              {currentTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Monitor Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Voice Reader Status */}
          <button
            type="button"
            onClick={() => {
              setAutoVoiceReaderEnabled(!autoVoiceReaderEnabled);
              showToast(`Auto Voice Reader turned ${!autoVoiceReaderEnabled ? "ON" : "OFF"}`);
            }}
            title="Toggle Automatic Voice Reading for any ticket raised"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-xs ${
              autoVoiceReaderEnabled
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
            }`}
          >
            {autoVoiceReaderEnabled ? (
              <>
                <div className="flex items-end gap-0.5 h-3.5">
                  <span className="w-1 bg-emerald-600 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2" />
                  <span className="w-1 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3.5" />
                  <span className="w-1 bg-emerald-600 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-2.5" />
                </div>
                <span>Auto Voice: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-500" />
                <span>Auto Voice: OFF</span>
              </>
            )}
          </button>

          {/* Test Voice Button */}
          <button
            type="button"
            onClick={handleTestPAVoice}
            title="Test Voice Announcement Speakers"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Test PA Voice</span>
          </button>

          {/* Read All Active Queue */}
          <button
            type="button"
            onClick={handleReadAllActiveQueue}
            title="Read aloud all active tickets in queue"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Megaphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Read Queue ({activeServingTickets.length + activeWaitingTickets.length})</span>
          </button>

          {/* Repeat setting (1x / 2x) */}
          <button
            type="button"
            onClick={() => {
              const next = repeatCount === 1 ? 2 : 1;
              setRepeatCount(next);
              showToast(`Announcement repeat set to ${next}x`);
            }}
            title="Toggle Call Repeat Count"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3 h-3 text-amber-500" />
            <span>{repeatCount}x Repeat</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode for TV Wall Mount"}
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-xs"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Open in Standalone Window if embedded */}
          {!standalone && (
            <button
              type="button"
              onClick={() => {
                window.open(`${window.location.origin}${window.location.pathname}?display=big-monitor`, "_blank");
              }}
              title="Open Big Monitor on Second Screen or TV"
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {/* Return to App Button */}
          {onReturnToApp && (
            <button
              type="button"
              onClick={onReturnToApp}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Monitor</span>
            </button>
          )}
        </div>
      </header>

      {/* Live Vocal Marquee Broadcast Banner with Huge Bold Patient Name */}
      {activeAnnouncement && (
        <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-3 border-emerald-500 rounded-3xl text-slate-900 shadow-xl animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 w-full">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl animate-bounce shadow-lg shrink-0">
              <Megaphone className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs uppercase rounded-lg tracking-widest shadow-xs">
                  LIVE HOSPITAL PA ANNOUNCEMENT
                </span>
                {activeAnnouncement.ticketNo && (
                  <span className="text-base sm:text-lg text-emerald-800 font-mono font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300">
                    Ticket: {activeAnnouncement.ticketNo}
                  </span>
                )}
              </div>

              {/* Huge and Bold Patient Name Display */}
              {activeAnnouncement.patientName && (
                <div className="my-1.5">
                  <span className="text-xs uppercase tracking-widest font-black text-slate-500 block">
                    CALLING PATIENT:
                  </span>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 uppercase drop-shadow-xs truncate">
                    👤 {activeAnnouncement.patientName}
                  </h1>
                </div>
              )}

              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-950 font-sans tracking-tight mt-1">
                📢 {activeAnnouncement.formattedText}
              </h2>
            </div>
          </div>
          <div className="hidden lg:flex items-end gap-1.5 h-10 pr-2 shrink-0">
            <span className="w-2 bg-emerald-600 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-5" />
            <span className="w-2 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-10" />
            <span className="w-2 bg-emerald-600 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-7" />
            <span className="w-2 bg-emerald-600 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-9" />
          </div>
        </div>
      )}

      {/* Department Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter Department:</span>
        </span>
        {departmentsList.map((d) => {
          const isActive = departmentFilter === d.key;
          const count = departmentCounts[d.key] || 0;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setDepartmentFilter(d.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <span>{d.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                  isActive ? "bg-emerald-800 text-emerald-100" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: NOW SERVING (Left 8 cols) vs WAITING QUEUE (Right 4 cols) */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* NOW SERVING SECTION (Columns 1-8) */}
        <section className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2.5">
              <Volume2 className="w-6 h-6 text-emerald-600" />
              <span>NOW SERVING / SASA HIVI</span>
            </h2>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {activeServingTickets.length} ACTIVE ROOM CALLS
            </span>
          </div>

          {loading ? (
            <div className="flex-1 min-h-[360px] flex items-center justify-center text-slate-500 gap-3 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/60">
              <span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-sm">Connecting to Hospital PA Queue...</span>
            </div>
          ) : activeServingTickets.length === 0 ? (
            <div className="flex-1 min-h-[360px] border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/60 flex flex-col items-center justify-center text-slate-500 text-center p-8">
              <Monitor className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-xl font-bold text-slate-800">No active calls being processed</p>
              <p className="text-xs text-slate-500 mt-2 max-w-md">
                Consultation desks, laboratories, pharmacy, and cashier counters will call tickets shortly. All calls will announce aloud automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
              {activeServingTickets.map((t) => {
                const styling = getDepartmentStyling(t.departmentKey);
                const isAnnouncing = activeAnnouncement?.ticketNo === t.ticketNo;
                const DeptIcon = styling.icon;

                return (
                  <div
                    key={`${t.source}_${t.id}`}
                    className={`relative border-2 rounded-3xl p-6 flex flex-col items-center justify-between text-center transition-all duration-300 shadow-sm ${
                      isAnnouncing
                        ? "ring-4 ring-emerald-500 scale-[1.02] bg-emerald-50/90 border-emerald-500 shadow-xl shadow-emerald-500/10"
                        : `bg-white ${styling.cardBorder} hover:shadow-md`
                    }`}
                  >
                    {/* Header: Department Chip & Manual Re-Read */}
                    <div className="w-full flex justify-between items-center mb-2">
                      <span className={`text-[11px] uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${styling.badge}`}>
                        <DeptIcon className="w-3.5 h-3.5" />
                        <span>{t.departmentLabel}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAnnounceSingleTicket(t)}
                        title="Re-read this ticket out loud on PA"
                        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Giant Ticket Number */}
                    <div className="my-2">
                      <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold block">
                        TICKET NUMBER
                      </span>
                      <h3 className="text-6xl sm:text-7xl font-black tracking-wider font-mono text-emerald-600 drop-shadow-xs">
                        {t.ticketNo}
                      </h3>
                    </div>

                    {/* Accent divider */}
                    <div className="h-1.5 w-16 bg-emerald-500/30 rounded-full my-2" />

                    {/* Destination Room */}
                    <div className="w-full">
                      <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold block mb-1">
                        PLEASE PROCEED TO
                      </span>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-tight">
                        {t.roomOrDesk}
                      </p>
                      {t.patientName && (
                        <div className="mt-3 bg-slate-50 border-2 border-slate-200 px-4 py-2.5 rounded-2xl">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            PATIENT NAME
                          </span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight block truncate mt-0.5">
                            {t.patientName}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* WAITING QUEUE LIST (Columns 9-12) */}
        <aside className="lg:col-span-4 border border-slate-200 rounded-3xl bg-white p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider">
                WAITING IN QUEUE
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {activeWaitingTickets.length} Waiting
            </span>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[580px]">
            {activeWaitingTickets.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                <Check className="w-8 h-8 text-slate-300 mb-2" />
                <span>No patients currently waiting in this department</span>
              </div>
            ) : (
              activeWaitingTickets.map((t) => {
                const styling = getDepartmentStyling(t.departmentKey);
                const DeptIcon = styling.icon;

                return (
                  <div
                    key={`${t.source}_${t.id}`}
                    className="flex justify-between items-center p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold font-mono text-emerald-700">
                        {t.ticketNo}
                      </span>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-900">{t.patientName || "Patient"}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <DeptIcon className="w-3 h-3 text-slate-400" />
                          <span>{t.departmentLabel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAnnounceSingleTicket(t)}
                        title="Read this ticket out loud on PA"
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-xs"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                        Waiting
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </main>

      {/* Bottom Ticker */}
      <footer className="mt-5 pt-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium overflow-hidden gap-2">
        <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
          <strong className="text-slate-800 shrink-0">Hospital Public Address:</strong>
          <span className="text-slate-600 truncate">
            All tickets raised across Doctor Consultation, Laboratory, Pharmacy, Billing, Radiology, and Triage are announced aloud automatically • Please listen for your ticket number.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 shrink-0">
          <span>PA VOICE: {autoVoiceReaderEnabled ? "CALM FLUENT ENGLISH (ACTIVE)" : "MUTED"}</span>
          <span>•</span>
          <span>{tickets.length} TOTAL TICKETS</span>
        </div>
      </footer>
    </div>
  );
}
