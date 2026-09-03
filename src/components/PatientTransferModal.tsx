import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot
} from "firebase/firestore";
import { PatientTransfer, QueueTicket, SystemRole, Employee } from "../types";
import { HOSPITAL_SPECIALISTS_DIRECTORY, SpecialistDefinition } from "../constants/specialists";
import {
  ArrowRightLeft,
  X,
  User,
  Activity,
  AlertTriangle,
  Stethoscope,
  FlaskRound,
  Sparkles,
  Building2,
  Clock,
  Send,
  HeartPulse,
  BedDouble,
  FileText,
  Baby,
  ShieldAlert,
  Maximize2,
  Minimize2
} from "lucide-react";
import { toast } from "../lib/promptService";

interface PatientTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email: string;
    role: SystemRole | string;
    department?: string;
  };
  initialTicket?: QueueTicket | null;
  initialPatient?: {
    patientName: string;
    nationalId: string;
    ticketNo: string;
    age?: number;
    phone?: string;
    gender?: string;
    symptoms?: string;
    diagnosis?: string;
    vitals?: {
      temp?: string;
      bp?: string;
      pulse?: string;
      weight?: string;
    };
  } | null;
  onTransferSuccess?: (transfer: PatientTransfer) => void;
}

export const TRANSFER_DEPARTMENTS = [
  { id: "doctor", name: "General Medical Consultation", category: "Clinical", icon: Stethoscope },
  { id: "cardiology", name: "Cardiology & Cardiac Suite", category: "Specialist", icon: HeartPulse },
  { id: "surgery", name: "General & Laparoscopic Surgery", category: "Specialist", icon: Activity },
  { id: "pediatrics", name: "Pediatrics & Child Wellness", category: "Specialist", icon: User },
  { id: "gyna", name: "Obstetrics & Gynaecology", category: "Specialist", icon: Baby },
  { id: "labour_room", name: "Maternity Labour & Delivery Suite", category: "Inpatient", icon: Baby },
  { id: "icu", name: "ICU / High Dependency Unit", category: "Inpatient", icon: ShieldAlert },
  { id: "inpatient_ward", name: "Inpatient Medical/Surgical Ward", category: "Inpatient", icon: BedDouble },
  { id: "laboratory", name: "Laboratory Diagnostics", category: "Diagnostic", icon: FlaskRound },
  { id: "radiology", name: "Radiology & Imaging (X-Ray/CT/Ultrasound)", category: "Diagnostic", icon: Activity },
  { id: "pharmacy", name: "Pharmacy & Medication Counseling", category: "Pharmacy", icon: FileText },
  { id: "emergency", name: "Emergency & Resuscitation Bay", category: "Emergency", icon: AlertTriangle },
];

export const REASON_TEMPLATES = [
  "Specialist medical evaluation required",
  "Urgent surgical consult & theatre review",
  "Critical resuscitation & high-dependency stabilization",
  "Advanced radiological imaging / CT Scan",
  "Maternity labour onset & delivery admission",
  "Inpatient admission for continuous IV antibiotic therapy",
  "Pediatric acute illness escalation",
  "Post-consultation specialized pharmacy counseling"
];

