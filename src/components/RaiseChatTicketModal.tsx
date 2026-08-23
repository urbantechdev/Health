import React, { useState, useEffect } from "react";
import { SystemRole, QueueTicket, ChatTicketAttachment, ChatTicketItem } from "../types";
import { ALL_SYSTEM_ROLES } from "../constants/roles";
import { HOSPITAL_SPECIALISTS_DIRECTORY } from "../constants/specialists";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import {
  Receipt,
  FileText,
  ArrowRightLeft,
  FlaskRound,
  X,
  Plus,
  Trash2,
  Send,
  User,
  Activity,
  DollarSign,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  ShoppingCart
} from "lucide-react";
import { toast } from "../lib/promptService";

interface RaiseChatTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email: string;
    role: SystemRole | string;
    department?: string;
  };
  initialTargetRole?: SystemRole | string;
  initialTargetChannel?: string;
  initialPatient?: {
    name: string;
    ticketNo: string;
    patientId?: string;
    nationalId?: string;
    age?: number | string;
    gender?: string;
    symptoms?: string;
    diagnosis?: string;
  } | null;
  onTicketDispatched: (ticket: ChatTicketAttachment, chatMessage: string, targetType: "channel" | "role" | "direct", targetValue: string) => void;
}

const COMMON_BILLING_PRESETS = [
  { description: "General Doctor Consultation", unitPrice: 1500, department: "Medical" },
  { description: "Specialist Physician Review", unitPrice: 2500, department: "Medical" },
  { description: "Full Haemogram / CBC Test", unitPrice: 800, department: "Laboratory" },
  { description: "Malaria Antigen Rapid Test", unitPrice: 500, department: "Laboratory" },
  { description: "Urinalysis Complete Test", unitPrice: 400, department: "Laboratory" },
  { description: "Blood Sugar / Glucose Random", unitPrice: 300, department: "Laboratory" },
  { description: "Lipid Profile Test Panel", unitPrice: 1800, department: "Laboratory" },
  { description: "Liver Function Tests (LFT)", unitPrice: 2200, department: "Laboratory" },
  { description: "Renal Function Tests (U/E/Cr)", unitPrice: 2000, department: "Laboratory" },
  { description: "Chest X-Ray Digital 2-Views", unitPrice: 2500, department: "Radiology" },
  { description: "Ultrasound Abdomen & Pelvis", unitPrice: 3500, department: "Radiology" },
  { description: "12-Lead Electrocardiogram ECG", unitPrice: 1500, department: "Diagnostics" },
  { description: "Inpatient Ward Bed (Per Night)", unitPrice: 3500, department: "Wards" },
  { description: "ICU / HDU Critical Bed (Daily)", unitPrice: 15000, department: "ICU" },
  { description: "Nursing Triage & Vital Signs Fee", unitPrice: 800, department: "Nursing" },
  { description: "Minor Theatre Procedure & Suturing", unitPrice: 8000, department: "Theatre" },
  { description: "Normal Maternity Delivery Package", unitPrice: 25000, department: "Maternity" },
  { description: "Caesarean Section (C-Section) Fee", unitPrice: 55000, department: "Theatre" },
  { description: "Amoxicillin / Clavulanate 625mg Tabs", unitPrice: 1200, department: "Pharmacy" },
  { description: "Paracetamol 1g IV Infusion", unitPrice: 450, department: "Pharmacy" },
  { description: "Ceftriaxone 1g IV Injection", unitPrice: 850, department: "Pharmacy" },
  { description: "Normal Saline 500ml IV Fluid", unitPrice: 350, department: "Pharmacy" },
];

