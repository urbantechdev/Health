import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";
import { PatientTransfer, SystemRole, QueueTicket } from "../types";
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock,
  User,
  AlertTriangle,
  Flame,
  Activity,
  Building2,
  Stethoscope,
  Filter,
  Search,
  Check,
  X,
  Send,
  BedDouble,
  HeartPulse,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { toast, modernAlert, modernPrompt, modernConfirm } from "../lib/promptService";

interface TransfersHubProps {
  currentUser: {
    name: string;
    email: string;
    role: SystemRole | string;
    department?: string;
  };
  activeSpecialistId?: string;
  onOpenTransferModal?: () => void;
  onViewPatientJourney?: (ticketNo: string) => void;
}

export default function TransfersHub({
  currentUser,
  activeSpecialistId,
  onOpenTransferModal,
  onViewPatientJourney
}: TransfersHubProps) {
  const [transfers, setTransfers] = useState<PatientTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"incoming" | "on_hold" | "accepted" | "outgoing" | "all">("incoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

  // Action states for prompt modal
  const [actionTransfer, setActionTransfer] = useState<PatientTransfer | null>(null);
  const [actionType, setActionType] = useState<"accept" | "decline" | "hold" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [assignedRoom, setAssignedRoom] = useState("");
  const [holdEstimatedTime, setHoldEstimatedTime] = useState("30 mins");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Real-time listener for patient_transfers
  useEffect(() => {
    const q = query(collection(db, "patient_transfers"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PatientTransfer[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PatientTransfer);
      });
      setTransfers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Determine current user's department matching key
  const userRole = (currentUser.role || "").toLowerCase();
  const userDept = (currentUser.department || "").toLowerCase();

  // Match if transfer is targeted to current user's role or department
  const isIncomingToMe = (t: PatientTransfer) => {
    if (userRole === "super admin" || userRole === "admin") return true;
    const dest = t.toDepartment.toLowerCase();
    if (userRole === "doctor" && (dest === "doctor" || dest === "cardiology" || dest === "surgery" || dest === "pediatrics" || dest === "gyna" || dest === "labour_room" || dest === "icu" || dest === "inpatient_ward")) {
      return true;
    }
    if (userRole === "lab" && dest === "laboratory") return true;
    if (userRole === "pharmacy" && dest === "pharmacy") return true;
    if (userRole === "reception" && (dest === "reception" || dest === "triage")) return true;
    if (dest === userDept) return true;
    return false;
  };

  const isOutgoingFromMe = (t: PatientTransfer) => {
    return t.referredByDoctorName === currentUser.name || t.referredByEmail === currentUser.email;
  };

  // Filter transfers for current view tab
  const filteredTransfers = transfers.filter((t) => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        t.patientName.toLowerCase().includes(q) ||
        t.ticketNo.toLowerCase().includes(q) ||
        t.toDepartment.toLowerCase().includes(q) ||
        t.fromDepartment.toLowerCase().includes(q) ||
        t.reasonForTransfer.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Department filter
    if (selectedDeptFilter !== "all" && t.toDepartment !== selectedDeptFilter) {
      return false;
    }

    if (activeTab === "incoming") {
      return isIncomingToMe(t) && t.status === "pending";
    }
    if (activeTab === "on_hold") {
      return isIncomingToMe(t) && t.status === "on_hold";
    }
    if (activeTab === "accepted") {
      return isIncomingToMe(t) && t.status === "accepted";
    }
    if (activeTab === "outgoing") {
      return isOutgoingFromMe(t);
    }
    return true; // "all"
  });

  // Count metrics
  const incomingCount = transfers.filter((t) => isIncomingToMe(t) && t.status === "pending").length;
  const onHoldCount = transfers.filter((t) => isIncomingToMe(t) && t.status === "on_hold").length;
  const acceptedCount = transfers.filter((t) => isIncomingToMe(t) && t.status === "accepted").length;
  const outgoingCount = transfers.filter((t) => isOutgoingFromMe(t)).length;

  // Open Action Modal
  const openActionModal = (transfer: PatientTransfer, type: "accept" | "decline" | "hold") => {
    setActionTransfer(transfer);
    setActionType(type);
    setActionNote("");
    setAssignedRoom(transfer.toSpecialistTitle ? `Consultation Room (${transfer.toSpecialistName})` : "General Consultation Desk 1");
  };

  // Execute Accept / Decline / Hold
  const handleExecuteAction = async () => {
    if (!actionTransfer || !actionType) return;

    setSubmittingAction(true);
    try {
      const transferDocRef = doc(db, "patient_transfers", actionTransfer.id);
      const timestamp = new Date().toISOString();

      if (actionType === "accept") {
        // 1. Update transfer doc
        await updateDoc(transferDocRef, {
          status: "accepted",
          actionBy: currentUser.name,
          actionByRole: currentUser.role,
          actionTimestamp: timestamp,
          actionNotes: actionNote.trim() || "Transfer accepted and patient admitted to queue.",
          assignedRoomOrBed: assignedRoom.trim() || undefined
        });

        // 2. Update patient queue ticket to route them to this department
        if (actionTransfer.ticketId) {
          try {
            await updateDoc(doc(db, "queue", actionTransfer.ticketId), {
              currentDepartment: actionTransfer.toDepartment,
              assignedSpecialistId: actionTransfer.toSpecialistId || null,
              assignedSpecialistName: actionTransfer.toSpecialistName || null,
              specialistTitle: actionTransfer.toSpecialistTitle || null,
              status: "pending",
              consultationRoom: assignedRoom.trim() || "Consultation Room"
            });
          } catch (qErr) {
            console.warn("Could not update queue doc directly:", qErr);
          }
        }

        // 3. Send confirmation message to referring unit
        await addDoc(collection(db, "internal_messages"), {
          senderId: currentUser.email || currentUser.name,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          targetType: "department",
          targetDepartment: actionTransfer.fromDepartment,
          channelId: "doctors",
          subject: `✅ Transfer ACCEPTED: ${actionTransfer.ticketNo} - ${actionTransfer.patientName}`,
          message: `Dr. ${currentUser.name} (${currentUser.role}) has ACCEPTED the transfer of patient ${actionTransfer.patientName} (${actionTransfer.ticketNo}) to ${actionTransfer.toDepartment.toUpperCase()}.\nAssigned Station/Room: ${assignedRoom || "Immediate Intake"}.\nNotes: ${actionNote || "Patient in intake queue."}`,
          priority: "normal",
          category: "referral_notice",
          relatedPatientName: actionTransfer.patientName,
          relatedTicketNo: actionTransfer.ticketNo,
          readBy: [currentUser.email || currentUser.name],
          timestamp
        });

        toast.success(
          `Accepted transfer for ${actionTransfer.patientName} (${actionTransfer.ticketNo}). Patient ticket routed to ${actionTransfer.toDepartment.toUpperCase()}.`,
          "Transfer Accepted"
        );
      } else if (actionType === "decline") {
        if (!actionNote.trim()) {
          toast.error("Please provide a reason for declining the patient transfer.", "Decline Reason Required");
          setSubmittingAction(false);
          return;
        }

        await updateDoc(transferDocRef, {
          status: "declined",
          actionBy: currentUser.name,
          actionByRole: currentUser.role,
          actionTimestamp: timestamp,
          declineReason: actionNote.trim()
        });

        // Send alert back to referring doctor
        await addDoc(collection(db, "internal_messages"), {
          senderId: currentUser.email || currentUser.name,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          targetType: "department",
          targetDepartment: actionTransfer.fromDepartment,
          channelId: "doctors",
          subject: `❌ Transfer DECLINED: ${actionTransfer.ticketNo} - ${actionTransfer.patientName}`,
          message: `Transfer for patient ${actionTransfer.patientName} (${actionTransfer.ticketNo}) was DECLINED by ${currentUser.name} (${currentUser.role}).\nReason: ${actionNote.trim()}.\nPlease re-evaluate or route patient to alternative specialist unit.`,
          priority: "urgent",
          category: "referral_notice",
          relatedPatientName: actionTransfer.patientName,
          relatedTicketNo: actionTransfer.ticketNo,
          readBy: [currentUser.email || currentUser.name],
          timestamp
        });

        toast.warning(
          `Transfer for ${actionTransfer.patientName} was declined. Referring doctor notified.`,
          "Transfer Declined"
        );
      } else if (actionType === "hold") {
        await updateDoc(transferDocRef, {
          status: "on_hold",
          actionBy: currentUser.name,
          actionByRole: currentUser.role,
          actionTimestamp: timestamp,
          holdReason: `${actionNote.trim() || "Holding pending bed/test availability"} (Est: ${holdEstimatedTime})`
        });

        // Send holding alert back
        await addDoc(collection(db, "internal_messages"), {
          senderId: currentUser.email || currentUser.name,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          targetType: "department",
          targetDepartment: actionTransfer.fromDepartment,
          channelId: "doctors",
          subject: `⏸️ Transfer PLACED ON HOLD: ${actionTransfer.ticketNo} - ${actionTransfer.patientName}`,
          message: `Transfer for patient ${actionTransfer.patientName} (${actionTransfer.ticketNo}) has been placed ON HOLD by ${currentUser.name}.\nReason: ${actionNote || "Awaiting bed/test readiness"}.\nEstimated Duration: ${holdEstimatedTime}.`,
          priority: "normal",
          category: "referral_notice",
          relatedPatientName: actionTransfer.patientName,
          relatedTicketNo: actionTransfer.ticketNo,
          readBy: [currentUser.email || currentUser.name],
          timestamp
        });

        toast.info(
          `Patient ${actionTransfer.patientName} placed on hold. Holding status recorded.`,
          "Transfer On Hold"
        );
      }

      setActionTransfer(null);
      setActionType(null);
    } catch (err: any) {
      console.error("Failed to execute transfer action:", err);
      toast.error("Failed to update transfer status. Please check connection.", "Action Error");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div id="transfers-hub" className="space-y-6">
      {/* Top Banner & Action Trigger */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Patient Transfer & Referral Receiving Hub
              </h2>
              {incomingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-rose-500 text-white animate-pulse">
                  {incomingCount} Pending Action
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Review incoming referrals to your department, admit patients, manage holding queues, or refer out.
            </p>
          </div>
        </div>

        {onOpenTransferModal && (
          <button
            type="button"
            onClick={onOpenTransferModal}
            id="btn-launch-referral-modal"
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md shrink-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Initiate New Patient Transfer
          </button>
        )}
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-200/80 p-1.5 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "incoming" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
            Incoming for My Unit
            {incomingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {incomingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("on_hold")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "on_hold" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            On Hold ({onHoldCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("accepted")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "accepted" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Accepted ({acceptedCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outgoing")}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "outgoing" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Outgoing Referrals ({outgoingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Facility Records ({transfers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ticket, reason..."
            className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-60"
          />
        </div>
      </div>

      {/* Transfers Cards Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Loading live hospital transfers...
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center text-slate-400 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <ArrowRightLeft className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-700">No transfer records found in this view</p>
          <p className="text-xs max-w-sm mt-1">
            When doctors or front desk staff refer patients to your department, their transfer tickets will appear here with one-click Accept, Decline, or On-Hold actions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTransfers.map((t) => {
            const isStat = t.priority === "STAT Emergency";
            const isUrgent = t.priority === "Urgent";
            const isPending = t.status === "pending";
            const isOnHold = t.status === "on_hold";
            const isAccepted = t.status === "accepted";
            const isDeclined = t.status === "declined";

            return (
              <div
                key={t.id}
                className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isStat
                    ? "border-red-300 ring-2 ring-red-200/60 bg-red-50/20"
                    : isPending
                      ? "border-emerald-300 ring-1 ring-emerald-200/60"
                      : isOnHold
                        ? "border-amber-300 bg-amber-50/10"
                        : "border-slate-200"
                }`}
              >
                <div>
                  {/* Card Header: Ticket No, Patient Name, Priority Badge */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {t.ticketNo}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">{t.patientName}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Age: {t.age || "35"} • {t.gender || "Gender N/A"} • ID: {t.nationalId}
                      </p>
                    </div>

                    {/* Priority & Status Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {isStat ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 animate-pulse">
                          <Flame className="w-2.5 h-2.5" /> STAT Emergency
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Urgent
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                          Routine
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isAccepted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isDeclined
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : isOnHold
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-blue-100 text-blue-800 border border-blue-300"
                        }`}
                      >
                        {t.status === "on_hold" ? "On Hold" : t.status}
                      </span>
                    </div>
                  </div>

                  {/* Transfer Route & Doctor Handover */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl mb-3 border border-slate-150">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">From Unit:</span>
                      <p className="font-bold text-slate-800 truncate">{t.fromUnitName}</p>
                      <p className="text-[10px] text-slate-500 truncate">Dr. {t.referredByDoctorName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination:</span>
                      <p className="font-bold text-emerald-800 uppercase truncate">{t.toDepartment}</p>
                      <p className="text-[10px] text-slate-500 truncate">{t.toSpecialistTitle || "Department Roster"}</p>
                    </div>
                  </div>

                  {/* Reason & Clinical Notes */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <p>
                      <strong className="text-slate-900">Reason:</strong> {t.reasonForTransfer}
                    </p>
                    {t.clinicalSummary && (
                      <p className="text-slate-600 bg-white p-2 rounded-xl border border-slate-100 italic">
                        "{t.clinicalSummary}"
                      </p>
                    )}

                    {/* Vitals Summary */}
                    {t.vitalsSummary && (
                      <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                        {t.vitalsSummary.bp && <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">BP: {t.vitalsSummary.bp}</span>}
                        {t.vitalsSummary.pulse && <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">Pulse: {t.vitalsSummary.pulse} bpm</span>}
                        {t.vitalsSummary.temp && <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">Temp: {t.vitalsSummary.temp}°C</span>}
                      </div>
                    )}

                    {/* Hold Reason Banner if On Hold */}
                    {isOnHold && t.holdReason && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 mt-2">
                        <PauseCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Hold Condition:</p>
                          <p className="text-[11px]">{t.holdReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Decline Reason Banner */}
                    {isDeclined && t.declineReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 mt-2">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Decline Reason:</p>
                          <p className="text-[11px]">{t.declineReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Accepted Details */}
                    {isAccepted && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2 mt-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Admitted by {t.actionBy} ({t.actionByRole})</p>
                          {t.assignedRoomOrBed && <p className="text-[11px]">Room / Station: {t.assignedRoomOrBed}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* If pending or on_hold, allow Accept, Decline, Hold */}
                    {(isPending || isOnHold) && (
                      <>
                        <button
                          type="button"
                          onClick={() => openActionModal(t, "accept")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Patient
                        </button>

                        {!isOnHold && (
                          <button
                            type="button"
                            onClick={() => openActionModal(t, "hold")}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            Put on Hold
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openActionModal(t, "decline")}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {onViewPatientJourney && (
                      <button
                        type="button"
                        onClick={() => onViewPatientJourney(t.ticketNo)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Journey
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Execution Modal (Accept / Decline / Hold) */}
      {actionTransfer && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
                    actionType === "accept"
                      ? "bg-emerald-600"
                      : actionType === "hold"
                        ? "bg-amber-500"
                        : "bg-rose-600"
                  }`}
                >
                  {actionType === "accept" ? (
                    <Check className="w-5 h-5" />
                  ) : actionType === "hold" ? (
                    <PauseCircle className="w-5 h-5" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {actionType === "accept"
                      ? `Accept Patient Transfer`
                      : actionType === "hold"
                        ? `Place Transfer On Hold`
                        : `Decline Patient Transfer`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {actionTransfer.patientName} (<span className="font-mono font-bold text-emerald-800">{actionTransfer.ticketNo}</span>)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActionTransfer(null);
                  setActionType(null);
                }}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs depending on action */}
            <div className="space-y-3 text-xs">
              {actionType === "accept" && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Assigned Consultation Room / Station Bed:
                    </label>
                    <input
                      type="text"
                      value={assignedRoom}
                      onChange={(e) => setAssignedRoom(e.target.value)}
                      placeholder="e.g. Room 104 - Cardiac Clinic, Bed 3A"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Admission Note / Instructions to Staff:
                    </label>
                    <textarea
                      rows={2}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="e.g. Patient admitted for immediate echocardiogram and ECG."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </>
              )}

              {actionType === "hold" && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Reason for Putting on Hold:
                    </label>
                    <input
                      type="text"
                      required
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="e.g. Awaiting critical troponin lab results before cardiologist review"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Estimated Duration of Hold:
                    </label>
                    <select
                      value={holdEstimatedTime}
                      onChange={(e) => setHoldEstimatedTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="15 mins">15 minutes (Quick Lab turnaround)</option>
                      <option value="30 mins">30 minutes</option>
                      <option value="1 hour">1 hour (Bed prep/theatre cleanup)</option>
                      <option value="2+ hours">2+ hours (Stabilization)</option>
                    </select>
                  </div>
                </>
              )}

              {actionType === "decline" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Reason for Declining Transfer * (Dispatched to referring unit)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="e.g. Specialist currently in emergency theatre; recommend routing to Dr. Otieno in Suite 2."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActionTransfer(null);
                  setActionType(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingAction}
                onClick={handleExecuteAction}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer ${
                  actionType === "accept"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30"
                    : actionType === "hold"
                      ? "bg-amber-500 hover:bg-amber-400 shadow-amber-950/30"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-950/30"
                }`}
              >
                {submittingAction ? "Processing..." : `Confirm ${actionType.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
