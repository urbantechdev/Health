import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QueueTicket, MedicalRecord, Invoice, ClinicalVisit } from "../types";
import { normalizeString, normalizePhone } from "../lib/patientSyncService";
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Printer,
  Stethoscope,
  FlaskRound,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Activity,
  ShieldCheck,
  DollarSign,
  ArrowUpRight,
  Copy,
  Check,
  Eye,
  ChevronRight,
  X,
  Heart,
  Layers,
  FileSpreadsheet,
  BadgeCheck,
  HelpCircle,
  Scissors
} from "lucide-react";
import { toast } from "../lib/promptService";
import HaemogramDocument from "./HaemogramDocument";
import PrintDocument from "./PrintDocument";
import { isHaemogramReport } from "../lib/haemogramParser";

export interface PatientDailyHistoryStatementProps {
  tickets: QueueTicket[];
  patients: MedicalRecord[];
  invoices: Invoice[];
  onOpenPatientHistory?: (patientId: string) => void;
  onPrintPatientDocument?: (docType: "statement" | "receipt" | "sick_sheet", data: any) => void;
  facilityName?: string;
}

export interface UnifiedDailyPatientVisit {
  id: string; // Unique composite key
  patientId?: string;
  patientName: string;
  nationalId: string;
  phone?: string;
  age?: number | string;
  gender?: string;
  ticketNo?: string;
  visitDate: string; // YYYY-MM-DD
  visitTime: string; // HH:mm or formatted
  rawTimestamp: string;
  status: "pending" | "serving" | "completed" | "discharged" | "admitted" | string;
  department: string;
  service: string;
  doctorName?: string;
  diagnosis?: string;
  symptoms?: string;
  triageVitals?: {
    bp?: string;
    temp?: string;
    pulse?: string;
    respRate?: string;
    spo2?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    painScale?: string;
  };
  triageScore?: string;
  procedures: {
    name: string;
    category?: string;
    notes?: string;
    performedBy?: string;
    cost?: number;
    time?: string;
  }[];
  labTests: {
    name: string;
    status?: string;
    results?: string;
    notes?: string;
    cost?: number;
  }[];
  prescriptions: {
    drugName: string;
    dosage?: string;
    quantity?: number;
    instructions?: string;
    status?: string;
    cost?: number;
  }[];
  statement: {
    invoiceNumber?: string;
    kraInvoiceNo?: string;
    items: {
      description: string;
      category?: string;
      department?: string;
      amount: number;
    }[];
    totalBilled: number;
    totalPaid: number;
    balance: number;
    paymentMethod?: string;
    paymentStatus: "paid" | "unpaid" | "partial" | "pending";
    mpesaReceipt?: string;
    shaClaimId?: string;
    paidAt?: string;
  };
  rawQueueTicket?: QueueTicket;
  rawPatientRecord?: MedicalRecord;
  rawInvoice?: Invoice;
}