export default function PatientTransferModal({
  isOpen,
  onClose,
  currentUser,
  initialTicket,
  initialPatient,
  onTransferSuccess
}: PatientTransferModalProps) {
  // Active queue tickets for patient selector if none provided
  const [activeTickets, setActiveTickets] = useState<QueueTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(initialTicket?.id || "");
  const [selectedTicket, setSelectedTicket] = useState<QueueTicket | null>(initialTicket || null);

  // Transfer form fields
  const [patientName, setPatientName] = useState(initialPatient?.patientName || initialTicket?.patientName || "");
  const [nationalId, setNationalId] = useState(initialPatient?.nationalId || initialTicket?.nationalId || "");
  const [ticketNo, setTicketNo] = useState(initialPatient?.ticketNo || initialTicket?.ticketNo || "");
  const [age, setAge] = useState<number | string>(initialPatient?.age || initialTicket?.age || 35);
  const [gender, setGender] = useState<string>(initialPatient?.gender || "Not Specified");
  const [phone, setPhone] = useState<string>(initialPatient?.phone || initialTicket?.phone || "");

  const [toDepartment, setToDepartment] = useState<string>("cardiology");
  const [toSpecialistId, setToSpecialistId] = useState<string>("");
  const [priority, setPriority] = useState<"Routine" | "Urgent" | "STAT Emergency">("Urgent");
  const [reasonForTransfer, setReasonForTransfer] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState(
    initialPatient?.diagnosis ? `Diagnosis: ${initialPatient.diagnosis}. Symptoms: ${initialPatient.symptoms || "N/A"}` : ""
  );

  // Vitals
  const [temp, setTemp] = useState(initialPatient?.vitals?.temp || "37.0");
  const [bp, setBp] = useState(initialPatient?.vitals?.bp || "120/80");
  const [pulse, setPulse] = useState(initialPatient?.vitals?.pulse || "76");
  const [weight, setWeight] = useState(initialPatient?.vitals?.weight || "70");
  const [submitting, setSubmitting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync initial patient/ticket when props change
  useEffect(() => {
    if (initialTicket) {
      setSelectedTicket(initialTicket);
      setSelectedTicketId(initialTicket.id);
      setPatientName(initialTicket.patientName);
      setNationalId(initialTicket.nationalId || "");
      setTicketNo(initialTicket.ticketNo);
      setAge(initialTicket.age || 35);
      setPhone(initialTicket.phone || "");
    }
    if (initialPatient) {
      setPatientName(initialPatient.patientName);
      setNationalId(initialPatient.nationalId || "");
      setTicketNo(initialPatient.ticketNo);
      if (initialPatient.age) setAge(initialPatient.age);
      if (initialPatient.gender) setGender(initialPatient.gender);
      if (initialPatient.phone) setPhone(initialPatient.phone);
      if (initialPatient.vitals) {
        if (initialPatient.vitals.temp) setTemp(initialPatient.vitals.temp);
        if (initialPatient.vitals.bp) setBp(initialPatient.vitals.bp);
        if (initialPatient.vitals.pulse) setPulse(initialPatient.vitals.pulse);
        if (initialPatient.vitals.weight) setWeight(initialPatient.vitals.weight);
      }
      if (initialPatient.diagnosis) {
        setClinicalSummary(`Current Diagnosis: ${initialPatient.diagnosis}. Symptoms: ${initialPatient.symptoms || "N/A"}`);
      }
    }
  }, [initialTicket, initialPatient, isOpen]);

  // Listen to queue tickets if user needs to pick one
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "queue"), (snapshot) => {
      const tickets: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== "completed") {
          tickets.push({ id: doc.id, ...data } as QueueTicket);
        }
      });
      setActiveTickets(tickets);
    });
    return () => unsub();
  }, []);

  const handleTicketSelect = (tId: string) => {
    setSelectedTicketId(tId);
    const found = activeTickets.find((t) => t.id === tId);
    if (found) {
      setSelectedTicket(found);
      setPatientName(found.patientName);
      setNationalId(found.nationalId || "");
      setTicketNo(found.ticketNo);
      setAge(found.age || 35);
      setPhone(found.phone || "");
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !ticketNo.trim() || !reasonForTransfer.trim()) {
      toast.error("Please fill in patient name, ticket number, and reason for transfer.", "Missing Transfer Details");
      return;
    }

    setSubmitting(true);
    try {
      // Find specialist name if selected
      const spec = HOSPITAL_SPECIALISTS_DIRECTORY.find((s) => s.id === toSpecialistId);

      const newTransfer: Omit<PatientTransfer, "id"> = {
        ticketId: selectedTicketId || `TKT-${Date.now()}`,
        ticketNo: ticketNo.trim(),
        patientName: patientName.trim(),
        nationalId: nationalId.trim() || "N/A",
        age: Number(age) || undefined,
        gender,
        phone: phone.trim() || undefined,
        fromDepartment: currentUser.department || currentUser.role || "Clinical Unit",
        fromUnitName: `${currentUser.role} Desk (${currentUser.name})`,
        referredByDoctorName: currentUser.name,
        referredByEmail: currentUser.email,
        toDepartment,
        toSpecialistId: spec?.id,
        toSpecialistName: spec?.name,
        toSpecialistTitle: spec ? `${spec.name} (${spec.category})` : undefined,
        reasonForTransfer: reasonForTransfer.trim(),
        clinicalSummary: clinicalSummary.trim(),
        priority,
        vitalsSummary: {
          temp,
          bp,
          pulse,
          weight
        },
        status: "pending",
        timestamp: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "patient_transfers"), newTransfer);

      // Also create an automated high-priority notification message in the destination role/department's inbox!
      try {
        const destDeptConfig = TRANSFER_DEPARTMENTS.find(d => d.id === toDepartment);
        await addDoc(collection(db, "internal_messages"), {
          senderId: currentUser.email || currentUser.name,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          targetType: "department",
          targetDepartment: toDepartment,
          channelId: toDepartment === "laboratory" ? "laboratory" : toDepartment === "pharmacy" ? "pharmacy" : "doctors",
          subject: `Incoming Patient Referral: ${ticketNo} - ${patientName} (${priority})`,
          message: `PATIENT TRANSFER REQUEST: ${patientName} (${ticketNo}) has been referred to ${destDeptConfig?.name || toDepartment} by Dr. ${currentUser.name}.\nReason: ${reasonForTransfer.trim()}.\nPlease review in Incoming Transfers to Accept or Place on Hold.`,
          priority: priority === "STAT Emergency" ? "stat_emergency" : (priority === "Urgent" ? "urgent" : "normal"),
          category: "referral_notice",
          relatedPatientName: patientName,
          relatedTicketNo: ticketNo,
          readBy: [currentUser.email || currentUser.name],
          timestamp: new Date().toISOString()
        });
      } catch (msgErr) {
        console.warn("Could not dispatch automated chat notice:", msgErr);
      }

      toast.success(
        `Patient ${patientName} (${ticketNo}) successfully referred to ${toDepartment.toUpperCase()}. Destination unit notified for acceptance.`,
        "Transfer Dispatched"
      );

      if (onTransferSuccess) {
        onTransferSuccess({ id: docRef.id, ...newTransfer });
      }

      onClose();
    } catch (err: any) {
      console.error("Error creating patient transfer:", err);
      toast.error("Failed to transmit patient transfer record. Please retry.", "Transfer Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter specialists for chosen department if relevant
  const availableSpecialists = HOSPITAL_SPECIALISTS_DIRECTORY.filter(
    (s) => toDepartment === "doctor" || s.department === toDepartment || s.id.toLowerCase().includes(toDepartment.toLowerCase())
  );

  return (
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs font-sans animate-in fade-in duration-200 ${isFullScreen ? "p-0" : "p-2 sm:p-4"}`}>
      <div 
        id="patient-transfer-modal"
        className={`bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullScreen 
            ? "w-full h-full max-w-none max-h-none rounded-none border-0" 
            : "w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200"
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Patient Referral & Inter-Departmental Transfer</h3>
                {isFullScreen && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30">
                    Full Screen Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Initiated by <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              id="btn-toggle-transfer-fullscreen"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen View"}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline text-xs">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-slate-300" />
                  <span className="hidden sm:inline text-xs">Full Screen</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              id="btn-close-transfer-modal"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Transfer Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Scroll Area */}
        <form onSubmit={handleTransferSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          <div className={isFullScreen ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto" : "space-y-6"}>
            
            {/* Left Column in Fullscreen: Patient Demographics & Vitals */}
            <div className={isFullScreen ? "lg:col-span-5 space-y-6" : "space-y-6"}>
              {/* 1. Patient Case Selection / Verification */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  1. Patient Identification & Active Ticket
                </h4>

                {activeTickets.length > 0 && !initialPatient && !initialTicket && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Patient from Active Queue:
                    </label>
                    <select
                      value={selectedTicketId}
                      onChange={(e) => handleTicketSelect(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Choose active patient ticket --</option>
                      {activeTickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.ticketNo} — {t.patientName} ({t.currentDepartment} visit)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Patient Full Name *</label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Jane Mwangi"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Active Ticket No *</label>
                    <input
                      type="text"
                      required
                      value={ticketNo}
                      onChange={(e) => setTicketNo(e.target.value)}
                      placeholder="e.g. GEN-004"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">National ID / Passport</label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. 33445566"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Age (Years)</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="35"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Not Specified">Not Specified</option>
                    </select>
                  </div>
                </div>

                {/* Vitals Snapshot */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Patient Triage Vitals Snapshot:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Body Temp</span>
                      <input
                        type="text"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        className="w-full font-bold text-slate-800 bg-transparent focus:outline-hidden"
                        placeholder="37.0 °C"
                      />
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Blood Pressure</span>
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        className="w-full font-bold text-slate-800 bg-transparent focus:outline-hidden"
                        placeholder="120/80 mmHg"
                      />
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Pulse Rate</span>
                      <input
                        type="text"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        className="w-full font-bold text-slate-800 bg-transparent focus:outline-hidden"
                        placeholder="75 bpm"
                      />
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Weight</span>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full font-bold text-slate-800 bg-transparent focus:outline-hidden"
                        placeholder="70 kg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column in Fullscreen: Destination, Priority & Clinical Handover */}
            <div className={isFullScreen ? "lg:col-span-7 space-y-6" : "space-y-6"}>
              {/* 2. Destination Department & Specialist Target */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  2. Destination Department & Specialist Roster
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Department / Service Unit *
                    </label>
                    <select
                      value={toDepartment}
                      onChange={(e) => setToDepartment(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {TRANSFER_DEPARTMENTS.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Specific Specialist Physician (Optional)
                    </label>
                    <select
                      value={toSpecialistId}
                      onChange={(e) => setToSpecialistId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Any Available On-Duty Specialist --</option>
                      {availableSpecialists.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transfer Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Transfer Clinical Urgency *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority("Routine")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        priority === "Routine"
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🟢 Routine / Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority("Urgent")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        priority === "Urgent"
                          ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      🟡 Urgent (Priority)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority("STAT Emergency")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        priority === "STAT Emergency"
                          ? "bg-red-600 text-white border-red-600 ring-2 ring-red-400 shadow-md"
                          : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      🔴 STAT Emergency
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Reason & Clinical Summary */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  3. Clinical Reason for Referral & Notes
                </h4>

                {/* Quick Reason Chips */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Quick Reason Templates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {REASON_TEMPLATES.map((tmpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReasonForTransfer(tmpl)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                      >
                        {tmpl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Reason for Referral / Transfer *
                  </label>
                  <input
                    type="text"
                    required
                    value={reasonForTransfer}
                    onChange={(e) => setReasonForTransfer(e.target.value)}
                    placeholder="e.g. Acute myocardial infarction symptoms; requires immediate cardiology review & ECG"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Clinical Handover Summary & Pending Orders
                  </label>
                  <textarea
                    rows={isFullScreen ? 4 : 3}
                    value={clinicalSummary}
                    onChange={(e) => setClinicalSummary(e.target.value)}
                    placeholder="Include initial findings, IV fluids administered, allergies, and diagnostic requests..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer Controls */}
          <div className={`pt-4 mt-6 border-t border-slate-200 flex items-center justify-between gap-3 ${isFullScreen ? "max-w-7xl mx-auto" : ""}`}>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              id="btn-submit-transfer"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/30 flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Transmitting Transfer..." : "Dispatch Transfer Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
