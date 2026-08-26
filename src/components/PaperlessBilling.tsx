import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  query,
  where,
  getDocs,
  getDoc
} from "firebase/firestore";
import {
  Invoice,
  MedicalRecord,
  Encounter,
  EncounterPrescription,
  EncounterLabRequest,
  EncounterBillItem,
  ProcedureTariffItem,
  WardBedRateSetting,
  BillItemDraft,
  Medication
} from "../types";
import {
  CreditCard,
  ShieldCheck,
  QrCode,
  Smartphone,
  Users,
  FileText,
  CheckCircle,
  RefreshCw,
  Layers,
  Check,
  Printer,
  Search,
  Plus,
  Trash2,
  Sliders,
  DollarSign,
  Bed,
  Pill,
  FlaskRound,
  Stethoscope,
  Activity,
  Heart,
  User,
  ArrowRight,
  GripVertical,
  Receipt,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import PrintDocument from "./PrintDocument";
import TariffRateCardModal from "./TariffRateCardModal";
import { closeAutoTicket } from "../lib/ticketService";
import {
  subscribeProcedureTariffs,
  subscribeWardBedRates,
  initHospitalTariffsAndBedRates
} from "../lib/tariffService";
import { toast, modernConfirm } from "../lib/promptService";

interface PaperlessBillingProps {
  toggles: any;
  onPaymentReconciled: () => void;
}

export default function PaperlessBilling({ toggles, onPaymentReconciled }: PaperlessBillingProps) {
  // Master Invoices from Firestore
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Patients & Encounters
  const [patients, setPatients] = useState<MedicalRecord[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [tariffs, setTariffs] = useState<ProcedureTariffItem[]>([]);
  const [bedRates, setBedRates] = useState<WardBedRateSetting[]>([]);

  // Selection & Search
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientFilterMode, setPatientFilterMode] = useState<"active_cases" | "admitted" | "all">("active_cases");

  // Patient Available / Unbilled Procedures
  const [availableItems, setAvailableItems] = useState<BillItemDraft[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [activeCatalogTab, setActiveCatalogTab] = useState<"patient_procedures" | "tariff_catalog" | "pharmacy_catalog">("patient_procedures");

  // Active Billing Canvas Draft Items
  const [billedItems, setBilledItems] = useState<BillItemDraft[]>([]);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Split-billing splits
  const [shaCover, setShaCover] = useState(0);
  const [insuranceCover, setInsuranceCover] = useState(0);
  const [patientOutPocket, setPatientOutPocket] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Safaricom M-PESA details
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<string | null>(null);
  const [mpesaCheckoutId, setMpesaCheckoutId] = useState<string | null>(null);

  // Printing & Modal state
  const [printOpen, setPrintOpen] = useState(false);
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<Invoice | null>(null);
  const [showTariffSettingsModal, setShowTariffSettingsModal] = useState(false);
  const [showCustomChargeModal, setShowCustomChargeModal] = useState(false);
  const [customChargeForm, setCustomChargeForm] = useState({
    description: "",
    category: "procedure" as BillItemDraft["category"],
    department: "Clinical Services",
    unitPrice: 1000,
    quantity: 1
  });

  // KRA eTIMS state
  const [kraStatus, setKraStatus] = useState<any | null>(null);
  const [kraLoading, setKraLoading] = useState(false);

  // SHA / Taifa Care Verification state
  const [shaLoading, setShaLoading] = useState(false);
  const [shaData, setShaData] = useState<any | null>(null);

  // Slade / Insurance Pre-auth
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceAuth, setInsuranceAuth] = useState<any | null>(null);

  // Active View Tab: "workspace" or "history"
  const [activeViewMode, setActiveViewMode] = useState<"billing_canvas" | "invoice_history">("billing_canvas");

  // -------------------------------------------------------------
  // 1. DATA SUBSCRIPTIONS
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Invoices
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invs: Invoice[] = [];
      snapshot.forEach((docSnap) => {
        invs.push({ id: docSnap.id, ...docSnap.data() } as Invoice);
      });
      invs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setInvoices(invs);
    });

    // 2. Patients
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const pats: MedicalRecord[] = [];
      snapshot.forEach((docSnap) => {
        pats.push({ id: docSnap.id, ...docSnap.data() } as MedicalRecord);
      });
      setPatients(pats);
    });

    // 3. Encounters
    const unsubEncounters = onSnapshot(collection(db, "encounters"), (snapshot) => {
      const encs: Encounter[] = [];
      snapshot.forEach((docSnap) => {
        encs.push({ id: docSnap.id, ...docSnap.data() } as Encounter);
      });
      setEncounters(encs);
    });

    // 4. Pharmacy Medications
    const unsubMeds = onSnapshot(collection(db, "medications"), (snapshot) => {
      const meds: Medication[] = [];
      snapshot.forEach((docSnap) => {
        meds.push({ id: docSnap.id, ...docSnap.data() } as Medication);
      });
      setMedications(meds);
    });

    // 5. Tariffs & Bed Rates
    const unsubTariffs = subscribeProcedureTariffs((data) => setTariffs(data));
    const unsubBedRates = subscribeWardBedRates((data) => setBedRates(data));

    return () => {
      unsubInvoices();
      unsubPatients();
      unsubEncounters();
      unsubMeds();
      unsubTariffs();
      unsubBedRates();
    };
  }, []);

  // -------------------------------------------------------------
  // 2. SELECTED PATIENT & ENCOUNTER AGGREGATION
  // -------------------------------------------------------------
  const getPatientName = (p?: MedicalRecord | null) => (p?.patientName || p?.name || "Patient");

  const selectedPatient = patients.find((p) => p.id === selectedPatientId || p.patientNumber === selectedPatientId);
  const activeEncounter = encounters.find(
    (e) => (e.patientId === selectedPatient?.id || e.nationalId === selectedPatient?.nationalId) && e.status !== "DISCHARGED"
  );

  // Auto-select first patient if none selected
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      // Find patient with active encounter or first patient
      const firstActive = patients.find((p) => encounters.some((e) => e.patientId === p.id && e.status !== "DISCHARGED"));
      setSelectedPatientId(firstActive ? firstActive.id : patients[0].id);
    }
  }, [patients, encounters]);

  // When selected patient changes, rebuild available unbilled procedures & reset active billing canvas
  useEffect(() => {
    if (!selectedPatient) {
      setAvailableItems([]);
      setBilledItems([]);
      return;
    }

    // Set default M-Pesa phone
    setMpesaPhone(selectedPatient.phone || "07" + Math.floor(10000000 + Math.random() * 90000000));
    setKraStatus(null);
    setInsuranceAuth(null);
    setShaData(null);
    setDiscountAmount(0);

    // Fetch and aggregate all patient procedures, pharmacy prescriptions, and bed days
    loadPatientProcedures(selectedPatient, activeEncounter);
  }, [selectedPatientId, activeEncounter?.id, bedRates.length]);

  const loadPatientProcedures = async (patient: MedicalRecord, encounter?: Encounter) => {
    const unbilledList: BillItemDraft[] = [];

    // 1. Check Consultation Intake Fee
    unbilledList.push({
      id: `avail-consult-${patient.id}`,
      sourceId: patient.id,
      sourceType: "consultation",
      description: "General Outpatient Consultation & Clinical Review",
      category: "consultation",
      department: "Outpatient / OPD",
      quantity: 1,
      unitPrice: 1000,
      amount: 1000,
      notes: "Standard physician / medical officer intake consultation",
      addedAt: new Date().toISOString()
    });

    // 2. Check Ward Bed Stays if Admitted
    if (encounter && (encounter.status === "ADMITTED" || encounter.assignedWard || encounter.assignedBed)) {
      const wardName = encounter.assignedWard || "General Ward";
      const bedRateMatch = bedRates.find(
        (r) => r.wardName.toLowerCase() === wardName.toLowerCase() || r.wardId.toLowerCase() === wardName.toLowerCase()
      );
      const dailyRate = bedRateMatch ? bedRateMatch.dailyRate : 1500;
      const nursingFee = bedRateMatch?.nursingDailyFee || 500;

      // Calculate elapsed days
      const admitTime = encounter.admittedAt ? new Date(encounter.admittedAt).getTime() : new Date().getTime() - 86400000;
      const nowTime = new Date().getTime();
      const elapsedDays = Math.max(1, Math.ceil((nowTime - admitTime) / (1000 * 60 * 60 * 24)));

      // Bed Stay Item
      unbilledList.push({
        id: `avail-bed-${encounter.id}`,
        sourceId: encounter.assignedBed || "bed-stay",
        sourceType: "bed_stay",
        description: `Ward Bed Occupancy: ${wardName} (${encounter.assignedBed || "Standard Bed"})`,
        category: "ward_bed",
        department: "Inpatient Wards",
        quantity: elapsedDays,
        unitPrice: dailyRate,
        amount: elapsedDays * dailyRate,
        durationDays: elapsedDays,
        notes: `Inpatient stay: ${elapsedDays} day(s) @ KES ${dailyRate.toLocaleString()}/day`,
        addedAt: new Date().toISOString()
      });

      // Daily Nursing Care Item
      unbilledList.push({
        id: `avail-nursing-${encounter.id}`,
        sourceId: "nursing-daily",
        sourceType: "procedure",
        description: `Inpatient Daily Nursing Care & Vitals Monitoring (${wardName})`,
        category: "nursing",
        department: "Nursing Station",
        quantity: elapsedDays,
        unitPrice: nursingFee,
        amount: elapsedDays * nursingFee,
        durationDays: elapsedDays,
        notes: `Round-the-clock ward nursing care for ${elapsedDays} day(s)`,
        addedAt: new Date().toISOString()
      });
    }

    // 3. Check Prescriptions from Encounter Subcollections or Patient Record
    try {
      if (encounter) {
        const rxSnap = await getDocs(collection(db, "encounters", encounter.id, "prescriptions"));
        rxSnap.forEach((docSnap) => {
          const rx = docSnap.data() as EncounterPrescription;
          unbilledList.push({
            id: `avail-rx-${docSnap.id}`,
            sourceId: docSnap.id,
            sourceType: "prescription",
            description: `Rx: ${rx.drugName} (${rx.dosage || "Standard Dose"})`,
            category: "pharmacy",
            department: "Pharmacy",
            quantity: Number(rx.quantity) || 1,
            unitPrice: Number(rx.unitPrice) || 450,
            amount: (Number(rx.quantity) || 1) * (Number(rx.unitPrice) || 450),
            drugDosage: rx.dosage,
            notes: rx.instructions || `Prescribed by ${rx.prescribedBy || "Doctor"}`,
            addedAt: rx.createdAt || new Date().toISOString()
          });
        });

        // 4. Check Lab Requests
        const labSnap = await getDocs(collection(db, "encounters", encounter.id, "lab_requests"));
        labSnap.forEach((docSnap) => {
          const lab = docSnap.data() as EncounterLabRequest;
          unbilledList.push({
            id: `avail-lab-${docSnap.id}`,
            sourceId: docSnap.id,
            sourceType: "lab_order",
            description: `Lab Test: ${lab.testName}`,
            category: lab.department === "radiology" ? "radiology" : "laboratory",
            department: lab.department || "Laboratory",
            quantity: 1,
            unitPrice: Number(lab.unitPrice) || 850,
            amount: Number(lab.unitPrice) || 850,
            notes: `Ordered by ${lab.orderedBy || "Clinician"} • Status: ${lab.status}`,
            addedAt: lab.createdAt || new Date().toISOString()
          });
        });
      }

      // Also check patient's historical active visits if available
      if (patient.visits && patient.visits.length > 0) {
        const latestVisit = patient.visits[patient.visits.length - 1];
        if (latestVisit.prescriptions && (!encounter || unbilledList.filter((i) => i.category === "pharmacy").length === 0)) {
          latestVisit.prescriptions.forEach((rx, idx) => {
            unbilledList.push({
              id: `avail-pat-rx-${idx}`,
              sourceId: `pat-rx-${idx}`,
              sourceType: "prescription",
              description: `Rx: ${rx.drugName} (${rx.dosage})`,
              category: "pharmacy",
              department: "Pharmacy",
              quantity: rx.quantity || 1,
              unitPrice: 500,
              amount: (rx.quantity || 1) * 500,
              drugDosage: rx.dosage,
              notes: rx.instructions || "Clinical prescription",
              addedAt: new Date().toISOString()
            });
          });
        }
      }
    } catch (err) {
      console.warn("Error fetching subcollections for encounter:", err);
    }

    setAvailableItems(unbilledList);
    // Pre-load default initial billed item (or start empty)
    setBilledItems([]);
  };

  // -------------------------------------------------------------
  // 3. DRAG & DROP AND BILLING CANVAS ACTIONS
  // -------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, item: BillItemDraft) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOverCanvas(true);
  };

  const handleDragLeave = () => {
    setIsDragOverCanvas(false);
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const droppedItem: BillItemDraft = JSON.parse(dataStr);
      addItemToBill(droppedItem);
    } catch (err) {
      console.error("Drop parsing error:", err);
    }
  };

  const addItemToBill = (item: BillItemDraft) => {
    // Check if already in billed items
    const existingIndex = billedItems.findIndex((b) => b.id === item.id || (b.sourceId && b.sourceId === item.sourceId));

    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...billedItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].amount = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setBilledItems(updated);
      toast.info(`Updated quantity for "${item.description}"`, "Item Scaled");
    } else {
      // Add as new item
      const newItem: BillItemDraft = {
        ...item,
        id: `billed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: (item.quantity || 1) * (item.unitPrice || 0),
        addedAt: new Date().toISOString()
      };
      setBilledItems([...billedItems, newItem]);
      toast.success(`Added "${item.description}" to bill worksheet`, "Procedure Billed");
    }
  };

  const addAllAvailableToBill = () => {
    if (availableItems.length === 0) return;
    const newItems: BillItemDraft[] = availableItems.map((item) => ({
      ...item,
      id: `billed-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      amount: (item.quantity || 1) * (item.unitPrice || 0),
      addedAt: new Date().toISOString()
    }));
    setBilledItems([...billedItems, ...newItems]);
    toast.success(`Transferred ${availableItems.length} procedure(s) to active bill.`, "All Items Added");
  };

  const removeItemFromBill = (itemIndex: number) => {
    const updated = billedItems.filter((_, idx) => idx !== itemIndex);
    setBilledItems(updated);
  };

  const updateBilledItemPrice = (index: number, newUnitPrice: number) => {
    const updated = [...billedItems];
    updated[index].unitPrice = Math.max(0, newUnitPrice);
    updated[index].amount = updated[index].quantity * Math.max(0, newUnitPrice);
    setBilledItems(updated);
  };

  const updateBilledItemQuantity = (index: number, newQuantity: number) => {
    const updated = [...billedItems];
    const safeQty = Math.max(1, newQuantity);
    updated[index].quantity = safeQty;
    updated[index].amount = safeQty * updated[index].unitPrice;
    setBilledItems(updated);
  };

  const updateBilledItemDescription = (index: number, newDesc: string) => {
    const updated = [...billedItems];
    updated[index].description = newDesc;
    setBilledItems(updated);
  };

  const handleCreateCustomCharge = () => {
    if (!customChargeForm.description) {
      toast.warning("Please enter a description for the charge.", "Description Required");
      return;
    }

    const newItem: BillItemDraft = {
      id: `billed-custom-${Date.now()}`,
      sourceType: "custom",
      description: customChargeForm.description,
      category: customChargeForm.category,
      department: customChargeForm.department,
      quantity: Number(customChargeForm.quantity) || 1,
      unitPrice: Number(customChargeForm.unitPrice) || 0,
      amount: (Number(customChargeForm.quantity) || 1) * (Number(customChargeForm.unitPrice) || 0),
      addedAt: new Date().toISOString()
    };

    setBilledItems([...billedItems, newItem]);
    setShowCustomChargeModal(false);
    setCustomChargeForm({
      description: "",
      category: "procedure",
      department: "Clinical Services",
      unitPrice: 1000,
      quantity: 1
    });
    toast.success(`Custom charge "${newItem.description}" added.`, "Charge Added");
  };

  // -------------------------------------------------------------
  // 4. TOTALS & SPLIT REVENUE CALCULATIONS
  // -------------------------------------------------------------
  const grossSubtotal = billedItems.reduce((sum, item) => sum + item.amount, 0);
  const netDueAfterDiscount = Math.max(0, grossSubtotal - discountAmount);

  // Update out-of-pocket when splits change
  useEffect(() => {
    const remaining = Math.max(0, netDueAfterDiscount - shaCover - insuranceCover);
    setPatientOutPocket(remaining);
  }, [netDueAfterDiscount, shaCover, insuranceCover]);

  // -------------------------------------------------------------
  // 5. THIRD PARTY INTEGRATION HANDLERS
  // -------------------------------------------------------------
  const checkShaEligibility = async () => {
    if (!selectedPatient) return;
    const searchId = selectedPatient.nationalId || "32441928";
    setShaLoading(true);
    try {
      const response = await fetch("/api/integrations/sha/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: searchId }),
      });
      const data = await response.json();
      if (data.eligible) {
        setShaData(data);
        const applicableSha = Math.min(netDueAfterDiscount, 2500);
        setShaCover(applicableSha);
        setPatientOutPocket(Math.max(0, netDueAfterDiscount - applicableSha - insuranceCover));
        toast.success(`SHA Coverage Approved: KES ${applicableSha.toLocaleString()}`, "SHA Capitation Applied");
      } else {
        toast.error(data.error || "Patient SHA status is inactive or defaulted.", "SHA Inactive");
      }
    } catch (e) {
      console.error("SHA check error:", e);
      toast.error("Failed to verify SHA coverage status.", "Network Error");
    } finally {
      setShaLoading(false);
    }
  };

  const triggerMpesaStkPush = async () => {
    if (!mpesaPhone || patientOutPocket <= 0) {
      toast.warning("Please configure a valid phone number and out-of-pocket payment amount.", "Payment Config Error");
      return;
    }

    setMpesaLoading(true);
    setMpesaStatus("Initiating STK Push...");
    try {
      const response = await fetch("/api/integrations/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: mpesaPhone,
          amount: patientOutPocket,
          invoiceId: `INV-${Date.now().toString().slice(-6)}`,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMpesaCheckoutId(data.CheckoutRequestID);
        setMpesaStatus("STK Push Sent! Waiting for user PIN...");
        pollMpesaStatus(data.CheckoutRequestID);
      } else {
        setMpesaStatus("Failed to initiate push.");
        setMpesaLoading(false);
      }
    } catch (e) {
      console.error(e);
      setMpesaLoading(false);
    }
  };

  const pollMpesaStatus = (checkoutId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/integrations/mpesa/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutRequestId: checkoutId }),
        });
        const data = await response.json();

        if (data.status === "Success") {
          clearInterval(interval);
          setMpesaStatus(`Success! Receipt: ${data.mpesaReceiptNumber}`);
          setMpesaLoading(false);
          // Complete payment and generate receipt
          handleGenerateReceiptAndCompleteBill("M-PESA", data.mpesaReceiptNumber);
        } else if (data.status === "NotFound") {
          clearInterval(interval);
          setMpesaStatus("Payment timed out or not found.");
          setMpesaLoading(false);
        }
      } catch (err) {
        console.error("M-Pesa polling error:", err);
        clearInterval(interval);
        setMpesaLoading(false);
      }
    }, 2000);
  };

  const submitInsurancePreauth = async () => {
    if (!selectedPatient || insuranceCover <= 0) return;
    setInsuranceLoading(true);
    try {
      const response = await fetch("/api/integrations/slade/preauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName: selectedPatient.insuranceScheme || "Jubilee Health Insurance",
          nationalId: selectedPatient.nationalId,
          requestAmount: insuranceCover,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setInsuranceAuth(data);
        toast.success(`Slade Auth Code: ${data.authCode}`, "Insurance Authorized");
      } else {
        toast.error("Insurance pre-authorization failed or was declined.", "Pre-Auth Declined");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInsuranceLoading(false);
    }
  };

  const generateETIMSInvoice = async (invoiceAmount: number) => {
    if (!selectedPatient) return;
    setKraLoading(true);
    try {
      const response = await fetch("/api/integrations/etims/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: getPatientName(selectedPatient),
          amount: invoiceAmount,
          items: billedItems.map((b) => ({
            description: b.description,
            amount: b.amount,
            department: b.department
          }))
        }),
      });
      const data = await response.json();
      if (data.success) {
        setKraStatus(data);
        toast.success(`KRA eTIMS Tax Signed: ${data.kraInvoiceNo}`, "Tax Compliant");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKraLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 6. GENERATE OFFICIAL RECEIPT & SETTLE INVOICE
  // -------------------------------------------------------------
  const handleGenerateReceiptAndCompleteBill = async (method: "Cash" | "M-PESA" | "SHA/NHIF" | "Insurance" | "Split", refCode?: string) => {
    if (!selectedPatient) {
      toast.warning("Please select a patient first.", "Patient Required");
      return;
    }
    if (billedItems.length === 0) {
      toast.warning("Please add at least one procedure or pharmacy item to the bill.", "Empty Bill");
      return;
    }

    try {
      const invoiceId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const finalKraNo = kraStatus?.kraInvoiceNo || `KRAETIMS-${Date.now().toString().slice(-6)}`;

      const newInvoice: Invoice = {
        id: invoiceId,
        patientId: selectedPatient.id,
        patientName: getPatientName(selectedPatient),
        nationalId: selectedPatient.nationalId || "N/A",
        items: billedItems.map((b) => ({
          description: b.description,
          amount: b.amount,
          department: b.department
        })),
        total: netDueAfterDiscount,
        split: {
          sha: shaCover,
          insurance: insuranceCover,
          outOfPocket: patientOutPocket
        },
        paymentMethod: method,
        paymentStatus: "paid",
        mpesaReceiptNumber: refCode || (method === "M-PESA" ? `MP-${Date.now().toString().slice(-6)}` : undefined),
        kraCompliantInvoiceNo: finalKraNo,
        encounterId: activeEncounter?.id,
        timestamp: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }),
        paidAt: new Date().toISOString(),
        paidAmount: netDueAfterDiscount
      };

      // 1. Save Invoice to Firestore
      await setDoc(doc(db, "invoices", invoiceId), newInvoice);

      // 2. If active encounter exists, write bill items & mark billing cleared if outpatient
      if (activeEncounter) {
        for (const item of billedItems) {
          const billItemDoc: EncounterBillItem = {
            id: `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            description: item.description,
            category: item.category,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            total: item.amount,
            isPaid: true,
            paidAt: new Date().toISOString(),
            paymentMethod: method,
            invoiceId: invoiceId,
            timestamp: new Date().toISOString()
          };
          await addDoc(collection(db, "encounters", activeEncounter.id, "bill_items"), billItemDoc);
        }

        // Update master encounter totals
        await updateDoc(doc(db, "encounters", activeEncounter.id), {
          totalBilled: (activeEncounter.totalBilled || 0) + netDueAfterDiscount,
          totalPaid: (activeEncounter.totalPaid || 0) + netDueAfterDiscount,
          billingCleared: true,
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Resolve Queue tickets if in billing queue
      const patientDisplayName = getPatientName(selectedPatient);
      const queueSnap = await getDocs(
        query(
          collection(db, "queue"),
          where("patientName", "==", patientDisplayName),
          where("currentDepartment", "==", "billing")
        )
      );
      queueSnap.forEach(async (qDoc) => {
        await updateDoc(doc(db, "queue", qDoc.id), { status: "completed" });
      });

      // 4. Auto-close system ticket
      await closeAutoTicket(
        patientDisplayName,
        `Invoice ${invoiceId} settled via ${method}. Itemized procedures and eTIMS tax signed.`
      );

      // 5. Open Receipt Modal
      setActiveReceiptInvoice(newInvoice);
      setPrintOpen(true);
      toast.success(`Official Receipt generated for ${patientDisplayName}.`, "Payment Complete");

      // Reset billing worksheet
      setBilledItems([]);
      onPaymentReconciled();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate receipt and complete billing.", "Billing Error");
    }
  };

  // Filter Patients
  const filteredPatients = patients.filter((p) => {
    const q = patientSearchQuery.toLowerCase();
    const pName = getPatientName(p).toLowerCase();
    const matchesSearch =
      q === "" ||
      pName.includes(q) ||
      (p.patientNumber && p.patientNumber.toLowerCase().includes(q)) ||
      (p.nationalId && p.nationalId.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q));

    if (!matchesSearch) return false;

    if (patientFilterMode === "active_cases") {
      return encounters.some((e) => (e.patientId === p.id || e.nationalId === p.nationalId) && e.status !== "DISCHARGED");
    }
    if (patientFilterMode === "admitted") {
      return encounters.some((e) => (e.patientId === p.id || e.nationalId === p.nationalId) && e.status === "ADMITTED");
    }
    return true;
  });

  // Filter Catalog
  const filteredTariffCatalog = tariffs.filter((t) => {
    const matchesSearch =
      catalogSearch === "" ||
      t.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      t.department.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCat = catalogCategory === "all" || t.category === catalogCategory;
    return matchesSearch && matchesCat;
  });

  const filteredPharmacyCatalog = medications.filter((m) => {
    const matchesSearch =
      catalogSearch === "" ||
      m.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      m.code.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <div id="paperless-billing-module" className="space-y-6">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER & WORKSPACE NAVIGATION */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Clinical Billing & Receipting Hub</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Interactive Drag-to-Bill
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Select patient, drag clinical procedures & pharmacy prescriptions, customize amounts, and issue eTIMS KRA receipts
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveViewMode("billing_canvas")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeViewMode === "billing_canvas"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Billing Worksheet
            </button>
            <button
              onClick={() => setActiveViewMode("invoice_history")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeViewMode === "invoice_history"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Receipt Ledger ({invoices.length})
            </button>
          </div>

          {/* Rate Card & Bed Charges Config Button */}
          <button
            id="btn-open-tariff-settings"
            onClick={() => setShowTariffSettingsModal(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Set Bed & Procedure Charges</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN BILLING CANVAS VIEW */}
      {/* ========================================================= */}
      {activeViewMode === "billing_canvas" && (
        <div className="space-y-6">
          
          {/* 2.1 PATIENT SELECTOR & CONTEXT BANNER */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              
              {/* Left Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient by Name, ID, Phone, or Patient #..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-emerald-500 font-medium"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200">
                  <button
                    onClick={() => setPatientFilterMode("active_cases")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      patientFilterMode === "active_cases" ? "bg-white text-emerald-800 shadow-2xs font-extrabold" : "hover:text-slate-900"
                    }`}
                  >
                    Active Clinical Cases
                  </button>
                  <button
                    onClick={() => setPatientFilterMode("admitted")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      patientFilterMode === "admitted" ? "bg-white text-emerald-800 shadow-2xs font-extrabold" : "hover:text-slate-900"
                    }`}
                  >
                    Admitted Inpatients
                  </button>
                  <button
                    onClick={() => setPatientFilterMode("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      patientFilterMode === "all" ? "bg-white text-emerald-800 shadow-2xs font-extrabold" : "hover:text-slate-900"
                    }`}
                  >
                    All Patients
                  </button>
                </div>
              </div>

              {/* Patient Dropdown Select */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Patient:</label>
                <select
                  id="select-active-patient-billing"
                  value={selectedPatientId || ""}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="px-3.5 py-2 border border-emerald-300 bg-emerald-50/70 text-emerald-900 rounded-2xl text-xs font-bold focus:outline-emerald-500 cursor-pointer max-w-xs"
                >
                  <option value="">-- Choose Patient --</option>
                  {filteredPatients.map((p) => {
                    const hasEncounter = encounters.some((e) => (e.patientId === p.id || e.nationalId === p.nationalId) && e.status !== "DISCHARGED");
                    return (
                      <option key={p.id} value={p.id}>
                        {getPatientName(p)} ({p.patientNumber || p.nationalId}) {hasEncounter ? "• [ACTIVE CASE]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Selected Patient Information Card */}
            {selectedPatient ? (
              <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-emerald-700 text-base shadow-2xs">
                    {getPatientName(selectedPatient).charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm">{getPatientName(selectedPatient)}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 text-slate-800">
                        {selectedPatient.patientNumber || `PAT-${selectedPatient.id.slice(0, 6)}`}
                      </span>
                      {activeEncounter?.status === "ADMITTED" ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Bed className="w-3 h-3 text-amber-700" />
                          <span>Admitted: {activeEncounter.assignedWard} ({activeEncounter.assignedBed})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                          Outpatient Clinic
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                      <span>Nat. ID: <strong className="text-slate-700">{selectedPatient.nationalId || "N/A"}</strong></span>
                      <span>Phone: <strong className="text-slate-700">{selectedPatient.phone || "N/A"}</strong></span>
                      <span>Age/Gender: <strong className="text-slate-700">{selectedPatient.age} yrs • {selectedPatient.gender}</strong></span>
                      <span>Blood Group: <strong className="text-slate-700">{selectedPatient.bloodType || "O+"}</strong></span>
                      {selectedPatient.insuranceScheme && (
                        <span>Scheme: <strong className="text-indigo-600">{selectedPatient.insuranceScheme}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => loadPatientProcedures(selectedPatient, activeEncounter)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Refresh Orders</span>
                  </button>
                  <button
                    onClick={addAllAvailableToBill}
                    disabled={availableItems.length === 0}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bill All Unbilled Items ({availableItems.length})</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                Please select a patient above to view their unbilled procedures, orders, and pharmacy prescriptions.
              </div>
            )}
          </div>

          {/* 2.2 TWO-COLUMN WORKSPACE: LEFT (AVAILABLE PROCEDURES/CATALOG) & RIGHT (BILL WORKSHEET) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ========================================================= */}
            {/* LEFT TRAY: AVAILABLE PROCEDURES & CATALOG (5 COLS) */}
            {/* ========================================================= */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                
                {/* Header & Sub-Tabs */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">
                      Clinical Procedures & Inventory
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    Drag card to bill →
                  </span>
                </div>

                {/* Sub-Tab Navigation */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl text-[11px] font-extrabold">
                  <button
                    onClick={() => setActiveCatalogTab("patient_procedures")}
                    className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeCatalogTab === "patient_procedures"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Patient Orders ({availableItems.length})
                  </button>
                  <button
                    onClick={() => setActiveCatalogTab("tariff_catalog")}
                    className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeCatalogTab === "tariff_catalog"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Procedures & Labs
                  </button>
                  <button
                    onClick={() => setActiveCatalogTab("pharmacy_catalog")}
                    className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeCatalogTab === "pharmacy_catalog"
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Pharmacy Stock
                  </button>
                </div>

                {/* Catalog Search & Category Filter (for catalog tabs) */}
                {activeCatalogTab !== "patient_procedures" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={`Search ${activeCatalogTab === "pharmacy_catalog" ? "medication..." : "procedure tariff..."}`}
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                      />
                    </div>
                    {activeCatalogTab === "tariff_catalog" && (
                      <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] font-bold">
                        {["all", "consultation", "laboratory", "radiology", "procedure", "nursing", "surgery"].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCatalogCategory(cat)}
                            className={`px-2 py-0.5 rounded-lg uppercase whitespace-nowrap transition-colors cursor-pointer ${
                              catalogCategory === cat
                                ? "bg-emerald-600 text-white font-extrabold"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Item List Renderer */}
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  
                  {/* TAB 1: PATIENT UNBILLED PROCEDURES */}
                  {activeCatalogTab === "patient_procedures" && (
                    <>
                      {availableItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 group shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 shrink-0" />
                            <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0">
                              {item.category === "pharmacy" ? (
                                <Pill className="w-4 h-4 text-emerald-600" />
                              ) : item.category === "laboratory" ? (
                                <FlaskRound className="w-4 h-4 text-amber-600" />
                              ) : item.category === "radiology" ? (
                                <Activity className="w-4 h-4 text-purple-600" />
                              ) : item.category === "ward_bed" ? (
                                <Bed className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Stethoscope className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-extrabold text-slate-900 truncate">
                                  {item.description}
                                </p>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {item.notes || item.department}
                              </p>
                              {item.durationDays && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  {item.durationDays} day(s) stay
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="font-mono font-black text-xs text-slate-900 block">
                                KES {item.amount.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                @ KES {item.unitPrice} × {item.quantity}
                              </span>
                            </div>
                            <button
                              onClick={() => addItemToBill(item)}
                              title="Add to Bill"
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-transform active:scale-95 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {availableItems.length === 0 && (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 space-y-2">
                          <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 opacity-60" />
                          <p className="font-medium">No pending unbilled orders recorded for this patient.</p>
                          <p className="text-[10px]">You can select standard hospital procedures from the Procedure or Pharmacy tabs above.</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* TAB 2: PROCEDURE TARIFF CATALOG */}
                  {activeCatalogTab === "tariff_catalog" && (
                    <>
                      {filteredTariffCatalog.map((t) => {
                        const asDraft: BillItemDraft = {
                          id: `cat-tariff-${t.id}`,
                          sourceId: t.id,
                          sourceType: "tariff",
                          description: t.name,
                          category: t.category,
                          department: t.department,
                          quantity: 1,
                          unitPrice: t.standardAmount,
                          amount: t.standardAmount,
                          notes: t.description || `${t.code} • Standard Hospital Tariff`,
                          addedAt: new Date().toISOString()
                        };

                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, asDraft)}
                            className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2.5 group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] font-bold text-indigo-700">{t.code}</span>
                                  <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate">{t.department}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                KES {t.standardAmount.toLocaleString()}
                              </span>
                              <button
                                onClick={() => addItemToBill(asDraft)}
                                className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* TAB 3: PHARMACY CATALOG */}
                  {activeCatalogTab === "pharmacy_catalog" && (
                    <>
                      {filteredPharmacyCatalog.map((med) => {
                        const asDraft: BillItemDraft = {
                          id: `cat-med-${med.id}`,
                          sourceId: med.id,
                          sourceType: "prescription",
                          description: `${med.name} (${med.strength || "Standard"})`,
                          category: "pharmacy",
                          department: "Pharmacy",
                          quantity: 1,
                          unitPrice: med.unitPrice || 250,
                          amount: med.unitPrice || 250,
                          notes: `Stock: ${med.stock} ${med.unit || "units"} available`,
                          addedAt: new Date().toISOString()
                        };

                        return (
                          <div
                            key={med.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, asDraft)}
                            className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2.5 group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{med.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {med.category || "Medication"} • In Stock: {med.stock}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                KES {(med.unitPrice || 250).toLocaleString()}
                              </span>
                              <button
                                onClick={() => addItemToBill(asDraft)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Bottom Custom Charge Launcher */}
                <button
                  id="btn-add-custom-charge"
                  onClick={() => setShowCustomChargeModal(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Add Custom Fee / Sundry Charge</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT COLUMN: ACTIVE BILL WORKSHEET CANVAS (7 COLS) */}
            {/* ========================================================= */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Dropzone Billing Worksheet Container */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropOnCanvas}
                className={`bg-white rounded-3xl border transition-all p-5 shadow-xs space-y-5 ${
                  isDragOverCanvas
                    ? "border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/20"
                    : "border-slate-200/90"
                }`}
              >
                {/* Worksheet Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">Active Bill Worksheet</h3>
                      <p className="text-[11px] text-slate-500">Enter custom amount and adjust units for each procedure below</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBilledItems([])}
                      disabled={billedItems.length === 0}
                      className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Billed Items Table / Rows */}
                {billedItems.length > 0 ? (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {billedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2 hover:border-slate-300 transition-colors"
                      >
                        {/* Top: Description & Category */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-0.5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateBilledItemDescription(idx, e.target.value)}
                              className="w-full font-bold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white px-1 py-0.5 rounded focus:outline-hidden"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                              <span className="font-semibold text-emerald-700 capitalize">{item.category}</span>
                              <span>•</span>
                              <span>{item.department}</span>
                              {item.drugDosage && <span>• Dose: {item.drugDosage}</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => removeItemFromBill(idx)}
                            title="Remove item"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Bottom: Quantity, Unit Price Input, and Total */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 bg-white/60 p-2 rounded-xl">
                          
                          {/* Quantity (+/-) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Qty:</span>
                            <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                              <button
                                onClick={() => updateBilledItemQuantity(idx, item.quantity - 1)}
                                className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateBilledItemQuantity(idx, parseInt(e.target.value) || 1)}
                                className="w-12 text-center text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                              />
                              <button
                                onClick={() => updateBilledItemQuantity(idx, item.quantity + 1)}
                                className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Unit Price Input */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Rate (KES):</span>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateBilledItemPrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-emerald-500"
                            />
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Total</span>
                            <span className="font-mono font-black text-sm text-slate-900">
                              KES {item.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
                    <div className="w-12 h-12 rounded-full bg-emerald-100/60 text-emerald-600 flex items-center justify-center mx-auto">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Worksheet Ready — Drag Procedures Here
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                        Drag items from the left tray or click the "+" button to add pharmacy drugs, doctor consults, lab orders, or ward bed stays to this patient's bill.
                      </p>
                    </div>
                  </div>
                )}

                {/* Subtotal & Discount Summary Bar */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Gross Procedures Subtotal:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      KES {grossSubtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Waiver / Discount (KES):</span>
                      <input
                        type="number"
                        min="0"
                        max={grossSubtotal}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Math.min(grossSubtotal, parseInt(e.target.value) || 0))}
                        className="w-24 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-300 focus:outline-hidden"
                      />
                    </div>
                    {discountAmount > 0 && (
                      <span className="font-mono font-bold text-rose-400">- KES {discountAmount.toLocaleString()}</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs font-extrabold">
                    <span className="uppercase tracking-wide text-emerald-400">Net Invoice Total Due:</span>
                    <span className="font-mono text-base text-emerald-400">
                      KES {netDueAfterDiscount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 2.3 SPLIT REVENUE & PAYMENT OPERATIONS */}
                {/* ========================================================= */}
                {billedItems.length > 0 && (
                  <div className="space-y-4 pt-2">
                    
                    {/* Split Breakdown Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left: SHA & Insurance Coverage */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Split Coverage</span>
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">Insurance & SHA</span>
                        </div>

                        {/* SHA Capitation Input */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">SHA / Taifa Care Cover (KES)</label>
                            <button
                              id="btn-verify-sha-eligibility"
                              onClick={checkShaEligibility}
                              disabled={shaLoading}
                              className="text-[9px] text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2 py-0.5 rounded font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {shaLoading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                              <span>{shaLoading ? "Verifying..." : "Verify SHA"}</span>
                            </button>
                          </div>
                          <input
                            id="input-sha-coverage-amount"
                            type="number"
                            min="0"
                            max={netDueAfterDiscount}
                            value={shaCover}
                            onChange={(e) => {
                              const val = Math.min(netDueAfterDiscount, parseInt(e.target.value) || 0);
                              setShaCover(val);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold"
                          />
                          {shaData && (
                            <p className="text-[10px] text-cyan-700 font-medium">✓ SHA Contributor Active ({shaData.shaId})</p>
                          )}
                        </div>

                        {/* Private Insurance Input */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Private Insurance (KES)</label>
                            <button
                              id="btn-submit-slade-preauth"
                              onClick={submitInsurancePreauth}
                              disabled={insuranceLoading || insuranceCover <= 0}
                              className="text-[9px] text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer"
                            >
                              {insuranceLoading ? "Authorizing..." : "Slade Pre-auth"}
                            </button>
                          </div>
                          <input
                            id="input-insurance-coverage-amount"
                            type="number"
                            min="0"
                            max={netDueAfterDiscount - shaCover}
                            value={insuranceCover}
                            onChange={(e) => {
                              const val = Math.min(netDueAfterDiscount - shaCover, parseInt(e.target.value) || 0);
                              setInsuranceCover(val);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold"
                          />
                        </div>

                        {/* Remaining Out of Pocket */}
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold">
                          <span className="text-[11px] text-slate-700 uppercase">Patient Out of Pocket:</span>
                          <span className="font-mono text-emerald-700 text-sm">KES {patientOutPocket.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Right: Safaricom M-Pesa & KRA eTIMS */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>M-PESA & KRA eTIMS</span>
                          </h4>
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">Direct POS</span>
                        </div>

                        {/* M-PESA STK Push */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Patient Phone Number</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="0712345678"
                              value={mpesaPhone}
                              onChange={(e) => setMpesaPhone(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-mono"
                            />
                            <button
                              id="btn-trigger-stk-push"
                              onClick={triggerMpesaStkPush}
                              disabled={mpesaLoading || patientOutPocket <= 0}
                              className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {mpesaLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "STK Push"}
                            </button>
                          </div>
                          {mpesaStatus && (
                            <p className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 p-1.5 rounded-lg mt-1">
                              {mpesaStatus}
                            </p>
                          )}
                        </div>

                        {/* KRA eTIMS Signoff */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-600 uppercase block">KRA Tax Stamp</span>
                            <span className="text-[9px] text-slate-400 font-mono">16% VAT Compliance</span>
                          </div>
                          <button
                            id="btn-sign-etims-tax"
                            onClick={() => generateETIMSInvoice(netDueAfterDiscount)}
                            disabled={kraLoading}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg uppercase cursor-pointer"
                          >
                            {kraLoading ? "Signing..." : kraStatus ? "✓ Signed" : "Sign eTIMS"}
                          </button>
                        </div>
                        {kraStatus && (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-mono text-emerald-900">
                            eTIMS: {kraStatus.kraInvoiceNo} • Tax: KES {kraStatus.taxAmount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Final Payment Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <button
                        id="btn-settle-cash"
                        onClick={() => handleGenerateReceiptAndCompleteBill("Cash")}
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Settle Bill & Print Cash Receipt</span>
                      </button>

                      <button
                        id="btn-settle-mpesa"
                        onClick={() => handleGenerateReceiptAndCompleteBill("M-PESA")}
                        className="py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white text-xs font-black rounded-2xl shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Record M-PESA & Print Receipt</span>
                      </button>

                      <button
                        id="btn-settle-insurance"
                        onClick={() => handleGenerateReceiptAndCompleteBill(shaCover > 0 ? "SHA/NHIF" : "Insurance")}
                        className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Complete Split / Insurance Bill</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. INVOICE & RECEIPT HISTORY LEDGER VIEW */}
      {/* ========================================================= */}
      {activeViewMode === "invoice_history" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Hospital Invoices & Official Receipts Ledger</h3>
              <p className="text-xs text-slate-500">History of all reconciled patient bills and KRA eTIMS tax receipts</p>
            </div>
            <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Total Invoices: {invoices.length}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[60vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Procedures & Items</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Gross Total (KES)</th>
                  <th className="p-3.5">eTIMS Tax No</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Receipt Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-emerald-800">{inv.id}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{inv.patientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {inv.nationalId}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-xs text-slate-700 max-w-xs truncate">
                        {inv.items.map((it) => it.description).join(", ")}
                      </div>
                      <span className="text-[10px] text-slate-400">{inv.items.length} item(s)</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        inv.paymentMethod === "M-PESA" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                        inv.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {inv.paymentMethod}
                      </span>
                      {inv.mpesaReceiptNumber && (
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">{inv.mpesaReceiptNumber}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-black text-slate-900">
                      KES {inv.total.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-slate-600">
                      {inv.kraCompliantInvoiceNo || "Signed"}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{inv.timestamp}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setActiveReceiptInvoice(inv);
                          setPrintOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No invoices or receipts generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODALS */}
      {/* ========================================================= */}

      {/* 4.1 Master Tariff & Ward Bed Charges Modal */}
      <TariffRateCardModal
        isOpen={showTariffSettingsModal}
        onClose={() => setShowTariffSettingsModal(false)}
      />

      {/* 4.2 Add Custom Sundry / Procedure Charge Modal */}
      {showCustomChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Add Custom Procedure or Sundry Charge</span>
              </h4>
              <button
                onClick={() => setShowCustomChargeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Procedure / Charge Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Suture Pack & Local Anesthetic"
                  value={customChargeForm.description}
                  onChange={(e) => setCustomChargeForm({ ...customChargeForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Category</label>
                  <select
                    value={customChargeForm.category}
                    onChange={(e) => setCustomChargeForm({ ...customChargeForm, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="procedure">Clinical Procedure</option>
                    <option value="consultation">Consultation</option>
                    <option value="nursing">Nursing Service</option>
                    <option value="laboratory">Lab Test</option>
                    <option value="pharmacy">Pharmacy / Drug</option>
                    <option value="ward_bed">Bed / Accommodation</option>
                    <option value="other">Other Hospital Sundry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Minor Theatre"
                    value={customChargeForm.department}
                    onChange={(e) => setCustomChargeForm({ ...customChargeForm, department: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Quantity / Units</label>
                  <input
                    type="number"
                    min="1"
                    value={customChargeForm.quantity}
                    onChange={(e) => setCustomChargeForm({ ...customChargeForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Unit Amount (KES) *</label>
                  <input
                    type="number"
                    min="0"
                    value={customChargeForm.unitPrice}
                    onChange={(e) => setCustomChargeForm({ ...customChargeForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-emerald-300 text-emerald-900 rounded-xl font-mono font-black"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCustomChargeModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomCharge}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                Add to Current Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.3 Official eTIMS Receipt Print Modal */}
      <PrintDocument
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        type="receipt"
        receiptData={activeReceiptInvoice}
      />
    </div>
  );
}
