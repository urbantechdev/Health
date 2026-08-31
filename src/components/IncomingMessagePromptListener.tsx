import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { InternalMessage, SystemRole } from "../types";
import {
  MessageSquare,
  Flame,
  AlertTriangle,
  X,
  ArrowRight,
  User,
  Activity,
  Volume2,
  Receipt,
  FileText,
  ArrowRightLeft,
  FlaskRound
} from "lucide-react";
import { promptService } from "../lib/promptService";

interface IncomingMessagePromptListenerProps {
  currentUser: {
    name: string;
    email: string;
    role: SystemRole | string;
    id?: string;
  };
  onOpenChat: (initialRole?: string, initialPatient?: any) => void;
}

export default function IncomingMessagePromptListener({
  currentUser,
  onOpenChat
}: IncomingMessagePromptListenerProps) {
  const [activePrompt, setActivePrompt] = useState<InternalMessage | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef<boolean>(false);

  // Helper to play synthesized notification chime
  const playChime = (isStat: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = isStat ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(isStat ? 980 : 587.33, audioCtx.currentTime); // D5 or high alert
      if (isStat) {
        osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
        osc.frequency.setValueAtTime(980, audioCtx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      }

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio notification API blocked:", e);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "internal_messages"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Mark initial snapshot items as already seen so we only alert for NEW incoming messages
      if (!initialLoadDone.current) {
        snapshot.forEach((doc) => {
          seenMessageIds.current.add(doc.id);
        });
        initialLoadDone.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const docId = change.doc.id;
          if (seenMessageIds.current.has(docId)) return;
          seenMessageIds.current.add(docId);

          const msg = { id: docId, ...change.doc.data() } as InternalMessage;

          // Check if message was authored by current user (don't alert yourself)
          const isFromMe = msg.senderName === currentUser.name || msg.senderId === currentUser.id || msg.senderId === currentUser.email;
          if (isFromMe) return;

          // Check if message targets current user's role, department, or direct user
          const myRole = (currentUser.role || "").toLowerCase();
          const targetRole = (msg.targetRole || "").toLowerCase();
          const isTargetedToMe =
            msg.targetType === "all" ||
            (msg.targetType === "role" && (targetRole === myRole || targetRole === "all" || myRole === "super admin")) ||
            (msg.targetType === "direct" && (msg.targetUserId === currentUser.id || msg.targetUserName === currentUser.name)) ||
            (msg.targetType === "department" && (myRole === "super admin" || myRole === "admin" || (myRole.includes("doc") && msg.targetDepartment === "doctors")));

          if (isTargetedToMe) {
            const isStat = msg.priority === "stat_emergency";
            playChime(isStat);
            setActivePrompt(msg);

            // Auto-dismiss standard messages after 10s if not clicked
            if (!isStat) {
              setTimeout(() => {
                setActivePrompt((current) => (current?.id === docId ? null : current));
              }, 12000);
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!activePrompt) return null;

  const isStat = activePrompt.priority === "stat_emergency";
  const isUrgent = activePrompt.priority === "urgent";

  return (
    <div className="fixed bottom-6 right-6 z-[99999] max-w-md w-full font-sans pointer-events-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`rounded-3xl p-5 shadow-2xl border-2 overflow-hidden flex flex-col gap-3 relative ${
            isStat
              ? "bg-slate-950 text-white border-red-500 ring-4 ring-red-500/30"
              : isUrgent
                ? "bg-slate-900 text-white border-amber-500 ring-4 ring-amber-500/20"
                : "bg-slate-900 text-white border-emerald-500 ring-4 ring-emerald-500/20"
          }`}
        >
          {/* Top Row: Sender Info & Priority */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                  isStat ? "bg-red-600 animate-pulse" : isUrgent ? "bg-amber-500" : "bg-emerald-600"
                }`}
              >
                {isStat ? <Flame className="w-5 h-5" /> : <MessageSquare className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-slate-100">{activePrompt.senderName}</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                    {activePrompt.senderRole}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Target: {activePrompt.targetRole || activePrompt.targetDepartment || activePrompt.channelId || "Hospital Unit"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isStat && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white animate-pulse">
                  STAT CODE RED
                </span>
              )}
              {isUrgent && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white">
                  URGENT
                </span>
              )}
              <button
                onClick={() => setActivePrompt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subject & Message Preview */}
          <div className="space-y-1">
            {activePrompt.subject && (
              <h5 className="font-bold text-xs text-slate-100 line-clamp-1">
                {activePrompt.subject}
              </h5>
            )}
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {activePrompt.message}
            </p>
          </div>

          {/* Attached Structured Ticket Card Preview (Invoice, Transfer, Pre-Quote, Order) */}
          {activePrompt.ticketAttachment && (
            <div className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
              activePrompt.ticketAttachment.type === "invoice"
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-100"
                : activePrompt.ticketAttachment.type === "pre_quote"
                  ? "bg-blue-950/60 border-blue-500/50 text-blue-100"
                  : activePrompt.ticketAttachment.type === "patient_transfer"
                    ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-100"
                    : "bg-purple-950/60 border-purple-500/50 text-purple-100"
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-white/10 shrink-0">
                  {activePrompt.ticketAttachment.type === "invoice" ? (
                    <Receipt className="w-4 h-4 text-emerald-400" />
                  ) : activePrompt.ticketAttachment.type === "pre_quote" ? (
                    <FileText className="w-4 h-4 text-blue-400" />
                  ) : activePrompt.ticketAttachment.type === "patient_transfer" ? (
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <FlaskRound className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold truncate">
                    {activePrompt.ticketAttachment.type === "invoice" ? "Invoice Raised: " : activePrompt.ticketAttachment.type === "pre_quote" ? "Pre-Quote Estimate: " : "Transfer / Referral: "}
                    {activePrompt.ticketAttachment.patientName}
                  </p>
                  <p className="text-[10px] text-slate-300 font-mono">
                    #{activePrompt.ticketAttachment.ticketNo} • To: {activePrompt.ticketAttachment.toRole}
                  </p>
                </div>
              </div>

              {activePrompt.ticketAttachment.totalAmount !== undefined && (
                <span className="px-2 py-1 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs shrink-0">
                  KES {activePrompt.ticketAttachment.totalAmount.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Linked Patient Ticket Badge */}
          {activePrompt.relatedTicketNo && !activePrompt.ticketAttachment && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold text-emerald-300">{activePrompt.relatedTicketNo}</span>
              <span className="text-slate-300 truncate">({activePrompt.relatedPatientName})</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-500">Incoming Role Memo</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePrompt(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  onOpenChat(
                    activePrompt.targetRole || activePrompt.senderRole,
                    activePrompt.relatedTicketNo ? { patientName: activePrompt.relatedPatientName, ticketNo: activePrompt.relatedTicketNo } : undefined
                  );
                  setActivePrompt(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950/40 transition-all cursor-pointer hover:gap-1.5"
              >
                Open Inbox & Reply
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
