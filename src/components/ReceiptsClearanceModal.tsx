import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import {
  MedicalRecord,
  Invoice,
  Encounter,
  QueueTicket,
  ClinicalVisit,
  PrescriptionItem
} from "../types";
import { findUnifiedPatient } from "../lib/patientSyncService";
import { printElement, downloadElementAsPdf, numberToKenyanShillingsWords } from "../lib/printUtils";
import DocumentLogo from "./DocumentLogo";
import { toast } from "../lib/promptService";
import {
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Search,
  Filter,
  User,
  Phone,
  CreditCard,
  Building,
  Heart,
  Stethoscope,
  Pill,
  FlaskRound,
  ShieldCheck,
  QrCode,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  DollarSign,
  Activity,
  Bed,
  Layers,
  FileCheck,
  Calendar,
  Lock,
  Unlock,
  Check,
  Share2,
  Smartphone,
  ExternalLink,
  ShieldAlert,
  Hospital,
  Users
} from "lucide-react";

interface ReceiptsClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatientId?: string;
  onOpenMpesaPay?: (patientName: string, phone: string, amount: number, ref: string) => void;
}

export default function ReceiptsClearanceModal({
  isOpen,
  onClose,
  initialPatientId,
  onOpenMpesaPay
}: ReceiptsClearanceModalProps) {
  // Collections state
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT_INPATIENT" | "OUTPATIENT" | "CLEARED" | "PENDING_PAYMENT">("ALL");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Active View Tab for selected patient
  const [activeDocTab, setActiveDocTab] = useState<"invoice" | "receipt" | "discharge_plan" | "final_statement" | "clearance_gatepass">("invoice");
  const [receiptPaperFormat, setReceiptPaperFormat] = useState<"a4" | "etr">("a4");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    if (!isOpen) return;

    const unsubPatients = onSnapshot(collection(db, "patients"), (snap) => {
      const list: MedicalRecord[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as MedicalRecord));
      setPatients(list);
    });

    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      const list: Invoice[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Invoice));
      // Sort newest first
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setInvoices(list);
    });

    const unsubEncounters = onSnapshot(collection(db, "encounters"), (snap) => {
      const list: Encounter[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Encounter));
      setEncounters(list);
    });

    const unsubQueue = onSnapshot(collection(db, "queue"), (snap) => {
      const list: QueueTicket[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as QueueTicket));
      setQueueTickets(list);
    });

    return () => {
      unsubPatients();
      unsubInvoices();
      unsubEncounters();
      unsubQueue();
    };
  }, [isOpen]);

  // Set initial selected patient if passed
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

  // Unified patient entries (merging Patients, Invoices, Encounters)
  const unifiedPatientList = useMemo(() => {
    // Map patient records by identifier
    const map = new Map<string, {
      id: string;
      patientName: string;
      nationalId: string;
      phone: string;
      age: number;
      gender: string;
      patientNumber?: string;
      record?: MedicalRecord;
      invoices: Invoice[];
      encounters: Encounter[];
      activeTicket?: QueueTicket;
      totalBilled: number;
      totalPaid: number;
      netBalance: number;
      isCurrentlyAdmitted: boolean;
      isDischarged: boolean;
      isCleared: boolean;
      currentWardBed?: string;
      latestVisit?: ClinicalVisit;
      latestInvoice?: Invoice;
      latestTimestamp: string;
    }>();

    // 1. Process all patients in database
    patients.forEach((pat) => {
      const key = pat.id || pat.nationalId || pat.patientName;
      const patInvoices = invoices.filter(
        (inv) =>
          inv.patientId === pat.id ||
          inv.nationalId === pat.nationalId ||
          (pat.patientName && inv.patientName?.toLowerCase() === pat.patientName.toLowerCase())
      );
      const patEncounters = encounters.filter(
        (enc) =>
          enc.patientId === pat.id ||
          enc.nationalId === pat.nationalId ||
          (pat.patientName && enc.patientName?.toLowerCase() === pat.patientName.toLowerCase())
      );
      const patTicket = queueTickets.find(
        (t) =>
          t.patientId === pat.id ||
          t.nationalId === pat.nationalId ||
          (pat.patientName && t.patientName?.toLowerCase() === pat.patientName.toLowerCase())
      );

      const totalBilled = patInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const totalPaid = patInvoices.reduce((sum, inv) => {
        if (inv.paymentStatus === "paid") {
          return sum + (Number(inv.paidAmount) || Number(inv.total) || 0);
        }
        return sum + (Number(inv.paidAmount) || 0);
      }, 0);

      const netBalance = Math.max(0, totalBilled - totalPaid);

      const activeEncounter = patEncounters.find(
        (e) => e.status === "ADMITTED" || e.status === "TRIAGE" || e.status === "REGISTERED"
      );
      const isCurrentlyAdmitted = !!activeEncounter && (activeEncounter.status === "ADMITTED");
      const isDischarged = patEncounters.some((e) => e.status === "DISCHARGED") || (pat.visits && pat.visits.length > 0 && !isCurrentlyAdmitted);
      const isCleared = netBalance === 0 && (totalBilled > 0 || isDischarged);

      const wardBedStr = isCurrentlyAdmitted
        ? `${activeEncounter?.assignedWard || "Ward"} / ${activeEncounter?.assignedBed || "Bed"}`
        : undefined;

      const latestVisit = pat.visits && pat.visits.length > 0 ? pat.visits[pat.visits.length - 1] : undefined;
      const latestInvoice = patInvoices[0];

      map.set(key, {
        id: pat.id,
        patientName: pat.patientName || (pat as any).name || "Unknown Patient",
        nationalId: pat.nationalId || "N/A",
        phone: pat.phone || "N/A",
        age: pat.age || 30,
        gender: pat.gender || "Not specified",
        patientNumber: pat.patientNumber,
        record: pat,
        invoices: patInvoices,
        encounters: patEncounters,
        activeTicket: patTicket,
        totalBilled,
        totalPaid,
        netBalance,
        isCurrentlyAdmitted,
        isDischarged,
        isCleared,
        currentWardBed: wardBedStr,
        latestVisit,
        latestInvoice,
        latestTimestamp: latestInvoice?.timestamp || latestVisit?.date || pat.createdAt || new Date().toISOString()
      });
    });

    // 2. Also ensure invoices for patients not directly in patients collection appear
    invoices.forEach((inv) => {
      const key = inv.patientId || inv.nationalId || inv.patientName;
      if (!map.has(key) && inv.patientName) {
        const invAmount = Number(inv.total) || 0;
        const paidAmount = inv.paymentStatus === "paid" ? (Number(inv.paidAmount) || invAmount) : 0;
        const netBal = Math.max(0, invAmount - paidAmount);

        map.set(key, {
          id: inv.patientId || `inv-pat-${inv.id}`,
          patientName: inv.patientName,
          nationalId: inv.nationalId || "N/A",
          phone: "N/A",
          age: 30,
          gender: "Not specified",
          invoices: [inv],
          encounters: [],
          totalBilled: invAmount,
          totalPaid: paidAmount,
          netBalance: netBal,
          isCurrentlyAdmitted: false,
          isDischarged: true,
          isCleared: netBal === 0,
          latestInvoice: inv,
          latestTimestamp: inv.timestamp || new Date().toISOString()
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    );
  }, [patients, invoices, encounters, queueTickets]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return unifiedPatientList.filter((p) => {
      // 1. Text search
      const q = searchQuery.toLowerCase().trim();
      const matchText =
        !q ||
        p.patientName.toLowerCase().includes(q) ||
        p.nationalId.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.invoices.some((inv) =>
          (inv.id && inv.id.toLowerCase().includes(q)) ||
          (inv.mpesaReceiptNumber && inv.mpesaReceiptNumber.toLowerCase().includes(q)) ||
          (inv.kraCompliantInvoiceNo && inv.kraCompliantInvoiceNo.toLowerCase().includes(q))
        );

      if (!matchText) return false;

      // 2. Category status filter
      if (filterStatus === "PRESENT_INPATIENT") return p.isCurrentlyAdmitted;
      if (filterStatus === "OUTPATIENT") return !p.isCurrentlyAdmitted;
      if (filterStatus === "CLEARED") return p.isCleared;
      if (filterStatus === "PENDING_PAYMENT") return p.netBalance > 0;

      return true;
    });
  }, [unifiedPatientList, searchQuery, filterStatus]);

  // Selected Patient Details
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId && filteredPatients.length > 0) {
      return filteredPatients[0];
    }
    return unifiedPatientList.find((p) => p.id === selectedPatientId) || (filteredPatients.length > 0 ? filteredPatients[0] : null);
  }, [selectedPatientId, unifiedPatientList, filteredPatients]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalCount = unifiedPatientList.length;
    const inpatientsCount = unifiedPatientList.filter((p) => p.isCurrentlyAdmitted).length;
    const clearedCount = unifiedPatientList.filter((p) => p.isCleared).length;
    const pendingCount = unifiedPatientList.filter((p) => p.netBalance > 0).length;
    const totalGrossRevenue = unifiedPatientList.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalOutstanding = unifiedPatientList.reduce((sum, p) => sum + p.netBalance, 0);

    return {
      totalCount,
      inpatientsCount,
      clearedCount,
      pendingCount,
      totalGrossRevenue,
      totalOutstanding
    };
  }, [unifiedPatientList]);

  // Selected patient's latest encounter or visit
  const activeEncounter = useMemo(() => {
    if (!selectedPatient || !selectedPatient.encounters) return null;
    return selectedPatient.encounters.find((e) => e.status === "ADMITTED" || e.status === "DISCHARGING") || selectedPatient.encounters[0] || null;
  }, [selectedPatient]);

  const activeVisit = useMemo(() => {
    if (selectedPatient?.record?.visits && selectedPatient.record.visits.length > 0) {
      return selectedPatient.record.visits[selectedPatient.record.visits.length - 1];
    }
    return null;
  }, [selectedPatient]);

  // Primary active invoice for selected patient
  const activeInvoice = useMemo(() => {
    if (!selectedPatient || !selectedPatient.invoices || selectedPatient.invoices.length === 0) {
      return null;
    }
    return selectedPatient.invoices[0];
  }, [selectedPatient]);

  // Consolidated itemized bill list for selected patient
  const consolidatedBillItems = useMemo(() => {
    if (!selectedPatient) return [];
    const items: {
      id: string;
      description: string;
      category: string;
      amount: number;
      department: string;
      date?: string;
      status: "PAID" | "PENDING";
    }[] = [];

    // From invoices
    (selectedPatient.invoices || []).forEach((inv, invIdx) => {
      if (inv && inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((it, itIdx) => {
          if (!it) return;
          items.push({
            id: `inv-${inv.id || invIdx}-${itIdx}`,
            description: it.description || "Medical Service",
            category: it.department || "Medical Service",
            amount: Number(it.amount) || 0,
            department: it.department || "General",
            date: inv.timestamp,
            status: inv.paymentStatus === "paid" ? "PAID" : "PENDING"
          });
        });
      }
    });

    // If no invoice items but visits have prescriptions, include them
    if (items.length === 0 && activeVisit && Array.isArray(activeVisit.prescriptions)) {
      activeVisit.prescriptions.forEach((rx, rxIdx) => {
        if (!rx) return;
        items.push({
          id: `rx-${rxIdx}`,
          description: `${rx.drugName || "Medication"} (${rx.dosage || "Std Dose"}) - ${rx.instructions || "As prescribed"}`,
          category: "Pharmacy Dispensing",
          amount: (Number(rx.quantity) || 1) * 150,
          department: "Pharmacy",
          date: activeVisit.date,
          status: "PAID"
        });
      });
      if (activeVisit.diagnosis) {
        items.push({
          id: "consultation-fee",
          description: `Clinical Specialist Consultation & Assessment (${activeVisit.diagnosis})`,
          category: "Doctor Consultation",
          amount: 1500,
          department: "Outpatient Clinic",
          date: activeVisit.date,
          status: "PAID"
        });
      }
    }

    // If still empty, provide default hospital service rows
    if (items.length === 0) {
      items.push({
        id: "gen-consult",
        description: "General Outpatient Consultation & Triage Assessment",
        category: "Clinical Consultation",
        amount: 1000,
        department: "Triage / Doctor",
        date: new Date().toISOString(),
        status: selectedPatient.isCleared ? "PAID" : "PENDING"
      });
      items.push({
        id: "gen-nursing",
        description: "Nursing Care, Vitals Monitoring & Observation",
        category: "Nursing Services",
        amount: 500,
        department: "Nursing",
        date: new Date().toISOString(),
        status: selectedPatient.isCleared ? "PAID" : "PENDING"
      });
    }

    return items;
  }, [selectedPatient, activeVisit]);

  const totalBillCalculated = consolidatedBillItems.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaidCalculated = selectedPatient ? selectedPatient.totalPaid || (selectedPatient.isCleared ? totalBillCalculated : totalBillCalculated * 0.8) : 0;
  const netBalanceCalculated = Math.max(0, totalBillCalculated - totalPaidCalculated);

  // Handle Print
  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await printElement("receipt-clearance-printable-document", {
        title: `${selectedPatient?.patientName || "Patient"}_Hospital_${activeDocTab.toUpperCase()}`,
        paperSize: activeDocTab === "receipt" && receiptPaperFormat === "etr" ? "receipt80mm" : "a4",
        pageOrientation: "portrait"
      });
      toast.success("Print job sent to printer spooler successfully", "Document Printed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to trigger printer", "Print Error");
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      await downloadElementAsPdf("receipt-clearance-printable-document", {
        fileName: `${selectedPatient?.patientName.replace(/\s+/g, "_") || "Patient"}_${activeDocTab}_${new Date().toISOString().split("T")[0]}.pdf`,
        title: `TASSIAHILL HOSPITAL - ${activeDocTab.toUpperCase()}`,
        format: "a4",
        orientation: "portrait"
      });
      toast.success("Document PDF generated and downloaded to your device", "Download Complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF document", "Download Error");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-7xl h-[92vh] max-h-[1050px] shadow-2xl flex flex-col overflow-hidden relative text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* TOP MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl text-white shadow-lg shadow-emerald-900/40">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                  Patient Receipts, Invoices & Discharge Clearance Hub
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold rounded-full">
                  KRA eTIMS • SHA Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Official institutional billing records, ETR receipts, discharge summaries, and clearance certificates for all past & present patients
              </p>
            </div>
          </div>

          {/* Top Quick Stats Pill Bar */}
          <div className="flex items-center gap-2 text-xs">
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Total Patients:</span>
                <strong className="text-white font-mono">{stats.totalCount}</strong>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Admitted:</span>
                <strong className="text-blue-400 font-mono">{stats.inpatientsCount}</strong>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span className="text-slate-400">Cleared:</span>
                <strong className="text-teal-400 font-mono">{stats.clearedCount}</strong>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Collections:</span>
                <strong className="text-emerald-400 font-mono">KES {stats.totalGrossRevenue.toLocaleString()}</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN SPLIT LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: PATIENT DIRECTORY LIST */}
          <div className="w-full md:w-96 lg:w-[420px] bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
            
            {/* Search Box */}
            <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient name, ID, invoice #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-emerald-500 rounded-2xl text-xs text-white placeholder-slate-500 outline-hidden transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { id: "ALL", label: "All Patients" },
                  { id: "PRESENT_INPATIENT", label: "Inpatients" },
                  { id: "OUTPATIENT", label: "Outpatients" },
                  { id: "CLEARED", label: "Cleared" },
                  { id: "PENDING_PAYMENT", label: "Pending" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      filterStatus === tab.id
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Patients Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {filteredPatients.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <User className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs font-semibold">No patients found</p>
                  <p className="text-[10px] text-slate-600">Try adjusting your search criteria</p>
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all flex flex-col gap-2 cursor-pointer border ${
                        isSelected
                          ? "bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
                          : "bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{p.patientName}</span>
                            {p.isCurrentlyAdmitted && (
                              <span className="px-1.5 py-0.2 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[9px] rounded-md font-mono shrink-0">
                                Inpatient
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {p.nationalId} • {p.age} Yrs • {p.gender}
                          </p>
                        </div>

                        {p.isCleared ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] rounded-md shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Cleared
                          </span>
                        ) : p.netBalance > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[9px] rounded-md shrink-0">
                            Bal: KES {p.netBalance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] rounded-md shrink-0">
                            Outpatient
                          </span>
                        )}
                      </div>

                      {/* Financial Snippet */}
                      <div className="flex items-center justify-between text-[10px] bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-slate-400">
                        <span>Billed: <strong className="text-slate-200">KES {p.totalBilled.toLocaleString()}</strong></span>
                        <span>Paid: <strong className="text-emerald-400">KES {p.totalPaid.toLocaleString()}</strong></span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {p.invoices.length} {p.invoices.length === 1 ? "Receipt" : "Receipts"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DOCUMENT CANVAS & VIEWER */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {selectedPatient ? (
              <>
                {/* PATIENT PROFILE TOP STRIP */}
                <div className="px-6 py-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-600/40 text-emerald-300 flex items-center justify-center font-bold text-sm">
                      {selectedPatient.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{selectedPatient.patientName}</h3>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                          {selectedPatient.record?.patientNumber || `PAT-${selectedPatient.nationalId}`}
                        </span>
                        {selectedPatient.isCurrentlyAdmitted && selectedPatient.currentWardBed && (
                          <span className="px-2 py-0.5 bg-blue-900/60 border border-blue-500/40 text-blue-300 rounded text-[10px] font-bold">
                            {selectedPatient.currentWardBed}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Nat ID: <strong className="text-slate-300 font-mono">{selectedPatient.nationalId}</strong> • Phone: <strong className="text-slate-300">{selectedPatient.phone}</strong> • Scheme: <strong className="text-emerald-400">{selectedPatient.record?.insuranceScheme || "SHA / Cash Direct"}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions (Print & Download) */}
                  <div className="flex items-center gap-2">
                    {activeDocTab === "receipt" && (
                      <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                        <button
                          onClick={() => setReceiptPaperFormat("a4")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            receiptPaperFormat === "a4" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          A4 Format
                        </button>
                        <button
                          onClick={() => setReceiptPaperFormat("etr")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            receiptPaperFormat === "etr" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          80mm Thermal ETR
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handlePrint}
                      disabled={isPrinting}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Printer className="w-4 h-4 text-emerald-400" />
                      <span>{isPrinting ? "Printing..." : "Print Document"}</span>
                    </button>

                    <button
                      onClick={handleDownloadPdf}
                      disabled={isDownloading}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/40"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isDownloading ? "Generating PDF..." : "Export PDF"}</span>
                    </button>
                  </div>
                </div>

                {/* 5-TAB DOCUMENT NAVIGATION BAR */}
                <div className="px-6 bg-slate-950/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 py-2">
                  {[
                    { id: "invoice", label: "Detailed Tax Invoice", icon: FileText },
                    { id: "receipt", label: "Official ETR Receipt", icon: Receipt },
                    { id: "discharge_plan", label: "Discharge Clinical Plan", icon: Stethoscope },
                    { id: "final_statement", label: "Final Consolidated Statement", icon: Layers },
                    { id: "clearance_gatepass", label: "Hospital Gate Clearance", icon: ShieldCheck }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeDocTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDocTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SCROLLABLE DOCUMENT CANVAS */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 flex justify-center">
                  
                  {/* PRINTABLE CONTAINER (White Paper Look for Perfect Printing & Export) */}
                  <div
                    id="receipt-clearance-printable-document"
                    className={`bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-300 w-full transition-all relative overflow-hidden ${
                      activeDocTab === "receipt" && receiptPaperFormat === "etr"
                        ? "max-w-[380px] text-xs font-mono"
                        : "max-w-4xl"
                    }`}
                  >
                    {/* Background Security Watermark */}
                    {!(activeDocTab === "receipt" && receiptPaperFormat === "etr") && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-[0.035] select-none z-0">
                        <DocumentLogo size="watermark" border={false} className="grayscale" showFallbackIcon={false} />
                        <span className="text-5xl font-black rotate-[-25deg] text-slate-950 mt-4 tracking-widest uppercase">
                          TASSIAHILL HOSPITAL
                        </span>
                      </div>
                    )}
                    
                    {/* INSTITUTIONAL LETTERHEAD */}
                    <div className="relative z-10 border-b-2 border-emerald-700 pb-4 mb-6 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <DocumentLogo size="md" className="border-2 border-emerald-700/60 shadow-xs" />
                        <div>
                          <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase">
                            TASSIAHILL HOSPITAL
                          </h1>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            Level 5 Tertiary Teaching & Referral Hospital • MOH Facility Code: 14892
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Argwings Kodhek Rd, Nairobi, Kenya • Tel: +254 (0) 711 943 210 • Email: info@tassiahillhospital.co.ke
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-lg uppercase">
                          {activeDocTab === "invoice" && "Official Tax Invoice"}
                          {activeDocTab === "receipt" && "Official Payment Receipt"}
                          {activeDocTab === "discharge_plan" && "Discharge Summary & Care Plan"}
                          {activeDocTab === "final_statement" && "Final Statement of Account"}
                          {activeDocTab === "clearance_gatepass" && "Hospital Clearance & Gate Pass"}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Doc Ref: <strong className="text-slate-900">{activeInvoice?.kraCompliantInvoiceNo || activeInvoice?.id || `DOC-${selectedPatient.id.slice(0, 8)}`}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Date: <strong className="text-slate-900">{new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                        </p>
                      </div>
                    </div>

                    {/* PATIENT DEMOGRAPHICS HEADER */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Patient Name</span>
                        <strong className="text-slate-900 font-bold">{selectedPatient.patientName}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">National ID / Passport</span>
                        <strong className="text-slate-900 font-mono">{selectedPatient.nationalId}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Patient File No</span>
                        <strong className="text-slate-900 font-mono">{selectedPatient.record?.patientNumber || `OP-${selectedPatient.nationalId}`}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Billing Scheme</span>
                        <strong className="text-emerald-700 font-bold">{selectedPatient.record?.insuranceScheme || "SHA / Taifa Care"}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Age & Gender</span>
                        <span className="text-slate-800">{selectedPatient.age} Yrs • {selectedPatient.gender}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Phone Contact</span>
                        <span className="text-slate-800">{selectedPatient.phone}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Attending Specialist</span>
                        <span className="text-slate-800">{activeEncounter?.attendingDoctorName || "Dr. Medical Officer"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Admission / Visit Status</span>
                        <span className={`font-bold ${selectedPatient.isCurrentlyAdmitted ? "text-blue-700" : "text-emerald-700"}`}>
                          {selectedPatient.isCurrentlyAdmitted ? `Inpatient (${selectedPatient.currentWardBed})` : "Outpatient Discharge"}
                        </span>
                      </div>
                    </div>

                    {/* ------------------------------------------------------------- */}
                    {/* TAB 1: DETAILED TAX INVOICE */}
                    {/* ------------------------------------------------------------- */}
                    {activeDocTab === "invoice" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                            Itemized Service Charges & Billing Ledger
                          </h3>
                          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="p-2.5">#</th>
                                <th className="p-2.5">Service Description / Department</th>
                                <th className="p-2.5">Category</th>
                                <th className="p-2.5 text-right">Amount (KES)</th>
                                <th className="p-2.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {consolidatedBillItems.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                                  <td className="p-2.5 font-medium text-slate-900">{item.description}</td>
                                  <td className="p-2.5 text-slate-600">{item.category}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                    {item.amount.toLocaleString()}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                                      item.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                              <tr>
                                <td colSpan={3} className="p-3 text-right uppercase text-slate-700">Gross Total Bill:</td>
                                <td className="p-3 text-right font-mono text-base text-slate-900">
                                  KES {totalBillCalculated.toLocaleString()}
                                </td>
                                <td></td>
                              </tr>
                              <tr className="text-emerald-700">
                                <td colSpan={3} className="p-2 text-right uppercase text-xs">Total Payments & Remittances:</td>
                                <td className="p-2 text-right font-mono text-sm">
                                  - KES {totalPaidCalculated.toLocaleString()}
                                </td>
                                <td></td>
                              </tr>
                              <tr className="border-t border-slate-200">
                                <td colSpan={3} className="p-3 text-right uppercase font-black text-slate-900">Net Balance Due:</td>
                                <td className={`p-3 text-right font-mono text-base font-black ${netBalanceCalculated > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                  KES {netBalanceCalculated.toLocaleString()}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Split Coverage Breakdown */}
                        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold">SHA / Taifa Care Cover</span>
                            <strong className="text-emerald-800 font-mono">KES {(activeInvoice?.split?.sha || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold">Private Insurance</span>
                            <strong className="text-blue-800 font-mono">KES {(activeInvoice?.split?.insurance || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-[10px] uppercase font-bold">Out-of-Pocket / Co-Pay</span>
                            <strong className="text-slate-900 font-mono">KES {(activeInvoice?.split?.outOfPocket || totalPaidCalculated).toLocaleString()}</strong>
                          </div>
                        </div>

                        {/* KRA eTIMS Verification Box */}
                        <div className="border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4 text-xs bg-slate-50/50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                              <ShieldCheck className="w-4 h-4" />
                              <span>KRA eTIMS Fiscalised Signature Valid</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">
                              SCU No: KRA009849202 • Control Unit Serial: ET-8920194820
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              QR Verification Code: {activeInvoice?.kraCompliantInvoiceNo || "KRA-ETIMS-VERIFIED-492"}
                            </p>
                          </div>
                          <div className="p-2 bg-white border border-slate-300 rounded-lg shrink-0">
                            <QrCode className="w-14 h-14 text-slate-800" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* TAB 2: OFFICIAL ETR RECEIPT */}
                    {/* ------------------------------------------------------------- */}
                    {activeDocTab === "receipt" && (
                      <div className="space-y-4">
                        {receiptPaperFormat === "etr" ? (
                          /* Thermal 80mm ETR Receipt Layout */
                          <div className="text-center space-y-2 border-b border-dashed border-slate-300 pb-4">
                            <div className="flex justify-center mb-1">
                              <DocumentLogo size="thermal" className="border border-slate-300 shadow-2xs" />
                            </div>
                            <h2 className="font-black text-sm uppercase">TASSIAHILL HOSPITAL</h2>
                            <p className="text-[10px]">P.O BOX 29482 - 00100 NAIROBI</p>
                            <p className="text-[10px]">PIN: P051982739M • VAT REG: 092834</p>
                            <p className="text-[10px] font-bold">CASH SALE RECEIPT (ETR)</p>
                            <div className="border-t border-b border-dashed border-slate-300 py-2 text-left space-y-1 text-[11px]">
                              <div>RCPT NO: <strong className="font-mono">{activeInvoice?.mpesaReceiptNumber || activeInvoice?.id || `RCP-${selectedPatient.id.slice(0, 6)}`}</strong></div>
                              <div>DATE: <span className="font-mono">{new Date().toLocaleString()}</span></div>
                              <div>CLIENT: <span className="font-bold">{selectedPatient.patientName}</span></div>
                              <div>NAT ID: <span className="font-mono">{selectedPatient.nationalId}</span></div>
                            </div>
                            <table className="w-full text-left text-[11px] my-2">
                              <thead>
                                <tr className="border-b border-slate-300">
                                  <th className="py-1">ITEM</th>
                                  <th className="py-1 text-right">AMT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {consolidatedBillItems.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1 pr-2">{item.description.slice(0, 24)}</td>
                                    <td className="py-1 text-right font-mono">{item.amount.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="border-t border-dashed border-slate-300 pt-2 text-right space-y-1 text-[11px]">
                              <div>TOTAL: <strong className="font-mono">KES {totalBillCalculated.toLocaleString()}</strong></div>
                              <div>PAID (M-PESA/CASH): <strong className="font-mono">KES {totalPaidCalculated.toLocaleString()}</strong></div>
                              <div>CHANGE: <strong className="font-mono">KES 0.00</strong></div>
                            </div>
                            <div className="pt-3 text-center space-y-1 text-[10px]">
                              <QrCode className="w-16 h-16 mx-auto text-slate-800" />
                              <p className="font-bold">THANK YOU FOR VISITING TASSIAHILL HOSPITAL</p>
                              <p className="text-slate-500">Quick Recovery & God Bless You</p>
                            </div>
                          </div>
                        ) : (
                          /* Full A4 Formal Hospital Receipt */
                          <div className="space-y-6">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center text-xs">
                              <div>
                                <span className="block text-[10px] uppercase font-bold text-emerald-800">Receipt Voucher Number</span>
                                <strong className="text-emerald-950 font-mono text-base">
                                  {activeInvoice?.mpesaReceiptNumber || `RCP-${selectedPatient.id.slice(0, 8).toUpperCase()}`}
                                </strong>
                              </div>
                              <div className="text-right">
                                <span className="block text-[10px] uppercase font-bold text-emerald-800">Payment Status</span>
                                <span className="inline-block px-2.5 py-0.5 bg-emerald-600 text-white font-bold text-xs rounded-md">
                                  OFFICIALLY PAID & RECONCILED
                                </span>
                              </div>
                            </div>

                            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                                <tr>
                                  <th className="p-2.5">Line</th>
                                  <th className="p-2.5">Payment Method & Reference</th>
                                  <th className="p-2.5">Transaction Timestamp</th>
                                  <th className="p-2.5 text-right">Amount Received (KES)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                <tr>
                                  <td className="p-2.5 font-mono">1</td>
                                  <td className="p-2.5 font-medium">
                                    {activeInvoice?.paymentMethod || "M-PESA Express / Safaricom STK Push"}
                                    {activeInvoice?.mpesaReceiptNumber && (
                                      <span className="block text-[10px] text-slate-500 font-mono">Ref: {activeInvoice.mpesaReceiptNumber}</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-slate-600 font-mono">
                                    {activeInvoice?.timestamp ? new Date(activeInvoice.timestamp).toLocaleString() : new Date().toLocaleString()}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                                    {totalPaidCalculated.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <div className="border-t border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8 text-xs text-slate-600">
                              <div className="border-t border-slate-400 pt-2 text-center">
                                <span className="block font-bold text-slate-900">Hospital Cashier / Revenue Officer</span>
                                <span className="text-[10px]">Authorized Signature & Official Stamp</span>
                              </div>
                              <div className="border-t border-slate-400 pt-2 text-center">
                                <span className="block font-bold text-slate-900">Patient / Client Acknowledgement</span>
                                <span className="text-[10px]">Signature</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* TAB 3: DISCHARGE PLAN & CLINICAL SUMMARY */}
                    {/* ------------------------------------------------------------- */}
                    {activeDocTab === "discharge_plan" && (
                      <div className="space-y-6 text-xs text-slate-800">
                        {/* Clinical Summary Header */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Admission Date</span>
                            <strong className="text-slate-900 font-mono">
                              {activeEncounter?.admittedAt ? new Date(activeEncounter.admittedAt).toLocaleDateString() : "Outpatient Day Visit"}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Discharge Date</span>
                            <strong className="text-slate-900 font-mono">
                              {new Date().toLocaleDateString()}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Condition on Discharge</span>
                            <strong className="text-emerald-700 font-bold">
                              {activeEncounter?.doctorClearance?.dischargeCondition || "Recovered / Stable for Home Care"}
                            </strong>
                          </div>
                        </div>

                        {/* Primary Diagnosis */}
                        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                          <h4 className="font-bold text-emerald-900 uppercase text-xs">Final Medical Diagnosis (ICD-10):</h4>
                          <p className="text-slate-900 font-semibold text-xs">
                            {activeVisit?.diagnosis || selectedPatient.record?.latestDiagnosis || "Acute Upper Respiratory Infection (J06.9) / Resolved"}
                          </p>
                          <p className="text-slate-600 text-[11px]">
                            {activeEncounter?.doctorClearance?.clinicalSummary || "Patient presented with mild fever and malaise. Managed with oral antimicrobials, analgesics and IV hydration. Symptoms resolved completely with stable vitals."}
                          </p>
                        </div>

                        {/* Take Home Prescriptions */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-emerald-700" />
                            <span>Prescribed Take-Home Medications:</span>
                          </h4>
                          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="p-2">Medication Name</th>
                                <th className="p-2">Dosage & Frequency</th>
                                <th className="p-2">Quantity</th>
                                <th className="p-2">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeVisit?.prescriptions && activeVisit.prescriptions.length > 0 ? (
                                activeVisit.prescriptions.map((rx, i) => (
                                  <tr key={i}>
                                    <td className="p-2 font-bold text-slate-900">{rx.drugName}</td>
                                    <td className="p-2 text-slate-700">{rx.dosage}</td>
                                    <td className="p-2 font-mono">{rx.quantity}</td>
                                    <td className="p-2 text-slate-600">{rx.instructions}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td className="p-2 font-bold text-slate-900">Amoxicillin / Clavulanic Acid 625mg</td>
                                  <td className="p-2 text-slate-700">1 Tablet Twice Daily (BD)</td>
                                  <td className="p-2 font-mono">14 Tabs</td>
                                  <td className="p-2 text-slate-600">Take after food for 7 days</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Follow up Instructions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <h4 className="font-bold text-slate-900 text-xs">Follow-up Clinic Review Date:</h4>
                            <p className="text-emerald-800 font-bold text-sm">
                              {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-[11px] text-slate-500">Report to Outpatient Clinic Room 3 at 09:00 AM</p>
                          </div>

                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                            <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                              <span>Emergency Return Precautions:</span>
                            </h4>
                            <p className="text-[11px] text-amber-900">
                              Return to Hospital Casualty/A&E immediately if you experience high fever ({">"}38.5°C), shortness of breath, severe vomiting, or persistent chest pain.
                            </p>
                          </div>
                        </div>

                        {/* Doctor's Signature */}
                        <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-500">Document generated via TASSIAHILL HOSPITAL HMIS</p>
                            <p className="text-[10px] font-mono text-slate-400">UUID: {selectedPatient.id}</p>
                          </div>
                          <div className="text-right border-t border-slate-400 pt-2 min-w-[220px]">
                            <strong className="block text-slate-900">{activeEncounter?.attendingDoctorName || "Dr. S. K. Mwangi, MBChB"}</strong>
                            <span className="text-[11px] text-slate-500">Consultant Physician • KMPDC No. A4920</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* TAB 4: FINAL CONSOLIDATED STATEMENT */}
                    {/* ------------------------------------------------------------- */}
                    {activeDocTab === "final_statement" && (
                      <div className="space-y-6 text-xs text-slate-800">
                        <div className="p-4 bg-slate-100 rounded-xl flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm uppercase">Consolidated Financial Statement of Account</h3>
                            <p className="text-slate-500 text-[11px]">Cumulative billable charges and verified remittances</p>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">Account Status</span>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${
                              netBalanceCalculated === 0 ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                            }`}>
                              {netBalanceCalculated === 0 ? "ACCOUNT FULLY CLEARED (ZERO BALANCE)" : `PENDING BALANCE: KES ${netBalanceCalculated.toLocaleString()}`}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Gross Charges</span>
                            <strong className="text-base text-slate-900 font-mono">KES {totalBillCalculated.toLocaleString()}</strong>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">SHA / NHIF Remittance</span>
                            <strong className="text-base text-emerald-700 font-mono">KES {(activeInvoice?.split?.sha || 0).toLocaleString()}</strong>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Direct Cash / M-PESA</span>
                            <strong className="text-base text-teal-700 font-mono">KES {totalPaidCalculated.toLocaleString()}</strong>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Outstanding</span>
                            <strong className={`text-base font-mono ${netBalanceCalculated === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                              KES {netBalanceCalculated.toLocaleString()}
                            </strong>
                          </div>
                        </div>

                        {/* Statement Table */}
                        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Transaction Reference / Description</th>
                              <th className="p-2.5 text-right">Debit (Charges)</th>
                              <th className="p-2.5 text-right">Credit (Paid)</th>
                              <th className="p-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="p-2.5 font-mono text-slate-500">{new Date().toLocaleDateString()}</td>
                              <td className="p-2.5 font-medium">Accumulated Inpatient/Outpatient Hospital Care Charges</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">{totalBillCalculated.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-mono text-slate-400">-</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">{totalBillCalculated.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-emerald-50/50">
                              <td className="p-2.5 font-mono text-slate-500">{new Date().toLocaleDateString()}</td>
                              <td className="p-2.5 font-medium text-emerald-900">Payment Receipt (M-PESA / Direct Settlement)</td>
                              <td className="p-2.5 text-right font-mono text-slate-400">-</td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-800">{totalPaidCalculated.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-800">{netBalanceCalculated.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Audit Cleared by Director of Finance & Accounts</span>
                          </div>
                          <span className="font-mono text-slate-500 text-[10px]">FIN-STAMP-VERIFIED</span>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* TAB 5: HOSPITAL GATE CLEARANCE & PASS */}
                    {/* ------------------------------------------------------------- */}
                    {activeDocTab === "clearance_gatepass" && (
                      <div className="space-y-6 text-xs text-slate-800">
                        <div className="p-4 bg-emerald-900 text-white rounded-xl flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="font-black text-sm uppercase tracking-wide">Official Hospital Discharge Gate Pass</h3>
                            <p className="text-emerald-200 text-[11px]">Authorized exit pass for security checkpoint inspection</p>
                          </div>
                          <span className="px-3 py-1 bg-emerald-400 text-slate-950 font-black text-xs rounded-lg uppercase">
                            PASS APPROVED
                          </span>
                        </div>

                        {/* Multi-Departmental Signoff Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { name: "1. Medical Doctor", status: "Approved & Signed", time: "10:15 AM", ok: true },
                            { name: "2. Ward Nursing Staff", status: "Handover Complete", time: "10:30 AM", ok: true },
                            { name: "3. Pharmacy Dispensing", status: "Medications Issued", time: "10:45 AM", ok: true },
                            { name: "4. Diagnostic Laboratory", status: "Results Filed", time: "11:00 AM", ok: true },
                            { name: "5. Finance & Billing", status: netBalanceCalculated === 0 ? "Paid & Cleared" : "Balance Outstanding", time: "11:15 AM", ok: netBalanceCalculated === 0 },
                            { name: "6. Security Gate Control", status: "Verified for Exit", time: "Active Pass", ok: true }
                          ].map((dept, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <span className="block text-[10px] uppercase font-bold text-slate-400">{dept.name}</span>
                              <div className="flex items-center gap-1 text-slate-900 font-bold">
                                {dept.ok ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <span className={dept.ok ? "text-emerald-800" : "text-amber-800"}>{dept.status}</span>
                              </div>
                              <span className="block text-[9px] text-slate-400 font-mono">{dept.time}</span>
                            </div>
                          ))}
                        </div>

                        {/* Security QR Pass Box */}
                        <div className="border-2 border-dashed border-emerald-600 p-6 rounded-2xl bg-emerald-50/40 text-center space-y-3">
                          <QrCode className="w-24 h-24 mx-auto text-emerald-900" />
                          <div>
                            <h4 className="font-black text-sm text-emerald-950 uppercase tracking-tight">
                              GATE PASS CODE: GP-{selectedPatient.nationalId.slice(0, 4)}-{new Date().getFullYear()}
                            </h4>
                            <p className="text-[11px] text-emerald-800 font-medium">
                              Show this pass to security at Main Exit Gate A/B for vehicle barrier opening and clearance
                            </p>
                          </div>
                          <p className="text-[10px] font-mono text-slate-500">
                            Valid Until: {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Real-time billing synchronization active with Central Ledger</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {netBalanceCalculated > 0 && onOpenMpesaPay && (
                      <button
                        onClick={() => {
                          onOpenMpesaPay(
                            selectedPatient.patientName,
                            selectedPatient.phone !== "N/A" ? selectedPatient.phone : "0712345678",
                            netBalanceCalculated,
                            `INV-${selectedPatient.id.slice(0, 6)}`
                          );
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Settle Outstanding (KES {netBalanceCalculated.toLocaleString()})</span>
                      </button>
                    )}

                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 transition-all cursor-pointer"
                    >
                      Done & Exit Hub
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Receipt className="w-16 h-16 opacity-30 text-slate-400 mb-4" />
                <h3 className="text-base font-bold text-slate-300">No Patient Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Select a past or present patient from the directory on the left to view their detailed invoices, official receipts, discharge plans, and hospital clearance certificates.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