export default function RaiseChatTicketModal({
  isOpen,
  onClose,
  currentUser,
  initialTargetRole,
  initialTargetChannel,
  initialPatient,
  onTicketDispatched
}: RaiseChatTicketModalProps) {
  // Mode / Type Selection
  const [ticketType, setTicketType] = useState<"invoice" | "pre_quote" | "patient_transfer" | "service_order">("invoice");

  // Routing target
  const [targetDestinationType, setTargetDestinationType] = useState<"role" | "channel" | "department">("role");
  const [targetRole, setTargetRole] = useState<string>(initialTargetRole || "Billing & Accounts");
  const [targetChannel, setTargetChannel] = useState<string>(initialTargetChannel || "all");
  const [targetDepartment, setTargetDepartment] = useState<string>("Billing");
  const [targetSpecialist, setTargetSpecialist] = useState<string>("");

  // Patient Info
  const [activeQueue, setActiveQueue] = useState<QueueTicket[]>([]);
  const [selectedQueueTicketId, setSelectedQueueTicketId] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<string>("Male");
  const [patientPhone, setPatientPhone] = useState<string>("");

  // Line items for Invoice & Pre-Quotes
  const [items, setItems] = useState<ChatTicketItem[]>([
    {
      id: "item-1",
      description: "General Doctor Consultation",
      quantity: 1,
      unitPrice: 1500,
      amount: 1500,
      department: "Medical"
    }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split">("M-PESA");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [quoteValidity, setQuoteValidity] = useState("14 Days");
  const [depositRequired, setDepositRequired] = useState<number>(0);

  // Clinical Details for Transfer / Order
  const [urgency, setUrgency] = useState<"Routine" | "Urgent" | "STAT Emergency">("Routine");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [temp, setTemp] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");

  // Search filter for presets
  const [presetSearch, setPresetSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load active queue tickets
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "queue"), (snapshot) => {
      const qList: QueueTicket[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== "completed") {
          qList.push({ id: doc.id, ...data } as QueueTicket);
        }
      });
      setActiveQueue(qList);
    });
    return () => unsub();
  }, []);

  // Sync initial patient if provided
  useEffect(() => {
    if (initialPatient) {
      setPatientName(initialPatient.name || "");
      setNationalId(initialPatient.nationalId || "");
      setPatientAge(initialPatient.age ? String(initialPatient.age) : "");
      setPatientGender(initialPatient.gender || "Male");
      setSymptoms(initialPatient.symptoms || "");
      setProvisionalDiagnosis(initialPatient.diagnosis || "");
    }
  }, [initialPatient, isOpen]);

  // Adjust defaults when ticket type changes
  useEffect(() => {
    if (ticketType === "invoice") {
      setTargetDestinationType("role");
      setTargetRole("Billing & Accounts");
    } else if (ticketType === "pre_quote") {
      setTargetDestinationType("role");
      setTargetRole("Billing & Accounts");
    } else if (ticketType === "patient_transfer") {
      setTargetDestinationType("role");
      setTargetRole("Doctor");
    } else if (ticketType === "service_order") {
      setTargetDestinationType("role");
      setTargetRole("Lab");
    }
  }, [ticketType]);

  // Handle selecting an active queue patient
  const handleSelectQueueTicket = (ticketId: string) => {
    setSelectedQueueTicketId(ticketId);
    const found = activeQueue.find((q) => q.id === ticketId);
    if (found) {
      setPatientName(found.patientName);
      setNationalId(found.nationalId || "");
      setPatientAge(found.age ? String(found.age) : "");
      setPatientGender(found.gender || "Male");
      setPatientPhone(found.phone || "");
      setSymptoms(found.symptoms || found.triageNotes || "");
      setProvisionalDiagnosis(found.provisionalDiagnosis || "");
      if (found.vitals) {
        setTemp(found.vitals.temp || "");
        setBp(found.vitals.bp || "");
        setPulse(found.vitals.pulse || "");
        setWeight(found.vitals.weight || "");
      }
    }
  };

  // Add line item
  const handleAddItem = (preset?: { description: string; unitPrice: number; department: string }) => {
    const newItem: ChatTicketItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: preset ? preset.description : "",
      quantity: 1,
      unitPrice: preset ? preset.unitPrice : 0,
      amount: preset ? preset.unitPrice : 0,
      department: preset ? preset.department : "General"
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update line item
  const handleUpdateItem = (id: string, field: keyof ChatTicketItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        if (field === "quantity" || field === "unitPrice") {
          const qty = field === "quantity" ? Number(val) || 0 : it.quantity;
          const price = field === "unitPrice" ? Number(val) || 0 : it.unitPrice;
          updated.amount = qty * price;
        }
        return updated;
      })
    );
  };

  // Remove line item
  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      toast.info("Invoice requires at least one line item.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const grandTotal = subtotal;

  // Submit and Dispatch Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Please provide or select a patient name.");
      return;
    }

    if ((ticketType === "invoice" || ticketType === "pre_quote") && items.length === 0) {
      toast.error("Please add at least one line item with an amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const prefix = ticketType === "invoice" ? "INV" : ticketType === "pre_quote" ? "QUO" : ticketType === "patient_transfer" ? "TRF" : "ORD";
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const generatedTicketNo = `${prefix}-${randomCode}`;
      const nowIso = new Date().toISOString();

      let linkedTransferDocId: string | undefined = undefined;

      // If it's a patient transfer, also register it in patient_transfers collection so Transfers Hub sees it
      if (ticketType === "patient_transfer") {
        try {
          const transferDoc = await addDoc(collection(db, "patient_transfers"), {
            ticketId: selectedQueueTicketId || `TRF-${randomCode}`,
            ticketNo: generatedTicketNo,
            patientName: patientName.trim(),
            nationalId: nationalId.trim() || "N/A",
            age: patientAge ? Number(patientAge) : undefined,
            gender: patientGender,
            phone: patientPhone || "",
            fromDepartment: currentUser.department || currentUser.role || "Clinical Desk",
            fromUnitName: `${currentUser.name} (${currentUser.role})`,
            referredByDoctorName: currentUser.name,
            referredByEmail: currentUser.email,
            toDepartment: targetRole.toLowerCase(),
            toSpecialistName: targetSpecialist || undefined,
            reasonForTransfer: symptoms || provisionalDiagnosis || "Clinical Consultation",
            clinicalSummary: clinicalNotes || `Patient transferred for evaluation by ${targetRole}`,
            priority: urgency,
            vitalsSummary: { temp, bp, pulse, weight },
            status: "pending",
            timestamp: nowIso
          });
          linkedTransferDocId = transferDoc.id;
        } catch (tErr) {
          console.warn("Could not create patient_transfers record:", tErr);
        }
      }

      // Build structured ticket attachment
      const ticketAttachment: ChatTicketAttachment = {
        ticketId: `tkt-${Date.now()}`,
        ticketNo: generatedTicketNo,
        type: ticketType,
        title:
          ticketType === "invoice"
            ? `Invoice #${generatedTicketNo}: ${patientName}`
            : ticketType === "pre_quote"
              ? `Pre-Quote Estimate #${generatedTicketNo}: ${patientName}`
              : ticketType === "patient_transfer"
                ? `Patient Referral #${generatedTicketNo}: ${patientName}`
                : `Service Order #${generatedTicketNo}: ${patientName}`,
        patientName: patientName.trim(),
        patientId: selectedQueueTicketId || undefined,
        nationalId: nationalId.trim() || undefined,
        patientAge: patientAge || undefined,
        patientGender: patientGender || undefined,
        fromDepartment: currentUser.department || currentUser.role,
        fromRole: currentUser.role,
        fromUserName: currentUser.name,
        toDepartment: targetDepartment || targetRole,
        toRole: targetRole,
        toSpecialistName: targetSpecialist || undefined,
        items: ticketType === "invoice" || ticketType === "pre_quote" ? items : undefined,
        subtotal: ticketType === "invoice" || ticketType === "pre_quote" ? subtotal : undefined,
        totalAmount: ticketType === "invoice" || ticketType === "pre_quote" ? grandTotal : undefined,
        currency: "KES",
        paymentMethod: paymentMethod,
        paymentStatus: "unpaid",
        mpesaPhone: mpesaPhone || undefined,
        validUntil: ticketType === "pre_quote" ? quoteValidity : undefined,
        depositRequired: ticketType === "pre_quote" && depositRequired > 0 ? depositRequired : undefined,
        symptoms: symptoms.trim() || undefined,
        provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
        vitals: temp || bp || pulse || weight ? { temp, bp, pulse, weight } : undefined,
        urgency: urgency,
        status: "pending",
        linkedTransferDocId: linkedTransferDocId,
        createdAt: nowIso,
        createdBy: currentUser.name,
        createdRole: currentUser.role
      };

      // Message text summary
      const chatMessageText =
        ticketType === "invoice"
          ? `🧾 Raised Invoice Ticket ${generatedTicketNo} for ${patientName} (KES ${grandTotal.toLocaleString()}). Transferred to ${targetRole} for payment processing.`
          : ticketType === "pre_quote"
            ? `📋 Raised Pre-Quote Estimate ${generatedTicketNo} for ${patientName} (Estimated KES ${grandTotal.toLocaleString()}). Transferred to ${targetRole} for review.`
            : ticketType === "patient_transfer"
              ? `🚑 Clinical Transfer Ticket ${generatedTicketNo}: Handing over patient ${patientName} to ${targetRole} (${urgency} Priority).`
              : `🧪 Service Order Ticket ${generatedTicketNo}: Dispatched clinical request for ${patientName} to ${targetRole}.`;

      // Dispatch to parent chat modal
      onTicketDispatched(
        ticketAttachment,
        chatMessageText,
        targetDestinationType === "role" ? "role" : targetDestinationType === "channel" ? "channel" : "role",
        targetDestinationType === "role" ? targetRole : targetChannel
      );

      toast.success(
        `Ticket ${generatedTicketNo} dispatched to ${targetRole} channel in chat!`,
        "Ticket Transferred"
      );

      onClose();
    } catch (err: any) {
      console.error("Failed to raise ticket:", err);
      toast.error("Failed to transmit ticket. Please retry.", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div 
        id="raise-chat-ticket-modal"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Raise & Transfer Ticket in Chat</h3>
              <p className="text-xs text-slate-400">
                Dispatch an interactive Invoice, Pre-Quote, Clinical Transfer, or Investigation Ticket across hospital channels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket Type Selector Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTicketType("invoice")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                ticketType === "invoice"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${ticketType === "invoice" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-600"}`}>
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs">Patient Invoice</p>
                <p className={`text-[10px] ${ticketType === "invoice" ? "text-emerald-100" : "text-slate-400"}`}>
                  Bill to Accounts / POS
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTicketType("pre_quote")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                ticketType === "pre_quote"
                  ? "bg-blue-600 border-blue-600 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${ticketType === "pre_quote" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-600"}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs">Pre-Quote Estimate</p>
                <p className={`text-[10px] ${ticketType === "pre_quote" ? "text-blue-100" : "text-slate-400"}`}>
                  Pro-Forma / Pre-Auth
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTicketType("patient_transfer")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                ticketType === "patient_transfer"
                  ? "bg-cyan-700 border-cyan-700 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${ticketType === "patient_transfer" ? "bg-cyan-800 text-white" : "bg-cyan-50 text-cyan-700"}`}>
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs">Clinical Transfer</p>
                <p className={`text-[10px] ${ticketType === "patient_transfer" ? "text-cyan-100" : "text-slate-400"}`}>
                  Referral to Unit / Doctor
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTicketType("service_order")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                ticketType === "service_order"
                  ? "bg-purple-700 border-purple-700 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${ticketType === "service_order" ? "bg-purple-800 text-white" : "bg-purple-50 text-purple-700"}`}>
                <FlaskRound className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-xs">Lab / Rx Order</p>
                <p className={`text-[10px] ${ticketType === "service_order" ? "text-purple-100" : "text-slate-400"}`}>
                  Investigations Requisition
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Form Body */}
        <form onSubmit={handleSubmitTicket} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target Routing Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Transfer / Dispatch Destination
              </span>
              <span className="text-[10px] text-slate-400">Who should receive and act on this ticket in chat?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Hospital Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {ALL_SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Destination Unit / Channel</label>
                <select
                  value={targetChannel}
                  onChange={(e) => setTargetChannel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">Facility-Wide Broadcast (#all-staff)</option>
                  <option value="doctors">Doctors & Clinical (#doctors-clinic)</option>
                  <option value="nursing">Nursing & Wards (#nursing-station)</option>
                  <option value="pharmacy">Pharmacy & POS (#pharmacy-dispensary)</option>
                  <option value="laboratory">Laboratory (#lab-diagnostics)</option>
                  <option value="reception">Reception & Front Desk (#front-desk)</option>
                  <option value="admin">Admin & Billing Desk (#admin-ops)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Assigned Specialist (Optional)</label>
                <select
                  value={targetSpecialist}
                  onChange={(e) => setTargetSpecialist(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Any Available Specialist --</option>
                  {HOSPITAL_SPECIALISTS_DIRECTORY.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Patient Details & Queue Linking */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Patient Identity & Case Link
              </span>

              {/* Quick Pick from Active Queue */}
              {activeQueue.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Pick from Live Queue:</span>
                  <select
                    value={selectedQueueTicketId}
                    onChange={(e) => handleSelectQueueTicket(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select Active Queue Patient --</option>
                    {activeQueue.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.ticketNo}: {q.patientName} ({q.currentDepartment})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Kiprono Koech / Mary Wanjiku"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">National ID / SHA ID</label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="e.g. 29384756 / SHA-991"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Age (Yrs)</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 34"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Specific Section: Invoice & Pre-Quote Items Builder */}
          {(ticketType === "invoice" || ticketType === "pre_quote") && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {ticketType === "invoice" ? "Invoice Line Items & Rates" : "Pre-Quote Itemized Breakdown"}
                </span>

                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Item
                </button>
              </div>

              {/* Quick Preset Chips */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Quick Add Standard Hospital Services:
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {COMMON_BILLING_PRESETS.slice(0, 10).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddItem(preset)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-[11px] font-semibold text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span>+ {preset.description}</span>
                      <span className="text-emerald-700 font-bold font-mono">KES {preset.unitPrice.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-slate-100 text-[11px] font-black text-slate-600 uppercase">
                  <div className="col-span-6">Item Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Price (KES)</div>
                  <div className="col-span-2 text-right">Amount (KES)</div>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-2.5 items-center text-xs">
                    <div className="col-span-6 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                        placeholder="e.g. Specialist Consultation, Lab Test, Bed Fee"
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-2 text-right font-extrabold text-slate-900 pr-1">
                      KES {item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}

                {/* Total Summary Row */}
                <div className="p-3 bg-slate-100/90 flex items-center justify-between font-extrabold text-xs">
                  <span className="text-slate-700">
                    {ticketType === "pre_quote" ? "Estimated Total Payable:" : "Grand Invoice Total:"}
                  </span>
                  <span className={`text-base font-black ${ticketType === "invoice" ? "text-emerald-700" : "text-blue-800"}`}>
                    KES {grandTotal.toLocaleString("en-KE")}
                  </span>
                </div>
              </div>

              {/* Payment & Validity Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Expected Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="M-PESA">Safaricom M-PESA</option>
                    <option value="Cash">Direct Cash (POS)</option>
                    <option value="SHA/NHIF">SHA / NHIF Clearance</option>
                    <option value="Insurance">Private Insurance Scheme</option>
                    <option value="Split">Split Multi-Payer Billing</option>
                  </select>
                </div>

                {ticketType === "pre_quote" ? (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Quote Validity Period</label>
                      <input
                        type="text"
                        value={quoteValidity}
                        onChange={(e) => setQuoteValidity(e.target.value)}
                        placeholder="e.g. 14 Days / 30 Days"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Required Deposit (KES)</label>
                      <input
                        type="number"
                        min={0}
                        value={depositRequired || ""}
                        onChange={(e) => setDepositRequired(Number(e.target.value) || 0)}
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">M-Pesa Phone (Optional)</label>
                    <input
                      type="text"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Specific Section: Clinical Transfer & Referral Details */}
          {(ticketType === "patient_transfer" || ticketType === "service_order") && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600" />
                  Clinical Handover & Triage
                </span>

                {/* Urgency Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Urgency:</span>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                      urgency === "STAT Emergency"
                        ? "bg-red-600 text-white border-red-700 animate-pulse"
                        : urgency === "Urgent"
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-white text-slate-800 border-slate-200"
                    }`}
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent ⚠️</option>
                    <option value="STAT Emergency">🚨 STAT Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Provisional Diagnosis</label>
                  <input
                    type="text"
                    value={provisionalDiagnosis}
                    onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Appendicitis / Severe Malaria"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Presenting Symptoms / Indication</label>
                  <input
                    type="text"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. Severe RLQ pain, high grade fever, vomiting"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Clinical Handover Summary & Instructions *</label>
                <textarea
                  rows={2}
                  required={ticketType === "patient_transfer"}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Provide clinical context, medications administered, IV lines in place, or special investigations needed..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              {/* Vitals Summary Row */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Patient Vitals at Handover</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="BP (e.g. 120/80)"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono"
                  />
                  <input
                    type="text"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    placeholder="Temp (e.g. 37.8°C)"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono"
                  />
                  <input
                    type="text"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="Pulse (e.g. 88 bpm)"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono"
                  />
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Weight (e.g. 68 kg)"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-dispatch-chat-ticket"
              className={`px-6 py-2.5 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
                ticketType === "invoice"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20"
                  : ticketType === "pre_quote"
                    ? "bg-blue-600 hover:bg-blue-500 shadow-blue-950/20"
                    : ticketType === "patient_transfer"
                      ? "bg-cyan-700 hover:bg-cyan-600 shadow-cyan-950/20"
                      : "bg-purple-700 hover:bg-purple-600 shadow-purple-950/20"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Transmitting Ticket..."
                  : `Dispatch ${ticketType === "invoice" ? "Invoice" : ticketType === "pre_quote" ? "Pre-Quote" : ticketType === "patient_transfer" ? "Transfer" : "Order"} to Chat`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
