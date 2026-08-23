import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, updateDoc, doc, query, orderBy, deleteDoc, writeBatch } from "firebase/firestore";
import { QueueTicket } from "../types";
import { Monitor, Volume2, UserCheck, RefreshCw, Layers, ExternalLink, Play, Trash2, Trash, Megaphone } from "lucide-react";
import { toast } from "../lib/promptService";
import { voiceAnnouncer, ActiveAnnouncement } from "../lib/voiceAnnouncementService";

interface QueueDashboardProps {
  toggles: any;
}

export default function QueueDashboard({ toggles }: QueueDashboardProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignageView, setIsSignageView] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to Voice Announcer events
  useEffect(() => {
    const unsub = voiceAnnouncer.subscribe((active) => {
      setActiveAnnouncement(active);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Read queue tickets ordered by timestamp
    const q = query(collection(db, "queue"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        ticketsData.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resolveRoomName = (ticket: QueueTicket) => {
    if (ticket.consultationRoom) return ticket.consultationRoom;
    if (ticket.currentDepartment === "laboratory") return "Lab Window A";
    if (ticket.currentDepartment === "radiology") return "X-Ray Room 1";
    if (ticket.currentDepartment === "pharmacy") return "Pharmacy Dispenser B";
    if (ticket.currentDepartment === "labour_room") return "Maternity Labour Room";
    if (ticket.currentDepartment === "gyna") return "Obstetrics & Gyna Clinic";
    return "Room 5, Doctor";
  };

  const announceTicket = async (ticket: QueueTicket, customRoom?: string) => {
    const room = customRoom || resolveRoomName(ticket);
    const deptRole = ticket.specialistTitle || ticket.assignedSpecialistName || (ticket.currentDepartment === "doctor" ? "Doctor" : ticket.currentDepartment);

    await voiceAnnouncer.announceTurnArrived({
      ticketNo: ticket.ticketNo,
      patientName: ticket.patientName,
      roomOrDesk: room,
      departmentOrRole: deptRole,
    });
  };

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
        let roomName = "Consultation Desk 1";
        if (currentDept === "laboratory") roomName = "Lab Window A";
        if (currentDept === "radiology") roomName = "X-Ray Room 1";
        if (currentDept === "pharmacy") roomName = "Pharmacy Dispensing Counter";
        announceTicket(ticket.ticketNo, roomName);
      }
    } catch (err) {
      console.error("Failed to update ticket status:", err);
    }
  };

  // Group tickets by department
  const pendingTickets = tickets.filter(t => t.status === "pending");
  const servingTickets = tickets.filter(t => t.status === "serving");
  const completedTickets = tickets.filter(t => t.status === "completed" || t.status === "skipped");

  // Filter based on active toggles
  const filterByToggle = (list: QueueTicket[]) => {
    return list.filter(t => {
      if (t.currentDepartment === "doctor" && !toggles.doctor) return false;
      if (t.currentDepartment === "laboratory" && !toggles.laboratory) return false;
      if (t.currentDepartment === "radiology" && !toggles.radiology) return false;
      if (t.currentDepartment === "pharmacy" && !toggles.pharmacy) return false;
      return true;
    });
  };

  const filteredPending = filterByToggle(pendingTickets);
  const filteredServing = filterByToggle(servingTickets);

  if (isSignageView) {
    return (
      <div id="full-signage" className="fixed inset-0 bg-white text-slate-900 z-50 flex flex-col p-8 font-sans overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-200 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">HMIS TICKETING SYSTEM</h1>
          </div>
          <button
            id="btn-close-signage"
            onClick={() => setIsSignageView(false)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            Exit Public View
          </button>
        </div>

        {/* Current serving board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Active Serving Area */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-emerald-600" />
              <span>NOW SERVING / SASA HIVI</span>
            </h2>

            {filteredServing.length === 0 ? (
              <div className="h-[350px] border border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center justify-center text-slate-500 text-center p-6">
                <Monitor className="w-16 h-16 mb-4 text-slate-300" />
                <p className="text-lg font-semibold text-slate-700">No active calls being processed</p>
                <p className="text-xs text-slate-500 mt-1">Doctors or technicians will announce ticket numbers shortly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredServing.map((t) => {
                  let deptName = "Consultation Desk 1";
                  let bg = "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-sm";
                  if (t.currentDepartment === "laboratory") {
                    deptName = "Lab Window A";
                    bg = "bg-blue-50/90 border-blue-300 text-blue-950 shadow-sm";
                  } else if (t.currentDepartment === "radiology") {
                    deptName = "X-Ray Counter 1";
                    bg = "bg-purple-50/90 border-purple-300 text-purple-950 shadow-sm";
                  } else if (t.currentDepartment === "pharmacy") {
                    deptName = "POS Dispenser B";
                    bg = "bg-amber-50/90 border-amber-300 text-amber-950 shadow-sm";
                  } else if (t.currentDepartment === "labour_room") {
                    deptName = "Maternity Labour Room";
                    bg = "bg-rose-50/90 border-rose-300 text-rose-950 shadow-sm";
                  } else if (t.currentDepartment === "gyna") {
                    deptName = "Obstetrics & Gyna Clinic";
                    bg = "bg-pink-50/90 border-pink-300 text-pink-950 shadow-sm";
                  }

                  const isAnnouncing = announcingTicket === t.ticketNo;

                  return (
                    <div
                      key={t.id}
                      className={`border-2 p-8 rounded-3xl flex flex-col items-center justify-center text-center transition-all duration-500 ${bg} ${
                        isAnnouncing ? "ring-4 ring-emerald-500 scale-105 bg-emerald-100 shadow-xl" : ""
                      }`}
                    >
                      <span className="text-[11px] uppercase font-bold tracking-widest text-slate-600 block mb-2">
                        {t.currentDepartment === "doctor" ? "General Medical" : t.currentDepartment}
                      </span>
                      <h3 className="text-6xl font-extrabold tracking-wider font-mono my-2 text-slate-950">
                        {t.ticketNo}
                      </h3>
                      <div className="h-1 w-12 bg-slate-300 rounded-full my-3" />
                      <p className="text-xl font-bold text-slate-900">{deptName}</p>
                      <p className="text-xs text-slate-600 font-medium truncate w-full mt-2">
                        Patient: {t.patientName}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending queue list */}
          <div className="border border-slate-200 rounded-3xl bg-slate-50 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
              Queue Intake List
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[600px]">
              {filteredPending.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm py-12">
                  Intake queue empty
                </div>
              ) : (
                filteredPending.map((t) => (
                  <div key={t.id} className="flex justify-between items-center p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-emerald-700">{t.ticketNo}</span>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-900">{t.patientName}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{t.currentDepartment} visit</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-md">
                      Waiting
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="queue-dashboard" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative">
      {/* Instant Notification Toast */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-40 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">HMIS Intelligent Ticket Router</h2>
            <p className="text-xs text-gray-500">Real-time Patient Queue & HMIS Ticketing System Controller</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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

          <button
            id="btn-launch-signage"
            onClick={() => setIsSignageView(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch HMIS Ticketing Display
          </button>
        </div>
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
                            let roomName = "Consultation Desk 1";
                            if (t.currentDepartment === "laboratory") roomName = "Lab Window A";
                            if (t.currentDepartment === "radiology") roomName = "X-Ray Room 1";
                            if (t.currentDepartment === "pharmacy") roomName = "Pharmacy Counter";
                            announceTicket(t.ticketNo, roomName);
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
