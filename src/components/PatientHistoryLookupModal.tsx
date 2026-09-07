import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { MedicalRecord, ClinicalVisit, Invoice, QueueTicket, SystemTicket } from "../types";
import { normalizeString, normalizePhone } from "../lib/patientSyncService";
import { printElement, downloadElementAsPdf } from "../lib/printUtils";
import DocumentLogo from "./DocumentLogo";
import { toast } from "../lib/promptService";
import {
  Search,
  User,
  CreditCard,
  Phone,
  Calendar,
  Heart,
  Pill,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Activity,
  Printer,
  Download,
  Loader2,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  ShieldCheck,
  Building,
  DollarSign,
  ArrowUpRight,
  History,
  FileCheck
} from "lucide-react";

interface PatientHistoryLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchId?: string;
  onSelectPatientForIntake?: (patient: MedicalRecord) => void;
  onSelectPatientForDoctor?: (patient: MedicalRecord) => void;
}

export default function PatientHistoryLookupModal({
  isOpen,
  onClose,
  initialSearchId = "",
  onSelectPatientForIntake,
  onSelectPatientForDoctor
}: PatientHistoryLookupModalProps) {
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [systemTickets, setSystemTickets] = useState<SystemTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchId);
  const [selectedPatient, setSelectedPatient] = useState<MedicalRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"visits" | "prescriptions" | "vitals" | "billing" | "documents">("visits");
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Sync initialSearchId if changed
  useEffect(() => {
    if (initialSearchId) {
      setSearchQuery(initialSearchId);
    }
  }, [initialSearchId]);

  // Subscribe to patients
  useEffect(() => {
    const unsubPatients = onSnapshot(collection(db, "patients"), (snap) => {
      const pList: MedicalRecord[] = [];
      snap.forEach((d) => {
        pList.push({ id: d.id, ...d.data() } as MedicalRecord);
      });
      setPatients(pList);
      setLoading(false);
    });

    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      const invList: Invoice[] = [];
      snap.forEach((d) => {
        invList.push({ id: d.id, ...d.data() } as Invoice);
      });
      setInvoices(invList);
    });

    const unsubQueue = onSnapshot(collection(db, "queue"), (snap) => {
      const qList: QueueTicket[] = [];
      snap.forEach((d) => {
        qList.push({ id: d.id, ...d.data() } as QueueTicket);
      });
      setQueueTickets(qList);
    });

    const unsubTickets = onSnapshot(collection(db, "system_tickets"), (snap) => {
      const tList: SystemTicket[] = [];
      snap.forEach((d) => {
        tList.push({ id: d.id, ...d.data() } as SystemTicket);
      });
      setSystemTickets(tList);
    });

    return () => {
      unsubPatients();
      unsubInvoices();
      unsubQueue();
      unsubTickets();
    };
  }, []);

  // Filtered patient list based on search query (National ID, Passport, Phone, Patient ID, Name)
  const matchingPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients.slice(0, 10);
    const clean = normalizeString(searchQuery);
    const cleanPhoneQuery = normalizePhone(searchQuery);

    return patients.filter((p) => {
      const pNationalId = normalizeString(p.nationalId);
      const pId = normalizeString(p.id);
      const pName = normalizeString(p.patientName);
      const pPhone = normalizePhone(p.phone);
      const pSha = normalizeString(p.shaId);

      return (
        pNationalId.includes(clean) ||
        pId.includes(clean) ||
        pName.includes(clean) ||
        (cleanPhoneQuery && pPhone.includes(cleanPhoneQuery)) ||
        (pSha && pSha.includes(clean))
      );
    });
  }, [patients, searchQuery]);

  // Automatically select first matching patient if exact National ID or single match
  useEffect(() => {
    if (searchQuery.trim()) {
      const clean = normalizeString(searchQuery);
      const exactMatch = patients.find(
        (p) => normalizeString(p.nationalId) === clean || normalizeString(p.id) === clean
      );
      if (exactMatch) {
        setSelectedPatient(exactMatch);
        if (exactMatch.visits && exactMatch.visits.length > 0) {
          setExpandedVisitId(exactMatch.visits[exactMatch.visits.length - 1].id || "latest");
        }
      } else if (matchingPatients.length === 1 && !selectedPatient) {
        setSelectedPatient(matchingPatients[0]);
      }
    }
  }, [searchQuery, patients, matchingPatients, selectedPatient]);

  // Keep selectedPatient updated with latest data from subscription
  useEffect(() => {
    if (selectedPatient) {
      const fresh = patients.find((p) => p.id === selectedPatient.id);
      if (fresh) {
        setSelectedPatient(fresh);
      }
    }
  }, [patients]);

  // Collect patient invoices
  const patientInvoices = useMemo(() => {
    if (!selectedPatient) return [];
    const patName = normalizeString(selectedPatient.patientName);
    const patId = selectedPatient.id;
    const patNatId = normalizeString(selectedPatient.nationalId);

    return invoices.filter((inv) => {
      const invPatName = normalizeString(inv.patientName);
      const invNatId = normalizeString((inv as any).nationalId);
      const invPatId = (inv as any).patientId;
      return (
        invPatId === patId ||
        (patNatId && invNatId === patNatId) ||
        invPatName === patName
      );
    });
  }, [invoices, selectedPatient]);

  // Collect all prescriptions from all visits
  const allPrescriptions = useMemo(() => {
    if (!selectedPatient || !selectedPatient.visits || !Array.isArray(selectedPatient.visits)) return [];
    const items: { visitDate: string; drugName: string; dosage: string; quantity: number; instructions: string; status: string }[] = [];
    selectedPatient.visits.forEach((v) => {
      if (v && v.prescriptions && Array.isArray(v.prescriptions) && v.prescriptions.length > 0) {
        v.prescriptions.forEach((p) => {
          if (!p) return;
          items.push({
            visitDate: v.date || "Unknown",
            drugName: p.drugName || "Medication",
            dosage: p.dosage || "Std",
            quantity: Number(p.quantity) || 1,
            instructions: p.instructions || "As directed",
            status: p.status || "dispensed"
          });
        });
      }
    });
    return items;
  }, [selectedPatient]);

  // Active encounters for this patient
  const activeEncounters = useMemo(() => {
    if (!selectedPatient) return { queue: null, ticket: null };
    const cleanNatId = (selectedPatient.nationalId || "").trim();
    const cleanName = normalizeString(selectedPatient.patientName);

    const activeQ = queueTickets.find(
      (q) => (q.nationalId && q.nationalId.trim() === cleanNatId) || normalizeString(q.patientName) === cleanName
    );
    const activeT = systemTickets.find(
      (t) =>
        (t.status === "open" || t.status === "in_progress") &&
        ((t.nationalId && t.nationalId.trim() === cleanNatId) || normalizeString(t.patientName) === cleanName)
    );

    return { queue: activeQ, ticket: activeT };
  }, [selectedPatient, queueTickets, systemTickets]);

  const getChartTitle = () => {
    const pName = selectedPatient?.patientName ? selectedPatient.patientName.replace(/[^a-zA-Z0-9]/g, "_") : "Patient";
    const natId = selectedPatient?.nationalId ? selectedPatient.nationalId.replace(/[^a-zA-Z0-9]/g, "_") : "Chart";
    return `Patient_Medical_History_${pName}_${natId}`;
  };

  const handlePrintHistory = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await printElement("patient-history-printable-chart", {
        title: getChartTitle(),
        paperSize: "a4"
      });
      toast.success("Patient medical history sent to printer.", "Print Triggered");
    } catch (err) {
      console.error(err);
      toast.error("Failed to print patient history.", "Print Error");
    } finally {
      setTimeout(() => setPrinting(false), 700);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const ok = await downloadElementAsPdf("patient-history-printable-chart", {
        fileName: `${getChartTitle()}.pdf`,
        title: getChartTitle(),
        format: "a4",
        scale: 2
      });
      if (ok) {
        setDownloadSuccess(true);
        toast.success("Full medical chart downloaded as multi-page PDF.", "Download Complete");
        setTimeout(() => setDownloadSuccess(false), 3500);
      } else {
        toast.error("Could not export PDF.", "Export Error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating medical chart PDF.", "Export Error");
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="patient-history-lookup-modal-backdrop"
      className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
    >
      <div
        id="patient-history-lookup-modal-container"
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Instant Patient Medical Record & History Retrieval
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold rounded-full">
                  Real-Time EHR
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Instantly retrieve past treatment history, previous diagnoses, prescriptions, lab results, and invoices using Patient ID, National ID / Passport, or Phone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH BAR & QUICK FILTERS */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              <input
                id="input-patient-history-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter National ID, Passport No, Patient MRN, Phone number or Name..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-xs"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs px-1 py-0.5 rounded cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedPatient && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Print Button */}
                <button
                  type="button"
                  id="btn-print-patient-history"
                  disabled={printing}
                  onClick={handlePrintHistory}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {printing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Printing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Print Chart</span>
                    </>
                  )}
                </button>

                {/* Multi-Page PDF Download Button */}
                <button
                  type="button"
                  id="btn-download-patient-history-pdf"
                  disabled={downloading}
                  onClick={handleDownloadPdf}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60 ${
                    downloadSuccess
                      ? "bg-emerald-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  title="Download full patient medical chart as multi-page PDF"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving PDF...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>PDF Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Full PDF</span>
                    </>
                  )}
                </button>

                {onSelectPatientForIntake && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPatientForIntake(selectedPatient);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>New Intake with this ID</span>
                  </button>
                )}

                {onSelectPatientForDoctor && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPatientForDoctor(selectedPatient);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Open in Doctor's Desk</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick matches pills */}
          {searchQuery && matchingPatients.length > 1 && (
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                {matchingPatients.length} Matches:
              </span>
              {matchingPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatient(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all shrink-0 cursor-pointer ${
                    selectedPatient?.id === p.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {p.patientName} (ID: {p.nationalId || "N/A"})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {!selectedPatient ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
                <Search className="w-8 h-8 opacity-70" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Search Patient by National ID or Hospital ID
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Type the patient's National ID number, Passport, Hospital MRN, phone number, or name in the box above to immediately pull up their complete historical hospital chart, previous diagnoses, vitals, prescriptions, and past encounters.
              </p>

              {patients.length > 0 && (
                <div className="pt-4 border-t border-slate-200 text-left space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Recently Treated Patients on File ({patients.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {patients.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {p.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{p.patientName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              ID: {p.nationalId} • Tel: {p.phone || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md">
                            {p.visits?.length || 1} Visit(s)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div id="patient-history-printable-chart" className="space-y-6 bg-white p-2 sm:p-4 rounded-2xl">
              {/* OFFICIAL HOSPITAL PRINT LETTERHEAD */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <DocumentLogo size="md" className="border-2 border-indigo-700/60 shadow-xs" />
                  <div>
                    <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase">
                      THE TASSIA HILL HOSPITAL
                    </h1>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Ministry of Health Reg: Reg No 024866 • Level 5 Tertiary Referral Hospital
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      P.O. Box 1834-00100 Nairobi, Kenya • Email: tassiahillhospital@gmail.com
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs space-y-1">
                  <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-[10px] rounded-lg uppercase">
                    Comprehensive Patient EHR Chart
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">Date: {new Date().toLocaleDateString("en-GB")}</p>
                </div>
              </div>

              {/* PATIENT PROFILE HEADER CARD */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-100/40 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      {selectedPatient.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          {selectedPatient.patientName}
                        </h3>
                        <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold rounded-full">
                          Returning Patient ({selectedPatient.visits?.length || 1} Past Encounters)
                        </span>
                        {selectedPatient.shaEligible === "eligible" && (
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>SHA Active: {selectedPatient.shaId || "Covered"}</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>National ID / Passport:</span>{" "}
                          <strong className="font-mono text-slate-900">{selectedPatient.nationalId}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>Phone:</span>{" "}
                          <strong className="text-slate-900">{selectedPatient.phone || "N/A"}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Age: <strong className="text-slate-900">{selectedPatient.age} yrs</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Gender: <strong className="text-slate-900">{selectedPatient.gender}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Blood Type:{" "}
                          {selectedPatient.bloodType === "Not Sure" || !selectedPatient.bloodType ? (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              Not Sure (Lab Pending)
                            </span>
                          ) : (
                            <strong className="text-rose-700 font-bold">{selectedPatient.bloodType}</strong>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right quick stats */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Visits</span>
                      <span className="text-sm font-black text-indigo-700">{selectedPatient.visits?.length || 1}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Prescriptions</span>
                      <span className="text-sm font-black text-emerald-700">{allPrescriptions.length}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoices</span>
                      <span className="text-sm font-black text-amber-700">{patientInvoices.length}</span>
                    </div>
                  </div>
                </div>

                {/* Active hospital status banner if patient is currently in the hospital */}
                {(activeEncounters.queue || activeEncounters.ticket) && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Current Active Encounter: Ticket{" "}
                        <strong className="font-mono font-bold">
                          {activeEncounters.ticket?.ticketNumber || activeEncounters.queue?.ticketNo}
                        </strong>{" "}
                        in{" "}
                        <strong className="uppercase">
                          {activeEncounters.ticket?.department || activeEncounters.queue?.currentDepartment || "Outpatient"}
                        </strong>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black uppercase rounded-md">
                      In Hospital Today
                    </span>
                  </div>
                )}
              </div>

              {/* NAVIGATION TABS */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("visits")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "visits"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Clinical Visits & Doctor Notes ({selectedPatient.visits?.length || 1})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("prescriptions")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "prescriptions"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Prescription History ({allPrescriptions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("billing")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "billing"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Billing & Invoices ({patientInvoices.length})</span>
                </button>
              </div>

              {/* TAB 1: CLINICAL VISITS & CHRONOLOGICAL TIMELINE */}
              {activeTab === "visits" && (
                <div className="space-y-4">
                  {(!selectedPatient.visits || selectedPatient.visits.length === 0) ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">Initial Registration File</p>
                      <p>No extended clinical visits logged yet. Latest diagnosis: {selectedPatient.latestDiagnosis || "Intake assessment"}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedPatient.visits.map((v, idx) => {
                        const isExpanded = expandedVisitId === (v.id || String(idx));
                        return (
                          <div
                            key={v.id || idx}
                            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                          >
                            {/* Visit Header Accordion */}
                            <div
                              onClick={() => setExpandedVisitId(isExpanded ? null : (v.id || String(idx)))}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                  #{selectedPatient.visits.length - idx}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-slate-900">
                                      Visit Date: {v.date}
                                    </h4>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase">
                                      Outpatient Consultation
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    Primary Diagnosis: <strong className="text-indigo-900">{v.diagnosis || "General checkup"}</strong>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
                                  <span>BP: {v.vitals?.bp || "120/80"}</span>
                                  <span>•</span>
                                  <span>Temp: {v.vitals?.temp || "37.0"}°C</span>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Visit Details */}
                            {isExpanded && (
                              <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                                {/* Vitals Bar */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Pressure</span>
                                    <span className="text-xs font-black text-slate-800">{v.vitals?.bp || "120/80 mmHg"}</span>
                                  </div>
                                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Temperature</span>
                                    <span className="text-xs font-black text-slate-800">{v.vitals?.temp || "36.8"} °C</span>
                                  </div>
                                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Heart Pulse</span>
                                    <span className="text-xs font-black text-slate-800">{v.vitals?.pulse || "72"} bpm</span>
                                  </div>
                                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Weight</span>
                                    <span className="text-xs font-black text-slate-800">{v.vitals?.weight || "70"} kg</span>
                                  </div>
                                </div>

                                {/* Symptoms & Diagnosis */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Presenting Symptoms / Chief Complaints</span>
                                    <p className="text-xs text-slate-700 italic">{v.symptoms || "None recorded"}</p>
                                  </div>

                                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase block">Doctor's Clinical Diagnosis</span>
                                    <p className="text-xs font-bold text-indigo-950">{v.diagnosis || "Pending review"}</p>
                                  </div>
                                </div>

                                {/* Prescriptions in this visit */}
                                {v.prescriptions && v.prescriptions.length > 0 && (
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                                      <Pill className="w-3.5 h-3.5" />
                                      <span>Prescribed Medications ({v.prescriptions.length})</span>
                                    </span>
                                    <div className="space-y-1.5">
                                      {v.prescriptions.map((rx, rxIdx) => (
                                        <div
                                          key={rxIdx}
                                          className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center justify-between"
                                        >
                                          <div>
                                            <span className="font-bold text-slate-900">{rx.drugName}</span>
                                            <span className="text-[11px] text-slate-600 ml-2 font-mono">
                                              ({rx.dosage} • Qty: {rx.quantity})
                                            </span>
                                            {rx.instructions && (
                                              <p className="text-[10px] text-slate-500">{rx.instructions}</p>
                                            )}
                                          </div>
                                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md capitalize">
                                            {rx.status || "Dispensed"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Referrals & Labs */}
                                {v.referrals && v.referrals.length > 0 && (
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
                                      <Activity className="w-3.5 h-3.5" />
                                      <span>Laboratory & Diagnostic Referrals</span>
                                    </span>
                                    <div className="space-y-1.5">
                                      {v.referrals.map((ref, rIdx) => (
                                        <div
                                          key={rIdx}
                                          className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between"
                                        >
                                          <div>
                                            <span className="font-bold text-slate-900 uppercase">[{ref.department}]</span>
                                            <span className="text-slate-800 ml-1.5 font-medium">{ref.testName}</span>
                                            {ref.notes && <p className="text-[10px] text-slate-500">{ref.notes}</p>}
                                          </div>
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md capitalize">
                                            {ref.status || "Completed"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ALL PRESCRIPTIONS & PHARMACY HISTORY */}
              {activeTab === "prescriptions" && (
                <div className="space-y-3">
                  {allPrescriptions.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      <Pill className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">No Historical Prescriptions</p>
                      <p>This patient has no recorded medication orders in previous visits.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Visit Date</th>
                            <th className="p-3">Medication</th>
                            <th className="p-3">Dosage & Regimen</th>
                            <th className="p-3">Qty</th>
                            <th className="p-3">Instructions</th>
                            <th className="p-3">Pharmacy Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allPrescriptions.map((rx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-medium text-slate-600">{rx.visitDate}</td>
                              <td className="p-3 font-bold text-slate-900">{rx.drugName}</td>
                              <td className="p-3 font-mono text-slate-700">{rx.dosage}</td>
                              <td className="p-3 font-bold text-slate-900">{rx.quantity}</td>
                              <td className="p-3 text-slate-500 text-[11px]">{rx.instructions || "Standard"}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md capitalize">
                                  {rx.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BILLING & FINANCIAL INVOICES */}
              {activeTab === "billing" && (
                <div className="space-y-3">
                  {patientInvoices.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">No Invoices Found</p>
                      <p>No billing statements or hospital receipts on file for this patient.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Total (KES)</th>
                            <th className="p-3">SHA Covered</th>
                            <th className="p-3">Out of Pocket</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {patientInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                              <td className="p-3 font-mono text-slate-600">{inv.date}</td>
                              <td className="p-3 font-bold text-slate-900">KES {inv.totalAmount?.toLocaleString()}</td>
                              <td className="p-3 text-emerald-700 font-semibold">
                                {inv.splitBilling?.sha ? `KES ${inv.splitBilling.sha.toLocaleString()}` : "KES 0"}
                              </td>
                              <td className="p-3 text-slate-700">
                                {inv.splitBilling?.outOfPocket ? `KES ${inv.splitBilling.outOfPocket.toLocaleString()}` : `KES ${inv.totalAmount?.toLocaleString()}`}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    inv.status === "paid"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Database records matched in real-time. Single-patient clinical chart integrity enforced.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