export default function PatientDailyHistoryStatement({
  tickets,
  patients,
  invoices,
  onOpenPatientHistory,
  onPrintPatientDocument,
  facilityName = "TASSIAHILL HOSPITAL"
}: PatientDailyHistoryStatementProps) {
  // Helper for formatting YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // State
  const [selectedDateFilter, setSelectedDateFilter] = useState<"today" | "yesterday" | "past3" | "past7" | "month" | "custom">("today");
  const [customDate, setCustomDate] = useState<string>(getTodayStr());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedHaemogramView, setSelectedHaemogramView] = useState<{ result: string; patientName?: string; date?: string } | null>(null);
  const [localPrintDoc, setLocalPrintDoc] = useState<{
    isOpen: boolean;
    patientData: any;
    visitData: any;
    invoiceData: any;
  } | null>(null);

  // Active Target Date string or date matcher
  const activeDateRange = useMemo(() => {
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    if (selectedDateFilter === "today") {
      return { start: today, end: today, label: `Today (${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })})` };
    }
    if (selectedDateFilter === "yesterday") {
      const yd = new Date();
      yd.setDate(yd.getDate() - 1);
      return { start: yesterday, end: yesterday, label: `Yesterday (${yd.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })})` };
    }
    if (selectedDateFilter === "past3") {
      const d3 = new Date();
      d3.setDate(d3.getDate() - 2);
      const startStr = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, "0")}-${String(d3.getDate()).padStart(2, "0")}`;
      return { start: startStr, end: today, label: "Past 3 Days" };
    }
    if (selectedDateFilter === "past7") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      const startStr = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
      return { start: startStr, end: today, label: "Past 7 Days" };
    }
    if (selectedDateFilter === "month") {
      const startStr = `${today.slice(0, 7)}-01`;
      return { start: startStr, end: today, label: "This Month" };
    }
    // Custom date
    const d = new Date(customDate || today);
    return { 
      start: customDate || today, 
      end: customDate || today, 
      label: d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) 
    };
  }, [selectedDateFilter, customDate]);

  // Aggregate Unified Visits across Queue, Invoices, and Patients for the active Date Range
  const unifiedDailyVisits = useMemo(() => {
    const visitsMap = new Map<string, UnifiedDailyPatientVisit>();

    const isInDateRange = (dateStr?: string) => {
      if (!dateStr) return false;
      // Extract YYYY-MM-DD from ISO or standard format
      const cleanDate = dateStr.slice(0, 10);
      return cleanDate >= activeDateRange.start && cleanDate <= activeDateRange.end;
    };

    // 1. Process Queue Tickets for the date
    tickets.forEach((t) => {
      const ticketDate = t.timestamp ? t.timestamp.slice(0, 10) : getTodayStr();
      if (!isInDateRange(ticketDate)) return;

      const patientKey = t.nationalId ? `nat_${t.nationalId.trim()}` : `name_${normalizeString(t.patientName)}_${ticketDate}`;
      
      const timeStr = t.timestamp && t.timestamp.includes("T") 
        ? new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : t.timestamp ? t.timestamp.slice(11, 16) || "Day Visit" : "Day Visit";

      // Detect procedures from ticket notes, issue, or procedures field
      const proceduresList: UnifiedDailyPatientVisit["procedures"] = [];
      if ((t as any).procedures && Array.isArray((t as any).procedures)) {
        (t as any).procedures.forEach((p: any) => {
          if (typeof p === "string") {
            proceduresList.push({ name: p, category: "Clinical Procedure" });
          } else if (p && p.name) {
            proceduresList.push({
              name: p.name,
              category: p.category || "Clinical Procedure",
              notes: p.notes,
              performedBy: p.performedBy || (t as any).doctorName || t.assignedSpecialistName || t.originDoctorName,
              cost: p.cost || p.amount || 0,
              time: p.time
            });
          }
        });
      }

      // Check if ticket issue mentions specific known clinical procedures
      if (t.issue && (
        t.issue.toLowerCase().includes("sutur") || 
        t.issue.toLowerCase().includes("dress") || 
        t.issue.toLowerCase().includes("inject") || 
        t.issue.toLowerCase().includes("nebuliz") || 
        t.issue.toLowerCase().includes("catheter") ||
        t.issue.toLowerCase().includes("incision") ||
        t.issue.toLowerCase().includes("plaster") ||
        t.issue.toLowerCase().includes("pop") ||
        t.issue.toLowerCase().includes("drainage") ||
        t.issue.toLowerCase().includes("cannul") ||
        t.issue.toLowerCase().includes("biopsy") ||
        t.issue.toLowerCase().includes("cautery")
      )) {
        if (!proceduresList.some(p => p.name.toLowerCase() === t.issue?.toLowerCase())) {
          proceduresList.push({
            name: t.issue,
            category: "OPD Procedure / Intervention",
            notes: t.notes || "Recorded at triage/consultation"
          });
        }
      }

      // Lab tests
      const labList: UnifiedDailyPatientVisit["labTests"] = [];
      const testNames = Array.isArray(t.requestedTests) ? t.requestedTests : Array.isArray(t.labTestsOrdered) ? t.labTestsOrdered : [];
      testNames.forEach((tName) => {
        if (!tName) return;
        labList.push({
          name: tName,
          status: t.resultsReady ? "Completed" : t.currentDepartment === "laboratory" ? "In Processing" : "Requested",
          results: t.labSummary
        });
      });

      // Prescriptions
      const rxList: UnifiedDailyPatientVisit["prescriptions"] = [];
      if ((t as any).prescriptions && Array.isArray((t as any).prescriptions)) {
        (t as any).prescriptions.forEach((rx: any) => {
          rxList.push({
            drugName: rx.drugName || rx.name,
            dosage: rx.dosage,
            quantity: rx.quantity,
            instructions: rx.instructions,
            status: rx.status || (t.status === "completed" ? "Dispensed" : "Prescribed")
          });
        });
      }

      visitsMap.set(patientKey, {
        id: t.id,
        patientId: t.patientId,
        patientName: t.patientName || "Walk-In Patient",
        nationalId: t.nationalId || "N/A",
        phone: t.phone,
        age: t.age,
        gender: t.gender,
        ticketNo: t.ticketNo,
        visitDate: ticketDate,
        visitTime: timeStr,
        rawTimestamp: t.timestamp,
        status: t.status,
        department: t.currentDepartment || "Reception",
        service: t.service || "General Consultation",
        doctorName: t.assignedSpecialistName || t.originDoctorName || (t as any).doctorName || "Attending Medical Officer",
        diagnosis: t.issue || (t as any).diagnosis || "General Clinical Evaluation",
        symptoms: t.notes || (t as any).symptoms || "Patient presented for outpatient consultation",
        triageVitals: t.vitals,
        triageScore: t.triageScore,
        procedures: proceduresList,
        labTests: labList,
        prescriptions: rxList,
        statement: {
          invoiceNumber: undefined,
          kraInvoiceNo: undefined,
          items: [],
          totalBilled: 0,
          totalPaid: 0,
          balance: 0,
          paymentMethod: t.paymentMode || "Cash",
          paymentStatus: t.billingStatus === "PAID" ? "paid" : "pending",
          mpesaReceipt: undefined,
          shaClaimId: undefined
        },
        rawQueueTicket: t
      });
    });

    // 2. Link or Add Invoices for the date
    invoices.forEach((inv) => {
      const invDate = inv.timestamp ? inv.timestamp.slice(0, 10) : getTodayStr();
      if (!isInDateRange(invDate)) return;

      const patientKey = inv.nationalId ? `nat_${inv.nationalId.trim()}` : `name_${normalizeString(inv.patientName)}_${invDate}`;
      let visit = visitsMap.get(patientKey);

      const itemsList = (inv.items || []).map((item) => ({
        description: item.description,
        department: item.department,
        amount: item.amount || 0
      }));

      const totalBilled = inv.total || 0;
      const totalPaid = inv.paymentStatus === "paid" ? totalBilled : (inv.paidAmount || 0);
      const balance = Math.max(0, totalBilled - totalPaid);

      // Check if invoice has procedure line items
      const procedureItems = itemsList.filter((item) => 
        (item.department && item.department.toLowerCase().includes("procedure")) ||
        item.description.toLowerCase().includes("sutur") ||
        item.description.toLowerCase().includes("dress") ||
        item.description.toLowerCase().includes("inject") ||
        item.description.toLowerCase().includes("minor surg") ||
        item.description.toLowerCase().includes("catheter") ||
        item.description.toLowerCase().includes("nebuliz") ||
        item.description.toLowerCase().includes("plaster") ||
        item.description.toLowerCase().includes("pop") ||
        item.description.toLowerCase().includes("ecg") ||
        item.description.toLowerCase().includes("ultrasound") ||
        item.description.toLowerCase().includes("x-ray") ||
        item.description.toLowerCase().includes("wash") ||
        item.description.toLowerCase().includes("cannul")
      );

      if (!visit) {
        // Create visit from invoice
        const procList = procedureItems.map(p => ({
          name: p.description,
          category: "Billed Procedure",
          cost: p.amount
        }));

        visitsMap.set(patientKey, {
          id: inv.id,
          patientId: inv.patientId,
          patientName: inv.patientName || "Patient",
          nationalId: inv.nationalId || "N/A",
          visitDate: invDate,
          visitTime: inv.timestamp ? new Date(inv.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Day Visit",
          rawTimestamp: inv.timestamp,
          status: inv.paymentStatus === "paid" ? "completed" : "pending",
          department: "Billing",
          service: "Outpatient Care & Billing",
          diagnosis: "Clinical Consultation & Services",
          symptoms: "Services Rendered",
          procedures: procList,
          labTests: itemsList.filter(i => i.department?.toLowerCase() === "laboratory" || i.description.toLowerCase().includes("test") || i.description.toLowerCase().includes("lab")).map(i => ({ name: i.description, status: "Billed", cost: i.amount })),
          prescriptions: itemsList.filter(i => i.department?.toLowerCase() === "pharmacy" || i.description.toLowerCase().includes("tab") || i.description.toLowerCase().includes("syrup") || i.description.toLowerCase().includes("cap")).map(i => ({ drugName: i.description, status: "Billed", cost: i.amount })),
          statement: {
            invoiceNumber: inv.id,
            kraInvoiceNo: inv.kraCompliantInvoiceNo,
            items: itemsList,
            totalBilled,
            totalPaid,
            balance,
            paymentMethod: inv.paymentMethod || "M-PESA",
            paymentStatus: inv.paymentStatus === "paid" ? "paid" : "pending",
            mpesaReceipt: inv.mpesaReceiptNumber || inv.transactionRef,
            shaClaimId: inv.shaClaimId,
            paidAt: inv.paidAt
          },
          rawInvoice: inv
        });
      } else {
        // Merge invoice statement details into existing visit
        visit.statement = {
          invoiceNumber: inv.id,
          kraInvoiceNo: inv.kraCompliantInvoiceNo,
          items: itemsList,
          totalBilled,
          totalPaid,
          balance,
          paymentMethod: inv.paymentMethod || visit.statement.paymentMethod || "M-PESA",
          paymentStatus: inv.paymentStatus === "paid" ? "paid" : "pending",
          mpesaReceipt: inv.mpesaReceiptNumber || inv.transactionRef,
          shaClaimId: inv.shaClaimId,
          paidAt: inv.paidAt
        };
        visit.rawInvoice = inv;

        // Add any missing procedure items from invoice
        procedureItems.forEach((pItem) => {
          if (!visit!.procedures.some(p => p.name.toLowerCase() === pItem.description.toLowerCase())) {
            visit!.procedures.push({
              name: pItem.description,
              category: "Billed Procedure",
              cost: pItem.amount
            });
          }
        });
      }
    });

    // 3. Link Patient Master Records (Visits, Clinical Notes, Prescriptions)
    patients.forEach((pRecord) => {
      if (!pRecord || !pRecord.visits || !Array.isArray(pRecord.visits) || pRecord.visits.length === 0) return;

      pRecord.visits.forEach((v) => {
        if (!v) return;
        const vDate = v.date ? v.date.slice(0, 10) : "";
        if (!isInDateRange(vDate)) return;

        const patientKey = pRecord.nationalId ? `nat_${pRecord.nationalId.trim()}` : `name_${normalizeString(pRecord.patientName)}_${vDate}`;
        let visit = visitsMap.get(patientKey);

        if (visit) {
          // Enrich with doctor notes, clinical vitals, ICD-10, prescriptions
          visit.patientId = pRecord.id;
          visit.rawPatientRecord = pRecord;
          if (v.diagnosis) visit.diagnosis = v.diagnosis;
          if (v.symptoms) visit.symptoms = v.symptoms;
          if ((v as any).doctorName) visit.doctorName = (v as any).doctorName;
          if (v.vitals && !visit.triageVitals) {
            visit.triageVitals = {
              bp: v.vitals.bp,
              temp: v.vitals.temp,
              pulse: v.vitals.pulse,
              weight: v.vitals.weight
            };
          }
          // Prescriptions from clinical visit
          if (v.prescriptions && Array.isArray(v.prescriptions) && v.prescriptions.length > 0) {
            v.prescriptions.forEach((rx) => {
              if (!rx || !rx.drugName) return;
              if (!visit!.prescriptions.some(existing => existing.drugName && existing.drugName.toLowerCase() === rx.drugName.toLowerCase())) {
                visit!.prescriptions.push({
                  drugName: rx.drugName,
                  dosage: rx.dosage,
                  quantity: rx.quantity,
                  instructions: rx.instructions,
                  status: rx.status || "Dispensed"
                });
              }
            });
          }
          // Referrals & Lab Tests
          if (v.referrals && Array.isArray(v.referrals) && v.referrals.length > 0) {
            v.referrals.forEach((ref) => {
              if (!ref || !ref.testName) return;
              if (!visit!.labTests.some(existing => existing.name && existing.name.toLowerCase() === ref.testName.toLowerCase())) {
                visit!.labTests.push({
                  name: ref.testName,
                  status: ref.status === "completed" ? "Completed" : "Pending",
                  results: ref.results,
                  notes: ref.notes
                });
              }
            });
          }
        } else {
          // Create entry from clinical visit
          visitsMap.set(patientKey, {
            id: v.id || `visit_${pRecord.id}_${vDate}`,
            patientId: pRecord.id,
            patientName: pRecord.patientName,
            nationalId: pRecord.nationalId || "N/A",
            phone: pRecord.phone,
            age: pRecord.age,
            gender: pRecord.gender,
            visitDate: vDate,
            visitTime: "Consultation",
            rawTimestamp: v.date,
            status: "completed",
            department: "Doctor Desk",
            service: "Clinical Consultation",
            doctorName: (v as any).doctorName || "Attending Physician",
            diagnosis: v.diagnosis || "Clinical Diagnosis",
            symptoms: v.symptoms || "Consultation Encounter",
            triageVitals: v.vitals ? {
              bp: v.vitals.bp,
              temp: v.vitals.temp,
              pulse: v.vitals.pulse,
              weight: v.vitals.weight
            } : undefined,
            procedures: [],
            labTests: (v.referrals || []).map(r => ({ name: r.testName, status: r.status === "completed" ? "Completed" : "Pending", results: r.results })),
            prescriptions: (v.prescriptions || []).map(p => ({ drugName: p.drugName, dosage: p.dosage, quantity: p.quantity, instructions: p.instructions, status: p.status || "Dispensed" })),
            statement: {
              items: [],
              totalBilled: 0,
              totalPaid: 0,
              balance: 0,
              paymentStatus: "paid",
              paymentMethod: "Cash"
            },
            rawPatientRecord: pRecord
          });
        }
      });
    });

    // Return sorted by timestamp descending
    return Array.from(visitsMap.values()).sort((a, b) => {
      return (b.rawTimestamp || "").localeCompare(a.rawTimestamp || "");
    });
  }, [tickets, invoices, patients, activeDateRange]);

  // Filtered visits by search and dropdowns
  const filteredVisits = useMemo(() => {
    return unifiedDailyVisits.filter((v) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = normalizeString(searchQuery);
        const qPhone = normalizePhone(searchQuery);
        const name = normalizeString(v.patientName);
        const natId = normalizeString(v.nationalId);
        const ticket = normalizeString(v.ticketNo);
        const diag = normalizeString(v.diagnosis);
        const phone = normalizePhone(v.phone);
        const invoiceNo = normalizeString(v.statement.invoiceNumber);

        const match =
          name.includes(q) ||
          natId.includes(q) ||
          ticket.includes(q) ||
          diag.includes(q) ||
          invoiceNo.includes(q) ||
          (qPhone && phone.includes(qPhone));

        if (!match) return false;
      }

      // 2. Department filter
      if (departmentFilter !== "all") {
        if (departmentFilter === "doctor" && !v.department.toLowerCase().includes("doctor")) return false;
        if (departmentFilter === "lab" && !v.department.toLowerCase().includes("lab")) return false;
        if (departmentFilter === "pharmacy" && !v.department.toLowerCase().includes("pharmacy")) return false;
        if (departmentFilter === "billing" && !v.department.toLowerCase().includes("billing")) return false;
        if (departmentFilter === "procedures" && v.procedures.length === 0) return false;
      }

      // 3. Payment Status filter
      if (paymentStatusFilter !== "all") {
        if (paymentStatusFilter === "paid" && v.statement.paymentStatus !== "paid") return false;
        if (paymentStatusFilter === "unpaid" && v.statement.paymentStatus === "paid") return false;
        if (paymentStatusFilter === "has_procedures" && v.procedures.length === 0) return false;
      }

      return true;
    });
  }, [unifiedDailyVisits, searchQuery, departmentFilter, paymentStatusFilter]);

  // Aggregate KPI Summary for Selected Date
  const dateKpis = useMemo(() => {
    let totalPatients = unifiedDailyVisits.length;
    let totalProcedures = 0;
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    unifiedDailyVisits.forEach((v) => {
      totalProcedures += v.procedures.length;
      totalBilled += v.statement.totalBilled;
      totalCollected += v.statement.totalPaid;
      totalOutstanding += v.statement.balance;
    });

    return {
      totalPatients,
      totalProcedures,
      totalBilled,
      totalCollected,
      totalOutstanding
    };
  }, [unifiedDailyVisits]);

  // Format KES currency
  const formatKES = (val: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Copy statement summary to clipboard
  const handleCopySummary = (visit: UnifiedDailyPatientVisit) => {
    const lines = [
      `=============================================`,
      `TASSIAHILL HOSPITAL - PATIENT VISIT & STATEMENT`,
      `=============================================`,
      `Date: ${visit.visitDate} | Time: ${visit.visitTime}`,
      `Patient: ${visit.patientName}`,
      `National ID / MRN: ${visit.nationalId} | Phone: ${visit.phone || "N/A"}`,
      `Ticket: ${visit.ticketNo || "N/A"} | Status: ${visit.status.toUpperCase()}`,
      `Attending Clinician: ${visit.doctorName || "Medical Officer"}`,
      `Diagnosis: ${visit.diagnosis || "General Outpatient Check"}`,
      ``,
      `--- CLINICAL PROCEDURES PERFORMED ---`,
      visit.procedures.length > 0
        ? visit.procedures.map((p, idx) => `  ${idx + 1}. ${p.name} (${p.category || "Procedure"})${p.cost ? ` - KES ${p.cost}` : ""}`).join("\n")
        : "  No special invasive procedures recorded.",
      ``,
      `--- INVESTIGATIONS / LAB TESTS ---`,
      visit.labTests.length > 0
        ? visit.labTests.map((l, idx) => `  ${idx + 1}. ${l.name} [Status: ${l.status || "Completed"}]`).join("\n")
        : "  None ordered.",
      ``,
      `--- MEDICATIONS & PRESCRIPTIONS ---`,
      visit.prescriptions.length > 0
        ? visit.prescriptions.map((rx, idx) => `  ${idx + 1}. ${rx.drugName} - ${rx.dosage || "As directed"} (Qty: ${rx.quantity || 1})`).join("\n")
        : "  None prescribed.",
      ``,
      `--- STATEMENT & FINANCIALS ---`,
      `Total Billed: KES ${visit.statement.totalBilled.toLocaleString()}`,
      `Total Paid: KES ${visit.statement.totalPaid.toLocaleString()} (${visit.statement.paymentMethod || "M-PESA"})`,
      `Balance: KES ${visit.statement.balance.toLocaleString()}`,
      visit.statement.kraInvoiceNo ? `eTIMS Invoice: ${visit.statement.kraInvoiceNo}` : "",
      visit.statement.mpesaReceipt ? `M-Pesa Ref: ${visit.statement.mpesaReceipt}` : "",
      `=============================================`
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines);
    setCopiedId(visit.id);
    toast.success(`Statement copied for ${visit.patientName}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrintStatement = (visit: UnifiedDailyPatientVisit) => {
    const docPayload = {
      patient: visit.rawPatientRecord || {
        patientName: visit.patientName,
        nationalId: visit.nationalId,
        phone: visit.phone,
        age: visit.age,
        gender: visit.gender
      },
      visit: {
        date: visit.visitDate,
        diagnosis: visit.diagnosis,
        symptoms: visit.symptoms,
        doctorName: visit.doctorName,
        procedures: visit.procedures,
        prescriptions: visit.prescriptions,
        vitals: visit.triageVitals
      },
      invoice: visit.rawInvoice || {
        id: visit.statement.invoiceNumber || `INV-${visit.id.slice(0, 6)}`,
        patientName: visit.patientName,
        nationalId: visit.nationalId,
        items: visit.statement.items,
        total: visit.statement.totalBilled,
        paymentStatus: visit.statement.paymentStatus,
        paymentMethod: visit.statement.paymentMethod,
        kraCompliantInvoiceNo: visit.statement.kraInvoiceNo,
        mpesaReceiptNumber: visit.statement.mpesaReceipt
      }
    };

    if (onPrintPatientDocument) {
      onPrintPatientDocument("statement", docPayload);
    } else {
      setLocalPrintDoc({
        isOpen: true,
        patientData: docPayload.patient,
        visitData: docPayload.visit,
        invoiceData: docPayload.invoice
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-7 shadow-xl space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900 font-comfortaa">
                  Patient Visit History, Procedures & Daily Statements
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-300">
                  {facilityName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Review all outpatient & inpatient visits by specific date, inspect detail procedures performed, and audit financial statements.
              </p>
            </div>
          </div>
        </div>

        {/* DATE SELECTOR BUTTONS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 border border-slate-200 rounded-2xl self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setSelectedDateFilter("today")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateFilter === "today"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDateFilter("yesterday")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateFilter === "yesterday"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setSelectedDateFilter("past3")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateFilter === "past3"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Past 3 Days
          </button>
          <button
            type="button"
            onClick={() => setSelectedDateFilter("past7")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateFilter === "past7"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Past 7 Days
          </button>
          
          {/* Custom Date Picker */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-300">
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setSelectedDateFilter("custom");
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border bg-white focus:outline-hidden focus:border-emerald-500 text-slate-800 ${
                selectedDateFilter === "custom" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-300"
              }`}
            />
          </div>
        </div>
      </div>

      {/* KPI METRIC HIGHLIGHTS FOR SELECTED DATE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patient Encounters</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-black text-slate-900 font-mono">{dateKpis.totalPatients}</span>
            <span className="text-[10px] text-slate-400 font-bold">attended</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            {activeDateRange.label}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Procedures Executed</span>
            <Scissors className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-black text-cyan-700 font-mono">{dateKpis.totalProcedures}</span>
            <span className="text-[10px] text-slate-400 font-bold">procedures</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Surgical & clinical interventions
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue Billed</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl md:text-2xl font-black text-slate-900 font-mono truncate">{formatKES(dateKpis.totalBilled)}</span>
          </div>
          <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{formatKES(dateKpis.totalCollected)} collected</span>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending / Claims</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl md:text-2xl font-black text-amber-700 font-mono truncate">{formatKES(dateKpis.totalOutstanding)}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            SHA / Insurance claims & balance
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, National ID, Phone, Ticket No, or Diagnosis..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs px-1 py-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">All Departments</option>
            <option value="doctor">Doctor Consult</option>
            <option value="lab">Diagnostics / Lab</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="billing">Billing Station</option>
            <option value="procedures">Has Procedures Only</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid & Cleared</option>
            <option value="unpaid">Pending / Balance</option>
          </select>
        </div>
      </div>

      {/* PATIENT LIST TABLE & EXPANDABLE DETAIL ACCORDION */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredVisits.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">No Patient Visits Found for {activeDateRange.label}</p>
              <p className="text-xs text-slate-400 mt-1">
                Try selecting another date (e.g. Yesterday or Today) or clearing your search filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredVisits.map((visit, index) => {
              const isExpanded = expandedPatientId === visit.id;

              return (
                <div 
                  key={visit.id || `v_${index}`} 
                  className={`transition-colors ${
                    isExpanded ? "bg-slate-50/90" : "bg-white hover:bg-slate-50/50"
                  }`}
                >
                  {/* MAIN SUMMARY ROW */}
                  <div 
                    onClick={() => setExpandedPatientId(isExpanded ? null : visit.id)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    {/* Left: Patient Badge & Vital Meta */}
                    <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0 shadow-xs">
                        {visit.patientName ? visit.patientName.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm md:text-base font-black text-slate-900 truncate">
                            {visit.patientName}
                          </h3>
                          {visit.ticketNo && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-mono font-bold">
                              {visit.ticketNo}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                            visit.status === "completed" || visit.statement.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}>
                            {visit.status === "completed" ? "Completed Visit" : visit.status}
                          </span>
                          {visit.procedures.length > 0 && (
                            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <Scissors className="w-3 h-3" />
                              <span>{visit.procedures.length} {visit.procedures.length === 1 ? "Procedure" : "Procedures"}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-medium">
                          <span className="font-mono text-slate-700 font-bold">
                            ID: {visit.nationalId}
                          </span>
                          {visit.phone && <span>• Tel: {visit.phone}</span>}
                          {visit.age && <span>• Age: {visit.age} Yrs</span>}
                          {visit.gender && <span>• {visit.gender}</span>}
                          <span className="text-slate-400">• Time: {visit.visitTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Diagnosis & Clinician */}
                    <div className="hidden lg:block w-64 shrink-0 text-left">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diagnosis</p>
                      <p className="text-xs font-semibold text-slate-800 truncate" title={visit.diagnosis}>
                        {visit.diagnosis || "Outpatient Clinical Consult"}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Dr: {visit.doctorName || "General Clinician"}
                      </p>
                    </div>

                    {/* Right: Statement Amount & Expand Button */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="block text-xs font-black text-slate-900 font-mono">
                          {formatKES(visit.statement.totalBilled)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className={`font-bold ${
                            visit.statement.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"
                          }`}>
                            {visit.statement.paymentStatus === "paid" ? "Cleared" : "Pending"}
                          </span>
                          <span className="text-slate-400">({visit.statement.paymentMethod || "M-PESA"})</span>
                        </div>
                      </div>

                      <div className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED PROCEDURES, CLINICAL ENCOUNTER & STATEMENT VIEW */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-200 bg-slate-50/70 p-4 md:p-6 space-y-6"
                      >
                        {/* 1. CLINICAL PROCEDURES & INTERVENTIONS */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Scissors className="w-4 h-4 text-cyan-600" />
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                                Detailed Procedures & Clinical Interventions
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] font-bold rounded-md">
                              {visit.procedures.length} Recorded
                            </span>
                          </div>

                          {visit.procedures.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                              No invasive surgical or nursing procedures billed for this encounter. Standard clinical evaluation and medical management administered.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {visit.procedures.map((proc, pIdx) => (
                                <div 
                                  key={pIdx}
                                  className="p-3.5 bg-cyan-50/40 border border-cyan-200/80 rounded-xl flex items-start justify-between gap-3"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {pIdx + 1}
                                      </span>
                                      <h5 className="text-xs font-black text-slate-900">{proc.name}</h5>
                                    </div>
                                    <p className="text-[11px] text-cyan-800 font-semibold mt-1">
                                      Category: {proc.category || "Clinical Procedure"}
                                    </p>
                                    {proc.notes && (
                                      <p className="text-[10px] text-slate-600 mt-1 italic">
                                        Notes: {proc.notes}
                                      </p>
                                    )}
                                    {proc.performedBy && (
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Clinician: {proc.performedBy}
                                      </p>
                                    )}
                                  </div>
                                  {proc.cost !== undefined && proc.cost > 0 && (
                                    <span className="px-2 py-1 bg-white border border-cyan-200 text-slate-900 font-mono font-bold text-xs rounded-lg shrink-0">
                                      {formatKES(proc.cost)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. CLINICAL SUMMARY, DIAGNOSTICS & PRESCRIPTIONS GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Column 1: Diagnosis & Vitals */}
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                              <Stethoscope className="w-4 h-4 text-emerald-600" />
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                                Clinical Examination
                              </h4>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Diagnosis</span>
                              <p className="text-xs font-bold text-slate-900">{visit.diagnosis || "General Consult"}</p>
                            </div>
                            {visit.symptoms && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Chief Complaint / Symptoms</span>
                                <p className="text-xs text-slate-700">{visit.symptoms}</p>
                              </div>
                            )}
                            {visit.triageVitals && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Triage Vitals</span>
                                <div className="grid grid-cols-2 gap-1.5 mt-1 text-[11px] font-mono text-slate-700">
                                  {visit.triageVitals.bp && <div>BP: <span className="font-bold text-slate-900">{visit.triageVitals.bp}</span></div>}
                                  {visit.triageVitals.temp && <div>Temp: <span className="font-bold text-slate-900">{visit.triageVitals.temp}°C</span></div>}
                                  {visit.triageVitals.pulse && <div>Pulse: <span className="font-bold text-slate-900">{visit.triageVitals.pulse} bpm</span></div>}
                                  {visit.triageVitals.weight && <div>Weight: <span className="font-bold text-slate-900">{visit.triageVitals.weight} kg</span></div>}
                                  {visit.triageVitals.spo2 && <div>SpO2: <span className="font-bold text-slate-900">{visit.triageVitals.spo2}%</span></div>}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Column 2: Diagnostic Lab Tests */}
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                              <FlaskRound className="w-4 h-4 text-amber-600" />
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                                Lab Tests & Diagnostics
                              </h4>
                            </div>
                            {visit.labTests.length === 0 ? (
                              <p className="text-xs text-slate-400 italic pt-2">No laboratory tests ordered.</p>
                            ) : (
                              <div className="space-y-2 pt-1">
                                {visit.labTests.map((t, idx) => {
                                  const isHaemogram =
                                    isHaemogramReport(t.results || "") ||
                                    t.name.toLowerCase().includes("haemogram") ||
                                    t.name.toLowerCase().includes("cbc");

                                  return (
                                    <div key={idx} className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{t.name}</span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                                          {t.status || "Ordered"}
                                        </span>
                                      </div>
                                      {t.results && (
                                        <div className="pt-1">
                                          {isHaemogram ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSelectedHaemogramView({
                                                  result: t.results || "",
                                                  patientName: visit.patientName,
                                                  date: visit.visitDate
                                                })
                                              }
                                              className="w-full py-1.5 px-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                                            >
                                              <FileText className="w-3 h-3" />
                                              <span>View Official Haemogram (CBC) Document</span>
                                            </button>
                                          ) : (
                                            <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-amber-100 font-medium leading-relaxed">
                                              {t.results}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Column 3: Prescriptions */}
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                              <ShoppingBag className="w-4 h-4 text-teal-600" />
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                                Pharmacy Dispensing
                              </h4>
                            </div>
                            {visit.prescriptions.length === 0 ? (
                              <p className="text-xs text-slate-400 italic pt-2">No medications dispensed.</p>
                            ) : (
                              <div className="space-y-2 pt-1">
                                {visit.prescriptions.map((rx, idx) => (
                                  <div key={idx} className="p-2 bg-teal-50/50 border border-teal-200/60 rounded-xl text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900">{rx.drugName}</span>
                                      <span className="text-[10px] font-mono font-bold text-teal-800">
                                        Qty: {rx.quantity || 1}
                                      </span>
                                    </div>
                                    {rx.dosage && <p className="text-[10px] text-slate-600 mt-0.5">{rx.dosage}</p>}
                                    {rx.instructions && <p className="text-[9px] text-slate-400 italic">{rx.instructions}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. ITEMISED PATIENT STATEMENT & FINANCIAL AUDIT */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                                  Patient Statement & Financial Breakdown
                                </h4>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                KRA eTIMS Fiscal Clearance • Official Tassiahill Hospital Statement
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {visit.statement.kraInvoiceNo && (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-mono font-bold">
                                  eTIMS: {visit.statement.kraInvoiceNo}
                                </span>
                              )}
                              {visit.statement.mpesaReceipt && (
                                <span className="px-2.5 py-1 bg-green-50 text-green-800 border border-green-300 rounded-lg text-[10px] font-mono font-bold">
                                  M-Pesa: {visit.statement.mpesaReceipt}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Line Items Table */}
                          {visit.statement.items && visit.statement.items.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                                    <th className="pb-2">Line Description</th>
                                    <th className="pb-2">Department</th>
                                    <th className="pb-2 text-right">Amount (KES)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {visit.statement.items.map((item, itmIdx) => (
                                    <tr key={itmIdx} className="hover:bg-slate-50">
                                      <td className="py-2 font-semibold text-slate-800">{item.description}</td>
                                      <td className="py-2 text-slate-500 capitalize">{item.department || "General"}</td>
                                      <td className="py-2 text-right font-mono font-bold text-slate-900">
                                        {formatKES(item.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-slate-900 font-bold text-xs">
                                    <td colSpan={2} className="pt-2 text-slate-900">Total Billed Encounter Amount</td>
                                    <td className="pt-2 text-right font-mono text-slate-900 font-black">
                                      {formatKES(visit.statement.totalBilled)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                              <span className="font-semibold text-slate-700">Encounter Consultation & Treatment Total</span>
                              <span className="font-black font-mono text-slate-900">{formatKES(visit.statement.totalBilled)}</span>
                            </div>
                          )}

                          {/* Financial Reconciliation Footer */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl">
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Payment Mode</span>
                                <span className="font-bold text-slate-800">{visit.statement.paymentMethod || "M-PESA"}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Paid Amount</span>
                                <span className="font-bold text-emerald-600 font-mono">{formatKES(visit.statement.totalPaid)}</span>
                              </div>
                              {visit.statement.balance > 0 && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase">Outstanding</span>
                                  <span className="font-bold text-rose-600 font-mono">{formatKES(visit.statement.balance)}</span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopySummary(visit)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                {copiedId === visit.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Copy Summary</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintStatement(visit)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Statement</span>
                              </button>

                              {onOpenPatientHistory && visit.patientId && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPatientHistory(visit.patientId || visit.nationalId)}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Full Patient EHR</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Full Haemogram Document View Modal */}
      {selectedHaemogramView && (
        <HaemogramDocument
          mode="modal"
          isOpen={Boolean(selectedHaemogramView)}
          onClose={() => setSelectedHaemogramView(null)}
          data={selectedHaemogramView.result}
          patientMeta={{
            name: selectedHaemogramView.patientName || "Patient Record",
            date: selectedHaemogramView.date,
            facilityName: "TASSIAHILL HOSPITAL Diagnostic & Laboratory Center",
            doctor: "Attending Medical Officer"
          }}
        />
      )}
      {/* Local Print Document Modal Fallback */}
      {localPrintDoc?.isOpen && (
        <PrintDocument
          isOpen={localPrintDoc.isOpen}
          onClose={() => setLocalPrintDoc(null)}
          type="patient_statement"
          receiptData={localPrintDoc.invoiceData}
          patientStatementData={{
            patient: localPrintDoc.patientData,
            visit: localPrintDoc.visitData,
            invoice: localPrintDoc.invoiceData
          }}
        />
      )}
    </div>
  );
}
