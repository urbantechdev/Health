import React, { useEffect, useState, useRef } from "react";
import { QueueTicket } from "../types";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { BellRing, UserCheck, X, Clock, AlertCircle, Sparkles } from "lucide-react";

interface IncomingDepartmentPromptBannerProps {
  department: string | string[]; // e.g. "triage", "maternity", "doctor", "laboratory", "pharmacy", "billing", "reception", "inpatient"
  stationLabel: string; // e.g. "Triage Bay", "Labour Suite", "Consultation", "Specimen Intake", "Dispensary", "Billing Desk"
  activeSpecialistId?: string;
  onAcceptTicket: (ticket: QueueTicket) => void | Promise<void>;
  acceptButtonLabel?: string;
  themeColor?: "emerald" | "rose" | "pink" | "blue" | "indigo" | "amber" | "purple";
}

export default function IncomingDepartmentPromptBanner({
  department,
  stationLabel,
  activeSpecialistId,
  onAcceptTicket,
  acceptButtonLabel = "Accept & Serve Patient",
  themeColor = "emerald"
}: IncomingDepartmentPromptBannerProps) {
  const [incomingTicket, setIncomingTicket] = useState<QueueTicket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dismissedTicketIdsRef = useRef<Set<string>>(new Set());

  // Clinical Alert Chime
  const playAlertTone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6 note
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Audio playback silently suppressed if blocked by browser policy
    }
  };

  useEffect(() => {
    const qQueue = collection(db, "queue");
    const unsubscribe = onSnapshot(qQueue, (snapshot) => {
      const pending: QueueTicket[] = [];
      const depts = Array.isArray(department) 
        ? department.map(d => d.toLowerCase()) 
        : [department.toLowerCase()];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const tickDept = (data.currentDepartment || data.department || "").toLowerCase();
        const status = data.status || "";

        // Check if ticket is targeted to this department
        let isDeptMatch = false;
        for (const d of depts) {
          if (d === "triage" && (tickDept === "triage" || tickDept === "nurse" || tickDept === "nursing")) {
            isDeptMatch = true;
          } else if (d === "maternity" && (tickDept === "maternity" || tickDept === "labour_room" || tickDept === "anc" || tickDept === "pnc")) {
            isDeptMatch = true;
          } else if (d === "doctor" && (tickDept === "doctor" || tickDept === "consultation")) {
            isDeptMatch = true;
          } else if ((d === "laboratory" || d === "diagnostics") && (tickDept === "laboratory" || tickDept === "diagnostics" || tickDept === "lab")) {
            isDeptMatch = true;
          } else if (d === "radiology" && (tickDept === "radiology" || tickDept === "xray" || tickDept === "ultrasound" || tickDept === "diagnostics")) {
            isDeptMatch = true;
          } else if (d === "pharmacy" && (tickDept === "pharmacy" || tickDept === "dispensary")) {
            isDeptMatch = true;
          } else if (d === "billing" && (tickDept === "billing" || tickDept === "cashier")) {
            isDeptMatch = true;
          } else if (d === "reception" && tickDept === "reception") {
            isDeptMatch = true;
          } else if ((d === "inpatient" || d === "admissions" || d === "wards") && (tickDept === "inpatient" || tickDept === "admissions" || tickDept === "wards" || tickDept === "admission")) {
            isDeptMatch = true;
          } else if (tickDept === d) {
            isDeptMatch = true;
          }
          if (isDeptMatch) break;
        }

        if (status === "pending" && isDeptMatch) {
          const t: QueueTicket = { id: docSnap.id, ...data };
          // If assigned to a specific specialist, filter if user is that specialist
          if (activeSpecialistId) {
            if (!t.assignedSpecialistId || t.assignedSpecialistId === activeSpecialistId) {
              pending.push(t);
            }
          } else {
            pending.push(t);
          }
        }
      });

      // Filter out dismissed
      const activePending = pending.filter((t) => !dismissedTicketIdsRef.current.has(t.id));

      if (activePending.length > 0) {
        const topTicket = activePending[0];
        setIncomingTicket((prev) => {
          if (!prev || prev.id !== topTicket.id) {
            playAlertTone();
            return topTicket;
          }
          return prev;
        });
      } else {
        setIncomingTicket(null);
      }
    }, (err) => {
      console.warn(`[IncomingPrompt:${department}] onSnapshot warning:`, err);
    });

    return () => unsubscribe();
  }, [department, activeSpecialistId]);

  if (!incomingTicket) return null;

  const handleDismiss = () => {
    if (incomingTicket) {
      dismissedTicketIdsRef.current.add(incomingTicket.id);
      setIncomingTicket(null);
    }
  };

  const handleAccept = async () => {
    if (!incomingTicket) return;
    const ticketId = incomingTicket.id;
    try {
      playAlertTone();
      await updateDoc(doc(db, "queue", ticketId), {
        status: "serving",
        calledAt: new Date().toISOString()
      });
      await onAcceptTicket(incomingTicket);
      setIncomingTicket(null);
    } catch (err) {
      console.error("Error accepting incoming ticket:", err);
      // Still forward to dashboard handler
      onAcceptTicket(incomingTicket);
      setIncomingTicket(null);
    }
  };

  // Color mappings
  const colorMap: Record<string, {
    bannerBg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    btnBg: string;
    btnHover: string;
    btnText: string;
  }> = {
    rose: {
      bannerBg: "from-rose-950 via-slate-900 to-rose-900",
      border: "border-rose-500/50",
      badgeBg: "bg-rose-500 text-white",
      badgeText: "text-rose-300",
      btnBg: "bg-rose-500",
      btnHover: "hover:bg-rose-400",
      btnText: "text-white"
    },
    pink: {
      bannerBg: "from-pink-950 via-slate-900 to-rose-950",
      border: "border-pink-500/50",
      badgeBg: "bg-pink-500 text-white",
      badgeText: "text-pink-300",
      btnBg: "bg-pink-500",
      btnHover: "hover:bg-pink-400",
      btnText: "text-white"
    },
    blue: {
      bannerBg: "from-blue-950 via-slate-900 to-cyan-950",
      border: "border-blue-500/50",
      badgeBg: "bg-blue-500 text-white",
      badgeText: "text-blue-300",
      btnBg: "bg-blue-500",
      btnHover: "hover:bg-blue-400",
      btnText: "text-white"
    },
    indigo: {
      bannerBg: "from-indigo-950 via-slate-900 to-purple-950",
      border: "border-indigo-500/50",
      badgeBg: "bg-indigo-500 text-white",
      badgeText: "text-indigo-300",
      btnBg: "bg-indigo-500",
      btnHover: "hover:bg-indigo-400",
      btnText: "text-white"
    },
    amber: {
      bannerBg: "from-amber-950 via-slate-900 to-orange-950",
      border: "border-amber-500/50",
      badgeBg: "bg-amber-500 text-amber-950",
      badgeText: "text-amber-300",
      btnBg: "bg-amber-500",
      btnHover: "hover:bg-amber-400",
      btnText: "text-amber-950 font-black"
    },
    purple: {
      bannerBg: "from-purple-950 via-slate-900 to-slate-950",
      border: "border-purple-500/50",
      badgeBg: "bg-purple-500 text-white",
      badgeText: "text-purple-300",
      btnBg: "bg-purple-600",
      btnHover: "hover:bg-purple-500",
      btnText: "text-white"
    },
    emerald: {
      bannerBg: "from-emerald-950 via-teal-950 to-slate-900",
      border: "border-emerald-500/50",
      badgeBg: "bg-emerald-400 text-emerald-950",
      badgeText: "text-emerald-300",
      btnBg: "bg-emerald-500",
      btnHover: "hover:bg-emerald-400",
      btnText: "text-emerald-950 font-black"
    }
  };

  const activeStyles = colorMap[themeColor] || colorMap.emerald;

  return (
    <div
      id={`incoming-queue-prompt-${department}`}
      className={`mb-6 p-4 bg-gradient-to-r ${activeStyles.bannerBg} text-white rounded-2xl shadow-xl border ${activeStyles.border} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative p-3 bg-white/10 border border-white/20 rounded-xl shrink-0">
          <BellRing className="w-6 h-6 text-white animate-bounce" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 font-mono font-black text-xs rounded-md shadow-xs ${activeStyles.badgeBg}`}>
              #{incomingTicket.ticketNo || (incomingTicket as any).ticketNumber || "TICKET"}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${activeStyles.badgeText}`}>
              Incoming Patient For {stationLabel}
            </span>
            {incomingTicket.priority === "emergency" && (
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase rounded-full animate-pulse">
                EMERGENCY
              </span>
            )}
            {incomingTicket.priority === "urgent" && (
              <span className="px-2 py-0.5 bg-amber-500 text-amber-950 text-[10px] font-black uppercase rounded-full">
                URGENT
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-white mt-0.5 truncate">
            {incomingTicket.patientName}
            {incomingTicket.age ? ` (${incomingTicket.age} yrs)` : ""}
            {incomingTicket.gender ? ` • ${incomingTicket.gender}` : ""}
          </h3>
          <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
            <strong>Chief Concern / Notes:</strong> {incomingTicket.issue || incomingTicket.symptoms || (incomingTicket as any).triageNotes || "Queued to department"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
        <button
          onClick={handleDismiss}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Dismiss
        </button>
        <button
          onClick={handleAccept}
          className={`px-4 py-2 ${activeStyles.btnBg} ${activeStyles.btnHover} ${activeStyles.btnText} rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{acceptButtonLabel}</span>
        </button>
      </div>
    </div>
  );
}
