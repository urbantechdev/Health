import React, { useState, useEffect } from "react";
import { db, cleanFirestoreData } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { QueueTicket, MedicalRecord, Invoice, Medication, ClinicalVisit, Employee } from "../types";
import { findUnifiedPatient } from "../lib/patientSyncService";
import StationRoutingPromptModal, { TargetStationType } from "./StationRoutingPromptModal";
import {
  Activity,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  FlaskRound,
  ShoppingCart,
  CreditCard,
  Building,
  Check,
  ChevronRight,
  Heart,
  FileText,
  BadgeAlert,
  Smartphone,
  Fingerprint,
  Zap,
  Trash2,
  Send,
  ShieldCheck,
  CornerDownRight,
  ExternalLink
} from "lucide-react";
import { toast } from "../lib/promptService";
import HaemogramDocument from "./HaemogramDocument";
import { isHaemogramReport } from "../lib/haemogramParser";

interface PatientJourneyTrackerProps {
  onNavigateTab?: (tab: string) => void;
}

export default function PatientJourneyTracker({ onNavigateTab }: PatientJourneyTrackerProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routingInProgress, setRoutingInProgress] = useState<string | null>(null);
  const [journeyLogs, setJourneyLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHaemogramResult, setSelectedHaemogramResult] = useState<string | null>(null);

  // Station Routing & Personnel Prompt Modal State
  const [routingModalOpen, setRoutingModalOpen] = useState(false);
  const [modalTargetStation, setModalTargetStation] = useState<TargetStationType>("triage");

  const openRoutingModal = (station: TargetStationType) => {
    setModalTargetStation(station);
    setRoutingModalOpen(true);
  };

  const addLog = (msg: string) => {
    setJourneyLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleDeleteJourneyTicket = async (ticketId: string, ticketNo?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic removal (0ms)
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null);
    }
    addLog(`Ticket ${ticketNo || ticketId} removed from live journey registry.`);

    try {
      await deleteDoc(doc(db, "queue", ticketId));
      toast.info(`Ticket ${ticketNo || ticketId} archived.`, "Journey Updated");
    } catch (err) {
      console.error("Error deleting journey ticket:", err);
    }
  };

  // Load Firestore data
  useEffect(() => {
    // 1. Subscribe to entire Queue Tickets sorted by newest
    const qQueue = query(collection(db, "queue"), orderBy("timestamp", "desc"));
    const unsubQueue = onSnapshot(qQueue, (snapshot) => {
      const ticks: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        ticks.push({ id: doc.id, ...doc.data() } as QueueTicket);
      });
      setTickets(ticks);
      setLoading(false);

      // Auto-select first ticket if none selected
      if (ticks.length > 0 && !selectedTicketId) {
        setSelectedTicketId(ticks[0].id);
      }
    });

    // 2. Subscribe to Patients EHR
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        pats.push({ id: doc.id, ...doc.data() } as MedicalRecord);
      });
      setPatients(pats);
    });

    // 3. Subscribe to Invoices
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invs: Invoice[] = [];
      snapshot.forEach((doc) => {
        invs.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invs);
    });

    // 4. Subscribe to Medications
    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      const meds: Medication[] = [];
      snapshot.forEach((doc) => {
        meds.push({ id: doc.id, ...doc.data() } as Medication);
      });
      setMedications(meds);
    });

    // 5. Subscribe to Employees
    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => {
        emps.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(emps);
    });

    return () => {
      unsubQueue();
      unsubPatients();
      unsubInvoices();
      unsubMeds();
      unsubEmployees();
    };
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const matchedPatient = selectedTicket
    ? findUnifiedPatient(selectedTicket.patientId || selectedTicket.nationalId || selectedTicket.patientName, patients)
    : null;
  const matchedInvoice = selectedTicket
    ? invoices.find(
        (i) =>
          ((i.nationalId && selectedTicket.nationalId && i.nationalId === selectedTicket.nationalId) ||
            i.patientName.toLowerCase() === selectedTicket.patientName.toLowerCase()) &&
          i.paymentStatus !== "paid"
      ) ||
      invoices
        .filter(
          (i) =>
            (i.nationalId && selectedTicket.nationalId && i.nationalId === selectedTicket.nationalId) ||
            i.patientName.toLowerCase() === selectedTicket.patientName.toLowerCase()
        )
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
    : null;

  // Helpers for identifying patient level of service, departments and live icons
  const getDeptLabel = (dept: string) => {
    switch (dept) {
      case "reception":
        return "Reception Intake";
      case "triage":
        return "Nurse Triage & Vitals";
      case "queue":
        return "Live Queue Waiting";
      case "doctor":
        return "Doctor Consultation";
      case "laboratory":
      case "lab":
        return "Laboratory (LIS)";
      case "radiology":
        return "Radiology Scans (RIS)";
      case "pharmacy":
        return "Pharmacy Dispensary";
      case "billing":
        return "Billing & eTIMS Cashier";
      case "labour_room":
        return "Labour Room (Maternity)";
      case "gyna":
      case "gynaecology":
        return "Gynecology (Gyna)";
      case "security":
      case "discharged":
        return "Security Gate Pass / Discharged";
      default:
        return dept ? dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "General Station";
    }
  };

  // Derive Patient journey steps
  const getJourneyState = (ticket: QueueTicket, patient: MedicalRecord | null, invoice: Invoice | null) => {
    const currentDept = ticket.currentDepartment;
    const isCompleted = ticket.status === "completed" || ticket.gatePassIssued;

    const hasReferrals =
      patient?.visits &&
      patient.visits.length > 0 &&
      patient.visits[patient.visits.length - 1].referrals &&
      patient.visits[patient.visits.length - 1].referrals!.length > 0;
    const hasPrescriptions =
      patient?.visits &&
      patient.visits.length > 0 &&
      patient.visits[patient.visits.length - 1].prescriptions &&
      patient.visits[patient.visits.length - 1].prescriptions!.length > 0;

    let stepIndex = 0; // Reception
    if (currentDept === "triage") {
      stepIndex = 1;
    } else if (currentDept === "doctor") {
      stepIndex = 2;
    } else if (["laboratory", "lab", "radiology", "diagnostics", "labour_room", "gyna", "gynaecology"].includes(currentDept)) {
      stepIndex = 3;
    } else if (currentDept === "pharmacy") {
      stepIndex = 4;
    } else if (currentDept === "billing") {
      stepIndex = 5;
    } else if (currentDept === "reception" || currentDept === "queue") {
      stepIndex = 0;
    }

    if (isCompleted) {
      stepIndex = 6; // Discharged
    }

    return {
      stepIndex,
      hasReferrals,
      hasPrescriptions
    };
  };

  const journeyState = selectedTicket ? getJourneyState(selectedTicket, matchedPatient || null, matchedInvoice || null) : null;

  // Real operational route dispatcher
  const handleRoutePatient = async (targetDepartment: string, prefix: string, notes: string) => {
    if (!selectedTicket) return;
    setRoutingInProgress(targetDepartment);
    const ticketId = selectedTicket.id;
    const rawNumber = selectedTicket.ticketNo.includes("-")
      ? selectedTicket.ticketNo.split("-")[1]
      : selectedTicket.ticketNo.replace(/\D/g, "") || String(Math.floor(100 + Math.random() * 900));
    const nextTicketNo = `${prefix}-${rawNumber}`;

    try {
      await updateDoc(doc(db, "queue", ticketId), {
        currentDepartment: targetDepartment,
        ticketNo: nextTicketNo,
        status: "pending",
        notes
      });
      addLog(`Patient routed to ${getDeptLabel(targetDepartment)} with Ticket #${nextTicketNo}`);
      toast.success(`Patient routed to ${getDeptLabel(targetDepartment)} (#${nextTicketNo})`, "Queue Updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to route patient ticket.", "Routing Error");
    } finally {
      setRoutingInProgress(null);
    }
  };

  // Comprehensive modal route dispatcher with Practitioner & Room assignment
  const handleConfirmModalRoute = async (params: {
    targetDepartment: string;
    prefix: string;
    notes: string;
    assignedSpecialistId?: string;
    assignedSpecialistName?: string;
    specialistTitle?: string;
    consultationRoom?: string;
    targetClinic?: string;
    priority?: "normal" | "urgent" | "emergency";
  }) => {
    if (!selectedTicket) return;
    setRoutingInProgress(params.targetDepartment);
    const ticketId = selectedTicket.id;
    const rawNumber = selectedTicket.ticketNo.includes("-")
      ? selectedTicket.ticketNo.split("-")[1]
      : selectedTicket.ticketNo.replace(/\D/g, "") || String(Math.floor(100 + Math.random() * 900));
    const nextTicketNo = `${params.prefix}-${rawNumber}`;

    try {
      await updateDoc(doc(db, "queue", ticketId), {
        currentDepartment: params.targetDepartment,
        ticketNo: nextTicketNo,
        status: "pending",
        notes: params.notes,
        assignedSpecialistId: params.assignedSpecialistId || null,
        assignedSpecialistName: params.assignedSpecialistName || null,
        specialistTitle: params.specialistTitle || null,
        consultationRoom: params.consultationRoom || null,
        targetClinic: params.targetClinic || null,
        priority: params.priority || "normal",
        dispatchedAt: new Date().toISOString()
      });

      const practitionerLabel = params.assignedSpecialistName ? ` -> ${params.assignedSpecialistName} (${params.consultationRoom || "Assigned Room"})` : "";
      addLog(`Patient routed to ${getDeptLabel(params.targetDepartment)}${practitionerLabel} with Ticket #${nextTicketNo}`);
      toast.success(
        `Patient routed to ${getDeptLabel(params.targetDepartment)}${params.assignedSpecialistName ? ` • ${params.assignedSpecialistName}` : ""} (#${nextTicketNo})`,
        "Encounter Dispatched"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to route patient ticket.", "Routing Error");
    } finally {
      setRoutingInProgress(null);
    }
  };

  // Real Gate Pass Discharge
  const handleIssueGatePassAndDischarge = async () => {
    if (!selectedTicket) return;
    setRoutingInProgress("discharge");
    const ticketId = selectedTicket.id;
    const gatePassCode = `PASS-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      await updateDoc(doc(db, "queue", ticketId), {
        status: "completed",
        gatePassIssued: true,
        gatePassCode,
        gatePassTimestamp: new Date().toISOString(),
        currentDepartment: "security",
        notes: `Patient discharged. Digital Security Gate Pass #${gatePassCode} issued.`
      });
      addLog(`Digital Security Gate Pass ${gatePassCode} issued. Patient successfully discharged.`);
      toast.success(`Security Gate Pass ${gatePassCode} generated. Patient discharged.`, "Discharge Complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to issue gate pass.", "Discharge Error");
    } finally {
      setRoutingInProgress(null);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.patientName.toLowerCase().includes(q) ||
      t.ticketNo.toLowerCase().includes(q) ||
      (t.nationalId && t.nationalId.includes(q)) ||
      (t.currentDepartment && t.currentDepartment.toLowerCase().includes(q))
    );
  });

  return (
    <div id="patient-journey-wrapper" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Hospital Patient Journey & Milestone Orchestrator</h2>
              <p className="text-xs text-gray-500">
                Live multi-station clinical workflow tracker: Reception → Nurse Triage → Doctor → Diagnostics → Smart Pharmacy → Billing → Security Gate Pass
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{tickets.filter((t) => t.status !== "completed").length} Active Encounters</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Checked-in List, Right Detailed Interactive Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Queue Tickets */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Checked-in Patients ({filteredTickets.length})</span>
              </h3>
            </div>

            <input
              type="text"
              placeholder="Search by name, ticket #, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
            />

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-8 text-xs text-gray-400">Loading active tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl p-4">
                  No active patients in queue. Register patients at the Reception Kiosk.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = ticket.id === selectedTicketId;
                  const isDone = ticket.status === "completed" || ticket.gatePassIssued;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? "bg-emerald-50/70 border-emerald-500 shadow-xs"
                          : "bg-white border-gray-150 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-gray-900 px-2 py-0.5 bg-gray-100 rounded">
                              {ticket.ticketNo}
                            </span>
                            <span className="font-bold text-gray-900 text-xs truncate max-w-[140px]">
                              {ticket.patientName}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{new Date(ticket.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-800">{getDeptLabel(ticket.currentDepartment)}</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteJourneyTicket(ticket.id, ticket.ticketNo, e)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Archive / Remove ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                          isDone
                            ? "bg-gray-100 text-gray-600"
                            : ticket.currentDepartment === "doctor"
                            ? "bg-blue-100 text-blue-800"
                            : ticket.currentDepartment === "triage"
                            ? "bg-amber-100 text-amber-800"
                            : ticket.currentDepartment === "pharmacy"
                            ? "bg-orange-100 text-orange-800"
                            : ticket.currentDepartment === "billing"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {isDone ? "Discharged" : ticket.currentDepartment}
                        </span>

                        <span className="text-gray-400 font-mono">
                          {ticket.nationalId ? `ID: ${ticket.nationalId}` : "Walk-in"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Facility Timeline Audit Log */}
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Facility Journey Event Log</span>
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto text-[10px] font-mono text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              {journeyLogs.length === 0 ? (
                <p className="text-gray-400 italic">Facility routing events will appear here in real-time.</p>
              ) : (
                journeyLogs.map((log, idx) => (
                  <p key={idx} className="leading-tight">{log}</p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Patient Journey Milestone Map & Node Cards */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-6">
          {selectedTicket && journeyState ? (
            <div className="space-y-6">
              {/* Selected Patient Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-mono font-black text-xs rounded-lg">
                      {selectedTicket.ticketNo}
                    </span>
                    <h3 className="font-extrabold text-gray-900 text-base">{selectedTicket.patientName}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedTicket.nationalId && `National ID: ${selectedTicket.nationalId} • `}
                    {selectedTicket.phone && `Phone: ${selectedTicket.phone} • `}
                    {selectedTicket.service && `Intake Service: ${selectedTicket.service}`}
                  </p>
                  {selectedTicket.assignedSpecialistName && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        <span>Assigned: <strong>{selectedTicket.assignedSpecialistName}</strong></span>
                        {selectedTicket.consultationRoom && (
                          <span className="text-blue-600 font-normal">({selectedTicket.consultationRoom})</span>
                        )}
                      </span>
                      {selectedTicket.priority && selectedTicket.priority !== "normal" && (
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${
                          selectedTicket.priority === "emergency"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}>
                          {selectedTicket.priority}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => {
                        const dept = selectedTicket.currentDepartment;
                        if (dept === "doctor") onNavigateTab("doctor");
                        else if (dept === "triage") onNavigateTab("triage");
                        else if (dept === "pharmacy") onNavigateTab("pharmacy");
                        else if (dept === "billing") onNavigateTab("billing");
                        else if (["laboratory", "radiology", "diagnostics"].includes(dept)) onNavigateTab("diagnostics");
                        else onNavigateTab("queue");
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Open Station Console</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Station Step Timeline Bar */}
              <div className="py-2 overflow-x-auto">
                <div className="flex items-center justify-between min-w-[620px] relative px-4">
                  {/* Progress Line */}
                  <div className="absolute left-6 right-6 top-5 h-0.5 bg-gray-200 -z-0">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (journeyState.stepIndex / 6) * 100)}%`
                      }}
                    ></div>
                  </div>

                  {/* Nodes */}
                  {[
                    { key: "reception", stationType: null, label: "1. Reception", icon: Building },
                    { key: "triage", stationType: "triage" as TargetStationType, label: "2. Nurse Triage", icon: Heart },
                    { key: "doctor", stationType: "doctor" as TargetStationType, label: "3. Doctor Consult", icon: Stethoscope },
                    { key: "diagnostics", stationType: "diagnostics" as TargetStationType, label: "4. Diagnostics", icon: FlaskRound },
                    { key: "pharmacy", stationType: "pharmacy" as TargetStationType, label: "5. Pharmacy", icon: ShoppingCart },
                    { key: "billing", stationType: "billing" as TargetStationType, label: "6. Billing & eTIMS", icon: CreditCard },
                    { key: "discharge", stationType: null, label: "7. Gate Pass Exit", icon: ShieldCheck }
                  ].map((step, idx) => {
                    const isPassed = journeyState.stepIndex > idx;
                    const isActive = journeyState.stepIndex === idx;
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.key}
                        onClick={() => {
                          if (step.stationType) {
                            openRoutingModal(step.stationType);
                          }
                        }}
                        className={`flex flex-col items-center text-center space-y-1.5 z-10 ${
                          step.stationType ? "cursor-pointer group" : ""
                        }`}
                        title={step.stationType ? `Click to dispatch patient to ${step.label}` : undefined}
                      >
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all bg-white ${
                            isActive
                              ? "border-emerald-600 text-emerald-700 shadow-md ring-4 ring-emerald-100"
                              : isPassed
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-300 text-gray-400 group-hover:border-emerald-400 group-hover:text-emerald-600"
                          }`}
                        >
                          {isPassed ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`text-[10px] font-bold tracking-tight leading-tight ${
                            isActive ? "text-emerald-800 font-extrabold" : isPassed ? "text-gray-800" : "text-gray-400 group-hover:text-emerald-700"
                          }`}>
                            {step.label}
                          </p>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">
                            {isActive ? "Active Station" : isPassed ? "Completed" : "Next In Line"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Station Routing Quick Actions Bar */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Real-time Clinical Station Dispatcher</span>
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-800">
                    Current: <strong>{getDeptLabel(selectedTicket.currentDepartment)}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={routingInProgress !== null}
                    onClick={() => openRoutingModal("triage")}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Route to Triage...</span>
                  </button>

                  <button
                    type="button"
                    disabled={routingInProgress !== null}
                    onClick={() => openRoutingModal("doctor")}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    <span>Route to Doctor...</span>
                  </button>

                  <button
                    type="button"
                    disabled={routingInProgress !== null}
                    onClick={() => openRoutingModal("diagnostics")}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <FlaskRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Route to Diagnostics...</span>
                  </button>

                  <button
                    type="button"
                    disabled={routingInProgress !== null}
                    onClick={() => openRoutingModal("pharmacy")}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
                    <span>Route to Pharmacy...</span>
                  </button>

                  <button
                    type="button"
                    disabled={routingInProgress !== null}
                    onClick={() => openRoutingModal("billing")}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    <span>Route to Billing...</span>
                  </button>

                  <button
                    type="button"
                    disabled={routingInProgress !== null}
                    onClick={handleIssueGatePassAndDischarge}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50 ml-auto"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Issue Gate Pass & Discharge</span>
                  </button>
                </div>
              </div>

              {/* Clinical Node Real Records Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Node 1: Reception Intake */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span>Node 1: Reception Intake</span>
                    </p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                      Verified
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Biometric Verification:</span>
                      <span className="font-bold text-gray-800">
                        {selectedTicket.biometricStatus === "verified" ? "Matched & Logged" : "Standard Registration"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SHA Insurance Status:</span>
                      <span className="font-bold text-emerald-700">
                        {matchedPatient?.shaEligible === "eligible" ? "SHA / NHIF Active" : "Private / Out-of-Pocket"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chief Complaint:</span>
                      <span className="font-medium text-gray-800 italic truncate max-w-[160px]">
                        "{selectedTicket.issue || "General Medical Checkup"}"
                      </span>
                    </div>
                  </div>
                </div>

                {/* Node 2: Nurse Triage & Vitals */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Node 2: Nurse Triage Vitals</span>
                    </p>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                      Triage
                    </span>
                  </div>
                  {matchedPatient?.visits && matchedPatient.visits.length > 0 ? (
                    <div className="text-xs space-y-1.5">
                      {(() => {
                        const lastVisit = matchedPatient.visits[matchedPatient.visits.length - 1];
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Temperature & BP:</span>
                              <span className="font-mono font-bold text-gray-800">
                                {lastVisit.vitals.temp}°C • {lastVisit.vitals.bp} mmHg
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Pulse & Weight:</span>
                              <span className="font-mono font-bold text-gray-800">
                                {lastVisit.vitals.pulse} bpm • {lastVisit.vitals.weight} kg
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Triage Timestamp:</span>
                              <span className="font-mono text-gray-600">{lastVisit.date}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-2">
                      Awaiting Nurse Triage recording in Triage console.
                    </div>
                  )}
                </div>

                {/* Node 3: Medical Doctor Consultation */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      <span>Node 3: Clinical Consultation</span>
                    </p>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                      Doctor
                    </span>
                  </div>
                  {matchedPatient?.visits && matchedPatient.visits.length > 0 ? (
                    <div className="text-xs space-y-1.5">
                      {(() => {
                        const lastVisit = matchedPatient.visits[matchedPatient.visits.length - 1];
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Diagnosis:</span>
                              <span className="font-bold text-gray-900">{lastVisit.diagnosis || "Under Evaluation"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Prescriptions:</span>
                              <span className="font-bold text-emerald-800">
                                {lastVisit.prescriptions && lastVisit.prescriptions.length > 0
                                  ? `${lastVisit.prescriptions.length} Meds Ordered`
                                  : "None"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Diagnostics Ordered:</span>
                              <span className="font-bold text-indigo-800">
                                {lastVisit.referrals && lastVisit.referrals.length > 0
                                  ? `${lastVisit.referrals.length} Lab / Rad Tests`
                                  : "None"}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-2">
                      Awaiting doctor consultation notes.
                    </div>
                  )}
                </div>

                {/* Node 4: Diagnostics & Laboratory */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <FlaskRound className="w-4 h-4 text-indigo-600" />
                      <span>Node 4: Diagnostics & LIS/RIS</span>
                    </p>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                      Diagnostics
                    </span>
                  </div>
                  {matchedPatient?.visits &&
                  matchedPatient.visits.length > 0 &&
                  matchedPatient.visits[matchedPatient.visits.length - 1].referrals &&
                  matchedPatient.visits[matchedPatient.visits.length - 1].referrals!.length > 0 ? (
                    <div className="text-xs space-y-2">
                      {matchedPatient.visits[matchedPatient.visits.length - 1].referrals!.map((ref, idx) => {
                        const isHaemogram =
                          isHaemogramReport(ref.results || "") ||
                          ref.testName.toLowerCase().includes("haemogram") ||
                          ref.testName.toLowerCase().includes("cbc");

                        return (
                          <div key={idx} className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center font-bold text-gray-900">
                              <span className="text-xs">{ref.testName}</span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                                {ref.status}
                              </span>
                            </div>
                            {ref.results && (
                              <div className="pt-1">
                                {isHaemogram ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHaemogramResult(ref.results || "")}
                                    className="w-full py-1.5 px-3 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Open Full Haemogram Clinical Document</span>
                                  </button>
                                ) : (
                                  <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-indigo-100 font-medium">
                                    {ref.results}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-2">
                      No active diagnostic tests ordered for this encounter.
                    </div>
                  )}
                </div>

                {/* Node 5: Smart Pharmacy Dispensation */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-orange-600" />
                      <span>Node 5: Smart Pharmacy POS</span>
                    </p>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-md">
                      Pharmacy
                    </span>
                  </div>
                  {matchedPatient?.visits &&
                  matchedPatient.visits.length > 0 &&
                  matchedPatient.visits[matchedPatient.visits.length - 1].prescriptions &&
                  matchedPatient.visits[matchedPatient.visits.length - 1].prescriptions!.length > 0 ? (
                    <div className="text-xs space-y-1.5">
                      {matchedPatient.visits[matchedPatient.visits.length - 1].prescriptions!.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-bold text-gray-900">{p.drugName}</span>
                            <p className="text-[10px] text-gray-500">{p.dosage} • x{p.quantity}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === "dispensed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {p.status || "pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-2">
                      No medications prescribed for this encounter.
                    </div>
                  )}
                </div>

                {/* Node 6: Split-Ledger Billing, eTIMS & Gate Pass */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <span>Node 6: Billing & Gate Pass</span>
                    </p>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md">
                      Cashier
                    </span>
                  </div>
                  {matchedInvoice ? (
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Invoice Total:</span>
                        <span className="font-mono font-bold text-gray-900">KES {matchedInvoice.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payment Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          matchedInvoice.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {matchedInvoice.paymentStatus}
                        </span>
                      </div>
                      {selectedTicket.gatePassIssued && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg mt-2 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-emerald-900">Digital Gate Pass:</span>
                          <span className="font-mono font-extrabold text-emerald-800 text-xs">
                            {selectedTicket.gatePassCode}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic py-2">
                      Invoice awaiting clinical department closure.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-gray-400 p-6">
              <Activity className="w-16 h-16 text-emerald-500/20 mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-800">Select a Patient Encounter</h3>
              <p className="text-xs max-w-sm mt-1">
                Choose an active patient from the checked-in queue on the left to inspect their live clinical milestones and dispatch routing.
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Full Haemogram Document View Modal */}
      {selectedHaemogramResult && (
        <HaemogramDocument
          mode="modal"
          isOpen={Boolean(selectedHaemogramResult)}
          onClose={() => setSelectedHaemogramResult(null)}
          data={selectedHaemogramResult}
          patientMeta={{
            name: matchedPatient?.patientName || selectedTicket?.patientName,
            age: matchedPatient?.age || 30,
            gender: matchedPatient?.gender || "Adult",
            patientNo: matchedPatient?.nationalId || matchedPatient?.patientNumber || selectedTicket?.ticketNo || "PAT-99",
            facilityName: "AfyaCare Diagnostic & Laboratory Center",
            doctor: "Attending Clinician"
          }}
        />
      )}

      {/* Station Routing Staff & Room Selection Modal */}
      {routingModalOpen && selectedTicket && (
        <StationRoutingPromptModal
          isOpen={routingModalOpen}
          onClose={() => setRoutingModalOpen(false)}
          targetStation={modalTargetStation}
          ticket={selectedTicket}
          allEmployees={employees}
          allQueueTickets={tickets}
          onConfirmRoute={handleConfirmModalRoute}
        />
      )}
    </div>
  );
}
